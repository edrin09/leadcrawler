<?php

namespace app\api\controller\public;

use app\common\controller\ApiController;
use Exception;
use QRcode;
use support\exception\BusinessException;
use think\App;

class Qr extends ApiController
{
    protected $access_path = '';
    protected $storage_path = '';

    public function initialize()
    {
        $this->_initialize();

        $this->access_path = $_SERVER['REQUEST_SCHEME'] . '://' . $_SERVER['HTTP_HOST'] . '/qrcode/normal/';
        $this->storage_path = $_SERVER['DOCUMENT_ROOT'] . '/qrcode/normal/';
        if (!file_exists($this->storage_path)) {
            mkdir($this->storage_path);
        }
    }

    /**
     * 返回图片的图片流
     * @return \think\response\Json
     */
    public function getStream()
    {
        $imagestring = $this->generateQr($this->param['code']);
        return json('data:image/png;base64,' . $imagestring);
    }

    /**
     * @param $code //二维码的code
     * @param $level //二维码容错率
     * @param $size //二维码大小
     * @return string
     */
    private function generateQr($code, $level = 'M', $size = 10)
    {
        header("Content-type:image/png");
        require "../vendor/phpqrcode/phpqrcode.php";

        QRcode::png($code, false, $level, $size);
        $imagestring = base64_encode(ob_get_contents());
        ob_end_clean();

        return $imagestring;
        // 返回base64
//        return json('data:image/png;base64,' . $imagestring);

        // 返回图片
//        echo "<img src='data:image/png;base64," . $imagestring . "'  />";
    }

    public function getPicture()
    {
        $rule['code'] = 'require';
        $this->validate($this->param, $rule);

        $qr_filename = md5($this->param['code']) . '.png';
        $filePath = $this->storage_path . $qr_filename;
        if (file_exists($filePath)) {
            return $this->renderSuccess(['qr_url' => $this->access_path . $qr_filename]);
        }

        return $this->renderSuccess(['qr_url' => $this->saveQrFile($this->param['code'], $qr_filename, $filePath)]);
    }


    /**
     * 将图片流写入图片文件
     * @param $code //二维码code
     * @param $file_name //文件名称
     * @param $filePath //文件存储路径
     * @return string|void
     * @throws \think\Exception
     */
    protected function saveQrFile($code, $file_name, $filePath)
    {
        $imagestring = $this->generateQr($code);
        $image = file_get_contents('data:image/png;base64,' . $imagestring);
        try {
            $fp = fopen($filePath, 'w+');
            fwrite($fp, $image);
            fclose($fp);

            return $this->access_path . $file_name;

        } catch (Exception $e) {
            throw new BusinessException($e->getMessage());
        }
    }
}