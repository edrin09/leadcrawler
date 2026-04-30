<?php

namespace app\api\controller\business;


use app\api\service\business\ServiceTypeService;

class ServiceTypeController extends ApiMallComm
{
    protected $noNeedLogin = [];

    public function initialize()
    {
        parent::initialize();
    }

    public function getServiceTypeList()
    {
        $ServiceTypeService = new ServiceTypeService($this->param, $this->user_info);
        $service_type_list = $ServiceTypeService->getServiceTypeList();
        return $this->render_success($service_type_list);
    }
}