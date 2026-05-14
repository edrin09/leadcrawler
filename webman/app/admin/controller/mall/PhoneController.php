<?php

namespace app\admin\controller\mall;

use app\admin\controller\comm\MallComm;
use app\admin\services\annotation\ControllerAnnotation;
use app\admin\services\annotation\NodeAnnotation;
use app\common\model\business\MallPhone;
use support\Request;
use support\Response;

#[ControllerAnnotation(title: '电话号码管理')]
class PhoneController extends MallComm
{

    public function initialize()
    {
        $this->model = new MallPhone();
        $this->business = 'phone';

        $this->orderby = 'create_time';

        parent::initialize();
    }

    #[NodeAnnotation(title: '添加', auth: true)]
    public function add(Request $request): Response
    {
        if ($request->isPost()) {
            $data = $request->post();

            $validate = $this->validate($data, [
                'phone' => 'require|regex:/^1[3-9]\d{9}$/',
            ], [
                'phone.require' => '请输入电话号码',
                'phone.regex' => '电话号码格式不正确',
            ]);

            if ($validate !== true) {
                return $this->error($validate);
            }

            $phone = $data['phone'];
            $exists = MallPhone::where('phone', $phone)->find();
            if ($exists) {
                if ($exists->status == 0) {
                    $exists->status = 1;
                    $exists->save();
                    return $this->success('电话号码已恢复');
                }
                return $this->error('该电话号码已存在');
            }

            MallPhone::create([
                'phone' => $phone,
                'source' => 'manual',
                'source_id' => 0,
                'status' => 1,
            ]);

            return $this->success('添加成功');
        }

        return $this->fetch();
    }

    #[NodeAnnotation(title: '删除', auth: true)]
    public function delete(Request $request): Response
    {
        $id = $request->input('id');
        $record = MallPhone::find($id);
        if (!$record) {
            return $this->error('记录不存在');
        }

        $record->status = 0;
        $record->save();

        return $this->success('删除成功');
    }

    public function modify(Request $request): Response
    {
        if (!$request->isAjax()) {
            return $this->error();
        }
        $post = $request->post();

        $rule['id'] = 'require|string';
        $rule['field'] = 'require|string';

        $this->validate($post, $rule);

        $row = $this->model->find($post['id']);
        if (empty($row)) {
            return $this->error('数据不存在');
        }

        foreach ($post as $key => $item) {
            if ($key == 'field') {
                $row->$item = $post['value'];
            }
        }
        $row->save();

        return $this->success('保存成功');
    }
}