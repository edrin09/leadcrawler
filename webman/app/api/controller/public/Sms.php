<?php


namespace app\api\controller\public;

use app\api\service\public\SmsService;
use app\common\controller\ApiController;

class Sms extends ApiController
{
    protected $noNeedLogin = ['getCode', 'verificationCode'];

    public function initialize()
    {
        $this->_initialize();
    }

    public function verificationCode()
    {
        $rule['mobile'] = 'require|mobile';
        $rule['code'] = 'require|number';
        $this->validate($this->param, $rule);

        $SmsService = new SmsService($this->param);
        $res = $SmsService->verificationCode($this->param['mobile'], $this->param['code']);
        dd($res);
    }

    public function getCode()
    {
        $rule['mobile'] = 'require|mobile';
        $this->validate($this->param, $rule);

        $SmsService = new SmsService($this->param);
        $res = $SmsService->getCode();

        return $this->render_success($res);
    }
}