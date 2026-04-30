<?php

namespace app\admin\controller;

use app\admin\controller\comm\CommController;
use app\common\model\system\SystemAdmin;
use Exception;
use support\Request;
use support\Response;

class IndexController extends CommController
{
    public function initialize()
    {
        parent::initialize();
    }


    public function index(Request $request): Response
    {
        return $this->fetch();
    }

    public function welcome(Request $request): Response
    {
        return $this->fetch();
    }

    public function editPassword(Request $request): Response
    {
        $id = session('admin.id');
        $model = new SystemAdmin();
        $row = $model->find($id);
        if (empty($row)) return $this->error('用户信息不存在');
        if ($request->isAjax()) {
            $post = request()->post();
            $rules = [
                'password' => 'require',
                'password_again' => 'require',
            ];

            $this->validate($post, $rules);

            if ($post['password'] != $post['password_again']) {
                return $this->error('两次密码输入不一致');
            }
            $newPwd = password($post['password']);
            if ($newPwd == $row->password) return $this->error('新旧密码不能相同');
            try {
                $save = $model->where('id', $id)->update(['password' => $newPwd]);
            } catch (Exception $e) {
                return $this->error('保存失败');
            }
            if ($save) {
                return $this->success('保存成功');
            } else {
                return $this->error('保存失败');
            }
        }
        $this->assign(compact('row'));
        return $this->fetch();
    }
}