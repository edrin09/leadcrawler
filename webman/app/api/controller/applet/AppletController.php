<?php

namespace app\api\controller\applet;

use app\api\service\public\AppletService;
use app\common\controller\ApiController;

class AppletController extends ApiController
{
    protected $noNeedLogin = ['createLessAppCode', 'createUnlimitAppCode'];

    public function initialize()
    {
        parent::initialize();
    }

    public function getUserPhone()
    {
        $rule['app_id'] = 'require';
        $rule['phone_code'] = 'require';
        $this->validate($this->param, $rule);

        $AppletService = new AppletService($this->param);
        $res = $AppletService->getUserPhone($this->param['phone_code'], $this->user_info['customer_id']);

       return $this->render_success($res);
    }

    public function createLessAppCode()
    {
        $rule['path'] = 'require';
        $this->validate($this->param, $rule);

        $AppletService = new AppletService($this->param);
        $res = $AppletService->createLessAppCode();

        return $this->render_success($res);
    }

    public function createUnlimitAppCode()
    {
        $rule['scene_value'] = 'require';
        $this->validate($this->param, $rule);

        $AppletService = new AppletService($this->param);
        $res = $AppletService->createUnlimitAppCode();

        return $this->render_success($res);
    }
}