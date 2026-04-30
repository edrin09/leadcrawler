<?php

namespace app\admin\services;

use app\admin\services\annotation\NodeAnnotation;
use app\common\model\system\SystemAdmin;
use app\common\model\system\SystemAuthNode;
use app\common\model\system\SystemNode;
use Illuminate\Support\Str;
use ReflectionClass;
use Throwable;

/**
 * 权限验证服务
 * Class AuthService
 * @package app\common\service
 */
class AuthService
{

    /**
     * 用户ID
     * @var int
     */
    protected int $adminId = 0;

    /**
     * 默认配置
     * @var array
     */
    protected array $config = [
        'auth_on' => true,              // 权限开关
    ];

    /**
     * 管理员信息
     */
    protected $adminInfo;

    /**
     * 所有节点信息
     * @var array
     */
    protected $nodeList;

    /**
     * 管理员所有授权节点
     * @var array
     */
    protected $adminNode;

    /***
     * 构造方法
     * AuthService constructor.
     * @param null $adminId
     */
    public function __construct($adminId = null)
    {
        $this->adminId = $adminId;
        $this->adminInfo = session()->get('admin');
        $this->nodeList = $this->getNodeList();
        $this->adminNode = $this->getAdminNode();
        return $this;
    }

    public function getNodeList()
    {
        $cacheData = session()->get('admin_node_list');
        if (!empty($cacheData)) {
            return $cacheData;
        }

        $result = SystemNode::where('status', 1)->column('id,node,title,type,is_auth', 'node');
        session()->set('admin_node_list', $result);

        return $result;
    }

    /**
     * 获取当前管理员所有节点
     */
    public function getAdminNode()
    {
        $cacheData = session()->get('admin_node');
        if (!empty($cacheData)) {
            return $cacheData;
        }

        $nodeList = [];
        $adminInfo = SystemAdmin::where('id', $this->adminId)->where('status', 1)->find();

        if ($adminInfo && !empty($adminInfo->auth_ids)) {
            $nodeIds = SystemAuthNode::whereIn('auth_id', explode(',', $adminInfo->auth_ids))
                ->column('node_id');
            $nodeList = SystemNode::whereIn('id', $nodeIds)->column('id,node,title,type,is_auth', 'node');
        }
        session()->set('admin_node', $nodeList);

        return $nodeList;
    }

    /**
     * 检测检测权限
     * @param string $node
     * @param string $cid
     * @return bool
     */
    public function checkNode($node = '', $cid = ''): bool
    {
        // 判断是否为超级管理员
        if ($this->adminId == SUPER_ADMIN_ID) {
            return true;
        }
        // 判断权限验证开关
        if ($this->config['auth_on'] == false) {
            return true;
        }
        // 判断是否需要获取当前节点
        if (empty($node)) {
            $node = $this->getCurrentNode();
        } else {
            $node = $this->parseNodeStr($node);
        }

        // 使用node和cid的组合作为键
//        $nodeKey = $node . '|' . $cid;

//        pre($node);
//        pre($this->nodeList, 'nodeList', false, true);
        // 判断是否加入节点控制，优先获取缓存信息
        if (!isset($this->nodeList[$node])) {
            return false;
        }

        $nodeInfo = $this->nodeList[$node];
        if ($nodeInfo['is_auth'] == 0) {
            return true;
        }
        // 用户验证，优先获取缓存信息
        if (empty($this->adminInfo) || $this->adminInfo['status'] != 1 || empty($this->adminInfo['auth_ids'])) {
            return false;
        }
        // 判断该节点是否允许访问
        if (isset($this->adminNode[$node])) {
            return true;
        }
        if ($this->checkNodeAnnotationAttrAuth($node)) return true;
        return false;
    }

    /**
     * 获取当前节点
     * @return string
     */
    public function getCurrentNode(): string
    {
        $controllerClass = explode('\\', request()->controller);
        $controller = strtolower(str_replace('Controller', '', array_pop($controllerClass)));
        $action = request()->action ?? 'index';
        $_lastCtr = array_pop($controllerClass);
        $secondary = $_lastCtr == 'controller' ? '' : $_lastCtr;
        return $secondary . '/' . ($controller ?? '') . '/' . ($action ?? '');
    }

    /**
     * 驼峰转下划线规则
     * @param string $node
     * @return string
     */
    public function parseNodeStr(string $node): string
    {
        $array = explode('/', $node);
        foreach ($array as $key => $val) {
            if ($key == 0) {
                $val = explode('.', $val);
                foreach ($val as &$vo) {
                    $vo = Str::snake(lcfirst($vo));
                }
                $val = implode('.', $val);
                $array[$key] = $val;
            }
        }
        $node = implode('/', $array);
        return $node;
    }

    protected function checkNodeAnnotationAttrAuth(string $node): bool
    {
        $bool = false;
        $controller = request()->controller;
        try {
            $nodeExplode = explode('/', $node);
            $action = end($nodeExplode);
            $reflectionClass = new ReflectionClass($controller);
            $attributes = $reflectionClass->getMethod($action)->getAttributes(NodeAnnotation::class);
            foreach ($attributes as $attribute) {
                $annotation = $attribute->newInstance();
                $bool = $annotation->auth === false;
            }
        } catch (Throwable) {
        }
        return $bool;
    }

}