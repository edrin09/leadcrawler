<?php

namespace app\api\controller\official;

use app\api\service\public\OfficialService;
use app\common\controller\ApiController;

class TemplateMessage extends ApiController
{
    protected $noNeedLogin = [];

    public function initialize()
    {
        $this->_initialize();
    }

    //发送模板消息
    public function sendMessage()
    {
//        $rule['url'] = 'url';
//        $this->validate($this->param, $rule);

        $url = "http://baidu.com";

        $OfficialService = new OfficialService($this->param);

        $send_body = array('key1' => 'VALUE', 'key2' => 'VALUE2');

        $miniprogram['appid'] = 'app_id';
        $miniprogram['pagepath'] = 'pages/xxx';

        $res = $OfficialService->sendMessage('12345', '12345', $send_body, $url, $miniprogram);

        return $this->render_success($res);
    }
}