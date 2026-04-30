<?php

use app\admin\services\AuthService;
use app\common\model\system\SystemConfig;
use support\Cache;

/**
 * Here is your custom functions.
 */
const SUPER_ADMIN_ID = 1;
/**
 * @param string $url
 * @return string
 */
function __url(string $url = ''): string
{
    $url = "/" . (config('admin')['admin_alias_name'] . (str_starts_with($url, '/') ? $url : "/{$url}"));
    return $url ?: '/';
}

if (!function_exists('parse_name')) {
    /**
     * 字符串命名风格转换
     * type 0 将Java风格转换为C的风格 1 将C风格转换为Java的风格
     * @param string $name 字符串
     * @param int $type 转换类型
     * @param bool $ucfirst 首字母是否大写（驼峰规则）
     * @return string
     */
    function parse_name(string $name, int $type = 0, bool $ucfirst = true): string
    {
        if ($type) {
            $name = preg_replace_callback('/_([a-zA-Z])/', function ($match) {
                return strtoupper($match[1]);
            }, $name);

            return $ucfirst ? ucfirst($name) : lcfirst($name);
        }

        return strtolower(trim(preg_replace('/[A-Z]/', '_\\0', $name), '_'));
    }
}

if (!function_exists('sysconfig')) {

    /**
     * 获取系统配置信息
     * @param $group
     * @param null $name
     * @return mixed
     */
    function sysconfig($group, $name = null): mixed
    {
        $where = ['group' => $group];
        $value = empty($name) ? Cache::get("sysconfig_{$group}") : Cache::get("sysconfig_{$group}_{$name}");
        if (empty($value)) {
            if (!empty($name)) {
                $where['name'] = $name;
                $value = SystemConfig::where($where)->value('value');
                Cache::set("sysconfig_{$group}_{$name}", $value, 3600);
            } else {
                $value = SystemConfig::where($where)->column('value', 'name');
                Cache::set("sysconfig_{$group}", $value, 3600);
            }
        }
        return $value;
    }
}

if (!function_exists('auths')) {

    /**
     * auth权限验证
     * @param $node
     * @return bool
     */
    function auths($node = null): bool
    {
        $authService = new AuthService(session('admin.id'));
        return $authService->checkNode($node);
    }

}


if (!function_exists('password')) {

    /**
     * 密码加密算法
     * @param $value
     * @return string
     */
    function password($value): string
    {
        $value = sha1('blog_') . md5($value) . md5('_encrypt') . sha1($value);
        return sha1($value);
    }

}


/**
 * 提取POST参数
 * @param mixed $post
 * @param array $fields
 * @param array $params
 * @param $row
 * @return mixed
 */
if (!function_exists('extracted')) {
    function extracted(mixed $post, array $fields, array $params, $row): mixed
    {
        $tableColumn = array_keys($post);
        $fields = array_intersect($tableColumn, $fields);
        foreach ($fields as $value) {
            if (isset($params[$value])) $post[$value] = $params[$value];
            $row->$value = $post[$value] ?? '';
        }
        return $row->save();
    }
}
/**
 * @param string|null $detail
 * @param string $name
 * @param string $placeholder
 * @return string
 */

if (!function_exists('editor_textarea')) {
    function editor_textarea(?string $detail, string $name = 'desc', string $placeholder = '请输入'): string
    {
        $editor_type = sysconfig('site', 'editor_type');
        return match ($editor_type) {
            'ckeditor' => "<textarea name='{$name}' rows='20' class='layui-textarea editor' placeholder='{$placeholder}'>{$detail}</textarea>",
            'ueditor' => "<script type='text/plain' id='{$name}' name='{$name}' class='editor' data-content='{$detail}'></script>",
            default => "<div class='wangEditor_div'><textarea name='{$name}' rows='20' class='layui-textarea editor layui-hide'>{$detail}</textarea><div id='editor_toolbar_{$name}'></div><div id='editor_{$name}' style='height: 300px'></div></div>",
        };
    }
}

if (!function_exists('array_format_key')) {

    /**
     * 二位数组重新组合数据
     * @param $array
     * @param $key
     * @return array
     */
    function array_format_key($array, $key): array
    {
        $newArray = [];
        foreach ($array as $vo) {
            $newArray[$vo[$key]] = $vo;
        }
        return $newArray;
    }
}

if (!function_exists('get_datas')) {
    function get_datas()
    {
        $timestamp = strtotime(date('Y-m-d H:i:s'));
        // 加8个小时
//        $timestamp += 8 * 3600;
        return date('Y-m-d H:i:s', $timestamp);
    }
}

/**
 * 数组排序
 * @param array $arr
 * @param string $field1 排序字段1
 * @param string $field2 排序字段2
 * @param string $sort1 排序方式1
 * @param string $sort2 排序方式2
 * @return array
 * @example
 * array2_sort($arr, 'id', 'name', 'desc', 'asc');
 */
if (!function_exists('array2_sort')) {

    function array2_sort($arr, $field1, $field2 = '', $sort1 = 'desc', $sort2 = 'desc')
    {
        if (in_array($sort1, array('desc', 'asc'))) {
            $arr_sort1 = $sort1 == 'desc' ? SORT_DESC : SORT_ASC;
        }
        if (in_array($sort2, array('desc', 'asc'))) {
            $arr_sort2 = $sort2 == 'desc' ? SORT_DESC : SORT_ASC;
        }
        $list = array();
        if (!is_array($arr) || $field1 == '') {
            return $list;
        }
        $arr2 = array();
        foreach ($arr as $k => $v) {
            if (!is_array($v) || !isset($v[$field1])) {
                //不是二维数组,或者没找到对应的元素
                break;
            } else {
                $arr2[] = $v[$field1];
            }
        }
        if (!empty($field2)) {
            $arr3 = array();
            foreach ($arr as $k => $v) {
                if (!is_array($v) || !isset($v[$field2])) {
                    //不是二维数组,或者没找到对应的元素
                    break;
                } else {
                    $arr3[] = $v[$field2];
                }
            }
        }
        if (!empty($arr3)) {
            array_multisort($arr2, $arr_sort1, $arr3, $arr_sort2, $arr);
        } else {
            array_multisort($arr2, $arr_sort1, $arr);
        }
        return $arr;
    }
}


/*
 * 获取图片base64
 * @param $imageUrl
 * @return string
 */

if (!function_exists('get_image_base64')) {
    function get_image_base64($imageUrl)
    {
        $imageData = file_get_contents($imageUrl);
        if ($imageData !== false) {
            // 生成Base64编码的字符串
            $base64EncodedImage = base64_encode($imageData);

            // 输出Base64编码的字符串
            return $base64EncodedImage;

//          $dataUrl = 'data:image/jpeg;base64,' . $base64EncodedImage;
        }

        return false;
    }
}


/**
 * 保存图片base64
 */
if (!function_exists('save_image_base64')) {
    function save_image_base64($imageStr, $file_path, $file_name = '')
    {
        $path = public_path() . $file_path;
        if (!file_exists($path)) {
            mkdir($path, 0755, true);
        }
        preg_match('/^(data:\s*image\/(\w+);base64,)/', $imageStr, $result);

        if (empty($file_name)) {
            $file_name = md5($imageStr) . "." . $result[2];
        }
//        pr($file_path);
//        pr($file_name);
//        dd($path);

        try {
            $result = file_put_contents($path . $file_name, base64_decode(str_replace($result[1], '', $imageStr)));
//            if (!$result) {
//                throwError('保存图片失败');
//            }

            $res['domain'] = $_SERVER['DOMAIN'];
            $res['file_path'] = '/' . str_replace(DIRECTORY_SEPARATOR, '/', $file_path . $file_name);
            $res['url'] = $_SERVER['DOMAIN'] . $res['file_path'];
            return $res;

        } catch (Exception $e) {
            return throwError($e->getMessage());
//            return ['error' => $e->getMessage()];
        }
    }
}

/**
 * 输出错误信息
 * @param string $message 报错信息
 * @param int $code 状态码
 * @param array $data 附加数据
 */
if (!function_exists('throwError')) {
    function throwError(string $message, $code = 500)
    {
        throw new Exception($message, $code);
    }
}


/**
 * 生成数字+字母随机字符串
 * @param int $length 长度
 * @param string $char 字符集
 * @return string
 */
if (!function_exists('generate_shuffled_string')) {
    function generate_shuffled_string($min = 7, $max = 9)
    {
        $characters = '0123456789abcdefghijklmnopqrstuvwxyz';
        $shuffled = str_shuffle($characters); // 随机打乱字符顺序
        $length = mt_rand($min, $max); // 生成长度介于 7-9 之间
        return substr($shuffled, 0, $length);
    }
}


/**
 * 获取全局唯一标识符
 * @param bool $trim
 * @return string
 */
if (!function_exists('get_guid_v4')) {

    function get_guid_v4($trim = true)
    {
        // Windows
        if (function_exists('com_create_guid') === true) {
            $charid = com_create_guid();
            return $trim == true ? trim($charid, '{}') : $charid;
        }
        // OSX/Linux
        if (function_exists('openssl_random_pseudo_bytes') === true) {
            $data = openssl_random_pseudo_bytes(16);
            $data[6] = chr(ord($data[6]) & 0x0f | 0x40); // set version to 0100
            $data[8] = chr(ord($data[8]) & 0x3f | 0x80); // set bits 6-7 to 10
            return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
        }
        // Fallback (PHP 4.2+)
        mt_srand((double)microtime() * 10000);
        $charid = strtolower(md5(uniqid(rand(), true)));
        $hyphen = chr(45); // "-"
        $lbrace = $trim ? "" : chr(123); // "{"
        $rbrace = $trim ? "" : chr(125); // "}"
        $guidv4 = $lbrace .
            substr($charid, 0, 8) . $hyphen .
            substr($charid, 8, 4) . $hyphen .
            substr($charid, 12, 4) . $hyphen .
            substr($charid, 16, 4) . $hyphen .
            substr($charid, 20, 12) .
            $rbrace;
        return $guidv4;
    }
}

/*
 * 过滤emoji表情
 * @param string $nickname
 * @return string
 */
if (!function_exists('filter_emoji')) {
    function filter_emoji($nickname)
    {
        $pattern = '/[^\x{4e00}-\x{9fa5}a-zA-Z0-9\s\-\_\,\.\!\(\)\（\）]/u';
        return preg_replace($pattern, '', $nickname);
    }
}

if (!function_exists('pre')) {
    function pre($data, $title = '', $is_dump = false, $exit = false)
    {
        echo '<pre>';
        if ($title) {
            echo '[' . $title . ']';
        }

        if (is_object($data)) {
            $data = $data->toArray();
        }

        if ($is_dump) {
            var_dump($data);
        } else {
            print_r($data);
        }

        if ($exit) {
            echo $title;
            exit;
        }
        echo '</pre>';
    }
}