<?php

namespace app\admin\controller\system;

use app\admin\controller\comm\CommController;
use app\admin\services\annotation\ControllerAnnotation;
use app\admin\services\annotation\NodeAnnotation;
use app\admin\services\MenuService;
use app\admin\services\TriggerService;
use app\common\model\system\SystemMenu;
use app\common\model\system\SystemNode;
use Exception;
use support\Request;
use support\Response;
use support\think\Db;

#[ControllerAnnotation(title: '菜单管理')]
class MenuController extends CommController
{
    public function initialize()
    {
        parent::initialize();
        $this->orderby = 'sort';
        $this->model = new SystemMenu();
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
        $MenuService = new MenuService(session('admin.id', 0));

        $id = $request->input('id');
        if ($request->isAjax()) {
            $post = $request->post();

            $rule = [
                'title' => 'require',
                'icon' => 'require',
//                'captcha|验证码' => 'require|captcha',
            ];
            $this->validate($post, $rule);

            Db::startTrans();
            try {
                if ($post['href']) {
                    $post['href'] = trim($post['href']);
                    // 根据 href 创建 JS 文件
                    $MenuService->createJsFileFromHref($post['href']);

                    // 更新节点
                    $this->updateNode($post['title'], $post['href']);
                    // 更新节点
                    $post['href'] = $post['href'] . '/index';

                    $this->model->create($post);
                    TriggerService::updateMenu();
                }
                Db::commit();
            } catch (Exception $e) {
                Db::rollback();
                return $this->error($e->getMessage());
            }

            return $this->success('保存成功');
        }
        $pidMenuList = $this->model->getPidMenuList();
        $this->assign(compact('id', 'pidMenuList'));
        return $this->fetch();
    }

    protected function updateNode($title, $base_node)
    {
        $list = [
            ['node' => '', 'title' => $title, 'type' => 1, 'is_auth' => 1],
            ['node' => '/index', 'title' => '列表', 'type' => 2, 'is_auth' => 1],
            ['node' => '/add', 'title' => '添加', 'type' => 2, 'is_auth' => 1],
            ['node' => '/edit', 'title' => '编辑', 'type' => 2, 'is_auth' => 1],
            ['node' => '/delete', 'title' => '删除', 'type' => 2, 'is_auth' => 1],
            ['node' => '/modify', 'title' => '属性修改', 'type' => 2, 'is_auth' => 1],
            ['node' => '/import', 'title' => '导入', 'type' => 2, 'is_auth' => 1],
            ['node' => '/export', 'title' => '导出', 'type' => 2, 'is_auth' => 1],
        ];

        foreach ($list as $item) {
            $info = SystemNode::where('node', $base_node . $item['node'])->find();
            if (empty($info)) {
                SystemNode::create([
                    'node' => $base_node . $item['node'],
                    'title' => $item['title'],
                    'type' => $item['type'],
                    'is_auth' => $item['is_auth'],
                ]);
            }
        }
    }

    #[NodeAnnotation(title: '编辑', auth: true)]
    public function edit(Request $request): Response
    {
        $id = $request->input('id');
        $row = $this->model->find($id);
        if (empty($row)) return $this->error('数据不存在');
        if ($request->isAjax()) {
            $post = $request->post();

            $rule = [
                'title' => 'require',
                'icon' => 'require',
            ];
            $this->validate($post, $rule);

            $row->title = $post['title'];
            $row->icon = $post['icon'];
            $row->remark = $post['remark'] ?? '';

            $row->save();

            TriggerService::updateMenu();
            return $this->success('保存成功');
        }
        $pidMenuList = $this->model->getPidMenuList();
        $this->assign(compact('id', 'row', 'pidMenuList'));
        return $this->fetch();
    }

    #[NodeAnnotation(title: '属性修改', auth: true)]
    public function modify(Request $request): Response
    {
        $post = $request->post();
        $rules = [
            'id' => 'require',
            'field' => 'require',
        ];
        $this->validate($post, $rules);
        $row = $this->model->find($post['id']);
        if (empty($row)) {
            return $this->error('数据不存在');
        }
        try {
            foreach ($post as $key => $item) if ($key == 'field') $row->$item = $post['value'];
            $row->save();
        } catch (Exception $e) {
            return $this->error($e->getMessage());
        }
        TriggerService::updateMenu();
        return $this->success('保存成功');
    }

    #[NodeAnnotation(title: '删除', auth: true)]
    public function delete(Request $request): Response
    {
        if (!$request->isAjax()) return $this->error();
        $id = $request->input('id');
        if (!is_array($id)) $id = (array)$id;
        $row = $this->model->whereIn('id', $id)->find();
        if (empty($row)) {
            return $this->error('数据不存在');
        }
        $MenuService = new MenuService(session('admin.id', 0));

        Db::startTrans();
        try {
            if ($row->href) {
                //去除/index 再删除节点
                $href = str_replace('/index', '', $row->href);

                //删除子菜单节点
                SystemNode::where('node', 'like', $href . '%')->delete();

                //删除js文件
                $MenuService->deleteJsFileFromHref($href);
            } else {
                //递归删除 子菜单 先查出来 再删除
                $child_list = $this->model->where('pid', $row->id)->select();
                foreach ($child_list as $item) {
                    //去除/index 再删除节点
                    $href = str_replace('/index', '', $item->href);

                    //删除子菜单节点
                    SystemNode::where('node', 'like', $href . '%')->delete();
                    //删除js文件
                    $MenuService->deleteJsFileFromHref($href);

                    $item->delete();
                }
            }

            TriggerService::updateMenu();
            $row->delete();

            Db::commit();

        } catch (Exception $e) {
            Db::rollback();
            return $this->error($e->getMessage());
        }

        return $this->success('删除成功');
    }

    #[NodeAnnotation(title: '添加菜单提示', auth: true)]
    public function getMenuTips(Request $request): Response
    {
        $node = $request->input('keywords');
        $list = SystemNode::where('node', 'Like', "%{$node}%")->limit(10)->field('node', 'title')->select()->toArray();
        return json([
            'code' => 0,
            'content' => $list,
            'type' => 'success',
        ]);
    }
}
