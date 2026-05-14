<?php

namespace app\api\controller\business;

use app\common\service\PhoneExtractorService;
use support\Request;
use support\Response;

/**
 * 电话提取器 API 控制器
 */
class PhoneExtractorController extends ApiMallComm
{
    protected $noNeedLogin = ['unified'];

    public function initialize()
    {
        parent::initialize();
    }

    /**
     * 统一提取入口（推荐使用）
     * 支持：单个URL / 采集数据 / 纯关键词搜索
     * 自动完成详情页提取 + 跨平台检索 + 可信度评分排序
     */
    public function unified(Request $request): Response
    {
        $options = [];

        $url = $request->post('url', '');
        $location = $request->post('location', '');
        $keywords = $request->post('keywords', '');
        $crawlData = $request->post('crawl_data', null);
        $timeout = $request->post('timeout', 10);
        $maxPlatforms = $request->post('max_platforms', 6);

        if ($url) $options['url'] = $url;
        if ($location) $options['location'] = $location;
        if ($keywords) $options['keywords'] = $keywords;
        if ($crawlData) {
            if (is_string($crawlData)) {
                $crawlData = json_decode($crawlData, true) ?: [];
            }
            $options['crawl_data'] = $crawlData;
        }
        $options['timeout'] = (int)$timeout;
        $options['max_platforms'] = (int)$maxPlatforms;

        if (empty($options['url']) && empty($options['crawl_data']) && empty($options['keywords'])) {
            return json([
                'code' => 1,
                'msg' => '请至少提供 url / crawl_data / keywords 之一',
                'data' => null
            ]);
        }

        $service = new PhoneExtractorService();

        $result = $service->unifiedExtract($options);
        return json([
            'code' => 0,
            'msg' => '提取成功',
            'data' => $result
        ]);
    }
}
