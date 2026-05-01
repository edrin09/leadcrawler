<?php

namespace app\common\model\business;


use app\common\model\BaseModel;
use Exception;
use support\think\Db;

class MallCustomerExpansion extends BaseModel
{
    public $name = 'mall_customer_expansion';
    public $pk = 'customer_id';
    protected $type = [
        'apply_time' => 'timestamp:',
        'cash_time' => 'timestamp:',
    ];

    public function customer()
    {
        return $this->hasOne(MallCustomer::class, 'customer_id', 'customer_id');
    }

    /**
     * 增加佣金
     */
    public function addCommission($customer_id, $amount)
    {
        $balance = $this->initBalance($customer_id);

        Db::startTrans();
        try {
            $balance->available_balance = Db::raw('available_balance + ' . $amount);
            $balance->total_commission = Db::raw('total_commission + ' . $amount);
            $balance->update_time = time();
            $balance->save();

            Db::commit();
            return true;
        } catch (Exception $e) {
            Db::rollback();
            throw $e;
        }
    }

    /**
     * 初始化用户余额
     */
    public function initBalance($customer_id)
    {
        $balance = $this->where('customer_id', $customer_id)->find();
        if (!$balance) {
            $balance = $this->create([
                'customer_id' => $customer_id,
                'available_balance' => 0.00,
                'frozen_balance' => 0.00,
                'total_commission' => 0.00,
                'create_time' => time(),
                'update_time' => time()
            ]);
        }
        return $balance;
    }

    /**
     * 申请提现
     */
    public function applyWithdraw($customer_id, $amount)
    {
        $balance = $this->initBalance($customer_id);
        if ($balance->available_balance < $amount) {
            throwError('余额不足', 401);
        }

        $configModel = new MallDistributionConfig();
        $config = $configModel->getDistributionConfig();

        if ($amount < $config->min_withdraw_amount) {
            throwError('提现金额不能低于' . $config->min_withdraw_amount . '元', 401);
        }

        Db::startTrans();
        try {
            // 冻结金额
            $balance->available_balance = Db::raw('available_balance - ' . $amount);
            $balance->frozen_balance = Db::raw('frozen_balance + ' . $amount);
            $balance->update_time = time();
            $balance->save();

            // 创建提现记录
            $withdrawModel = new MallWithdrawRecord();
            $feeAmount = $amount * $config->withdraw_fee_rate / 100;
            $actualAmount = $amount - $feeAmount;

            $withdrawModel->create([
                'customer_id' => $customer_id,
                'withdraw_amount' => $amount,
                'actual_amount' => $actualAmount,
                'fee_amount' => $feeAmount,
                'status' => 0,
                'remark' => '',
            ]);

            Db::commit();
        } catch (Exception $e) {
            Db::rollback();
            throwError($e->getMessage());
        }

        return true;
    }

    /**
     * 审核提现
     */
    public function auditWithdraw($withdraw_id, $status, $remark = '')
    {
        $withdrawModel = new MallWithdrawRecord();
        $withdraw = $withdrawModel->find($withdraw_id);
        if (!$withdraw) {
            throw new Exception('提现记录不存在');
        }

        $balance = $this->initBalance($withdraw->customer_id);

        Db::startTrans();
        try {
            if ($status == 1) {
                // 审核通过，扣除冻结金额
                $balance->frozen_balance = Db::raw('frozen_balance - ' . $withdraw->withdraw_amount);
            } elseif ($status == 2) {
                // 审核拒绝，解冻金额
                $balance->available_balance = Db::raw('available_balance + ' . $withdraw->withdraw_amount);
                $balance->frozen_balance = Db::raw('frozen_balance - ' . $withdraw->withdraw_amount);
            }

            $balance->update_time = time();
            $balance->save();

            $withdraw->status = $status;
            $withdraw->remark = $remark;
            $withdraw->update_time = time();
            $withdraw->save();

            Db::commit();
            return true;
        } catch (Exception $e) {
            Db::rollback();
            throw $e;
        }
    }

    /**
     * 获取用户余额信息
     */
    public function getBalanceInfo($customer_id)
    {
        $balance = $this->initBalance($customer_id);
        return [
            'available_balance' => $balance->available_balance,
            'frozen_balance' => $balance->frozen_balance,
            'total_commission' => $balance->total_commission
        ];
    }
}