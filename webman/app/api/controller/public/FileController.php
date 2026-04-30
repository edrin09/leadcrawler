<?php


namespace app\api\controller\public;

use app\admin\services\UploadService;
use app\common\controller\ApiController;
use support\exception\BusinessException;

class FileController extends ApiController
{
    public function initialize()
    {
        parent::initialize();
    }

    public function upload()
    {
        $uploadConfig = sysconfig('upload');
        $data['file'] = $this->request->file('file');
        $data['upload_type'] = $uploadConfig['upload_type'];

        $upload_images_allow_ext = explode(',', $uploadConfig['upload_images_allow_ext']);
        $upload_video_allow_ext = explode(',', $uploadConfig['upload_video_allow_ext']);
        $upload_file_allow_ext = explode(',', $uploadConfig['upload_file_allow_ext']);
        $upload_audio_allow_ext = explode(',', $uploadConfig['upload_audio_allow_ext']);

        $upload_file_ext = strtolower($data['file']->getUploadExtension());
        //验证是否是图片
        if (in_array($upload_file_ext, $upload_images_allow_ext)) {
            $allow_size = $uploadConfig['upload_images_allow_size'];
        }

        //验证是否是视频
        if (in_array($upload_file_ext, $upload_video_allow_ext)) {
            $allow_size = $uploadConfig['upload_video_allow_size'];
        }

        //验证是否是文件
        if (in_array($upload_file_ext, $upload_file_allow_ext)) {
            $allow_size = $uploadConfig['upload_file_allow_size'];
        }

        //验证是否是音频
        if (in_array($upload_file_ext, $upload_audio_allow_ext)) {
            $allow_size = $uploadConfig['upload_audio_allow_size'];
        }
        if (empty($allow_size)) {
            throw new BusinessException('上传的文件格式错误', 401);
        }
        if ($data['file']->getSize() > $allow_size) {
            throw new BusinessException('文件大小超过预设值', 401);
        }

        $upload_type = $uploadConfig['upload_type'];
        $upload = UploadService::instance()->setConfig($uploadConfig)->$upload_type($data['file'], 'file');

        if (empty($upload['code'])) {
            throw new BusinessException('上传失败', 401);
        }

        $res['url'] = $upload['data']['url'] ?? '';
        return $this->render_success($res);
    }
}