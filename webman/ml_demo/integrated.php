<?php

/**
 * 混合系统机器学习应用演示
 * 展示电商与ERP系统的机器学习功能整合
 */

require_once __DIR__ . '/vendor/autoload.php';

// 电商系统相关类
use app\common\service\ml\CustomerPurchaseIntent;
use app\common\service\ml\DemandForecasting;
use app\common\service\ml\InventoryOptimization;
use app\common\service\ml\ProductRecommendation;

// ERP系统相关类

echo "=== 混合系统机器学习应用演示 ===\n\n";

// 1. 客户全生命周期管理演示
echo "1. 客户全生命周期管理演示\n";
echo "------------------------------------\n";

// 创建购买意向预测实例
$purchaseIntent = new CustomerPurchaseIntent();

// 模拟客户数据
$customerData = [
    // [浏览时长(秒), 浏览页面数, 加入购物车次数, 历史购买次数, 会员等级(0-5)]
    [300, 15, 2, 3, 2],  // 客户1: 高活跃度
    [60, 5, 0, 0, 0],    // 客户2: 低活跃度
    [180, 10, 1, 1, 1],  // 客户3: 中等活跃度
    [450, 20, 3, 5, 3],  // 客户4: 高价值客户
    [90, 8, 0, 1, 0],    // 客户5: 潜在客户
];

// 模拟购买标签 (1: 购买, 0: 不购买)
$purchaseLabels = [1, 0, 0, 1, 0];

// 训练模型
if ($purchaseIntent->train($customerData, $purchaseLabels)) {
    echo "购买意向预测模型训练成功\n";
    
    // 预测新客户购买意向
    $newCustomer = [350, 18, 2, 2, 1];  // 新客户数据
    $prediction = $purchaseIntent->predictIntent($newCustomer);
    
    echo "新客户购买意向预测: " . ($prediction[0] ? '购买' : '不购买') . "\n";
    
    // 为高意向客户提供产品推荐
    if ($prediction[0]) {
        $recommender = new ProductRecommendation();
        
        // 模拟客户-产品交互数据
        $interactionData = [
            [1, 1, 5], [1, 2, 4], [1, 4, 3], [1, 10, 5], [1, 15, 4],
            [2, 3, 4], [2, 5, 5], [2, 7, 3], [2, 12, 4], [2, 13, 5],
            [3, 2, 5], [3, 6, 4], [3, 8, 3], [3, 9, 4], [3, 14, 5],
            [4, 1, 4], [4, 3, 5], [4, 5, 4], [4, 11, 5], [4, 15, 4],
        ];
        
        // 训练推荐模型
        if ($recommender->train([], $interactionData)) {
            echo "产品推荐模型训练成功\n";
            
            // 为新客户推荐产品
            $recommendedProducts = $recommender->recommendForUser(999, 3);
            echo "推荐产品ID: " . implode(', ', $recommendedProducts) . "\n";
        }
    }
}

echo "\n";

// 2. 供应链与库存管理整合演示
echo "2. 供应链与库存管理整合演示\n";
echo "------------------------------------\n";

// 创建需求预测实例
$demandForecaster = new DemandForecasting();

// 模拟历史销售数据
$historicalSales = [
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
if ($demandForecaster->trainForecastModel($historicalSales)) {
    echo "需求预测模型训练成功\n";
    
    // 预测下季度需求
    $futureDemand = [
        [1, 0, 199, 209, 0.8],
        [2, 0, 199, 209, 0.7], 
        [3, 1, 179, 209, 0.9],
    ];
    
    $quarterlyDemand = 0;
    foreach ($futureDemand as $i => $month) {
        $forecast = $demandForecaster->forecastDemand($month);
        echo "第" . ($i + 1) . "个月预测需求量: " . round($forecast) . "\n";
        $quarterlyDemand += $forecast;
    }
    
    echo "季度总需求预测: " . round($quarterlyDemand) . "\n";
    
    // 使用需求预测结果进行库存优化
    $inventoryOptimizer = new InventoryOptimization();
    $inventoryOptimizer->setCostCoefficients(0.2, 2.0);
    
    // 模拟产品数据
    $productData = [
        [101, [$quarterlyDemand, 10, 100, 0.2]],
    ];
    
    if ($inventoryOptimizer->trainOptimizationModel($productData)) {
        echo "库存优化模型训练成功\n";
        
        // 计算最优库存
        $optimalLevel = $inventoryOptimizer->calculateOptimalInventoryLevel($productData[0][1], 2);
        echo "产品最优库存水平: " . round($optimalLevel) . "\n";
    }
}

echo "\n";

// 3. 营销与供应链协同演示
echo "3. 营销与供应链协同演示\n";
echo "------------------------------------\n";

// 创建购买意向和需求预测实例
$purchaseIntent2 = new CustomerPurchaseIntent();
$demandForecaster2 = new DemandForecasting();

// 模拟营销活动效果预测
$marketingData = [
    [1000, 5000, 0.2],  // [活动投入(元), 目标客户数, 预期转化率]
    [2000, 10000, 0.25], // [活动投入(元), 目标客户数, 预期转化率]
    [3000, 15000, 0.3],  // [活动投入(元), 目标客户数, 预期转化率]
];

echo "营销活动效果预测: " . PHP_EOL;
foreach ($marketingData as $i => $campaign) {
    list($cost, $targetCustomers, $conversionRate) = $campaign;
    
    // 计算预期新增销量
    $expectedSales = $targetCustomers * $conversionRate;
    $expectedRevenue = $expectedSales * 200; // 假设平均客单价200元
    $expectedProfit = $expectedRevenue - $cost;
    
    echo "活动" . ($i + 1) . ": 投入" . $cost . "元, 预期销量" . round($expectedSales) . ", 预期利润" . round($expectedProfit) . "元" . PHP_EOL;
}

echo "\n演示完成！\n";