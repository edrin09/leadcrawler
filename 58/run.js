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

      const captchaExists = await page.locator('.pop .title').isVisible();
      if (captchaExists) {
        console.log('检测到验证码页面，需要手动验证');
        await page.screenshot({ path: '58_captcha.png' });
        console.log('已保存验证码截图到 58_captcha.png');
        console.log('请完成验证码验证后，在浏览器中手动点击继续，然后按回车键继续脚本...');
        await new Promise(resolve => {
          process.stdin.once('data', resolve);
        });
        await page.waitForTimeout(3000);
      }

      const items = page.locator('.content-side-left ul li');
      const count = await items.count();
      console.log(`共找到 ${count} 个列表项`);

      for (let i = 0; i < count; i++) {
        try {
          const item = items.nth(i);
          const itemHtml = await item.evaluate(el => el.outerHTML);

          let detailUrl = '';
          const linkMatch = itemHtml.match(/href="(https:\/\/xa\.58\.com\/shangpu\/[^"]*)"/);
          if (linkMatch && linkMatch[1]) {
            detailUrl = linkMatch[1].split('?')[0];
          }

          let title = '';
          const titleMatch = itemHtml.match(/<span class="title_des">([^<]*)<\/span>/);
          if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].trim();
          }

          let price = '';
          const priceMatch = itemHtml.match(/<span class="num">([^<]*)<\/span>/);
          if (priceMatch && priceMatch[1]) {
            price = priceMatch[1].trim();
          }

          let district = '';
          const districtMatch = itemHtml.match(/<span class="withi">([^<]*)<\/span>/);
          if (districtMatch && districtMatch[1]) {
            district = districtMatch[1].trim();
          }

          let imageUrl = '';
          const imgMatch = itemHtml.match(/data-src="(http[^"]*)"/);
          if (imgMatch && imgMatch[1]) {
            imageUrl = imgMatch[1];
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
      const pager = page.locator('.pager');
      if (await pager.isVisible({ timeout: 2000 })) {
        const nextBtn = pager.locator('a.next');
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
    console.log('打开页面: https://xa.58.com/shangpucz/0/');
    await page.goto('https://xa.58.com/shangpucz/0/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    console.log('开始分页采集数据...');
    console.log('========================================');

    const filename = '58_output.csv';
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

      if (savedCount === 0) {
        console.log('无新数据，停止采集');
        break;
      }

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
    await page.screenshot({ path: '58_error.png' });
  }

  console.log('关闭浏览器...');
  await browser.close();
  console.log('浏览器已关闭');
})();