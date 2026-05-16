const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { chromium } = require('playwright');
const fs = require('fs');
const { saveData } = require('../utils/storageFactory');
const dataInserter = require('../src/inserter/dataInserter');

const PHONE_PATTERNS = {
    exact: [
        /1[3-9]\d{9}/g,
        /1[3-9]\d{2}[-.\s]?\d{4}[-.\s]?\d{4}/g,
    ],
    special: [
        /0\d{2,3}[-.]?\d{7,8}/g,
    ]
};

function cleanPhone(phone) {
    let cleaned = phone.replace(/[-\s()（）·*.。_]/g, '');
    
    const invalidPatterns = [
        /^0{2,}/,
        /^1[012]/,
        /^0123456789$/,
        /^0+[1-9]0+$/,
        /^\d{3,4}0{4,}$/,
        /^0{3,}\d+$/,
        /^400\d+$/,
        /^800\d+$/,
    ];
    
    for (const pattern of invalidPatterns) {
        if (pattern.test(cleaned)) {
            return null;
        }
    }
    
    if (cleaned.startsWith('1') && cleaned.length === 11) {
        const second = cleaned[1];
        if (['3', '4', '5', '6', '7', '8', '9'].includes(second)) {
            const uniqueDigits = new Set(cleaned.split(''));
            if (uniqueDigits.size >= 2) {
                return cleaned;
            }
        }
        return null;
    }
    
    if (/^0\d{2,3}\d{7,8}$/.test(cleaned)) {
        return cleaned;
    }
    
    return null;
}

function extractPhones(text) {
    const phones = [];
    const seenPhones = new Set();
    const separatedMobilePattern = /1[3-9]\d[-.\s]?\d{4}[-.\s]?\d{4}/g;
    
    for (const group of ['exact', 'special']) {
        for (const pattern of PHONE_PATTERNS[group]) {
            const matches = text.match(pattern);
            if (matches) {
                for (const match of matches) {
                    const phone = cleanPhone(match);
                    if (phone && !seenPhones.has(phone)) {
                        phones.push(phone);
                        seenPhones.add(phone);
                    }
                }
            }
        }
    }
    
    const separatedMatches = text.match(separatedMobilePattern);
    if (separatedMatches) {
        for (const match of separatedMatches) {
            const phone = cleanPhone(match);
            if (phone && !seenPhones.has(phone)) {
                phones.push(phone);
                seenPhones.add(phone);
            }
        }
    }
    
    return phones.sort();
}

async function runGoofishCrawler() {
  const headlessMode = process.env.HEADLESS !== 'false';
  
  const browserArgs = [
    '--start-maximized',
    '--disable-blink-features=AutomationControlled',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--window-size=1920,1080',
    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
  ];

  const browser = await chromium.launch({ 
    headless: headlessMode,
    args: browserArgs,
    ignoreDefaultArgs: ['--enable-automation']
  });
  
  const storageStatePath = path.join(__dirname, '../storage/goofish_storageState.json');
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    geolocation: { latitude: 34.2658, longitude: 108.9549 },
    permissions: ['geolocation'],
    storageState: fs.existsSync(storageStatePath) ? storageStatePath : undefined,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
  });
  
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });
    Object.defineProperty(navigator, 'languages', {
      get: () => ['zh-CN', 'zh', 'en'],
    });
  });
  const page = await context.newPage();

  const closePopups = async () => {
    try {
      const closeSelectors = [
        '[class*="login-modal"] [class*="close"]',
        '[class*="login-modal"] button',
        '[class*="login"] [class*="close"]',
        '.login-modal-wrap [class*="close"]',
        '[class*="modal-wrap"] [class*="close"]',
        '[class*="modal"] [aria-label="关闭"]',
        '[class*="modal"] .icon-close',
        '[aria-label="关闭"]',
        '[class*="close"]'
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

  let loginModalHandled = false;

  const waitForAndCloseLoginModal = async () => {
    try {
      const loginModal = page.locator('[class*="login-modal-wrap"]');
      if (await loginModal.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('发现登录弹窗，等待30秒让用户登录...');
        const closeBtn = loginModal.locator('[class*="close"], button').first();

        if (!loginModalHandled) {
          loginModalHandled = true;
          console.log('等待30秒让用户完成登录...');
          const startTime = Date.now();
          while (Date.now() - startTime < 30000) {
            const isVisible = await loginModal.isVisible({ timeout: 500 }).catch(() => false);
            if (!isVisible) {
              console.log('用户登录完成，登录弹窗已关闭');
              break;
            }
            await page.waitForTimeout(1000);
          }
          const stillVisible = await loginModal.isVisible({ timeout: 1000 }).catch(() => false);
          if (stillVisible) {
            console.log('登录等待超时，关闭弹窗');
            if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
              await closeBtn.click({ force: true });
            }
          }
        } else {
          console.log('再次发现登录弹窗，直接关闭');
          if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await closeBtn.click({ force: true });
            await page.waitForTimeout(500);
          }
        }
      }
    } catch (e) {
      console.log('登录弹窗处理异常:', e.message);
    }
  };

  const scrollToLoadImages = async () => {
    console.log('滚动页面触发懒加载图片...');
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(500);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);
  };

  const extractDistrict = (textContent) => {
    const patterns = [
      /西安[市\s]*(雁塔|新城|碑林|莲湖|灞桥|未央|阎良|临潼|长安|高陵|鄠邑|周至|蓝田|咸阳|泾阳)/,
      /(雁塔|新城|碑林|莲湖|灞桥|未央|阎良|临潼|长安|高陵|鄠邑|周至|蓝田)区/,
      /(咸阳|泾阳|三原|淳化)县/,
      /西安/,
      /(雁塔|新城|碑林|莲湖|灞桥|未央|阎良|临潼|长安|高陵|鄠邑)/
    ];

    for (const pattern of patterns) {
      const match = textContent.match(pattern);
      if (match) {
        return match[0].trim();
      }
    }
    return '';
  };

  const collectPageData = async () => {
    const data = [];
    try {
      await page.waitForTimeout(2000);
      await scrollToLoadImages();

      const itemSelectors = [
        '[class*="feeds-item-wrap"]',
        '[class*="goods-item"]',
        '[class*="item-wrap"]',
        '[data-itemid]',
        '.goods-item',
        '[class*="listing-item"]',
        '[class*="product-item"]'
      ];

      let items = null;
      let usedSelector = '';

      for (const sel of itemSelectors) {
        const found = page.locator(sel);
        const count = await found.count();
        if (count > 5) {
          items = found;
          usedSelector = sel;
          break;
        }
      }

      if (!items) {
        console.log('未找到足够的列表元素');
        return [];
      }

      const count = await items.count();
      console.log(`使用 ${usedSelector} 共找到 ${count} 个列表项，开始采集...`);

      for (let i = 0; i < count; i++) {
        try {
          const item = items.nth(i);

          const itemHtml = await item.evaluate(el => el.outerHTML);

          let detailUrl = '';
          const hrefMatch = itemHtml.match(/href="([^"]*)"/);
          if (hrefMatch && hrefMatch[1]) {
            detailUrl = hrefMatch[1];
            if (!detailUrl.startsWith('http')) {
              detailUrl = 'https://www.goofish.com' + detailUrl;
            }
          }

          let imageUrl = '';
          const patterns = [
            /data-original="([^"]*)"/,
            /data-src="([^"]*)"/,
            /data-lazy-src="([^"]*)"/,
            /data-url="([^"]*)"/,
            /data-real-src="([^"]*)"/,
            /data-image="([^"]*)"/,
            /src="(https?:\/\/[^"]*(?:jpg|jpeg|png|gif|webp))"/,
            /src="([^"]*)"/
          ];

          for (const pattern of patterns) {
            const match = itemHtml.match(pattern);
            if (match && match[1]) {
              const candidate = match[1];
              if (!candidate.includes('600000000') && !candidate.includes('tps-2-2') && candidate.length > 20) {
                imageUrl = candidate;
                break;
              }
            }
          }

          let title = '';
          const titleMatch = itemHtml.match(/title="([^"]*)"/);
          const altMatch = itemHtml.match(/alt="([^"]*)"/);
          if (titleMatch && titleMatch[1]) {
            title = titleMatch[1];
          } else if (altMatch && altMatch[1]) {
            title = altMatch[1];
          }

          const textContent = await item.textContent();
          let price = '';
          const priceMatch = textContent.match(/¥[\d,]+|￥[\d,]+|\d+元|\d+\.\d{2}/);
          if (priceMatch) {
            price = priceMatch[0];
          }

          const district = extractDistrict(textContent);

          if (detailUrl || imageUrl) {
            data.push({
              title: title || '',
              district: district || '',
              price: price || '',
              imageUrl: imageUrl || '',
              detailUrl: detailUrl || '',
              source: 'goofish'
            });
            const showTitle = title ? title.substring(0, 20) : '(无标题)';
            console.log(`采集第 ${i + 1}/${count} 条: ${showTitle} | ${price} | ${district}}`);
            if (i < 3) {
              console.log(`  详情: ${detailUrl.substring(0, 60)}...`);
              console.log(`  图片: ${imageUrl.substring(0, 60)}...`);
            }
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

  const extractDetailPageWithBrowser = async (detailUrl) => {
    try {
      console.log(`  -> 正在访问详情页: ${detailUrl.substring(0, 50)}...`);
      
      const newPage = await context.newPage();
      await newPage.setViewportSize({ width: 1920, height: 1080 });
      
      try {
        await newPage.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await newPage.waitForTimeout(3000);
        
        await closePopupsOnPage(newPage);
        
        await newPage.evaluate(() => {
          window.scrollBy(0, 500);
        });
        await newPage.waitForTimeout(1000);
        
        const pageContent = await newPage.content();
        const pageText = await newPage.textContent('body');
        
        const phones = extractPhones(pageText + pageContent);
        
        console.log(`  -> 找到 ${phones.length} 个手机号`);
        if (phones.length > 0) {
          console.log(`  -> ${phones.join(', ')}`);
        }
        
        return {
          success: true,
          phones: phones,
          content: pageContent,
          text: pageText
        };
      } catch (e) {
        console.log(`  -> 访问详情页失败: ${e.message}`);
        return {
          success: false,
          phones: [],
          error: e.message
        };
      } finally {
        await newPage.close();
      }
    } catch (e) {
      console.log(`  -> 提取详情页异常: ${e.message}`);
      return {
        success: false,
        phones: [],
        error: e.message
      };
    }
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


  const clickNextPage = async () => {
    console.log('查找分页容器和下一页按钮...');

    const paginationSelectors = [
      '.search-footer-page-container--e02TuanR',
      '.search-pagination-container--nnaHMrYo',
      '.pagination',
      '[class*="pagination"]'
    ];

    for (const pagSel of paginationSelectors) {
      const paginationContainer = page.locator(pagSel).first();
      if (await paginationContainer.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`找到分页容器: ${pagSel}`);

        await paginationContainer.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);

        // 检查下一页按钮是否存在且可用
        const nextPageSelectors = [
          '.search-pagination-arrow-container--lt2kCP6J:not([disabled])',
          '.search-pagination-arrow-right--CKU78u4z',
          'text=">"',
          'a:has-text(">")',
          'button:has-text(">")'
        ];

        let foundNextPage = false;
        for (const sel of nextPageSelectors) {
          try {
            const el = paginationContainer.locator(sel).last();
            if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
              // 检查是否被禁用
              const isDisabled = await el.getAttribute('disabled') || await el.evaluate(el => el.classList.contains('disabled'));
              if (!isDisabled) {
                console.log(`找到下一页按钮: ${sel}`);
                await el.click({ force: true });
                return true;
              } else {
                console.log('下一页按钮已禁用');
              }
            }
          } catch (e) {
            console.log(`选择器 ${sel} 错误: ${e.message}`);
          }
        }

        // 检查是否有页码按钮
        const pageButtons = paginationContainer.locator('button, a').filter({ hasText: /^\d+$/ });
        const pageCount = await pageButtons.count();
        if (pageCount > 0) {
          console.log(`找到 ${pageCount} 个页码按钮`);
          // 检查当前页码是否为最后一页
          try {
            const currentPage = paginationContainer.locator('.active, .current');
            if (await currentPage.isVisible({ timeout: 500 }).catch(() => false)) {
              const currentPageText = await currentPage.textContent();
              console.log(`当前页码: ${currentPageText}`);
            }
          } catch (e) {
            console.log('获取当前页码失败:', e.message);
          }
        }

        // 没有找到可用的下一页按钮
        console.log('未找到可用的下一页按钮');
        return false;
      }
    }

    console.log('未找到分页容器');
    return false;
  };

  try {
    console.log('步骤1: 打开页面 https://www.goofish.com');
    await page.goto('https://www.goofish.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    await waitForAndCloseLoginModal();
    await closePopups();
    console.log('已打开首页');

    const keywords = (process.env.CRAWL_GOOFISH_KEYWORDS || '').split(',').filter(k => k.trim());

    console.log('开始关键词列表采集...');
    console.log(`共 ${keywords.length} 个关键词需要采集`);
    console.log('========================================');

    let totalSaved = 0;
    let totalPages = 0;

    for (let kwIndex = 0; kwIndex < keywords.length; kwIndex++) {
      const keyword = keywords[kwIndex].trim();

      console.log(`\n===== 关键词 ${kwIndex + 1}/${keywords.length}: "${keyword}" =====`);

      console.log('步骤2: 在搜索框输入关键词并回车');

      const searchSelectors = [
        'input[placeholder*="搜索"]',
        'input[type="text"]',
        'input[name*="keyword"]',
        '#keyword',
        '.search-input',
        'input[aria-label*="搜索"]',
        'input[role="combobox"]'
      ];

      let searchInput = null;
      for (const sel of searchSelectors) {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
          searchInput = el;
          console.log(`找到搜索框: ${sel}`);
          break;
        }
      }

      if (!searchInput) {
        console.log('未找到搜索框，截图并退出');
        await page.screenshot({ path: 'no_search_input.png' });
        throw new Error('未找到搜索框');
      }

      await searchInput.fill(keyword);
      await page.waitForTimeout(300);
      await searchInput.press('Enter');
      await page.waitForTimeout(3000);

      await waitForAndCloseLoginModal();
      await closePopups();
      console.log('已完成搜索');

      console.log('步骤3: 点击区域按钮');
      await page.waitForTimeout(1000);
      await waitForAndCloseLoginModal();

      const areaSelectors = [
        'text="区域"',
        '[class*="area"]',
        '[class*="region"]',
        '.areaText--mQJFfu1p'
      ];

      let areaBtn = null;
      for (const sel of areaSelectors) {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
          areaBtn = el;
          console.log(`找到区域按钮: ${sel}`);
          break;
        }
      }

      if (areaBtn) {
        console.log('点击区域按钮');
        await areaBtn.click({ force: true, timeout: 5000 });
        await page.waitForTimeout(2000);

        console.log('步骤4: 选择陕西');
        await page.waitForTimeout(1000);

        const shaanxiEl = page.locator('.provItem--gG8I2YJh').nth(27);
        if (await shaanxiEl.isVisible({ timeout: 1000 }).catch(() => false)) {
          console.log('陕西选项可见，直接点击');
          await shaanxiEl.click({ force: true, timeout: 5000 });
        } else {
          console.log('陕西选项不可见，使用evaluate强制点击');
          await shaanxiEl.evaluate((el) => {
            el.click();
          });
        }
        console.log('已点击陕西选项');

        await page.waitForTimeout(2000);

        console.log('步骤5: 选择西安');
        await page.waitForTimeout(1000);


        const xianSelectors = [
          '.cityItem--i2XU4Z0j',
          'text="西安"',
          '[class*="city"] div'
        ];

        let xianClicked = false;
        for (const sel of xianSelectors) {
          try {
            const xianEls = page.locator(sel);
            const count = await xianEls.count();

            for (let i = 0; i < count; i++) {
              const el = xianEls.nth(i);
              const text = await el.textContent();
              if (text && text.includes('西安')) {
                console.log(`找到西安选项，索引: ${i}`);
                if (await el.isVisible({ timeout: 500 }).catch(() => false)) {
                  await el.click({ force: true, timeout: 5000 });
                } else {
                  await el.evaluate((el) => el.click());
                }
                console.log('已点击西安选项');
                xianClicked = true;
                break;
              }
            }
            if (xianClicked) break;
          } catch (e) {
            console.log(`选择器 ${sel} 错误: ${e.message}`);
          }
        }

        await page.waitForTimeout(1000);

        console.log('步骤6: 点击"查看999+件宝贝"按钮');
        const viewBtnSelectors = ['text="查看999+件宝贝"', 'text="999+"'];
        for (const sel of viewBtnSelectors) {
          const el = page.locator(sel).first();
          if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
            console.log(`找到查看按钮: ${sel}`);
            await el.click({ force: true });
            break;
          }
        }

        await page.waitForTimeout(3000);
        await closePopups();
        console.log('已点击查看按钮');

        console.log('\n步骤7: 点击新发布并选择时间选项');
        await page.waitForTimeout(2000);

        // 点击新发布按钮
        const newPublishSelectors = [
          'text="新发布"',
          '[class*="new"][class*="publish"]',
          '[class*="sort"][class*="new"]',
          '.sort-item--new'
        ];

        let newPublishBtn = null;
        for (const sel of newPublishSelectors) {
          const el = page.locator(sel).first();
          if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
            newPublishBtn = el;
            console.log(`找到新发布按钮: ${sel}`);
            await el.click({ force: true });
            await page.waitForTimeout(1000);
            break;
          }
        }

        if (newPublishBtn) {
          // 检查登录状态（页面右上方如果显示"登录"则未登录）
          const isLoggedIn = !(await page.locator('text="登录"').isVisible({ timeout: 1000 }).catch(() => false));
          console.log(`登录状态: ${isLoggedIn ? '已登录' : '未登录'}`);

          // 选择时间选项

          if (isLoggedIn) {
            console.log('已登录，选择1天内');
            const oneDaySelectors = [
              'text="1天内"',
              '[data-value*="1"][data-value*="day"]',
              '[class*="time"][class*="1"]',
              '.time-option--1day'
            ];

            for (const sel of oneDaySelectors) {
              const el = page.locator(sel).first();
              if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
                await el.click({ force: true });
                console.log('已选择1天内');
                await page.waitForTimeout(2000);
                break;
              }
            }
          } else {
            console.log('未登录，选择最新');
            const latestSelectors = [
              'text="最新"',
              '[data-value*="latest"]',
              '[class*="latest"]',
              '.sort-option--latest'
            ];

            for (const sel of latestSelectors) {
              const el = page.locator(sel).first();
              if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
                await el.click({ force: true });
                console.log('已选择最新');
                await page.waitForTimeout(2000);
                break;
              }
            }
          }
        } else {
          console.log('未找到新发布按钮，跳过时间筛选');
        }

        console.log('');
        console.log('========================================');
        console.log('开始分页采集数据...');
        console.log('========================================');

        await dataInserter.initPool();

        let pageNumber = 1;

        while (true) {
          console.log(`\n------ 第 ${pageNumber} 页 ------`);
          const pageData = await collectPageData();

          if (pageData.length === 0) {
            console.log('本页无数据，停止采集');
            break;
          }

          console.log(`第 ${pageNumber} 页采集完成，共 ${pageData.length} 条数据`);

          let savedCount = 0;

          for (let i = 0; i < pageData.length; i++) {
            const item = pageData[i];
            const title = item.title ? item.title.substring(0, 30) : '(无标题)';
            console.log(`\n[${i + 1}/${pageData.length}] ${title}...`);

            if (!item.detailUrl) {
              console.log('  -> SKIP - 无详情URL');
              continue;
            }

            const existingId = await dataInserter.checkMallDataExists(item.detailUrl);
            if (existingId) {
              console.log(`  -> 已存在于数据库 (id=${existingId})，跳过`);
              continue;
            }

            const detailResult = await extractDetailPageWithBrowser(item.detailUrl);
            const phones = detailResult.success ? detailResult.phones : [];

            if (phones.length > 0) {
              console.log(`  -> 找到 ${phones.length} 个手机号: ${phones.join(', ')}`);
            } else {
              console.log(`  -> 未找到手机号`);
            }

            const mallDataRecord = {
              title: item.title || '',
              district: item.district || '',
              price: item.price || '',
              imageUrl: item.imageUrl || item.image_url || '',
              detailUrl: item.detailUrl,
              source: item.source || 'goofish',
              business_name: '',
              keywords: [],
              business_info: {},
              phone_count: phones.length,
              create_time: new Date(),
            };

            const insertResult = await dataInserter.insertMallData(mallDataRecord);
            if (!insertResult.success) {
              console.log(`  -> 插入数据库失败: ${insertResult.error}`);
              continue;
            }

            const mallDataId = insertResult.insertId;

            if (phones.length > 0) {
              const phoneRecords = phones.map(phone => ({
                mall_data_id: mallDataId,
                phone: phone,
                phone_type: phone.startsWith('1') ? 'mobile' : 'landline',
                confidence_level: 'medium',
                confidence_score: 50,
                source_count: 1,
                sources: [{ source: 'detail_page', url: item.detailUrl }],
                mall_data_url: item.detailUrl,
                mall_data_title: item.title || '',
                source_platform: 'goofish',
                create_time: new Date(),
              }));

              await dataInserter.insertPhoneRecords(phoneRecords);
              await dataInserter.updateMallDataPhoneCount(mallDataId, phones.length);
            }

            savedCount++;
            totalSaved++;
            console.log(`  -> 保存到数据库成功 (id=${mallDataId}, phones=${phones.length})`);

            const waitBetweenItems = Math.floor(Math.random() * 3) + 2;
            await page.waitForTimeout(waitBetweenItems * 1000);
          }

          if (savedCount === 0) {
            console.log('本页无新数据，停止采集');
            break;
          }

          const hasNextPage = await clickNextPage();
          if (!hasNextPage) {
            console.log('未找到下一页按钮，采集完成');
            break;
          }

          const randomWait = Math.floor(Math.random() * 8) + 3;
          console.log(`等待 ${randomWait} 秒后采集下一页...`);
          await page.waitForTimeout(randomWait * 1000);

          pageNumber++;
          totalPages++;
        }

        totalPages += pageNumber;
        console.log(`\n关键词 "${keyword}" 采集完成`);
        console.log(`\n成功采集并保存 ${totalSaved} 条新数据（共 ${totalPages} 页）`);
        console.log('========================================');
        await context.storageState({ path: storageStatePath });
        console.log('登录状态已保存');

        if (kwIndex < keywords.length - 1) {
          console.log('\n返回首页准备下一个关键词...');
          await page.goto('https://www.goofish.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
          await page.waitForTimeout(3000);
          await waitForAndCloseLoginModal();
          await closePopups();

          const waitBetweenKeywords = Math.floor(Math.random() * 8) + 5;
          console.log(`等待 ${waitBetweenKeywords} 秒后采集下一个关键词...`);
          await page.waitForTimeout(waitBetweenKeywords * 1000);
        }

      } else {
        console.log('未找到区域按钮，跳过区域选择步骤');
      }
    }

    console.log('流程执行完成!');
  } catch (error) {
    console.error('执行出错:', error.message);
    await page.screenshot({ path: 'error_screenshot.png' });
    console.log('已截图: error_screenshot.png');
  }

  await context.storageState({ path: storageStatePath });
  console.log('登录状态已保存');

  console.log('关闭浏览器...');
  await browser.close();
  console.log('浏览器已关闭');
}

module.exports = runGoofishCrawler;
