<?php

namespace app\api\controller\business;

use app\common\model\business\MallPhone;
use support\Request;
use support\Response;

class PhoneManageController extends ApiMallComm
{
    protected $noNeedLogin = ['list'];

    public function initialize()
    {
        parent::initialize();
    }

    /**
     * 获取电话号码列表
     */
    public function list(Request $request): Response
    {
        $page = (int)$request->get('page', 1);
        $limit = (int)$request->get('limit', 20);
        $keyword = $request->get('keyword', '');

        $query = MallPhone::where('status', 1);

        if (!empty($keyword)) {
            $query->where('phone', 'like', "%{$keyword}%");
        }

        $count = $query->count();
        $list = $query->order('id', 'desc')->page($page, $limit)->select();

        return json([
            'code' => 0,
            'msg' => 'success',
            'data' => [
                'list' => $list,
                'count' => $count,
                'page' => $page,
                'limit' => $limit,
            ],
        ]);
    }

    /**
     * 添加电话号码
     */
    public function add(Request $request): Response
    {
        $phone = $request->post('phone', '');

        if (empty($phone)) {
            return json(['code' => 1, 'msg' => '电话号码不能为空']);
        }

        if (!preg_match('/^1[3-9]\d{9}$/', $phone)) {
            return json(['code' => 1, 'msg' => '电话号码格式不正确']);
        }

        $exists = MallPhone::where('phone', $phone)->find();
        if ($exists) {
            if ($exists->status == 0) {
                $exists->status = 1;
                $exists->save();
                return json(['code' => 0, 'msg' => '电话号码已恢复']);
            }
            return json(['code' => 1, 'msg' => '该电话号码已存在']);
        }

        MallPhone::create([
            'phone' => $phone,
            'source' => 'manual',
            'source_id' => 0,
            'status' => 1,
        ]);

        return json(['code' => 0, 'msg' => '添加成功']);
    }

    /**
     * 删除电话号码（软删除）
     */
    public function delete(Request $request): Response
    {
        $id = $request->post('id', 0);
        $phone = $request->post('phone', '');

        if (empty($id) && empty($phone)) {
            return json(['code' => 1, 'msg' => '请提供ID或电话号码']);
        }

        if (!empty($id)) {
            $record = MallPhone::find($id);
        } else {
            $record = MallPhone::where('phone', $phone)->find();
        }

        if (!$record) {
            return json(['code' => 1, 'msg' => '记录不存在']);
        }

        $record->status = 0;
        $record->save();

        return json(['code' => 0, 'msg' => '删除成功']);
    }
}