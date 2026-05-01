<?php

namespace app\admin\controller\mall;

use app\admin\controller\comm\MallComm;
use app\admin\services\annotation\ControllerAnnotation;
use app\common\model\business\MallData;

#[ControllerAnnotation(title: '数据管理')]
class DataController extends MallComm
{
    public function initialize()
    {
        $this->model = new MallData();
        $this->business = 'data';

        $this->orderby = 'crawler_time';

        parent::initialize();
    }
}