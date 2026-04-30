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

return [
    // api中间件
    'api' => [
        app\api\middleware\ApiBefore::class,
        app\api\middleware\ApiSqlLog::class,
        app\api\middleware\ApiAfter::class,
    ],

    // 后台中间件
    'admin' => [
        app\admin\middleware\AdminBefore::class,
        app\admin\middleware\CheckLogin::class,
        app\admin\middleware\CheckAuth::class,
//        app\admin\middleware\AdminSqlLog::class,
        app\admin\middleware\AdminAfter::class,
    ],
];