<?php


namespace app\common\model\business;


use app\common\model\BaseModel;

class AdminOperationLog extends BaseModel
{
    public $pk = 'id';

    public $name = 'admin_operation_log';

    protected $autoWriteTimestamp = true;

    //添加时间
    protected $createTime = 'add_time';

    //更新时间
    protected $updateTime = false;

    public static function addtAdminOperationLog($admin_info, $remarks)
    {
        $log['operation_id'] = $admin_info['id'] ?? 0;
        $log['operation_name'] = $admin_info['username'];
        $log['remarks'] = '【' . $admin_info['username'] . '】' . $remarks;

//        dd($log);
        self::create($log);
        return true;
    }
}