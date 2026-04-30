<?php

namespace app\api\controller\official;

use app\api\service\public\OfficialService;
use app\common\controller\ApiController;

class Offcial extends ApiController
{
    protected $noNeedLogin = ['createJssdkConfigure'];

    public function initialize()
    {
        $this->_initialize();
    }

    //生成微信JSSDK配置
    public function createJssdkConfigure()
    {
        $rule['url'] = 'url';
        $this->validate($this->param, $rule);

        $OfficialService = new OfficialService($this->param);
        $res = $OfficialService->getJssdkConfigure();

        return $this->render_success($res);
    }

    //生成公众号二维码
    public function createQrCode()
    {
        $rule['scene_value'] = 'require';
        $rule['qr_type'] = 'require|in:temporary,forever';
        $this->validate($this->param, $rule);

        $OfficialService = new OfficialService($this->param);
        $res = $OfficialService->createQrCode($this->param['scene_value'], $this->param['qr_type']);

        return $this->render_success($res);
    }
}