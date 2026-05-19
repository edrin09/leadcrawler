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

use Webman\Route;

// SPA fallback: 根路径下的 /login /list 等路径也返回 index.html1
Route::get('/h5', function () {
    return file_get_contents(public_path() . '/h5/index.html');
});

Route::get('/login', function () {
    return file_get_contents(public_path() . '/h5/index.html');
});

Route::get('/list', function () {
    return file_get_contents(public_path() . '/h5/index.html');
});

Route::group('/common', function () {
    Route::any('/[{path:.+}]', function ($request) {
        return view('404');
    });
});
