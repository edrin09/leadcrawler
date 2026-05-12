#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
店铺联系电话提取器 - 增强版
集成美团、小红书、抖音、闲鱼等平台搜索
支持精确匹配、部分匹配、模糊匹配
"""

import re
import requests
from bs4 import BeautifulSoup
import json
import os
import urllib.parse
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

class PhoneExtractor:
    def __init__(self):
        # 手机号精确匹配模式
        self.phone_patterns = {
            'exact': [
                r'1[3-9]\d{9}',                    # 精确手机号
                r'1[3-9]\d{2}[-.\s]\d{4}[-.\s]\d{4}',  # 带分隔符的手机号
            ],
            'partial': [
                r'1[3-9]\d{4,8}',                  # 部分手机号（5-9位）
                r'1[3-9]\d{2}[^\d]\d{2,6}',        # 带分隔符的部分手机号
            ],
            'fuzzy': [
                r'[^\d]1[3-9]\d{2,}[^\d]',         # 模糊匹配
            ],
            'special': [
                r'0\d{2,3}[-.]?\d{7,8}',           # 固定电话
            ]
        }
        
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                          '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Referer': 'https://www.baidu.com/',
            'Connection': 'keep-alive',
        }
        
        # 西安地区区号
        self.local_area_codes = ['029']
        
        # 搜索平台配置
        self.platforms = [
            {'name': '58同城', 'url': 'https://xa.58.com/shangpu/?key={}'},
            {'name': '安居客', 'url': 'https://xa.sydc.anjuke.com/sp-zu/?kw={}'},
            {'name': '房天下', 'url': 'https://xian.esf.fang.com/shangpu/?keyword={}'},
            {'name': '贝壳找房', 'url': 'https://xa.ke.com/xiaoqu/?keyword={}'},
            {'name': '百度地图', 'url': 'https://map.baidu.com/search/{}'},
            {'name': '高德地图', 'url': 'https://amap.com/search?query={}'},
            {'name': '美团', 'url': 'https://www.meituan.com/s/{}/'},
            {'name': '小红书', 'url': 'https://xiaohongshu.com/search_result?keyword={}'},
            {'name': '抖音', 'url': 'https://www.douyin.com/search/{}'},
            {'name': '闲鱼', 'url': 'https://2.taobao.com/list/list.htm?q={}'},
            {'name': '大众点评', 'url': 'https://www.dianping.com/search/category/7/10/r60114/kw{}'},
            {'name': '腾讯地图', 'url': 'https://map.qq.com/search/{}'},
        ]
    
    def extract_phones(self, text, match_type='all'):
        """提取电话号码，支持多种匹配模式"""
        phones = set()
        
        if match_type == 'all':
            pattern_groups = ['exact', 'special']
        elif match_type == 'strict':
            pattern_groups = ['exact']
        elif match_type == 'fuzzy':
            pattern_groups = ['exact', 'special', 'partial']
        else:
            pattern_groups = ['exact', 'special']
        
        for group in pattern_groups:
            for pattern in self.phone_patterns[group]:
                matches = re.findall(pattern, text)
                for match in matches:
                    phone = self._clean_phone(match)
                    if phone:
                        phones.add(phone)
        
        return sorted(list(phones))
    
    def _clean_phone(self, phone):
        """清理电话号码格式"""
        cleaned = re.sub(r'[-\s()（）·*_.]', '', phone)
        
        # 过滤明显无效的号码
        invalid_patterns = [
            r'^0{2,}',           # 以多个0开头
            r'^1[012]',          # 无效的手机号段
            r'^0123456789$',     # 测试号码
            r'^0+[1-9]0+$',      # 前后都是0
            r'^\d{3,4}0{4,}$',   # 后四位都是0
            r'^0{3,}\d+$',       # 三个以上0开头
            r'^400\d+$',         # 400开头
            r'^800\d+$',         # 800开头
        ]
        
        for pattern in invalid_patterns:
            if re.match(pattern, cleaned):
                return None
        
        # 验证手机号
        if cleaned.startswith('1') and len(cleaned) == 11:
            if cleaned[1] in '3456789':
                # 过滤全相同数字
                if len(set(cleaned)) > 2:
                    return cleaned
        # 验证固定电话（只保留西安地区）
        elif cleaned.startswith('029') and (len(cleaned) == 11 or len(cleaned) == 12):
            return cleaned
        
        return None
    
    def fetch_page(self, url, timeout=10):
        """获取页面内容，增加超时处理"""
        try:
            response = requests.get(url, headers=self.headers, timeout=timeout)
            response.raise_for_status()
            response.encoding = response.apparent_encoding
            return response.text
        except requests.exceptions.RequestException as e:
            return None
    
    def analyze_page(self, url):
        """分析单个页面"""
        print(f"    [分析] {url}")
        content = self.fetch_page(url)
        if not content:
            return []
        
        phones = set()
        soup = BeautifulSoup(content, 'html.parser')
        
        # 从HTML文本提取
        page_text = soup.get_text()
        phones.update(self.extract_phones(page_text))
        
        # 从属性中提取
        for tag in soup.find_all(['a', 'div', 'span']):
            for attr in ['href', 'data-phone', 'data-tel', 'data-mobile', 'tel', 'phone']:
                if attr in tag.attrs:
                    phones.update(self.extract_phones(str(tag[attr])))
        
        # 从script标签提取
        for script in soup.find_all('script'):
            if script.string:
                phones.update(self.extract_phones(script.string))
        
        return sorted(list(phones))
    
    def search_single_platform(self, platform, encoded_keywords):
        """搜索单个平台"""
        url = platform['url'].format(encoded_keywords)
        content = self.fetch_page(url)
        if content:
            return self.extract_phones(content)
        return []
    
    def search_platforms(self, keywords, max_workers=5):
        """并行搜索多个平台"""
        phones = set()
        encoded_keywords = urllib.parse.quote(keywords)
        
        print(f"    [搜索平台] 共 {len(self.platforms)} 个平台")
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {executor.submit(self.search_single_platform, p, encoded_keywords): p for p in self.platforms}
            
            for future in as_completed(futures):
                platform = futures[future]
                try:
                    result = future.result()
                    if result:
                        print(f"      ✓ {platform['name']}: {len(result)} 个")
                        phones.update(result)
                except Exception as e:
                    print(f"      ✗ {platform['name']}: 失败")
        
        return sorted(list(phones))
    
    def generate_keyword_variations(self, keywords):
        """生成关键词变体"""
        variations = set()
        variations.add(keywords)
        
        # 同义词替换
        replacements = [
            ('旺铺', '商铺'),
            ('出租', '招租'),
            ('直租', '出租'),
            ('转让', '出租'),
            ('门面', '商铺'),
            ('店铺', '商铺'),
            ('小学', '学校'),
            ('门口', ''),
            ('/', ' '),
            ('|', ' '),
        ]
        
        for old, new in replacements:
            variations.add(keywords.replace(old, new))
        
        # 生成简写形式
        parts = keywords.split()
        if len(parts) > 2:
            variations.add(' '.join(parts[:2]))
            variations.add(' '.join(parts[-2:]))
        
        return sorted(list(variations))
    
    def search_with_variations(self, keywords):
        """使用关键词变体进行搜索"""
        phones = set()
        variations = self.generate_keyword_variations(keywords)
        
        print(f"    [搜索变体] 共 {len(variations)} 个关键词变体")
        
        for i, kw in enumerate(variations):
            if kw.strip():
                print(f"      变体 {i+1}: {kw}")
                phones.update(self.search_platforms(kw, max_workers=3))
        
        return sorted(list(phones))
    
    def sort_by_relevance(self, phones, keywords):
        """按相关性排序电话"""
        if not phones:
            return []
        
        scores = {}
        for phone in phones:
            score = 0
            # 完整手机号加分
            if len(phone) == 11 and phone.startswith('1'):
                score += 10
            # 本地电话加分
            if phone.startswith('029') or phone.startswith('13') or phone.startswith('15'):
                score += 5
            # 关键词匹配加分
            if any(keyword in phone for keyword in ['888', '666', '999']):
                score += 3
            scores[phone] = score
        
        return sorted(phones, key=lambda x: scores[x], reverse=True)
    
    def run(self, urls=None, location='', keywords='', match_type='all'):
        """运行提取器"""
        all_phones = set()
        start_time = datetime.now()
        
        # 处理URL列表
        if urls and urls.strip():
            url_list = [u.strip() for u in urls.split('\n') if u.strip()]
            print(f"\n[步骤1/3] 分析 {len(url_list)} 个页面...")
            for url in url_list:
                phones = self.analyze_page(url)
                if phones:
                    print(f"      ✓ 找到 {len(phones)} 个电话")
                    all_phones.update(phones)
        
        # 使用关键词变体搜索平台
        search_key = keywords if keywords else location
        if search_key:
            print(f"\n[步骤2/3] 在各大平台搜索关键词变体...")
            phones = self.search_with_variations(search_key)
            if phones:
                print(f"      ✓ 找到 {len(phones)} 个电话")
                all_phones.update(phones)
        
        # 排序结果
        sorted_phones = self.sort_by_relevance(list(all_phones), keywords)
        
        # 统计时间
        elapsed = datetime.now() - start_time
        print(f"\n[搜索完成] 耗时: {elapsed.total_seconds():.2f}秒")
        
        return sorted_phones

def save_results(phones, filename=None):
    """保存结果到文件"""
    if not filename:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'phone_results_{timestamp}.txt'
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(f"搜索时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("=" * 50 + "\n")
        if phones:
            for i, phone in enumerate(phones, 1):
                f.write(f"{i}. {phone}\n")
        else:
            f.write("未找到联系电话\n")
    
    print(f"\n[+] 结果已保存到: {filename}")
    return filename

def main():
    print("=" * 60)
    print("       店铺联系电话提取器 v3.0")
    print("       集成美团/小红书/抖音/闲鱼等平台")
    print("=" * 60)
    print()
    
    # 用户输入
    urls = input("请输入商铺页面URL（每行一个，可多个）:\n").strip()
    location = input("\n请输入位置信息（如：西安未央区凤城十二路）: ").strip()
    keywords = input("请输入关键词（如：首创禧悦里 旺铺出租）: ").strip()
    
    # 创建提取器并运行
    extractor = PhoneExtractor()
    phones = extractor.run(urls, location, keywords)
    
    # 输出结果
    print("\n" + "=" * 60)
    if phones:
        print(f"[+] 找到 {len(phones)} 个联系电话（按相关性排序）:")
        for i, phone in enumerate(phones, 1):
            print(f"    {i}. {phone}")
    else:
        print("[-] 未找到联系电话")
    
    # 保存结果
    if phones:
        save_choice = input("\n是否保存结果到文件？(y/n): ").strip().lower()
        if save_choice in ['y', 'yes', '是']:
            save_results(phones)
    
    print("\n" + "=" * 60)
    print("提示：")
    print("  - 网站通常需要登录才能查看完整联系方式")
    print("  - 建议直接访问页面并登录查看")
    print("  - 可尝试联系物业或招商中心获取更多信息")
    print("=" * 60)

if __name__ == "__main__":
    main()
