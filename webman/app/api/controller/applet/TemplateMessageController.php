<?php

namespace app\api\controller\applet;

use app\api\service\public\AppletService;
use app\common\controller\ApiController;

class TemplateMessageController extends ApiController
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

        $page = "login/index";
        $form_id = "12345667";
        $send_body = array('key1' => 'VALUE', 'key2' => 'VALUE2');

        $AppletService = new AppletService($this->param);
        $res = $AppletService->sendMessage('12345', '12345', $page, $form_id, $send_body);

        return $this->render_success($res);
    }
}