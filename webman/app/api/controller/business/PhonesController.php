<?php

namespace app\api\controller\business;

use app\common\model\business\MallPhones;

class PhonesController extends ApiMallComm
{
    protected $noNeedLogin = [];
    protected $noCheckCustomer = [];

    public function initialize()
    {
        parent::initialize();
        $this->model = new MallPhones();
    }

    public function getItemPhones()
    {
        $rule['id'] = 'require|number';
        $this->validate($this->param, $rule);

        $details = $this->model
            ->where('mall_data_id', $this->param['id'])
            ->where('status', 1)
            ->field($this->model->field)
            ->select();

        return $this->renderSuccess($details);
    }

    public function saveInvalidPhone()
    {
        $rule['id'] = 'require|number';
        $this->validate($this->param, $rule);

        $info = $this->model->where('id', $this->param['id'])->find();
        if (!$info) {
            return $this->renderSuccess([], '手机号不存在');
        }
        $info->status = 0;
        $info->save();

        return $this->renderSuccess();
    }


    public function addPhone()
    {
        $rule['mall_data_id'] = 'require|number';
        $rule['phone'] = 'require|string';
        $this->validate($this->param, $rule);


        $data_info = $this->model->where('id', $this->param['mall_data_id'])->find();
        if (!$data_info) {
            return $this->renderSuccess([], '主数据不存在');
        }

        $add_data['mall_data_id'] = $data_info->id;
        $add_data['phone'] = $this->param['phone'];
        $add_data['source_platform'] = '前台主动添加';

        $this->model->save($add_data);

        return $this->renderSuccess();
    }
}
