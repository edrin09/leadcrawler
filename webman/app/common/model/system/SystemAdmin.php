<?php

namespace app\common\model\system;

use app\common\model\BaseModel;

class SystemAdmin extends BaseModel
{
    public $pk = 'id';

    public $name = 'system_admin';
    public function getAuthList(): array
    {
        $list = SystemAuth::where('status', 1)->column('id,title', 'id');
        return $list;
    }
}
