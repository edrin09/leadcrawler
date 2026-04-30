<?php

namespace app\common\service\ml;

use app\common\service\ml\common\MLBase;
use Rubix\ML\Clusterers\KMeans;
use Rubix\ML\Pipeline;
use Rubix\ML\Transformers\ZScaleStandardizer;

/**
 * 库存优化系统
 * 基于销售数据和库存成本优化库存水平
 */
class InventoryOptimization extends MLBase
{
    /**
     * @var float 库存持有成本系数
     */
    protected $holdingCostCoefficient = 0.2;
    
    /**
     * @var float 缺货成本系数
     */
    protected $stockoutCostCoefficient = 2.0;
    
    /**
     * 构造函数
     */
    public function __construct()
    {
        $this->modelName = 'InventoryOptimization';
        
        // 构建机器学习管道
        $this->pipeline = new Pipeline([
            new ZScaleStandardizer(), // 标准化数值特征
        ], new KMeans(4)); // K-Means聚类器，将产品分成4个库存管理类别
    }
    
    /**
     * 设置成本系数
     * 
     * @param float $holdingCost 库存持有成本系数
     * @param float $stockoutCost 缺货成本系数
     */
    public function setCostCoefficients($holdingCost, $stockoutCost)
    {
        $this->holdingCostCoefficient = $holdingCost;
        $this->stockoutCostCoefficient = $stockoutCost;
    }
    
    /**
     * 训练库存优化模型
     * 
     * @param array $productData 产品数据 [产品ID, [销售量, 库存成本, 缺货成本, 需求波动率]]
     * @return bool 训练是否成功
     */
    public function trainOptimizationModel(array $productData)
    {
        // 准备训练数据
        $samples = [];
        foreach ($productData as $product) {
            $samples[] = $product[1];
        }
        
        return $this->train($samples);
    }
    
    /**
     * 获取产品的库存管理类别
     * 
     * @param array $productFeatures 产品特征
     * @return int 库存管理类别
     */
    public function getInventoryCategory(array $productFeatures)
    {
        $result = $this->predict([$productFeatures]);
        return $result[0] ?? 0;
    }
    
    /**
     * 计算最优库存水平
     * 
     * @param array $productData 产品数据
     * @param int $category 库存管理类别
     * @return float 最优库存水平
     */
    public function calculateOptimalInventoryLevel(array $productData, $category)
    {
        list($sales, $holdingCost, $stockoutCost, $volatility) = $productData;
        
        // 基于库存管理类别和ABC分类法计算最优库存
        $categoryMultipliers = [0.8, 1.0, 1.5, 2.0]; // 不同类别的安全库存乘数
        $multiplier = $categoryMultipliers[$category] ?? 1.0;
        
        // 计算经济订货量(EOQ)的简化版本
        $optimalLevel = $sales * $multiplier * (1 + $volatility) + $this->holdingCostCoefficient * $holdingCost;
        
        return max(0, round($optimalLevel));
    }
    
    /**
     * 优化产品库存
     * 
     * @param array $productData 产品数据
     * @return array 优化结果 [最优库存水平, 库存管理类别]
     */
    public function optimizeProductInventory(array $productData)
    {
        $features = $productData[1];
        $category = $this->getInventoryCategory($features);
        $optimalLevel = $this->calculateOptimalInventoryLevel($features, $category);
        
        return [$optimalLevel, $category];
    }
}