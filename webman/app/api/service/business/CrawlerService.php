<?php

namespace app\api\service\business;

use app\api\service\CommService;

class CrawlerService extends CommService
{
    public function __construct($param, $user_info)
    {
        parent::_initialize($param, $user_info);
    }
}