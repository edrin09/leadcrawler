<?php

namespace app\admin\controller\mall;

use app\admin\controller\comm\MallComm;
use app\admin\services\annotation\ControllerAnnotation;
use app\common\model\business\MallCustomer;

#[ControllerAnnotation(title: '客户管理')]
class CustomerController extends MallComm
{
    public function initialize()
    {
        $this->model = new MallCustomer();
        $this->business = 'customer';
        parent::initialize();

        $this->with_join = ['expansion' => [
            'login_num',
//            'login_time',
        ]];
    }
}