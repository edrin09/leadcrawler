<?php

namespace app\admin\services\distribution;

use app\common\model\business\MallCustomerExpansion;
use app\common\model\business\MallDistributionCommission;
use app\common\model\business\MallDistributionConfig;
use app\common\model\business\MallDistributionRelation;
use app\common\model\business\MallWithdrawRecord;
use Exception;
use support\think\Db;

/**
 * 分销服务类
 */
class DistributionService
{
    /**
     * 获取分销配置
     */
    public function getDistributionConfig()
    {
        $configModel = new MallDistributionConfig();
        return $configModel->getDistributionConfig();
    }

    /**
     * 更新分销配置
     */
    public function updateDistributionConfig($data)
    {
        $configModel = new MallDistributionConfig();
        return $configModel->updateConfig($data);
    }

    /**
     * 建立分销关系
     */
    public function createDistributionRelation($customer_id, $parent_id)
    {
        $relationModel = new MallDistributionRelation();
        return $relationModel->createRelation($customer_id, $parent_id);
    }

    /**
     * 处理订单完成后的分销佣金
     */
    public function handleOrderCommission($order_id, $customer_id, $order_amount)
    {
        $commissionModel = new MallDistributionCommission();
        return $commissionModel->generateCommission($order_id, $customer_id, $order_amount);
    }

    /**
     * 批量审核佣金
     */
    public function batchAuditCommission($commission_ids, $status, $remark = '')
    {
        Db::startTrans();
        try {
            foreach ($commission_ids as $commission_id) {
                $this->auditCommission($commission_id, $status, $remark);
            }
            Db::commit();
            return true;
        } catch (Exception $e) {
            Db::rollback();
            throw $e;
        }
    }

    /**
     * 审核佣金
     */
    public function auditCommission($commission_id, $status, $remark = '')
    {
        $commissionModel = new MallDistributionCommission();
        return $commissionModel->auditCommission($commission_id, $status, $remark);
    }

    /**
     * 批量审核提现
     */
    public function batchAuditWithdraw($withdraw_ids, $status, $remark = '')
    {
        Db::startTrans();
        try {
            foreach ($withdraw_ids as $withdraw_id) {
                $this->auditWithdraw($withdraw_id, $status, $remark);
            }
            Db::commit();
            return true;
        } catch (Exception $e) {
            Db::rollback();
            throw $e;
        }
    }

    /**
     * 审核提现
     */
    public function auditWithdraw($withdraw_id, $status, $remark = '')
    {
        $balanceModel = new MallCustomerExpansion();
        return $balanceModel->auditWithdraw($withdraw_id, $status, $remark);
    }

    /**
     * 获取分销统计
     */
    public function getDistributionStatistics()
    {
        $relationModel = new MallDistributionRelation();
        $commissionModel = new MallDistributionCommission();
        $withdrawModel = new MallWithdrawRecord();

        // 总团队人数
        $totalTeamCount = $relationModel->count();

        // 总佣金统计
        $totalCommission = $commissionModel->where('status', 1)->sum('commission_amount');
        $pendingCommission = $commissionModel->where('status', 0)->sum('commission_amount');

        // 提现统计
        $totalWithdraw = $withdrawModel->where('status', 1)->sum('withdraw_amount');
        $pendingWithdraw = $withdrawModel->where('status', 0)->sum('withdraw_amount');

        return [
            'total_team_count' => $totalTeamCount,
            'total_commission' => $totalCommission ?: 0,
            'pending_commission' => $pendingCommission ?: 0,
            'total_withdraw' => $totalWithdraw ?: 0,
            'pending_withdraw' => $pendingWithdraw ?: 0
        ];
    }

    /**
     * 获取用户分销详情
     */
    public function getUserDistributionDetail($customer_id)
    {
        $relationModel = new MallDistributionRelation();
        $commissionModel = new MallDistributionCommission();
        $balanceModel = new MallCustomerExpansion();

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