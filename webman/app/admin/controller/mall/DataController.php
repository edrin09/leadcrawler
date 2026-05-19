<?php

namespace app\admin\controller\mall;

use app\admin\controller\comm\MallComm;
use app\admin\services\annotation\ControllerAnnotation;
use app\common\model\business\MallData;
use support\Request;
use support\Response;

#[ControllerAnnotation(title: '数据管理')]
class DataController extends MallComm
{
    public function initialize()
    {
        $this->model = new MallData();
        $this->business = 'data';

        $this->orderby = 'create_time';

        parent::initialize();
    }

    public function invalid(Request $request): Response
    {
        $id = input('id');//获取主键ID

        $row = $this->model->where('id', $id)->find();
        $row->isEmpty() && $this->error('数据不存在');

        $row->status = 0;
        $row->save();

        return $this->success('删除成功');
    }
}