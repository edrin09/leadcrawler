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

use app\process\Http;
use support\Log;
use support\Request;

global $argv;

return [
    'webman' => [
        'handler' => Http::class,
        'listen' => 'http://0.0.0.0:' . env('http_port', 8787),
        'count' => cpu_count() * 2,
        'user' => '',
        'group' => '',
        'reusePort' => false,
        'eventLoop' => '',
        'context' => [],
        'constructor' => [
            'requestClass' => Request::class,
            'logger' => Log::channel('default'),
            'appPath' => app_path(),
            'publicPath' => public_path()
        ]
    ],
    // File update detection and automatic reload
    'monitor' => [
        'handler' => app\process\Monitor::class,
        'reloadable' => false,
        'constructor' => [
            // Monitor these directories
            'monitorDir' => array_merge([
                app_path(),
                config_path(),
                base_path() . '/process',
                base_path() . '/support',
                base_path() . '/resource',
                base_path() . '/.env',
            ], glob(base_path() . '/plugin/*/app'), glob(base_path() . '/plugin/*/config'), glob(base_path() . '/plugin/*/api')),
            // Files with these suffixes will be monitored
            'monitorExtensions' => [
                'php', 'html', 'htm', 'env'
            ],
            'options' => [
                'enable_file_monitor' => !in_array('-d', $argv) && DIRECTORY_SEPARATOR === '/',
                'enable_memory_monitor' => DIRECTORY_SEPARATOR === '/',
            ]
        ]
    ],
    // Cron service process
    'cron' => [
        'handler' => app\process\CronProcess::class,
        'count' => 1,
        'reloadable' => true,
        'constructor' => []
    ],

    // WebSocket service process
    'websocket' => [
        'handler' => app\process\WebSocketProcess::class,
        'listen' => (env('ws_ssl', false) ? 'websockets://' : 'websocket://') . '0.0.0.0:' . env('ws_port', 8282),
        'count' => cpu_count() * 2,
        'reloadable' => true,
        'constructor' => [],
        'context' => env('ws_ssl', false) ? [
            'ssl' => [
                // SSL证书路径
                'local_cert' => env('ws_cert', ''),
                // SSL私钥路径
                'local_pk' => env('ws_key', ''),
                // 允许的SSL版本
                'ssl_protocols' => 'TLSv1.2 TLSv1.3',
                // 密码套件
                'ciphers' => 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384'
            ]
        ] : []
    ],
];