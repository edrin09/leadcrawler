<?php

namespace app\api\controller\business;

use app\api\service\business\DistributionService;

/**
 * 分销API控制器
 */
class DistributionController extends ApiMallComm
{
    protected $noNeedLogin = [];

    public function initialize()
    {
        parent::initialize();
    }

    /**
     * 获取分销配置
     */
    public function getConfig()
    {
        $DistributionService = new DistributionService($this->param, $this->user_info);
        $res = $DistributionService->getConfig();

        return $this->render_success($res);
    }

    /**
     * 建立分销关系
     */
    public function createRelation()
    {
        $rule['parent_id'] = 'require|number';
        $this->validate($this->param, $rule);

        $DistributionService = new DistributionService($this->param, $this->user_info);
        $res = $DistributionService->createRelation();

        return $this->render_success($res);
    }

    /**
     * 获取我的分销团队统计
     */
    public function getMyTeamCount()
    {
        $DistributionService = new DistributionService($this->param, $this->user_info);
        $res = $DistributionService->getMyTeamCount();

        return $this->render_success($res);
    }
    /**
     * 获取我的分销团队
     */
    public function getMyTeamList()
    {
        $rule['level'] = 'require|integer|in:1,2';
        $this->validate($this->param, $rule);

        $DistributionService = new DistributionService($this->param, $this->user_info);
        $res = $DistributionService->getMyTeamList();

        return $this->render_success($res);
    }

    /**
     * 获取佣金记录列表
     */
    public function getCommissionList()
    {
        $DistributionService = new DistributionService($this->param, $this->user_info);
        $res = $DistributionService->getCommissionList($this->user_info['customer_id']);

        return $this->render_success($res);
    }

    /**
     * 申请提现
     */
    public function applyWithdraw()
    {
        $rule['amount'] = 'require|float';
        $this->validate($this->param, $rule);

        $DistributionService = new DistributionService($this->param, $this->user_info);
        $res = $DistributionService->applyWithdraw();

        return $this->render_success($res);
    }

    /**
     * 获取提现记录列表
     */
    public function getWithdrawList()
    {
        $rule['status'] = 'require|integer|in:0,1,2';
        $this->validate($this->param, $rule);

        $DistributionService = new DistributionService($this->param, $this->user_info);
        $res = $DistributionService->getWithdrawList();

        return $this->render_success($res);
    }

    /**
     * 获取分销统计
     */
    public function getDistributionStatistics()
    {
        $DistributionService = new DistributionService($this->param, $this->user_info);
        $res = $DistributionService->getDistributionStatistics();

        return $this->render_success($res);
    }
}