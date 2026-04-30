运行命令

php webman build:bin
同时可以指定以哪个php版本打包，例如

php webman build:bin 8.1
打包后会在bulid目录生成一个webman.bin文件

启动
将webman.bin上传至linux服务器，执行 ./webman.bin start 或 ./webman.bin start -d 即可启动。

注意事项
1、强烈建议本地php版本和打包版本一致，例如本地是php8.1，打包也用php8.1，避免出现兼容问题
2、打包会下载php8的源码，但是并不会本地安装，不会影响本地php环境
3、webman.bin目前只支持在x86_64架构的linux系统运行，不支持在mac系统运行
4、打包后的项目不支持reload，更新代码需要restart重启
5、默认不打包env文件(config/plugin/webman/console/app.php中exclude_files控制)，所以启动时env文件应该放置与webman.bin相同目录下
6、运行过程中会在webman.bin所在目录生成runtime目录，用于存放日志文件
7、目前webman.bin不会读取外部php.ini文件，如需要自定义php.ini，请在 /config/plugin/webman/console/app.php 文件custom_ini中设置 
    有些文件不需要打包，可以设置config/plugin/webman/console/app.php排除掉，避免打包后的文件过大
8、二进制打包不支持使用swoole协程
9、切勿将用户上传的文件存储在二进制包中，因为以phar://协议操作用户上传的文件是非常危险的(phar反序列化漏洞)。 用户上传的文件必须单独存储在包之外的磁盘中。
10、如果你的业务需要上传文件到public目录，需要将public目录独立出来放在webman.bin所在目录，这时候需要配置config/app.php如下并重新打包。

    'public_path' => base_path(false) . DIRECTORY_SEPARATOR . 'public',