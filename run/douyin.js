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

async function runDouyinCrawler() {
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--ignore-certificate-errors',
      '--ignore-ssl-errors',
      '--disable-web-security',
      '--allow-running-insecure-content'
    ]
  });

  const storageStatePath = path.join(__dirname, '../storage/douyin_storageState.json');
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: fs.existsSync(storageStatePath) ? storageStatePath : undefined,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0'
    }
  });

  const page = await context.newPage();

  await page.evaluate(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined
    });
    Object.defineProperty(navigator, 'languages', {
      get: () => ['zh-CN', 'zh', 'en']
    });
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5]
    });
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => 8
    });
    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => 8
    });
  });

  // 确保 storage 目录存在
  const storageDir = path.join(__dirname, '../storage');
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
    console.log('已创建 storage 目录');
  }

  let loginModalHandled = false;

  const waitForAndHandleLoginModal = async () => {
    try {
      const loginModalSelectors = [
        '[class*="login-modal"]',
        '[class*="login-container"]',
        '[class*="login-box"]',
        '[class*="login-dialog"]',
        '[class*="passport"]',
        '.login-modal',
        '.login-wrapper',
        '[data-e2e="login-modal"]'
      ];

      for (const sel of loginModalSelectors) {
        const modal = page.locator(sel).first();
        if (await modal.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log(`发现登录弹窗: ${sel}`);

          if (!loginModalHandled) {
            loginModalHandled = true;
            console.log('========================================');
            console.log('抖音需要登录，请使用手机扫码或验证码登录');
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

  const applyFilterSettings = async () => {
    try {
      console.log('步骤3: 等待页面完全加载...');
      await sleep(randomDelay(3000, 5000));

      console.log('步骤4: 查找筛选按钮...');

      const filterButtonSelectors = [
        '[data-e2e="search-filter-button"]',
        '[class*="filter"]',
        '[class*="screen"]',
        'button[class*="filter"]',
        'div[class*="filter"]'
      ];

      let filterButton = null;
      for (const selector of filterButtonSelectors) {
        try {
          const btn = page.locator(selector).first();
          if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log(`找到筛选按钮: ${selector}`);
            filterButton = btn;
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!filterButton) {
        console.log('未找到筛选按钮，可能页面结构已变化或不需要筛选');
        return false;
      }

      console.log('点击筛选按钮...');
      await filterButton.click({ force: true });
      await sleep(randomDelay(1000, 2000));

      console.log('步骤5: 选择"排序依据：最新发布"...');

      const sortOptions = [
        { text: '最新发布', selector: '[data-e2e="sort-latest"]' },
        { text: '最新', selector: '[class*="latest"]' },
        { text: '综合排序', selector: '[data-e2e="sort-comprehensive"]' }
      ];

      let sortOptionFound = false;
      for (const option of sortOptions) {
        try {
          const sortBtn = page.locator(option.selector).first();
          if (await sortBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            console.log(`找到排序选项: ${option.text}`);
            await sortBtn.click({ force: true });
            sortOptionFound = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!sortOptionFound) {
        console.log('未找到排序选项，尝试通过文本查找...');
        try {
          const latestText = page.getByText('最新发布').first();
          if (await latestText.isVisible({ timeout: 3000 }).catch(() => false)) {
            await latestText.click({ force: true });
            sortOptionFound = true;
          }
        } catch (e) {
          console.log('通过文本查找排序选项失败');
        }
      }

      if (sortOptionFound) {
        console.log('排序设置已应用，等待页面重新加载...');
        await sleep(randomDelay(3000, 5000));
      } else {
        console.log('排序选项设置失败，继续执行采集');
      }

      return sortOptionFound;
    } catch (e) {
      console.log('应用筛选设置出错:', e.message);
      return false;
    }
  };

  const collectPageData = async () => {
    const data = [];
    try {
      await sleep(randomDelay(2000, 4000));

      console.log('开始采集页面数据...');
      console.log('检查页面高度:', await page.evaluate(() => document.body.scrollHeight));

      let items;
      let count = 0;

      const containerSelectors = [
        '[data-e2e="search-result"]',
        '[class*="search-result"]',
        '[class*="video-list"]',
        '[class*="feed-list"]',
        '[class*="item-container"]',
        '[class*="list"]',
        '.search-result',
        '.video-list'
      ];

      let containerFound = false;
      for (const selector of containerSelectors) {
        try {
          const container = page.locator(selector);
          const isVisible = await container.isVisible({ timeout: 3000 }).catch(() => false);
          if (isVisible) {
            const foundItems = container.locator('[class*="video-item"], [class*="item"], [data-e2e*="video"]');
            count = await foundItems.count();
            if (count > 0) {
              items = foundItems;
              console.log(`在 ${selector} 中找到 ${count} 个列表项`);
              containerFound = true;
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }

      if (!containerFound) {
        console.log('未找到特定容器，尝试直接查找所有可能的项目...');
        const allPossibleItems = page.locator('[class*="video-item"], [class*="item"], [class*="card"], [class*="content"]');
        count = await allPossibleItems.count();
        if (count > 0) {
          items = allPossibleItems;
          console.log(`直接找到 ${count} 个列表项`);
          containerFound = true;
        }
      }

      if (!containerFound || count === 0) {
        console.log('未找到任何列表项，请检查页面是否正确加载');
        const pageContent = await page.content();
        const hasData = pageContent.includes('video') || pageContent.includes('item') || pageContent.includes('内容');
        console.log('页面包含视频相关内容:', hasData);
        return [];
      }

      console.log(`开始遍历 ${count} 个元素...`);

      for (let i = 0; i < count; i++) {
        try {
          const allItems = page.locator('[class*="video-item"], [class*="item"], [class*="card"], [class*="content"]');
          const currentCount = await allItems.count();

          if (i >= currentCount) {
            console.log(`采集第 ${i + 1} 条失败: 元素已不存在`);
            continue;
          }

          const item = allItems.nth(i);

          try {
            await item.scrollIntoViewIfNeeded({ behavior: 'smooth', timeout: 10000 });
            await sleep(randomDelay(300, 800));
          } catch (e) {
            console.log(`滚动到元素失败: ${e.message}`);
          }

          let title = '';
          let imageUrl = '';
          let detailUrl = '';

          try {
            const html = await item.innerHTML();

            // 提取标题
            const titleMatch = html.match(/class="[^"]*BjLsdJMi[^"]*"[^>]*>([^<]+)/);
            if (titleMatch && titleMatch[1]) {
              title = titleMatch[1].trim();
            }

            if (!title) {
              const titleRegexes = [
                /class="[^"]*title[^"]*"[^>]*>([^<]+)/i,
                /class="[^"]*desc[^"]*"[^>]*>([^<]+)/i,
                /<h3[^>]*>([^<]+)<\/h3>/i,
                /<p[^>]*>([^<]{5,100})<\/p>/i
              ];
              for (const regex of titleRegexes) {
                const match = html.match(regex);
                if (match && match[1]) {
                  title = match[1].trim();
                  break;
                }
              }
            }

            // 提取图片
            const imgMatch = html.match(/<img[^>]*class="[^"]*fnWBjiik[^"]*CLKQRK0O[^"]*"[^>]*src="([^"]+)"/);
            if (imgMatch && imgMatch[1]) {
              imageUrl = imgMatch[1];
            }

            if (!imageUrl) {
              const imgSrcMatch = html.match(/<img[^>]*src="(https?:\/\/[^"]+)"[^>]*>/);
              if (imgSrcMatch && imgSrcMatch[1]) {
                imageUrl = imgSrcMatch[1];
              }
            }

            // 提取详情链接 - 增强版
            const detailUrlRegexes = [
              // 匹配 class="RY_wFBXl" 的 onclick 属性
              /class="[^"]*RY_wFBXl[^"]*"[^>]*onclick="[^"]*\/video\/(\d+)[^"]*"/,
              // 匹配任何包含 /video/ 的 onclick 属性
              /onclick="[^"]*\/video\/(\d+)[^"]*"/,
              // 匹配 href 中包含 /video/ 的链接
              /href="(https?:\/\/[^"]*\/video\/\d+[^"]*)"/,
              // 匹配相对路径的 video 链接
              /href="(\/video\/\d+[^"]*)"/,
              // 匹配 data-id 或类似属性
              /data-id="(\d+)"/,
              // 匹配 data-video-id 或类似属性
              /data-video-id="(\d+)"/,
              // 匹配任何包含数字的 video 链接模式
              /(\/video\/\d+)/
            ];

            for (const regex of detailUrlRegexes) {
              const match = html.match(regex);
              if (match) {
                if (match[1].startsWith('http')) {
                  detailUrl = match[1];
                } else if (match[1].startsWith('/video/')) {
                  detailUrl = 'https://www.douyin.com' + match[1];
                } else if (match[1].match(/^\d+$/)) {
                  // 如果匹配到纯数字，假设是 video ID
                  detailUrl = 'https://www.douyin.com/video/' + match[1];
                }
                if (detailUrl) {
                  break;
                }
              }
            }

            // 最后尝试从整个页面中提取 video ID
            if (!detailUrl) {
              const videoIdMatch = html.match(/\/video\/(\d+)/);
              if (videoIdMatch && videoIdMatch[1]) {
                detailUrl = 'https://www.douyin.com/video/' + videoIdMatch[1];
              }
            }

            // 调试信息
            if (detailUrl) {
              console.log(`找到详情链接: ${detailUrl}`);
            }
          } catch (e) {
            console.log(`HTML解析失败: ${e.message}`);
          }

          if (title || imageUrl || detailUrl) {
            data.push({
              title: title || '',
              imageUrl: imageUrl || '',
              detailUrl: detailUrl || '',
              source: 'douyin'
            });
            const showTitle = title ? title.substring(0, 30) : '(无标题)';
            const showImage = imageUrl ? '有图片' : '无图片';
            const showUrl = detailUrl ? detailUrl.substring(0, 50) : '(无链接)';
            console.log(`采集第 ${i + 1}/${count} 条: ${showTitle} | ${showImage} | ${showUrl}`);
          } else {
            console.log(`采集第 ${i + 1}/${count} 条: 未找到有效数据`);
          }

          if ((i + 1) % 3 === 0) {
            const batchDelay = randomDelay(2000, 4000);
            console.log(`批次采集完成，等待 ${batchDelay}ms...`);
            await sleep(batchDelay);
          }

          if (Math.random() > 0.7) {
            const smallDelay = randomDelay(500, 1500);
            await sleep(smallDelay);
          }

          if (data.length >= 20) {
            console.log(`\n========== 累计达到 ${data.length} 条，开始保存 ==========`);
            const savedCount = saveData(data);
            console.log(`成功保存 ${savedCount} 条新数据`);
            data.length = 0;
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
        '请求太频繁',
        '请求过于频繁',
        '系统繁忙',
        '请稍后重试',
        '访问过于频繁',
        '操作过于频繁'
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
    const maxSameHeightCount = 3;
    const scrollAttempts = 10;
    let currentAttempt = 0;

    while (sameHeightCount < maxSameHeightCount && currentAttempt < scrollAttempts) {
      if (await checkRateLimit()) {
        console.log('检测到限流，暂停采集...');
        await sleep(randomDelay(10000, 30000));
        continue;
      }

      const currentHeight = await page.evaluate(() => document.body.scrollHeight);
      console.log(`滚动尝试 ${currentAttempt + 1}/${scrollAttempts}, 当前页面高度: ${currentHeight}`);

      await page.evaluate((target) => {
        window.scrollTo({ top: target, behavior: 'smooth' });
      }, currentHeight - 200);
      await sleep(randomDelay(1000, 2000));

      const newHeight = await page.evaluate(() => document.body.scrollHeight);
      if (newHeight === currentHeight) {
        sameHeightCount++;
        console.log(`页面高度未变化 ${sameHeightCount}/${maxSameHeightCount}`);
      } else {
        sameHeightCount = 0;
      }

      currentAttempt++;
    }
    console.log('页面已加载完成');
  };

  try {
    console.log('步骤1: 检查是否已有登录状态...');
    if (fs.existsSync(storageStatePath)) {
      console.log('已找到登录状态文件，将自动使用已保存的登录状态');
    } else {
      console.log('未找到登录状态文件，需要进行登录');
    }

    console.log('步骤2: 打开抖音搜索页面');
    const targetUrl = 'https://www.douyin.com/search/%E8%A5%BF%E5%AE%89%E4%B8%AA%E4%BA%BA%E8%BD%AC%E8%AE%A9%E5%BA%97%E9%93%BA?aid=e4b34f4c-d923-4ffb-9dac-cb4cbb1fdcdb&type=general';

    const delayBeforeAccess = randomDelay(3000, 6000);
    console.log(`访问前等待 ${delayBeforeAccess}ms...`);
    await sleep(delayBeforeAccess);

    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    } catch (e) {
      console.log('页面加载超时，尝试继续执行:', e.message);
    }

    console.log('等待页面渲染...');
    await sleep(randomDelay(5000, 8000));

    console.log('尝试模拟人类滚动行为以加载更多内容...');
    await page.evaluate(() => {
      window.scrollBy(0, 300);
    });
    await sleep(randomDelay(1000, 2000));
    await page.evaluate(() => {
      window.scrollBy(0, -300);
    });
    await sleep(randomDelay(2000, 3000));

    await waitForAndHandleLoginModal();

    await applyFilterSettings();

    await waitForAndHandleLoginModal();

    let totalData = [];
    let pageIndex = 1;
    const maxPages = 10;
    const batchSize = 20;
    let consecutiveEmptyPages = 0;
    const maxConsecutiveEmptyPages = 3;

    while (pageIndex <= maxPages && consecutiveEmptyPages < maxConsecutiveEmptyPages) {
      if (await checkRateLimit()) {
        console.log('检测到限流，暂停采集...');
        await sleep(randomDelay(15000, 30000));
        continue;
      }

      console.log(`\n========== 第 ${pageIndex} 次采集 ==========`);

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

        if (totalData.length >= batchSize) {
          console.log(`\n========== 累计达到 ${totalData.length} 条，开始保存 ==========`);
          const savedCount = saveData(totalData);
          console.log(`成功保存 ${savedCount} 条新数据`);
          totalData = [];
        }
      }

      if (pageIndex < maxPages && consecutiveEmptyPages < maxConsecutiveEmptyPages) {
        console.log(`准备滚动加载第 ${pageIndex + 1} 页...`);
        await scrollAndLoad();

        const delayAfterScroll = randomDelay(2000, 4000);
        console.log(`滚动后等待 ${delayAfterScroll}ms...`);
        await sleep(delayAfterScroll);

        await waitForAndHandleLoginModal();
      }

      pageIndex++;
    }

    if (totalData.length > 0) {
      console.log(`\n========== 保存剩余数据 ==========`);
      console.log(`剩余 ${totalData.length} 条数据`);
      const savedCount = saveData(totalData, 'douyin.csv');
      console.log(`成功保存 ${savedCount} 条新数据`);
    }

    if (consecutiveEmptyPages >= maxConsecutiveEmptyPages) {
      console.log(`\n已连续 ${maxConsecutiveEmptyPages} 次未采集到数据，停止采集`);
    }

    const delayAfterSave = randomDelay(2000, 4000);
    await sleep(delayAfterSave);

  } catch (error) {
    console.error('抖音采集出错:', error);
  } finally {
    await browser.close();
  }
}

module.exports = runDouyinCrawler;
