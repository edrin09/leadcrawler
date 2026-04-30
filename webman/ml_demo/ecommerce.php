<?php

/**
 * 电商领域机器学习应用演示
 */

require_once __DIR__ . '/vendor/autoload.php';

use app\common\service\ml\CustomerPurchaseIntent;
use app\common\service\ml\ProductRecommendation;

echo "=== 电商领域机器学习应用演示 ===\n\n";

// 1. 客户购买意向预测演示
echo "1. 客户购买意向预测演示\n";
echo "------------------------------------\n";

// 创建客户购买意向预测实例
$intentPredictor = new CustomerPurchaseIntent();

// 模拟训练数据：[年龄, 性别, 月收入, 浏览次数, 购物车停留时间, 购买历史] -> 购买意向(0/1)
$trainingData = [
    [25, 1, 50000, 10, 30, 1],
    [30, 0, 70000, 15, 45, 1],
    [22, 1, 35000, 5, 10, 0],
    [40, 0, 90000, 20, 60, 1],
    [28, 1, 45000, 8, 20, 0],
    [35, 0, 80000, 18, 50, 1],
    [24, 1, 40000, 6, 15, 0],
    [38, 0, 85000, 22, 55, 1],
];

// 分离特征和标签
$samples = [];
$labels = [];
foreach ($trainingData as $data) {
    $samples[] = array_slice($data, 0, -1);
    $labels[] = end($data);
}

// 训练模型
$intentPredictor->train($samples, $labels);

// 测试预测
$testCustomers = [
    [33, 1, 72000, 12, 35], // 33岁，男性，月收入72000，浏览12次，购物车停留35秒
    [27, 0, 45000, 7, 18],  // 27岁，女性，月收入45000，浏览7次，购物车停留18秒
];

foreach ($testCustomers as $i => $customer) {
    $prediction = $intentPredictor->predictIntent($customer);
    $result = $prediction[0] ? "购买" : "不购买";
    echo "客户" . ($i + 1) . " 购买意向预测: {$result}\n";
}

echo "\n";

// 2. 商品推荐系统演示
echo "2. 商品推荐系统演示\n";
echo "------------------------------------\n";

// 创建商品推荐实例
$recommender = new ProductRecommendation();

// 模拟商品数据：[商品ID, [价格, 类别, 评分, 销量, 库存]]
$products = [
    [1, [199, 1, 4.5, 1000, 500]],
    [2, [299, 1, 4.2, 800, 400]],
    [3, [99, 2, 3.8, 2000, 1000]],
    [4, [149, 2, 4.0, 1500, 800]],
    [5, [399, 3, 4.8, 500, 300]],
    [6, [499, 3, 4.7, 400, 200]],
    [7, [79, 2, 3.5, 3000, 1500]],
    [8, [129, 1, 4.1, 1200, 600]],
    [9, [249, 3, 4.4, 600, 350]],
    [10, [179, 1, 4.3, 900, 450]],
];

// 设置商品数据
$recommender->setProducts($products);

// 模拟用户购买历史：[用户ID, [购买的商品ID列表]]
$userPurchaseHistory = [
    1 => [1, 3, 8],
    2 => [5, 6, 9],
    3 => [2, 4, 10],
    4 => [7, 3, 4],
];

// 训练推荐模型
$recommender->trainRecommendationModel($userPurchaseHistory);

// 为用户推荐商品
$userId = 1;
$recommendations = $recommender->recommendProducts($userId, $userPurchaseHistory, 3);

echo "为用户 {$userId} 推荐的商品ID: " . implode(', ', $recommendations) . "\n";

echo "\n演示完成！\n";