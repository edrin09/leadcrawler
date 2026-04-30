# Linux服务器部署方案

## 1. 环境准备

### 1.1 系统要求
- Linux系统（推荐Ubuntu 20.04+/CentOS 7+）
- 至少2GB内存
- 至少10GB磁盘空间
- 开放3000端口（或自定义端口）

### 1.2 安装Docker

**Ubuntu/Debian系统：**
```bash
# 更新软件包
sudo apt update && sudo apt upgrade -y

# 安装Docker依赖
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# 添加Docker官方GPG密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 添加Docker软件源
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装Docker
sudo apt update && sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 启动Docker服务
sudo systemctl start docker
sudo systemctl enable docker

# 添加当前用户到docker组
sudo usermod -aG docker $USER
newgrp docker
```

**CentOS/RHEL系统：**
```bash
# 安装依赖
sudo yum install -y yum-utils device-mapper-persistent-data lvm2

# 添加Docker软件源
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# 安装Docker
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 启动Docker服务
sudo systemctl start docker
sudo systemctl enable docker

# 添加当前用户到docker组
sudo usermod -aG docker $USER
newgrp docker
```

### 1.3 验证安装
```bash
docker --version
docker compose version
```

---

## 2. 代码部署

### 2.1 上传代码到服务器
```bash
# 使用scp上传代码（替换为实际路径）
scp -r /local/path/to/crawler user@server-ip:/opt/

# 或使用git克隆（如果代码在仓库中）
cd /opt
git clone <repository-url> crawler
```

### 2.2 进入项目目录
```bash
cd /opt/crawler
```

### 2.3 确保数据库文件存在
```bash
ls -la output/
# 确保 crawlerdb.db 文件存在
```

---

## 3. Docker容器化部署

### 3.1 构建并启动容器（推荐方式）

使用提供的部署脚本：
```bash
# 赋予脚本执行权限
chmod +x deploy.sh

# 构建并启动容器
./deploy.sh -b
```

### 3.2 手动部署方式

**构建Docker镜像：**
```bash
docker build -t crawler-h5-image .
```

**创建数据目录：**
```bash
mkdir -p /opt/crawler/output
```

**运行容器：**
```bash
docker run -d \
  --name crawler-h5-app \
  -p 3000:3000 \
  -v /opt/crawler/output:/app/output \
  -e NODE_ENV=production \
  -e PORT=3000 \
  --restart unless-stopped \
  crawler-h5-image
```

### 3.3 使用docker-compose（推荐）
```bash
docker compose up -d
```

---

## 4. 无可视化环境下的访问方案

### 4.1 SSH端口转发（本地访问）

在本地机器上执行：
```bash
# 将服务器3000端口转发到本地8080端口
ssh -L 8080:localhost:3000 user@server-ip

# 然后在本地浏览器访问
# http://localhost:8080
```

### 4.2 配置反向代理（公网访问）

**Nginx配置示例：**
```bash
# 安装Nginx
sudo apt install -y nginx

# 创建配置文件
sudo nano /etc/nginx/sites-available/crawler-h5
```

配置内容：
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/crawler-h5 /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4.3 使用curl测试（命令行方式）
```bash
# 测试API接口
curl http://localhost:3000/api/listings

# 测试分页
curl http://localhost:3000/api/listings?page=2&limit=5

# 测试详情
curl http://localhost:3000/api/listings/1237
```

### 4.4 查看HTML页面内容
```bash
# 获取页面HTML
curl http://localhost:3000 > /tmp/page.html

# 使用lynx查看（需安装）
sudo apt install -y lynx
lynx http://localhost:3000
```

---

## 5. 人工干预流程处理

### 5.1 场景说明

本项目主要为数据展示服务，一般无需人工干预。但以下情况可能需要人工介入：

| 场景 | 触发条件 | 处理方式 |
|------|----------|----------|
| 数据库文件缺失 | 启动时找不到crawlerdb.db | 上传数据库文件 |
| 数据库损坏 | 查询返回错误 | 恢复备份或重新生成 |
| 端口冲突 | 3000端口被占用 | 修改端口配置 |
| 需要更新代码 | 功能更新 | 重新构建容器 |

### 5.2 数据库文件上传

```bash
# 上传数据库文件到服务器
scp /local/path/to/crawlerdb.db user@server-ip:/opt/crawler/output/

# 确保权限正确
chown -R user:user /opt/crawler/output/
```

### 5.3 修改端口配置

**方式一：修改docker-compose.yml**
```yaml
services:
  crawler-app:
    ports:
      - "8080:3000"  # 修改宿主机端口
```

**方式二：运行时指定**
```bash
docker run -d \
  --name crawler-h5-app \
  -p 8080:3000 \  # 使用8080端口
  -v /opt/crawler/output:/app/output \
  crawler-h5-image
```

### 5.4 更新代码

```bash
# 停止容器
./deploy.sh -p

# 拉取最新代码（如果使用git）
git pull origin main

# 重新构建
./deploy.sh -b
```

---

## 6. 服务管理命令

### 6.1 使用部署脚本（推荐）
```bash
./deploy.sh -b   # 构建并启动
./deploy.sh -s   # 启动容器
./deploy.sh -p   # 停止容器
./deploy.sh -r   # 重启容器
./deploy.sh -l   # 查看日志
./deploy.sh -c   # 检查状态
./deploy.sh -d   # 销毁容器和镜像
./deploy.sh -h   # 显示帮助
```

### 6.2 原生Docker命令
```bash
# 查看运行中的容器
docker ps

# 查看所有容器
docker ps -a

# 查看容器日志
docker logs -f crawler-h5-app

# 进入容器内部
docker exec -it crawler-h5-app /bin/sh

# 查看容器资源使用
docker stats crawler-h5-app

# 查看容器详细信息
docker inspect crawler-h5-app

# 停止容器
docker stop crawler-h5-app

# 启动容器
docker start crawler-h5-app

# 删除容器
docker rm crawler-h5-app

# 删除镜像
docker rmi crawler-h5-image
```

---

## 7. 故障排查

### 7.1 常见问题及解决方法

| 问题 | 现象 | 排查方法 | 解决方案 |
|------|------|----------|----------|
| 容器启动失败 | `docker ps` 无输出 | 查看日志 | 检查配置文件和依赖 |
| 端口占用 | 启动时报端口已占用 | `netstat -tlnp | grep 3000` | 修改端口或停止占用进程 |
| 数据库连接失败 | API返回500错误 | 查看日志 | 检查数据库文件路径和权限 |
| 无法访问页面 | 浏览器显示连接拒绝 | 检查防火墙和端口映射 | 开放端口或调整配置 |
| 内存不足 | 容器被OOM杀死 | `dmesg | grep oom` | 增加内存或优化应用 |

### 7.2 日志分析

```bash
# 查看最近100行日志
docker logs --tail=100 crawler-h5-app

# 实时查看日志
docker logs -f crawler-h5-app

# 查看启动时的日志
docker logs crawler-h5-app 2>&1 | head -50
```

### 7.3 健康检查

容器内置健康检查，可通过以下命令查看：

```bash
# 查看健康状态
docker inspect --format='{{.State.Health.Status}}' crawler-h5-app

# 查看健康检查日志
docker inspect crawler-h5-app | grep -A 20 "Health"
```

### 7.4 测试API接口

```bash
# 测试首页
curl -I http://localhost:3000

# 测试API列表
curl -s http://localhost:3000/api/listings | head -c 500

# 测试响应时间
curl -w "Response time: %{time_total}s\n" -o /dev/null -s http://localhost:3000/api/listings

# 测试数据库连接
curl -s http://localhost:3000/api/listings | jq '.pagination.total'
```

### 7.5 资源监控

```bash
# 查看容器资源使用
docker stats crawler-h5-app

# 查看系统资源
top
free -h
df -h

# 查看网络状态
netstat -tlnp
ss -tlnp
```

---

## 8. 备份与恢复

### 8.1 备份数据库

```bash
# 创建备份目录
mkdir -p /opt/crawler/backups

# 备份数据库文件
cp /opt/crawler/output/crawlerdb.db /opt/crawler/backups/crawlerdb_$(date +%Y%m%d_%H%M%S).db

# 压缩备份
tar -czvf /opt/crawler/backups/crawlerdb_$(date +%Y%m%d_%H%M%S).tar.gz /opt/crawler/output/crawlerdb.db
```

### 8.2 恢复数据库

```bash
# 停止容器
./deploy.sh -p

# 恢复备份
cp /opt/crawler/backups/crawlerdb_20240101_120000.db /opt/crawler/output/crawlerdb.db

# 启动容器
./deploy.sh -s
```

---

## 9. 安全建议

### 9.1 端口安全
- 限制端口访问来源（使用防火墙）
- 使用HTTPS（配置SSL证书）
- 不要直接暴露容器端口到公网

### 9.2 防火墙配置

```bash
# 允许HTTP访问（如果使用Nginx）
sudo ufw allow 'Nginx Full'

# 仅允许特定IP访问3000端口
sudo ufw allow from 192.168.1.0/24 to any port 3000

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```

### 9.3 定期更新

```bash
# 更新Docker镜像
docker pull node:18-alpine

# 重新构建
./deploy.sh -d
./deploy.sh -b
```

---

## 附录：文件结构

```
/opt/crawler/
├── Dockerfile          # Docker镜像配置
├── docker-compose.yml  # Docker Compose配置
├── deploy.sh           # 部署脚本
├── start.sh            # 启动脚本
├── package.json        # Node.js依赖配置
├── server.js           # 后端服务
├── output/             # 数据库目录
│   └── crawlerdb.db    # SQLite数据库文件
└── public/             # 前端静态资源
    ├── index.html      # H5页面
    ├── styles.css      # 样式文件
    └── app.js          # 前端脚本
```