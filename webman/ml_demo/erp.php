<?php

/**
 * ERP系统机器学习应用演示
 */

require_once __DIR__ . '/vendor/autoload.php';

use app\common\service\ml\DemandForecasting;
use app\common\service\ml\InventoryOptimization;

echo "=== ERP系统机器学习应用演示 ===\n\n";

// 1. 需求预测系统演示
echo "1. 需求预测系统演示\n";
echo "------------------------------------\n";

// 创建需求预测实例
$demandForecaster = new DemandForecasting();

// 模拟历史销售数据
// 格式: [月份, 促销活动(0/1), 价格, 竞争对手价格, 季节性指数, 实际需求量]
$historicalSalesData = [
    [1, 0, 199, 209, 0.8, 800],
    [2, 0, 199, 209, 0.7, 700],
    [3, 1, 179, 209, 0.9, 1200],
    [4, 0, 199, 199, 1.0, 1000],
    [5, 0, 199, 199, 1.1, 1100],
    [6, 1, 169, 199, 1.2, 1500],
    [7, 0, 199, 189, 1.3, 1400],
    [8, 0, 199, 189, 1.2, 1300],
    [9, 1, 179, 189, 1.1, 1600],
    [10, 0, 199, 199, 1.0, 1200],
    [11, 0, 199, 199, 1.2, 1400],
    [12, 1, 159, 199, 1.5, 2000],
];

// 训练需求预测模型
$demandForecaster->trainForecastModel($historicalSalesData);

// 预测未来月份的需求量
$futureMonths = [
    [1, 0, 199, 209, 0.8], // 1月，无促销，价格199，竞争对手209，季节性指数0.8
    [2, 1, 179, 209, 0.7], // 2月，有促销，价格179，竞争对手209，季节性指数0.7
    [3, 0, 199, 199, 0.9], // 3月，无促销，价格199，竞争对手199，季节性指数0.9
];

foreach ($futureMonths as $i => $month) {
    $forecast = $demandForecaster->forecastDemand($month);
    echo "第" . ($i + 1) . "个月预测需求量: " . round($forecast) . "\n";
}

echo "\n";

// 2. 库存优化系统演示
echo "2. 库存优化系统演示\n";
echo "------------------------------------\n";

// 创建库存优化实例
$inventoryOptimizer = new InventoryOptimization();

// 设置成本系数
$inventoryOptimizer->setCostCoefficients(0.2, 2.0);

// 模拟产品数据：[产品ID, [销售量, 库存成本, 缺货成本, 需求波动率]]
$productData = [
    [1, [1000, 10, 100, 0.2]],
    [2, [800, 8, 80, 0.15]],
    [3, [2000, 5, 50, 0.1]],
    [4, [1500, 6, 60, 0.12]],
    [5, [500, 15, 150, 0.25]],
    [6, [400, 20, 200, 0.3]],
    [7, [3000, 4, 40, 0.08]],
    [8, [1200, 7, 70, 0.18]],
];

// 训练库存优化模型
$inventoryOptimizer->trainOptimizationModel($productData);

// 计算每个产品的最优库存水平
foreach ($productData as $product) {
    list($productId, $features) = $product;
    $category = $inventoryOptimizer->getInventoryCategory($features);
    $optimalLevel = $inventoryOptimizer->calculateOptimalInventoryLevel($features, $category);
    
    echo "产品 {$productId}: 库存类别 {$category}, 最优库存水平 " . round($optimalLevel) . "\n";
}

echo "\n";

// 批量优化演示
$batchResults = [];
foreach ($productData as $product) {
    $result = $inventoryOptimizer->optimizeProductInventory($product);
    $batchResults[$product[0]] = $result;
}

echo "批量优化结果:\n";
foreach ($batchResults as $productId => $result) {
    echo "产品 {$productId}: 最优库存 " . $result[0] . ", 类别 " . $result[1] . "\n";
}

echo "\n演示完成！\n";