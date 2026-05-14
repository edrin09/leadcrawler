<?php
require __DIR__ . '/vendor/autoload.php';

$service = new app\common\service\PhoneExtractorService();
$ref = new ReflectionClass($service);
$method = $ref->getMethod('fetchPage');
$method->setAccessible(true);

$content = $method->invoke($service, 'https://xa.sydc.anjuke.com/sp-zu/d4571406501174282/', 10);
echo "Length: " . strlen($content) . "\n";
file_put_contents(__DIR__ . '/anjuke_web.html', $content);
echo "Saved to anjuke_web.html\n";

// Check for key patterns
echo "\n--- Key patterns ---\n";
echo "Contains '验证码': " . (strpos($content, '验证码') !== false ? 'YES' : 'NO') . "\n";
echo "Contains '频繁': " . (strpos($content, '频繁') !== false ? 'YES' : 'NO') . "\n";
echo "Contains 'phone': " . (stripos($content, 'phone') !== false ? 'YES' : 'NO') . "\n";
echo "Contains 'tel': " . (stripos($content, 'tel') !== false ? 'YES' : 'NO') . "\n";
echo "Contains '1[3-9]': " . (preg_match('/1[3-9]\d{9}/', $content) ? 'YES' : 'NO') . "\n";
echo "Contains '400': " . (preg_match('/400[-\s]?\d{3}[-\s]?\d{4}/', $content) ? 'YES' : 'NO') . "\n";
echo "Contains 'redirect': " . (stripos($content, 'redirect') !== false ? 'YES' : 'NO') . "\n";
echo "Contains 'location': " . (stripos($content, 'location') !== false ? 'YES' : 'NO') . "\n";
echo "Contains 'script': " . (stripos($content, '<script') !== false ? 'YES' : 'NO') . "\n";

echo "\n--- First 1000 chars ---\n";
echo substr($content, 0, 1000) . "\n";