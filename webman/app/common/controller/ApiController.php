<?php


namespace app\common\controller;

use app\api\service\public\TokenLimitingService;
use app\BaseController;
use app\common\service\TokenService;
use Exception;
use Illuminate\Support\Env;
use support\exception\BusinessException;
use support\Response;

/**
 * Class ApiController
 * @package app\common\controller
 */
class ApiController extends BaseController
{

    /**
     * 当前模型
     * @Model
     * @var object
     */
    protected $model;

    protected $validate;

    protected $param = [];

    protected $original = [];

    protected $page = 1;
    protected $is_cache = false;
    protected $is_page = false;

    protected $limit = 10;

    protected $request;

    protected $user_info = [];
    protected $orders_field = '';
    protected $noNeedLogin = [];


    /**
     *
     * 返回操作成功json
     * @param array|string $resdata
     * @param string $message
     * @return Response
     */
    protected function render_success($resdata = [])
    {
        if (Env::get('encrypted.response_encrypted', false)) {
            $resdata = encryptionDecryption(json_encode($resdata));
        }
//
        $render['code'] = 200;
        $render['meg'] = 'success';
        $render['data'] = $resdata;
        return json($render);
    }

    /**
     * 初始化操作
     * @access protected
     */
    protected function initialize()
    {
        parent::initialize();
        //是否启用接口限流
        $limiting_status = env('limiting.limiting_status', false);
        if ($limiting_status) {
            $TokenLimitingService = new TokenLimitingService;
            $TokenLimitingService->tokensLimiting();
        }

        $this->request = request();
        $this->original = $post_data = $this->request->post();
        $this->param = $post_data['parameter'] ?? [];

        $rule['is_cache'] = 'boolean';
        $rule['is_page'] = 'boolean';
        $this->validate($this->param, $rule);


        $this->is_cache = $this->param['is_cache'] ?? true;
        $this->is_page = $this->param['is_page'] ?? false;
        $this->page = $this->param['paging']['page'] ?? 1;
        $this->limit = $this->param['paging']['limit'] ?? 10;

        if (!empty($this->model) && is_string($this->model)) {
            $this->model = new $this->model();
        }

        if (!in_array($this->request->action, $this->noNeedLogin)) {
            $TokenService = new TokenService;
            $authenticate = $post_data['authenticate'] ?? $post_data;
            $this->user_info = $TokenService->checkToken($authenticate['token'] ?? '');

            return true;
        }

        return true;
    }


    /**
     * 重写验证规则
     * @param array $data
     * @param array|string $validate
     * @param array $message
     * @param bool $batch
     * @return array|bool|string|true
     */
    public function validate(array $data, $validate, array $message = [], bool $batch = false)
    {
        try {
            parent::validate($data, $validate, $message, $batch);
        } catch (Exception $e) {
            throw new BusinessException($e->getMessage(), 401);
        }
        return true;
    }
}