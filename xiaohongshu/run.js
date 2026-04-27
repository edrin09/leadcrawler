const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { saveData } = require('../utils/saveCsv');

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });
  const storageStatePath = path.join(__dirname, 'storageState.json');
  const context = await browser.newContext({
    viewport: null,
    args: ['--start-maximized'],
    storageState: fs.existsSync(storageStatePath) ? storageStatePath : undefined,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
    extraHTTPHeaders: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    }
  });

  const page = await context.newPage();

  // 禁用自动化检测
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined
    });
    Object.defineProperty(navigator, 'languages', {
      get: () => ['zh-CN', 'zh', 'en']
    });
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3]
    });
  });

  const outputDir = path.join(__dirname, '../output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let loginModalHandled = false;

  const waitForAndHandleLoginModal = async () => {
    try {
      const loginModalSelectors = [
        '[class*="login-modal"]',
        '[class*="login-modal-wrap"]',
        '[class*="login-container"]',
        '[class*="login-box"]',
        '[class*="login-dialog"]',
        '.login-modal',
        '.login-wrapper',
        '[data-component="login"]'
      ];

      for (const sel of loginModalSelectors) {
        const modal = page.locator(sel).first();
        if (await modal.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log(`发现登录弹窗: ${sel}`);

          if (!loginModalHandled) {
            loginModalHandled = true;
            console.log('========================================');
            console.log('小红书需要登录，请使用手机扫码或验证码登录');
            console.log('登录成功后脚本将自动继续运行...');
            console.log('========================================');

            const startTime = Date.now();
            const waitTime = 120000;
            while (Date.now() - startTime < waitTime) {
              const isVisible = await modal.isVisible({ timeout: 1000 }).catch(() => false);
              if (!isVisible) {
                console.log('登录成功，弹窗已关闭！');

                console.log('保存登录状态到 storageState.json...');
                await context.storageState({ path: storageStatePath });
                console.log('登录状态已保存，下次运行将自动使用');

                return true;
              }
              if (Math.floor((Date.now() - startTime) / 10000) > 0 &&
                (Date.now() - startTime) % 10000 < 500) {
                console.log(`等待登录中... 已等待 ${Math.floor((Date.now() - startTime) / 1000)} 秒`);
              }
              await page.waitForTimeout(1000);
            }

            console.log('等待登录超时，但继续执行...');
            return false;
          } else {
            console.log('再次发现登录弹窗，尝试关闭...');
            const closeBtn = modal.locator('[class*="close"], button, [aria-label="关闭"]').first();
            if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
              await closeBtn.click({ force: true });
              await page.waitForTimeout(500);
            }
          }
        }
      }
    } catch (e) {
      console.log('登录弹窗检测异常:', e.message);
    }
    return false;
  };

  const parsePublishTime = (timeText) => {
    const now = new Date();
    const timeMatch = timeText.match(/(\d+)天前|(\d+)小时前|(\d+)分钟前|刚刚|今天|昨天|(\d{4}-\d{2}-\d{2})/);

    if (timeMatch) {
      if (timeMatch[1]) {
        const days = parseInt(timeMatch[1]);
        if (!isNaN(days)) {
          return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        }
      } else if (timeMatch[2]) {
        const hours = parseInt(timeMatch[2]);
        if (!isNaN(hours)) {
          return new Date(now.getTime() - hours * 60 * 60 * 1000);
        }
      } else if (timeMatch[3]) {
        const minutes = parseInt(timeMatch[3]);
        if (!isNaN(minutes)) {
          return new Date(now.getTime() - minutes * 60 * 1000);
        }
      } else if (timeMatch[4]) {
        const date = new Date(timeMatch[4]);
        if (!isNaN(date.getTime())) {
          return date;
        }
      } else if (timeMatch[0] === '今天' || timeMatch[0] === '刚刚') {
        return now;
      } else if (timeMatch[0] === '昨天') {
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }
    }
    return now;
  };

  const formatDateTime = (date) => {
    if (!date || isNaN(date.getTime())) {
      return '';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const collectPageData = async () => {
    const data = [];
    try {
      // 等待页面稳定
      await sleep(randomDelay(1500, 3000));

      const container = page.locator('.feeds-container');
      if (!await container.isVisible({ timeout: 5000 })) {
        console.log('未找到 feeds-container 容器');
        return [];
      }

      const items = container.locator('section.note-item');
      const count = await items.count();
      console.log(`共找到 ${count} 个列表项`);

      for (let i = 0; i < count; i++) {
        try {
          // 模拟人类行为：滚动到当前元素
          const item = items.nth(i);
          await item.scrollIntoViewIfNeeded({ behavior: 'smooth' });
          await sleep(randomDelay(300, 800));

          // 模拟鼠标悬停
          await item.hover({ force: true });
          await sleep(randomDelay(200, 500));

          const itemHtml = await item.evaluate(el => el.outerHTML);

          let detailUrl = '';
          const linkMatch = itemHtml.match(/href="(\/explore\/[^"]*)"/);
          if (linkMatch && linkMatch[1]) {
            detailUrl = 'https://www.xiaohongshu.com' + linkMatch[1];
          }

          let title = '';
          const titleMatch = itemHtml.match(/title="([^"]*)"/);
          if (titleMatch && titleMatch[1]) {
            title = titleMatch[1];
          }

          let imageUrl = '';
          const imgPatterns = [
            /data-src="([^"]*)"/,
            /src="(https?:\/\/[^"]*(?:jpg|jpeg|png|gif|webp))"/,
            /background-image:\s*url\("([^"]*)"\)/
          ];
          for (const pattern of imgPatterns) {
            const match = itemHtml.match(pattern);
            if (match && match[1]) {
              imageUrl = match[1];
              break;
            }
          }


          if (detailUrl) {
            data.push({
              title: title || '',
              district: district || '',
              imageUrl: imageUrl || '',
              detailUrl: detailUrl || '',
              source: 'xiaohongshu',
            });
            const showTitle = title ? title.substring(0, 30) : '(无标题)';
            console.log(`采集第 ${i + 1}/${count} 条: ${showTitle}`);
          }

          // 每采集几条数据后添加随机延迟
          if ((i + 1) % 3 === 0) {
            const batchDelay = randomDelay(1000, 2000);
            console.log(`批次采集完成，等待 ${batchDelay}ms...`);
            await sleep(batchDelay);
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





  const checkRateLimit = async () => {
    try {
      const rateLimitTexts = [
        '请求太频繁，请稍后再试',
        '请求过于频繁',
        '系统繁忙',
        '请稍后重试',
        '访问过于频繁'
      ];

      const pageContent = await page.content();
      for (const text of rateLimitTexts) {
        if (pageContent.includes(text)) {
          console.log(`检测到限流提示: ${text}`);
          return true;
        }
      }

      const rateLimitElements = page.locator('[class*="rate-limit"], [class*="warning"], [class*="error"]');
      if (await rateLimitElements.count() > 0) {
        console.log('检测到限流元素');
        return true;
      }
    } catch (e) {
      console.log('检测限流出错:', e.message);
    }
    return false;
  };

  const scrollAndLoad = async () => {
    let lastHeight = 0;
    let sameHeightCount = 0;
    const maxSameHeightCount = 5;

    while (sameHeightCount < maxSameHeightCount) {
      // 检测限流
      if (await checkRateLimit()) {
        console.log('检测到限流，暂停采集...');
        await sleep(randomDelay(10000, 30000));
        continue;
      }

      const currentHeight = await page.evaluate(() => document.body.scrollHeight);
      console.log(`当前页面高度: ${currentHeight}, 滚动到 ${currentHeight - 500}`);

      // 模拟人类滚动行为
      await page.evaluate((target) => {
        window.scrollTo({ top: target, behavior: 'smooth' });
      }, currentHeight - 500);
      await sleep(randomDelay(1500, 3000));

      const newHeight = await page.evaluate(() => document.body.scrollHeight);
      if (newHeight === currentHeight) {
        sameHeightCount++;
        console.log(`页面高度未变化 ${sameHeightCount}/${maxSameHeightCount}`);
      } else {
        sameHeightCount = 0;
      }

      // 再次滚动到更底部
      await page.evaluate((target) => {
        window.scrollTo({ top: target, behavior: 'smooth' });
      }, newHeight - 1000);
      await sleep(randomDelay(1000, 2000));
    }
    console.log('页面已加载到底部');
  };

  try {
    console.log('步骤1: 检查是否已有登录状态...');
    if (fs.existsSync(storageStatePath)) {
      console.log('已找到登录状态文件，将自动使用已保存的登录状态');
    } else {
      console.log('未找到登录状态文件，需要进行登录');
    }

    console.log('步骤2: 打开小红书搜索页面');
    const targetUrl = 'https://www.xiaohongshu.com/search_result/?keyword=%E8%A5%BF%E5%AE%89%E5%BA%97%E9%93%BA%E8%BD%AC%E8%AE%A9%E4%B8%AA%E4%BA%BA&source=web_search_result_notes&type=51';

    // 访问前添加随机延迟
    const delayBeforeAccess = randomDelay(2000, 5000);
    console.log(`访问前等待 ${delayBeforeAccess}ms...`);
    await sleep(delayBeforeAccess);

    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // 访问后添加随机延迟
    const delayAfterAccess = randomDelay(3000, 6000);
    console.log(`页面加载后等待 ${delayAfterAccess}ms...`);
    await sleep(delayAfterAccess);

    await waitForAndHandleLoginModal();

    console.log('步骤3: 等待页面加载完成');
    await page.waitForSelector('.feeds-container', { timeout: 30000 });
    console.log('feeds-container 已找到');

    await waitForAndHandleLoginModal();

    let totalData = [];
    let pageIndex = 1;
    const maxPages = 10;
    const batchSize = 20;
    let consecutiveEmptyPages = 0;
    const maxConsecutiveEmptyPages = 3;

    while (pageIndex <= maxPages && consecutiveEmptyPages < maxConsecutiveEmptyPages) {
      // 检测限流
      if (await checkRateLimit()) {
        console.log('检测到限流，暂停采集...');
        await sleep(randomDelay(15000, 30000));
        continue;
      }

      console.log(`\n========== 第 ${pageIndex} 次采集 ==========`);

      // 采集前添加随机延迟
      const delayBeforeCollect = randomDelay(1000, 3000);
      console.log(`采集前等待 ${delayBeforeCollect}ms...`);
      await sleep(delayBeforeCollect);

      const pageData = await collectPageData();
      if (pageData.length === 0) {
        console.log('未采集到数据，可能已到底部');
        consecutiveEmptyPages++;
        console.log(`连续未采集到数据 ${consecutiveEmptyPages}/${maxConsecutiveEmptyPages}`);
      } else {
        consecutiveEmptyPages = 0;
        totalData = totalData.concat(pageData);
        console.log(`本轮采集 ${pageData.length} 条, 累计 ${totalData.length} 条`);

        // 每20条数据保存一次
        if (totalData.length >= batchSize) {
          console.log(`\n========== 累计达到 ${totalData.length} 条，开始保存 ==========`);
          const savedCount = saveData(totalData, 'xiaohongshu.csv');
          console.log(`成功保存 ${savedCount} 条新数据`);
          totalData = []; // 清空已保存的数据
        }
      }

      if (pageIndex < maxPages && consecutiveEmptyPages < maxConsecutiveEmptyPages) {
        console.log(`准备滚动加载第 ${pageIndex + 1} 页...`);
        await scrollAndLoad();

        // 滚动后添加随机延迟
        const delayAfterScroll = randomDelay(2000, 4000);
        console.log(`滚动后等待 ${delayAfterScroll}ms...`);
        await sleep(delayAfterScroll);

        await waitForAndHandleLoginModal();
      }

      pageIndex++;
    }

    // 保存剩余数据
    if (totalData.length > 0) {
      console.log(`\n========== 保存剩余数据 ==========`);
      console.log(`剩余 ${totalData.length} 条数据`);
      const savedCount = saveData(totalData, 'xiaohongshu.csv');
      console.log(`成功保存 ${savedCount} 条新数据`);
    }

    if (consecutiveEmptyPages >= maxConsecutiveEmptyPages) {
      console.log(`\n已连续 ${maxConsecutiveEmptyPages} 次未采集到数据，停止采集`);
    }

    // 保存后添加随机延迟
    const delayAfterSave = randomDelay(2000, 4000);
    console.log(`保存后等待 ${delayAfterSave}ms...`);
    await sleep(delayAfterSave);

    console.log('\n采集完成!');
    await page.screenshot({ path: 'xiaohongshu_done.png', fullPage: true });
    console.log('已保存完成截图: xiaohongshu_done.png');

  } catch (e) {
    console.log('执行出错:', e.message);
    await page.screenshot({ path: 'xiaohongshu_error.png' });
    console.log('已保存错误截图: xiaohongshu_error.png');
  }

  await browser.close();
})();