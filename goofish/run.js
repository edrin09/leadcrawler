const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: null,
    args: ['--start-maximized'],
    geolocation: { latitude: 34.2658, longitude: 108.9549 },
    permissions: ['geolocation']
  });
  const page = await context.newPage();

  const outputDir = path.join(__dirname, '../output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

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
    } catch (e) {}
  };

  const waitForAndCloseLoginModal = async () => {
    try {
      const loginModal = page.locator('[class*="login-modal-wrap"]');
      if (await loginModal.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('发现登录弹窗，尝试关闭');
        const closeBtn = loginModal.locator('[class*="close"], button').first();
        if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await closeBtn.click({ force: true });
          await page.waitForTimeout(500);
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
              price: price || '',
              district: district || '',
              detailUrl: detailUrl || '',
              imageUrl: imageUrl || ''
            });
            const showTitle = title ? title.substring(0, 20) : '(无标题)';
            console.log(`采集第 ${i + 1}/${count} 条: ${showTitle} | ${price} | ${district}`);
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
      
      const csvHeader = '标题,价格,区县,详情地址,图片地址\n';
      const csvData = newData.map(item =>
        `"${item.title.replace(/"/g, '""')}","${item.price.replace(/"/g, '""')}","${item.district.replace(/"/g, '""')}","${item.detailUrl.replace(/"/g, '""')}","${item.imageUrl.replace(/"/g, '""')}"`
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
        
        const nextPageSelectors = [
          '.search-pagination-arrow-container--lt2kCP6J:not([disabled])',
          '.search-pagination-arrow-right--CKU78u4z',
          'text=">"',
          'a:has-text(">")',
          'button:has-text(">")'
        ];

        for (const sel of nextPageSelectors) {
          try {
            const el = paginationContainer.locator(sel).last();
            if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
              console.log(`找到下一页按钮: ${sel}`);
              await el.click({ force: true });
              return true;
            }
          } catch (e) {
            console.log(`选择器 ${sel} 错误: ${e.message}`);
          }
        }
      }
    }
    
    console.log('尝试直接点击页码2...');
    try {
      const page2Btn = page.locator('.search-pagination-page-box--AbqmJFFp').nth(1);
      if (await page2Btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('找到页码2按钮');
        await page2Btn.click({ force: true });
        return true;
      }
    } catch (e) {
      console.log('点击页码2错误:', e.message);
    }
    
    return false;
  };

  try {
    console.log('步骤1: 打开页面 https://www.goofish.com');
    await page.goto('https://www.goofish.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    await waitForAndCloseLoginModal();
    await closePopups();
    console.log('已打开首页');

    console.log('步骤2: 在搜索框输入"店铺转让"并回车');
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

    await searchInput.fill('店铺转让');
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

      console.log('');
      console.log('========================================');
      console.log('开始分页采集数据...');
      console.log('========================================');

      const filename = 'goofish_output.csv';
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
      }

      console.log(`\n成功采集并保存 ${totalSaved} 条新数据（共 ${pageNumber} 页）`);
      console.log('========================================');

    } else {
      console.log('未找到区域按钮，跳过区域选择步骤');
    }

    console.log('流程执行完成!');
  } catch (error) {
    console.error('执行出错:', error.message);
    await page.screenshot({ path: 'error_screenshot.png' });
    console.log('已截图: error_screenshot.png');
  }

  await page.waitForTimeout(30000);
  // await browser.close();
})();
