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
use app\api\controller\PhoneExtractorController;

// 电话提取器 API
Route::group('/api/phone', function () {
    Route::post('/extract', [PhoneExtractorController::class, 'extract']);
    Route::post('/analyze', [PhoneExtractorController::class, 'analyze']);
    Route::post('/search', [PhoneExtractorController::class, 'search']);
    Route::post('/variations', [PhoneExtractorController::class, 'variations']);
});

// 电话提取器前端页面
Route::get('/phone-extractor', function () {
    return file_get_contents(public_path() . '/phone-extractor.html');
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
