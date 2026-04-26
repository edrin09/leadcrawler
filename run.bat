@echo off
cd /d d:\wwwroot\crawler
set PLAYWRIGHT_BROWSERS_PATH=D:\wwwroot\crawler\browsers
node anjuke\run.js
node goofish\run.js
