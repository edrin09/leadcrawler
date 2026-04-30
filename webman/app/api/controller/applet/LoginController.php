<?php

namespace app\api\controller\applet;

use app\api\service\public\AppletService;
use app\common\controller\ApiController;

class LoginController extends ApiController
{
    protected $noNeedLogin = ['doLogin'];

    public function initialize()
    {
        parent::initialize();
    }

    public function doLogin()
    {
        $rule['app_id'] = 'require';
        $rule['login_code'] = 'require';
        $this->validate($this->param, $rule);

        $AppletService = new AppletService($this->param);
        $res = $AppletService->doLogin($this->param['login_code']);

        return $this->render_success($res);
    }
}