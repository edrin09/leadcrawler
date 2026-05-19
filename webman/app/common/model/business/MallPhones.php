<?php

namespace app\common\model\business;

use app\common\model\BaseModel;

class MallPhones extends BaseModel
{
    public $pk = 'id';
    public $name = 'mall_phones';
    public $field = 'id,title,phone,source_platform,create_time';
}
