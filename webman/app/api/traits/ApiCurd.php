<?php

namespace app\api\traits;

use Exception;
use support\exception\BusinessException;

/**
 */
trait ApiCurd
{
    public function getList()
    {
        $data = [];

        $rule['business_id'] = 'number';
        $rule['business_type'] = 'alphaDash';
        $this->validate($this->param, $rule);

        $where['status'] = 1;
        if (!empty($this->param['business_ids'])) {
            $where[$this->model->pk] = $this->param['business_ids'];
        }
        if (!empty($this->param['business_type'])) {
            $where['business_type'] = $this->param['business_type'];
        }

        $orders_field = $this->orders_field ?? 'sort desc';

        if ($this->is_page) {
            $count = $this->model
                ->where($where)
                ->when($this->is_cache != false, function ($query) {
                    $query->cache(true);
                })
                ->count();

            $paginated['count'] = (string)$count;
            $paginated['page'] = (string)$this->page;
            $paginated['limit'] = (string)$this->limit;
            $paginated['more'] = (string)($count - $this->page * $this->limit > 0 ? 1 : 0);

            $data['paginated'] = $paginated;
        }
        $list = $this->model
            ->where($where)
            ->when($this->is_cache != false, function ($query) {
                $query->cache(true);
            })
            ->when($this->is_page == true, function ($query) {
                $query->page($this->page, $this->limit);
            })
            ->order($orders_field)
//            ->fetchSql(true)
            ->select();

//        dd($list);
        if ($list) {
            $data['list'] = $this->needHtmlTransformed($list->toArray());
        }

        return $this->renderSuccess($data);
    }

    protected function needHtmlTransformed($data, $is_list = true)
    {
        $html_decode = ['subtitle', 'describe'];
        foreach ($data as $key => &$value) {
            if ($is_list && !empty($value['images'])) {
                $value['images'] = explode('|', $value['images']);
            }
            if ($is_list == false && $key == 'images' && !empty($value)) {
                $value = explode('|', $value);
            }

            foreach ($html_decode as $item) {
                if ($is_list && !empty($value[$item])) {
                    $value[$item] = htmlspecialchars_decode($value[$item]);
                }

                if ($is_list == false && $key == $item) {
                    $value = htmlspecialchars_decode($value);
                }
            }
        }

        return $data;
    }

    public function getInfo()
    {
        $data = [];

        $rule['business_id'] = 'require|number';
        $this->validate($this->param, $rule);

        $details = $this->model
            ->where($this->model->pk, $this->param['business_id'])
            ->when($this->is_cache != false, function ($query) {
                $query->cache(true);
            })
            ->find();

        if ($details) {
            $data['details'] = $this->needHtmlTransformed($details->toArray(), false);
        }
        return $this->renderSuccess($data);
    }

    public function saveInfo()
    {
        $rule['business_id'] = 'require|number';
        $this->validate($this->param, $rule);

        $details = $this->model->where($this->model->pk, $this->param['business_id'])->find();
        if (empty($details)) {
            throw new BusinessException('记录不存在', 401);
        }

        $details->save($this->param);
        return $this->renderSuccess();
    }

    public function delInfo()
    {
        $rule['business_id'] = 'require|number';
        $this->validate($this->param, $rule);

        $details = $this->model->where($this->model->pk, $this->param['business_id'])->find();
        if (empty($details)) {
            throw new BusinessException('记录不存在', 401);
        }
        try {
            $details->delete();
        } catch (Exception $e) {
            throw new BusinessException($e->getMessage(), 401);
        }

        return $this->renderSuccess();
    }
}
