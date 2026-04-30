<?php

namespace app\common\service;

use Workerman\Worker;
use Workerman\Connection\TcpConnection;

/**
 * WebSocket公共服务类
 * 用于在项目任意位置调用WebSocket功能
 */
class WsService
{
    /**
     * WebSocketProcess实例
     * @var null
     */
    protected static $instance = null;

    /**
     * 设置WebSocketProcess实例
     * 用于在WebSocket进程启动时初始化
     *
     * @param mixed $instance
     */
    public static function setInstance($instance)
    {
        self::$instance = $instance;
    }

    /**
     * 发送消息给指定用户
     *
     * @param int $user_id 用户ID
     * @param int $code 状态码
     * @param string $type 消息类型
     * @param string $message 消息内容
     * @param array $data 附加数据
     * @return bool 是否发送成功
     */
    public static function sendToUser(int $user_id, int $code, string $type, string $message = 'success', array $data = []): bool
    {
        if (self::$instance) {
            return self::$instance->sendToUser($user_id, $code, $type, $message, $data);
        }
        return false;
    }

    /**
     * 广播消息给所有在线用户
     *
     * @param int $code 状态码
     * @param string $type 消息类型
     * @param string $message 消息内容
     * @param array $data 附加数据
     */
    public static function broadcast(int $code, string $type, string $message = 'success', array $data = []): void
    {
        if (self::$instance) {
            self::$instance->broadcast($code, $type, $message, $data);
        }
    }

    /**
     * 发送消息给多个用户
     *
     * @param array $user_ids 用户ID数组
     * @param int $code 状态码
     * @param string $type 消息类型
     * @param string $message 消息内容
     * @param array $data 附加数据
     * @return int 成功发送的数量
     */
    public static function sendToUsers(array $user_ids, int $code, string $type, string $message = 'success', array $data = []): int
    {
        $successCount = 0;
        if (self::$instance) {
            foreach ($user_ids as $user_id) {
                if (self::sendToUser($user_id, $code, $type, $message, $data)) {
                    $successCount++;
                }
            }
        }
        return $successCount;
    }

    /**
     * 检查用户是否在线
     *
     * @param int $user_id 用户ID
     * @return bool 是否在线
     */
    public static function isUserOnline(int $user_id): bool
    {
        if (self::$instance && isset(self::$instance->userConnections[$user_id])) {
            return true;
        }
        return false;
    }

    /**
     * 获取在线用户数量
     *
     * @return int 在线用户数量
     */
    public static function getOnlineUserCount(): int
    {
        if (self::$instance) {
            return count(self::$instance->userConnections);
        }
        return 0;
    }

    /**
     * 获取所有在线用户ID
     *
     * @return array 在线用户ID数组
     */
    public static function getOnlineUserIds(): array
    {
        if (self::$instance) {
            return array_keys(self::$instance->userConnections);
        }
        return [];
    }

    /**
     * 发送文本消息给用户
     *
     * @param int $user_id 用户ID
     * @param string $content 消息内容
     * @param int $from_user_id 发送者ID
     * @return bool 是否发送成功
     */
    public static function sendTextMessage(int $user_id, string $content, int $from_user_id = 0): bool
    {
        $message_data = [
            'from_user_id' => $from_user_id,
            'to_user_id' => $user_id,
            'content' => $content,
            'message_type' => 'text'
        ];

        return self::sendToUser($user_id, 200, 'new_message', 'New Message', ['message_data' => $message_data]);
    }

    /**
     * 发送系统通知给用户
     *
     * @param int $user_id 用户ID
     * @param string $content 通知内容
     * @return bool 是否发送成功
     */
    public static function sendSystemNotice(int $user_id, string $content): bool
    {
        return self::sendToUser($user_id, 200, 'system_notice', 'System Notice', ['content' => $content]);
    }

    /**
     * 广播系统通知给所有在线用户
     *
     * @param string $content 通知内容
     */
    public static function broadcastSystemNotice(string $content): void
    {
        self::broadcast(200, 'system_notice', 'System Notice', ['content' => $content]);
    }
}