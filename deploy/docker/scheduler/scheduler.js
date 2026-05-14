const http = require('http');
const cron = require('node-cron');
const fetch = require('node-fetch');

const CRAWLER_API_URL = process.env.CRAWLER_API_URL || 'http://crawler:3001';
const SCHEDULER_PORT = parseInt(process.env.SCHEDULER_PORT) || 3000;

const tasks = [];
const taskHistory = [];
const MAX_HISTORY = 1000;

function parseCronExpression(envKey, defaultValue) {
    const value = process.env[envKey];
    if (value && value.trim()) return value.trim();
    return defaultValue;
}

function parseTaskConfig() {
    const configs = [];

    if (process.env.CRAWL_58 === 'true') {
        configs.push({
            name: '58同城采集',
            source: '58',
            cron: parseCronExpression('CRAWL_58_CRON', '0 */6 * * *'),
            enabled: true
        });
    }

    if (process.env.CRAWL_ANJUKE === 'true') {
        configs.push({
            name: '安居客采集',
            source: 'anjuke',
            cron: parseCronExpression('CRAWL_ANJUKE_CRON', '0 */4 * * *'),
            enabled: true
        });
    }

    if (process.env.CRAWL_GOOFISH === 'true') {
        configs.push({
            name: '闲鱼采集',
            source: 'goofish',
            cron: parseCronExpression('CRAWL_GOOFISH_CRON', '0 */8 * * *'),
            enabled: true
        });
    }

    if (process.env.CRAWL_XIAOHONGSHU === 'true') {
        configs.push({
            name: '小红书采集',
            source: 'xiaohongshu',
            cron: parseCronExpression('CRAWL_XIAOHONGSHU_CRON', '0 */12 * * *'),
            enabled: true
        });
    }

    if (process.env.CRAWL_DOUYIN === 'true') {
        configs.push({
            name: '抖音采集',
            source: 'douyin',
            cron: parseCronExpression('CRAWL_DOUYIN_CRON', '0 */12 * * *'),
            enabled: true
        });
    }

    return configs;
}

async function triggerCrawl(source) {
    const startTime = Date.now();
    console.log(`[Scheduler] Triggering crawl: ${source}`);

    try {
        const response = await fetch(`${CRAWLER_API_URL}/api/crawl/${source}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            timeout: 600000
        });

        const result = await response.json();
        const duration = Date.now() - startTime;

        const historyEntry = {
            source: source,
            timestamp: new Date().toISOString(),
            success: response.ok,
            duration: duration,
            result: result
        };

        taskHistory.push(historyEntry);
        if (taskHistory.length > MAX_HISTORY) {
            taskHistory.shift();
        }

        console.log(`[Scheduler] Crawl ${source} completed in ${duration}ms: ${response.ok ? 'OK' : 'FAILED'}`);
        return historyEntry;
    } catch (error) {
        const historyEntry = {
            source: source,
            timestamp: new Date().toISOString(),
            success: false,
            duration: Date.now() - startTime,
            error: error.message
        };

        taskHistory.push(historyEntry);
        if (taskHistory.length > MAX_HISTORY) {
            taskHistory.shift();
        }

        console.error(`[Scheduler] Crawl ${source} failed: ${error.message}`);
        return historyEntry;
    }
}

function startScheduler() {
    const configs = parseTaskConfig();
    console.log('[Scheduler] Starting task scheduler...');
    console.log(`[Scheduler] Crawler API: ${CRAWLER_API_URL}`);

    for (const config of configs) {
        if (!config.enabled) continue;

        console.log(`[Scheduler] Registering task: ${config.name} [${config.cron}]`);

        const task = cron.schedule(config.cron, async () => {
            console.log(`[Scheduler] Executing scheduled task: ${config.name}`);
            await triggerCrawl(config.source);
        }, {
            scheduled: true,
            timezone: process.env.TZ || 'Asia/Shanghai'
        });

        tasks.push({ config, task });
    }

    console.log(`[Scheduler] Registered ${tasks.length} scheduled tasks`);
}

function createServer() {
    const server = http.createServer(async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        const url = new URL(req.url, `http://localhost:${SCHEDULER_PORT}`);

        if (url.pathname === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'ok',
                uptime: process.uptime(),
                tasks: tasks.length,
                timestamp: new Date().toISOString()
            }));
            return;
        }

        if (url.pathname === '/api/tasks') {
            if (req.method === 'GET') {
                const taskList = tasks.map(t => ({
                    name: t.config.name,
                    source: t.config.source,
                    cron: t.config.cron,
                    enabled: t.config.enabled,
                    nextRun: t.task.nextDate()?.toISOString() || null
                }));

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ tasks: taskList }));
                return;
            }
        }

        if (url.pathname === '/api/trigger' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const { source } = JSON.parse(body);
                    if (!source) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'source is required' }));
                        return;
                    }

                    const result = await triggerCrawl(source);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(result));
                } catch (e) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: e.message }));
                }
            });
            return;
        }

        if (url.pathname === '/api/history') {
            const limit = parseInt(url.searchParams.get('limit')) || 50;
            const source = url.searchParams.get('source');

            let history = taskHistory;
            if (source) {
                history = history.filter(h => h.source === source);
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                history: history.slice(-limit).reverse(),
                total: taskHistory.length
            }));
            return;
        }

        if (url.pathname === '/api/stats') {
            const stats = {};
            for (const entry of taskHistory) {
                if (!stats[entry.source]) {
                    stats[entry.source] = { total: 0, success: 0, failed: 0, totalDuration: 0 };
                }
                stats[entry.source].total++;
                if (entry.success) {
                    stats[entry.source].success++;
                } else {
                    stats[entry.source].failed++;
                }
                stats[entry.source].totalDuration += entry.duration || 0;
            }

            const summary = Object.entries(stats).map(([source, s]) => ({
                source,
                total: s.total,
                success: s.success,
                failed: s.failed,
                successRate: s.total > 0 ? (s.success / s.total * 100).toFixed(1) + '%' : 'N/A',
                avgDuration: s.total > 0 ? Math.round(s.totalDuration / s.total) + 'ms' : 'N/A'
            }));

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ stats: summary }));
            return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
    });

    server.listen(SCHEDULER_PORT, () => {
        console.log(`[Scheduler] API server listening on port ${SCHEDULER_PORT}`);
    });
}

startScheduler();
createServer();