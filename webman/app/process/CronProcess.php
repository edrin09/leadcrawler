<?php

namespace app\process;

use app\common\service\CronService;
use Workerman\Timer;
use Workerman\Worker;

/**
 * 秒级计划任务进程
 */
class CronProcess
{
    /**
     * 进程启动时执行
     */
    public function onWorkerStart(Worker $worker)
    {
        // 初始化CronService
        $cronService = new CronService();

        // 循环执行任务调度（每秒执行一次）
        $worker->timer = Timer::add(1, function () use ($cronService) {
            $cronService->schedule();
        });
    }
}