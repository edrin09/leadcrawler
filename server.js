const express = require('express');
const initSqlJs = require('sql.js');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let db;

async function initDatabase() {
  try {
    const SQL = await initSqlJs({
      locateFile: file => `node_modules/sql.js/dist/${file}`
    });

    const dbPath = './output/crawlerdb.db';

    if (!fs.existsSync(dbPath)) {
      throw new Error(`数据库文件不存在: ${dbPath}`);
    }

    const data = fs.readFileSync(dbPath);
    db = new SQL.Database(new Uint8Array(data));

    const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
    if (tables.length === 0) {
      throw new Error('数据库中没有找到表');
    }

    console.log(`成功连接到SQLite数据库，表: ${tables[0].values.map(v => v[0]).join(', ')}`);
  } catch (err) {
    console.error('数据库初始化失败:', err.message);
    process.exit(1);
  }
}

app.get('/api/listings', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const rowsResult = db.exec(`SELECT id, title, district, price, imageUrl, detailUrl, create_time FROM crawler_data ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`);

    if (rowsResult.length === 0) {
      return res.json({
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0
        }
      });
    }

    const rows = rowsResult[0].values.map(row => ({
      id: row[0],
      title: row[1],
      area: row[2],
      price: row[3],
      image_url: row[4],
      link_url: row[5],
      created_at: row[6]
    }));

    const countResult = db.exec('SELECT COUNT(*) as total FROM crawler_data');
    const total = countResult.length > 0 ? parseInt(countResult[0].values[0][0]) : 0;

    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('查询数据失败:', err.message);
    res.status(500).json({ error: '数据库查询失败', message: err.message });
  }
});

app.get('/api/listings/:id', (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const result = db.exec(`SELECT id, title, district, price, imageUrl, detailUrl, create_time FROM crawler_data WHERE id = ${id}`);

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ error: '数据不存在' });
    }

    const row = result[0].values[0];
    res.json({
      id: row[0],
      title: row[1],
      area: row[2],
      price: row[3],
      image_url: row[4],
      link_url: row[5],
      created_at: row[6]
    });
  } catch (err) {
    console.error('查询数据失败:', err.message);
    res.status(500).json({ error: '数据库查询失败', message: err.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDatabase().then(() => {
  app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
  });
});

process.on('SIGINT', () => {
  if (db) {
    db.close();
    console.log('数据库连接已关闭');
  }
  process.exit(0);
});