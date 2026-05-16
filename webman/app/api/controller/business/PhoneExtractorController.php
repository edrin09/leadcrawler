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
    protected $noNeedLogin = ['unified', 'debug'];

    public function initialize()
    {
        parent::initialize();
    }

    public function debug(Request $request): Response
    {
        $url = $request->post('url', '');
        if (!$url) {
            return json(['code' => 1, 'msg' => '请提供 url', 'data' => null]);
        }

        $service = new PhoneExtractorService();
        $ref = new \ReflectionClass($service);
        $method = $ref->getMethod('fetchPage');
        $method->setAccessible(true);

        $content = $method->invoke($service, $url, 15);
        if (!$content) {
            return json(['code' => 1, 'msg' => '抓取失败', 'data' => null]);
        }

        $encoding = mb_detect_encoding($content, ['UTF-8', 'GBK', 'GB2312', 'ISO-8859-1'], true);
        $utf8Content = $content;
        if ($encoding && $encoding !== 'UTF-8') {
            $utf8Content = mb_convert_encoding($content, 'UTF-8', $encoding);
        }

        $savePath = runtime_path() . '/debug_page_' . md5($url) . '.html';
        file_put_contents($savePath, $content);

        $text = strip_tags($utf8Content);
        $phonePattern = '/1[3-9]\d{9}/';
        preg_match_all($phonePattern, $text, $phoneMatches);
        preg_match_all($phonePattern, $utf8Content, $rawPhoneMatches);

        return json([
            'code' => 0,
            'msg' => 'ok',
            'data' => [
                'url' => $url,
                'encoding' => $encoding ?: 'unknown',
                'content_length' => strlen($content),
                'text_length' => strlen($text),
                'saved_to' => $savePath,
                'text_phones' => array_values(array_unique($phoneMatches[0] ?? [])),
                'raw_phones' => array_values(array_unique($rawPhoneMatches[0] ?? [])),
                'text_preview' => mb_substr($text, 0, 500),
                'html_preview' => substr($utf8Content, 0, 1000),
            ]
        ]);
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
