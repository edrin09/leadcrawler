<?php

namespace app\common\model;


use support\think\Model;

class BaseModel extends Model
{

    protected $autoWriteTimestamp = true;

    /**
     * 添加时间
     * @var string
     */
    protected $createTime = 'create_time';

    /**
     * 更新时间
     * @var string
     */
    protected $updateTime = 'update_time';


     public function getCreateTimeAttr($value,$data)
    {
        return date('H:i:s y/m/d', $data['create_time']);
    }

    public function getUpdateTimeAttr($value,$data)
    {
        return date('H:i:s y/m/d', $data['update_time']);
    }
//    public function __construct(array $attributes = [])
//    {
//        parent::__construct($attributes);
////        $calledClass = get_called_class();
////        $className = substr(strrchr($calledClass, '\\'), 1);
////        $this->table = $this->getTableName($className);
//    }
}
