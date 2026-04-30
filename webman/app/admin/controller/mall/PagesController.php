<?php

namespace app\admin\controller\mall;

use app\admin\controller\comm\MallComm;
use app\admin\services\annotation\ControllerAnnotation;
use app\admin\services\annotation\NodeAnnotation;
use app\common\model\business\AdminOperationLog;
use app\common\model\business\MallPages;
use support\Request;
use support\Response;
use think\Exception;
use think\facade\Db;

#[ControllerAnnotation(title: '客户管理')]
class PagesController extends MallComm
{
    public function initialize()
    {
        $this->model = new MallPages();
        parent::initialize();
    }

    #[NodeAnnotation(title: '列表', auth: true)]
    public function index(Request $request): Response
    {
        $cid = input('cid', '');
        $where['cid'] = $cid;
        $where['status'] = 1;

        $main_list = $this->model
            ->where($where)
            ->order('sort desc')
//            ->fetchSql(true)
            ->column('id,cid,value,input_title,input_remarks,input_type,uploads_exts,uploads_type,uploads_icon');

        $this->assign([
            'cid' => $cid,
            'main_list' => $main_list,
        ]);

        return $this->fetch();
    }

    public function edit(Request $request): Response
    {
        $post = $request->post();

        $rule['image'] = 'url';
        $rule['video'] = 'url';
        $rule['document'] = 'url';
        $this->validate($post, $rule);

        $cid = $post['cid'];

        unset($post['file']);
        unset($post['cid']);

        Db::startTrans();
        try {
            foreach ($post as $key => $val) {
                $where['cid'] = $cid;
                $where['input_title'] = $key;
                $info = $this->model->where($where)->find();
                if ($info) {
                    if ($info['uploads_number']) {
                        if (!$this->checkImgNumber($post, $info)) {
                            $this->error('请上传' . $info['uploads_number'] . '张' . $info['remark']);
                        }
                    }
                    $info->value = $val;
                    $info->save();
                }
            }

            $remarks = '更新单页面：【' . $cid . '】信息';
            AdminOperationLog::addtAdminOperationLog($request->adminUserInfo, $remarks);

            Db::commit();

        } catch (Exception $e) {
            Db::rollback();
            return $this->error($e->getMessage());
        }

        return $this->success('保存成功');
    }


    public function checkImgNumber($post, $info)
    {
        if (!empty($post['atlas']) && count(explode("|", $post['atlas'])) != $info['uploads_number']) {
            return false;
        }
        if (!empty($post['background']) && count(explode("|", $post['background'])) != $info['uploads_number']) {
            return false;
        }
        if (!empty($post['image']) && count(explode("|", $post['image'])) != $info['uploads_number']) {
            return false;
        }
        if (!empty($post['mobile_background']) && count(explode("|", $post['mobile_background'])) != $info['uploads_number']) {
            return false;
        }
        if (!empty($post['video']) && count(explode("|", $post['video'])) != $info['uploads_number']) {
            return false;
        }

        return true;
    }
}