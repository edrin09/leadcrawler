<?php

namespace app\common\service\ml;

use app\common\service\ml\common\MLBase;
use Rubix\ML\Classifiers\ClassificationTree;
use Rubix\ML\Datasets\Labeled;
use Rubix\ML\Pipeline;
use Rubix\ML\Transformers\OneHotEncoder;
use Rubix\ML\Transformers\ZScaleStandardizer;

/**
 * 客户购买意向预测
 * 预测客户是否会购买特定商品
 */
class CustomerPurchaseIntent extends MLBase
{
    /**
     * 构造函数
     */
    public function __construct()
    {
        $this->modelName = 'CustomerPurchaseIntent';
        
        // 构建机器学习管道
        $this->pipeline = new Pipeline([
            new ZScaleStandardizer(), // 标准化数值特征
            new OneHotEncoder(), // 将类别特征转换为独热编码
        ], new ClassificationTree()); // 决策树分类器
    }
    
    /**
     * 训练模型
     * 
     * @param array $samples 样本数据
     * @param ?array $labels 标签数据
     * @return bool 训练是否成功
     */
    public function train(array $samples, ?array $labels = null)
    {
        try {
            if ($labels === null) {
                throw new \InvalidArgumentException('分类任务需要标签数据');
            }
            
            // 确保标签是字符串类型的类别
            $stringLabels = array_map('strval', $labels);
            
            $dataset = Labeled::build($samples, $stringLabels);
            $this->pipeline->train($dataset);
            $this->trained = true;
            
            return true;
        } catch (\Exception $e) {
            $this->logError('训练模型失败: ' . $e->getMessage());
            return false;
        }
    }
    
    /**
     * 预测客户购买意向
     * 
     * @param array $customerData 客户数据
     * @return array 购买意向预测结果 (0: 不购买, 1: 购买)
     */
    public function predictIntent(array $customerData)
    {
        $result = $this->predict([$customerData]);
        // 将预测结果转换回整数
        return array_map('intval', $result);
    }
    
    /**
     * 批量预测客户购买意向
     * 
     * @param array $customersData 客户数据列表
     * @return array 购买意向预测结果列表
     */
    public function batchPredictIntent(array $customersData)
    {
        $result = $this->predict($customersData);
        // 将预测结果转换回整数
        return array_map('intval', $result);
    }
}