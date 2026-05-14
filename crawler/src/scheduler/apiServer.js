const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const CrawlerLogger = require('../monitor/logger');
const MetricsCollector = require('../monitor/metrics');
const Notifier = require('../monitor/notifier');

const API_PORT = parseInt(process.env.CRAWLER_API_PORT) || 3001;

const logger = new CrawlerLogger({
    logDir: process.env.LOG_DIR || path.join(__dirname, '../../logs'),
    logLevel: process.env.LOG_LEVEL || 'INFO'
});

const metrics = new MetricsCollector({
    port: parseInt(process.env.METRICS_PORT) || 9091,
    labels: { service: 'crawler', version: '1.0.0' }
});

const notifier = new Notifier();

metrics.start();

function getEnvBool(key, defaultValue = false) {
    const value = process.env[key];
    if (value === undefined || value === null) return defaultValue;
    return value.toLowerCase() === 'true' || value === '1';
}

async function runCrawler(source) {
    logger.info(`Starting crawl: ${source}`);
    metrics.recordCrawlStart();

    const startTime = Date.now();
    let result = {
        source: source,
        success: false,
        itemsCollected: 0,
        pagesProcessed: 0,
        duration: 0,
        errors: []
    };

    try {
        let crawlerModule;
        switch (source) {
            case '58':
                crawlerModule = require('../../run/58.js');
                break;
            case 'anjuke':
                crawlerModule = require('../../run/anjuke.js');
                break;
            case 'goofish':
                crawlerModule = require('../../run/goofish.js');
                break;
            case 'xiaohongshu':
                crawlerModule = require('../../run/xiaohongshu.js');
                break;
            case 'douyin':
                crawlerModule = require('../../run/douyin.js');
                break;
            default:
                throw new Error(`Unknown crawler source: ${source}`);
        }

        const crawlResult = await crawlerModule();
        result.success = true;
        result.itemsCollected = crawlResult?.itemsCollected || 0;
        result.pagesProcessed = crawlResult?.pagesProcessed || 0;

        metrics.recordCrawlSuccess(result);
        logger.logCrawlResult(result);
    } catch (error) {
        result.success = false;
        result.errors.push(error.message);

        metrics.recordCrawlFailure(result);
        logger.error(`Crawl failed: ${source}`, { error: error.message, stack: error.stack });

        await notifier.notifyCrawlFailed(source, error);
    }

    result.duration = (Date.now() - startTime) / 1000;
    return result;
}

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://localhost:${API_PORT}`);

    if (url.pathname === '/health') {
        const snapshot = metrics.getSnapshot();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            uptime: snapshot.uptime_seconds,
            metrics: {
                crawls: { total: snapshot.crawl_total, success: snapshot.crawl_success, failed: snapshot.crawl_failed },
                captcha: { detected: snapshot.captcha_detected_total, solved: snapshot.captcha_solved_total, failed: snapshot.captcha_failed_total },
                successRate: snapshot.successRate,
                captchaSolveRate: snapshot.captchaSolveRate
            }
        }));
        return;
    }

    if (url.pathname.startsWith('/api/crawl/') && req.method === 'POST') {
        const source = url.pathname.replace('/api/crawl/', '');

        if (!getEnvBool(`CRAWL_${source.toUpperCase()}`)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Crawler ${source} is disabled`, success: false }));
            return;
        }

        logger.info(`API triggered crawl: ${source}`);
        const result = await runCrawler(source);

        res.writeHead(result.success ? 200 : 500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        return;
    }

    if (url.pathname === '/api/crawl/all' && req.method === 'POST') {
        const sources = ['58', 'anjuke', 'goofish', 'xiaohongshu', 'douyin']
            .filter(s => getEnvBool(`CRAWL_${s}`));

        const results = {};
        for (const source of sources) {
            results[source] = await runCrawler(source);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ results }));
        return;
    }

    if (url.pathname === '/api/stats') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(metrics.getSnapshot()));
        return;
    }

    if (url.pathname === '/api/logs/errors') {
        const limit = parseInt(url.searchParams.get('limit')) || 50;
        const errors = logger.getRecentErrors(limit);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ errors }));
        return;
    }

    if (url.pathname === '/api/logs/captcha') {
        const startDate = url.searchParams.get('start') || null;
        const endDate = url.searchParams.get('end') || null;
        const stats = logger.getCaptchaStats(startDate, endDate);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ captchaEvents: stats }));
        return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(API_PORT, () => {
    console.log(`[API Server] Crawler API listening on port ${API_PORT}`);
    console.log(`[API Server] Health check: http://localhost:${API_PORT}/health`);
    console.log(`[API Server] Metrics: http://localhost:${metrics.metricsPort}/metrics`);
});

process.on('SIGTERM', () => {
    console.log('[API Server] Received SIGTERM, shutting down...');
    metrics.stop();
    server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
    console.log('[API Server] Received SIGINT, shutting down...');
    metrics.stop();
    server.close(() => process.exit(0));
});