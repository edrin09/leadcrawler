<?php

namespace app\api\controller\business;

use app\api\service\business\CrawlerService;
use app\BaseController;
use support\Request;

class CrawlerController extends BaseController
{
    protected $service;

    public function __construct()
    {
        $this->service = new CrawlerService();
    }

    public function index(Request $request)
    {
        try {
            $page = (int)($request->get('page', 1));
            $limit = (int)($request->get('limit', 10));

            $result = $this->service->getList($page, $limit);

            return json([
                'data' => $result['data'],
                'pagination' => [
                    'page' => $result['page'],
                    'limit' => $result['limit'],
                    'total' => $result['total'],
                    'pages' => $result['pages']
                ]
            ]);
        } catch (\Exception $e) {
            return json([
                'error' => '数据库查询失败',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function show(Request $request, $id)
    {
        try {
            $result = $this->service->getById($id);

            if (!$result) {
                return json([
                    'error' => '数据不存在'
                ], 404);
            }

            return json($result);
        } catch (\Exception $e) {
            return json([
                'error' => '数据库查询失败',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
