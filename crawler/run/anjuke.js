const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { chromium } = require('playwright');
const fs = require('fs');
const { saveData } = require('../utils/storageFactory');
const extractor = require('../src/index');

async function runAnjukeCrawler() {
  const headlessMode = process.env.HEADLESS !== 'false';
  const browser = await chromium.launch({ headless: headlessMode });
  const storageStatePath = path.join(__dirname, '../storage/anjuke_storageState.json');
  const context = await browser.newContext({
    viewport: null,
    args: ['--start-maximized'],
    storageState: fs.existsSync(storageStatePath) ? storageStatePath : undefined
  });
  const page = await context.newPage();

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
          const priceMonthlyMatch = itemHtml.match(/<div[^>]*class="price-monthly"[^>]*>[\s\S]*?<span class="price">([\d.]+)<\/span>\s*<span class="price-unit">([^<]+)<\/span>/);
          const priceSimpleMatch = itemHtml.match(/<span class="price">([\d.]+)<\/span>\s*<span class="price-unit">([^<]+)<\/span>/);

          if (priceMonthlyMatch && priceMonthlyMatch[1] && priceMonthlyMatch[2]) {
            price = priceMonthlyMatch[1] + priceMonthlyMatch[2];
          } else if (priceSimpleMatch && priceSimpleMatch[1] && priceSimpleMatch[2]) {
            price = priceSimpleMatch[1] + priceSimpleMatch[2];
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
              district: district || '',
              price: price || '',
              imageUrl: imageUrl || '',
              detailUrl: detailUrl || '',
              source: 'anjuke'
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
    const urlList = (process.env.CRAWL_ANJUKE_URLS || '').split(',').filter(url => url.trim());

    console.log('开始地址列表采集...');
    console.log(`共 ${urlList.length} 个地址需要采集`);
    console.log('========================================');

    let totalSaved = 0;
    let totalPages = 0;

    for (let urlIndex = 0; urlIndex < urlList.length; urlIndex++) {
      const currentUrl = urlList[urlIndex];

      console.log(`\n===== 地址 ${urlIndex + 1}/${urlList.length}: ${currentUrl} =====`);
      console.log('打开页面:', currentUrl);
      await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);

      let pageNumber = 1;
      let hasNextPage = true;

      while (hasNextPage) {
        console.log(`\n------ 第 ${pageNumber} 页 ------`);
        const pageData = await collectPageData();

        if (pageData.length === 0) {
          console.log('本页无数据');
          break;
        }

        console.log(`第 ${pageNumber} 页采集完成，共 ${pageData.length} 条数据`);

        const saveResult = await extractor.extractAndSave(pageData, {
            timeout: 10000,
            maxPlatforms: 6,
            saveToDb: true
        });
        const savedCount = saveResult.save.saved || 0;
        totalSaved += savedCount;

        if (savedCount === 0) {
          console.log('无新数据，跳过后续页面');
          break;
        }

        hasNextPage = await clickNextPage();
        if (hasNextPage) {
          const randomWait = Math.floor(Math.random() * 5) + 3;
          console.log(`等待 ${randomWait} 秒后采集下一页...`);
          await page.waitForTimeout(randomWait * 1000);
          pageNumber++;
          totalPages++;
        } else {
          console.log('已到达最后一页');
        }
      }

      totalPages += pageNumber;
      console.log(`地址 ${urlIndex + 1} 采集完成`);

      if (urlIndex < urlList.length - 1) {
        const waitBetweenUrls = Math.floor(Math.random() * 8) + 5;
        console.log(`等待 ${waitBetweenUrls} 秒后采集下一个地址...`);
        await page.waitForTimeout(waitBetweenUrls * 1000);
      }
    }

    console.log(`\n成功采集并保存 ${totalSaved} 条新数据（共 ${totalPages} 页）`);
    console.log('========================================');

  } catch (error) {
    console.error('执行出错:', error.message);
    if (page) {
      await page.screenshot({ path: 'anjuke_error.png' });
    }
  } finally {
    console.log('关闭浏览器...');
    if (browser) {
      await browser.close();
    }
    console.log('浏览器已关闭');
  }
}

module.exports = runAnjukeCrawler;