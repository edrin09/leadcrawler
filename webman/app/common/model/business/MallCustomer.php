<?php

namespace app\common\model\business;

use app\common\model\BaseModel;
use support\Cache;
use support\exception\BusinessException;

class MallCustomer extends BaseModel
{
    public $pk = 'customer_id';

    public $name = 'mall_customer';

    public $field = 'customer_id,status,username,create_time,update_time';
    // 设置添加表单的默认值
    private $expiry_time = 86400;

    public function doLogin($user_info, $param = [], $auto_login = false, $app_id = '', $recommend_id = 0, $category = 'h5')
    {
        if ($user_info) {
            $user_info = $this->getUserToken($user_info);
            return $user_info;
        }
        if ($auto_login == false) {
            throw new BusinessException('用户不存在', 601);
        }

        $this->createUser($param, $app_id, $recommend_id, $category);

        $user_info = $this->findUser(['openid' => $param['openid']]);
        $user_info = $this->getUserToken($user_info);

        return $user_info;
    }

    private function getUserToken($user_info)
    {
        $expansion = MallCustomerExpansion::field('customer_id,token,login_time')->find($user_info->customer_id);
//D($expansion);
        if (empty($expansion)) {
            throw new BusinessException('User Does Not Exist', 601);
        }

        $user_token = Cache::get('user_info_' . $expansion->token);
        if (empty($user_token)) {
            $token = get_guid_v4();
            $expansion->token = $token;

            Cache::set('user_info_' . $token, $expansion, $this->expiry_time);
        }

        $expansion->login_time = time();
        $expansion->save();

        $user_info->expansion = $expansion;
        return $user_info;
    }

    public function createUser($user, $app_id = '', $recommend_id = 0, $category = 'h5')
    {
        $this->app_id = $app_id;
        $this->openid = $user['openid'];
        $this->unionid = $user['unionid'] ?? $user['openid'];
        $this->avatar = $user['avatar'] ?? '';
        $this->nickname = $user['nickname'] ?? '';
        $this->phone_number = isset($user['phone_number']) ? trim($user['phone_number']) : 0;
        $this->username = $user['username'] ?? '';
        $this->password = $user['password'] ?? '';
        $this->sex = $user['sex'] ?? 0;
        $this->recommend_id = $recommend_id;
        $this->category = $category;
//        $this->login_time = time();
        $this->token = get_guid_v4();

        $this->together(
            ['expansion' =>
                [
                    'token',
                    'recommend_id',
                    'category',
                    'login_time',
                ]
            ]
        )->save();
        return $this;
    }

    public function findUser($where)
    {
        $user_info = $this
            ->field($this->field)
            ->withJoin(
                [
                    'expansion' => [
                        'customer_id',
                        'token',
                        'login_time'
                    ]
                ]
            )
            ->where($where)
            ->find();

        return $user_info;
    }

    public function expansion()
    {
        return $this->hasOne(MallCustomerExpansion::class, 'customer_id', 'customer_id');
    }
}