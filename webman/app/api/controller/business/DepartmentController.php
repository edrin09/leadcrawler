<?php

namespace app\api\controller\business;

use app\common\model\business\MallDepartment;

class DepartmentController extends ApiMallComm
{
    public function initialize()
    {
        parent::initialize();
    }

    /**
     * 科室列表（按首字母排序）
     */
    public function list()
    {
        $departmentModel = new MallDepartment();
        $departments = $departmentModel->getDepartmentsByInitial();

        return $this->render_success($departments);
    }

    /**
     * 医院科室列表
     */
    public function hospital()
    {
        $rule['hospital_id'] = 'require|string';
        $this->validate($this->param, $rule);

        $departmentModel = new MallDepartment();
        $departments = $departmentModel->getHospitalDepartments($this->param['hospital_id'], 'department_id, name, initial');

        return $this->render_success($departments);
    }
}