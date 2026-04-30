<?php

namespace app\admin\controller;

use app\admin\controller\comm\CommController;
use app\admin\services\MenuService;
use app\admin\services\UploadService;
use app\common\model\system\SystemUploadfile;
use Exception;
use support\Cache;
use support\Request;
use support\Response;

class AjaxController extends CommController
{
    public function initialize()
    {
        parent::initialize();
    }

    /**
     * @desc 初始化导航
     * @return Response
     */
    public function initAdmin(): Response
    {
        $cacheData = session()->get('initAdmin');
        if (!empty($cacheData)) {
            return json($cacheData);
        }

        $menuService = new MenuService(session('admin.id', 0));
        $data = [
            'logoInfo' => [
                'title' => env('SITE_TITLE'),
                'href' => __url(),
            ],
            'homeInfo' => $menuService->getHomeInfo(session('admin.home_id')),
            'menuInfo' => $menuService->getMenuTree(),
        ];
        session()->set('initAdmin', $data);
        return json($data);
    }

    /**
     * @desc 清理缓存接口
     * @return Response
     */
    public function clearCache(): Response
    {
        Cache::clear();
        session()->forget(['initAdmin', 'admin_node', 'admin_node_list']);

        return $this->success('清理缓存成功');
    }

    /**
     * @desc  上传文件
     * @param Request $request
     * @return Response
     */
    public function upload(Request $request): Response
    {
        $type = $request->input('type', '');
        $uploadConfig = sysconfig('upload');
        $data = [
            'upload_type' => $uploadConfig['upload_type'],
            'file' => $request->file($type == 'editor' ? 'upload' : 'file'),
        ];

        $file = $data['file'];

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
            return $this->error('上传的文件格式错误');
        }
        if ($file->getSize() > $allow_size) {
            return $this->error('文件大小超过预设值');
        }

        $upload_type = $uploadConfig['upload_type'];
        try {
            $upload = UploadService::instance()->setConfig($uploadConfig)->$upload_type($file, $type);
        } catch (Exception $e) {
            return $this->error($e->getMessage());
        }
        $code = $upload['code'] ?? 0;
        if ($code == 0) {
            return $this->error($upload['data'] ?? '');
        } else {
            return $type == 'editor' ? json(
                [
                    'error' => ['message' => '上传成功', 'number' => 201,],
                    'fileName' => '',
                    'uploaded' => 1,
                    'url' => $upload['data']['url'] ?? '',
                ]
            ) : $this->success('上传成功', $upload['data'] ?? '');
        }
    }

    /**
     * @desc 获取上传文件
     * @param Request $request
     * @return Response
     */
    public function getUploadFiles(Request $request): Response
    {
        $get = $request->all();
        $limit = $get['limit'] ?? 10;
        $title = $get['title'] ?? '';
        $this->model = new SystemUploadfile();
        $where = [];
        if ($title) $where[] = ['original_name', 'LIKE', "%{$title}%"];
        $count = $this->model->where($where)->count();
        $list = $this->model->where($where)->order($this->orderby, $this->sort)->paginate($limit)->items();
        $data = [
            'code' => 0,
            'msg' => '',
            'count' => $count,
            'data' => $list,
        ];
        return json($data);
    }

    /**
     * @desc 百度编辑器上传
     * @param Request $request
     * @return Response
     */
    public function uploadUEditor(Request $request): Response
    {
        $uploadConfig = sysconfig('upload');
        $upload_allow_size = $uploadConfig['upload_allow_size'];
        $_upload_allow_ext = explode(',', $uploadConfig['upload_allow_ext']);
        $upload_allow_ext = [];
        array_map(function ($value) use (&$upload_allow_ext) {
            $upload_allow_ext[] = '.' . $value;
        }, $_upload_allow_ext);
        $config = [
            // 上传图片配置项
            "imageActionName" => "image",
            "imageFieldName" => "file",
            "imageMaxSize" => $upload_allow_size,
            "imageAllowFiles" => $upload_allow_ext,
            "imageCompressEnable" => true,
            "imageCompressBorder" => 5000,
            "imageInsertAlign" => "none",
            "imageUrlPrefix" => "",
            // 列出图片
            "imageManagerActionName" => "listImage",
            "imageManagerListSize" => 20,
            "imageManagerUrlPrefix" => "",
            "imageManagerInsertAlign" => "none",
            "imageManagerAllowFiles" => $upload_allow_ext,
        ];
        $action = $request->input('action', '');
        $file = $request->file('file');
        $upload_type = $uploadConfig['upload_type'];
        switch ($action) {
            case 'image':
                try {
                    $upload = UploadService::instance()->setConfig($uploadConfig)->$upload_type($file);
                    $code = $upload['code'] ?? 0;
                    if ($code == 0) {
                        return json(['state' => $upload['data'] ?? '上传错误信息']);
                    } else {
                        return json(['state' => 'SUCCESS', 'url' => $upload['data']['url'] ?? '']);
                    }
                } catch (Exception $e) {
                    return $this->error($e->getMessage());
                }
            case 'listImage':
                $list = (new SystemUploadfile())->field('url')->order('id desc')->paginate(100)->items();
                $result = [
                    "state" => "SUCCESS",
                    "list" => $list,
                    "total" => 0,
                    "start" => 0,
                ];
                return json($result);
            default:
                return json($config);
        }
    }
}
