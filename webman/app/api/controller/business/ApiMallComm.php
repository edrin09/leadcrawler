<?php


namespace app\api\controller\business;

use app\api\traits\ApiCurd;
use app\common\controller\ApiController;

/**
 * Class ApiMallComm
 */
class ApiMallComm extends ApiController
{
    use ApiCurd;

    protected $business = '';

    public function initialize()
    {
        parent::initialize();
    }
}