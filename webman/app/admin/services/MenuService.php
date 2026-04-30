<?php

namespace app\admin\services;

use app\common\model\system\SystemMenu;
use think\Exception;

class MenuService
{

    /**
     * 管理员ID
     * @var integer
     */
    protected int $adminId = 0;

    protected array $adminConfig = [];

    public function __construct($adminId = 0)
    {
        $this->adminId = $adminId;
        $this->adminConfig = config('admin');
        return $this;
    }

    public function getHomeInfo($homeId = 0): array
    {
        $data = SystemMenu::where('id', $homeId)
            ->field('title,icon,href')->find();
        !empty($data) && $data->href = __url('/' . $data->href);
        return $data->toArray();
    }

    public function getMenuTree(): array
    {
        $authServer = new AuthService($this->adminId);
        return $this->buildMenuChild(0, $this->getMenuData(), $authServer);
    }

    private function buildMenuChild($pid, $menuList, AuthService $authServer): array
    {
        $treeList = [];
        $params = '';
        $cid = '';
        foreach ($menuList as $v) {
            if ($v['href'] && $v['params']) {
                $arr = explode("=", $v['params']);
                $cid = $arr[1];
            }

            $check = empty($v['href']) || $authServer->checkNode($v['href']);
//            $check = empty($v['href']) || $authServer->checkNode($v['href'], $cid);

            if ($pid == $v['pid'] && $check) {
                if ($v['params']) {
                    $params = '?' . $v['params'];
                }
                !empty($v['href']) && $v['href'] = __url($v['href']) . $params;

                $node = $v;
                $child = $this->buildMenuChild($v['id'], $menuList, $authServer);
                if (!empty($child)) {
                    $node['child'] = $child;
                }
                if (!empty($v['href']) || !empty($child)) {
                    $treeList[] = $node;
                }
            }
        }
        return $treeList;
    }

    protected function getMenuData()
    {
        $menuData = SystemMenu::field(['id', 'pid', 'title', 'icon', 'href', 'target', 'params'])
            ->where('status', 1)
            ->order('id')
            ->select();
//pre($menuData);
        return $menuData;
    }


    /**
     * 根据 href 创建 JS 文件
     *
     * @param string $href 如：agreements.index
     * @return bool
     */
    public function createJsFileFromHref(string $href): bool
    {
        // 目标路径 - 根据你的项目结构调整路径
        $targetPath = $this->getTargetPath($href);

        // 读取模板文件
        $templatePath = public_path('static/admin/js/template/') . 'template.js';
        if (!file_exists($templatePath)) {
            throw new Exception('模板文件不存在：' . $templatePath);
        }
        $templateContent = file_get_contents($templatePath);

        // 可以在这里对模板内容进行变量替换（如果需要）
        // 例如：将模板中的标题替换为实际的标题
        $content = $templateContent;
        // 写入文件
        if (file_put_contents($targetPath, $content) === false) {
            throw new Exception('创建文件失败：' . $targetPath);
        }

        return true;
    }

    protected function getTargetPath($href)
    {
        // 解析 href，获取文件名（去除/前面的部分）
        $parts = explode('/', $href);
        if (count($parts) < 2) {
            throw new Exception('href 格式不正确，应为：模块.控制器');
        }

        $fileName = $parts[1] . '.js'; // 如：agreements.js

// 目标目录 - 根据你的项目结构调整路径
        $targetDir = public_path('static/admin/js/' . $parts[0] . '/');

// 确保目录存在
        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0755, true);
        }

        return $targetDir . $fileName;
    }

    /** 删除文件 */
    public function deleteJsFileFromHref(string $href): bool
    {
        $targetPath = $this->getTargetPath($href);
        // 删除文件
        if (!file_exists($targetPath)) {
            throw new Exception('文件不存在：' . $targetPath);
        }

        if (!unlink($targetPath)) {
            throw new Exception('删除文件失败：' . $targetPath);
        }

        return true;
    }

}
