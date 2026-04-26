const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: null,
    args: ['--start-maximized'],
    geolocation: { latitude: 34.2658, longitude: 108.9549 },
    permissions: ['geolocation']
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

  try {
    console.log('步骤1: 打开页面 https://www.goofish.com');
    await page.goto('https://www.goofish.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    await waitForAndCloseLoginModal();
    await closePopups();
    await page.screenshot({ path: 'step1_homepage.png' });
    console.log('已截图: step1_homepage.png');

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
    await page.screenshot({ path: 'step2_search.png' });
    console.log('已截图: step2_search.png');

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

      // 不要在这里调用 closePopups，避免关闭区域弹窗
      await page.screenshot({ path: 'step3_area_popup.png' });
      console.log('已截图: step3_area_popup.png');

      console.log('步骤4: 选择陕西');
      await page.waitForTimeout(1000);

      // 直接使用class定位并强制点击
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

      // 等待城市选项加载
      await page.waitForTimeout(1000);

      // 尝试多种方式定位西安
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
          console.log(`使用选择器 ${sel} 找到 ${count} 个元素`);

          for (let i = 0; i < count; i++) {
            const el = xianEls.nth(i);
            const text = await el.textContent();
            if (text && text.includes('西安')) {
              console.log(`找到西安选项，索引: ${i}, 文本: ${text}`);
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
      await page.screenshot({ path: 'step6_final.png' });
      console.log('已截图: step6_final.png');
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
