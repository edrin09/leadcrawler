<?php

namespace app\admin\controller\system;

use app\admin\controller\comm\CommController;
use app\admin\services\annotation\ControllerAnnotation;
use app\admin\services\annotation\NodeAnnotation;
use app\admin\services\TriggerService;
use app\common\model\system\SystemAdmin;
use support\Request;
use support\Response;

#[ControllerAnnotation(title: '管理员管理')]
class AdminController extends CommController
{
    public function initialize()
    {
        parent::initialize();
        $this->model = new SystemAdmin();
        $auth_list = $this->model->getAuthList();
        $this->assign(compact('auth_list'));
    }

    #[NodeAnnotation(title: '列表', auth: true)]
    public function index(Request $request): Response
    {
        if ($request->isAjax()) {
            if ($request->input('selectFields')) {
                return $this->selectList();
            }
            list($page, $limit, $where) = $this->buildTableParams();
            $count = $this->model->where($where)->count();
            $list = $this->model->where($where)->order($this->orderby . ' desc')->paginate($limit)->items();
            $data = [
                'code' => 0,
                'msg' => '',
                'count' => $count,
                'data' => $list,
            ];
            return json($data);
        }
        return $this->fetch();
    }

    #[NodeAnnotation(title: '添加', auth: true)]
    public function add(Request $request): Response
    {
        if ($request->isAjax()) {
            $post = $request->post();
            $params['username'] = $post['username'] ?? '';
            $params['auth_ids'] = $post['auth_ids'] ?? '';
            $params['remark'] = $post['remark'] ?? '';
            $params['password'] = password($post['password']);

            $this->model->create($params);

            return $this->success('保存成功');
        }
        return $this->fetch();
    }

    #[NodeAnnotation(title: '编辑', auth: true)]
    public function edit(Request $request): Response
    {
        $id = $request->input('id');
        $row = $this->model->find($id);

        if (empty($row)) return $this->error('数据不存在');
        if ($request->isAjax()) {
            $post = $request->post();

            $row->username = $post['username'];
            $row->auth_ids = $post['auth_ids'];
            $row->remark = $post['remark'];

            $row->save();

            TriggerService::updateMenu();
            return $this->success('保存成功');
        }

        $this->assign(compact('row'));
        return $this->fetch();
    }

    #[NodeAnnotation(title: '修改密码', auth: true)]
    public function password(Request $request): Response
    {
        $id = $request->input('id');
        $row = $this->model->find($id);
        if (empty($row)) return $this->error('数据不存在');
        if ($request->isAjax()) {
            $post = $request->post();

            $rule['password'] = 'require|string';
            $rule['password_again'] = 'require|string';

            $this->validate($post, $rule);

            if ($post['password'] != $post['password_again']) {
                return $this->error('两次密码输入不一致');
            }

            $row->password = password($post['password']);
            $row->save();

            return $this->success('保存成功');
        }
        $this->assign(compact('row'));
        return $this->fetch();
    }


    #[NodeAnnotation(title: '删除', auth: true)]
    public function delete(Request $request): Response
    {
        if (!$request->isAjax()) return $this->error();
        $id = $request->input('id');
        if (!is_array($id)) $id = (array)$id;
        $row = $this->model->whereIn('id', $id)->find();
        if (empty($row)) return $this->error('数据不存在');

        $this->model->whereIn('id', $id)->delete();

        return $this->success('删除成功');
    }


    #[NodeAnnotation(title: '属性修改', auth: true)]
    public function modify(Request $request): Response
    {
        if (!$request->isAjax()) return $this->error();
        $post = $request->post();

        $rule['id'] = 'require|string';
        $rule['field'] = 'require|string';

        $this->validate($post, $rule);

        $row = $this->model->find($post['id']);
        if (empty($row)) {
            return $this->error('数据不存在');
        }

        foreach ($post as $key => $item) if ($key == 'field') $row->$item = $post['value'];
        $row->save();

        return $this->success('保存成功');
    }
}
