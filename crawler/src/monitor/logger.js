const fs = require('fs');
const path = require('path');

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    FATAL: 4
};

class CrawlerLogger {
    constructor(options = {}) {
        this.logDir = options.logDir || path.join(__dirname, '../../logs');
        this.logLevel = LOG_LEVELS[options.logLevel] || LOG_LEVELS.INFO;
        this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024;
        this.retentionDays = options.retentionDays || 30;
        this.enableConsole = options.enableConsole !== false;
        this.enableJsonFile = options.enableJsonFile !== false;

        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }

        this.currentLogFile = this.getLogFilePath();
        this.errorLogFile = path.join(this.logDir, 'error.log');
        this.captchaLogFile = path.join(this.logDir, 'captcha.log');
        this.metricsLogFile = path.join(this.logDir, 'metrics.log');

        this.rotateCheck();
    }

    getLogFilePath() {
        const date = new Date().toISOString().split('T')[0];
        return path.join(this.logDir, `crawler-${date}.log`);
    }

    rotateCheck() {
        const today = new Date().toISOString().split('T')[0];
        const expectedFile = path.join(this.logDir, `crawler-${today}.log`);
        if (this.currentLogFile !== expectedFile) {
            this.currentLogFile = expectedFile;
        }

        try {
            const files = fs.readdirSync(this.logDir);
            const cutoff = Date.now() - this.retentionDays * 24 * 60 * 60 * 1000;
            for (const file of files) {
                const filePath = path.join(this.logDir, file);
                const stat = fs.statSync(filePath);
                if (stat.mtimeMs < cutoff) {
                    fs.unlinkSync(filePath);
                    console.log(`[Logger] Removed old log: ${file}`);
                }
            }
        } catch (e) {
            // ignore rotation errors
        }
    }

    formatLogEntry(level, message, context = {}) {
        return {
            timestamp: new Date().toISOString(),
            level: level,
            message: message,
            pid: process.pid,
            context: context
        };
    }

    writeLog(level, message, context = {}) {
        const entry = this.formatLogEntry(level, message, context);
        const logLine = JSON.stringify(entry);

        if (this.enableConsole) {
            const prefix = `[${entry.timestamp}] [${level}]`;
            switch (level) {
                case 'ERROR':
                case 'FATAL':
                    console.error(`${prefix} ${message}`, context);
                    break;
                case 'WARN':
                    console.warn(`${prefix} ${message}`, context);
                    break;
                default:
                    console.log(`${prefix} ${message}`, context);
            }
        }

        if (this.enableJsonFile) {
            try {
                fs.appendFileSync(this.currentLogFile, logLine + '\n');

                if (level === 'ERROR' || level === 'FATAL') {
                    fs.appendFileSync(this.errorLogFile, logLine + '\n');
                }
            } catch (e) {
                console.error('[Logger] Failed to write log file:', e.message);
            }
        }
    }

    debug(message, context = {}) {
        if (this.logLevel <= LOG_LEVELS.DEBUG) {
            this.writeLog('DEBUG', message, context);
        }
    }

    info(message, context = {}) {
        if (this.logLevel <= LOG_LEVELS.INFO) {
            this.writeLog('INFO', message, context);
        }
    }

    warn(message, context = {}) {
        if (this.logLevel <= LOG_LEVELS.WARN) {
            this.writeLog('WARN', message, context);
        }
    }

    error(message, context = {}) {
        if (this.logLevel <= LOG_LEVELS.ERROR) {
            this.writeLog('ERROR', message, context);
        }
    }

    fatal(message, context = {}) {
        if (this.logLevel <= LOG_LEVELS.FATAL) {
            this.writeLog('FATAL', message, context);
        }
    }

    logCaptchaEvent(event) {
        const entry = {
            timestamp: new Date().toISOString(),
            ...event
        };
        try {
            fs.appendFileSync(this.captchaLogFile, JSON.stringify(entry) + '\n');
        } catch (e) {
            console.error('[Logger] Failed to write captcha log:', e.message);
        }
    }

    logMetrics(metrics) {
        const entry = {
            timestamp: new Date().toISOString(),
            ...metrics
        };
        try {
            fs.appendFileSync(this.metricsLogFile, JSON.stringify(entry) + '\n');
        } catch (e) {
            console.error('[Logger] Failed to write metrics log:', e.message);
        }
    }

    logCrawlResult(result) {
        this.info(`Crawl completed: ${result.source}`, {
            source: result.source,
            itemsCollected: result.itemsCollected || 0,
            pagesProcessed: result.pagesProcessed || 0,
            duration: result.duration || 0,
            success: result.success !== false,
            errors: result.errors || []
        });
    }

    logCaptchaDetection(detectionResult) {
        this.warn(`Captcha detected: ${detectionResult.type}`, {
            captchaType: detectionResult.type,
            confidence: detectionResult.confidence,
            pageUrl: detectionResult.pageUrl,
            screenshotPath: detectionResult.screenshotPath
        });

        this.logCaptchaEvent({
            event: 'detected',
            type: detectionResult.type,
            confidence: detectionResult.confidence,
            pageUrl: detectionResult.pageUrl
        });
    }

    logCaptchaResolution(resolutionResult) {
        if (resolutionResult.success) {
            this.info(`Captcha resolved via ${resolutionResult.method}`, {
                method: resolutionResult.method,
                attempts: resolutionResult.attempts
            });
        } else {
            this.error(`Captcha resolution failed: ${resolutionResult.error}`, {
                method: resolutionResult.method,
                attempts: resolutionResult.attempts,
                error: resolutionResult.error
            });
        }

        this.logCaptchaEvent({
            event: 'resolution',
            success: resolutionResult.success,
            method: resolutionResult.method,
            attempts: resolutionResult.attempts,
            error: resolutionResult.error
        });
    }

    getRecentErrors(limit = 50) {
        try {
            if (!fs.existsSync(this.errorLogFile)) return [];
            const content = fs.readFileSync(this.errorLogFile, 'utf8');
            const lines = content.trim().split('\n').filter(Boolean);
            return lines.slice(-limit).map(line => {
                try { return JSON.parse(line); } catch (e) { return { raw: line }; }
            });
        } catch (e) {
            return [];
        }
    }

    getCaptchaStats(startDate, endDate) {
        try {
            if (!fs.existsSync(this.captchaLogFile)) return [];
            const content = fs.readFileSync(this.captchaLogFile, 'utf8');
            const lines = content.trim().split('\n').filter(Boolean);
            return lines
                .map(line => {
                    try { return JSON.parse(line); } catch (e) { return null; }
                })
                .filter(entry => {
                    if (!entry) return false;
                    if (startDate && entry.timestamp < startDate) return false;
                    if (endDate && entry.timestamp > endDate) return false;
                    return true;
                });
        } catch (e) {
            return [];
        }
    }
}

module.exports = CrawlerLogger;