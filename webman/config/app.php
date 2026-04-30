<?php
/**
 * This file is part of webman.
 *
 * Licensed under The MIT License
 * For full copyright and license information, please see the MIT-LICENSE.txt
 * Redistributions of files must retain the above copyright notice.
 *
 * @author    walkor<walkor@workerman.net>
 * @copyright walkor<walkor@workerman.net>
 * @link      http://www.workerman.net/
 * @license   http://www.opensource.org/licenses/mit-license.php MIT License
 */

use support\Request;

return [
    'debug' => env('APP_DEBUG', true),
    'error_reporting' => E_ALL,
    'default_timezone' => 'Asia/Shanghai',
    'request_class' => Request::class,
    'public_path' => base_path(false) . DIRECTORY_SEPARATOR . 'public',
    'runtime_path' => base_path(false) . DIRECTORY_SEPARATOR . 'runtime',
    'controller_suffix' => 'Controller',
    'controller_reuse' => false,

    // SQL日志过滤规则
    'sql_log_filter' => [
        // 排除记录的表名（小写，支持任意表名）
        'exclude_tables' => [
            'ed_admin_logs_',
            'ed_api_logs_',
            'ed_api_logs_sql_',
            'ed_admin_logs_sql_',
            'ed_system_admin',
            'ed_system_auth',
            'ed_system_auth_node',
            'ed_system_menu',
            'ed_system_node',
        ],
        // 排除记录的SQL命令（小写，支持CONNECT、SHOW TABLES等）
        'exclude_commands' => [
            'connect',              // 排除CONNECT命令
            'show tables',          // 排除SHOW TABLES命令
            'show full columns',    // 排除SHOW FULL COLUMN命令
            'create table',         // 排除CREATE TABLE命令
            'alter table',          // 排除ALTER TABLE命令
        ]
    ],
];
