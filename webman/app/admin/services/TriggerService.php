<?php

namespace app\admin\services;

class TriggerService
{
    /**
     * 更新菜单缓存
     * @param null $adminId
     * @return bool
     */
    public static function updateMenu(): bool
    {
        session()->forget('initAdmin');
        return true;
    }
}
