<?php

namespace app\api\controller\business;

use app\api\service\business\DiseaseService;

class DiseaseController extends ApiMallComm
{
    public function initialize()
    {
        parent::initialize();
    }

    /**
     * 病种列表（按首字母排序）
     */
    public function getDiseaseCategoryList()
    {
        $diseaseService = new DiseaseService($this->param, $this->user_info);
        $disease_category = $diseaseService->getDiseaseCategoryList();

        return $this->render_success($disease_category);
    }

    /**
     * 疾病列表
     */
    public function getDiseaseList()
    {
        $diseaseService = new DiseaseService($this->param, $this->user_info);
        $disease = $diseaseService->getDiseaseList();

        return $this->render_success($disease);
    }

    /**
     * 疾病对应医院列表
     */
    public function getHospitalList()
    {
        $rule['disease_id'] = 'require|integer';
        $this->validate($this->param, $rule);

        $diseaseService = new DiseaseService($this->param, $this->user_info);
        $hospital_list = $diseaseService->getHospitalList();

        return $this->render_success($hospital_list);
    }
}