#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "  采集系统初始化脚本"
echo "  Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

check_docker() {
    if ! command -v docker &> /dev/null; then
        echo "[ERROR] Docker 未安装，请先安装 Docker"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        echo "[ERROR] Docker 服务未运行，请启动 Docker"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo "[ERROR] docker-compose 未安装"
        exit 1
    fi

    echo "[OK] Docker 环境检查通过"
}

setup_env() {
    if [ ! -f "$PROJECT_DIR/.env" ]; then
        echo "[INIT] 创建 .env 配置文件..."
        cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
        echo "[OK] .env 文件已创建，请根据需要修改配置"
    else
        echo "[OK] .env 文件已存在"
    fi
}

create_directories() {
    echo "[INIT] 创建数据目录..."

    mkdir -p "$PROJECT_DIR/../crawler/output"
    mkdir -p "$PROJECT_DIR/../crawler/logs"
    mkdir -p "$PROJECT_DIR/../crawler/screenshots/manual"
    mkdir -p "$PROJECT_DIR/../crawler/storage"
    mkdir -p "$PROJECT_DIR/../webman/runtime/logs"
    mkdir -p "$PROJECT_DIR/../webman/runtime/views"

    echo "[OK] 数据目录创建完成"
}

set_permissions() {
    echo "[INIT] 设置目录权限..."

    chmod -R 755 "$PROJECT_DIR/../crawler/output" 2>/dev/null || true
    chmod -R 755 "$PROJECT_DIR/../crawler/logs" 2>/dev/null || true
    chmod -R 755 "$PROJECT_DIR/../crawler/screenshots" 2>/dev/null || true
    chmod -R 755 "$PROJECT_DIR/../crawler/storage" 2>/dev/null || true
    chmod -R 777 "$PROJECT_DIR/../webman/runtime" 2>/dev/null || true

    echo "[OK] 权限设置完成"
}

build_images() {
    echo "[INIT] 构建 Docker 镜像..."
    cd "$PROJECT_DIR"

    if docker compose version &> /dev/null; then
        docker compose build --no-cache
    else
        docker-compose build --no-cache
    fi

    echo "[OK] 镜像构建完成"
}

start_services() {
    echo "[INIT] 启动服务..."
    cd "$PROJECT_DIR"

    if docker compose version &> /dev/null; then
        docker compose up -d
    else
        docker-compose up -d
    fi

    echo "[OK] 服务启动完成"
}

wait_for_services() {
    echo "[INIT] 等待服务就绪..."

    local max_wait=120
    local waited=0
    local interval=5

    while [ $waited -lt $max_wait ]; do
        if curl -s http://localhost:${CRAWLER_PORT:-3001}/health > /dev/null 2>&1; then
            echo "[OK] 采集服务已就绪"
            break
        fi
        echo "[WAIT] 等待采集服务启动... (${waited}s/${max_wait}s)"
        sleep $interval
        waited=$((waited + interval))
    done

    if [ $waited -ge $max_wait ]; then
        echo "[WARN] 采集服务启动超时，请检查日志"
    fi

    waited=0
    while [ $waited -lt $max_wait ]; do
        if curl -s http://localhost:${WEBMAN_PORT:-8787} > /dev/null 2>&1; then
            echo "[OK] Webman 服务已就绪"
            break
        fi
        echo "[WAIT] 等待 Webman 服务启动... (${waited}s/${max_wait}s)"
        sleep $interval
        waited=$((waited + interval))
    done

    if [ $waited -ge $max_wait ]; then
        echo "[WARN] Webman 服务启动超时，请检查日志"
    fi
}

show_status() {
    echo ""
    echo "=========================================="
    echo "  服务启动完成！"
    echo "=========================================="
    echo ""
    echo "  访问地址:"
    echo "    API 服务:       http://localhost:${CRAWLER_PORT:-3001}"
    echo "    Webman 管理后台: http://localhost:${WEBMAN_PORT:-8787}"
    echo "    调度管理:        http://localhost:${SCHEDULER_PORT:-3000}"
    echo "    Grafana 监控:    http://localhost:${GRAFANA_PORT:-3002}"
    echo "    Prometheus:      http://localhost:${PROMETHEUS_PORT:-9090}"
    echo ""
    echo "  常用命令:"
    echo "    查看日志:    docker compose logs -f crawler"
    echo "    查看状态:    docker compose ps"
    echo "    停止服务:    docker compose down"
    echo "    重启服务:    docker compose restart"
    echo ""
}

main() {
    check_docker
    setup_env
    create_directories
    set_permissions
    build_images
    start_services
    wait_for_services
    show_status
}

main "$@"