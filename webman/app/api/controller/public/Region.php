<?php

namespace app\api\controller\public;

use app\common\controller\ApiController;
use app\common\model\SystemRegion;
use think\App;

class Region extends ApiController
{
    protected $noNeedLogin = ['getSelectList', 'getProvinceList', 'getCityList', 'getDistrictList'];

    public function initialize()
    {
        $this->_initialize();
    }

    public function getSelectList()
    {
        $city_list = [];
        $province = SystemRegion::where('level', 1)->cache(true)->column('region_id,region_name', 'region_id');
        $list = SystemRegion::where('level', 2)
            ->field('region_id,region_name,parent_id')
            ->cache(true)
            ->select();
        foreach ($list as $key => $value) {
            $province_name = '';
            if (isset($province[$value['parent_id']])) {
                $province_name = $province[$value['parent_id']]['region_name'];
            }

            $city_list[$key]['province_id'] = $value['parent_id'];
//            $city_list[$key]['province_name'] = $province_name;
            $city_list[$key]['city_id'] = $value['region_id'];
            $city_list[$key]['city_name'] = $province_name . '' . $value['region_name'];
        }

        return $this->renderSuccess($city_list);
    }

    public function getProvinceList()
    {
        $rule['region_id'] = 'number';
        $this->validate($this->param, $rule);

        if (!empty($this->param['region_id'])) {
            $where['region_id'] = $this->param['region_id'];
        }
        $where['level'] = 1;
        $list = SystemRegion::where($where)->cache(true)->field('region_id as province_id,region_name as province_name')->select();

        return $this->renderSuccess(['province_list' => $list]);
    }
    public function getCityList()
    {
        $rule['province_id'] = 'require|number';
        $this->validate($this->param, $rule);

        $where['parent_id'] = $this->param['province_id'];
        $where['level'] = 2;

        $list = SystemRegion::where($where)->cache(true)->field('region_id as city_id,region_name as city_name,db09_lng,db09_lat')->select();

        return $this->renderSuccess(['city_list' => $list]);
    }

    public function getDistrictList()
    {
        $rule['city_id'] = 'require|number';
        $this->validate($this->param, $rule);

        $where['parent_id'] = $this->param['city_id'];
        $where['level'] = 3;

        $list = SystemRegion::where($where)->cache(true)->field('region_id as district_id,region_name as district_name,db09_lng,db09_lat')->select();

        return $this->renderSuccess(['district_list' => $list]);
    }
}