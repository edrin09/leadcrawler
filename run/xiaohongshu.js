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

async function runXiaohongshuCrawler() {
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });
  const storageStatePath = path.join(__dirname, '../storage/xiaohongshu_storageState.json');
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

  const collectPageData = async () => {
    const data = [];
    try {
      // 等待页面稳定
      await sleep(randomDelay(1500, 3000));

      let items;
      let count = 0;

      // 尝试多种容器选择器
      const containerSelectors = [
        '.feeds-container',
        '.note-list',
        '.search-result',
        '.content-container',
        '.main-content'
      ];

      let containerFound = false;
      for (const selector of containerSelectors) {
        try {
          const container = page.locator(selector);
          if (await container.isVisible({ timeout: 5000 })) {
            items = container.locator('section.note-item');
            count = await items.count();
            console.log(`在 ${selector} 中找到 ${count} 个列表项`);
            containerFound = true;
            break;
          }
        } catch (e) {
          // 继续尝试下一个选择器
        }
      }

      // 如果没有找到容器，直接查找note-item
      if (!containerFound) {
        try {
          items = page.locator('section.note-item');
          count = await items.count();
          console.log(`直接找到 ${count} 个列表项`);
          containerFound = count > 0;
        } catch (e) {
          console.log('未找到任何列表项');
          return [];
        }
      }

      if (!containerFound || count === 0) {
        console.log('未找到任何列表项');
        return [];
      }

      for (let i = 0; i < count; i++) {
        try {
          // 重新获取元素，避免元素分离
          const currentItems = page.locator('section.note-item');
          const currentCount = await currentItems.count();

          if (i >= currentCount) {
            console.log(`采集第 ${i + 1} 条失败: 元素已不存在`);
            continue;
          }

          const item = currentItems.nth(i);

          // 模拟人类行为：滚动到当前元素（添加超时处理）
          try {
            await item.scrollIntoViewIfNeeded({ behavior: 'smooth', timeout: 10000 });
            await sleep(randomDelay(300, 800));
          } catch (e) {
            console.log(`滚动到元素失败: ${e.message}`);
            // 继续执行，不中断采集
          }

          // 模拟鼠标悬停（添加超时处理）
          try {
            await item.hover({ force: true, timeout: 5000 });
            await sleep(randomDelay(200, 500));
          } catch (e) {
            console.log(`悬停元素失败: ${e.message}`);
            // 继续执行，不中断采集
          }

          // 使用更精确的CSS选择器提取数据
          let detailUrl = '';
          try {
            // 精确查找带有特定class的a标签
            const coverLink = item.locator('a.cover.mask.ld');
            if (await coverLink.isVisible({ timeout: 5000 })) {
              const href = await coverLink.getAttribute('href');
              if (href) {
                detailUrl = href.startsWith('http') ? href : 'https://www.xiaohongshu.com' + href;
              }
            }

            // 如果没找到，尝试其他可能的链接
            if (!detailUrl) {
              const linkElements = item.locator('a[href]');
              const count = await linkElements.count();
              for (let j = 0; j < count; j++) {
                const linkElement = linkElements.nth(j);
                const href = await linkElement.getAttribute('href');
                if (href && (href.startsWith('/explore/') || href.startsWith('/note/'))) {
                  detailUrl = href.startsWith('http') ? href : 'https://www.xiaohongshu.com' + href;
                  break;
                }
              }
            }
          } catch (e) {
            console.log(`提取链接失败: ${e.message}`);
          }

          let title = '';
          try {
            // 查找a标签下的span[data-v-51ec0135]
            const titleElement = item.locator('a span[data-v-51ec0135]');
            if (await titleElement.isVisible({ timeout: 5000 })) {
              title = await titleElement.textContent();
              if (title) {
                title = title.trim();
              }
            }

            // 如果没找到，尝试其他可能的标题元素
            if (!title) {
              const altTitleElements = [
                item.locator('span.title'),
                item.locator('h3'),
                item.locator('p')
              ];
              for (const altElement of altTitleElements) {
                if (await altElement.isVisible({ timeout: 3000 })) {
                  title = await altElement.textContent();
                  if (title && title.trim()) {
                    title = title.trim();
                    break;
                  }
                }
              }
            }
          } catch (e) {
            console.log(`提取标题失败: ${e.message}`);
          }

          let imageUrl = '';
          try {
            // 查找带有特定class的img标签
            const imgElement = item.locator('img[data-v-c091d9e8]');
            if (await imgElement.isVisible({ timeout: 5000 })) {
              const src = await imgElement.getAttribute('src');
              const dataSrc = await imgElement.getAttribute('data-src');
              const dataOriginal = await imgElement.getAttribute('data-original');

              if (src && src.startsWith('http')) {
                imageUrl = src;
              } else if (dataSrc && dataSrc.startsWith('http')) {
                imageUrl = dataSrc;
              } else if (dataOriginal && dataOriginal.startsWith('http')) {
                imageUrl = dataOriginal;
              }
            }

            // 如果没找到，尝试其他可能的图片元素
            if (!imageUrl) {
              const altImgElement = item.locator('img').first();
              if (await altImgElement.isVisible({ timeout: 3000 })) {
                const src = await altImgElement.getAttribute('src');
                if (src && src.startsWith('http')) {
                  imageUrl = src;
                }
              }
            }
          } catch (e) {
            console.log(`提取图片失败: ${e.message}`);
          }

          let price = '';
          try {
            // 尝试提取价格信息
            const priceElements = [
              item.locator('[class*="price"]'),
              item.locator('[class*="money"]'),
              item.locator('span.price'),
              item.locator('div.price')
            ];

            for (const priceElement of priceElements) {
              if (await priceElement.isVisible()) {
                price = await priceElement.textContent();
                if (price && price.trim()) {
                  price = price.trim();
                  break;
                }
              }
            }
          } catch (e) {
            console.log(`提取价格失败: ${e.message}`);
          }

          let district = '';

          // 添加调试信息
          if (detailUrl) {
            data.push({
              title: title || '',
              district: district || '',
              price: price || '',
              imageUrl: imageUrl || '',
              detailUrl: detailUrl || '',
              source: 'xiaohongshu',
            });
            const showTitle = title ? title.substring(0, 30) : '(无标题)';
            const showPrice = price ? price : '(无价格)';
            const showImage = imageUrl ? '有图片' : '无图片';
            console.log(`采集第 ${i + 1}/${count} 条: ${showTitle} | ${showPrice} | ${showImage} | ${detailUrl}`);
          } else {
            console.log(`采集第 ${i + 1}/${count} 条: 未找到链接`);
          }

          // 每采集几条数据后添加随机延迟（仿人工操作）
          if ((i + 1) % 3 === 0) {
            const batchDelay = randomDelay(2000, 4000);
            console.log(`批次采集完成，等待 ${batchDelay}ms...`);
            await sleep(batchDelay);
          }

          // 随机添加小延迟，模拟人类操作
          if (Math.random() > 0.7) {
            const smallDelay = randomDelay(500, 1500);
            await sleep(smallDelay);
          }

          // 每采集20条数据就写入CSV文件
          if (data.length >= 20) {
            console.log(`\n========== 累计达到 ${data.length} 条，开始保存 ==========`);
            const savedCount = saveData(data);
            console.log(`成功保存 ${savedCount} 条新数据`);
            data.length = 0; // 清空已保存的数据
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
    const maxSameHeightCount = 3;
    const scrollAttempts = 10;
    let currentAttempt = 0;

    while (sameHeightCount < maxSameHeightCount && currentAttempt < scrollAttempts) {
      // 检测限流
      if (await checkRateLimit()) {
        console.log('检测到限流，暂停采集...');
        await sleep(randomDelay(10000, 30000));
        continue;
      }

      const currentHeight = await page.evaluate(() => document.body.scrollHeight);
      console.log(`滚动尝试 ${currentAttempt + 1}/${scrollAttempts}, 当前页面高度: ${currentHeight}`);

      // 模拟人类滚动行为
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
    try {
      await page.waitForSelector('.feeds-container', { timeout: 30000 });
      console.log('feeds-container 已找到');
    } catch (e) {
      console.log('未找到 feeds-container，尝试查找其他可能的容器...');
      await page.screenshot({ path: 'xiaohongshu_page_structure.png', fullPage: true });
      console.log('已保存页面结构截图: xiaohongshu_page_structure.png');

      // 尝试查找其他可能的容器
      const alternativeSelectors = [
        '.note-list',
        '.search-result',
        '.content-container',
        '.main-content',
        'section.note-item'
      ];

      let containerFound = false;
      for (const selector of alternativeSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          console.log(`找到替代容器: ${selector}`);
          containerFound = true;
          break;
        } catch (e) {
          // 继续尝试下一个选择器
        }
      }

      if (!containerFound) {
        console.log('未找到任何容器元素，可能页面结构已变化');
        const pageContent = await page.content();
        fs.writeFileSync('xiaohongshu_page_content.html', pageContent);
        console.log('已保存页面内容: xiaohongshu_page_content.html');
      }
    }

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
          const savedCount = saveData(totalData);
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
    if (page) {
      await page.screenshot({ path: 'xiaohongshu_error.png' });
      console.log('已保存错误截图: xiaohongshu_error.png');
    }
  } finally {
    console.log('关闭浏览器...');
    if (browser) {
      await browser.close();
    }
    console.log('浏览器已关闭');
  }
}

module.exports = runXiaohongshuCrawler;