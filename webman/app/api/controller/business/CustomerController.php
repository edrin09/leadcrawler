<?php

namespace app\api\controller\business;

use app\api\service\business\CustomerService;

class CustomerController extends ApiMallComm
{
    protected $noNeedLogin = [];

    public function initialize()
    {
        parent::initialize();
    }


    /**
     * 科室列表（按首字母排序）
     */
    public function getInfo()
    {
        $CustomerService = new CustomerService($this->param, $this->user_info);
        $customer_info = $CustomerService->getInfo();

        return $this->render_success($customer_info);
    }
}