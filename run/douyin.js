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
  let loginAttempts = 0;
  const maxLoginAttempts = 3;

  const checkLoginRequired = async () => {
    try {
      const isLoggedIn = await checkIsLoggedIn();
      if (isLoggedIn) {
        console.log('已检测到登录状态，跳过登录检查');
        return false;
      }

      const pageContent = await page.content();
      
      if (pageContent.includes('window._SSR_DATA') || pageContent.includes('__INITIAL_STATE__')) {
        console.log('页面已加载数据，可能已登录');
        const contentLoaded = await checkContentLoaded();
        if (contentLoaded) {
          console.log('搜索结果已加载，认为已登录');
          return false;
        }
      }

      const loginTexts = [
        '请登录',
        '需要登录',
        '登录后',
        '登录才能',
        '登录体验',
        '登录查看',
        '登录观看',
        '登录账号',
        '手机号登录',
        '验证码登录',
        '扫码登录',
        '密码登录',
        '同意并登录',
        '登录即同意'
      ];

      for (const text of loginTexts) {
        if (pageContent.includes(text)) {
          console.log(`检测到登录提示文本: ${text}`);
          return true;
        }
      }

      const blockedContent = page.locator('[class*="blocked"], [class*="restrict"], [class*="limit"]');
      if (await blockedContent.count() > 0) {
        console.log('检测到内容限制元素');
        return true;
      }

      const pageTitle = await page.title();
      if (pageTitle.includes('登录') || pageTitle.includes('Login')) {
        console.log('页面标题包含登录提示');
        return true;
      }

    } catch (e) {
      console.log('登录检测异常:', e.message);
    }
    return false;
  };

  const checkContentLoaded = async () => {
    try {
      const contentSelectors = [
        '[data-e2e="search-result"]',
        '[class*="video-list"]',
        '[class*="feed-list"]',
        '.search-result',
        '.video-list',
        'article',
        'section'
      ];

      for (const selector of contentSelectors) {
        const elements = page.locator(selector);
        const count = await elements.count();
        if (count > 0) {
          console.log(`检测到内容元素: ${selector}, 数量: ${count}`);
          return true;
        }
      }

      const pageContent = await page.content();
      if (pageContent.includes('video') && pageContent.includes('title')) {
        console.log('页面包含视频内容');
        return true;
      }

    } catch (e) {
      console.log('内容检测异常:', e.message);
    }
    return false;
  };

  const checkIsLoggedIn = async () => {
    try {
      const loggedInIndicators = [
        '[class*="avatar"]',
        '[class*="user-info"]',
        '[class*="nickname"]',
        '[class*="username"]',
        '[class*="profile"]',
        '[data-e2e="user-avatar"]',
        '[data-e2e="user-info"]'
      ];

      for (const selector of loggedInIndicators) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log(`检测到已登录标识: ${selector}`);
          return true;
        }
      }

      const hasLoginText = await checkLoginRequired();
      if (!hasLoginText) {
        const pageContent = await page.content();
        if (pageContent.includes('退出') || pageContent.includes('我的') || pageContent.includes('个人中心')) {
          console.log('检测到已登录相关文本');
          return true;
        }
      }

    } catch (e) {
      console.log('登录状态检测异常:', e.message);
    }
    return false;
  };

  const saveLoginState = async () => {
    try {
      console.log('保存登录状态到 storageState.json...');
      await context.storageState({ path: storageStatePath });
      
      if (fs.existsSync(storageStatePath)) {
        const stats = fs.statSync(storageStatePath);
        console.log(`登录状态已保存，文件大小: ${stats.size} 字节`);
        
        const stateContent = fs.readFileSync(storageStatePath, 'utf-8');
        const state = JSON.parse(stateContent);
        const cookieCount = state.cookies ? state.cookies.length : 0;
        const originCount = state.origins ? state.origins.length : 0;
        console.log(`保存了 ${cookieCount} 个 cookies 和 ${originCount} 个 origins`);
        return true;
      } else {
        console.log('警告: 登录状态文件未创建');
        return false;
      }
    } catch (e) {
      console.error('保存登录状态失败:', e.message);
      return false;
    }
  };

  const handleSliderCaptcha = async () => {
    try {
      console.log('尝试处理滑块验证码...');
      
      const sliderSelectors = [
        '[class*="slider"]',
        '[class*="drag"]',
        '[class*="captcha"] button',
        '.captcha-slider',
        '.verify-slider',
        '[role="slider"]',
        'div[draggable="true"]'
      ];

      let slider = null;
      for (const selector of sliderSelectors) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
          slider = element;
          console.log(`找到滑块元素: ${selector}`);
          break;
        }
      }

      if (!slider) {
        console.log('未找到滑块元素');
        return false;
      }

      const sliderBox = await slider.boundingBox();
      if (!sliderBox) {
        console.log('无法获取滑块位置');
        return false;
      }

      const targetAreaSelectors = [
        '[class*="target"]',
        '[class*="gap"]',
        '[class*="hole"]',
        '[class*="puzzle"]'
      ];

      let targetPosition = sliderBox.width * 1.5;
      for (const selector of targetAreaSelectors) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
          const box = await element.boundingBox();
          if (box) {
            targetPosition = box.x - sliderBox.x;
            console.log(`找到目标位置: ${targetPosition}px`);
            break;
          }
        }
      }

      console.log(`准备拖动滑块，目标位置: ${targetPosition}px`);
      
      await page.mouse.move(sliderBox.x + sliderBox.width / 2, sliderBox.y + sliderBox.height / 2);
      await page.mouse.down();
      
      const steps = 20;
      const stepDuration = 100;
      const stepDistance = targetPosition / steps;
      
      for (let i = 1; i <= steps; i++) {
        const currentX = sliderBox.x + sliderBox.width / 2 + stepDistance * i;
        const currentY = sliderBox.y + sliderBox.height / 2 + Math.sin(i / steps * Math.PI) * 5;
        await page.mouse.move(currentX, currentY);
        await page.waitForTimeout(stepDuration / steps);
      }
      
      await page.waitForTimeout(100);
      await page.mouse.up();
      
      console.log('滑块拖动完成');
      await page.waitForTimeout(2000);

      const success = await checkContentLoaded();
      if (success) {
        console.log('滑块验证可能成功');
        return true;
      }
      
      console.log('滑块验证可能失败，请手动完成验证');
      return false;
      
    } catch (e) {
      console.error('滑块验证处理失败:', e.message);
      return false;
    }
  };

  const waitForAndHandleLoginModal = async () => {
    try {
      const loginModalSelectors = [
        '[class*="login-modal"]',
        '[class*="login-container"]',
        '[class*="login-box"]',
        '[class*="login-dialog"]',
        '[class*="passport"]',
        '[class*="auth-modal"]',
        '[class*="captcha"]',
        '[class*="login-form"]',
        '[class*="login-btn"]',
        '.login-modal',
        '.login-wrapper',
        '.auth-modal',
        '[data-e2e="login-modal"]',
        '[data-e2e="login"]',
        'div[role="dialog"]',
        '.dy-login-container',
        '.dy-passport-modal',
        '[class*="VerificationModal"]',
        '[class*="verify-modal"]',
        '[class*="security"]',
        '[class*="validate-modal"]',
        '[class*="confirm-modal"]',
        '[class*="dialog-container"]',
        '[class*="modal-content"]'
      ];

      let foundModal = null;
      let foundSelector = '';

      for (const sel of loginModalSelectors) {
        const modal = page.locator(sel).first();
        if (await modal.isVisible({ timeout: 2000 }).catch(() => false)) {
          const boundingBox = await modal.boundingBox();
          if (boundingBox && boundingBox.width > 100 && boundingBox.height > 100) {
            foundModal = modal;
            foundSelector = sel;
            console.log(`发现登录弹窗: ${sel}`);
            break;
          }
        }
      }

      if (!foundModal) {
        const hasLoginText = await checkLoginRequired();
        if (hasLoginText && !loginModalHandled) {
          console.log('未找到明确的登录弹窗，但检测到登录相关内容');
          foundModal = page.locator('body').first();
          foundSelector = 'body (login text detected)';
        }
      }

      if (foundModal) {
        if (!loginModalHandled || loginAttempts < maxLoginAttempts) {
          loginModalHandled = true;
          loginAttempts++;
          console.log('========================================');
          console.log(`抖音需要登录 (第 ${loginAttempts} 次尝试)`);
          console.log('请使用手机扫码或验证码登录');
          console.log('登录成功后脚本将自动继续运行...');
          console.log('========================================');

          const startTime = Date.now();
          const waitTime = 300000;
          const checkInterval = 2000;
          let lastLoginCheck = true;
          let stableCount = 0;
          
          while (Date.now() - startTime < waitTime) {
            let isVisible = false;
            try {
              isVisible = await foundModal.isVisible({ timeout: 1000 });
            } catch (e) {
              isVisible = false;
            }
            
            const hasLoginText = await checkLoginRequired();
            
            if (!isVisible && !hasLoginText) {
              stableCount++;
              console.log(`登录弹窗已关闭且无登录文本 (连续 ${stableCount}/3 次确认)`);
              
              if (stableCount >= 3) {
                console.log('登录成功确认！');
                await saveLoginState();
                return true;
              }
            } else {
              stableCount = 0;
              
              if (!isVisible && hasLoginText && lastLoginCheck) {
                console.log('弹窗已关闭但仍有登录文本，继续等待...');
              } else if (isVisible && !hasLoginText) {
                console.log('弹窗仍在但无登录文本，可能已登录');
              }
            }
            
            const pageContent = await page.content();
            if (pageContent.includes('验证') && (pageContent.includes('滑块') || pageContent.includes('拖动') || pageContent.includes('拼图'))) {
              console.log('检测到滑块验证码，尝试自动处理...');
              await handleSliderCaptcha();
            }
            
            lastLoginCheck = hasLoginText;
            await page.waitForTimeout(checkInterval);
            
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const remaining = Math.floor((waitTime - (Date.now() - startTime)) / 1000);
            if (elapsed % 10 === 0) {
              console.log(`等待登录中... 已等待 ${elapsed} 秒，剩余 ${remaining} 秒`);
            }
          }

          console.log('等待登录超时，但继续执行...');
          return false;
        } else {
          console.log('再次发现登录弹窗，尝试关闭...');
          const closeBtn = foundModal.locator('[class*="close"], button, [aria-label="关闭"], [class*="cancel"], [class*="dismiss"]').first();
          if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await closeBtn.click({ force: true });
            await page.waitForTimeout(1000);
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

    console.log('检查是否需要登录...');
    const hasLoginModal = await waitForAndHandleLoginModal();
    
    if (!hasLoginModal) {
      console.log('未检测到登录弹窗，检查是否已登录...');
      const isLoggedIn = await checkIsLoggedIn();
      if (isLoggedIn) {
        console.log('检测到用户已登录');
        if (!fs.existsSync(storageStatePath)) {
          console.log('首次运行且已登录，保存登录状态...');
          await saveLoginState();
        }
      } else {
        const hasLoginText = await checkLoginRequired();
        if (!hasLoginText) {
          console.log('页面无登录相关内容，可能已登录（备用检测）');
          if (!fs.existsSync(storageStatePath)) {
            console.log('首次运行，尝试保存登录状态...');
            await saveLoginState();
          }
        }
      }
    }

    await applyFilterSettings();

    await waitForAndHandleLoginModal();
    
    console.log('========================================');
    console.log('提示: 登录后如果状态未自动保存，可以：');
    console.log('1. 在浏览器控制台执行: console.log("save-login-state")');
    console.log('2. 或者等待页面加载完成后重新运行脚本');
    console.log('========================================');
    
    page.on('console', async (msg) => {
      if (msg.text().includes('save-login-state')) {
        console.log('收到手动保存登录状态请求...');
        await saveLoginState();
      }
    });

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
