<?php

namespace app\admin\controller\mall;

use app\admin\controller\comm\MallComm;
use app\admin\services\annotation\ControllerAnnotation;
use app\common\model\business\MallPhones;

#[ControllerAnnotation(title: '手机号管理')]
class PhoneController extends MallComm
{
    public function initialize()
    {
        $this->model = new MallPhones();
        $this->business = 'phones';

        $this->orderby = 'create_time';

        parent::initialize();
    }
}