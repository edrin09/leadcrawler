<?php


namespace app\admin\controller\comm;

use app\admin\traits\MaillCurd;
use app\common\model\business\MallDepartment;
use app\common\model\business\MallDiseaseCategory;
use app\common\model\business\MallHospital;
use app\common\model\business\MallServiceType;
use Exception;

class MallComm extends CommController
{
    use MaillCurd;

    protected $business;
    protected $business_type;

    protected $selected_arr = [];
    protected $data_brage = [];
    protected $cid;
    protected $auth_header;

    protected $with_join = [];
    protected $join_type = 'INNER';

    public function initialize()
    {
        parent::initialize();
        if (!isset($this->model)) {
            throw new Exception('Model must be initialized in child class');
        }

        $this->cid = input('cid', '');
        $this->sort = input('sort', 'desc');
        $this->business_type = input('business_type', '');
        $this->pk = $this->model->getPk();
        $this->orderby = $this->pk;
        $this->auth_header = 'mall/' . $this->business;

        $data['cid'] = $this->cid;
        $data['pk'] = $this->pk;
        $data['business_type'] = $this->business_type;
        $data['auth_header'] = $this->auth_header;

        $this->assign(compact('data'));

        //权限控制渲染
        $auth['auth_add'] = auths($this->auth_header . '/add');
        $auth['auth_edit'] = auths($this->auth_header . '/edit');
        $auth['auth_del'] = auths($this->auth_header . '/delete');
        $auth['auth_export'] = auths($this->auth_header . '/export');
        $auth['auth_import'] = auths($this->auth_header . '/import');
        $auth['auth_item'] = true;
        $auth['auth_info'] = true;


//        pre($auth, 'auth', false, true);
        $this->assign(compact('auth'));
    }

    public function getHospitalList()
    {
        $where['status'] = 1;
        // 获取医院列表数据
        $hospital = MallHospital::where($where)->column('name as title,hospital_id as id', 'hospital_id as id');

        $this->selected_arr['hospital'] = $hospital;
        foreach ($hospital as $item) {
            $this->data_brage['hospital'][$item['id']] = $item['title'];
        }

        // 将医院数据添加到data-brage中
        $this->assign('dataBrage', json_encode($this->data_brage), true);
    }

    public function getServiceTypeList()
    {
        $where['status'] = 1;
        // 获取医院列表数据
        $service_type = MallServiceType::where($where)->column('name as title,type_id as id', 'type_id as id');

        $this->selected_arr['service_type'] = $service_type;
        foreach ($service_type as $item) {
            $this->data_brage['service_type'][$item['id']] = $item['title'];
        }

        // 将服务类型数据添加到data-brage中
        $this->assign('dataBrage', json_encode($this->data_brage), true);
    }

    public function getDiseaseCategoryList()
    {
        $where['status'] = 1;
        // 获取医院列表数据
        $disease_category = MallDiseaseCategory::where($where)->column('name as title,category_id as id', 'category_id as id');

        $this->selected_arr['disease_category'] = $disease_category;
        foreach ($disease_category as $item) {
            $this->data_brage['disease_category'][$item['id']] = $item['title'];
        }

        // 将医院数据添加到data-brage中
        $this->assign('dataBrage', json_encode($this->data_brage), true);
    }

    /**
     * 获取医院科室列表（按医院分组）
     */
    public function getDepartmentListByHospital()
    {
        $where['status'] = 1;
        // 获取医院列表
        $hospitals = MallHospital::where($where)->select();

        $departmentsByHospital = [];
        foreach ($hospitals as $hospital) {
            // 获取每个医院的科室列表
            $departments = MallDepartment::where(['hospital_id' => $hospital->hospital_id, 'status' => 1])->column('name as title,department_id as id');
            if ($departments) {
                $departmentsByHospital[$hospital->hospital_id] = $departments;
            }
        }

        $this->assign('departmentsByHospital', json_encode($departmentsByHospital), true);
    }
}