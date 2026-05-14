# 采集系统 Docker 部署文档

## 1. 系统概述

本系统基于 Docker Compose 实现采集服务 + Webman 管理后台的一体化部署，包含以下服务：

| 服务 | 端口 | 说明 |
|------|------|------|
| Nginx | 80 | 反向代理，统一入口 |
| Crawler API | 3001 | 采集任务执行 API |
| Webman | 8787 | PHP 管理后台 |
| Scheduler | 3000 | 定时任务调度 |
| Prometheus | 9090 | 指标采集与存储 |
| Grafana | 3002 | 监控可视化面板 |
| Alertmanager | 9093 | 告警管理 |

## 2. 目录结构

```
d:\wwwroot\crawler\
├── crawler/                    # 采集应用源码
│   ├── src/                   # 核心模块（验证码、监控、调度）
│   ├── run/                   # 采集脚本（58.js、anjuke.js 等）
│   ├── utils/                 # 存储工厂、CSV/SQLite 工具
│   ├── main.js                # 入口
│   └── package.json
├── webman/                    # PHP 管理后台
│   ├── app/                   # 应用代码
│   ├── config/                # 配置文件
│   ├── start/                 # 启动脚本
│   └── vendor/                # PHP 依赖
└── deploy/                    # Docker 部署配置
    ├── docker/
    │   ├── crawler/           # 主容器（Node.js + PHP + webman）
    │   ├── scheduler/         # 定时调度容器
    │   ├── nginx/             # 反向代理
    │   ├── prometheus/        # 监控
    │   ├── grafana/           # 监控面板
    │   └── alertmanager/      # 告警
    ├── scripts/
    │   ├── init.sh            # 一键初始化脚本
    │   └── stress-test.sh     # 压力测试脚本
    ├── docker-compose.yml
    └── .env.example
```

## 3. 环境要求

- **操作系统**：Linux（Ubuntu 20.04+ / CentOS 8+）
- **Docker**：20.10+
- **Docker Compose**：v2.0+（或 `docker compose` plugin）
- **硬件**：建议 2核4G 内存以上

## 4. 快速部署

### 4.1 一键部署

```bash
cd d:\wwwroot\crawler\deploy
cp .env.example .env
# 编辑 .env 配置
bash scripts/init.sh
```

### 4.2 手动部署

```bash
# 构建镜像
cd d:\wwwroot\crawler\deploy
docker compose build --no-cache

# 启动服务
docker compose up -d

# 查看状态
docker compose ps

# 查看日志
docker compose logs -f crawler
```

## 5. 配置说明

### 5.1 环境变量（.env）

```bash
# ---------- 采集服务 ----------
CRAWLER_PORT=3001              # 采集 API 端口
METRICS_PORT=9091             # 指标暴露端口
CRAWLER_CPU_LIMIT=2            # CPU 限制（核数）
CRAWLER_MEMORY_LIMIT=2G       # 内存限制

# ---------- Webman ----------
WEBMAN_PORT=8787              # 管理后台端口
APP_DEBUG=false               # 关闭调试模式

# ---------- 数据库（可选） ----------
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=crawler
DB_USERNAME=root
DB_PASSWORD=

# ---------- 采集任务开关 ----------
CRAWL_58=true                 # 58 同城
CRAWL_ANJUKE=true             # 安居客
CRAWL_GOOFISH=false           # 闲鱼
CRAWL_XIAOHONGSHU=false       # 小红书
CRAWL_DOUYIN=false            # 抖音

# ---------- Cron 表达式 ----------
CRAWL_58_CRON=0 */6 * * *     # 每 6 小时
CRAWL_ANJUKE_CRON=0 */4 * * *  # 每 4 小时

# ---------- 验证码服务 ----------
CAPTCHA_API_KEY=               # 第三方 API Key
CAPTCHA_API_URL=               # 第三方 API 地址

# ---------- 告警 ----------
NOTIFY_WEBHOOK_URL=            # Webhook 通知地址
NOTIFY_EMAIL_TO=               # 告警邮箱

# ---------- 监控 ----------
GRAFANA_USER=admin
GRAFANA_PASSWORD=admin123
```

### 5.2 任务调度配置

在 `.env` 中设置各采集源的开关和执行时间：

```bash
CRAWL_58=true
CRAWL_58_CRON=0 */6 * * *    # 分 时 日 月 周
```

常用 Cron 表达式：
- `0 * * * *` — 每小时
- `0 */4 * * *` — 每 4 小时
- `0 2 * * *` — 每天凌晨 2 点
- `0 */6 * * *` — 每 6 小时

## 6. 服务管理

### 6.1 常用命令

```bash
# 启动所有服务
docker compose up -d

# 停止所有服务
docker compose down

# 重启所有服务
docker compose restart

# 重启单个服务
docker compose restart crawler

# 查看日志
docker compose logs -f crawler
docker compose logs -f scheduler

# 进入容器
docker exec -it crawler-main bash

# 查看资源使用
docker compose stats
```

### 6.2 健康检查

```bash
# 采集 API
curl http://localhost:3001/health

# Webman
curl http://localhost:8787/

# 调度器
curl http://localhost:3000/health
```

## 7. 访问地址

| 服务 | 地址 |
|------|------|
| 统一入口（Nginx） | http://localhost |
| Grafana 监控 | http://localhost:3002 |
| Prometheus | http://localhost:9090 |
| Alertmanager | http://localhost:9093 |
| Scheduler API | http://localhost:3000/api/tasks |

## 8. 数据持久化

| 宿主机路径 | 容器路径 | 说明 |
|-----------|---------|------|
| Docker Volume `crawler_data` | /app/crawler/storage | SQLite 数据库 |
| Docker Volume `crawler_logs` | /app/crawler/logs | 运行日志 |
| Docker Volume `crawler_screenshots` | /app/crawler/screenshots | 验证码截图 |
| Docker Volume `webman_runtime` | /app/webman/runtime | Webman 运行时 |

查看持久化数据：
```bash
# 查看 Docker Volume
docker volume ls | grep crawler

# 查看采集数据
docker exec -it crawler-main ls -la /app/crawler/storage/
```

## 9. 监控告警

### 9.1 Prometheus 告警规则

已配置的告警项：
- `CrawlerDown` — 采集服务停止
- `WebmanDown` — Webman 服务停止
- `CrawlerHighErrorRate` — 错误率 > 10%
- `CaptchaHighDetectionRate` — 验证码检测率 > 30%
- `CaptchaLowSolveRate` — 验证码解决率 < 30%
- `BrowserCrashDetected` — 浏览器崩溃
- `CrawlerNoDataCollected` — 未采集到数据

### 9.2 告警通知

在 `.env` 中配置 Webhook 地址：
```bash
NOTIFY_WEBHOOK_URL=https://your-webhook-endpoint
```

## 10. 维护操作

### 10.1 清理旧数据

```bash
# 清理日志
docker exec -it crawler-main sh -c "rm -rf /app/crawler/logs/*"

# 清理截图
docker exec -it crawler-main sh -c "rm -rf /app/crawler/screenshots/*.png"

# 清理 Prometheus 数据（慎用）
docker exec -it crawler-prometheus sh -c "rm -rf /prometheus/*"
```

### 10.2 更新部署

```bash
cd d:\wwwroot\crawler\deploy
git pull
docker compose build crawler
docker compose up -d
```

### 10.3 备份数据

```bash
# 备份 SQLite
docker cp crawler-main:/app/crawler/storage/data.db ./backup/

# 备份日志
docker cp crawler-main:/app/crawler/logs ./backup/
```

### 10.4 压力测试

```bash
cd d:\wwwroot\crawler\deploy
bash scripts/stress-test.sh 10 60 5
# 参数：并发数 测试时长(秒) 预热时间(秒)
```

## 11. 常见问题

### Q1: 容器启动后 Webman 无法访问

```bash
# 检查容器日志
docker compose logs crawler

# 检查 webman 进程
docker exec -it crawler-main ps aux | grep php

# 检查端口占用
netstat -tlnp | grep 8787
```

### Q2: 采集任务未执行

```bash
# 检查调度器状态
curl http://localhost:3000/api/tasks

# 检查调度器日志
docker compose logs scheduler

# 手动触发任务
curl -X POST http://localhost:3000/api/trigger -H "Content-Type: application/json" -d '{"source":"anjuke"}'
```

### Q3: 验证码处理失败

```bash
# 检查截图是否生成
docker exec -it crawler-main ls -la /app/crawler/screenshots/

# 检查 Tesseract OCR
docker exec -it crawler-main tesseract --version

# 手动处理验证码
docker exec -it crawler-main ls /app/crawler/screenshots/manual/
```

### Q4: 监控面板无数据

```bash
# 检查 Prometheus 是否正常
curl http://localhost:9090/-/healthy

# 检查指标是否暴露
curl http://localhost:9091/metrics

# 重启 Prometheus
docker compose restart prometheus
```

## 12. 安全建议

1. **修改默认密码**：首次部署后修改 Grafana 密码
2. **限制端口暴露**：仅暴露必要端口，或使用防火墙
3. **配置 HTTPS**：生产环境建议在 Nginx 前加一层反向代理配置 SSL
4. **定期更新镜像**：关注安全更新
5. **数据库密码**：生产环境务必设置强密码
