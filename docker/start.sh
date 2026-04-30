#!/bin/bash

set -e

echo "=== 安装依赖 ==="
npm install --production

echo "=== 启动开发服务器 ==="
node server.js