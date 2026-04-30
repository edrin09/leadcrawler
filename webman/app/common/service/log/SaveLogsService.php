<?php

namespace app\common\service\log;

use support\Log;
use support\think\Db;

class SaveLogsService
{
    public static $logsTableName;

    private static $createdTables = [];

    public static function setLogTableName(string $tableName): void
    {
        self::$logsTableName = $tableName;
    }

    public function saveRequestLog($request_trace_id)
    {
        $request_route = request()->path();
        $request_method = request()->method();
        $request_ip = request()->getRealIp();
        $request_params = json_encode(request()->all(), JSON_UNESCAPED_UNICODE);

        $log_type = env('LOG_TYPE', 'file');

        switch ($log_type) {
            case 'file':
                $this->saveRequestRumTimeLog($request_trace_id, $request_route, $request_method, $request_ip, $request_params);
                break;
            case 'sql':
                $this->saveRequestSqlLog($request_trace_id, $request_route, $request_method, $request_ip, $request_params);
                break;
            default:
                Log::error('未知的日志类型: ' . $log_type);
                break;
        }
    }

    /**保存请求文件日志*/
    private function saveRequestRumTimeLog($request_trace_id, $request_route, $request_method, $request_ip, $request_params)
    {
        // 4. 记录日志
        Log::channel('api')->info("**************************************");
        Log::channel('api')->info('[请求路由][' . $request_trace_id . '] ' . $request_route);
        Log::channel('api')->info('[请求方法][' . $request_trace_id . '] ' . $request_method);
        Log::channel('api')->info('[请求IP][' . $request_trace_id . '] ' . $request_ip);
        Log::channel('api')->info('[请求参数][' . $request_trace_id . '] ' . $request_params);

        return true;
    }

    /**保存请求SQL日志*/
    private function saveRequestSqlLog($request_trace_id, $request_route, $request_method, $request_ip, $request_params)
    {
        // 动态生成表名（按月分表）
        $log_table_name = $this->getLogTableName();
        // 确保日志表存在
        $this->ensureLogTableExists($log_table_name);

        // 准备插入数据
        $logData['request_trace_id'] = $request_trace_id;
        $logData['request_route'] = $request_route;
        $logData['request_method'] = $request_method;
        $logData['request_ip'] = $request_ip;
        $logData['request_params'] = $request_params;
//        $logData['response_code'] = $response_code;
//        $logData['response_content'] = $response_content;
        $logData['created_at'] = date('Y-m-d H:i:s');

        // 插入数据库
        Db::table($log_table_name)->insert($logData);

        return true;
    }

    /**
     * 获取日志表名（按月分表）
     */
    private function getLogTableName(): string
    {
        return self::$logsTableName . date('Y_m');
    }

    /**
     * 确保日志表存在
     */
    private function ensureLogTableExists(string $tableName): void
    {
        // 如果表已创建，直接返回
        if (in_array($tableName, self::$createdTables)) {
            return;
        }

        // 检查表是否存在
        $tableExists = Db::query("SHOW TABLES LIKE '{$tableName}'");

        if (empty($tableExists)) {
            // 创建表
            $this->createLogTable($tableName);
        }

        // 缓存已创建的表名
        self::$createdTables[] = $tableName;
    }

    /**
     * 创建日志表
     */
    private function createLogTable(string $tableName): void
    {
        $sql = <<<SQL
CREATE TABLE IF NOT EXISTS `{$tableName}` (
    `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `request_trace_id` varchar(255) NOT NULL DEFAULT '' COMMENT '请求ID',
    `request_route` varchar(255) NOT NULL DEFAULT '' COMMENT '请求路由',
    `request_method` varchar(10) NOT NULL DEFAULT '' COMMENT '请求方法',
    `request_ip` varchar(45) NOT NULL DEFAULT '' COMMENT '请求IP',
    `request_params` text COMMENT '请求参数',
    `response_code` int(11) NOT NULL DEFAULT 0 COMMENT '响应状态码',
    `response_content` text COMMENT '响应内容',
    `created_at` datetime DEFAULT NULL COMMENT '创建时间',
    PRIMARY KEY (`id`),
    KEY `idx_route` (`request_route`),
    KEY `idx_trace` (`request_trace_id`),
    KEY `idx_method` (`request_method`),
    KEY `idx_ip` (`request_ip`),
    KEY `idx_status` (`response_code`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COMMENT='访问日志表';
SQL;

        Db::execute($sql);
    }

    public function saveResponseLog($request_trace_id, $response_code, $response_content)
    {
        $log_type = env('LOG_TYPE', 'file');

        switch ($log_type) {
            case 'file':
                $this->saveResponseRumTimeLog($request_trace_id, $response_code, $response_content);
                break;
            case 'sql':
                $this->saveResponseDatabaseLog($request_trace_id, $response_code, $response_content);
                break;
            default:
                Log::error('未知的日志类型: ' . $log_type);
                break;
        }
    }

    /**保存返回文件日志*/
    private function saveResponseRumTimeLog($request_trace_id, $response_code, $response_content)
    {
        Log::channel('api')->info('[响应状态码][' . $request_trace_id . '] ' . $response_code);
        Log::channel('api')->info('[响应内容][' . $request_trace_id . '] ' . $response_content);
        Log::channel('api')->info("**************************************");

        return true;
    }


    /**保存返回数据库日志*/
    private function saveResponseDatabaseLog($request_trace_id, $response_code, $response_content)
    {
        // 动态生成表名（按月分表）
        $tableName = $this->getLogTableName();

        $update_data['response_code'] = $response_code;
        $update_data['response_content'] = $response_content;
        $update_data['created_at'] = date('Y-m-d H:i:s');

        Db::table($tableName)->where('request_trace_id', $request_trace_id)->update($update_data);
        return true;
    }
}