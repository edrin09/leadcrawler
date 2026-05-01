<?php

namespace app\api\service\business;

use app\common\model\business\MallData;

class CrawlerService
{
    public function getList($page = 1, $limit = 10)
    {
        $offset = ($page - 1) * $limit;

        $list = MallData::query()
            ->orderBy('id', 'desc')
            ->offset($offset)
            ->limit($limit)
            ->get()
            ->toArray();

        $total = MallData::query()->count();

        $data = [];
        foreach ($list as $item) {
            $data[] = [
                'id' => $item['id'],
                'title' => $item['title'],
                'area' => $item['district'],
                'price' => $item['price'],
                'image_url' => $item['imageUrl'],
                'link_url' => $item['detailUrl'],
                'created_at' => $item['create_time']
            ];
        }

        return [
            'data' => $data,
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'pages' => (int)ceil($total / $limit)
        ];
    }

    public function getById($id)
    {
        $item = MallData::query()->find($id);

        if (!$item) {
            return null;
        }

        $item = $item->toArray();

        return [
            'id' => $item['id'],
            'title' => $item['title'],
            'area' => $item['district'],
            'price' => $item['price'],
            'image_url' => $item['imageUrl'],
            'link_url' => $item['detailUrl'],
            'created_at' => $item['create_time']
        ];
    }
}
