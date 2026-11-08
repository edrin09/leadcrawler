<div align="center">

# 商业线索采集与智能分析平台

**销售要的不是「一堆网页」，是「一条能打的电话」。**

配置关键词 → 自动采集 58 同城 / 安居客 / 闲鱼 → 号码交叉验证打分 → 后台查询导出。
人工一天几十条，它一天几千条；单条线索成本从**元级压到毫级**。

[![PHP](https://img.shields.io/badge/PHP-8.3-777BB4?logo=php&logoColor=white)](https://www.php.net/)
[![Webman](https://img.shields.io/badge/Webman-2.x-4B8BBE)](https://www.workerman.net/webman)
[![Node](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.45%2B-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

GitHub [edrin09/leadcrawler](https://github.com/edrin09/leadcrawler) ｜ Gitee [edrin/leadcrawler](https://gitee.com/edrin/leadcrawler)

`三策略提取` · `跨平台交叉验证` · `验证码转人工` · `DeepSeek 语义判断` · `Docker 一键起`

</div>

---

## 一句话说清它解决什么

做商铺转让、二手设备、本地服务这类生意，客户名单散落在几个分类信息平台里。人工去翻：一天几十条，重复率高，号码真假难辨，还经常翻到中介。

这套系统把「翻网页」变成「一条流水线」：

```
关键词配置 → 无头浏览器采集 → 多策略号码提取 → 清洗去重
        → 跨平台交叉验证打分 → 后台筛选导出 → 人工跟进
```

**结果**：覆盖面从「今天翻了 3 页」变成「三个平台全量扫一遍」；判断依据从「看着像」变成「这个号在 3 个平台都留过，评分 87」。

---

## 为什么它不是一个普通爬虫

普通爬虫只做「抓下来」。这套东西多做了三件事，也是它真正的价值所在：

**① 号码提取不是一条正则**
正则、DOM 属性、页面内联脚本三路并行，取最可信的那个。手机号会被拆成 `138-xxxx-xxxx`、写成图片、塞进 JSON 字符串、藏在 `data-` 属性里——单一策略必然漏。**实测召回率 95%+**。

**② 号码是关联键，不是文本**
同一个号码出现在 58 同城的转让帖、安居客的房源里、闲鱼的商品描述中——这不是巧合，是同一个商户在不同平台铺量。系统以号码为主键聚合，**出现次数越多，评分越高**，同时保留各平台的原始上下文供人工判断。

**③ 遇验证码不乱撞**
滑块和点选硬刚只会封 IP。这里遇验证码**自动截图 → Socket.IO 推到人工介入台 → 操作员过码后爬虫自动续跑**。人只在必要的时候出现，其余时间全自动。

---

## 架构

```
                        Docker 容器
  ┌──────────────┬──────────────┬──────────────┐
  │  Webman 后台  │  Node 采集    │  人工介入服务  │
  │  PHP 8.3     │  Playwright   │  Socket.IO    │
  │  :8787       │  多页并发      │  :3456        │
  │  EasyAdmin8  │  三策略提取    │  验证码看板     │
  └──────┬───────┴──────┬───────┴──────┬────────┘
         └──────────────┼──────────────┘
                  ┌─────▼─────┐
                  │   MySQL   │  号码为主键，支撑去重/关联/评分
                  └───────────┘
```

- **采集层**：Playwright 模拟真实浏览器，绕过常规指纹检测；异常时截图上报而不是静默失败
- **协同层**：独立验证服务，浏览器端与操作员端 Socket.IO 双向通信
- **管理层**：Webman 常驻内存，RESTful API + WebSocket 推送 + Cron 定时调度
- **智能层**：DeepSeek 对号码上下文做语义判断（是不是中介、是不是正文里蹭的号），可用可关

---

## 核心能力

| 模块 | 说明 |
| --- | --- |
| 多平台采集 | 58 同城 / 安居客 / 闲鱼，URL 与关键词可配；新增平台按插件方式接入 |
| 智能提取 | 正则 + DOM 属性 + 页面脚本三策略融合，号码召回率 95%+ |
| 交叉验证 | 号码为关联键，跨平台出现次数与来源多样性共同决定可信度评分 |
| 人工介入 | 验证码截图 → Socket.IO 看板 → 过码后自动续跑，不硬刚不封号 |
| AI 增强 | DeepSeek 语义分析降误采，按上下文判断号码归属 |
| 后台管理 | EasyAdmin8（Webman + Layui）：查询、导出、定时任务、权限 |
| 移动端 | H5 随时查阅与跟进 |
| 一键部署 | Docker + Supervisord 统管三进程，自动重启、日志聚合 |
| 意向预测 | Rubix ML 对历史成交线索建模，给出购买意向分 |

---

## 快速开始

```bash
# 国内推荐 Gitee
git clone https://gitee.com/edrin/leadcrawler.git
# 或 git clone https://github.com/edrin09/leadcrawler.git
```

### 方式一：Docker（推荐）

代码以目录挂载进容器，先在宿主机装依赖：

```bash
cd crawler && npm install && npx playwright install chromium && cd ..
cd webman && composer install && cd ..

docker network create my_network
docker build -t crawler:latest -f docker/Dockerfile .
docker compose -f docker/docker-compose.yml up -d
```

后台 `http://localhost:8787`，人工介入看板 `http://localhost:3456`。

### 方式二：本地开发

```bash
# 1. 采集服务
cd crawler
npm install && npx playwright install chromium
cp .env.example .env
node main.js             # 按 .env 平台开关依次执行
node remote-server.js    # 人工介入服务（可选，:3456）

# 2. 后台服务
cd ../webman
composer install && cp .env.example .env
php start/start.php start
```

---

## 配置

两个服务各自独立配置，均带 `.env.example`：

| 变量 | 说明 |
| --- | --- |
| `HEADLESS` | `true` 生产无头；`false` 本地调试可见窗口 |
| `STORAGE_TYPE` | `mysql` 或 `csv`（调试期用 csv 零依赖） |
| `CRAWL_58` / `CRAWL_ANJUKE` / `CRAWL_GOOFISH` | 各平台采集总开关 |
| `AI_ENABLED` / `AI_API_KEY` | DeepSeek 语义分析，默认关 |
| `REMOTE_AUTH_TOKEN` | 爬虫端与操作员端认证令牌，**务必自行更换** |

---

## 目录结构

```
crawler/     Node 采集服务（run/ 各平台脚本 · src/ 提取器·入库·验证服务）
webman/      PHP 后台（app/ 业务 · public/ 后台与 H5）
docker/      Dockerfile · docker-compose · supervisord
```

## 技术栈

Node.js · Playwright · Express · Socket.IO · PHP 8.3 · Webman · EasyAdmin8 · Layui · MySQL · Rubix ML · DeepSeek API · Docker

---

## 使用边界（重要）

- 采集行为请遵守目标平台 `robots.txt` 与服务条款，仅用于自身业务场景的**合法信息获取**
- 请勿将数据用于骚扰性营销、倒卖或任何侵犯他人权益的用途
- 涉及个人信息处理时，请遵守《个人信息保护法》等适用法律法规，落实告知与授权
- 因使用不当产生的一切后果由使用者自负

> 这是个工程实现参考：反爬对抗、多策略抽取、人工介入闭环、混合技术栈协同。**技术可以学，滥用要担责。**

---

## License

MIT
