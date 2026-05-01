<?php
$url = 'http://127.0.0.1:8787/h5';
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

echo "HTTP Code: $httpCode\n";
if ($error) {
    echo "Error: $error\n";
} else {
    echo "Response (first 500 chars):\n";
    echo substr($response, 0, 500) . "\n";
}
?>