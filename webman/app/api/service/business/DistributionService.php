<?php

namespace app\api\service\business;

use app\api\service\CommService;
use app\common\model\business\MallCustomerExpansion;
use app\common\model\business\MallDistributionCommission;
use app\common\model\business\MallDistributionConfig;
use app\common\model\business\MallDistributionRelation;
use app\common\model\business\MallWithdrawRecord;
use support\exception\BusinessException;

/**
 * 分销API服务类
 */
class DistributionService extends CommService
{
    protected $param;
    protected $user_info;

    public function __construct($param, $user_info)
    {
        parent::_initialize($param, $user_info);
    }

    /**
     * 获取分销配置
     */
    public function getConfig()
    {
        $configModel = new MallDistributionConfig();
        $config = $configModel->getDistributionConfig();

        return [
            'level1_commission' => $config->level1_commission,
            'level2_commission' => $config->level2_commission,
            'rule_description' => $config->rule_description,
//            'min_withdraw_amount' => $config->min_withdraw_amount,
//            'withdraw_fee_rate' => $config->withdraw_fee_rate
        ];
    }

    /**
     * 建立分销关系
     */
    public function createRelation()
    {
        $parent_id = $this->param['parent_id'];
        $customer_id = $this->user_info['customer_id'];

        if ($customer_id == $parent_id) {
            throw new BusinessException('不能邀请自己');
        }

        $relationModel = new MallDistributionRelation();
        $result = $relationModel->createRelation($customer_id, $parent_id);

        return ['success' => true, 'message' => '关系建立成功'];
    }

    /**
     * 获取我的分销团队
     */
    public function getMyTeamCount()
    {
        $customer_id = $this->user_info['customer_id'];
        $relationModel = new MallDistributionRelation();

        // 获取团队统计
        $teamStats = $relationModel->getTeamStatistics($customer_id);
        $this->data['team_statistics'] = $teamStats;

        return $this->data;
    }

    /**
     * 获取我的分销团队
     */
    public function getMyTeamList()
    {
        $customer_id = $this->user_info['customer_id'];
        $relationModel = new MallDistributionRelation();

        // 获取下级用户列表
        $team_list = $relationModel->getSubordinates($customer_id, $this->param['level']);
        $this->data['team_list'] = $team_list;

        return $this->data;
    }

    /**
     * 获取佣金记录列表
     */
    public function getCommissionList($customer_id)
    {
        $commissionModel = new MallDistributionCommission();

        $status = 1;
        $this->data['list'] = $commissionModel->getCommissionList($customer_id, $status, $this->is_page, $this->page, $this->limit);
        return $this->data;
    }

    /**
     * 申请提现
     */
    public function applyWithdraw()
    {
        $balanceModel = new MallCustomerExpansion();
        $balanceModel->applyWithdraw($this->user_info['customer_id'], $this->param['amount']);

        return $this->data;
    }

    /**
     * 获取提现记录列表
     */
    public function getWithdrawList()
    {
        $withdrawModel = new MallWithdrawRecord();
        $this->data['list'] = $withdrawModel->getWithdrawList($this->user_info['customer_id'], $this->param['status'], $this->is_page, $this->page, $this->limit);

        return $this->data;
    }

    /**
     * 获取分销统计
     */
    public function getDistributionStatistics()
    {
        $customer_id = $this->user_info['customer_id'];

        $relationModel = new MallDistributionRelation();
        $commissionModel = new MallDistributionCommission();
        $balanceModel = new MallCustomerBalance();

        // 团队统计
        $teamStats = $relationModel->getTeamStatistics($customer_id);

        // 佣金统计
        $commissionStats = $commissionModel->getCommissionStatistics($customer_id);

        // 余额信息
        $balanceInfo = $balanceModel->getBalanceInfo($customer_id);

        return [
            'team_statistics' => $teamStats,
            'commission_statistics' => $commissionStats,
            'balance_info' => $balanceInfo
        ];
    }
}