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

Route::get('/h5', function () {
    return file_get_contents(public_path() . '/h5/index.html');
});

Route::get('/h5/', function () {
    return file_get_contents(public_path() . '/h5/index.html');
});

Route::group('/api', function () {
    Route::get('/listings', 'app\api\controller\business\CrawlerController@index');
    Route::get('/listings/{id}', 'app\api\controller\business\CrawlerController@show');
});

Route::group('/common', function () {
    Route::any('/[{path:.+}]', function ($request) {
        return view('404');
    });
});