<?php

namespace app\common\service;

use app\common\model\system\SystemCronJob;
use app\common\model\system\SystemCronLog;
use Exception;


/**
 * 秒级计划任务服务
 */
class CronService
{
    /**
     * 执行任务调度
     */
    public function schedule()
    {
        $now = time();

        // 查询需要执行的任务
        $jobs = SystemCronJob::where('status', 1)->where('next_run_time', '<=', $now)->select();
        foreach ($jobs as $job) {
            // 异步执行任务
            $this->executeJob($job, $now);
        }
    }

    /**
     * 执行单个任务
     */
    public function executeJob($job, $startTime)
    {
        $log['job_id'] = $job['id'];
        $log['job_name'] = $job['name'];
        $log['start_time'] = date('Y-m-d H:i:s', $startTime);
        $log['end_time'] = date('Y-m-d H:i:s', $startTime);
        $log['status'] = 1;

        $log_id = SystemCronLog::insertGetId($log);

        // 更新任务信息
        $job->last_run_time = $startTime;
        $job->next_run_time = $this->calculateNextRunTime($job['expression'], $startTime);

        try {
            // 执行任务
            $output = $this->runCommand($job);
            $error = '';
            $status = 1;
            $job->run_count++;

        } catch (Exception $e) {
            $output = '';
            $error = $e->getMessage();
            $status = 0;
            $job->error_count++;
        }

        $job->save();

        // 更新日志
        $endTime = time();
        SystemCronLog::where('id', $log_id)->update([
            'end_time' => date('Y-m-d H:i:s', $endTime),
            'duration' => round(($endTime - $startTime), 3),
            'output' => $output,
            'error' => $error,
            'status' => $status,
        ]);
    }

    /**
     * 计算下次执行时间
     */
    public function calculateNextRunTime($expression, $currentTime = null)
    {
        $currentTime = $currentTime ?: time();

        // 秒级cron表达式解析：* * * * * * （秒 分 时 日 月 周）
        $parts = explode(' ', $expression);
        if (count($parts) != 6) {
            return $currentTime + 60; // 默认1分钟后执行
        }

        list($secondPart, $minutePart, $hourPart, $dayPart, $monthPart, $weekPart) = $parts;

        // 解析各个时间部分
        $second = $this->parseCronPart($secondPart, 0, 59);
        $minute = $this->parseCronPart($minutePart, 0, 59);
        $hour = $this->parseCronPart($hourPart, 0, 23);
        $day = $this->parseCronPart($dayPart, 1, 31);
        $month = $this->parseCronPart($monthPart, 1, 12);
        $week = $this->parseCronPart($weekPart, 0, 6);

        // 从当前时间开始，寻找下一个匹配的时间
        $nextTime = $currentTime + 1; // 至少1秒后

        while (true) {
            $timeInfo = getdate($nextTime);

            // 检查各时间部分是否匹配
            if (in_array($timeInfo['seconds'], $second) &&
                in_array($timeInfo['minutes'], $minute) &&
                in_array($timeInfo['hours'], $hour) &&
                in_array($timeInfo['mday'], $day) &&
                in_array($timeInfo['mon'], $month) &&
                in_array($timeInfo['wday'], $week)) {
                return $nextTime;
            }

            // 最多查找10000次，避免死循环
            if ($nextTime - $currentTime > 10000) {
                break;
            }

            $nextTime++;
        }

        // 如果没有找到匹配时间，默认1分钟后执行
        return $currentTime + 60;
    }

    /**
     * 解析cron表达式部分
     */
    private function parseCronPart($part, $min, $max)
    {
        $result = [];

        if ($part == '*') {
            // 所有值
            for ($i = $min; $i <= $max; $i++) {
                $result[] = $i;
            }
        } elseif (strpos($part, '-') !== false) {
            // 范围值
            list($start, $end) = explode('-', $part);
            $start = (int)$start;
            $end = (int)$end;
            for ($i = $start; $i <= $end; $i++) {
                $result[] = $i;
            }
        } elseif (strpos($part, '/') !== false) {
            // 步长值
            list($range, $step) = explode('/', $part);
            $step = (int)$step;

            if ($range == '*') {
                for ($i = $min; $i <= $max; $i += $step) {
                    $result[] = $i;
                }
            } else {
                list($start, $end) = explode('-', $range);
                $start = (int)$start;
                $end = (int)$end;
                for ($i = $start; $i <= $end; $i += $step) {
                    $result[] = $i;
                }
            }
        } elseif (strpos($part, ',') !== false) {
            // 列表值
            $values = explode(',', $part);
            foreach ($values as $value) {
                $result[] = (int)$value;
            }
        } else {
            // 单个值
            $result[] = (int)$part;
        }

        // 去重并排序
        $result = array_unique($result);
        sort($result);

        // 过滤不在范围内的值
        return array_filter($result, function ($val) use ($min, $max) {
            return $val >= $min && $val <= $max;
        });
    }

    /**
     * 执行具体的命令
     */
    private function runCommand($info)
    {
        $command = $info->command;

        switch ($info->type) {
            case 1: // PHP脚本
                ob_start();
                include BASE_PATH . '/' . $command;
                $output = ob_get_clean();
                break;

            case 2: // 命令行
                $output = shell_exec($command);
                break;

            case 3: // HTTP请求
                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, $command);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_TIMEOUT, 30);
                $output = curl_exec($ch);
                curl_close($ch);
                break;

            default:
                throw new Exception("Unsupported job type: " . $info->type);
        }

        return $output;
    }
}