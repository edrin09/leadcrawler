# 商业数据采集与智能分析平台

> 一个可落地的多平台商户线索采集系统：Playwright 无头浏览器采集 · 多策略电话提取 · 跨平台交叉验证 · 验证码人工介入 · AI 语义分析 · 后台管理一体化。

[![PHP](https://img.shields.io/badge/PHP-8.3-777BB4?logo=php&logoColor=white)](https://www.php.net/)
[![Webman](https://img.shields.io/badge/Webman-2.x-4B8BBE)](https://www.workerman.net/webman)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.45+-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

GitHub：[edrin09/leadcrawler](https://github.com/edrin09/leadcrawler) ｜ Gitee 镜像：[edrin/leadcrawler](https://gitee.com/edrin/leadcrawler)

---

## 解决什么问题

销售团队要拓客，得去 58 同城、安居客、闲鱼这些平台一条条翻商铺转让信息、手动记电话。人工做，一天几十条，覆盖面窄、重复率高、号码真假难辨。

本项目把这套流程做成流水线：**配置关键词 → 自动采集 → 清洗去重 → 可信度评分 → 后台查询导出**。单条线索的获取成本从人工的数元级降到毫分级。

## 核心能力

| 模块 | 说明 |
| --- | --- |
| 多平台采集 | 58 同城 / 安居客 / 闲鱼，URL 与关键词均可配置，插件式新增平台 |
| 智能提取 | 正则 + DOM 属性 + 页面 JS 三策略融合，电话召回率 95%+ |
| 交叉验证 | 以号码为关联键，多平台出现次数越多，可信度评分越高 |
| 人工介入 | 遇验证码自动截图并推送至 Socket.IO 看板，人工过码后爬虫自动续跑 |
| AI 增强 | 接入 DeepSeek，对号码上下文做语义判断，降低误采 |
| 后台管理 | EasyAdmin8（Webman + Layui），数据查询、导出、定时任务、权限 |
| 移动端 | H5 页面，随时查阅与跟进线索 |
| 一键部署 | Docker + Supervisord 统管三个进程，自动重启、日志聚合 |

## 架构

```
                     Docker 容器
  ┌──────────────┬──────────────┬──────────────┐
  │  Webman 后台  │  Node 爬虫    │  人工介入服务  │
  │  PHP 8.3     │  Playwright   │  Socket.IO    │
  │  :8787       │  多页并发      │  :3456        │
  └──────┬───────┴──────┬───────┴──────┬────────┘
         └──────────────┼──────────────┘
                  ┌─────┴─────┐
                  │   MySQL   │
                  └───────────┘
```

- **采集层**：Node + Playwright 模拟真实浏览器，绕开常规反爬，异常时截图上报。
- **协同层**：独立验证服务，浏览器端与操作员端通过 Socket.IO 双向通信。
- **管理层**：Webman 常驻内存，提供 RESTful API、WebSocket 推送、Cron 定时调度。
- **数据层**：MySQL 统一存储，号码为核⼼关联键，支撑去重、关联与评分。

## 快速开始

```bash
# 国内推荐从 Gitee 克隆
git clone https://gitee.com/edrin/leadcrawler.git
# 或 git clone https://github.com/edrin09/leadcrawler.git
```

### 方式一：Docker（推荐）

代码以目录挂载方式进入容器，所以先在宿主机装好依赖：

```bash
cd crawler && npm install && npx playwright install chromium && cd ..
cd webman && composer install && cd ..

docker network create my_network
docker build -t crawler:latest -f docker/Dockerfile .
docker compose -f docker/docker-compose.yml up -d
```

访问 `http://localhost:8787` 进入后台，`http://localhost:3456` 进入人工介入看板。

### 方式二：本地开发

```bash
# 1. 采集服务
cd crawler
npm install && npx playwright install chromium
cp .env.example .env                                    # 按需修改采集开关与数据库
node main.js                                            # 按 .env 中的平台开关依次执行
node remote-server.js                                   # 人工介入服务（可选，:3456）

# 2. 后台服务
cd ../webman
composer install
cp .env.example .env
php start/start.php start
```

## 配置

两个服务各自独立配置，均提供 `.env.example`：

- `crawler/.env` — 采集开关与地址、存储方式（csv / mysql）、MySQL、AI、验证服务、邮件通知
- `webman/.env` — 后台数据库连接、调试开关

关键项：

| 变量 | 说明 |
| --- | --- |
| `HEADLESS` | `true` 生产无头运行，`false` 本地调试可见窗口 |
| `STORAGE_TYPE` | `mysql` 或 `csv`，调试期可用 csv |
| `CRAWL_58` / `CRAWL_ANJUKE` / `CRAWL_GOOFISH` | 各平台采集总开关 |
| `AI_ENABLED` / `AI_API_KEY` | DeepSeek 语义分析，默认关闭 |
| `REMOTE_AUTH_TOKEN` | 爬虫端与操作员端的认证令牌，务必自行更换 |

## 目录结构

```
crawler/          Node 采集服务（run/ 各平台脚本，src/ 提取器·入库·验证服务）
webman/           PHP 后台（app/ 业务，public/ 后台与 H5）
docker/           Dockerfile · docker-compose · supervisord
```

## 技术栈

Node.js · Playwright · Express · Socket.IO · PHP 8.3 · Webman · EasyAdmin8 · Layui · MySQL · Rubix ML · DeepSeek API · Docker

## 说明

- 采集行为请遵守目标平台的 `robots.txt` 与服务条款，仅用于自身业务场景的合法信息获取。
- 请勿将采集数据用于骚扰性营销或倒卖。因使用不当产生的一切后果由使用者自负。
- 项目长期迭代中，欢迎提 Issue 交流实现细节。

## License

MIT
