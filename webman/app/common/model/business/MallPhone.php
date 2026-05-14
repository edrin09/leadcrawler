<?php

namespace app\common\model\business;

use app\common\model\BaseModel;

class MallPhone extends BaseModel
{
    public $pk = 'id';

    public $name = 'mall_phone';

    public $field = 'id,phone,data_id,status,create_time,update_time';
}