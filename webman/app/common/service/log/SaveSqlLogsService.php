<?php

namespace app\common\service\log;

use support\think\Db;

class SaveSqlLogsService
{
    public static $sqlLogsTableName;

    private static $createdTables = [];

    public static function setSqlLogTableName(string $tableName): void
    {
        self::$sqlLogsTableName = $tableName;
    }

    public function saveLogSql($request_trace_id, $sql, $time)
    {
        // 动态生成表名（按月分表）
        $log_table_name = $this->getSqlLogTableName();
        // 确保日志表存在
        $this->ensureLogSqlTableExists($log_table_name);

        // 准备插入数据
        $logData['request_trace_id'] = $request_trace_id;
        $logData['sql'] = $sql;
        $logData['time'] = $time;
        $logData['created_at'] = date('Y-m-d H:i:s');

        // 插入数据库
        Db::table($log_table_name)->insert($logData);

        return true;
    }

    /**
     * 获取SQL日志表名（按月分表）
     */
    private function getSqlLogTableName(): string
    {
        return self::$sqlLogsTableName . date('Y_m');
    }

    /**
     * 确保日志表存在
     */
    private function ensureLogSqlTableExists(string $tableName): void
    {
        // 如果表已创建，直接返回
        if (in_array($tableName, self::$createdTables)) {
            return;
        }

        // 检查表是否存在
        $tableExists = Db::query("SHOW TABLES LIKE '{$tableName}'");
        if (empty($tableExists)) {
            // 创建表
            $this->createLogSqlTable($tableName);
        }

        // 缓存已创建的表名
        self::$createdTables[] = $tableName;
    }

    /**
     * 创建日志sql表
     */
    private function createLogSqlTable(string $tableName): void
    {
        $sql = <<<SQL
CREATE TABLE IF NOT EXISTS `{$tableName}` (
    `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `request_trace_id` varchar(255) NOT NULL DEFAULT '' COMMENT '请求ID',
    `sql` longtext COMMENT 'SQL语句',
    `time` varchar(20) COMMENT '执行时间（毫秒）',
    `created_at` datetime DEFAULT NULL COMMENT '创建时间',
    PRIMARY KEY (`id`),
    KEY `idx_trace` (`request_trace_id`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COMMENT='访问日志sql表';
SQL;

        Db::execute($sql);
    }
}