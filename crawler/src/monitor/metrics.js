const http = require('http');

class MetricsCollector {
    constructor(options = {}) {
        this.metricsPort = options.port || 9091;
        this.metricsPath = options.path || '/metrics';
        this.server = null;

        this.metrics = {
            crawl_total: 0,
            crawl_success: 0,
            crawl_failed: 0,
            crawl_pages_processed: 0,
            crawl_items_collected: 0,
            crawl_duration_seconds_total: 0,
            captcha_detected_total: 0,
            captcha_solved_total: 0,
            captcha_failed_total: 0,
            captcha_manual_requested_total: 0,
            captcha_manual_solved_total: 0,
            errors_total: 0,
            browser_crashes_total: 0,
            last_crawl_timestamp: 0,
            last_error_timestamp: 0,
            uptime_seconds: 0
        };

        this.startTime = Date.now();
        this.labels = options.labels || {};
    }

    start() {
        if (this.server) return;

        this.server = http.createServer((req, res) => {
            if (req.url === this.metricsPath || req.url === '/health') {
                this.updateUptime();
                const metricsText = this.formatPrometheusMetrics();

                if (req.url === '/health') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        status: 'ok',
                        uptime: this.metrics.uptime_seconds,
                        crawls: {
                            total: this.metrics.crawl_total,
                            success: this.metrics.crawl_success,
                            failed: this.metrics.crawl_failed
                        },
                        captcha: {
                            detected: this.metrics.captcha_detected_total,
                            solved: this.metrics.captcha_solved_total,
                            failed: this.metrics.captcha_failed_total
                        }
                    }));
                } else {
                    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
                    res.end(metricsText);
                }
            } else {
                res.writeHead(404);
                res.end('Not Found');
            }
        });

        this.server.listen(this.metricsPort, () => {
            console.log(`[Metrics] Server listening on port ${this.metricsPort}`);
        });
    }

    stop() {
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }

    updateUptime() {
        this.metrics.uptime_seconds = Math.floor((Date.now() - this.startTime) / 1000);
    }

    formatPrometheusMetrics() {
        const prefix = 'crawler';
        const labels = Object.entries(this.labels)
            .map(([k, v]) => `${k}="${v}"`)
            .join(',');

        const labelStr = labels ? `{${labels}}` : '';

        return [
            '# HELP crawler_crawl_total Total number of crawl tasks executed',
            '# TYPE crawler_crawl_total counter',
            `${prefix}_crawl_total${labelStr} ${this.metrics.crawl_total}`,

            '# HELP crawler_crawl_success_total Total number of successful crawls',
            '# TYPE crawler_crawl_success_total counter',
            `${prefix}_crawl_success_total${labelStr} ${this.metrics.crawl_success}`,

            '# HELP crawler_crawl_failed_total Total number of failed crawls',
            '# TYPE crawler_crawl_failed_total counter',
            `${prefix}_crawl_failed_total${labelStr} ${this.metrics.crawl_failed}`,

            '# HELP crawler_pages_processed_total Total pages processed',
            '# TYPE crawler_pages_processed_total counter',
            `${prefix}_pages_processed_total${labelStr} ${this.metrics.crawl_pages_processed}`,

            '# HELP crawler_items_collected_total Total items collected',
            '# TYPE crawler_items_collected_total counter',
            `${prefix}_items_collected_total${labelStr} ${this.metrics.crawl_items_collected}`,

            '# HELP crawler_duration_seconds_total Total crawl duration in seconds',
            '# TYPE crawler_duration_seconds_total counter',
            `${prefix}_duration_seconds_total${labelStr} ${this.metrics.crawl_duration_seconds_total}`,

            '# HELP crawler_captcha_detected_total Total captcha detections',
            '# TYPE crawler_captcha_detected_total counter',
            `${prefix}_captcha_detected_total${labelStr} ${this.metrics.captcha_detected_total}`,

            '# HELP crawler_captcha_solved_total Total captchas solved',
            '# TYPE crawler_captcha_solved_total counter',
            `${prefix}_captcha_solved_total${labelStr} ${this.metrics.captcha_solved_total}`,

            '# HELP crawler_captcha_failed_total Total captchas failed',
            '# TYPE crawler_captcha_failed_total counter',
            `${prefix}_captcha_failed_total${labelStr} ${this.metrics.captcha_failed_total}`,

            '# HELP crawler_captcha_manual_requested_total Total manual intervention requests',
            '# TYPE crawler_captcha_manual_requested_total counter',
            `${prefix}_captcha_manual_requested_total${labelStr} ${this.metrics.captcha_manual_requested_total}`,

            '# HELP crawler_captcha_manual_solved_total Total manual interventions solved',
            '# TYPE crawler_captcha_manual_solved_total counter',
            `${prefix}_captcha_manual_solved_total${labelStr} ${this.metrics.captcha_manual_solved_total}`,

            '# HELP crawler_errors_total Total errors encountered',
            '# TYPE crawler_errors_total counter',
            `${prefix}_errors_total${labelStr} ${this.metrics.errors_total}`,

            '# HELP crawler_browser_crashes_total Total browser crashes',
            '# TYPE crawler_browser_crashes_total counter',
            `${prefix}_browser_crashes_total${labelStr} ${this.metrics.browser_crashes_total}`,

            '# HELP crawler_uptime_seconds Service uptime in seconds',
            '# TYPE crawler_uptime_seconds gauge',
            `${prefix}_uptime_seconds${labelStr} ${this.metrics.uptime_seconds}`,

            '# HELP crawler_success_rate Crawl success rate (0-1)',
            '# TYPE crawler_success_rate gauge',
            `${prefix}_success_rate${labelStr} ${this.getSuccessRate()}`,

            '# HELP crawler_captcha_solve_rate Captcha solve rate (0-1)',
            '# TYPE crawler_captcha_solve_rate gauge',
            `${prefix}_captcha_solve_rate${labelStr} ${this.getCaptchaSolveRate()}`,

            ''
        ].join('\n');
    }

    getSuccessRate() {
        if (this.metrics.crawl_total === 0) return 1;
        return this.metrics.crawl_success / this.metrics.crawl_total;
    }

    getCaptchaSolveRate() {
        if (this.metrics.captcha_detected_total === 0) return 1;
        return this.metrics.captcha_solved_total / this.metrics.captcha_detected_total;
    }

    recordCrawlStart() {
        this.metrics.crawl_total++;
    }

    recordCrawlSuccess(result = {}) {
        this.metrics.crawl_success++;
        this.metrics.crawl_pages_processed += result.pagesProcessed || 0;
        this.metrics.crawl_items_collected += result.itemsCollected || 0;
        this.metrics.crawl_duration_seconds_total += result.duration || 0;
        this.metrics.last_crawl_timestamp = Date.now();
    }

    recordCrawlFailure(error = {}) {
        this.metrics.crawl_failed++;
        this.metrics.errors_total++;
        this.metrics.last_error_timestamp = Date.now();
    }

    recordCaptchaDetected() {
        this.metrics.captcha_detected_total++;
    }

    recordCaptchaSolved() {
        this.metrics.captcha_solved_total++;
    }

    recordCaptchaFailed() {
        this.metrics.captcha_failed_total++;
    }

    recordCaptchaManualRequested() {
        this.metrics.captcha_manual_requested_total++;
    }

    recordCaptchaManualSolved() {
        this.metrics.captcha_manual_solved_total++;
    }

    recordBrowserCrash() {
        this.metrics.browser_crashes_total++;
        this.metrics.errors_total++;
    }

    recordError() {
        this.metrics.errors_total++;
    }

    getSnapshot() {
        this.updateUptime();
        return {
            ...this.metrics,
            successRate: this.getSuccessRate(),
            captchaSolveRate: this.getCaptchaSolveRate()
        };
    }

    reset() {
        Object.keys(this.metrics).forEach(key => {
            if (typeof this.metrics[key] === 'number') {
                this.metrics[key] = 0;
            }
        });
        this.startTime = Date.now();
    }
}

module.exports = MetricsCollector;