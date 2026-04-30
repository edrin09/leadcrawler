<?php

namespace app\api\controller\public;

use app\api\service\public\ImagesService;
use app\common\controller\ApiController;
use support\exception\BusinessException;
use think\Image;

class Images extends ApiController
{
    protected $noNeedLogin = ['generateImages'];

    public function initialize()
    {
        $this->_initialize();
    }

    //使用GD库生成图片
    public function generateImages()
    {
        $word = 'I LOVE AUDI';

        $ImagesService = new ImagesService($this->param);
        $res = $ImagesService->generateImages($word, '', 'local');
        if ($res['error_code']) {
            throw new BusinessException($res['error_msg'], $res['error_code']);
        }
        return $this->renderSuccess($res['data']);
    }

    //使用TP自带的图像类生成缩略图
    public function generateThumbImage()
    {
        //$image = \think\Image::open('./image.jpg');
        //或者
        //$image = \think\Image::open(request()->file('image'));

        //$image
        //->crop(...)   //裁剪图像
        //->thumb(...)  //生成缩略图
        //->water(...)  //添加水印
        //->text(....)  //图像添加文字
        //->save(..);   //保存图像

        $flie = ROOT_PATHS . 'images' . DS . '3.png';

        $image = Image::open($flie);
        $image->thumb(400, 400)->save(ROOT_PATHS . 'images' . DS . '4.jpg');
    }
}