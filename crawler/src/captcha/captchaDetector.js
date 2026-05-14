const fs = require('fs');
const path = require('path');

const CAPTCHA_KEYWORDS = [
    'captcha', '验证码', 'verification', 'verify', '人机验证',
    '滑块', 'slider', '拼图', 'puzzle', '点击验证', 'click verify',
    '安全验证', 'security check', 'are you a robot', '机器人',
    'recaptcha', 'hcaptcha', 'geetest', '极验', 'netease', '网易',
    '顶象', 'dingxiang', '数美', 'shumei', '腾讯验证', 'tencent captcha'
];

const CAPTCHA_SELECTORS = [
    'iframe[src*="captcha"]',
    'iframe[src*="recaptcha"]',
    'iframe[src*="hcaptcha"]',
    'iframe[src*="geetest"]',
    'iframe[id*="captcha"]',
    'div[class*="captcha"]',
    'div[id*="captcha"]',
    'div[class*="geetest"]',
    'div[class*="verify"]',
    'div[class*="verification"]',
    'img[src*="captcha"]',
    'img[src*="verify"]',
    'img[src*="code"]',
    'input[name*="captcha"]',
    'input[id*="captcha"]',
    'input[placeholder*="验证码"]',
    '.captcha-img',
    '.verify-code',
    '#captcha',
    '#verify',
    '.yidun',
    '.geetest',
    '.nc_wrapper'
];

const CAPTCHA_URL_PATTERNS = [
    '/captcha', '/verify', '/check', '/challenge',
    '/security', '/validate', '/auth/verify'
];

class CaptchaDetector {
    constructor(options = {}) {
        this.screenshotDir = options.screenshotDir || path.join(__dirname, '../../screenshots/captcha');
        this.enableScreenshot = options.enableScreenshot !== false;
        this.customKeywords = options.customKeywords || [];
        this.customSelectors = options.customSelectors || [];

        if (!fs.existsSync(this.screenshotDir)) {
            fs.mkdirSync(this.screenshotDir, { recursive: true });
        }
    }

    async detectByPageContent(page) {
        const results = {
            detected: false,
            type: null,
            confidence: 0,
            details: [],
            screenshotPath: null
        };

        try {
            const pageContent = await page.content();
            const pageUrl = page.url();
            const pageTitle = await page.title().catch(() => '');

            const allKeywords = [...CAPTCHA_KEYWORDS, ...this.customKeywords];
            for (const keyword of allKeywords) {
                const lowerContent = pageContent.toLowerCase();
                const lowerTitle = pageTitle.toLowerCase();
                if (lowerContent.includes(keyword.toLowerCase()) ||
                    lowerTitle.includes(keyword.toLowerCase())) {
                    results.detected = true;
                    results.confidence = Math.max(results.confidence, 0.6);
                    results.details.push({
                        method: 'keyword_match',
                        keyword: keyword,
                        location: lowerContent.includes(keyword.toLowerCase()) ? 'body' : 'title'
                    });
                }
            }

            for (const pattern of CAPTCHA_URL_PATTERNS) {
                if (pageUrl.includes(pattern)) {
                    results.detected = true;
                    results.confidence = Math.max(results.confidence, 0.7);
                    results.details.push({
                        method: 'url_pattern',
                        pattern: pattern,
                        url: pageUrl
                    });
                }
            }

            const allSelectors = [...CAPTCHA_SELECTORS, ...this.customSelectors];
            for (const selector of allSelectors) {
                try {
                    const element = await page.$(selector);
                    if (element) {
                        const isVisible = await element.isVisible().catch(() => false);
                        if (isVisible) {
                            results.detected = true;
                            results.confidence = Math.max(results.confidence, 0.8);
                            results.details.push({
                                method: 'dom_selector',
                                selector: selector,
                                visible: true
                            });
                        }
                    }
                } catch (e) {
                    // selector not supported, skip
                }
            }

            if (results.detected) {
                results.type = this.classifyCaptchaType(results);
                if (this.enableScreenshot) {
                    results.screenshotPath = await this.takeScreenshot(page, results.type);
                }
            }
        } catch (error) {
            console.error('[CaptchaDetector] Detection error:', error.message);
        }

        return results;
    }

    classifyCaptchaType(detectionResult) {
        const details = detectionResult.details.map(d => JSON.stringify(d)).join(' ').toLowerCase();

        if (details.includes('recaptcha') || details.includes('g-recaptcha')) {
            return 'recaptcha';
        }
        if (details.includes('hcaptcha')) {
            return 'hcaptcha';
        }
        if (details.includes('geetest') || details.includes('极验')) {
            return 'geetest';
        }
        if (details.includes('slider') || details.includes('滑块')) {
            return 'slider';
        }
        if (details.includes('click') || details.includes('点击')) {
            return 'click';
        }
        if (details.includes('img') && (details.includes('captcha') || details.includes('code'))) {
            return 'image_text';
        }
        if (details.includes('puzzle') || details.includes('拼图')) {
            return 'puzzle';
        }

        return 'unknown';
    }

    async takeScreenshot(page, captchaType) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `captcha_${captchaType}_${timestamp}.png`;
            const filepath = path.join(this.screenshotDir, filename);
            await page.screenshot({ path: filepath, fullPage: false });
            console.log(`[CaptchaDetector] Screenshot saved: ${filepath}`);
            return filepath;
        } catch (error) {
            console.error('[CaptchaDetector] Screenshot failed:', error.message);
            return null;
        }
    }

    async detectByHttpResponse(response) {
        const results = {
            detected: false,
            type: null,
            confidence: 0,
            details: []
        };

        try {
            const status = response.status();
            const url = response.url();
            const headers = response.headers();

            if (status === 403 || status === 429) {
                results.detected = true;
                results.confidence = 0.5;
                results.details.push({
                    method: 'http_status',
                    status: status,
                    url: url
                });
            }

            for (const pattern of CAPTCHA_URL_PATTERNS) {
                if (url.includes(pattern)) {
                    results.detected = true;
                    results.confidence = Math.max(results.confidence, 0.6);
                    results.details.push({
                        method: 'response_url',
                        pattern: pattern,
                        url: url
                    });
                }
            }

            const contentType = headers['content-type'] || '';
            if (contentType.includes('text/html')) {
                try {
                    const body = await response.text();
                    for (const keyword of CAPTCHA_KEYWORDS) {
                        if (body.toLowerCase().includes(keyword.toLowerCase())) {
                            results.detected = true;
                            results.confidence = Math.max(results.confidence, 0.7);
                            results.details.push({
                                method: 'response_body',
                                keyword: keyword
                            });
                            break;
                        }
                    }
                } catch (e) {
                    // body already consumed or not available
                }
            }
        } catch (error) {
            console.error('[CaptchaDetector] HTTP response detection error:', error.message);
        }

        return results;
    }

    async detectByRedirect(page) {
        const results = {
            detected: false,
            type: null,
            confidence: 0,
            details: []
        };

        try {
            const currentUrl = page.url();
            for (const pattern of CAPTCHA_URL_PATTERNS) {
                if (currentUrl.includes(pattern)) {
                    results.detected = true;
                    results.confidence = 0.9;
                    results.type = 'redirect';
                    results.details.push({
                        method: 'url_redirect',
                        url: currentUrl,
                        pattern: pattern
                    });
                }
            }
        } catch (error) {
            console.error('[CaptchaDetector] Redirect detection error:', error.message);
        }

        return results;
    }
}

module.exports = CaptchaDetector;