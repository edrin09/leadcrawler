<?php

namespace app\common\model\system;

use app\common\model\BaseModel;

class SystemCronJob extends BaseModel
{
    public $pk = 'id';

    public $name = 'system_cron_job';

    public function getNextRunTimeAttr($value,$data)
    {
        return date('H:i:s y/m/d', $data['next_run_time']);
    }

    // protected $type = [
    //     'next_run_time' => 'timestamp',
    // ];
}
