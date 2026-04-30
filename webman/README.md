项目启动：
bash
php start.php start      # 前台启动
php start.php start -d   # 后台启动

打包二进制包：
如果有报错：  The 'phar.readonly' is 'On', build phar must setting it 'Off' or exec with 'php -d phar.readonly=0 ./webman build:bin'  
请运行：php -d phar.readonly=0 ./webman build:bin