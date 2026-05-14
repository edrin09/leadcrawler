<?php
require __DIR__ . '/vendor/autoload.php';

echo "=== PhoneExtractorService 修复验证 ===\n\n";

$service = new app\common\service\PhoneExtractorService();
$ref = new ReflectionClass($service);

// 测试 cleanPhone - 各种手机号格式
$method = $ref->getMethod('cleanPhone');
$method->setAccessible(true);

echo "1. cleanPhone 手机号测试:\n";
$mobileTests = [
    '13812345678' => true,
    '15900001111' => true,
    '18888888888' => true,
    '13612345678' => true,
    '12345678901' => false,
    '11234567890' => false,
    '13800000000' => false,
    '138-1234-5678' => true,
    '138 1234 5678' => true,
];
foreach ($mobileTests as $phone => $expected) {
    $result = $method->invoke($service, $phone);
    $status = ($result !== null) === $expected ? 'OK' : 'FAIL';
    echo "   $status: $phone => " . var_export($result, true) . "\n";
}

echo "\n2. cleanPhone 固话测试:\n";
$landlineTests = [
    '029-88886666' => true,
    '010-12345678' => true,
    '021-88886666' => true,
    '0755-12345678' => true,
    '02988886666' => true,
    '01012345678' => true,
    '400-123-4567' => false,
    '800-123-4567' => false,
];
foreach ($landlineTests as $phone => $expected) {
    $result = $method->invoke($service, $phone);
    $status = ($result !== null) === $expected ? 'OK' : 'FAIL';
    echo "   $status: $phone => " . var_export($result, true) . "\n";
}

echo "\n3. extractPhones 综合测试:\n";
$method = $ref->getMethod('extractPhones');
$method->setAccessible(true);
$text = '联系电话：13812345678，北京：010-88886666，上海：021-77776666，深圳：0755-66667777';
$phones = $method->invoke($service, $text);
echo "   输入: $text\n";
echo "   结果: " . json_encode($phones, JSON_UNESCAPED_UNICODE) . "\n";
echo "   预期: 4个电话\n";

echo "\n4. classifyPhoneType 测试:\n";
$method = $ref->getMethod('classifyPhoneType');
$method->setAccessible(true);
$typeTests = [
    '13812345678' => 'mobile',
    '02988886666' => 'local_landline',
    '01012345678' => 'landline',
    '075512345678' => 'landline',
    '4001234567' => 'hotline',
];
foreach ($typeTests as $phone => $expected) {
    $result = $method->invoke($service, $phone);
    $status = $result === $expected ? 'OK' : 'FAIL';
    echo "   $status: $phone => $result (expected: $expected)\n";
}

echo "\n=== 所有测试完成 ===\n";