const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CaptchaDetector = require('./captcha/captchaDetector');
const CaptchaHandler = require('./captcha/captchaHandler');
const CrawlerLogger = require('./monitor/logger');
const MetricsCollector = require('./monitor/metrics');
const Notifier = require('./monitor/notifier');

class CrawlerRunner {
    constructor(options = {}) {
        this.logger = options.logger || new CrawlerLogger({
            logDir: process.env.LOG_DIR || path.join(__dirname, '../logs'),
            logLevel: process.env.LOG_LEVEL || 'INFO'
        });

        this.metrics = options.metrics || new MetricsCollector({
            port: parseInt(process.env.METRICS_PORT) || 9091,
            labels: { service: 'crawler', version: '1.0.0' }
        });

        this.notifier = options.notifier || new Notifier();

        this.captchaDetector = new CaptchaDetector({
            screenshotDir: process.env.SCREENSHOT_DIR || path.join(__dirname, '../screenshots/captcha'),
            enableScreenshot: true
        });

        this.captchaHandler = new CaptchaHandler({
            maxRetries: parseInt(process.env.CAPTCHA_MAX_RETRIES) || 3,
            retryDelay: 2000,
            ocrEnabled: process.env.CAPTCHA_OCR_ENABLED !== 'false',
            thirdPartyService: process.env.CAPTCHA_SERVICE_TYPE || null,
            manualIntervention: {
                enabled: true,
                webhookUrl: process.env.CAPTCHA_WEBHOOK_URL || '',
                timeout: parseInt(process.env.CAPTCHA_MANUAL_TIMEOUT) || 300000
            }
        });

        this.errorRateThreshold = parseFloat(process.env.ERROR_RATE_THRESHOLD) || 0.3;
    }

    async run(source, crawlerFunction) {
        const startTime = Date.now();
        this.metrics.recordCrawlStart();

        this.logger.info(`[${source}] Crawl started`);

        let result = {
            source: source,
            success: false,
            itemsCollected: 0,
            pagesProcessed: 0,
            duration: 0,
            captchaEncounters: 0,
            captchaResolved: 0,
            errors: []
        };

        try {
            const wrappedCrawler = this.wrapWithCaptchaDetection(source, crawlerFunction);
            const crawlResult = await wrappedCrawler();

            result.success = true;
            result.itemsCollected = crawlResult?.itemsCollected || 0;
            result.pagesProcessed = crawlResult?.pagesProcessed || 0;
            result.captchaEncounters = crawlResult?.captchaEncounters || 0;
            result.captchaResolved = crawlResult?.captchaResolved || 0;

            this.metrics.recordCrawlSuccess(result);
            this.logger.logCrawlResult(result);
        } catch (error) {
            result.success = false;
            result.errors.push({
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });

            this.metrics.recordCrawlFailure(result);
            this.logger.error(`[${source}] Crawl failed`, {
                error: error.message,
                stack: error.stack
            });

            await this.notifier.notifyCrawlFailed(source, error);
        }

        result.duration = (Date.now() - startTime) / 1000;

        const errorRate = this.metrics.getSnapshot().crawl_failed / Math.max(this.metrics.getSnapshot().crawl_total, 1);
        if (errorRate > this.errorRateThreshold) {
            await this.notifier.notifyHighErrorRate(errorRate);
        }

        return result;
    }

    wrapWithCaptchaDetection(source, crawlerFunction) {
        const self = this;

        return async function() {
            const result = {
                itemsCollected: 0,
                pagesProcessed: 0,
                captchaEncounters: 0,
                captchaResolved: 0
            };

            const originalCrawler = crawlerFunction;

            const captchaAwareCrawler = async () => {
                const captchaCheckInterval = setInterval(async () => {
                    try {
                        if (typeof global.__currentPage !== 'undefined' && global.__currentPage) {
                            const detection = await self.captchaDetector.detectByPageContent(global.__currentPage);
                            if (detection.detected && detection.confidence > 0.5) {
                                clearInterval(captchaCheckInterval);

                                result.captchaEncounters++;
                                self.metrics.recordCaptchaDetected();
                                self.logger.logCaptchaDetection({
                                    ...detection,
                                    pageUrl: global.__currentPage.url()
                                });

                                await self.notifier.notifyCaptchaDetected({
                                    ...detection,
                                    pageUrl: global.__currentPage.url()
                                });

                                const resolution = await self.captchaHandler.handle(global.__currentPage, detection);
                                self.logger.logCaptchaResolution(resolution);

                                if (resolution.success) {
                                    result.captchaResolved++;
                                    self.metrics.recordCaptchaSolved();
                                } else {
                                    self.metrics.recordCaptchaFailed();
                                    await self.notifier.notifyCaptchaFailed(
                                        { ...detection, pageUrl: global.__currentPage.url() },
                                        resolution
                                    );
                                }
                            }
                        }
                    } catch (e) {
                        // captcha check error, continue
                    }
                }, 5000);

                try {
                    const crawlResult = await originalCrawler();
                    if (crawlResult) {
                        result.itemsCollected = crawlResult.itemsCollected || crawlResult.length || 0;
                        result.pagesProcessed = crawlResult.pagesProcessed || 0;
                    }
                } finally {
                    clearInterval(captchaCheckInterval);
                }
            };

            await captchaAwareCrawler();
            return result;
        };
    }

    setupPageMonitoring(page, source) {
        global.__currentPage = page;

        page.on('response', async (response) => {
            try {
                const detection = await this.captchaDetector.detectByHttpResponse(response);
                if (detection.detected && detection.confidence > 0.6) {
                    this.logger.warn(`[${source}] Captcha detected via HTTP response`, detection);
                    this.metrics.recordCaptchaDetected();
                }
            } catch (e) {
                // ignore monitoring errors
            }
        });

        page.on('framenavigated', async (frame) => {
            if (frame === page.mainFrame()) {
                try {
                    const detection = await this.captchaDetector.detectByRedirect(page);
                    if (detection.detected) {
                        this.logger.warn(`[${source}] Redirected to captcha page`, detection);
                        this.metrics.recordCaptchaDetected();
                    }
                } catch (e) {
                    // ignore monitoring errors
                }
            }
        });

        page.on('crash', () => {
            this.logger.error(`[${source}] Browser page crashed`);
            this.metrics.recordBrowserCrash();
            this.notifier.notifyBrowserCrash(source);
        });
    }

    getCaptchaStats() {
        return this.captchaHandler.getStats();
    }

    getMetrics() {
        return this.metrics.getSnapshot();
    }

    resetStats() {
        this.captchaHandler.resetStats();
        this.metrics.reset();
    }
}

module.exports = CrawlerRunner;