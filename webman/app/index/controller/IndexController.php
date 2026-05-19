<?php

namespace app\index\controller;

class IndexController
{
    public function index()
    {
        //301跳转
        return redirect('/h5/index');
//        return redirect('https://www.baidu.com');
    }
}