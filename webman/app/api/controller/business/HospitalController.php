<?php

namespace app\api\controller\business;

use app\api\service\business\HospitalService;

class HospitalController extends ApiMallComm
{
    public function initialize()
    {
        parent::initialize();
    }

    /**
     * 医院列表
     */
    public function getHospitalList()
    {
        $rule['keyword'] = 'string';
        $this->validate($this->param, $rule);

        $HospitalService = new HospitalService($this->param, $this->user_info);
        $res = $HospitalService->getHospitalList();

        return $this->render_success($res);
    }

    /**
     * 医院详情
     */
    public function getHospitalDetail()
    {
        $rule['hospital_id'] = 'require|integer';
        $this->validate($this->param, $rule);

        $HospitalService = new HospitalService($this->param, $this->user_info);
        $res = $HospitalService->getHospitalDetail();

        return $this->render_success($res);
    }
}