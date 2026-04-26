@echo off
cd /d D:\wwwroot\crawler
set PLAYWRIGHT_BROWSERS_PATH=D:\wwwroot\crawler\browsers
node playwright_auto.js
pause
