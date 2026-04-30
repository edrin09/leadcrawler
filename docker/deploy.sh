#!/bin/bash

set -e

APP_NAME="crawler-h5-app"
CONTAINER_NAME="crawler-h5-app"
IMAGE_NAME="crawler-h5-image"
PORT="3000"

show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo "部署H5爬虫应用到Docker容器"
    echo
    echo "Options:"
    echo "  -b, --build          构建Docker镜像并启动容器"
    echo "  -s, --start          启动已存在的容器"
    echo "  -p, --stop           停止容器"
    echo "  -r, --restart        重启容器"
    echo "  -l, --logs           查看容器日志"
    echo "  -c, --check          检查服务状态"
    echo "  -d, --destroy        停止并删除容器和镜像"
    echo "  -h, --help           显示此帮助信息"
}

build_and_run() {
    echo "=== 构建Docker镜像 ==="
    docker build -t ${IMAGE_NAME} .
    
    echo "=== 停止并移除旧容器 ==="
    docker stop ${CONTAINER_NAME} 2>/dev/null || true
    docker rm ${CONTAINER_NAME} 2>/dev/null || true
    
    echo "=== 创建数据目录 ==="
    mkdir -p output
    
    echo "=== 启动容器 ==="
    docker-compose up -d
    
    echo "=== 等待服务启动 ==="
    sleep 10
    
    check_status
}

start_container() {
    echo "=== 启动容器 ==="
    docker-compose start
    sleep 5
    check_status
}

stop_container() {
    echo "=== 停止容器 ==="
    docker-compose stop
}

restart_container() {
    echo "=== 重启容器 ==="
    docker-compose restart
    sleep 5
    check_status
}

show_logs() {
    echo "=== 查看容器日志 ==="
    docker-compose logs -f
}

check_status() {
    echo "=== 检查服务状态 ==="
    
    if docker-compose ps | grep -q "Up"; then
        echo "✓ 容器运行正常"
        
        echo "=== 测试API接口 ==="
        if curl -s http://localhost:${PORT}/api/listings > /dev/null; then
            echo "✓ API接口正常"
            echo ""
            echo "服务访问地址:"
            echo "  - H5页面: http://localhost:${PORT}"
            echo "  - API接口: http://localhost:${PORT}/api/listings"
        else
            echo "✗ API接口异常"
            show_logs
        fi
    else
        echo "✗ 容器未运行"
        show_logs
    fi
}

destroy_container() {
    echo "=== 停止并删除容器 ==="
    docker-compose down
    
    echo "=== 删除镜像 ==="
    docker rmi ${IMAGE_NAME} 2>/dev/null || true
    
    echo "=== 删除数据目录 ==="
    read -p "是否删除数据目录(output/)? (y/N): " confirm
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        rm -rf output/
        echo "数据目录已删除"
    fi
    
    echo "清理完成"
}

case "$1" in
    -b|--build)
        build_and_run
        ;;
    -s|--start)
        start_container
        ;;
    -p|--stop)
        stop_container
        ;;
    -r|--restart)
        restart_container
        ;;
    -l|--logs)
        show_logs
        ;;
    -c|--check)
        check_status
        ;;
    -d|--destroy)
        destroy_container
        ;;
    -h|--help)
        show_help
        ;;
    *)
        show_help
        exit 1
        ;;
esac