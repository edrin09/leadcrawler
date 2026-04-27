// 主入口文件，加载所有爬虫脚本

async function runCrawlers() {
  console.log('开始加载爬虫脚本...');

  // 加载 58 爬虫
  console.log('加载 58.js...');
  try {
    const run58Crawler = require('./run/58.js');
    console.log('58.js 加载成功');
    console.log('开始执行 58 爬虫...');
    await run58Crawler();
    console.log('58 爬虫执行完成');
  } catch (error) {
    console.error('加载或执行 58.js 失败:', error.message);
  }

  // 加载安居客爬虫
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

  // 加载 Goofish 爬虫
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

  // 加载小红书爬虫
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

  console.log('\n所有爬虫脚本执行完成');
}

// 运行爬虫
runCrawlers();
