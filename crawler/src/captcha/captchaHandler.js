const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

class CaptchaHandler {
    constructor(options = {}) {
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 2000;
        this.ocrEnabled = options.ocrEnabled !== false;
        this.thirdPartyService = options.thirdPartyService || null;
        this.manualIntervention = options.manualIntervention || {
            enabled: true,
            webhookUrl: process.env.CAPTCHA_WEBHOOK_URL || '',
            timeout: parseInt(process.env.CAPTCHA_MANUAL_TIMEOUT) || 300000
        };
        this.tempDir = options.tempDir || path.join(__dirname, '../../screenshots/captcha/temp');
        this.captchaStats = {
            total: 0,
            solved: 0,
            failed: 0,
            manualRequested: 0,
            manualSolved: 0
        };

        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    async handle(page, detectionResult) {
        this.captchaStats.total++;
        console.log(`[CaptchaHandler] Handling captcha type: ${detectionResult.type}, confidence: ${detectionResult.confidence}`);

        let result = {
            success: false,
            method: null,
            attempts: 0,
            error: null
        };

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            result.attempts = attempt;
            console.log(`[CaptchaHandler] Attempt ${attempt}/${this.maxRetries}`);

            try {
                switch (detectionResult.type) {
                    case 'image_text':
                        result = await this.handleImageTextCaptcha(page, detectionResult);
                        break;
                    case 'slider':
                        result = await this.handleSliderCaptcha(page, detectionResult);
                        break;
                    case 'click':
                        result = await this.handleClickCaptcha(page, detectionResult);
                        break;
                    case 'recaptcha':
                    case 'hcaptcha':
                        result = await this.handleReCaptcha(page, detectionResult);
                        break;
                    case 'geetest':
                        result = await this.handleGeetest(page, detectionResult);
                        break;
                    default:
                        result = await this.handleGenericCaptcha(page, detectionResult);
                }

                if (result.success) {
                    this.captchaStats.solved++;
                    console.log(`[CaptchaHandler] Captcha solved via ${result.method}`);
                    return result;
                }
            } catch (error) {
                console.error(`[CaptchaHandler] Attempt ${attempt} failed:`, error.message);
                result.error = error.message;
            }

            if (attempt < this.maxRetries) {
                console.log(`[CaptchaHandler] Waiting ${this.retryDelay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                await page.reload().catch(() => {});
                await page.waitForTimeout(2000);
            }
        }

        if (!result.success && this.manualIntervention.enabled) {
            console.log('[CaptchaHandler] All automatic attempts failed, requesting manual intervention...');
            result = await this.requestManualIntervention(page, detectionResult);
        }

        if (!result.success) {
            this.captchaStats.failed++;
        }

        return result;
    }

    async handleImageTextCaptcha(page, detectionResult) {
        if (!this.ocrEnabled) {
            return { success: false, method: 'ocr_disabled', attempts: 1, error: 'OCR is disabled' };
        }

        try {
            const captchaImg = await page.$('img[src*="captcha"], img[src*="code"], img[src*="verify"], .captcha-img img, #captcha_img');
            if (!captchaImg) {
                return { success: false, method: 'ocr', attempts: 1, error: 'Captcha image not found' };
            }

            const imgPath = path.join(this.tempDir, `captcha_img_${Date.now()}.png`);
            await captchaImg.screenshot({ path: imgPath });

            const processedPath = await this.preprocessImage(imgPath);
            const captchaText = await this.ocrImage(processedPath);

            if (captchaText && captchaText.length >= 2) {
                const inputField = await page.$('input[name*="captcha"], input[id*="captcha"], input[placeholder*="验证码"]');
                if (inputField) {
                    await inputField.click();
                    await inputField.fill('');
                    await inputField.type(captchaText, { delay: 100 });
                    await page.waitForTimeout(500);

                    const submitBtn = await page.$('button[type="submit"], input[type="submit"], .submit-btn, #submit');
                    if (submitBtn) {
                        await submitBtn.click();
                        await page.waitForTimeout(2000);

                        const stillHasCaptcha = await this.checkCaptchaStillPresent(page);
                        if (!stillHasCaptcha) {
                            this.cleanupTemp(imgPath, processedPath);
                            return { success: true, method: 'ocr', attempts: 1 };
                        }
                    }
                }
            }

            this.cleanupTemp(imgPath, processedPath);
            return { success: false, method: 'ocr', attempts: 1, error: `OCR result: ${captchaText || 'empty'}` };
        } catch (error) {
            return { success: false, method: 'ocr', attempts: 1, error: error.message };
        }
    }

    async preprocessImage(imagePath) {
        const outputPath = imagePath.replace('.png', '_processed.png');
        try {
            execSync(`convert "${imagePath}" -colorspace Gray -negate -lat 20x20+10% -negate "${outputPath}"`, {
                stdio: 'pipe',
                timeout: 5000
            });
            return outputPath;
        } catch (e) {
            return imagePath;
        }
    }

    async ocrImage(imagePath) {
        try {
            const result = execSync(
                `tesseract "${imagePath}" stdout -l chi_sim+eng --psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789`,
                { encoding: 'utf8', stdio: 'pipe', timeout: 10000 }
            );
            return result.trim().replace(/\s/g, '');
        } catch (e) {
            console.error('[CaptchaHandler] OCR failed:', e.message);
            return '';
        }
    }

    async handleSliderCaptcha(page, detectionResult) {
        try {
            const slider = await page.$('.slider, .slider-btn, .nc_iconfont, .geetest_slider_button');
            if (!slider) {
                return { success: false, method: 'slider', attempts: 1, error: 'Slider element not found' };
            }

            const sliderBox = await slider.boundingBox();
            if (!sliderBox) {
                return { success: false, method: 'slider', attempts: 1, error: 'Cannot get slider bounding box' };
            }

            const trackWidth = await this.getTrackWidth(page);
            const startX = sliderBox.x + sliderBox.width / 2;
            const startY = sliderBox.y + sliderBox.height / 2;

            await page.mouse.move(startX, startY);
            await page.mouse.down();
            await page.waitForTimeout(200);

            const steps = 30;
            const targetX = startX + trackWidth;
            for (let i = 1; i <= steps; i++) {
                const progress = i / steps;
                const easedProgress = progress < 0.5
                    ? 2 * progress * progress
                    : -1 + (4 - 2 * progress) * progress;
                const currentX = startX + trackWidth * easedProgress;
                const jitterY = (Math.random() - 0.5) * 4;
                await page.mouse.move(currentX, startY + jitterY);
                await page.waitForTimeout(10 + Math.random() * 20);
            }

            await page.mouse.move(targetX, startY);
            await page.waitForTimeout(100 + Math.random() * 200);
            await page.mouse.up();
            await page.waitForTimeout(2000);

            const stillHasCaptcha = await this.checkCaptchaStillPresent(page);
            if (!stillHasCaptcha) {
                return { success: true, method: 'slider_simulation', attempts: 1 };
            }

            return { success: false, method: 'slider_simulation', attempts: 1, error: 'Slider verification failed' };
        } catch (error) {
            return { success: false, method: 'slider', attempts: 1, error: error.message };
        }
    }

    async getTrackWidth(page) {
        try {
            const trackWidth = await page.$eval('.slider-track, .geetest_slider_track, .nc_scale', el => el.offsetWidth);
            return trackWidth - 40;
        } catch (e) {
            return 260;
        }
    }

    async handleClickCaptcha(page, detectionResult) {
        try {
            const clickTargets = await page.$$('.captcha-img img, .click-target, [class*="click"]');
            if (clickTargets.length === 0) {
                return { success: false, method: 'click', attempts: 1, error: 'No click targets found' };
            }

            for (const target of clickTargets) {
                try {
                    await target.click({ timeout: 3000 });
                    await page.waitForTimeout(1000);
                } catch (e) {
                    // skip unclickable targets
                }
            }

            await page.waitForTimeout(2000);
            const stillHasCaptcha = await this.checkCaptchaStillPresent(page);
            if (!stillHasCaptcha) {
                return { success: true, method: 'click_simulation', attempts: 1 };
            }

            return { success: false, method: 'click_simulation', attempts: 1, error: 'Click verification failed' };
        } catch (error) {
            return { success: false, method: 'click', attempts: 1, error: error.message };
        }
    }

    async handleReCaptcha(page, detectionResult) {
        if (this.thirdPartyService) {
            return await this.useThirdPartyService(page, detectionResult);
        }

        try {
            const audioChallenge = await page.$('#recaptcha-audio-button, button[title="Get an audio challenge"]');
            if (audioChallenge) {
                await audioChallenge.click();
                await page.waitForTimeout(2000);
                return { success: false, method: 'recaptcha_audio', attempts: 1, error: 'Audio challenge requires manual intervention' };
            }
        } catch (e) {
            // audio challenge not available
        }

        return { success: false, method: 'recaptcha', attempts: 1, error: 'reCAPTCHA requires third-party service or manual intervention' };
    }

    async handleGeetest(page, detectionResult) {
        if (this.thirdPartyService) {
            return await this.useThirdPartyService(page, detectionResult);
        }

        return await this.handleSliderCaptcha(page, detectionResult);
    }

    async handleGenericCaptcha(page, detectionResult) {
        try {
            const refreshBtn = await page.$('.captcha-refresh, .refresh-btn, [onclick*="refresh"], [class*="refresh"]');
            if (refreshBtn) {
                await refreshBtn.click();
                await page.waitForTimeout(1000);
            }

            await page.waitForTimeout(2000);
            const stillHasCaptcha = await this.checkCaptchaStillPresent(page);
            if (!stillHasCaptcha) {
                return { success: true, method: 'refresh_and_retry', attempts: 1 };
            }

            return { success: false, method: 'generic', attempts: 1, error: 'Generic captcha could not be resolved' };
        } catch (error) {
            return { success: false, method: 'generic', attempts: 1, error: error.message };
        }
    }

    async useThirdPartyService(page, detectionResult) {
        try {
            const siteKey = await this.extractSiteKey(page);
            const pageUrl = page.url();

            const serviceResult = await this.callThirdPartyApi({
                service: this.thirdPartyService,
                siteKey: siteKey,
                pageUrl: pageUrl,
                captchaType: detectionResult.type
            });

            if (serviceResult && serviceResult.token) {
                await page.evaluate((token) => {
                    if (typeof grecaptcha !== 'undefined') {
                        grecaptcha.getResponse = () => token;
                    }
                    if (typeof hcaptcha !== 'undefined') {
                        hcaptcha.getResponse = () => token;
                    }
                    document.querySelector('#g-recaptcha-response')?.setAttribute('value', token);
                    document.querySelector('#h-captcha-response')?.setAttribute('value', token);
                }, serviceResult.token);

                await page.waitForTimeout(2000);
                const stillHasCaptcha = await this.checkCaptchaStillPresent(page);
                if (!stillHasCaptcha) {
                    return { success: true, method: 'third_party_service', attempts: 1 };
                }
            }

            return { success: false, method: 'third_party_service', attempts: 1, error: 'Third-party service failed' };
        } catch (error) {
            return { success: false, method: 'third_party_service', attempts: 1, error: error.message };
        }
    }

    async extractSiteKey(page) {
        try {
            const siteKey = await page.evaluate(() => {
                const recaptchaEl = document.querySelector('.g-recaptcha, [data-sitekey]');
                if (recaptchaEl) return recaptchaEl.getAttribute('data-sitekey');

                const scripts = document.querySelectorAll('script[src*="recaptcha"]');
                for (const script of scripts) {
                    const match = script.src.match(/[?&]k=([^&]+)/);
                    if (match) return match[1];
                }

                return null;
            });
            return siteKey;
        } catch (e) {
            return null;
        }
    }

    async callThirdPartyApi(params) {
        const serviceConfig = {
            '2captcha': {
                url: 'https://api.2captcha.com/in.php',
                apiKey: process.env.CAPTCHA_2CAPTCHA_KEY || ''
            },
            'anti-captcha': {
                url: 'https://api.anti-captcha.com/createTask',
                apiKey: process.env.CAPTCHA_ANTI_KEY || ''
            },
            'capsolver': {
                url: 'https://api.capsolver.com/createTask',
                apiKey: process.env.CAPTCHA_CAPSOLVER_KEY || ''
            }
        };

        const config = serviceConfig[params.service];
        if (!config || !config.apiKey) {
            throw new Error(`Service ${params.service} not configured or missing API key`);
        }

        return new Promise((resolve, reject) => {
            const postData = JSON.stringify({
                clientKey: config.apiKey,
                task: {
                    type: params.captchaType === 'recaptcha' ? 'RecaptchaV2Task' : 'HCaptchaTask',
                    websiteURL: params.pageUrl,
                    websiteKey: params.siteKey
                }
            });

            const url = new URL(config.url);
            const options = {
                hostname: url.hostname,
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                },
                timeout: 30000
            };

            const req = (url.protocol === 'https:' ? https : http).request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        resolve({ token: result.solution?.token || result.solution?.gRecaptchaResponse || null });
                    } catch (e) {
                        reject(new Error('Failed to parse third-party response'));
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('Third-party API timeout')); });
            req.write(postData);
            req.end();
        });
    }

    async requestManualIntervention(page, detectionResult) {
        this.captchaStats.manualRequested++;
        console.log('[CaptchaHandler] Manual intervention requested');

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const screenshotPath = path.join(
            path.dirname(this.tempDir),
            `manual_captcha_${timestamp}.png`
        );
        await page.screenshot({ path: screenshotPath, fullPage: true });

        const interventionData = {
            captchaType: detectionResult.type,
            pageUrl: page.url(),
            screenshotPath: screenshotPath,
            timestamp: new Date().toISOString(),
            status: 'pending'
        };

        if (this.manualIntervention.webhookUrl) {
            await this.sendWebhookNotification(interventionData);
        }

        console.log('[CaptchaHandler] Waiting for manual intervention...');
        console.log(`[CaptchaHandler] Screenshot: ${screenshotPath}`);
        console.log(`[CaptchaHandler] Page URL: ${page.url()}`);

        const startWait = Date.now();
        while (Date.now() - startWait < this.manualIntervention.timeout) {
            await page.waitForTimeout(5000);

            const stillHasCaptcha = await this.checkCaptchaStillPresent(page);
            if (!stillHasCaptcha) {
                this.captchaStats.manualSolved++;
                console.log('[CaptchaHandler] Manual intervention succeeded');
                return { success: true, method: 'manual_intervention', attempts: this.maxRetries + 1 };
            }
        }

        console.log('[CaptchaHandler] Manual intervention timed out');
        return { success: false, method: 'manual_intervention_timeout', attempts: this.maxRetries + 1, error: 'Manual intervention timed out' };
    }

    async sendWebhookNotification(data) {
        try {
            const postData = JSON.stringify({
                msgtype: 'text',
                text: {
                    content: `[验证码告警]\n类型: ${data.captchaType}\n页面: ${data.pageUrl}\n截图: ${data.screenshotPath}\n时间: ${data.timestamp}\n状态: 需要人工处理`
                }
            });

            const url = new URL(this.manualIntervention.webhookUrl);
            const options = {
                hostname: url.hostname,
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                },
                timeout: 10000
            };

            const req = (url.protocol === 'https:' ? https : http).request(options);
            req.write(postData);
            req.end();
            console.log('[CaptchaHandler] Webhook notification sent');
        } catch (error) {
            console.error('[CaptchaHandler] Webhook notification failed:', error.message);
        }
    }

    async checkCaptchaStillPresent(page) {
        try {
            const detector = new (require('./captchaDetector'))({ enableScreenshot: false });
            const result = await detector.detectByPageContent(page);
            return result.detected && result.confidence > 0.5;
        } catch (e) {
            return false;
        }
    }

    cleanupTemp(...paths) {
        for (const p of paths) {
            try {
                if (p && fs.existsSync(p)) fs.unlinkSync(p);
            } catch (e) {
                // ignore cleanup errors
            }
        }
    }

    getStats() {
        return { ...this.captchaStats };
    }

    resetStats() {
        this.captchaStats = {
            total: 0,
            solved: 0,
            failed: 0,
            manualRequested: 0,
            manualSolved: 0
        };
    }
}

module.exports = CaptchaHandler;