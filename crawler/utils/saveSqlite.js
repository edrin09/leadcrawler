const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SqliteStorage {
  constructor(databaseName = 'crawlerdb', tableName = 'data', outputDir = path.join(__dirname, '../../output')) {
    this.databaseName = databaseName;
    this.tableName = tableName;
    this.outputDir = outputDir;
    this.dbPath = path.join(outputDir, `${databaseName}.db`);
  }

  exec(sql) {
    const escapedDbPath = this.dbPath.replace(/\\/g, '\\\\');
    const command = `sqlite3 "${escapedDbPath}" "${sql}"`;
    try {
      const result = execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      return result.trim();
    } catch (error) {
      if (error.status !== 0) {
        if (error.stdout) return error.stdout.trim();
        return '';
      }
      throw new Error(`SQL execute failed: ${error.message}`);
    }
  }

  init() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    this.createTable();
    return true;
  }

  createTable() {
    const sql = `CREATE TABLE IF NOT EXISTS ${this.tableName} (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, district TEXT, price TEXT, imageUrl TEXT, detailUrl TEXT UNIQUE, source TEXT, create_time TEXT);`;
    this.exec(sql);
  }

  validateData(item) {
    const errors = [];
    const requiredFields = ['title', 'district', 'price', 'imageUrl', 'detailUrl', 'source'];
    for (const field of requiredFields) {
      if (!item[field] && item[field] !== 0 && item[field] !== false) {
        errors.push(`Missing field: ${field}`);
      }
    }
    return { isValid: errors.length === 0, errors };
  }

  getExistingUrls() {
    const result = this.exec(`SELECT detailUrl FROM ${this.tableName}`);
    const urls = new Set();
    if (result) {
      result.split('\n').forEach(url => { if (url.trim()) urls.add(url.trim()); });
    }
    return urls;
  }

  escapeString(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "''");
  }

  insertBatch(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return { successCount: 0, failedCount: 0, errors: [] };
    }

    let successCount = 0, failedCount = 0, errors = [];
    const existingUrls = this.getExistingUrls();
    const newData = data.filter(item => !existingUrls.has(item.detailUrl));

    if (newData.length === 0) {
      return { successCount: 0, failedCount: 0, errors: [] };
    }

    const createTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
    this.exec('BEGIN TRANSACTION');

    for (const item of newData) {
      const validation = this.validateData(item);
      if (!validation.isValid) {
        errors.push({ item: item.detailUrl || 'unknown', reason: validation.errors.join('; ') });
        failedCount++;
        continue;
      }

      try {
        const sql = `INSERT OR IGNORE INTO ${this.tableName} (title, district, price, imageUrl, detailUrl, source, create_time) VALUES ('${this.escapeString(item.title)}', '${this.escapeString(item.district)}', '${this.escapeString(item.price)}', '${this.escapeString(item.imageUrl)}', '${this.escapeString(item.detailUrl)}', '${this.escapeString(item.source)}', '${item.create_time || createTime}');`;
        this.exec(sql);
        successCount++;
      } catch (e) {
        errors.push({ item: item.detailUrl || 'unknown', reason: e.message });
        failedCount++;
      }
    }

    this.exec('COMMIT');
    return { successCount, failedCount, errors };
  }

  query(options = {}) {
    let sql = `SELECT * FROM ${this.tableName}`;
    if (options.source) sql += ` WHERE source = '${this.escapeString(options.source)}'`;
    if (options.limit) sql += ` LIMIT ${options.limit}`;
    const result = this.exec(sql);
    const rows = [];
    if (result) {
      result.split('\n').forEach(line => {
        if (line.trim()) {
          const parts = line.split('|');
          rows.push({
            id: parseInt(parts[0]),
            title: parts[1],
            district: parts[2],
            price: parts[3],
            imageUrl: parts[4],
            detailUrl: parts[5],
            source: parts[6],
            create_time: parts[7]
          });
        }
      });
    }
    return rows;
  }

  getCount() {
    const result = this.exec(`SELECT COUNT(*) FROM ${this.tableName}`);
    return parseInt(result) || 0;
  }
}

function saveData(data, options = {}) {
  const { databaseName = 'crawler_db', tableName = 'data', outputDir = path.join(__dirname, '../output') } = options;
  const storage = new SqliteStorage(databaseName, tableName, outputDir);

  try {
    storage.init();
    const result = storage.insertBatch(data);

    console.log('\n===== Data saved =====');
    console.log('Database file:', storage.dbPath);
    console.log('Success:', result.successCount, 'rows');
    console.log('Failed:', result.failedCount, 'rows');

    if (result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach((e, i) => console.log(`${i + 1}. URL: ${e.item}, Reason: ${e.reason}`));
    }

    console.log('========================');
    return { success: true, message: `Saved ${result.successCount} rows`, ...result };
  } catch (e) {
    return { success: false, message: `Save failed: ${e.message}`, successCount: 0, failedCount: 0, errors: [e.message] };
  }
}

module.exports = { SqliteStorage, saveData };
