<?php

namespace app\admin\controller\system;

use app\admin\controller\comm\CommController;
use app\admin\services\annotation\ControllerAnnotation;
use app\admin\services\annotation\NodeAnnotation;
use app\common\model\system\SystemCronJob;
use app\common\model\system\SystemCronLog;
use app\common\service\CronService;
use support\Request;
use support\Response;

#[ControllerAnnotation(title: '计划任务管理')]
class CronJobController extends CommController
{
    public function initialize()
    {
        parent::initialize();
        $this->model = new SystemCronJob();
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
        if ($request->isPost()) {
            $data = $request->post();

            // 验证数据
            $validate = $this->validate($data, [
                'name' => 'require',
                'command' => 'require',
                'expression' => 'require',
                'type' => 'require|in:1,2,3',
            ]);

            if ($validate !== true) {
                return $this->error($validate);
            }

            // 计算下次执行时间
            $cronService = new CronService();
            $data['next_run_time'] = $cronService->calculateNextRunTime($data['expression']);
            $data['status'] = isset($data['status']) ? 1 : 0;

            // 保存任务
            SystemCronJob::create($data);

            return $this->success('添加成功');
        }

        return $this->fetch();
    }

    #[NodeAnnotation(title: '编辑', auth: true)]
    public function edit(Request $request): Response
    {
        $id = $request->input('id');
        $job = $this->model->find($id);
        if (!$job) {
            return $this->error('任务不存在');
        }

        if ($request->isPost()) {
            $data = $request->post();

            // 验证数据
            $validate = $this->validate($data, [
                'name' => 'require',
                'command' => 'require',
                'expression' => 'require',
                'type' => 'require|in:1,2,3',
            ]);

            if ($validate !== true) {
                return $this->error($validate);
            }

            // 计算下次执行时间
            $cronService = new CronService();
            $data['next_run_time'] = $cronService->calculateNextRunTime($data['expression']);
            $data['status'] = isset($data['status']) ? 1 : 0;

            // 更新任务
            $job->save($data);

            return $this->success('编辑成功');
        }

//        d($job);
        $this->assign('job', $job);
        return $this->fetch();
    }

    #[NodeAnnotation(title: '删除', auth: true)]
    public function delete(Request $request): Response
    {
        $id = $request->input('id');
        $job = SystemCronJob::find($id);
        if (!$job) {
            return $this->error('任务不存在');
        }

        $job->delete();
        return $this->success('删除成功');
    }

    #[NodeAnnotation(title: '日志', auth: true)]
    public function cronlogs(Request $request): Response
    {
        $job_id = $request->input('id');

        if ($request->isAjax()) {
            if ($request->input('selectFields')) {
                return $this->selectList();
            }
            list($page, $limit, $where) = $this->buildTableParams();
            
            // 添加任务ID筛选条件
            if ($job_id) {
                $where['job_id'] = $job_id;
            }
            
            $count = SystemCronLog::where($where)->count();
            $list = SystemCronLog::where($where)->order('id desc')->paginate($limit)->items();
            $data = [
                'code' => 0,
                'msg' => '',
                'count' => $count,
                'data' => $list,
            ];
            return json($data);
        }

        $this->assign('job_id', $job_id);
        return $this->fetch();
    }

    #[NodeAnnotation(title: '执行', auth: true)]
    public function run(Request $request): Response
    {
        $id = $request->input('id');
        $job = SystemCronJob::find($id);
        if (!$job) {
            return $this->error('任务不存在');
        }

        // 立即执行任务
        $cronService = new CronService();
        $cronService->executeJob($job, time());

        return $this->success('任务已开始执行');
    }

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