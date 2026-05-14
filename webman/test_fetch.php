<?php
$url = 'https://xa.sydc.anjuke.com/sp-zu/d4571406501174282/';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language: zh-CN,zh;q=0.9,en;q=0.8',
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

$content = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

echo "HTTP Code: $httpCode\n";
echo "Error: " . ($error ?: 'none') . "\n";
echo "Content Length: " . strlen($content) . "\n";
echo "First 2000 chars:\n";
echo substr($content, 0, 2000) . "\n";
echo "\n--- Last 500 chars ---\n";
echo substr($content, -500) . "\n";

// Save full content
file_put_contents(__DIR__ . '/anjuke_page.html', $content);
echo "\nFull HTML saved to anjuke_page.html\n";