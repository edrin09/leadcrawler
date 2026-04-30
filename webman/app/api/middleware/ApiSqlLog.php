<?php

declare(strict_types=1);

namespace app\api\middleware;

use app\common\service\log\SaveSqlLogsService;
use support\think\Db;
use Webman\Http\Request;
use Webman\Http\Response;
use Webman\MiddlewareInterface;

class ApiSqlLog implements MiddlewareInterface
{
    public function process(Request $request, callable $handler): Response
    {
        // 存储SQL日志的数组
        $sqlLogs = [];
        $table_name = 'ed_api_logs_sql_';

        // 获取SQL日志过滤配置
        $sqlLogFilter = config('app.sql_log_filter');
        
        // 监听SQL执行
        Db::listen(function ($sql, $time, $connection) use (&$sqlLogs, $request, $sqlLogFilter) {
            // 转换SQL为小写以便进行不区分大小写的匹配
            $sqlLower = strtolower($sql);
            
            // 1. 过滤指定的SQL命令
            if (isset($sqlLogFilter['exclude_commands']) && is_array($sqlLogFilter['exclude_commands'])) {
                foreach ($sqlLogFilter['exclude_commands'] as $command) {
                    if (strpos($sqlLower, strtolower($command)) === 0) {
                        return;
                    }
                }
            }
            
            // 2. 过滤指定的表名
            if (isset($sqlLogFilter['exclude_tables']) && is_array($sqlLogFilter['exclude_tables'])) {
                foreach ($sqlLogFilter['exclude_tables'] as $table) {
                    if (strpos($sql, $table) !== false) {
                        return;
                    }
                }
            }

            // 记录SQL日志
            $sqlLogs[] = [
                'sql' => $sql,
                'time' => $time,
                'connection' => $connection
            ];
        });
        
        // 处理请求
        $response = $handler($request);
        
        // 保存SQL日志到数据库
        if ($sqlLogs) {
            $saveSqlLogsService = new SaveSqlLogsService();
            // 设置SQL日志表名
            $saveSqlLogsService->setSqlLogTableName($table_name);

            foreach ($sqlLogs as $log) {
                $saveSqlLogsService->saveLogSql(
                    $request->trace_id,
                    $log['sql'],
                    $log['time']
                );
            }
        }
        
        return $response;
    }
}