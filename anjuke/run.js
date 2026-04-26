const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: null,
    args: ['--start-maximized']
  });
  const page = await context.newPage();

  const outputDir = path.join(__dirname, '../output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const collectPageData = async () => {
    const data = [];
    try {
      await page.waitForTimeout(2000);

      const items = page.locator('.list-item');
      const count = await items.count();
      console.log(`共找到 ${count} 个列表项`);

      for (let i = 0; i < count; i++) {
        try {
          const item = items.nth(i);
          const itemHtml = await item.evaluate(el => el.outerHTML);

          let detailUrl = '';
          const linkMatch = itemHtml.match(/href="(https:\/\/xa\.sydc\.anjuke\.com\/sp-zu\/d[^"]*)"/);
          if (linkMatch && linkMatch[1]) {
            detailUrl = linkMatch[1].split('?')[0];
          }

          let imageUrl = '';
          const imgMatch = itemHtml.match(/data-src="(http[^"]*)"/);
          if (imgMatch && imgMatch[1]) {
            imageUrl = imgMatch[1];
          }

          let title = '';
          const titleMatch = itemHtml.match(/<span class="title">([^<]*)<\/span>/);
          if (titleMatch && titleMatch[1]) {
            title = titleMatch[1];
          }

          let price = '';
          const priceMonthlyMatch = itemHtml.match(/<span class="price">(\d+)<\/span><span class="price-unit">元\/月<\/span>/);
          if (priceMonthlyMatch && priceMonthlyMatch[1]) {
            price = priceMonthlyMatch[1] + '元/月';
          } else if (itemHtml.includes('mianyi') || itemHtml.includes('面议')) {
            price = '面议';
          }

          let district = '';
          const districtMatch = itemHtml.match(/item-descript[^>]*>[\s\S]*?<span>([^<]*)<\/span>[\s\S]*?-/);
          if (districtMatch && districtMatch[1]) {
            district = districtMatch[1].trim();
          }

          if (detailUrl) {
            data.push({
              title: title || '',
              price: price || '',
              district: district || '',
              detailUrl: detailUrl || '',
              imageUrl: imageUrl || ''
            });
            console.log(`采集第 ${i + 1}/${count} 条: ${title.substring(0, 30)} | ${price} | ${district}`);
          }
        } catch (e) {
          console.log(`采集第 ${i + 1} 条失败: ${e.message}`);
        }
      }
    } catch (e) {
      console.log('采集数据出错:', e.message);
    }
    return data;
  };

  const loadExistingUrls = (filePath) => {
    const existingUrls = new Set();
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line) {
            const parts = line.split('"');
            if (parts.length >= 9) {
              const url = parts[7];
              if (url) {
                existingUrls.add(url);
              }
            }
          }
        }
        console.log(`已加载 ${existingUrls.size} 条现有数据`);
      }
    } catch (e) {
      console.log('读取现有数据出错:', e.message);
    }
    return existingUrls;
  };

  const saveData = (data, filename) => {
    try {
      const filePath = path.join(outputDir, filename);
      const existingUrls = loadExistingUrls(filePath);

      const newData = data.filter(item => !existingUrls.has(item.detailUrl));
      console.log(`过滤后新增 ${newData.length} 条数据`);

      if (newData.length === 0) {
        console.log('无新数据需要保存');
        return 0;
      }

      const csvHeader = '标题,价格,区域,详情地址,图片\n';
      const csvData = newData.map(item =>
        `"${(item.title || '').replace(/"/g, '""')}","${(item.price || '').replace(/"/g, '""')}","${(item.district || '').replace(/"/g, '""')}","${(item.detailUrl || '').replace(/"/g, '""')}","${(item.imageUrl || '').replace(/"/g, '""')}"`
      ).join('\n');

      if (fs.existsSync(filePath)) {
        fs.appendFileSync(filePath, csvData + '\n', 'utf8');
        console.log(`数据已追加到: ${filePath}`);
      } else {
        fs.writeFileSync(filePath, '\ufeff' + csvHeader + csvData, 'utf8');
        console.log(`数据已保存到: ${filePath}`);
      }

      return newData.length;
    } catch (e) {
      console.log('保存数据出错:', e.message);
      return 0;
    }
  };

  const clickNextPage = async () => {
    try {
      const pageWrap = page.locator('.page-wrap');
      if (await pageWrap.isVisible({ timeout: 2000 })) {
        const nextBtn = pageWrap.locator('a.aNxt');
        if (await nextBtn.isVisible({ timeout: 1000 })) {
          const isDisabled = await nextBtn.getAttribute('class');
          if (isDisabled && isDisabled.includes('disabled')) {
            console.log('下一页按钮已禁用');
            return false;
          }
          console.log('点击下一页');
          await nextBtn.click({ force: true });
          return true;
        }
      }
      console.log('未找到下一页按钮');
      return false;
    } catch (e) {
      console.log('点击下一页失败:', e.message);
      return false;
    }
  };

  try {
    console.log('打开页面: https://xa.sydc.anjuke.com/sp-zu/ly2/');
    await page.goto('https://xa.sydc.anjuke.com/sp-zu/ly2/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    console.log('开始分页采集数据...');
    console.log('========================================');

    const filename = 'anjuke_output.csv';
    let pageNumber = 1;
    let totalSaved = 0;

    while (true) {
      console.log(`\n===== 第 ${pageNumber} 页 =====`);
      const pageData = await collectPageData();

      if (pageData.length === 0) {
        console.log('本页无数据，停止采集');
        break;
      }

      console.log(`第 ${pageNumber} 页采集完成，共 ${pageData.length} 条数据`);

      const savedCount = saveData(pageData, filename);
      totalSaved += savedCount;

      const hasNextPage = await clickNextPage();
      if (!hasNextPage) {
        console.log('已到达最后一页，采集完成');
        break;
      }

      const randomWait = Math.floor(Math.random() * 5) + 3;
      console.log(`等待 ${randomWait} 秒后采集下一页...`);
      await page.waitForTimeout(randomWait * 1000);

      pageNumber++;
    }

    console.log(`\n成功采集并保存 ${totalSaved} 条新数据（共 ${pageNumber} 页）`);
    console.log('========================================');

  } catch (error) {
    console.error('执行出错:', error.message);
    await page.screenshot({ path: 'anjuke_error.png' });
  }

  console.log('关闭浏览器...');
  await browser.close();
  console.log('浏览器已关闭');
})();