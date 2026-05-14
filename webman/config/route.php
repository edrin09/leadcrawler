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
use app\api\controller\business\PhoneExtractorController;
use app\api\controller\business\PhoneManageController;

// 电话提取器 API
Route::group('/api/phone', function () {
    Route::post('/unified', [PhoneExtractorController::class, 'unified']);
    Route::get('/list', [PhoneManageController::class, 'list']);
    Route::post('/add', [PhoneManageController::class, 'add']);
    Route::post('/delete', [PhoneManageController::class, 'delete']);
});

// 电话提取器前端页面
Route::get('/phone-extractor', function () {
    return file_get_contents(public_path() . '/phone-extractor.html');
});

// 电话号码管理前端页面
Route::get('/phone-manage', function () {
    return file_get_contents(public_path() . '/phone-manage.html');
});

// SPA fallback: 根路径下的 /login /list 等路径也返回 index.html
Route::get('/h5/', function () {
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
