<?php

namespace app\admin\controller\mall;

use app\admin\controller\comm\MallComm;
use app\admin\services\annotation\ControllerAnnotation;
use app\admin\services\annotation\NodeAnnotation;
use app\common\model\business\MallCustomer;
use app\common\model\business\MallCustomerExpansion;
use ReflectionProperty;
use support\Request;
use support\Response;
use support\think\Db;
use think\Exception;

#[ControllerAnnotation(title: '客户管理')]
class CustomerController extends MallComm
{
    public function initialize()
    {
        $this->model = new MallCustomer();
        $this->business = 'customer';
        $this->orderby = $this->model->name . '.' . $this->model->pk;

        parent::initialize();

        $this->with_join = ['expansion' => [
            'login_num',
            'login_time',
        ]];
    }

    public function add(Request $request): Response
    {
        if ($request->isAjax()) {
            $post = $request->post();

            $info = $this->model->findUser(['username' => $post['username']]);
            if ($info) {
                return $this->error('用户名已存在');
            }
            $post['openid'] = md5(request()->getRealIp() . time());
            $post['password'] = md5($post['password']);

            $rule = [];
            $this->validate($post, $rule);

            Db::startTrans();
            try {
                $this->model->createUser($post, '', 0, 'h5');

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

    #[NodeAnnotation(title: '编辑', auth: true)]
    public function edit(Request $request)
    {
        $id = input("{$this->model->getPk()}", '');
        $main = $this->model->find($id);
        empty($main) && $this->error('数据不存在');

        if ($request->isAjax()) {
            $main_data = $request->post();

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
        unset($form_type['username']);
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

        $row = $this->model->where('customer_id', $id)->find();
        $row->isEmpty() && $this->error('数据不存在');

        Db::startTrans();
        try {
            $row->delete();
            MallCustomerExpansion::where('customer_id', $id)->delete();
            Db::commit();

        } catch (Exception $e) {
            Db::rollback();
            return $this->error($e->getMessage());
        }

        return $this->success('删除成功');
    }

}