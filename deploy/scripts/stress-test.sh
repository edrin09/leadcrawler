#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

CRAWLER_PORT="${CRAWLER_PORT:-3001}"
CONCURRENT_USERS="${1:-10}"
TEST_DURATION="${2:-60}"
RAMP_UP="${3:-5}"

echo "=========================================="
echo "  采集系统压力测试"
echo "=========================================="
echo "  并发用户数: $CONCURRENT_USERS"
echo "  测试时长:   ${TEST_DURATION}s"
echo "  预热时间:   ${RAMP_UP}s"
echo "=========================================="

check_service() {
    echo "[CHECK] 检查服务状态..."
    if ! curl -s "http://localhost:${CRAWLER_PORT}/health" > /dev/null 2>&1; then
        echo "[ERROR] 采集服务不可用，请先启动服务"
        exit 1
    fi
    echo "[OK] 采集服务正常"
}

run_health_test() {
    echo ""
    echo "[TEST] 健康检查压力测试..."
    echo "----------------------------------------"

    local start_time=$(date +%s)
    local end_time=$((start_time + TEST_DURATION))
    local total=0
    local success=0
    local failed=0
    local min_time=999999
    local max_time=0
    local total_time=0

    while [ $(date +%s) -lt $end_time ]; do
        local req_start=$(date +%s%N)
        if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${CRAWLER_PORT}/health" | grep -q "200"; then
            success=$((success + 1))
        else
            failed=$((failed + 1))
        fi
        local req_end=$(date +%s%N)
        local req_time=$(( (req_end - req_start) / 1000000 ))

        total=$((total + 1))
        total_time=$((total_time + req_time))

        [ $req_time -lt $min_time ] && min_time=$req_time
        [ $req_time -gt $max_time ] && max_time=$req_time

        if [ $((total % 100)) -eq 0 ]; then
            echo "  已完成 $total 次请求..."
        fi
    done

    local avg_time=$((total_time / total))

    echo ""
    echo "  健康检查测试结果:"
    echo "    总请求数:   $total"
    echo "    成功:       $success"
    echo "    失败:       $failed"
    echo "    成功率:     $(awk "BEGIN {printf \"%.2f%%\", ($success/$total)*100}")"
    echo "    最小响应:   ${min_time}ms"
    echo "    最大响应:   ${max_time}ms"
    echo "    平均响应:   ${avg_time}ms"
}

run_crawl_test() {
    echo ""
    echo "[TEST] 采集接口压力测试..."
    echo "----------------------------------------"

    local sources=("58" "anjuke")
    local total=0
    local success=0
    local failed=0

    for source in "${sources[@]}"; do
        echo "  测试采集源: $source"

        for i in $(seq 1 $CONCURRENT_USERS); do
            local req_start=$(date +%s%N)
            local http_code=$(curl -s -o /dev/null -w "%{http_code}" \
                -X POST "http://localhost:${CRAWLER_PORT}/api/crawl/$source" \
                -H "Content-Type: application/json" \
                --max-time 30 2>/dev/null || echo "000")

            local req_end=$(date +%s%N)
            local req_time=$(( (req_end - req_start) / 1000000 ))

            total=$((total + 1))
            if [ "$http_code" = "200" ] || [ "$http_code" = "202" ]; then
                success=$((success + 1))
            else
                failed=$((failed + 1))
            fi

            echo "    请求 #$i: HTTP $http_code (${req_time}ms)"
        done
    done

    echo ""
    echo "  采集接口测试结果:"
    echo "    总请求数:   $total"
    echo "    成功:       $success"
    echo "    失败:       $failed"
    if [ $total -gt 0 ]; then
        echo "    成功率:     $(awk "BEGIN {printf \"%.2f%%\", ($success/$total)*100}")"
    fi
}

check_resources() {
    echo ""
    echo "[CHECK] 资源使用情况..."
    echo "----------------------------------------"

    cd "$PROJECT_DIR"
    if docker compose version &> /dev/null; then
        docker compose stats --no-stream 2>/dev/null || true
    else
        docker-compose stats --no-stream 2>/dev/null || true
    fi
}

main() {
    check_service
    run_health_test
    run_crawl_test
    check_resources

    echo ""
    echo "=========================================="
    echo "  压力测试完成"
    echo "=========================================="
}

main "$@"