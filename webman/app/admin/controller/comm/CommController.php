<?php

namespace app\admin\controller\comm;

use app\admin\traits\JumpTrait;
use app\BaseController;
use support\Cache;
use support\Response;
use support\View;
use function request;

class CommController extends BaseController
{
    use JumpTrait;

    /**
     * @var string
     */
    public string $secondary = '';
    /**
     * @var string
     */
    public string $controller = '';
    /**
     * @var string
     */
    public string $action = '';
    /**
     * @var array
     */
    public array $adminConfig = [];
    /**
     * @Model
     */
    protected object $model;
    protected string $pk;
    /**
     * @var string
     */
    protected string $orderby = 'id';
    /**
     * 字段排序
     * @var string
     */
    protected string $sort = 'desc';
    /**
     * 过滤节点更新
     * @var array
     */
    protected array $ignoreNode = [];
    /**
     * 不导出的字段信息
     * @var array
     */
    protected array $noExportFields = ['update_time'];
    private $dataBrage = [];

    public function fetch(string $template = '', array $args = []): Response
    {
        if (empty($template)) {
            $basePath = DIRECTORY_SEPARATOR . $this->controller . DIRECTORY_SEPARATOR . $this->action;
            if ($this->secondary) {
                $template = 'admin' . DIRECTORY_SEPARATOR . $this->secondary . $basePath;
            } else {
                $template = 'admin' . $basePath;
            }
        }
        return view($template, $args);
    }

    /**
     * 下拉选择列表
     * @return Response
     */
    public function selectList(): Response
    {
        $fields = request()->input('selectFields');
        $data = $this->model->field(explode(',', $fields))->select()->toArray();
        return $this->success('', $data);
    }

    public function assignn($name, mixed $value = null)
    {
        View::assign($name, $value);
    }

    /**
     * @param array|string $args
     */
    public function assign(array|string $args, mixed $value = null, $isAppendToDataBrage = false)
    {
        if ($isAppendToDataBrage) {
            $this->dataBrage[$args] = $value;
        }
        View::assign($args, $value);
    }

    /**
     * @param array $args
     */
//    public function assign(array $args = [])
//    {
//        View::assign($args);
//    }


    protected function initialize()
    {
        parent::initialize();

        $request = request();
        $this->adminConfig = $adminConfig = config('admin', []);
        $this->setOrder();
        $controllerClass = explode('\\', $request->controller);
        $controller = strtolower(str_replace('Controller', '', array_pop($controllerClass)));
        $_lastCtr = array_pop($controllerClass);
        $secondary = $_lastCtr == 'controller' ? '' : $_lastCtr;
        $action = $request->action ?? 'index';
        $this->secondary = $secondary;
        $this->controller = $controller;
        $this->action = $action;
        $jsBasePath = ($secondary ? "{$secondary}/" : '') . strtolower($controller);
        $thisControllerJsPath = "admin/js/{$jsBasePath}.js";
        $autoloadJs = file_exists(BASE_PATH . '/public/' . $thisControllerJsPath);
        $adminModuleName = $adminConfig['admin_alias_name'];
        $isSuperAdmin = session('admin.id') == $adminConfig['super_admin_id'];
        $version = Cache::get('version');
        if (empty($version)) {
            $version = sysconfig('site', 'site_version');
            Cache::set('site_version', $version);
            Cache::set('version', $version, 3600);
        }
        $data = [
            'adminModuleName' => $adminModuleName,
            'thisController' => $controller,
            'thisAction' => $action,
            'thisRequest' => "{$adminModuleName}/{$controller}/{$action}",
            'thisControllerJsPath' => $thisControllerJsPath,
            'autoloadJs' => $autoloadJs,
            'isSuperAdmin' => $isSuperAdmin,
//            'version' => env('APP_DEBUG') ? time() : $version,
            'version' => $version,
            'adminUploadUrl' => __url('ajax/upload', [], false),
            'adminEditor' => sysconfig('site', 'editor_type') ?: 'wangEditor',
        ];
        
        $this->assign($data);
    }

    /**
     * 初始化排序
     * @return $this
     */
    public function setOrder(): static
    {
        $tableOrder = request()->input('tableOrder', '');
        if (!empty($tableOrder)) {
            [$orderField, $orderType] = explode(' ', $tableOrder);
            $this->orderby = $orderField;
            $this->sort = $orderType == 'null' ? 'desc' : $orderType;
        }
        return $this;
    }

    /**
     * 构建请求参数
     * @param array $excludeFields 忽略构建搜索的字段
     * @return array
     */
    protected function buildTableParams(array $excludeFields = []): array
    {
        $get = request()->all();
        $page = !empty($get['page']) ? $get['page'] : 1;
        $limit = !empty($get['limit']) ? $get['limit'] : 15;
        $filters = !empty($get['filter']) ? htmlspecialchars_decode($get['filter']) : '{}';
        $ops = !empty($get['op']) ? htmlspecialchars_decode($get['op']) : '{}';
        // json转数组
        $filters = json_decode($filters, true);
        $ops = json_decode($ops, true);
        $where = [];
        $excludes = [];

        foreach ($filters as $key => $val) {
            if (in_array($key, $excludeFields)) {
                $excludes[$key] = $val;
                continue;
            }
            $op = isset($ops[$key]) && !empty($ops[$key]) ? $ops[$key] : '%*%';

            switch (strtolower($op)) {
                case '=':
                    $where[] = [$key, '=', $val];
                    break;
                case '%*%':
                    $where[] = [$key, 'LIKE', "%{$val}%"];
                    break;
                case '*%':
                    $where[] = [$key, 'LIKE', "{$val}%"];
                    break;
                case '%*':
                    $where[] = [$key, 'LIKE', "%{$val}"];
                    break;
                case 'in':
                    $where[] = [$key, 'IN', $val];
                    break;
                case 'range':
                    [$beginTime, $endTime] = explode(' - ', $val);
                    $where[] = [$key, '>=', strtotime($beginTime)];
                    $where[] = [$key, '<=', strtotime($endTime)];
                    break;
                default:
                    $where[] = [$key, $op, "%{$val}"];
            }
        }
        return [$page, $limit, $where, $excludes];
    }

}