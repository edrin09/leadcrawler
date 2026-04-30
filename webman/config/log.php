<?php

return [
    // ⭐ 默认通道
    'default' => [
        'handlers' => [
            [
                'class' => Monolog\Handler\RotatingFileHandler::class,
                'constructor' => [
                    runtime_path() . '/logs/app.log',
                    30,
                    Monolog\Logger::DEBUG,
                    true,
                ],
                'formatter' => [
                    'class' => Monolog\Formatter\LineFormatter::class,
                    'constructor' => [
                        "[%datetime%] %channel%.%level_name%: %message% %context%\n",
                        'Y-m-d H:i:s',
                        true,
                    ],
                ],
            ]
        ],
    ],

    // ⭐ API 专用通道（含 SQL）
    'api' => [
        'handlers' => [
            [
                'class' => Monolog\Handler\RotatingFileHandler::class,
                'constructor' => [
                    runtime_path() . '/logs/api.log',
                    30,
                    Monolog\Logger::DEBUG, // ⚠️ 必须 DEBUG
                ],
                'formatter' => [
                    'class' => Monolog\Formatter\LineFormatter::class,
                    'constructor' => [
                        "%datetime% %message% %context%\n",
                        'Y-m-d H:i:s',
                        true,
                    ],
                ],
            ]
        ],
    ],

    // ⭐ ADMIN 专用通道
    'admin' => [
        'handlers' => [
            [
                'class' => Monolog\Handler\RotatingFileHandler::class,
                'constructor' => [
                    runtime_path() . '/logs/admin.log',
                    30,
                    Monolog\Logger::DEBUG,
                ],
                'formatter' => [
                    'class' => Monolog\Formatter\LineFormatter::class,
                    'constructor' => [
                        "[%datetime%] %channel%.%level_name%: %message% %context%\n",
                        'Y-m-d H:i:s',
                        true,
                    ],
                ],
            ]
        ],
    ],

    // ⭐ CRON 专用通道
    'cron' => [
        'handlers' => [
            [
                'class' => Monolog\Handler\RotatingFileHandler::class,
                'constructor' => [
                    runtime_path() . '/logs/cron.log',
                    30,
                    Monolog\Logger::DEBUG,
                ],
                'formatter' => [
                    'class' => Monolog\Formatter\LineFormatter::class,
                    'constructor' => [
                        "[%datetime%] %channel%.%level_name%: %message% %context%\n",
                        'Y-m-d H:i:s',
                        true,
                    ],
                ],
            ]
        ],
    ],

    // ⭐ ws 专用通道
    'ws' => [
        'handlers' => [
            [
                'class' => Monolog\Handler\RotatingFileHandler::class,
                'constructor' => [
                    runtime_path() . '/logs/ws.log',
                    30,
                    Monolog\Logger::DEBUG,
                ],
                'formatter' => [
                    'class' => Monolog\Formatter\LineFormatter::class,
                    'constructor' => [
                        "[%datetime%] %channel%.%level_name%: %message% %context%\n",
                        'Y-m-d H:i:s',
                        true,
                    ],
                ],
            ]
        ],
    ],
];