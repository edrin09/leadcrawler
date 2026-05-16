<?php

namespace app\common\service;

/**
 * 店铺联系电话提取服务
 * 集成美团、小红书、抖音、闲鱼等平台搜索
 *
 * 统一入口：unifiedExtract()
 */
class PhoneExtractorService
{
    protected array $phonePatterns = [
        'exact' => [
            '/1[3-9]\d{9}/',
            '/1[3-9]\d{2}[-.\s]\d{4}[-.\s]\d{4}/',
        ],
        'special' => [
            '/0\d{2,3}[-.]?\d{7,8}/',
        ]
    ];

    protected array $headers = [
        'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language' => 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding' => 'gzip, deflate, br',
        'Cache-Control' => 'no-cache',
        'Pragma' => 'no-cache',
        'Sec-Ch-Ua' => '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile' => '?0',
        'Sec-Ch-Ua-Platform' => '"Windows"',
        'Sec-Fetch-Dest' => 'document',
        'Sec-Fetch-Mode' => 'navigate',
        'Sec-Fetch-Site' => 'none',
        'Sec-Fetch-User' => '?1',
        'Upgrade-Insecure-Requests' => '1',
    ];

    protected array $platforms = [
        ['name' => '58同城', 'url' => 'https://xa.58.com/shangpu/?key=%s'],
        ['name' => '安居客', 'url' => 'https://xa.sydc.anjuke.com/sp-zu/?kw=%s'],
        ['name' => '房天下', 'url' => 'https://xian.esf.fang.com/shangpu/?keyword=%s'],
        ['name' => '贝壳找房', 'url' => 'https://xa.ke.com/xiaoqu/?keyword=%s'],
        ['name' => '百度地图', 'url' => 'https://map.baidu.com/search/%s'],
        ['name' => '高德地图', 'url' => 'https://amap.com/search?query=%s'],
        ['name' => '美团', 'url' => 'https://www.meituan.com/s/%s/'],
        ['name' => '小红书', 'url' => 'https://xiaohongshu.com/search_result?keyword=%s'],
        ['name' => '抖音', 'url' => 'https://www.douyin.com/search/%s'],
        ['name' => '闲鱼', 'url' => 'https://2.taobao.com/list/list.htm?q=%s'],
        ['name' => '大众点评', 'url' => 'https://www.dianping.com/search/category/7/10/r60114/kw%s'],
        ['name' => '腾讯地图', 'url' => 'https://map.qq.com/search/%s'],
    ];

    /**
     * 统一提取入口（唯一对外方法）
     * 输入任意形式的数据（URL/采集数据），自动完成：
     * 1. 详情页深度提取（电话+商户名+工商信息+关键词）
     * 2. 跨平台关联检索
     * 3. 电话可信度评分排序
     *
     * @param array $options {
     *     url: string,           // 单个详情页URL
     *     location: string,      // 位置提示（可选）
     *     keywords: string,      // 额外关键词（可选）
     *     crawl_data: array,     // 采集脚本输出的JSON数据（可选）
     *     timeout: int,          // 超时时间，默认10秒
     *     max_platforms: int,    // 最大跨平台搜索数，默认6
     * }
     */
    public function unifiedExtract(array $options = []): array
    {
        $startTime = microtime(true);
        $timeout = $options['timeout'] ?? 10;
        $maxPlatforms = $options['max_platforms'] ?? 6;
        $location = $options['location'] ?? '';
        $extraKeywords = $options['keywords'] ?? '';

        $allDetailResults = [];
        $allCrossResults = [];
        $phoneSourceMap = [];

        // ---- 数据源1：单个URL ----
        if (!empty($options['url'])) {
            $detailInfo = $this->extractDetailPageInfo($options['url'], $timeout);
            $allDetailResults[] = $detailInfo;

            if ($detailInfo['status'] === 'success') {
                $this->trackPhoneSources($phoneSourceMap, $detailInfo['phones'], 'detail_page', $options['url']);
                $crossResults = $this->crossPlatformSearch([
                    'business_name' => $detailInfo['business_name'],
                    'keywords' => $detailInfo['keywords'],
                    'address' => $detailInfo['business_info']['address'] ?? '',
                    'legal_person' => $detailInfo['business_info']['legal_person'] ?? '',
                ], $maxPlatforms);
                $allCrossResults = $crossResults;
                foreach ($crossResults as $cr) {
                    $this->trackPhoneSources($phoneSourceMap, $cr['phones'], $cr['platform'], $cr['keyword']);
                }
            }
        }

        // ---- 数据源2：采集数据 ----
        if (!empty($options['crawl_data'])) {
            $crawlData = $options['crawl_data'];
            foreach ($crawlData as $item) {
                $detailUrl = $item['detailUrl'] ?? $item['detail_url'] ?? '';
                if (empty($detailUrl)) continue;

                $detailInfo = $this->extractDetailPageInfo($detailUrl, $timeout);
                $detailInfo['source'] = $item['source'] ?? '';
                $detailInfo['original_title'] = $item['title'] ?? '';
                $allDetailResults[] = $detailInfo;

                if ($detailInfo['status'] === 'success') {
                    $this->trackPhoneSources($phoneSourceMap, $detailInfo['phones'], 'detail_page', $detailUrl);
                    $crossResults = $this->crossPlatformSearch([
                        'business_name' => $detailInfo['business_name'],
                        'keywords' => $detailInfo['keywords'],
                        'address' => $detailInfo['business_info']['address'] ?? '',
                        'legal_person' => $detailInfo['business_info']['legal_person'] ?? '',
                    ], $maxPlatforms);
                    $allCrossResults = array_merge($allCrossResults, $crossResults);
                    foreach ($crossResults as $cr) {
                        $this->trackPhoneSources($phoneSourceMap, $cr['phones'], $cr['platform'], $cr['keyword']);
                    }
                }
            }
        }

        // ---- 数据源3：仅关键词搜索（无URL时） ----
        if (empty($allDetailResults) && !empty($extraKeywords)) {
            $crossResults = $this->crossPlatformSearch([
                'business_name' => '',
                'keywords' => [$extraKeywords],
                'address' => $location,
                'legal_person' => '',
            ], $maxPlatforms);
            $allCrossResults = $crossResults;
            foreach ($crossResults as $cr) {
                $this->trackPhoneSources($phoneSourceMap, $cr['phones'], $cr['platform'], $cr['keyword']);
            }
        }

        // ---- 汇总所有商户信息 ----
        $allBusinessNames = [];
        $allBusinessInfo = [];
        $allKeywords = [];
        $allSearchKeywords = [];
        foreach ($allDetailResults as $dr) {
            if (!empty($dr['business_name'])) {
                $allBusinessNames[] = $dr['business_name'];
            }
            if (!empty($dr['business_info'])) {
                $allBusinessInfo = array_merge($allBusinessInfo, $dr['business_info']);
            }
            if (!empty($dr['keywords'])) {
                $allKeywords = array_merge($allKeywords, $dr['keywords']);
            }
        }
        $allBusinessNames = array_unique($allBusinessNames);
        $allKeywords = array_unique($allKeywords);

        foreach ($allCrossResults as $cr) {
            if (!empty($cr['keyword'])) {
                $allSearchKeywords[] = $cr['keyword'];
            }
        }
        $allSearchKeywords = array_unique($allSearchKeywords);

        // ---- 可信度评分 ----
        $scoredPhones = [];
        foreach ($phoneSourceMap as $phone => $sources) {
            $score = $this->scorePhoneCredibility($phone, $sources, $allBusinessNames, $allBusinessInfo);
            $scoredPhones[] = [
                'phone' => $phone,
                'score' => $score,
                'level' => $this->classifyConfidence($score),
                'sources' => array_unique(array_column($sources, 'source')),
                'source_count' => count($sources),
                'source_detail' => $sources,
                'type' => $this->classifyPhoneType($phone),
            ];
        }

        // ---- 按可信度排序 ----
        usort($scoredPhones, function ($a, $b) {
            return $b['score'] - $a['score'];
        });

        // ---- 统计 ----
        $highCount = count(array_filter($scoredPhones, fn($p) => $p['level'] === 'high'));
        $mediumCount = count(array_filter($scoredPhones, fn($p) => $p['level'] === 'medium'));
        $lowCount = count(array_filter($scoredPhones, fn($p) => $p['level'] === 'low'));

        $elapsed = round(microtime(true) - $startTime, 2);

        return [
            'phones' => $scoredPhones,
            'business_names' => array_values($allBusinessNames),
            'business_info' => $allBusinessInfo,
            'keywords' => array_values(array_slice($allKeywords, 0, 10)),
            'search_keywords' => array_values($allSearchKeywords),
            'detail_results' => $allDetailResults,
            'cross_platform_results' => $allCrossResults,
            'summary' => [
                'total_phones' => count($scoredPhones),
                'high_confidence' => $highCount,
                'medium_confidence' => $mediumCount,
                'low_confidence' => $lowCount,
                'detail_pages_processed' => count($allDetailResults),
                'cross_platform_searches' => count($allCrossResults),
                'elapsed' => $elapsed,
            ],
        ];
    }

    // ============================================================
    //  内部方法（全部 protected）
    // ============================================================

    /**
     * 从详情页提取结构化信息
     */
    protected function extractDetailPageInfo(string $url, int $timeout = 10): array
    {
        $content = $this->fetchPage($url, $timeout);
        if (!$content) {
            return [
                'url' => $url,
                'phones' => [],
                'business_name' => '',
                'business_info' => [],
                'keywords' => [],
                'status' => 'fetch_failed',
                'status_msg' => '页面抓取失败，请检查URL是否可访问',
                'content_length' => 0,
                'text_length' => 0,
            ];
        }

        $antiBotStatus = $this->detectAntiBot($content);
        if ($antiBotStatus) {
            return [
                'url' => $url,
                'phones' => [],
                'business_name' => '',
                'business_info' => [],
                'keywords' => [],
                'status' => 'antibot',
                'status_msg' => $antiBotStatus,
                'content_length' => strlen($content),
                'text_length' => 0,
            ];
        }

        if (strlen($content) < 30000) {
            \support\Log::warning("Small page detected: url=$url, size=" . strlen($content) . ", preview=" . substr(strip_tags($content), 0, 500));
        }

        $encoding = mb_detect_encoding($content, ['UTF-8', 'GBK', 'GB2312', 'ISO-8859-1'], true);
        if ($encoding && $encoding !== 'UTF-8' && $encoding !== 'ASCII') {
            $content = mb_convert_encoding($content, 'UTF-8', $encoding);
        }

        $text = strip_tags($content);

        $phones = $this->extractPhones($text);
        $attrPhones = $this->extractFromAttributes($content);
        $scriptPhones = $this->extractFromScripts($content);
        $allPhones = array_values(array_unique(array_merge($phones, $attrPhones, $scriptPhones)));

        $businessName = $this->extractBusinessName($text, $content);
        $businessInfo = $this->extractBusinessInfo($text);
        $keywords = $this->extractSearchKeywords($text, $businessName);

        return [
            'url' => $url,
            'phones' => $allPhones,
            'business_name' => $businessName,
            'business_info' => $businessInfo,
            'keywords' => $keywords,
            'status' => 'success',
            'status_msg' => '页面解析成功',
            'content_length' => strlen($content),
            'text_length' => strlen($text),
            'text_phones' => $phones,
            'attr_phones' => $attrPhones,
            'script_phones' => $scriptPhones,
        ];
    }

    /**
     * 检测反爬/验证码页面
     */
    protected function detectAntiBot(string $html): string
    {
        $antiBotSignatures = [
            '请输入验证码' => '页面需要验证码验证，当前IP已被目标站点反爬系统拦截',
            '访问过于频繁' => '访问频率过高，当前IP已被目标站点限流',
            '滑块验证' => '页面需要滑块验证，当前IP触发了反爬机制',
            '人机验证' => '页面需要人机验证，当前IP被目标站点识别为爬虫',
            '请点击按钮进行验证' => '页面要求点击验证，当前IP被反爬系统拦截',
            '安全验证' => '页面触发安全验证，当前IP被目标站点拦截',
            '请输入图形验证码' => '页面需要图形验证码，当前IP被反爬系统拦截',
            'ISDCaptcha' => '页面触发58同城系反爬验证，当前IP已被拦截',
            'NEcaptcha' => '页面触发58同城系反爬验证，当前IP已被拦截',
        ];

        foreach ($antiBotSignatures as $signature => $message) {
            if (stripos($html, $signature) !== false) {
                return $message;
            }
        }

        if (strlen($html) < 8000 && preg_match('/验证|校验|频繁|拦截/i', $html)) {
            return '页面内容异常（疑似反爬拦截），页面大小仅' . strlen($html) . '字节';
        }

        return '';
    }

    /**
     * 获取网页内容
     */
    protected function fetchPage(string $url, int $timeout = 10): ?string
    {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_MAXREDIRS, 5);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $this->formatHeaders());
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch, CURLOPT_ENCODING, 'gzip');

        $content = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        $errno = curl_errno($ch);
        curl_close($ch);

        if ($error || $errno) {
            \support\Log::warning("fetchPage failed: url=$url, errno=$errno, error=$error, httpCode=$httpCode");
            return null;
        }

        if ($httpCode >= 400) {
            \support\Log::warning("fetchPage HTTP error: url=$url, httpCode=$httpCode");
            return null;
        }

        return $content;
    }

    /**
     * 格式化请求头
     */
    protected function formatHeaders(): array
    {
        $headers = [];
        foreach ($this->headers as $key => $value) {
            $headers[] = "$key: $value";
        }
        return $headers;
    }

    /**
     * 从文本中提取电话号码
     */
    protected function extractPhones(string $text, string $matchType = 'all'): array
    {
        $phones = [];
        $patternGroups = $matchType === 'all' ? ['exact', 'special'] : ['exact'];

        foreach ($patternGroups as $group) {
            foreach ($this->phonePatterns[$group] as $pattern) {
                if (preg_match_all($pattern, $text, $matches)) {
                    foreach ($matches[0] as $match) {
                        $phone = $this->cleanPhone($match);
                        if ($phone && !in_array($phone, $phones)) {
                            $phones[] = $phone;
                        }
                    }
                }
            }
        }

        sort($phones);
        return $phones;
    }

    /**
     * 从文本中提取电话号码（公开方法，供计划任务调用）
     */
    public function extractPhonesFromText(string $text): array
    {
        return $this->extractPhones($text);
    }

    /**
     * 清洗电话号码格式
     */
    protected function cleanPhone(string $phone): ?string
    {
        $cleaned = preg_replace('/[-\s()（）·*_.]/', '', $phone);

        $invalidPatterns = [
            '/^0{2,}/',
            '/^1[012]/',
            '/^0123456789$/',
            '/^0+[1-9]0+$/',
            '/^\d{3,4}0{4,}$/',
            '/^0{3,}\d+$/',
            '/^400\d+$/',
            '/^800\d+$/',
        ];

        foreach ($invalidPatterns as $pattern) {
            if (preg_match($pattern, $cleaned)) {
                return null;
            }
        }

        if (str_starts_with($cleaned, '1') && strlen($cleaned) === 11) {
            $second = $cleaned[1];
            if (in_array($second, ['3', '4', '5', '6', '7', '8', '9'])) {
                if (count(array_unique(str_split($cleaned))) >= 2) {
                    return $cleaned;
                }
            }
            return null;
        }

        if (preg_match('/^0\d{2,3}\d{7,8}$/', $cleaned)) {
            return $cleaned;
        }

        return null;
    }

    /**
     * 从HTML属性中提取电话
     */
    protected function extractFromAttributes(string $html): array
    {
        $phones = [];
        $attrs = ['href', 'data-phone', 'data-tel', 'data-mobile', 'tel', 'phone'];

        foreach ($attrs as $attr) {
            if (preg_match_all('/' . preg_quote($attr, '/') . '=["\']([^"\']+)["\']/', $html, $matches)) {
                foreach ($matches[1] as $value) {
                    $phones = array_merge($phones, $this->extractPhones($value));
                }
            }
        }

        return $phones;
    }

    /**
     * 从脚本中提取电话
     */
    protected function extractFromScripts(string $html): array
    {
        $phones = [];
        if (preg_match_all('/<script[^>]*>([\s\S]*?)<\/script>/i', $html, $matches)) {
            foreach ($matches[1] as $script) {
                $phones = array_merge($phones, $this->extractPhones($script));
            }
        }
        return $phones;
    }

    /**
     * 提取商户名称
     */
    protected function extractBusinessName(string $text, string $html = ''): string
    {
        $names = [];

        // 从meta标签提取
        if ($html) {
            $metaPatterns = [
                '/<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)["\']/i',
                '/<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']description["\']/i',
                '/<title[^>]*>([^<]+)<\/title>/i',
            ];
            foreach ($metaPatterns as $pattern) {
                if (preg_match($pattern, $html, $m)) {
                    $candidate = $this->extractCompanyNameFromText($m[1]);
                    if ($candidate) {
                        $names[] = $candidate;
                    }
                }
            }
        }

        // 从结构化标签提取
        $structuredPatterns = [
            '/(?:公司名称|企业名称|商户名称|店铺名称|名称)[：:]\s*([^\n\r]{4,50})/u',
            '/(?:联系人|店主|老板|负责人)[：:]\s*([^\n\r]{2,20})/u',
        ];
        foreach ($structuredPatterns as $pattern) {
            if (preg_match_all($pattern, $text, $matches)) {
                foreach ($matches[1] as $m) {
                    $m = trim($m);
                    if (mb_strlen($m) >= 2 && !is_numeric($m)) {
                        $names[] = $m;
                    }
                }
            }
        }

        // 从文本中匹配公司名称模式
        $companyPatterns = [
            '/([\x{4e00}-\x{9fa5}]{2,20}(?:有限(?:责任)?公司|集团有限公司|股份有限公司|实业公司|科技公司|商贸公司|餐饮公司|管理公司|咨询公司|服务公司|发展公司|投资公司|置业公司|房地产公司|物业公司|装饰公司|装修公司|文化公司|传媒公司|教育公司|医疗公司|医药公司|食品公司|贸易公司|电子商务公司|网络公司|信息公司|软件公司|技术公司))/u',
            '/([\x{4e00}-\x{9fa5}]{2,20}(?:店|铺|行|馆|坊|社|部|中心|工作室|经营部|服务部|商行|商店|商场|超市|酒店|饭店|餐厅|宾馆|旅馆))/u',
            '/([\x{4e00}-\x{9fa5}]{2,10}(?:个体工商户|个体户))/u',
        ];
        foreach ($companyPatterns as $pattern) {
            if (preg_match_all($pattern, $text, $matches)) {
                foreach ($matches[1] as $m) {
                    $m = trim($m);
                    if (mb_strlen($m) >= 4) {
                        $names[] = $m;
                    }
                }
            }
        }

        // 去重并返回最可能的名称
        $names = array_unique($names);
        $names = array_values(array_filter($names, function ($n) {
            return mb_strlen($n) >= 2 && !preg_match('/^\d+[\d\s]*$/', $n);
        }));

        // 优先返回公司名称格式的
        foreach ($names as $name) {
            if (preg_match('/(公司|有限|集团|股份)/u', $name)) {
                return $name;
            }
        }

        return $names[0] ?? '';
    }

    /**
     * 从文本片段中提取公司名称
     */
    protected function extractCompanyNameFromText(string $text): ?string
    {
        $text = trim(strip_tags($text));

        $patterns = [
            '/([\x{4e00}-\x{9fa5}]{2,20}(?:有限(?:责任)?公司|集团有限公司|股份有限公司|实业公司|科技公司|商贸公司|餐饮公司|管理公司|咨询公司|服务公司|发展公司|投资公司|置业公司|房地产公司|物业公司|装饰公司|装修公司|文化公司|传媒公司|教育公司|医疗公司|医药公司|食品公司|贸易公司|电子商务公司|网络公司|信息公司|软件公司|技术公司))/u',
            '/([\x{4e00}-\x{9fa5}]{2,20}(?:店|铺|行|馆|坊|社|部|中心|工作室|经营部|服务部|商行|商店|商场|超市|酒店|饭店|餐厅|宾馆|旅馆))/u',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $text, $m)) {
                return trim($m[1]);
            }
        }

        return null;
    }

    /**
     * 提取工商注册信息
     */
    protected function extractBusinessInfo(string $text): array
    {
        $info = [];

        if (preg_match('/(?:统一社会信用代码|统一信用代码|信用代码|统一代码|社会信用代码)(?:：|:)\s*([0-9A-Z]{18})/u', $text, $m)) {
            $info['credit_code'] = $m[1];
        }

        if (preg_match('/(?:营业执照注册号|营业执照|注册号)(?:：|:)\s*(\d{15})/u', $text, $m)) {
            $info['license_no'] = $m[1];
        }

        if (preg_match('/(?:组织机构代码|组织代码|组织机构)(?:：|:)\s*([0-9A-Z]{8}-?[0-9A-Z])/u', $text, $m)) {
            $info['org_code'] = str_replace('-', '', $m[1]);
        }

        if (preg_match('/(?:法定代表人|法人代表|负责人)(?:：|:)\s*([^\n\r]{2,10})/u', $text, $m)) {
            $info['legal_person'] = trim($m[1]);
        }

        if (preg_match('/(?:注册资本)(?:：|:)\s*([^\n\r]{2,30})/u', $text, $m)) {
            $info['registered_capital'] = trim($m[1]);
        }

        if (preg_match('/(?:成立日期|注册日期)(?:：|:)\s*(\d{4}[-年]\d{1,2}[-月]\d{1,2}[日]?)/u', $text, $m)) {
            $info['establish_date'] = trim($m[1]);
        }

        if (preg_match('/(?:住所|经营场所|注册地址|地址)(?:：|:)\s*([^\n\r]{5,80})/u', $text, $m)) {
            $info['address'] = trim($m[1]);
        }

        if (preg_match('/(?:经营范围)(?:：|:)\s*([^\n\r]{10,200})/u', $text, $m)) {
            $info['business_scope'] = trim($m[1]);
        }

        if (preg_match('/(?:纳税人识别号|税务登记号)(?:：|:)\s*(\d{15,20})/u', $text, $m)) {
            $info['tax_no'] = $m[1];
        }

        return $info;
    }

    /**
     * 提取搜索关键词
     */
    protected function extractSearchKeywords(string $text, string $businessName = ''): array
    {
        $keywords = [];

        if ($businessName) {
            $keywords[] = $businessName;
            $coreName = preg_replace('/(有限(?:责任)?公司|集团有限公司|股份有限公司|实业公司|科技公司|商贸公司|餐饮公司|管理公司|咨询公司|服务公司|发展公司|投资公司|置业公司|房地产公司|物业公司|装饰公司|装修公司|文化公司|传媒公司|教育公司|医疗公司|医药公司|食品公司|贸易公司|电子商务公司|网络公司|信息公司|软件公司|技术公司|店|铺|行|馆|坊|社|部|中心|工作室|经营部|服务部|商行|商店|商场|超市|酒店|饭店|餐厅|宾馆|旅馆)/u', '', $businessName);
            $coreName = trim($coreName);
            if (mb_strlen($coreName) >= 2 && $coreName !== $businessName) {
                $keywords[] = $coreName;
            }
        }

        if (preg_match('/<title[^>]*>([^<]+)<\/title>/i', $text, $m)) {
            $title = trim(strip_tags($m[1]));
            $titleParts = preg_split('/[_\-\|｜\s]+/u', $title);
            foreach ($titleParts as $part) {
                $part = trim($part);
                if (mb_strlen($part) >= 3 && mb_strlen($part) <= 20 && !is_numeric($part)) {
                    $keywords[] = $part;
                }
            }
        }

        if (preg_match_all('/(?:地址|位置|位于)[：:\s]*([^\n\r]{5,40})/u', $text, $matches)) {
            foreach ($matches[1] as $addr) {
                $addr = trim($addr);
                if (mb_strlen($addr) >= 5) {
                    $keywords[] = $addr;
                }
            }
        }

        if (preg_match('/(?:经营范围|主营业务|经营)[：:\s]*([^\n\r]{5,50})/u', $text, $matches)) {
            $scope = trim($matches[1]);
            $scopeParts = preg_split('/[、，,;\s]+/u', $scope);
            foreach ($scopeParts as $part) {
                $part = trim($part);
                if (mb_strlen($part) >= 2 && mb_strlen($part) <= 10) {
                    $keywords[] = $part;
                }
            }
        }

        if (preg_match('/(?:联系人|店主|老板|负责人)[：:\s]*([^\n\r]{2,10})/u', $text, $m)) {
            $contact = trim($m[1]);
            if (mb_strlen($contact) >= 2) {
                $keywords[] = $contact;
            }
        }

        $keywords = array_unique($keywords);
        $keywords = array_values(array_filter($keywords, function ($kw) {
            $kw = trim($kw);
            return mb_strlen($kw) >= 2
                && !preg_match('/^\d+$/', $kw)
                && !in_array($kw, ['首页', '下一页', '上一页', '返回', '搜索', '登录', '注册']);
        }));

        usort($keywords, function ($a, $b) {
            return mb_strlen($b) - mb_strlen($a);
        });

        return array_slice($keywords, 0, 10);
    }

    /**
     * 追踪电话来源
     */
    protected function trackPhoneSources(array &$map, array $phones, string $source, string $context = ''): void
    {
        foreach ($phones as $phone) {
            if (!isset($map[$phone])) {
                $map[$phone] = [];
            }
            $map[$phone][] = [
                'source' => $source,
                'context' => $context,
            ];
        }
    }

    /**
     * 跨平台关联检索
     */
    protected function crossPlatformSearch(array $businessInfo, int $maxPlatforms = 6): array
    {
        $results = [];
        $searchKeywords = [];

        if (!empty($businessInfo['business_name'])) {
            $searchKeywords[] = $businessInfo['business_name'];
        }
        if (!empty($businessInfo['keywords'])) {
            $searchKeywords = array_merge($searchKeywords, $businessInfo['keywords']);
        }
        if (!empty($businessInfo['address'])) {
            $searchKeywords[] = $businessInfo['address'];
        }
        if (!empty($businessInfo['legal_person'])) {
            $searchKeywords[] = $businessInfo['legal_person'];
        }

        $searchKeywords = array_unique($searchKeywords);
        $searchKeywords = array_slice($searchKeywords, 0, 5);

        $priorityPlatforms = array_slice($this->platforms, 0, $maxPlatforms);

        foreach ($searchKeywords as $keyword) {
            if (empty(trim($keyword))) {
                continue;
            }

            foreach ($priorityPlatforms as $platform) {
                $phones = $this->searchPlatform($platform, $keyword);
                if (!empty($phones)) {
                    $key = md5($platform['name'] . $keyword);
                    if (!isset($results[$key])) {
                        $results[$key] = [
                            'platform' => $platform['name'],
                            'keyword' => $keyword,
                            'phones' => $phones,
                            'count' => count($phones),
                        ];
                    }
                }
            }
        }

        return array_values($results);
    }

    /**
     * 搜索单个平台
     */
    protected function searchPlatform(array $platform, string $keywords): array
    {
        $url = sprintf($platform['url'], urlencode($keywords));
        $content = $this->fetchPage($url);
        return $content ? $this->extractPhones($content) : [];
    }

    /**
     * 电话可信度评分（多维度加权）
     */
    protected function scorePhoneCredibility(string $phone, array $sources, array $businessNames = [], array $businessInfo = []): int
    {
        $score = 0;

        // 维度1：来源可信度 (30分)
        $hasDetailPage = false;
        $platformCount = 0;
        $uniquePlatforms = [];

        foreach ($sources as $src) {
            if ($src['source'] === 'detail_page') {
                $hasDetailPage = true;
            } else {
                $platformCount++;
                $uniquePlatforms[$src['source']] = true;
            }
        }

        if ($hasDetailPage) {
            $score += 30;
        } elseif ($platformCount > 0) {
            $score += min($platformCount * 8, 24);
        }

        // 维度2：共识度 (25分)
        $totalSources = count($sources);
        if ($totalSources >= 4) {
            $score += 25;
        } elseif ($totalSources >= 3) {
            $score += 20;
        } elseif ($totalSources >= 2) {
            $score += 15;
        } elseif ($totalSources === 1) {
            $score += 5;
        }

        // 维度3：上下文关联 (25分)
        $contextScore = 0;
        foreach ($sources as $src) {
            $context = $src['context'] ?? '';

            foreach ($businessNames as $name) {
                if (!empty($name) && mb_strpos($context, $name) !== false) {
                    $contextScore += 10;
                    break 2;
                }
            }

            foreach ($businessInfo as $key => $value) {
                if (!empty($value) && is_string($value) && mb_strpos($context, $value) !== false) {
                    $contextScore += 8;
                    break 2;
                }
            }

            $contactHints = ['电话', '手机', '联系', 'tel', 'phone', 'mobile', '客服', '热线'];
            foreach ($contactHints as $hint) {
                if (mb_stripos($context, $hint) !== false) {
                    $contextScore += 5;
                    break 2;
                }
            }
        }
        $score += min($contextScore, 25);

        // 维度4：号码格式质量 (10分)
        if (strlen($phone) === 11 && str_starts_with($phone, '1')) {
            $second = $phone[1] ?? '';
            if (in_array($second, ['3', '4', '5', '6', '7', '8', '9'])) {
                $score += 10;
            } else {
                $score += 5;
            }
        } elseif (str_starts_with($phone, '029')) {
            $score += 7;
        } elseif (preg_match('/^0\d{2,3}\d{7,8}$/', $phone)) {
            $score += 5;
        } else {
            $score += 2;
        }

        // 维度5：平台匹配数 (10分)
        $uniquePlatformCount = count($uniquePlatforms);
        if ($uniquePlatformCount >= 3) {
            $score += 10;
        } elseif ($uniquePlatformCount >= 2) {
            $score += 7;
        } elseif ($uniquePlatformCount >= 1) {
            $score += 4;
        }

        return min($score, 100);
    }

    /**
     * 可信度等级分类
     */
    protected function classifyConfidence(int $score): string
    {
        if ($score >= 70) return 'high';
        if ($score >= 40) return 'medium';
        return 'low';
    }

    /**
     * 电话号码类型分类
     */
    protected function classifyPhoneType(string $phone): string
    {
        if (strlen($phone) === 11 && str_starts_with($phone, '1')) {
            return 'mobile';
        }
        if (str_starts_with($phone, '029')) {
            return 'local_landline';
        }
        if (preg_match('/^0\d{2,3}\d{7,8}$/', $phone)) {
            return 'landline';
        }
        if (preg_match('/^400\d+$/', $phone) || preg_match('/^800\d+$/', $phone)) {
            return 'hotline';
        }
        return 'other';
    }
}
