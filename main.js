// 主入口文件，加载所有爬虫脚本
require('dotenv').config();

function getEnvBool(key, defaultValue = false) {
  const value = process.env[key];
  if (value === undefined || value === null) {
    return defaultValue;
  }
  return value.toLowerCase() === 'true' || value === '1';
}

async function runCrawlers() {
  console.log('========== 爬虫配置 ==========');
  console.log('58 爬虫:', getEnvBool('CRAWL_58') ? '启用' : '禁用');
  console.log('安居客爬虫:', getEnvBool('CRAWL_ANJUKE') ? '启用' : '禁用');
  console.log('Goofish 爬虫:', getEnvBool('CRAWL_GOOFISH') ? '启用' : '禁用');
  console.log('小红书爬虫:', getEnvBool('CRAWL_XIAOHONGSHU') ? '启用' : '禁用');
  console.log('抖音爬虫:', getEnvBool('CRAWL_DOUYIN') ? '启用' : '禁用');
  console.log('------------------------------');
  console.log('数据存储方式:', process.env.STORAGE_TYPE || 'csv');
  console.log('数据库名称:', process.env.DATABASE_NAME || 'crawler_db');
  console.log('数据表名称:', process.env.TABLE_NAME || 'data');
  console.log('==============================');
  console.log('\n开始加载爬虫脚本...');

  // 加载 58 爬虫
  if (getEnvBool('CRAWL_58')) {
    console.log('\n加载 58.js...');
    try {
      const run58Crawler = require('./run/58.js');
      console.log('58.js 加载成功');
      console.log('开始执行 58 爬虫...');
      await run58Crawler();
      console.log('58 爬虫执行完成');
    } catch (error) {
      console.error('加载或执行 58.js 失败:', error.message);
    }
  } else {
    console.log('\n58爬虫 已禁用');
  }

  // 加载安居客爬虫
  if (getEnvBool('CRAWL_ANJUKE')) {
    console.log('\n加载 anjuke.js...');
    try {
      const runAnjukeCrawler = require('./run/anjuke.js');
      console.log('anjuke.js 加载成功');
      console.log('开始执行安居客爬虫...');
      await runAnjukeCrawler();
      console.log('安居客爬虫执行完成');
    } catch (error) {
      console.error('加载或执行 anjuke.js 失败:', error.message);
    }
  } else {
    console.log('\n安居客爬虫 已禁用');
  }

  // 加载 Goofish 爬虫
  if (getEnvBool('CRAWL_GOOFISH')) {
    console.log('\n加载 goofish.js...');
    try {
      const runGoofishCrawler = require('./run/goofish.js');
      console.log('goofish.js 加载成功');
      console.log('开始执行 Goofish 爬虫...');
      await runGoofishCrawler();
      console.log('Goofish 爬虫执行完成');
    } catch (error) {
      console.error('加载或执行 goofish.js 失败:', error.message);
    }
  } else {
    console.log('\nGoofish爬虫 已禁用');
  }

  // 加载小红书爬虫
  if (getEnvBool('CRAWL_XIAOHONGSHU')) {
    console.log('\n加载 xiaohongshu.js...');
    try {
      const runXiaohongshuCrawler = require('./run/xiaohongshu.js');
      console.log('xiaohongshu.js 加载成功');
      console.log('开始执行小红书爬虫...');
      await runXiaohongshuCrawler();
      console.log('小红书爬虫执行完成');
    } catch (error) {
      console.error('加载或执行 xiaohongshu.js 失败:', error.message);
    }
  } else {
    console.log('\n小红书爬虫 已禁用');
  }

  // 加载抖音爬虫
  if (getEnvBool('CRAWL_DOUYIN')) {
    console.log('\n加载 douyin.js...');
    try {
      const runDouyinCrawler = require('./run/douyin.js');
      console.log('douyin.js 加载成功');
      console.log('开始执行抖音爬虫...');
      await runDouyinCrawler();
      console.log('抖音爬虫执行完成');
    } catch (error) {
      console.error('加载或执行 douyin.js 失败:', error.message);
    }
  } else {
    console.log('\n抖音爬虫 已禁用');
  }

  console.log('\n所有爬虫脚本执行完成');
}

// 运行爬虫
runCrawlers();