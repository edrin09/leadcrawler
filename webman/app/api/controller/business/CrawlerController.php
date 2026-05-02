<?php

namespace app\api\controller\business;

use app\common\model\business\MallData;

class CrawlerController extends ApiMallComm
{
    protected $noNeedLogin = [];
    protected $noCheckCustomer = [];

    public function initialize()
    {
        parent::initialize();
        $this->model = new MallData();
    }
}
