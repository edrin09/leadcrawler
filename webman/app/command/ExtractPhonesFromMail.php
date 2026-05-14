<?php

use app\common\model\business\MallPhone;
use app\common\model\business\MallData;
use app\common\service\PhoneExtractorService;
use support\Log;

///**
// * 计划任务：从 mall_data 表中提取电话号码
// *
// * 执行频率：建议每5分钟执行一次（cron表达式：0 */5 * * * *）
// * 每次处理：20条未处理的记录
// *
// * 在计划任务管理中添加此任务：
// * 任务名称：邮件数据电话提取
// * 任务类型：PHP脚本
// * 执行命令：app/command/ExtractPhonesFromMail.php
// * cron表达式：0 */5 * * * *
// */

set_time_limit(120);

$batchSize = 20;
$processedCount = 0;
$phoneCount = 0;
$errorCount = 0;
$errors = [];

Log::info('[PhoneExtract] 计划任务开始执行', ['time' => date('Y-m-d H:i:s')]);

try {
    $records = MallData::where('is_processed', 0)
        ->where('status', 1)
        ->order('id', 'asc')
        ->limit($batchSize)
        ->select();

    if ($records->isEmpty()) {
        Log::info('[PhoneExtract] 没有待处理的记录');
        echo "没有待处理的记录\n";
        return;
    }

    Log::info('[PhoneExtract] 获取到待处理记录', ['count' => $records->count()]);

    $extractor = new PhoneExtractorService();

    foreach ($records as $record) {
        try {
            $content = $record->content ?? '';
            $title = $record->title ?? '';

            if (empty($content) && empty($title)) {
                $record->is_processed = 1;
                $record->save();
                $processedCount++;
                continue;
            }

            $text = $title . ' ' . strip_tags($content);

            $phones = $extractor->extractPhonesFromText($text);

            if (!empty($phones)) {
                foreach ($phones as $phone) {
                    try {
                        $exists = MallPhone::where('phone', $phone)->find();
                        if (!$exists) {
                            MallPhone::create([
                                'phone' => $phone,
                                'source' => 'mail_data',
                                'source_id' => $record->id,
                                'status' => 1,
                            ]);
                            $phoneCount++;
                            Log::info('[PhoneExtract] 新增电话号码', [
                                'phone' => $phone,
                                'source_id' => $record->id,
                            ]);
                        }
                    } catch (Exception $e) {
                        if (strpos($e->getMessage(), 'Duplicate entry') === false) {
                            $errors[] = "保存电话 {$phone} 失败: " . $e->getMessage();
                            $errorCount++;
                        }
                    }
                }
            }

            $record->is_processed = 1;
            $record->save();
            $processedCount++;

        } catch (Exception $e) {
            $errors[] = "处理记录 ID={$record->id} 失败: " . $e->getMessage();
            $errorCount++;
            Log::error('[PhoneExtract] 处理记录失败', [
                'record_id' => $record->id,
                'error' => $e->getMessage(),
            ]);

            try {
                $record->is_processed = 1;
                $record->save();
                $processedCount++;
            } catch (Exception $saveEx) {
                Log::error('[PhoneExtract] 标记已处理失败', [
                    'record_id' => $record->id,
                    'error' => $saveEx->getMessage(),
                ]);
            }
        }
    }

} catch (Exception $e) {
    Log::error('[PhoneExtract] 计划任务执行异常', ['error' => $e->getMessage()]);
    echo "执行异常: " . $e->getMessage() . "\n";
    $errorCount++;
}

$summary = [
    'processed' => $processedCount,
    'phones_extracted' => $phoneCount,
    'errors' => $errorCount,
    'time' => date('Y-m-d H:i:s'),
];

Log::info('[PhoneExtract] 计划任务执行完成', $summary);

echo "处理完成: 处理记录 {$processedCount} 条, 提取电话 {$phoneCount} 个, 错误 {$errorCount} 个\n";

if (!empty($errors)) {
    echo "错误详情:\n";
    foreach ($errors as $err) {
        echo "  - {$err}\n";
    }
}