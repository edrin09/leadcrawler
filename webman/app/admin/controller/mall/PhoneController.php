<?php

namespace app\admin\controller\mall;

use app\admin\controller\comm\MallComm;
use app\admin\services\annotation\ControllerAnnotation;
use app\admin\services\annotation\NodeAnnotation;
use app\common\model\business\MallPhones;
use support\Request;
use support\Response;

#[ControllerAnnotation(title: '手机号管理')]
class PhoneController extends MallComm
{
    public function initialize()
    {
        $this->model = new MallPhones();
        $this->business = 'phone';

        $this->orderby = 'create_time';

        parent::initialize();
    }

    #[NodeAnnotation(title: '列表', auth: true)]
    public function index(Request $request): Response
    {
        if ($request->isAjax()) {
            if ($request->input('selectFields')) {
                return $this->selectList();
            }

            $mall_data_id = $request->input('mall_data_id',0);

            $list = $this->model
                ->field($this->model->field)
                ->where('mall_data_id',$mall_data_id)
                ->order($this->orderby, $this->sort)
//            ->fetchSql()
                ->select();
//        d($list);

            //d($listArr);
            return json($this->formatSuccessRrturn(0, $list));
        }
        return $this->fetch('admin/mall/comm/index');
    }



}