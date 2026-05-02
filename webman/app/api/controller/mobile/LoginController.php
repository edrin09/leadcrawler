<?php

namespace app\api\controller\mobile;

use app\api\service\business\MobileService;
use app\common\controller\ApiController;

class LoginController extends ApiController
{
    protected $noNeedLogin = ['openidLogin', 'accountLogin', 'captchaLogin', 'autoLogin'];

    public function initialize()
    {
        parent::initialize();
    }

    /*
     * 账号登录
     */
    public function accountLogin()
    {
        $rule['username'] = 'require';
        $rule['password'] = 'require';
        $this->validate($this->param, $rule);

        $MobileService = new MobileService($this->param);
        $res = $MobileService->accountLogin();
        return $this->render_success($res);
    }

    public function openidLogin()
    {
        $rule['openid'] = 'require';
        $this->validate($this->param, $rule);

        $MobileService = new MobileService($this->param);
        $res = $MobileService->openidLogin();

        return $this->render_success($res);
    }

    public function autoLogin()
    {
        $MobileService = new MobileService($this->param);
        $res = $MobileService->autoLogin();

        return $this->render_success($res);
    }
}
