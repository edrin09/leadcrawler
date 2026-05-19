<?php

namespace app\common\model\business;

use app\common\model\BaseModel;

class MallData extends BaseModel
{
    public $pk = 'id';
    public $name = 'mall_data';
    public $field = 'id,title,district,price,image_url,detail_url,create_time,source,status,phone_count';
}
