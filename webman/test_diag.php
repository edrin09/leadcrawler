<?php
require __DIR__ . '/vendor/autoload.php';

echo "=== PhoneExtractorService 端到端诊断 ===\n\n";

$service = new app\common\service\PhoneExtractorService();

// 测试1：模拟一个包含电话号码的HTML页面
echo "1. 模拟HTML页面提取测试:\n";
$html = '<html><head><title>旺铺出租 - 西安未央区</title></head><body>
    <h1>旺铺出租</h1>
    <p>联系人：张先生</p>
    <p>联系电话：13812345678</p>
    <p>备用电话：029-88886666</p>
    <p>公司：西安某某商贸有限公司</p>
    <p>地址：西安市未央区凤城十二路</p>
</body></html>';

$ref = new ReflectionClass($service);

// 测试 extractPhones
$method = $ref->getMethod('extractPhones');
$method->setAccessible(true);
$text = strip_tags($html);
$phones = $method->invoke($service, $text);
echo "   extractPhones 结果: " . json_encode($phones, JSON_UNESCAPED_UNICODE) . "\n";

// 测试 extractFromAttributes
$method = $ref->getMethod('extractFromAttributes');
$method->setAccessible(true);
$attrPhones = $method->invoke($service, $html);
echo "   extractFromAttributes 结果: " . json_encode($attrPhones, JSON_UNESCAPED_UNICODE) . "\n";

// 测试 extractFromScripts
$method = $ref->getMethod('extractFromScripts');
$method->setAccessible(true);
$scriptPhones = $method->invoke($service, $html);
echo "   extractFromScripts 结果: " . json_encode($scriptPhones, JSON_UNESCAPED_UNICODE) . "\n";

// 测试 extractBusinessName
$method = $ref->getMethod('extractBusinessName');
$method->setAccessible(true);
$businessName = $method->invoke($service, $text, $html);
echo "   extractBusinessName 结果: " . $businessName . "\n";

// 测试 extractSearchKeywords
$method = $ref->getMethod('extractSearchKeywords');
$method->setAccessible(true);
$keywords = $method->invoke($service, $text, $businessName);
echo "   extractSearchKeywords 结果: " . json_encode($keywords, JSON_UNESCAPED_UNICODE) . "\n";

// 测试 extractBusinessInfo
$method = $ref->getMethod('extractBusinessInfo');
$method->setAccessible(true);
$businessInfo = $method->invoke($service, $text);
echo "   extractBusinessInfo 结果: " . json_encode($businessInfo, JSON_UNESCAPED_UNICODE) . "\n";

echo "\n2. 模拟 unifiedExtract 完整流程:\n";
$result = $service->unifiedExtract([
    'url' => 'https://www.example.com',  // 这个URL不存在，会fetch失败
]);
echo "   summary: " . json_encode($result['summary'], JSON_UNESCAPED_UNICODE) . "\n";
echo "   phones count: " . count($result['phones']) . "\n";
echo "   detail_results status: " . ($result['detail_results'][0]['status'] ?? 'none') . "\n";

echo "\n3. 测试 phonePatterns 正则:\n";
$patterns = $ref->getProperty('phonePatterns');
$patterns->setAccessible(true);
$phonePatterns = $patterns->getValue($service);
echo "   exact patterns:\n";
foreach ($phonePatterns['exact'] as $p) {
    echo "     $p\n";
}
echo "   special patterns:\n";
foreach ($phonePatterns['special'] as $p) {
    echo "     $p\n";
}

// 手动测试正则
$testText = '电话13812345678手机15900001111座机029-88886666';
echo "\n4. 手动正则测试:\n";
echo "   测试文本: $testText\n";
foreach ($phonePatterns['exact'] as $p) {
    if (preg_match_all($p, $testText, $m)) {
        echo "   $p 匹配: " . json_encode($m[0], JSON_UNESCAPED_UNICODE) . "\n";
    } else {
        echo "   $p 无匹配\n";
    }
}
foreach ($phonePatterns['special'] as $p) {
    if (preg_match_all($p, $testText, $m)) {
        echo "   $p 匹配: " . json_encode($m[0], JSON_UNESCAPED_UNICODE) . "\n";
    } else {
        echo "   $p 无匹配\n";
    }
}

echo "\n5. 测试 cleanPhone 对匹配结果的过滤:\n";
$method = $ref->getMethod('cleanPhone');
$method->setAccessible(true);
$testPhones = ['13812345678', '15900001111', '029-88886666', '02988886666'];
foreach ($testPhones as $p) {
    $result = $method->invoke($service, $p);
    echo "   $p => " . var_export($result, true) . "\n";
}

echo "\n=== 诊断完成 ===\n";
echo "\n如果以上测试都通过，但页面仍获取不到电话，可能原因：\n";
echo "1. 目标URL的页面内容中确实没有电话号码\n";
echo "2. 目标页面需要JS渲染，curl无法获取动态内容\n";
echo "3. 目标页面有反爬机制，curl请求被拦截\n";
echo "4. PHP运行环境有问题（检查webman日志）\n";