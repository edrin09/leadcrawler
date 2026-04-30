<?php

namespace app\common\service\ml;

use app\common\service\ml\common\MLBase;
use Rubix\ML\Clusterers\KMeans;
use Rubix\ML\Pipeline;
use Rubix\ML\Transformers\ZScaleStandardizer;

/**
 * 商品推荐系统
 * 基于用户购买历史和商品特征进行推荐
 */
class ProductRecommendation extends MLBase
{
    /**
     * @var array 商品数据
     */
    protected $products;
    
    /**
     * 构造函数
     */
    public function __construct()
    {
        $this->modelName = 'ProductRecommendation';
        
        // 构建机器学习管道
        $this->pipeline = new Pipeline([
            new ZScaleStandardizer(), // 标准化特征
        ], new KMeans(5)); // K-Means聚类器，将商品分成5个簇
    }
    
    /**
     * 设置商品数据
     * 
     * @param array $products 商品数据 [id, [特征1, 特征2, ...]]
     */
    public function setProducts(array $products)
    {
        $this->products = $products;
    }
    
    /**
     * 训练推荐模型
     * 
     * @param array $userPurchaseHistory 用户购买历史 [用户ID, [商品ID列表]]
     * @return bool 训练是否成功
     */
    public function trainRecommendationModel(array $userPurchaseHistory)
    {
        // 准备训练数据
        $samples = [];
        foreach ($this->products as $product) {
            $samples[] = $product[1];
        }
        
        return $this->train($samples);
    }
    
    /**
     * 为用户推荐商品
     * 
     * @param int $userId 用户ID
     * @param array $userPurchaseHistory 用户购买历史
     * @param int $count 推荐数量
     * @return array 推荐的商品ID列表
     */
    public function recommendProducts($userId, array $userPurchaseHistory, $count = 5)
    {
        if (!$this->trained) {
            $this->logError('模型尚未训练');
            return [];
        }
        
        try {
            // 获取用户购买的商品
            $userPurchases = isset($userPurchaseHistory[$userId]) ? $userPurchaseHistory[$userId] : [];
            
            if (empty($userPurchases)) {
                // 如果用户没有购买历史，返回热门商品
                return $this->getPopularProducts($count);
            }
            
            // 预测每个商品的簇
            $productSamples = [];
            $productIds = [];
            
            foreach ($this->products as $product) {
                $productSamples[] = $product[1];
                $productIds[] = $product[0];
            }
            
            $predictions = $this->predict($productSamples);
            
            // 找出用户购买商品所在的簇
            $userCluster = [];
            foreach ($userPurchases as $productId) {
                $index = array_search($productId, $productIds);
                if ($index !== false) {
                    $userCluster[] = $predictions[$index];
                }
            }
            
            // 找到最常出现的簇
            $clusterCounts = array_count_values($userCluster);
            arsort($clusterCounts);
            $primaryCluster = key($clusterCounts);
            
            // 推荐同一簇中的其他商品
            $recommended = [];
            foreach ($predictions as $index => $cluster) {
                $productId = $productIds[$index];
                if ($cluster == $primaryCluster && !in_array($productId, $userPurchases)) {
                    $recommended[] = $productId;
                }
            }
            
            // 如果推荐不足，添加其他簇的商品
            if (count($recommended) < $count) {
                $otherProducts = array_diff($productIds, $userPurchases, $recommended);
                $recommended = array_merge($recommended, array_slice($otherProducts, 0, $count - count($recommended)));
            }
            
            return array_slice($recommended, 0, $count);
            
        } catch (\Exception $e) {
            $this->logError('推荐失败: ' . $e->getMessage());
            return [];
        }
    }
    
    /**
     * 获取热门商品
     * 
     * @param int $count 数量
     * @return array 热门商品ID列表
     */
    private function getPopularProducts($count = 5)
    {
        // 简单实现，返回前N个商品
        $productIds = array_column($this->products, 0);
        return array_slice($productIds, 0, $count);
    }
}