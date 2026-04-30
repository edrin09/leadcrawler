# WebSocket服务使用指南

## 1. WebSocket服务概述

### 1.1 服务端文件结构

- **WebSocket服务类**：`app/process/WebSocketProcess.php`
- **WebSocket公共服务**：`app/common/service/WsService.php`（用于在项目任意位置调用WebSocket功能）
- **进程配置**：`config/process.php`
- **日志通道**：`config/log.php` (ws通道)

### 1.2 客户端连接

使用标准WebSocket API连接服务：

```javascript
// 连接WebSocket服务
const ws = new WebSocket('ws://服务器IP:8282');

// 连接成功
ws.onopen = function() {
    console.log('WebSocket连接成功');
};

// 接收消息
ws.onmessage = function(event) {
    console.log('收到消息:', event.data);
};

// 连接关闭
ws.onclose = function() {
    console.log('WebSocket连接关闭');
};

// 连接错误
ws.onerror = function(error) {
    console.error('WebSocket错误:', error);
};
```

## 2. WebSocket公共服务(WsService)使用

### 2.1 主要功能

- 发送消息给指定用户
- 广播消息给所有在线用户
- 发送消息给多个用户
- 检查用户在线状态
- 获取在线用户信息
- 发送文本消息和系统通知

### 2.2 使用方法

在项目任意位置（控制器、模型、中间件等）都可以直接调用：

```php
// 引入命名空间
use app\common\service\WsService;

// 发送消息给指定用户
WsService::sendToUser(1001, 200, 'new_message', '新消息', [
    'content' => '你好，这是一条测试消息'
]);

// 广播消息给所有在线用户
WsService::broadcast(200, 'system_notice', '系统通知', [
    'content' => '系统将在30分钟后维护'
]);

// 发送文本消息
WsService::sendTextMessage(1001, '你好，这是一条文本消息', 1002);

// 发送系统通知
WsService::sendSystemNotice(1001, '你的订单已发货');

// 广播系统通知
WsService::broadcastSystemNotice('平台新功能上线了');

// 检查用户是否在线
if (WsService::isUserOnline(1001)) {
    echo '用户在线';
}

// 获取在线用户数量
$count = WsService::getOnlineUserCount();

// 获取所有在线用户ID
$userIds = WsService::getOnlineUserIds();
```

### 2.3 实际业务场景应用

**场景1：订单状态更新推送**

```php
// 在订单控制器中更新订单状态后
success('订单支付成功');

// 推送支付成功消息给用户
WsService::sendSystemNotice($user_id, '您的订单#' . $order_sn . '已支付成功');
```

**场景2：新消息提醒**

```php
// 在消息模型中保存消息后
$message = MallMessage::create([
    'from_user_id' => $from_user_id,
    'to_user_id' => $to_user_id,
    'content' => $content,
    'message_type' => 'text'
]);

// 推送新消息提醒
WsService::sendTextMessage($to_user_id, $content, $from_user_id);
```

**场景3：系统维护通知**

```php
// 在系统设置控制器中
success('系统维护通知已发布');

// 广播给所有在线用户
WsService::broadcastSystemNotice('系统将于今天23:00-01:00进行维护，请提前做好准备');
```

### 2.4 消息格式

所有通过`WsService`发送的消息都遵循统一格式：

```json
{
    "code": 200,             // 状态码
    "type": "new_message",  // 消息类型
    "meg": "New Message",   // 消息内容
    "timestamp": 1640995200, // 时间戳
    "data": {               // 附加数据
        "content": "消息内容"
    }
}
```

## 3. 配置WSS (WebSocket Secure)

### 3.1 通过.env文件配置

现在可以通过简单修改`.env`文件中的`is_ssl`配置来切换WebSocket协议（ws/wss）：

```env
# WebSocket配置
WS_PORT=8282

# 是否启用SSL (true: wss, false: ws)
is_ssl=false

# SSL证书配置（仅当is_ssl=true时需要）
SSL_CERT=/path/to/your/cert.pem
SSL_KEY=/path/to/your/key.pem
```

### 3.2 配置说明

- 当`is_ssl=true`时：WebSocket服务将使用`wss://`协议（安全连接）
- 当`is_ssl=false`时：WebSocket服务将使用`ws://`协议（普通连接）
- 无需修改`config/process.php`中的任何配置，系统会自动根据`is_ssl`值切换协议

### 3.3 客户端连接

根据配置的协议连接WebSocket服务：

```javascript
// 使用ws协议（is_ssl=false时）
const ws = new WebSocket('ws://服务器IP:8282');

// 使用wss协议（is_ssl=true时）
const ws = new WebSocket('wss://服务器域名:8282');
```

## 4. 常见问题

### 4.1 连接失败

- 检查服务是否启动：`php start/win.php status`
- 检查端口是否开放：`telnet 服务器IP 8282`
- 检查防火墙设置

### 4.2 消息丢失

- 实现消息确认机制
- 使用持久化存储重要消息
- 配置适当的心跳间隔

### 4.3 性能优化

#### 4.3.1 增加进程数

在`config/process.php`中修改WebSocket进程的`count`参数：

```php
'websocket' => [
    'handler' => app\process\WebSocketProcess::class,
    'listen' => 'websocket://0.0.0.0:' . env('WS_PORT', 8282),
    'count' => 4, // 根据服务器配置调整
    'reloadable' => true,
    'constructor' => []
],
```

##### 进程数配置建议

进程数的配置主要取决于以下因素：

1. **服务器CPU核心数**：通常建议设置为CPU核心数或CPU核心数的1-2倍
2. **预期并发连接数**：每个进程可处理约10,000-100,000个连接（取决于消息频率）
3. **消息处理复杂度**：如果消息处理逻辑复杂，可适当增加进程数
4. **服务器内存**：每个进程会占用一定内存，需确保有足够内存支持

##### 推荐配置

- **开发环境**：1-2个进程
- **小型服务器(2核4G)**：2-4个进程
- **中型服务器(4核8G)**：4-8个进程
- **大型服务器(8核16G+)**：8-16个进程

##### 查看服务器CPU核心数

在Linux系统中，可以使用以下命令查看CPU核心数：

```bash
# 查看物理CPU数量
cat /proc/cpuinfo | grep "physical id" | sort | uniq | wc -l

# 查看每个物理CPU的核心数
cat /proc/cpuinfo | grep "cpu cores" | uniq

# 查看总核心数（包括超线程）
cat /proc/cpuinfo | grep "processor" | wc -l
```

在Windows系统中，可以使用以下命令查看：

```cmd
wmic cpu get NumberOfCores,NumberOfLogicalProcessors
```

在webman中，可以使用`cpu_count()`函数获取CPU核心数，例如：

```php
'count' => cpu_count() * 2, // 设置为CPU核心数的2倍
```

##### 注意事项

- 不要盲目设置过多进程，避免CPU上下文切换开销过大
- 每个进程独立管理自己的连接，进程间通信需要额外机制
- 可根据实际运行情况调整，通过监控CPU和内存使用率优化配置

#### 4.3.2 其他优化建议

- 优化消息处理逻辑，减少阻塞操作
- 使用连接池管理数据库连接
- 合理设置心跳间隔，避免频繁心跳导致性能下降
- 对消息进行批量处理，减少网络IO开销