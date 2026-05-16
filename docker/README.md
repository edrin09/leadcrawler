# 爬虫平台 Docker 部署指南

## 📁 项目结构

```
docker/
├── Dockerfile           # Docker镜像构建文件（PHP Webman + Node.js爬虫）
├── docker-compose.yml   # Docker Compose配置
├── supervisord.conf     # Supervisor进程管理配置
├── start.bat            # Windows快速启动脚本
├── start.sh             # Linux/Mac快速启动脚本
├── .dockerignore        # Docker构建忽略规则
└── README.md            # 使用说明（本文件）
```

## 🚀 快速开始

### Windows 系统

1. 双击运行 `start.bat`
2. 等待镜像构建完成（首次需要几分钟）
3. 访问 http://localhost:8787

### Linux/Mac 系统

```bash
cd docker
chmod +x start.sh
./start.sh
```

### 手动命令

```bash
cd docker

# 创建数据目录
mkdir -p data/crawler_output data/crawler_data data/webman_runtime data/webman_storage

# 构建镜像
docker-compose build

# 启动容器
docker-compose up -d
```

## 🌐 服务地址

- **Webman后台**: http://localhost:8787
- **WebSocket**: ws://localhost:8282

## 📋 常用命令

### 查看状态
```bash
docker-compose ps
```

### 查看日志
```bash
# 查看所有日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f webman
docker-compose logs -f crawler
```

### 进入容器
```bash
docker exec -it crawler_platform bash
```

### 停止服务
```bash
docker-compose down
```

### 重启服务
```bash
docker-compose restart
```

### 重新构建
```bash
docker-compose down
docker-compose up -d --build
```

## 🔧 配置说明

### 修改Webman端口

编辑 `webman/.env` 文件：

```bash
APP_PORT=8787
```

### 修改爬虫配置

编辑 `crawler/.env` 文件：

```bash
# 数据存储方式: csv, sqlite, mysql
STORAGE_TYPE=sqlite

# SQLite配置
DATABASE_NAME=crawlerdb
TABLE_NAME=ed_mall_data

# MySQL配置（当STORAGE_TYPE=mysql时使用）
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=crawler

# 启用/禁用各平台爬虫
CRAWL_58=false
CRAWL_ANJUKE=true
CRAWL_GOOFISH=false
```

### 数据持久化

所有数据存储在 `docker/data/` 目录：
- `crawler_output/` - 爬虫输出文件
- `crawler_data/` - 爬虫数据库
- `webman_runtime/` - Webman运行时文件
- `webman_storage/` - 上传的文件

## ⚙️ 容器内部说明

### 运行的服务

容器使用 Supervisor 管理以下进程：

1. **Webman** - PHP后台框架（监听8787端口）
2. **Crawler** - Node.js爬虫主程序

### 目录结构（容器内）

```
/app/crawler/          # Node.js爬虫代码（映射挂载）
/var/www/html/         # PHP Webman代码（映射挂载）
```

## 🐛 故障排查

### 容器无法启动

```bash
# 查看详细错误
docker-compose logs

# 检查容器状态
docker ps -a

# 查看容器详细信息
docker inspect crawler_platform
```

### 端口被占用

修改 `docker-compose.yml` 中的端口映射：

```yaml
ports:
  - "8788:8787"  # 改为8788端口
```

### Chromium启动失败（缺少共享库）

确保 Dockerfile 中已安装必要的系统依赖：

```dockerfile
# Chromium/Playwright所需的系统依赖
libglib2.0-0 libnss3 libx11-xcb1 libxcomposite1 libxcursor1 \
libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 \
libxss1 libxtst6 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
libdrm2 libgbm1 libpango-1.0-0 libcairo2
```

### 爬虫运行失败

```bash
# 进入容器
docker exec -it crawler_platform bash

# 手动运行爬虫查看错误
cd /app/crawler
node main.js
```

## 📝 定时任务

如需定时运行爬虫，可以修改 `supervisord.conf` 中的 crawler 命令：

```ini
[program:crawler]
command=sh -c "while true; do node /app/crawler/main.js; sleep 3600; done"
```

或手动添加 cron 任务：

```bash
docker exec -it crawler_platform crontab -e

# 添加定时任务（例如每小时执行一次）
0 * * * * cd /app/crawler && node main.js >> /var/log/crawler.log 2>&1
```

## 🔒 安全建议

1. 生产环境请修改默认端口
2. 使用 Docker Secrets 存储敏感信息
3. 定期更新基础镜像
4. 限制容器资源使用（CPU、内存）

## 📞 更多信息

- Webman文档: https://www.workerman.net/doc/webman/
- Playwright文档: https://playwright.dev/
- Docker文档: https://docs.docker.com/