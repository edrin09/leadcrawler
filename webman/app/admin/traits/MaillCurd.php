<?php

namespace app\admin\traits;

use app\admin\services\annotation\NodeAnnotation;
use app\admin\services\tool\CommonTool;
use app\common\model\system\SystemForm;
use Exception;
use jianyan\excel\Excel;
use ReflectionProperty;
use support\Request;
use support\Response;
use support\think\Db;

/**
 * 后台CURD复用
 * Trait Curd
 * @package app\admin\traits
 */
trait MaillCurd
{
    #[NodeAnnotation(title: '列表', auth: true)]
    public function index(Request $request): Response
    {
        if ($request->isAjax()) {
            if ($request->input('selectFields')) {
                return $this->selectList();
            }
            list($page, $limit, $where) = $this->buildTableParams();
            $listArr = $this->getList($where, false, true, $page, $limit);
//d($listArr);
            return json($this->formatSuccessRrturn($listArr['count'], $listArr['list']));
        }
        return $this->fetch('admin/mall/comm/index');
    }

    protected function getList($where, $is_arr = false, $is_page = true, $page = 1, $limit = 10)
    {
        $count = 0;
        if ($is_page) {
            $count = $this->model
                ->withJoin($this->with_join, $this->join_type)
                ->where($where)
//                ->fetchSql()
                ->count();

//            d($count);
        }
        $list = $this->model
            ->field($this->model->field)
            ->withJoin($this->with_join, $this->join_type)
            ->when($this->business, function ($query) {
                switch ($this->business) {
                    case 'manage':
                        $query->with(['region']);
                        break;
                }
            })
            ->where($where)
            ->when($is_page == true, function ($query) use ($page, $limit) {
                $query->page($page, $limit);
            })
            ->order($this->orderby, $this->sort)
//            ->fetchSql()
            ->select();
//        d($list);

        if ($is_arr) {
            $list = $list->toArray();
        }
        return ['count' => $count, 'list' => $list];
    }

    protected function formatSuccessRrturn($count, $list)
    {
        $data['code'] = 0;
        $data['msg'] = '';
        $data['count'] = $count;
        $data['data'] = $list;

        return $data;
    }

    #[NodeAnnotation(title: '添加', auth: true)]
    public function add(Request $request): Response
    {
        if ($request->isAjax()) {
            $post = $request->post();
            $rule = [];
            $this->validate($post, $rule);

            Db::startTrans();
            try {
                $this->model->create($post);

                Db::commit();

            } catch (Exception $e) {
                Db::rollback();
                return $this->error($e->getMessage());
            }
            return $this->success('新增成功');
        }

        // 获取表单配置
        $form_type = $this->getFormType($this->cid);
        // 检查模型中是否有默认值设置
        $defaultValues = [];
        if (property_exists($this->model, 'defaultValues')) {
            // 使用反射获取可能是protected的属性值
            $reflection = new ReflectionProperty($this->model, 'defaultValues');
            $reflection->setAccessible(true);
            $defaultValues = $reflection->getValue($this->model);
        }

        // 设置默认值
        foreach ($form_type as &$item) {
            // 如果模型中有默认值设置，则使用它
            if (isset($defaultValues[$item['input_title']])) {
                $item['value'] = $defaultValues[$item['input_title']];
            }
        }
//pre($this->getSelectedArray($form_type));

        $type['form_type'] = 'add';
        $this->assign([
            'type' => $type,
            'main_list' => $this->getSelectedArray($form_type),
        ]);
        return $this->fetch('admin/mall/comm/save');
    }

    protected function getFormType($cid)
    {
        return SystemForm::order('sort desc')
            ->where('cid', $cid)
            ->where('status', 1)
            ->column('input_type,input_title,input_remarks,sort,required,edit,uploads_type,uploads_icon,uploads_exts,selected_data,data_json', 'input_title');
    }

    protected function getSelectedArray($main_list)
    {
        foreach ($main_list as &$item) {
            if ($item['selected_data']) {
                if ($item['selected_data'] == 'custom') {
                    $data_arr = [];
                    $datas = json_decode($item['data_json'], true);
                    if (is_array($datas)) {
                        foreach ($datas as $k => $v) {
                            $data_arr[$k]['id'] = $k;
                            $data_arr[$k]['title'] = $v;
                        }
                    }
                    $item['selected_array'] = $data_arr;
                } else {
                    $item['selected_array'] = $this->selected_arr[$item['selected_data']] ?? [];
                }
            }
        }

        return $main_list;
    }

    #[NodeAnnotation(title: '编辑', auth: true)]
    public function edit(Request $request)
    {
        $id = input("{$this->model->getPk()}", '');
        $main = $this->model->find($id);
        empty($main) && $this->error('数据不存在');

        if ($request->isAjax()) {
            $main_data = $request->post();
            //获取名称的首字母 大写
            if (isset($main_data['name'])) {
                $main_data['initial'] = CommonTool::getChineseFirstLetter($main_data['name']);
            }

            // 保存科室关联
            $departmentIds = $main_data['department_ids'] ?? [];
            unset($main_data['department_ids']);

            Db::startTrans();
            try {
                $main->save($main_data);

                Db::commit();

            } catch (Exception $e) {
                Db::rollback();
                return $this->error($e->getMessage());
            }
            return $this->success('保存成功');
        }

        $form_type = $this->getFormType($this->cid);
        $main_list = [];
        $main_data = $main->toArray();

        foreach ($main_data as $key => $value) {
            if (isset($form_type[$key])) {
                $data['value'] = $value;
                $main_list[] = array_merge($data, $form_type[$key]);
            }
        }

        $type['form_type'] = 'edit';
        $this->assign([
            'type' => $type,
            'main_list' => $this->getSelectedArray(array2_sort($main_list, 'sort')),
            'main_data' => $main_data,
        ]);

        return $this->fetch('admin/mall/comm/save');
    }

    #[NodeAnnotation(title: '删除', auth: true)]
    public function delete(Request $request): Response
    {
        $id = input("{$this->model->getPk()}");//获取主键ID
        $pk_name = $this->model->getPk();

        $row = $this->model->where($pk_name, $id)->find();
        $row->isEmpty() && $this->error('数据不存在');

        Db::startTrans();
        try {
            $row->delete();
            Db::commit();

        } catch (Exception $e) {
            Db::rollback();
            return $this->error($e->getMessage());
        }

        return $this->success('删除成功');
    }

    #[NodeAnnotation(title: '导出', auth: true)]
    public function export(Request $request): Response|bool
    {
        list($page, $limit, $where) = $this->buildTableParams();
        $tableName = $this->model->getName();
        $tableName = CommonTool::humpToLine(lcfirst($tableName));
        $prefix = config('database.connections.mysql.prefix');
        
        // 使用数据库无关的方式获取表字段信息
        $dbList = Db::getFields($prefix . $tableName);

        $header = [];
        // 模型中设置禁止导出的字段
        $noExportFields = $this->model->noExportFields ?? [];
        foreach ($dbList as $fieldName => $fieldInfo) {
            $comment = !empty($fieldInfo['comment']) ? $fieldInfo['comment'] : $fieldName;
            if (!in_array($fieldName, $noExportFields)) {
                $header[] = [$comment, $fieldName];
            }
        }

        $order_key = $this->model->getPk();//这里
        $list = $this->model
            ->where($where)
            ->order($order_key, 'desc')
            ->select()
            ->toArray();

        $fileName = $this->model->name . '_export_' . date('Y_m_d_H_i_s') . '.xlsx';
        return Excel::exportData($list, $header, $fileName, 'xlsx');
    }

    #[NodeAnnotation(title: '属性修改', auth: true)]
    public function modify(Request $request): Response
    {
        $post = $request->post();
        $rule = [
            'id' => 'require',
            'field' => 'require',
//            'value' => 'require',
        ];
        $this->validate($post, $rule);
        $row = $this->model->find($post['id']);
        if (!$row) {
            $this->error('数据不存在');
        }
        try {
            Db::transaction(function () use ($post, $row) {
                $row->save([
                    $post['field'] => $post['value'],
                ]);
            });
        } catch (Exception $e) {
            return $this->error($e->getMessage());
        }
        return $this->success('保存成功');
    }
}