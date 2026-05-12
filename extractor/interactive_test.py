#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
交互式店铺联系电话提取测试脚本
用户可以手动输入店铺信息进行测试
"""

from phone_extractor import PhoneExtractor, save_results

def main():
    print("=" * 60)
    print("      📞 店铺联系电话提取器 - 交互式测试")
    print("=" * 60)
    print("请输入以下店铺信息，留空则跳过该字段")
    print("-" * 60)
    
    # 用户输入
    title = input("🏷️  标题：").strip()
    area = input("📍 区域：").strip()
    price = input("💰 价格：").strip()
    image_url = input("🖼️  首图URL：").strip()
    url = input("🔗 页面URL：").strip()
    
    # 准备搜索关键词
    keywords = []
    if title:
        keywords.append(title)
    if area:
        keywords.append(area)
    
    search_keywords = " ".join(keywords)
    
    print("\n" + "=" * 60)
    print("正在分析...")
    print("=" * 60)
    
    # 创建提取器并运行
    extractor = PhoneExtractor()
    phones = extractor.run(url, area, search_keywords)
    
    # 输出结果
    print("\n📊 提取结果：")
    print("-" * 40)
    if phones:
        print(f"✅ 成功找到 {len(phones)} 个联系电话：")
        for i, phone in enumerate(phones, 1):
            print(f"   {i}. {phone}")
    else:
        print("❌ 未找到联系电话")
        print("\n💡 可能原因：")
        print("   1. 网站需要登录才能查看联系方式")
        print("   2. 页面使用了JS加密隐藏电话")
        print("   3. 需要Cookie或登录状态")
    
    # 保存选项
    if phones:
        print("\n" + "-" * 40)
        save_choice = input("📝 是否保存结果到文件？(y/n): ").strip().lower()
        if save_choice in ['y', 'yes', '是']:
            filename = save_results(phones)
            print(f"✅ 结果已保存到: {filename}")
    
    print("\n" + "=" * 60)
    print("💬 使用建议：")
    print("   - 如果未找到电话，建议直接访问页面登录查看")
    print("   - 可尝试拨打物业或招商中心电话")
    print("   - 链家电话: 15829886943 (首创禧悦里店)")
    print("=" * 60)

if __name__ == "__main__":
    main()
