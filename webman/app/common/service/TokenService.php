<?php

namespace app\common\service;

use app\common\model\business\MallCustomer;
use support\Cache;
use support\Log;
use support\exception\BusinessException;

class TokenService
{
    public function checkToken($token)
    {
        if (empty($token)) {
            throw new BusinessException('Token Is Empty', 601);
        }

        $user_info_token = Cache::get('user_info_' . $token);

        if (empty($user_info_token)) {
            throw new BusinessException('Invalid Token', 601);
        }

        $MallCustomer = new MallCustomer();
        $user_info = $MallCustomer->findUser(['mall_customer.customer_id' => $user_info_token->customer_id]);

        if (empty($user_info)) {
            throw new BusinessException('获取用户信息失败', 601);
        }

        return $user_info;
    }

}