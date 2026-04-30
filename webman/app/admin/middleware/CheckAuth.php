<?php

namespace app\admin\middleware;

use app\admin\services\annotation\MiddlewareAnnotation;
use app\admin\services\AuthService;
use app\admin\traits\JumpTrait;
use ReflectionClass;
use Throwable;
use Webman\Http\Request;
use Webman\Http\Response;
use Webman\MiddlewareInterface;

class CheckAuth implements MiddlewareInterface
{
    use JumpTrait;

    /**
     * @desc
     * @param Request $request
     * @param callable $handler
     * @return Response
     */
    public function process(Request $request, callable $handler): Response
    {
        $adminConfig = config('admin');
        $adminId = session('admin.id', 0);
        $controllerClass = explode('\\', $request->controller);
        $controller = strtolower(str_replace('Controller', '', array_pop($controllerClass)));
        try {
            $reflectionClass = new ReflectionClass($request->controller);
            $action = $request->action;
            $checkIgnoreLogin = $reflectionClass->getMethod($action)->getAttributes(MiddlewareAnnotation::class)[0]->newInstance()->ignore;
            // 不需要登录的页面 跳过检测权限
            if (strtolower($checkIgnoreLogin) == 'login') return $handler($request);
        } catch (Throwable) {
        }
        // 验证权限
        if ($adminId) {
            $authService = new AuthService($adminId);
            $currentNode = $authService->getCurrentNode();

            if (!in_array($controller, $adminConfig['no_auth_controller']) && !in_array($controller, $adminConfig['no_auth_node'])) {

                $check = $authService->checkNode($currentNode);
                if (!$check) return ($request->isAjax() || $request->method() == 'POST') ? $this->error('无权限访问') : $this->responseView('无权限访问');
            }
        }
        return $handler($request);
    }
}
