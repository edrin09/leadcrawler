<?php

namespace app\process;

use app\common\service\TokenService;
use app\common\service\WsService;
use Exception;
use support\Log;
use Workerman\Connection\TcpConnection;
use Workerman\Timer;
use Workerman\Worker;

/**
 * WebSocket服务进程
 */
class WebSocketProcess
{
    // 用户连接映射 (user_id => connection)
    const HEARTBEAT_INTERVAL = 60;
    // 连接用户映射 (connection_id => user_id)
    const AUTH_TIMEOUT = 30;
    // 未认证连接的临时存储
    protected $userConnections = [];
    // Worker实例
    protected $connectionUsers = [];

    // 配置常量
    protected $unauthorizedConnections = [];  // 心跳间隔(秒)
    protected $worker;        // 认证超时(秒)

    /**
     * 进程启动时执行
     */
    public function onWorkerStart(Worker $worker)
    {
        $this->worker = $worker;

        // 设置事件回调
        $worker->onConnect = [$this, 'onConnect'];
        $worker->onMessage = [$this, 'onMessage'];
        $worker->onClose = [$this, 'onClose'];
        $worker->onError = [$this, 'onError'];

        // 初始化WebSocket公共服务
        WsService::setInstance($this);

        // 心跳检测
        Timer::add(self::HEARTBEAT_INTERVAL, function () {
            $timeNow = time();
            foreach ($this->worker->connections as $connection) {
                $connection->lastActiveTime = $connection->lastActiveTime ?? $timeNow;

                if ($timeNow - $connection->lastActiveTime > self::HEARTBEAT_INTERVAL) {
                    $connection->close();
                } else {
                    // 发送心跳包
                    $this->render_send($connection, 200, 'ping', 'heartbeat');
                }
            }
        });

        // 定时清理过期的未认证连接
        Timer::add(self::AUTH_TIMEOUT, function () {
            $timeNow = time();
            foreach ($this->unauthorizedConnections as $connectionId => $connectTime) {
                if ($timeNow - $connectTime > self::AUTH_TIMEOUT) {
                    // 超过认证超时关闭连接
                    $this->worker->connections[$connectionId]?->close();
                    unset($this->unauthorizedConnections[$connectionId]);
                }
            }
        });
    }

    /**
     * 统一消息发送方法
     */
    protected function render_send(TcpConnection $connection, int $code, string $type, string $message = 'success', array $data = [])
    {
        $response = [
            'code' => $code,
            'type' => $type,
            'meg' => $message,
            'timestamp' => time(),
            'data' => $data
        ];

        $connection->send(json_encode($response));
    }

    /**
     * 当有客户端连接时触发
     */
    public function onConnect(TcpConnection $connection)
    {
        $remoteAddress = $connection->getRemoteIp() . ':' . $connection->getRemotePort();

        // 记录连接时间和连接ID
        $connection->lastActiveTime = time();
        $connectionId = $this->getConnectionId($connection);

        // 未认证连接加入临时存储
        $this->unauthorizedConnections[$connectionId] = time();

        // 发送连接成功消息，要求认证
        $this->render_send($connection, 701, 'unauthenticated', 'Please Authenticate Identity');
    }

    /**
     * 获取连接ID
     */
    protected function getConnectionId(TcpConnection $connection): string
    {
        return spl_object_hash($connection);
    }

    /**
     * 当收到客户端消息时触发
     */
    public function onMessage(TcpConnection $connection, string $message)
    {
        // 更新最后活动时间
        $connection->lastActiveTime = time();

        Log::channel('ws')->info($message);
        try {
            // 解析消息
            $data = json_decode($message, true);
            if (empty($data)) {
                $this->render_send($connection, 400, 'error', 'Invalid Message Format');
            }

            // 获取消息类型
            $type = $data['type'] ?? 'unknown';

            // 处理心跳响应
            if ($type === 'ping') {
                return;
            }

            // 未认证状态，只处理认证消息
            if (!isset($connection->authenticated)) {
                $type === 'auth' ? $this->handleAuth($connection, $data) : $this->render_send($connection, 701, 'unauthenticated', 'Please Authenticate First');
                return;
            }

            // 已认证状态，处理业务消息
            $handlers = [
                'send_message' => 'handleSendMessage',
                'get_user_info' => 'handleGetUserInfo',
                'broadcast_notice' => 'handleBroadcastNotice',
//                'update_user_status' => 'handleUpdateUserStatus'
            ];

            if (isset($handlers[$type])) {
                $this->{$handlers[$type]}($connection, $data);
            } else {
                $this->render_send($connection, 400, 'error', 'Unknown Message Type');
            }

        } catch (Exception $e) {
            $this->render_send($connection, 400, 'error', $e->getMessage());
        }
    }

    /**
     * 处理用户认证
     */
    protected function handleAuth(TcpConnection $connection, array $data)
    {
        $connectionId = $this->getConnectionId($connection);

        try {
            // 验证token
            $user_info = $this->verifyToken($data['token'] ?? '');

            // 标记连接为已认证
            $connection->authenticated = true;
            $connection->user_id = $user_info->customer_id;
            $connection->user_info = $user_info;

            // 清理未认证连接记录
            unset($this->unauthorizedConnections[$connectionId]);

            // 保存连接映射
            $this->userConnections[$user_info->customer_id] = $connection;
            $this->connectionUsers[$connectionId] = $user_info->customer_id;

            $this->render_send($connection, 200, 'auth_success', 'Authentication Successful', compact('user_info'));

        } catch (Exception $e) {
            $this->render_send($connection, 601, 'auth_failed', $e->getMessage());
        }
    }

    /**
     * 验证token
     */
    protected function verifyToken(string $token)
    {
        return (new TokenService)->checkToken($token);
    }

    /**
     * 当客户端连接关闭时触发
     */
    public function onClose(TcpConnection $connection)
    {
        $connectionId = $this->getConnectionId($connection);
        $remoteAddress = $connection->getRemoteIp() . ':' . $connection->getRemotePort();

        // 清理未认证连接
        unset($this->unauthorizedConnections[$connectionId]);

        // 清理认证后的连接
        if (isset($connection->authenticated) && $connection->authenticated) {
            $user_id = $connection->user_id;

            // 更新用户在线状态
            if (isset($this->userConnections[$user_id])) {
                unset($this->userConnections[$user_id], $this->connectionUsers[$connectionId]);
            }
        }
    }

    /**
     * 当连接发生错误时触发
     */
    public function onError(TcpConnection $connection, $code, $msg)
    {
        $remoteAddress = $connection->getRemoteIp() . ':' . $connection->getRemotePort();
    }

    /**
     * 发送消息给指定用户
     */
    public function sendToUser(int $user_id, int $code, string $type, string $message = 'success', array $data = []): bool
    {
        if (isset($this->userConnections[$user_id])) {
            $this->render_send($this->userConnections[$user_id], $code, $type, $message, $data);
            return true;
        }
        return false;
    }

    /**
     * 广播消息给所有用户
     */
    public function broadcast(int $code, string $type, string $message = 'success', array $data = []): void
    {
        foreach ($this->userConnections as $connection) {
            $this->render_send($connection, $code, $type, $message, $data);
        }
    }

    /**
     * 处理发送消息
     */
    protected function handleSendMessage(TcpConnection $connection, array $data)
    {
        $to_user_id = $data['to_user_id'] ?? 0;
        $content = $data['content'] ?? '';

        if (empty($to_user_id) || empty($content)) {
            throw new Exception('Recipient and Content Cannot be empty');
        }

        // 这里可以保存消息到数据库
        // 例如创建一个消息模型: MallMessage::create([...])

        $message_data['from_user_id'] = $connection->user_id;  // 发送者ID
        $message_data['to_user_id'] = $to_user_id;  // 接收者ID
        $message_data['content'] = $content;
        $message_data['message_type'] = $data['message_type'] ?? 'text';

        // 发送消息给接收者
        if (isset($this->userConnections[$to_user_id])) {
            $this->render_send($this->userConnections[$to_user_id], 200, 'new_message', 'New Message', compact('message_data'));
        }

        // 发送消息确认给发送者
        $this->render_send($connection, 200, 'message_sent', 'Message Sent Successfully');
    }

    /**
     * 处理获取用户信息
     */
    protected function handleGetUserInfo(TcpConnection $connection, array $data)
    {
        $user_id = $data['user_id'] ?? $connection->user_id;

        $user_info = $this->userConnections[$user_id]->user_info ?? (object)[];
        $this->render_send($connection, 200, 'user_info', 'User Retrieved Successfully', compact('user_info'));
    }

    /**
     * 处理广播通知
     */
    protected function handleBroadcastNotice(TcpConnection $connection, array $data)
    {
        $content = $data['content'] ?? '';
        $noticeType = $data['notice_type'] ?? 'system';

        if (empty($content)) {
            $this->render_send($connection, 400, 'error', 'Notice Content Cannot be empty');
        }

        // 只有管理员或特定权限的用户才能发送广播
        // 这里可以添加权限检查
        $notice_data['content'] = $content;
        $notice_data['notice_type'] = $noticeType;
        $notice_data['sender_id'] = $connection->user_id;

        // 发送广播给所有在线用户
        foreach ($this->userConnections as $conn) {
            $this->render_send($conn, 200, 'broadcast', 'System Broadcast', compact('notice_data'));
        }

        // 发送确认
        $this->render_send($connection, 200, 'broadcast_sent', 'Broadcast Sent Successfully');
    }

    /**
     * 处理更新用户状态
     */
//    protected function handleUpdateUserStatus(TcpConnection $connection, array $data)
//    {
//        $status = $data['status'] ?? 1;
//        $user_id = $connection->user_id;
//
//        try {
//
//            $this->render_send($connection, 200, 'status_updated', 'Status Updated Successfully', ['status' => $status]);
//
//        } catch (Exception $e) {
//            throw new Exception('Failed to Update Status: ' . $e->getMessage());
//        }
//    }
}