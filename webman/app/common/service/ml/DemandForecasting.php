<?php

namespace app\common\service\ml;

use app\common\service\ml\common\MLBase;
use Rubix\ML\Pipeline;
use Rubix\ML\Regressors\Ridge;
use Rubix\ML\Transformers\ZScaleStandardizer;

/**
 * 需求预测系统
 * 预测产品的未来需求量
 */
class DemandForecasting extends MLBase
{
    /**
     * 构造函数
     */
    public function __construct()
    {
        $this->modelName = 'DemandForecasting';
        
        // 构建机器学习管道
        $this->pipeline = new Pipeline([
            new ZScaleStandardizer(), // 标准化数值特征
        ], new Ridge()); // 岭回归预测器
    }
    
    /**
     * 训练需求预测模型
     * 
     * @param array $historicalData 历史销售数据
     *                              格式: [[特征1, 特征2, ...], [需求1], [需求2], ...]
     * @return bool 训练是否成功
     */
    public function trainForecastModel(array $historicalData)
    {
        // 分离特征和标签
        $samples = [];
        $labels = [];
        
        foreach ($historicalData as $data) {
            $samples[] = array_slice($data, 0, -1); // 特征
            $labels[] = end($data); // 需求（最后一个元素）
        }
        
        return $this->train($samples, $labels);
    }
    
    /**
     * 预测单个产品的需求量
     * 
     * @param array $features 产品特征
     * @return float 预测的需求量
     */
    public function forecastDemand(array $features)
    {
        $result = $this->predict([$features]);
        return $result[0] ?? 0;
    }
    
    /**
     * 批量预测产品需求量
     * 
     * @param array $featuresList 产品特征列表
     * @return array 预测的需求量列表
     */
    public function batchForecastDemand(array $featuresList)
    {
        return $this->predict($featuresList);
    }
    
    /**
     * 预测未来时间段的需求量
     * 
     * @param array $futureFeatures 未来时间段的特征列表
     * @return array 未来时间段的需求量预测
     */
    public function forecastFutureDemand(array $futureFeatures)
    {
        return $this->predict($futureFeatures);
    }
}