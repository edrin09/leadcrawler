<?php

namespace app\api\middleware;

use app\common\service\log\SaveLogsService;
use Webman\Http\Request;

class ApiBefore
{
    public function process(Request $request, callable $next)
    {
        // 生成 trace_id
        $traceId = bin2hex(random_bytes(5));
        $request->trace_id = $traceId;

        $SaveLogsService = new SaveLogsService();
        // 设置日志表名
        $SaveLogsService->setLogTableName('ed_api_logs_');
        // 2. 获取请求内容
        $SaveLogsService->saveRequestLog($traceId);

        return $next($request);
    }
}
