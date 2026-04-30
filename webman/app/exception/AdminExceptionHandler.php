<?php

namespace app\exception;

use Next\VarDumper\Dumper;
use Next\VarDumper\DumperHandler;
use Spatie\Ignition\Ignition;
use support\exception\BusinessException;
use Throwable;
use Webman\Config;
use Webman\Exception\ExceptionHandler;
use Webman\Http\Request;
use Webman\Http\Response;

class AdminExceptionHandler extends ExceptionHandler
{

    use DumperHandler;

    public $dontReport = [
        BusinessException::class,
    ];
    protected $ignition;

    public function report(Throwable $exception)
    {
        parent::report($exception);
    }

    public function render(Request $request, Throwable $exception): Response
    {
        if ($exception instanceof Dumper) {
            return \response(self::convertToHtml($exception));
        }

        if (!$this->ignition) {
            $config = Config::get('plugin.yangweijie.webman-ignition.app', []);
            if ($config['enable']) {
                $this->ignition = Ignition::make()
                    ->applicationPath(app_path())
                    ->theme($config['useDarkMode'] ? 'dark' : 'light')
                    ->shouldDisplayException($config['show_error_msg'])
                    ->setEditor($config['editor'] ?? '')
                    ->register();
            }
        }
        if ($this->ignition) {
            if ($config['show_error_msg']) {
                // 添加自定义异常处理机制
                ob_start();
                $this->ignition->handleException($exception);
                $html = ob_get_clean();
                return new Response(200, [], $html);
            } else {
                return parent::render($request, $exception);
            }
        } else {
            return parent::render($request, $exception);
        }
    }
}