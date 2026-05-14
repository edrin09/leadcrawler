<?php
require __DIR__ . '/vendor/autoload.php';

$service = new app\common\service\PhoneExtractorService();
$ref = new ReflectionClass($service);

$method = $ref->getMethod('fetchPage');
$method->setAccessible(true);

echo "Testing fetchPage:\n";
$content = $method->invoke($service, 'https://www.baidu.com', 10);
echo "Result: " . ($content ? 'SUCCESS (' . strlen($content) . ' bytes)' : 'FAILED') . "\n";

if ($content) {
    echo "First 200 chars: " . substr(strip_tags($content), 0, 200) . "\n";
}

echo "\nTesting anjuke:\n";
$content = $method->invoke($service, 'https://xa.sydc.anjuke.com/sp-zu/d4571406501174282/', 10);
echo "Result: " . ($content ? 'SUCCESS (' . strlen($content) . ' bytes)' : 'FAILED') . "\n";

if ($content) {
    $method2 = $ref->getMethod('detectAntiBot');
    $method2->setAccessible(true);
    $antiBot = $method2->invoke($service, $content);
    echo "AntiBot: " . ($antiBot ?: 'none') . "\n";
}