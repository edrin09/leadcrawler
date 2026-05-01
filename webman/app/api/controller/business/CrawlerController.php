<?php

namespace app\api\controller\business;

use app\api\service\business\CrawlerService;

class CrawlerController extends ApiMallComm
{
    protected $noNeedLogin = [];
    protected $noCheckCustomer = [];

    public function initialize()
    {
        parent::initialize();
    }

    /**
     * 获取用户信息
     */
    public function getList()
    {
        $CrawlerService = new CrawlerService($this->param, $this->user_info);
//        $customer_info = $CrawlerService->getInfo();
//
//        return $this->render_success($customer_info);
    }

    public function getInfo()
    {

    }
}
