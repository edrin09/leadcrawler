<?php

namespace app\api\controller;

use app\service\PhoneExtractorService;
use support\Request;
use support\Response;

/**
 * 电话提取器 API 控制器
 */
class PhoneExtractorController
{
    protected PhoneExtractorService $service;

    public function __construct()
    {
        $this->service = new PhoneExtractorService();
    }

    /**
     * 提取电话
     */
    public function extract(Request $request): Response
    {
        $urls = $request->post('urls', '');
        $location = $request->post('location', '');
        $keywords = $request->post('keywords', '');

        try {
            $result = $this->service->run($urls, $location, $keywords);
            return json([
                'code' => 0,
                'msg' => '提取成功',
                'data' => $result
            ]);
        } catch (\Exception $e) {
            return json([
                'code' => 1,
                'msg' => $e->getMessage(),
                'data' => null
            ]);
        }
    }

    /**
     * 分析单个页面
     */
    public function analyze(Request $request): Response
    {
        $url = $request->post('url', '');

        if (empty($url)) {
            return json([
                'code' => 1,
                'msg' => '请提供URL',
                'data' => null
            ]);
        }

        try {
            $phones = $this->service->analyzePage($url);
            return json([
                'code' => 0,
                'msg' => '分析成功',
                'data' => [
                    'phones' => $phones,
                    'count' => count($phones)
                ]
            ]);
        } catch (\Exception $e) {
            return json([
                'code' => 1,
                'msg' => $e->getMessage(),
                'data' => null
            ]);
        }
    }

    /**
     * 搜索平台
     */
    public function search(Request $request): Response
    {
        $keywords = $request->post('keywords', '');

        if (empty($keywords)) {
            return json([
                'code' => 1,
                'msg' => '请提供关键词',
                'data' => null
            ]);
        }

        try {
            $phones = $this->service->searchPlatforms($keywords);
            $sorted = $this->service->sortByRelevance($phones);
            return json([
                'code' => 0,
                'msg' => '搜索成功',
                'data' => [
                    'phones' => $sorted,
                    'count' => count($sorted)
                ]
            ]);
        } catch (\Exception $e) {
            return json([
                'code' => 1,
                'msg' => $e->getMessage(),
                'data' => null
            ]);
        }
    }

    /**
     * 生成关键词变体
     */
    public function variations(Request $request): Response
    {
        $keywords = $request->post('keywords', '');

        if (empty($keywords)) {
            return json([
                'code' => 1,
                'msg' => '请提供关键词',
                'data' => null
            ]);
        }

        $variations = $this->service->generateKeywordVariations($keywords);
        return json([
            'code' => 0,
            'msg' => '获取成功',
            'data' => [
                'variations' => $variations,
                'count' => count($variations)
            ]
        ]);
    }
}
