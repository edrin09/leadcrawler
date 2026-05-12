<?php

namespace app\service;

/**
 * 店铺联系电话提取服务
 * 集成美团、小红书、抖音、闲鱼等平台搜索
 */
class PhoneExtractorService
{
    // 手机号匹配模式
    protected array $phonePatterns = [
        'exact' => [
            '/1[3-9]\d{9}/',
            '/1[3-9]\d{2}[-.\s]\d{4}[-.\s]\d{4}/',
        ],
        'special' => [
            '/0\d{2,3}[-.]?\d{7,8}/',
        ]
    ];

    // 请求头
    protected array $headers = [
        'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language' => 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer' => 'https://www.baidu.com/',
    ];

    // 搜索平台配置
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
     * 提取电话号码
     */
    public function extractPhones(string $text, string $matchType = 'all'): array
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
     * 清理电话号码格式
     */
    protected function cleanPhone(string $phone): ?string
    {
        $cleaned = preg_replace('/[-\s()（）·*_.]/', '', $phone);

        // 无效号码模式
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

        // 验证手机号
        if (str_starts_with($cleaned, '1') && strlen($cleaned) === 11) {
            $second = $cleaned[1];
            if (in_array($second, ['3', '4', '5', '6', '7', '8', '9'])) {
                if (count(array_unique(str_split($cleaned))) > 2) {
                    return $cleaned;
                }
            }
        }
        // 验证西安地区固定电话
        elseif (str_starts_with($cleaned, '029') && (strlen($cleaned) === 11 || strlen($cleaned) === 12)) {
            return $cleaned;
        }

        return null;
    }

    /**
     * 获取页面内容
     */
    protected function fetchPage(string $url, int $timeout = 10): ?string
    {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $this->formatHeaders());
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

        $content = curl_exec($ch);
        $error = curl_error($ch);
        curl_close($ch);

        return $error ? null : $content;
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
     * 分析单个页面
     */
    public function analyzePage(string $url): array
    {
        $content = $this->fetchPage($url);
        if (!$content) {
            return [];
        }

        $phones = [];

        // 从HTML文本提取
        $text = strip_tags($content);
        $phones = array_merge($phones, $this->extractPhones($text));

        // 从属性提取
        $phones = array_merge($phones, $this->extractFromAttributes($content));

        // 从script标签提取
        $phones = array_merge($phones, $this->extractFromScripts($content));

        return array_unique($phones);
    }

    /**
     * 从HTML属性提取
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
     * 从script标签提取
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
     * 生成关键词变体
     */
    public function generateKeywordVariations(string $keywords): array
    {
        $variations = [$keywords];

        $replacements = [
            ['旺铺', '商铺'],
            ['出租', '招租'],
            ['直租', '出租'],
            ['转让', '出租'],
            ['门面', '商铺'],
            ['店铺', '商铺'],
            ['小学', '学校'],
            ['门口', ''],
            ['/', ' '],
            ['|', ' '],
        ];

        foreach ($replacements as [$old, $new]) {
            $variations[] = str_replace($old, $new, $keywords);
        }

        $parts = explode(' ', $keywords);
        if (count($parts) > 2) {
            $variations[] = implode(' ', array_slice($parts, 0, 2));
            $variations[] = implode(' ', array_slice($parts, -2));
        }

        return array_unique($variations);
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
     * 搜索所有平台
     */
    public function searchPlatforms(string $keywords): array
    {
        $phones = [];

        foreach ($this->platforms as $platform) {
            $result = $this->searchPlatform($platform, $keywords);
            if ($result) {
                $phones = array_merge($phones, $result);
            }
        }

        return array_unique($phones);
    }

    /**
     * 按相关性排序电话
     */
    public function sortByRelevance(array $phones): array
    {
        usort($phones, function ($a, $b) {
            return $this->getScore($b) - $this->getScore($a);
        });
        return $phones;
    }

    /**
     * 获取电话号码得分
     */
    protected function getScore(string $phone): int
    {
        $score = 0;

        if (strlen($phone) === 11 && str_starts_with($phone, '1')) {
            $score += 10;
        }

        if (str_starts_with($phone, '029') || str_starts_with($phone, '13') || str_starts_with($phone, '15')) {
            $score += 5;
        }

        if (str_contains($phone, '888') || str_contains($phone, '666') || str_contains($phone, '999')) {
            $score += 3;
        }

        return $score;
    }

    /**
     * 运行提取器
     */
    public function run(?string $urls = '', string $location = '', string $keywords = ''): array
    {
        $startTime = microtime(true);
        $allPhones = [];

        // 处理URL列表
        if ($urls) {
            $urlList = array_filter(array_map('trim', explode("\n", $urls)));
            foreach ($urlList as $url) {
                $phones = $this->analyzePage($url);
                if ($phones) {
                    $allPhones = array_merge($allPhones, $phones);
                }
            }
        }

        // 搜索平台
        $searchKey = $keywords ?: $location;
        if ($searchKey) {
            $variations = $this->generateKeywordVariations($searchKey);
            foreach ($variations as $kw) {
                if (trim($kw)) {
                    $phones = $this->searchPlatforms($kw);
                    if ($phones) {
                        $allPhones = array_merge($allPhones, $phones);
                    }
                }
            }
        }

        $uniquePhones = array_unique($allPhones);
        $sortedPhones = $this->sortByRelevance($uniquePhones);
        $elapsed = round(microtime(true) - $startTime, 2);

        return [
            'phones' => $sortedPhones,
            'count' => count($sortedPhones),
            'elapsed' => $elapsed,
            'status' => 'success'
        ];
    }
}
