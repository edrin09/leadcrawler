<?php
declare(strict_types=1);

namespace app\admin\middleware;

use app\common\service\log\SaveLogsService;
use support\think\Db;
use Webman\Http\Request;
use Webman\Http\Response;
use Webman\MiddlewareInterface;

class AdminAfter implements MiddlewareInterface
{
    public function process(Request $request, callable $handler): Response
    {
        $table_name = 'ed_admin_logs_';
        // 关闭数据库连接
        Db::close();

        $response = $handler($request);

        //获取响应内容
        $response_code = $response->getStatusCode();
        $response_content = json_encode(json_decode($response->rawBody(), true), JSON_UNESCAPED_UNICODE);

        $SaveLogsService = new SaveLogsService();
        // 设置日志表名
        $SaveLogsService->setLogTableName($table_name);
        // 3. 保存响应内容
        $SaveLogsService->saveResponseLog($request->trace_id, $response_code, $response_content);

        return $response;
    }
}