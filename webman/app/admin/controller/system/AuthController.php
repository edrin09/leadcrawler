<?php

namespace app\admin\controller\system;

use app\admin\controller\comm\CommController;
use app\admin\services\annotation\ControllerAnnotation;
use app\admin\services\annotation\NodeAnnotation;
use app\admin\services\TriggerService;
use app\common\model\system\SystemAuth;
use app\common\model\system\SystemAuthNode;
use Exception;
use support\Request;
use support\Response;

#[ControllerAnnotation(title: '角色权限管理')]
class AuthController extends CommController
{
    public function initialize()
    {
        parent::initialize();
        $this->model = new SystemAuth();
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

    #[NodeAnnotation(title: '授权', auth: true)]
    public function authorizes(Request $request): Response
    {
        $id = $request->input('id');
        $row = $this->model->find($id);
        if (empty($row)) return $this->error('数据不存在');
        if ($request->isAjax()) {
            $list = $this->model->getAuthorizeNodeListByAdminId($id);
            return $this->success('获取成功', $list);
        }
        $this->assign(compact('row'));
        return $this->fetch();
    }


    #[NodeAnnotation(title: '添加', auth: true)]
    public function add(Request $request): Response
    {
        if ($request->isAjax()) {
            try {
                $this->model->create($request->post());
            } catch (Exception $e) {
                return $this->error('保存失败:' . $e->getMessage());
            }
            return $this->success('保存成功');
        }
        return $this->fetch();
    }

    #[NodeAnnotation(title: '编辑', auth: true)]
    public function edit(Request $request)
    {
        $id = (int)$request->input('id');
        $row = $this->model->find($id);
        if (empty($row)) return $this->error('数据不存在');
        if ($request->isAjax()) {

            $update_data = $request->post();
            unset($update_data['_token']);
            try {
                $this->model->where('id', $id)->update($update_data);
            } catch (Exception $e) {
                return $this->error('保存失败:' . $e->getMessage());
            }
            return $this->success('保存成功');
        }
        $this->assign(compact('row'));
        return $this->fetch();
    }


    #[NodeAnnotation(title: '授权保存', auth: true)]
    public function saveAuthorize(Request $request): Response
    {
        if (!$request->isAjax()) return $this->error();
        $id = request()->input('id');
        $node = request()->post('node', "[]");
        $node = json_decode($node, true);
        $row = $this->model->find($id);
        if (empty($row)) return $this->error('数据不存在');
        try {
            $authNode = new SystemAuthNode();
            $authNode->where('auth_id', $id)->delete();
            if (!empty($node)) {
                $saveAll = [];
                foreach ($node as $vo) {
                    $saveAll[] = [
                        'auth_id' => $id,
                        'node_id' => $vo,
                    ];
                }
                $authNode->saveAll($saveAll);
            }
            TriggerService::updateMenu();
        } catch (Exception $e) {
            return $this->error('保存失败:' . $e->getMessage());
        }
        return $this->success('保存成功');
    }


    #[NodeAnnotation(title: '删除', auth: true)]
    public function delete(Request $request): Response
    {
        if (!$request->isAjax()) return $this->error();
        $id = $request->input('id');
        if (!is_array($id)) $id = (array)$id;
        $row = $this->model->whereIn('id', $id)->find();
        if (empty($row)) return $this->error('数据不存在');
        try {
            $this->model->whereIn('id', $id)->delete();
        } catch (Exception $e) {
            return $this->error('删除失败:' . $e->getMessage());
        }
        return $this->success('删除成功');
    }


    #[NodeAnnotation(title: '属性修改', auth: true)]
    public function modify(Request $request): Response
    {
        if (!$request->isAjax()) return $this->error();
        $post = $request->post();
        $rule = [
            'id' => 'require',
            'field' => 'require',
        ];

        $this->validate($post, $rule);
        $row = $this->model->find($post['id']);
        if (empty($row)) {
            return $this->error('数据不存在');
        }
        try {
            foreach ($post as $key => $item) if ($key == 'field') $row->$item = $post['value'];
            $row->save();
        } catch (Exception $e) {
            return $this->error("操作失败:" . $e->getMessage());
        }
        return $this->success('保存成功');
    }
}
