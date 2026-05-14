#!/bin/bash
set -e

echo "=========================================="
echo "  Headless Crawler + Webman Container"
echo "  Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

export DISPLAY=:99
export PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

if [ -z "$(ls -A /ms-playwright 2>/dev/null)" ]; then
    echo "[INIT] Installing Playwright Chromium browser..."
    cd /app/crawler && npx playwright install chromium
fi

echo "[INIT] Verifying browser installation..."
if [ -d "/ms-playwright" ]; then
    echo "[INIT] Playwright browsers path: $(ls /ms-playwright/)"
fi

echo "[INIT] Verifying Tesseract OCR..."
tesseract --version 2>/dev/null || echo "[WARN] Tesseract not found"

echo "[INIT] Verifying PHP..."
php -v 2>/dev/null | head -1 || echo "[WARN] PHP not found"

echo "[INIT] Verifying webman..."
if [ -f /app/webman/start/start.php ]; then
    echo "[INIT] webman start file found"
else
    echo "[WARN] webman start file not found"
fi

echo "[INIT] Starting services via supervisord..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf