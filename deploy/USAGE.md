# 采集系统使用文档

## 1. API 接口

所有 API 均通过 Nginx 代理（http://localhost）或直接访问采集服务（http://localhost:3001）。

### 1.1 健康检查

```
GET /health
```

返回服务健康状态和关键指标：

```bash
curl http://localhost:3001/health
```

```json
{
  "status": "ok",
  "uptime": 3600,
  "metrics": {
    "crawls": {
      "total": 120,
      "success": 105,
      "failed": 15
    },
    "captcha": {
      "detected": 45,
      "solved": 38,
      "failed": 7
    },
    "successRate": "87.50%",
    "captchaSolveRate": "84.44%"
  }
}
```

### 1.2 触发采集任务

```
POST /api/crawl/{source}
```

**参数：**
- `source` — 采集源（58 / anjuke / goofish / xiaohongshu / douyin）

**示例：**

```bash
# 采集安居客
curl -X POST http://localhost:3001/api/crawl/anjuke

# 采集 58 同城
curl -X POST http://localhost:3001/api/crawl/58
```

**返回：**

```json
{
  "source": "anjuke",
  "success": true,
  "itemsCollected": 25,
  "pagesProcessed": 3,
  "duration": 45.2,
  "errors": []
}
```

### 1.3 触发全部采集

```
POST /api/crawl/all
```

一次触发所有已开启的采集源：

```bash
curl -X POST http://localhost:3001/api/crawl/all
```

### 1.4 查看统计数据

```
GET /api/stats
```

返回 Prometheus 格式的完整指标：

```bash
curl http://localhost:3001/api/stats
```

### 1.5 查看错误日志

```
GET /api/logs/errors?limit=50
```

### 1.6 查看验证码事件

```
GET /api/logs/captcha?start=2026-01-01&end=2026-12-31
```

## 2. 调度器 API

调度服务独立运行在端口 3000。

### 2.1 查看调度任务

```
GET /api/tasks
```

```bash
curl http://localhost:3000/api/tasks
```

```json
{
  "tasks": [
    {
      "name": "安居客采集",
      "source": "anjuke",
      "cron": "0 */4 * * *",
      "enabled": true,
      "nextRun": "2026-05-14T20:00:00.000Z"
    }
  ]
}
```

### 2.2 手动触发任务

```
POST /api/trigger
Content-Type: application/json

{"source": "anjuke"}
```

```bash
curl -X POST http://localhost:3000/api/trigger \
  -H "Content-Type: application/json" \
  -d '{"source": "anjuke"}'
```

### 2.3 查看执行历史

```
GET /api/history?limit=50&source=anjuke
```

### 2.4 查看调度统计

```
GET /api/stats
```

```bash
curl http://localhost:3000/api/stats
```

```json
{
  "stats": [
    {
      "source": "anjuke",
      "total": 120,
      "success": 105,
      "failed": 15,
      "successRate": "87.5%",
      "avgDuration": "45s"
    }
  ]
}
```

## 3. 验证码处理

### 3.1 自动处理流程

当检测到验证码时，系统按以下顺序尝试：

```
1. 图形 OCR 识别（Tesseract）
2. 滑块验证码模拟滑动
3. 第三方 API（需配置）
4. 人工介入
```

### 3.2 人工处理

验证码截图会保存到：

```
/app/crawler/screenshots/manual/
```

手动处理步骤：

1. 登录容器查看截图：
   ```bash
   docker exec -it crawler-main ls -la /app/crawler/screenshots/manual/
   ```

2. 查看截图文件（需要 docker cp 导出）：
   ```bash
   docker cp crawler-main:/app/crawler/screenshots/manual/ ./manual-captcha/
   ```

3. 在目标站点手动完成验证后，更新相关配置或重新触发任务

### 3.3 验证码统计

```bash
curl http://localhost:3001/api/logs/captcha
```

## 4. 监控面板（Grafana）

访问地址：http://localhost:3002

**默认账号：** `admin` / `admin123`

### 4.1 预置面板

- **采集速率趋势** — 每分钟采集次数
- **数据采集量趋势** — 采集条数趋势
- **验证码处理趋势** — 检测/解决/失败速率
- **错误与异常趋势** — 错误和浏览器崩溃
- **采集任务统计** — 总成功/失败次数
- **验证码处理统计** — 检测/解决/失败/人工处理

### 4.2 Prometheus 指标

原始指标地址：http://localhost:9091/metrics

关键指标：

| 指标名 | 说明 |
|--------|------|
| `crawler_uptime_seconds` | 服务运行时间 |
| `crawler_crawl_total` | 采集总次数 |
| `crawler_crawl_success_total` | 成功次数 |
| `crawler_crawl_failed_total` | 失败次数 |
| `crawler_success_rate` | 成功率 |
| `crawler_captcha_detected_total` | 验证码检测数 |
| `crawler_captcha_solved_total` | 验证码解决数 |
| `crawler_captcha_failed_total` | 验证码失败数 |
| `crawler_captcha_solve_rate` | 验证码解决率 |
| `crawler_items_collected_total` | 采集数据条数 |
| `crawler_pages_processed_total` | 处理页面数 |
| `crawler_browser_crashes_total` | 浏览器崩溃次数 |
| `crawler_errors_total` | 错误总数 |

## 5. 日志查看

### 5.1 实时日志

```bash
# 采集服务
docker compose logs -f crawler

# 调度服务
docker compose logs -f scheduler

# Nginx
docker compose logs -f nginx
```

### 5.2 容器内日志文件

```bash
# 采集服务 stdout
docker exec -it crawler-main cat /app/crawler/logs/stdout.log

# Webman 日志
docker exec -it crawler-main cat /app/webman/runtime/logs/workerman.log
```

### 5.3 API 错误日志

```bash
curl http://localhost:3001/api/logs/errors?limit=100
```

## 6. 添加新的采集源

### 6.1 创建采集脚本

在 `crawler/run/` 目录下创建新的采集脚本，例如 `newsite.js`：

```javascript
const { storageFactory } = require('../utils/storageFactory');
const logger = require('../src/monitor/logger');

async function crawl() {
    const storage = storageFactory.createStorage('sqlite');

    // 采集逻辑
    const items = await doCrawl();

    // 保存数据
    for (const item of items) {
        await storage.save('newsite_data', item);
    }

    return {
        itemsCollected: items.length,
        pagesProcessed: 1
    };
}

module.exports = crawl;
```

### 6.2 注册路由

在 `crawler/src/scheduler/apiServer.js` 的 `runCrawler` 函数中添加：

```javascript
case 'newsite':
    crawlerModule = require('../../run/newsite.js');
    break;
```

### 6.3 更新 .env

```bash
CRAWL_NEWSITE=true
CRAWL_NEWSITE_CRON=0 */12 * * *
```

### 6.4 重新构建镜像

```bash
cd d:\wwwroot\crawler\deploy
docker compose build crawler
docker compose up -d crawler
```

## 7. 第三方验证码服务集成

### 7.1 配置 API

在 `.env` 中配置：

```bash
CAPTCHA_API_KEY=your-api-key
CAPTCHA_API_URL=https://api.captcha-service.com/solve
```

### 7.2 触发方式

系统自动在 OCR 和滑块失败后调用第三方 API，无需额外操作。

## 8. 数据库操作

### 8.1 查看 SQLite 数据

```bash
# 进入容器
docker exec -it crawler-main sqlite3 /app/crawler/storage/data.db

# 查看表
sqlite> .tables

# 查看数据
sqlite> SELECT * FROM anjuke_data LIMIT 10;
```

### 8.2 导出数据

```bash
# 复制到宿主机
docker cp crawler-main:/app/crawler/storage/data.db ./backup/data.db
```

## 9. 常见使用场景

### 9.1 临时采集一次

```bash
curl -X POST http://localhost:3001/api/crawl/anjuke
```

### 9.2 禁用自动调度，手动批量采集

1. 在 `.env` 中关闭自动调度：
   ```bash
   CRAWL_58=false
   CRAWL_ANJUKE=false
   ```

2. 手动触发：
   ```bash
   curl -X POST http://localhost:3001/api/crawl/all
   ```

### 9.3 查看今日采集情况

```bash
curl http://localhost:3001/api/stats
curl http://localhost:3000/api/history?limit=20
```

### 9.4 紧急停止任务

```bash
# 停止容器
docker compose stop crawler

# 或者杀死容器内进程
docker exec -it crawler-main pkill -f node
```
