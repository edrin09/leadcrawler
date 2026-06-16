require('dotenv').config();
const path = require('path');
const RemoteServer = require('./src/human-intervention/server');

async function main() {
  const server = new RemoteServer();
  await server.start();
  console.log('\n按 Ctrl+C 停止服务器');
  process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    server.stop();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    server.stop();
    process.exit(0);
  });
}

main().catch(err => {
  console.error('启动失败:', err.message);
  process.exit(1);
});