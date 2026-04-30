<?php

namespace app\api\controller\official;

use app\api\service\public\OfficialService;
use app\common\controller\ApiController;

class Login extends ApiController
{
    protected $noNeedLogin = ['getWxAuthorizationUrl', 'doLogin', 'doSenselessLogin'];

    public function initialize()
    {
        $this->_initialize();
    }

    public function getWxAuthorizationUrl()
    {
        $rule['app_id'] = 'require';
        $this->validate($this->param, $rule);
        $OfficialService = new OfficialService($this->param);
        $res = $OfficialService->getWxAuthorizationUrl();

      return $this->render_success($res);
    }

    public function doLogin()
    {
        $rule['app_id'] = 'require';
        $rule['code'] = 'require';
        $this->validate($this->param, $rule);

        $OfficialService = new OfficialService($this->param);
        $res = $OfficialService->doWxLogin($this->param['code']);

        return $this->render_success($res);
    }

    public function doSenselessLogin()
    {
        $rule['app_id'] = 'require';
        $rule['code'] = 'require';
        $this->validate($this->param, $rule);

        $OfficialService = new OfficialService($this->param);
        $res = $OfficialService->doSenselessLogin($this->param['code']);

        return $this->render_success($res);
    }
}