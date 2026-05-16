const mysql = require('mysql2/promise');

class MysqlStorage {
  constructor(options = {}) {
    this.host = options.host || process.env.MYSQL_HOST || 'localhost';
    this.port = options.port || process.env.MYSQL_PORT || 3306;
    this.user = options.user || process.env.MYSQL_USER || 'root';
    this.password = options.password || process.env.MYSQL_PASSWORD || '';
    this.database = options.database || process.env.MYSQL_DATABASE || 'crawler';
    this.tableName = options.tableName || 'ed_mall_data';
    this.connection = null;
  }

  async connect() {
    if (this.connection) {
      return this.connection;
    }

    try {
      this.connection = await mysql.createConnection({
        host: this.host,
        port: this.port,
        user: this.user,
        password: this.password,
        charset: 'utf8mb4'
      });
      console.log('MySQL连接成功');
      return this.connection;
    } catch (error) {
      throw new Error(`MySQL连接失败: ${error.message}`);
    }
  }

  async init() {
    await this.connect();
    await this.createDatabase();
    await this.createTable();
    return true;
  }

  async createDatabase() {
    try {
      await this.connection.query(`CREATE DATABASE IF NOT EXISTS ${this.database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      await this.connection.query(`USE ${this.database}`);
      console.log(`数据库 ${this.database} 已准备就绪`);
    } catch (error) {
      console.log(`数据库创建失败(可能已存在): ${error.message}`);
    }
  }

  async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        district VARCHAR(200),
        price VARCHAR(100),
        imageUrl TEXT,
        detailUrl VARCHAR(1000) UNIQUE NOT NULL,
        source VARCHAR(100),
        create_time DATETIME,
        INDEX idx_source (source),
        INDEX idx_create_time (create_time)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await this.connection.execute(sql);
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

  async getExistingUrls() {
    try {
      const [rows] = await this.connection.execute(`SELECT detailUrl FROM ${this.tableName}`);
      const urls = new Set();
      rows.forEach(row => {
        if (row.detailUrl) urls.add(row.detailUrl);
      });
      console.log(`已加载 ${urls.size} 条现有数据`);
      return urls;
    } catch (error) {
      console.log(`获取现有数据失败(表可能不存在): ${error.message}`);
      return new Set();
    }
  }

  async insertBatch(data) {
    if (!Array.isArray(data) || data.length === 0) {
      console.log('数据为空，跳过插入');
      return { successCount: 0, failedCount: 0, errors: [] };
    }

    console.log(`待插入数据: ${data.length} 条`);

    let successCount = 0, failedCount = 0, errors = [];
    const existingUrls = await this.getExistingUrls();
    const newData = data.filter(item => !existingUrls.has(item.detailUrl));

    console.log(`过滤后新增数据: ${newData.length} 条`);

    if (newData.length === 0) {
      return { successCount: 0, failedCount: 0, errors: [] };
    }

    const createTime = new Date().toISOString().replace('T', ' ').substring(0, 19);

    for (const item of newData) {
      const validation = this.validateData(item);
      if (!validation.isValid) {
        errors.push({ item: item.detailUrl || 'unknown', reason: validation.errors.join('; ') });
        failedCount++;
        continue;
      }

      try {
        const sql = `
          INSERT IGNORE INTO ${this.tableName} 
          (title, district, price, imageUrl, detailUrl, source, create_time) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await this.connection.execute(sql, [
          item.title,
          item.district,
          item.price,
          item.imageUrl,
          item.detailUrl,
          item.source,
          item.create_time || createTime
        ]);

        if (result.affectedRows > 0) {
          successCount++;
        } else {
          failedCount++;
          errors.push({ item: item.detailUrl, reason: '数据已存在或插入失败' });
        }
      } catch (e) {
        errors.push({ item: item.detailUrl || 'unknown', reason: e.message });
        failedCount++;
      }
    }

    return { successCount, failedCount, errors };
  }

  async query(options = {}) {
    let sql = `SELECT * FROM ${this.tableName}`;
    const params = [];

    if (options.source) {
      sql += ` WHERE source = ?`;
      params.push(options.source);
    }

    if (options.limit) {
      sql += ` LIMIT ?`;
      params.push(options.limit);
    }

    const [rows] = await this.connection.execute(sql, params);
    return rows;
  }

  async getCount() {
    const [rows] = await this.connection.execute(`SELECT COUNT(*) as count FROM ${this.tableName}`);
    return rows[0]?.count || 0;
  }

  async close() {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }
}

async function saveData(data, options = {}) {
  const { tableName = 'ed_mall_data' } = options;
  const storage = new MysqlStorage({ tableName, ...options });

  try {
    await storage.init();
    const result = await storage.insertBatch(data);

    console.log('\n===== Data saved to MySQL =====');
    console.log('Database:', storage.database);
    console.log('Table:', storage.tableName);
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
  } finally {
    await storage.close();
  }
}

module.exports = { MysqlStorage, saveData };