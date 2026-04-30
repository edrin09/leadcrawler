<?php

namespace app\admin\services\tool;

class CommonTool
{

    /**
     * 下划线转驼峰
     * @param $str
     * @return array|string|null
     */
    public static function lineToHump($str): array|string|null
    {
        $str = preg_replace_callback('/([-_]+([a-z]{1}))/i', function ($matches) {
            return strtoupper($matches[2]);
        },                           $str);
        return $str;
    }

    /**
     * 驼峰转下划线
     * @param $str
     * @return array|string|null
     */
    public static function humpToLine($str): array|string|null
    {
        $str = preg_replace_callback('/([A-Z]{1})/', function ($matches) {
            return '_' . strtolower($matches[0]);
        },                           $str);
        return $str;
    }

    /**
     * 读取文件夹下的所有文件
     * @param $path
     * @param $basePath
     * @return array|mixed
     */
    public static function readDirAllFiles($path, $basePath = ''): mixed
    {
        list($list, $temp_list) = [[], scandir($path)];
        empty($basePath) && $basePath = $path;
        foreach ($temp_list as $file) {
            if ($file != ".." && $file != ".") {
                if (is_dir($path . DIRECTORY_SEPARATOR . $file)) {
                    $childFiles = self::readDirAllFiles($path . DIRECTORY_SEPARATOR . $file, $basePath);
                    $list       = array_merge($childFiles, $list);
                } else {
                    $filePath        = $path . DIRECTORY_SEPARATOR . $file;
                    $fileName        = str_replace($basePath . DIRECTORY_SEPARATOR, '', $filePath);
                    $list[$fileName] = $filePath;
                }
            }
        }
        return $list;
    }

    /**
     * 模板值替换
     * @param $string
     * @param $array
     * @return mixed
     */
    public static function replaceTemplate($string, $array): mixed
    {
        foreach ($array as $key => $val) {
            if (is_null($val)) $val = '';
            $string = str_replace("{{" . $key . "}}", $val, $string);
        }
        return $string;
    }

    /**
     * 获取中文名称的首字母大写
     * @param $str
     * @return string
     */
    public static function getChineseFirstLetter($str): string
    {
        // 如果字符串为空，返回空
        if (empty($str)) {
            return '';
        }
        
        // 获取第一个字符
        $firstChar = mb_substr($str, 0, 1, 'UTF-8');
        
        // 如果是英文字母，直接转换为大写
        if (preg_match('/[a-zA-Z]/', $firstChar)) {
            return strtoupper($firstChar);
        }
        
        // 如果是数字，直接返回
        if (preg_match('/[0-9]/', $firstChar)) {
            return $firstChar;
        }
        
        // 中文汉字Unicode码对应拼音首字母表
        $pinyinMap = [
            ['A', 0xB0A1, 0xB0C4], ['B', 0xB0C5, 0xB2C0], ['C', 0xB2C1, 0xB4ED], ['D', 0xB4EE, 0xB6E9], ['E', 0xB6EA, 0xB7A1],
            ['F', 0xB7A2, 0xB8C0], ['G', 0xB8C1, 0xB9FD], ['H', 0xB9FE, 0xBBF6], ['J', 0xBBF7, 0xBFA5], ['K', 0xBFA6, 0xC0AB],
            ['L', 0xC0AC, 0xC2E7], ['M', 0xC2E8, 0xC4C2], ['N', 0xC4C3, 0xC5B5], ['O', 0xC5B6, 0xC5BD], ['P', 0xC5BE, 0xC6D9],
            ['Q', 0xC6DA, 0xC8BA], ['R', 0xC8BB, 0xC8F5], ['S', 0xC8F6, 0xCBF0], ['T', 0xCBF1, 0xCDD9], ['W', 0xCDDA, 0xCEF3],
            ['X', 0xCEF4, 0xD188], ['Y', 0xD1B9, 0xD4D0], ['Z', 0xD4D1, 0xD7F9]
        ];
        
        // 将汉字转换为GBK编码
        $gbkChar = iconv('UTF-8', 'GBK//IGNORE', $firstChar);
        if (strlen($gbkChar) == 2) {
            $gbkCode = ord($gbkChar[0]) << 8 | ord($gbkChar[1]);
            
            // 查找拼音首字母
            foreach ($pinyinMap as $item) {
                if ($gbkCode >= $item[1] && $gbkCode <= $item[2]) {
                    return $item[0];
                }
            }
        }
        
        return 'Z';
    }

}