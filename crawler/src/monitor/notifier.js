const https = require('https');
const http = require('http');

class Notifier {
    constructor(options = {}) {
        this.channels = {
            webhook: {
                enabled: !!process.env.NOTIFY_WEBHOOK_URL,
                url: process.env.NOTIFY_WEBHOOK_URL || '',
                type: process.env.NOTIFY_WEBHOOK_TYPE || 'dingtalk'
            },
            email: {
                enabled: !!process.env.NOTIFY_EMAIL_SMTP_HOST,
                smtp: {
                    host: process.env.NOTIFY_EMAIL_SMTP_HOST || '',
                    port: parseInt(process.env.NOTIFY_EMAIL_SMTP_PORT) || 587,
                    user: process.env.NOTIFY_EMAIL_USER || '',
                    pass: process.env.NOTIFY_EMAIL_PASS || ''
                },
                from: process.env.NOTIFY_EMAIL_FROM || '',
                to: (process.env.NOTIFY_EMAIL_TO || '').split(',').filter(Boolean)
            },
            telegram: {
                enabled: !!process.env.NOTIFY_TELEGRAM_BOT_TOKEN,
                botToken: process.env.NOTIFY_TELEGRAM_BOT_TOKEN || '',
                chatId: process.env.NOTIFY_TELEGRAM_CHAT_ID || ''
            }
        };

        this.rateLimit = {
            windowMs: parseInt(process.env.NOTIFY_RATE_LIMIT_WINDOW) || 60000,
            maxNotifications: parseInt(process.env.NOTIFY_RATE_LIMIT_MAX) || 10,
            notifications: []
        };

        this.throttleTimers = {};
    }

    async sendAlert(alert) {
        const alertData = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            severity: alert.severity || 'warning',
            type: alert.type || 'unknown',
            title: alert.title || 'Crawler Alert',
            message: alert.message || '',
            details: alert.details || {},
            source: alert.source || 'crawler'
        };

        if (!this.checkRateLimit(alertData.type)) {
            console.log(`[Notifier] Rate limited: ${alertData.type}`);
            return;
        }

        const promises = [];

        if (this.channels.webhook.enabled) {
            promises.push(this.sendWebhook(alertData));
        }

        if (this.channels.email.enabled && alertData.severity === 'critical') {
            promises.push(this.sendEmail(alertData));
        }

        if (this.channels.telegram.enabled) {
            promises.push(this.sendTelegram(alertData));
        }

        if (promises.length === 0) {
            console.log(`[Notifier] No channels configured for alert: ${alertData.title}`);
            return;
        }

        await Promise.allSettled(promises);
    }

    checkRateLimit(type) {
        const now = Date.now();
        this.rateLimit.notifications = this.rateLimit.notifications.filter(
            n => now - n.timestamp < this.rateLimit.windowMs
        );

        const typeCount = this.rateLimit.notifications.filter(n => n.type === type).length;
        if (typeCount >= this.rateLimit.maxNotifications) {
            return false;
        }

        this.rateLimit.notifications.push({ timestamp: now, type });
        return true;
    }

    async sendWebhook(alertData) {
        try {
            let payload;

            switch (this.channels.webhook.type) {
                case 'dingtalk':
                    payload = {
                        msgtype: 'markdown',
                        markdown: {
                            title: `[${alertData.severity.toUpperCase()}] ${alertData.title}`,
                            text: this.formatDingtalkMessage(alertData)
                        }
                    };
                    break;
                case 'feishu':
                    payload = {
                        msg_type: 'interactive',
                        card: {
                            header: {
                                title: { tag: 'plain_text', content: alertData.title },
                                template: alertData.severity === 'critical' ? 'red' : 'yellow'
                            },
                            elements: [{
                                tag: 'div',
                                text: { tag: 'lark_md', content: this.formatFeishuMessage(alertData) }
                            }]
                        }
                    };
                    break;
                default:
                    payload = {
                        text: `[${alertData.severity.toUpperCase()}] ${alertData.title}\n${alertData.message}`,
                        data: alertData
                    };
            }

            await this.httpPost(this.channels.webhook.url, payload);
            console.log(`[Notifier] Webhook sent: ${alertData.title}`);
        } catch (error) {
            console.error('[Notifier] Webhook failed:', error.message);
        }
    }

    async sendEmail(alertData) {
        console.log(`[Notifier] Email alert: ${alertData.title}`);
        console.log(`[Notifier] Email config: SMTP ${this.channels.email.smtp.host}:${this.channels.email.smtp.port}`);
    }

    async sendTelegram(alertData) {
        try {
            const text = this.formatTelegramMessage(alertData);
            const url = `https://api.telegram.org/bot${this.channels.telegram.botToken}/sendMessage`;
            const payload = {
                chat_id: this.channels.telegram.chatId,
                text: text,
                parse_mode: 'HTML'
            };

            await this.httpPost(url, payload);
            console.log(`[Notifier] Telegram sent: ${alertData.title}`);
        } catch (error) {
            console.error('[Notifier] Telegram failed:', error.message);
        }
    }

    formatDingtalkMessage(alertData) {
        const severityEmoji = {
            critical: '🔴',
            warning: '🟡',
            info: '🔵'
        };

        return [
            `## ${severityEmoji[alertData.severity] || '📢'} ${alertData.title}`,
            '',
            `- **类型**: ${alertData.type}`,
            `- **级别**: ${alertData.severity}`,
            `- **时间**: ${alertData.timestamp}`,
            `- **来源**: ${alertData.source}`,
            '',
            `**详情**:`,
            `\`\`\``,
            alertData.message,
            `\`\`\``,
            '',
            alertData.details.screenshotPath ? `![截图](${alertData.details.screenshotPath})` : '',
            alertData.details.pageUrl ? `- **页面**: ${alertData.details.pageUrl}` : ''
        ].join('\n');
    }

    formatFeishuMessage(alertData) {
        return [
            `**级别**: ${alertData.severity}`,
            `**类型**: ${alertData.type}`,
            `**时间**: ${alertData.timestamp}`,
            '',
            alertData.message,
            '',
            alertData.details.pageUrl ? `页面: ${alertData.details.pageUrl}` : ''
        ].join('\n');
    }

    formatTelegramMessage(alertData) {
        const severityEmoji = {
            critical: '🔴',
            warning: '🟡',
            info: '🔵'
        };

        return [
            `${severityEmoji[alertData.severity] || '📢'} <b>${alertData.title}</b>`,
            '',
            `<b>类型:</b> ${alertData.type}`,
            `<b>级别:</b> ${alertData.severity}`,
            `<b>时间:</b> ${alertData.timestamp}`,
            '',
            `<pre>${alertData.message}</pre>`,
            '',
            alertData.details.pageUrl ? `🔗 ${alertData.details.pageUrl}` : ''
        ].join('\n');
    }

    httpPost(url, data) {
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify(data);
            const parsedUrl = new URL(url);

            const options = {
                hostname: parsedUrl.hostname,
                path: parsedUrl.pathname + parsedUrl.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                },
                timeout: 10000
            };

            const req = (parsedUrl.protocol === 'https:' ? https : http).request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => resolve(body));
            });

            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
            req.write(postData);
            req.end();
        });
    }

    async notifyCaptchaDetected(detectionResult) {
        await this.sendAlert({
            severity: 'warning',
            type: 'captcha_detected',
            title: '验证码检测告警',
            message: `检测到验证码类型: ${detectionResult.type}, 置信度: ${(detectionResult.confidence * 100).toFixed(0)}%`,
            details: {
                captchaType: detectionResult.type,
                confidence: detectionResult.confidence,
                pageUrl: detectionResult.pageUrl,
                screenshotPath: detectionResult.screenshotPath
            },
            source: 'captcha_detector'
        });
    }

    async notifyCaptchaFailed(detectionResult, handlerResult) {
        await this.sendAlert({
            severity: 'critical',
            type: 'captcha_failed',
            title: '验证码处理失败告警',
            message: `验证码处理失败，需要人工干预\n类型: ${detectionResult.type}\n方法: ${handlerResult.method}\n错误: ${handlerResult.error}`,
            details: {
                captchaType: detectionResult.type,
                method: handlerResult.method,
                error: handlerResult.error,
                attempts: handlerResult.attempts,
                pageUrl: detectionResult.pageUrl,
                screenshotPath: detectionResult.screenshotPath
            },
            source: 'captcha_handler'
        });
    }

    async notifyCrawlFailed(source, error) {
        await this.sendAlert({
            severity: 'critical',
            type: 'crawl_failed',
            title: `采集失败告警 - ${source}`,
            message: `采集源 ${source} 执行失败\n错误: ${error.message || error}`,
            details: {
                source: source,
                error: error.message || error,
                stack: error.stack
            },
            source: 'crawler'
        });
    }

    async notifyBrowserCrash(source) {
        await this.sendAlert({
            severity: 'critical',
            type: 'browser_crash',
            title: `浏览器崩溃告警 - ${source}`,
            message: `采集源 ${source} 浏览器进程崩溃，将自动重启`,
            details: { source: source },
            source: 'browser'
        });
    }

    async notifyHighErrorRate(errorRate) {
        await this.sendAlert({
            severity: 'warning',
            type: 'high_error_rate',
            title: '采集错误率过高告警',
            message: `当前错误率: ${(errorRate * 100).toFixed(1)}%，超过阈值`,
            details: { errorRate: errorRate },
            source: 'monitor'
        });
    }
}

module.exports = Notifier;