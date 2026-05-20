const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { chromium } = require('playwright');
const fs = require('fs');
const { saveData } = require('../utils/storageFactory');
const unifiedExtractor = require('../src/extractor/unifiedExtractor');
const dataInserter = require('../src/inserter/dataInserter');

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

          const hasJinpuTag = itemHtml.includes('class="jinpu-list-tag"');
          if (hasJinpuTag) {
            console.log(`跳过第 ${i + 1} 条: 包含jinpu-list-tag标签`);
            continue;
          }

          let detailUrl = '';
          const linkMatch = itemHtml.match(/href="(https:\/\/[^"]*sydc\.anjuke\.com[^"]*)"/) || itemHtml.match(/href="(https:\/\/[^"]*anjuke\.com[^"]*)"/) || itemHtml.match(/href="(\/[^"]+)"/);
          if (linkMatch && linkMatch[1]) {
            detailUrl = linkMatch[1].split('?')[0];
            if (detailUrl.startsWith('/')) {
              detailUrl = 'https://xa.sydc.anjuke.com' + detailUrl;
            }
          }

          if (!detailUrl) {
            const aTag = item.locator('a').first();
            detailUrl = await aTag.getAttribute('href').catch(() => '');
            if (detailUrl) {
              detailUrl = detailUrl.split('?')[0];
              if (detailUrl.startsWith('/')) {
                detailUrl = 'https://xa.sydc.anjuke.com' + detailUrl;
              }
            }
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

          if (detailUrl && title) {
            data.push({
              title: title,
              district: district || '',
              price: price || '',
              imageUrl: imageUrl || '',
              detailUrl: detailUrl,
              source: 'anjuke'
            });
            console.log(`采集第 ${i + 1}/${count} 条: ${title.substring(0, 30)} | ${price} | ${district}`);
          } else if (!title) {
            console.log(`跳过第 ${i + 1} 条: 标题为空`);
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

  const closePopupsOnPage = async (page) => {
    try {
      const closeSelectors = [
        '[class*="login-modal"] [class*="close"]',
        '[class*="modal"] [aria-label="关闭"]',
        '[class*="close"]',
        '.icon-close'
      ];
      for (const sel of closeSelectors) {
        const els = page.locator(sel);
        const count = await els.count();
        for (let i = 0; i < count; i++) {
          const el = els.nth(i);
          if (await el.isVisible({ timeout: 500 }).catch(() => false)) {
            await el.click({ force: true });
            await page.waitForTimeout(300);
          }
        }
      }
    } catch (e) { }
  };

  const extractDetailPageWithBrowser = async (detailUrl) => {
    try {
      const newPage = await context.newPage();
      await newPage.setViewportSize({ width: 1920, height: 1080 });

      try {
        await newPage.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await newPage.waitForTimeout(3000);

        await closePopupsOnPage(newPage);

        await newPage.evaluate(() => { window.scrollBy(0, 500); });
        await newPage.waitForTimeout(1000);

        const pageContent = await newPage.content();
        const pageText = await newPage.textContent('body');
        const strippedText = unifiedExtractor.stripHtmlTags(pageContent);

        const phones = unifiedExtractor.extractPhonesPublic(strippedText + pageContent);
        const businessName = unifiedExtractor.extractBusinessName(strippedText, pageContent);
        const businessInfo = unifiedExtractor.extractBusinessInfo(strippedText);
        const keywords = unifiedExtractor.extractSearchKeywords(strippedText, businessName);

        return {
          success: true,
          phones: phones,
          business_name: businessName,
          business_info: businessInfo,
          keywords: keywords,
          content: pageContent,
          text: pageText
        };
      } catch (e) {
        return {
          success: false,
          phones: [],
          business_name: '',
          business_info: {},
          keywords: [],
          error: e.message
        };
      } finally {
        await newPage.close();
      }
    } catch (e) {
      return {
        success: false,
        phones: [],
        business_name: '',
        business_info: {},
        keywords: [],
        error: e.message
      };
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

      const pageTitle = await page.title().catch(() => '');
      const pageBody = await page.textContent('body').catch(() => '');
      if (pageTitle.includes('验证码') || pageBody.includes('请输入验证码') || pageBody.includes('访问过于频繁')) {
        console.log('  ⚠️ 检测到反爬验证码页面，当前IP已被安居客限制');
        break;
      }

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

        let savedCount = 0;
        await dataInserter.initPool();
        for (let i = 0; i < pageData.length; i++) {
          const item = pageData[i];
          const detailUrl = item.detailUrl;

          console.log(`[${i + 1}/${pageData.length}] ${(item.title || '').substring(0, 30)}...`);

          if (!detailUrl) {
            console.log('  -> 无详情链接，跳过');
            continue;
          }

          const existingId = await dataInserter.checkMallDataExists(detailUrl);
          if (existingId) {
            console.log(`  -> 已存在 (id=${existingId})，跳过`);
            continue;
          }

          const mallDataRecord = {
            title: item.title,
            district: item.district || '',
            price: item.price || '',
            imageUrl: item.imageUrl || '',
            detailUrl: detailUrl,
            source: item.source || 'anjuke',
            phone_count: 0,
            create_time: new Date(),
          };

          const insertResult = await dataInserter.insertMallData(mallDataRecord);
          if (!insertResult.success) {
            console.log(`  -> 入库失败: ${insertResult.error}`);
            continue;
          }

          savedCount++;
          console.log(`  -> 保存成功 (id=${insertResult.insertId})`);
        }

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