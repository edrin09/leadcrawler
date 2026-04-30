<?php

namespace app\index\controller;

class IndexController
{
    public function index()
    {
        //301跳转
        return redirect('/admin/index/index');
//        return redirect('https://www.baidu.com');
    }
}