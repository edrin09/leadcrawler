require('dotenv').config();

const csvStorage = require('./saveCsv');
const sqliteStorage = require('./saveSqlite');

function getStorageType() {
  const type = process.env.STORAGE_TYPE || 'csv';
  return type.toLowerCase();
}

function getDatabaseName() {
  return process.env.DATABASE_NAME || 'crawler_db';
}

function getTableName() {
  return process.env.TABLE_NAME || 'data';
}

async function saveData(data, options = {}) {
  const storageType = getStorageType();
  
  console.log(`使用存储方式: ${storageType}`);
  
  if (storageType === 'sqlite') {
    const dbName = options.databaseName || getDatabaseName();
    const tableName = options.tableName || getTableName();
    
    return await sqliteStorage.saveData(data, {
      databaseName: dbName,
      tableName: tableName,
      outputDir: options.outputDir
    });
  } else {
    const count = csvStorage.saveData(data, options.outputDir);
    return {
      success: true,
      message: `成功存储 ${count} 条数据`,
      successCount: count,
      failedCount: 0,
      errors: []
    };
  }
}

module.exports = {
  saveData,
  getStorageType,
  getDatabaseName,
  getTableName
};