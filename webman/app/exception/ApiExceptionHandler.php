<?php

namespace app\exception;

use Next\VarDumper\Dumper;
use Next\VarDumper\DumperHandler;
use PDOException;
use support\exception\Handler;
use think\exception\ValidateException;
use Throwable;
use Webman\Http\Request;
use Webman\Http\Response;

class ApiExceptionHandler extends Handler
{
    use DumperHandler;

    /**
     * 渲染异常为 HTTP 响应
     */
    public function render(Request $request, Throwable $exception): Response
    {
        if ($exception instanceof Dumper) {
            return \response(self::convertToHtml($exception));
        }

        $data['code'] = $exception->getCode() ?? 500;
        $data['msg'] = $exception->getMessage();
        $data['data'] = null;

        // 调试模式下添加更多信息
        if (config('app.debug')) {
            $data['debug'] = [
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
//                'trace' => $this->formatTrace($exception->getTrace()),
            ];
        }
        return new Response(200, [], json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    /**
     * 获取用户友好的错误信息
     */
    protected function getErrorMessage(Throwable $exception): string
    {
        // 根据异常类型返回不同的信息
        $message = $exception->getMessage();

        // 处理未定义函数/方法错误
        if (strpos($message, 'Call to undefined function') !== false ||
            strpos($message, 'Call to undefined method') !== false) {
            return '系统错误：调用了未定义的函数或方法';
        }

        // 处理数据库错误
        if ($exception instanceof PDOException) {
            return config('app.debug') ? $message : '数据库操作失败';
        }

        // 处理验证错误
        if ($exception instanceof ValidateException) {
            return $message;
        }

        // 默认返回通用错误信息
        return config('app.debug') ? $message : '服务器内部错误';
    }
}