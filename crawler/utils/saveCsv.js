const fs = require('fs');
const path = require('path');

/**
 * 加载已存在的URLs，用于去重
 * @param {string} filePath - CSV文件路径
 * @returns {Set} - 已存在的URL集合
 */
function loadExistingUrls(filePath) {
  const existingUrls = new Set();
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
          const parts = line.split('"');
          // 找到detailUrl字段的位置（根据固定表头的顺序）
          if (parts.length >= 11) {
            const url = parts[9]; // detailUrl在第5列（索引9）
            if (url) {
              existingUrls.add(url);
            }
          }
        }
      }
      console.log(`已加载 ${existingUrls.size} 条现有数据`);
    }
  } catch (e) {
    console.log('读取现有数据出错:', e.message);
  }
  return existingUrls;
}

/**
 * 保存数据到CSV文件
 * @param {Array} data - 要保存的数据数组
 * @param {string} outputDir - 输出目录，默认为 ../output
 * @returns {number} - 保存的新数据条数
 */
function saveData(data, outputDir = path.join(__dirname, '../output')) {

  const filename = 'db.csv';
  try {
    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filePath = path.join(outputDir, filename);
    const existingUrls = loadExistingUrls(filePath);

    // 过滤掉已存在的数据
    const newData = data.filter(item => !existingUrls.has(item.detailUrl));
    console.log(`过滤后新增 ${newData.length} 条数据`);

    if (newData.length === 0) {
      console.log('无新数据需要保存');
      return 0;
    }

    // 固定CSV头部
    const headers = ['title', 'district', 'price', 'imageUrl', 'detailUrl', 'source', 'create_time'];
    const csvHeader = headers.join(',') + '\n';

    // 生成create_time字段 格式化为YYYY-MM-DD HH:mm:ss 并添加到数据中
    const createTime = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // 生成CSV数据
    const csvData = newData.map(item => {
      const row = headers.map(header => {
        if (header === 'create_time') {
          return `"${createTime}"`;
        }
        return `"${(item[header] || '').replace(/"/g, '""')}"`;
      });
      return row.join(',');
    }).join('\n');

    // 写入文件
    if (fs.existsSync(filePath)) {
      // 检查文件大小，只有当文件不为空时才添加换行符
      const stats = fs.statSync(filePath);
      if (stats.size > 0) {
        // 文件不为空，在追加前添加换行符
        fs.appendFileSync(filePath, '\n' + csvData, 'utf8');
      } else {
        // 文件为空，直接写入数据
        fs.appendFileSync(filePath, csvData, 'utf8');
      }
      console.log(`数据已追加到: ${filePath}`);
    } else {
      // 新文件，直接写入完整内容
      fs.writeFileSync(filePath, '\ufeff' + csvHeader + csvData, 'utf8');
      console.log(`数据已保存到: ${filePath}`);
    }

    return newData.length;
  } catch (e) {
    console.log('保存数据出错:', e.message);
    return 0;
  }
}

module.exports = {
  saveData
};
