<?php

/**
 * 接口限流
 */

namespace app\api\service\public;

use think\facade\Cache;

class TokenLimitingService
{
    private $cache_key;
    private $capacity;

    public function __construct()
    {
        $this->cache_key = 'tokens_' . date('ymdhis');
        $this->capacity = env('limiting.limiting_capacity', 1000);

        //初始化每秒容量
        Cache::set($this->cache_key, 0, 1);
    }

    public function tokensLimiting()
    {
        //增加令牌数量
        $this->incTokensNum();

        //获取令牌数量
        $tokensNum = $this->getTokensNum();

        if ($tokensNum > $this->capacity) {
            throwError('访问人数过多，请稍后再试', 800);
        }

        //减少令牌数量
        $this->decTokensNum();
        return true;
    }

    //增加令牌数量
    private function incTokensNum()
    {
        Cache::inc($this->cache_key);
        return true;
    }

    //获取令牌数量
    private function getTokensNum()
    {
        return Cache::get($this->cache_key);
    }

    //减少令牌数量
    private function decTokensNum()
    {
        Cache::dec($this->cache_key);
        return true;
    }
}