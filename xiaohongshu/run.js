const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const storageStatePath = path.join(__dirname, 'storageState.json');
  const context = await browser.newContext({
    viewport: null,
    args: ['--start-maximized'],
    storageState: fs.existsSync(storageStatePath) ? storageStatePath : undefined
  });
  const page = await context.newPage();

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
      await page.waitForTimeout(2000);

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
          const item = items.nth(i);
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

          const textContent = await item.textContent();
          let publishTime = '';
          const timeMatch = textContent.match(/(\d+天前|\d+小时前|\d+分钟前|刚刚|今天|昨天|\d{4}-\d{2}-\d{2})/);
          if (timeMatch) {
            const timeDate = parsePublishTime(timeMatch[0]);
            publishTime = formatDateTime(timeDate);
          }

          if (detailUrl) {
            data.push({
              title: title || '',
              publishTime: publishTime || '',
              detailUrl: detailUrl || '',
              imageUrl: imageUrl || ''
            });
            const showTitle = title ? title.substring(0, 30) : '(无标题)';
            console.log(`采集第 ${i + 1}/${count} 条: ${showTitle} | ${publishTime}`);
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
            if (parts.length >= 7) {
              const url = parts[5];
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

      const csvHeader = '标题,发布时间,详情地址,图片\n';
      const csvData = newData.map(item =>
        `"${(item.title || '').replace(/"/g, '""')}","${(item.publishTime || '').replace(/"/g, '""')}","${(item.detailUrl || '').replace(/"/g, '""')}","${(item.imageUrl || '').replace(/"/g, '""')}"`
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

  const scrollAndLoad = async () => {
    let lastHeight = 0;
    let sameHeightCount = 0;
    const maxSameHeightCount = 5;

    while (sameHeightCount < maxSameHeightCount) {
      const currentHeight = await page.evaluate(() => document.body.scrollHeight);
      console.log(`当前页面高度: ${currentHeight}, 滚动到 ${currentHeight - 500}`);

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight - 500));
      await page.waitForTimeout(2000);

      const newHeight = await page.evaluate(() => document.body.scrollHeight);
      if (newHeight === currentHeight) {
        sameHeightCount++;
        console.log(`页面高度未变化 ${sameHeightCount}/${maxSameHeightCount}`);
      } else {
        sameHeightCount = 0;
      }

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight - 1000));
      await page.waitForTimeout(1500);
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
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000);

    await waitForAndHandleLoginModal();

    console.log('步骤3: 等待页面加载完成');
    await page.waitForSelector('.feeds-container', { timeout: 30000 });
    console.log('feeds-container 已找到');

    await waitForAndHandleLoginModal();

    let totalData = [];
    let pageIndex = 1;
    const maxPages = 10;

    while (pageIndex <= maxPages) {
      console.log(`\n========== 第 ${pageIndex} 次采集 ==========`);

      const pageData = await collectPageData();
      if (pageData.length === 0) {
        console.log('未采集到数据，可能已到底部');
      } else {
        totalData = totalData.concat(pageData);
        console.log(`本轮采集 ${pageData.length} 条, 累计 ${totalData.length} 条`);
      }

      if (pageIndex < maxPages) {
        console.log(`准备滚动加载第 ${pageIndex + 1} 页...`);
        await scrollAndLoad();
        await page.waitForTimeout(2000);
        await waitForAndHandleLoginModal();
      }

      pageIndex++;
    }

    console.log(`\n========== 开始保存数据 ==========`);
    console.log(`总计采集 ${totalData.length} 条数据`);

    const savedCount = saveData(totalData, 'xiaohongshu.csv');
    console.log(`成功保存 ${savedCount} 条新数据`);

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