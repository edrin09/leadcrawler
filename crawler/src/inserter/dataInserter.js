const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const INSERTER_VERSION = '2.0.0';

let pool = null;

async function initPool() {
    if (pool) return pool;

    const config = {
        host: process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT || process.env.DB_PORT) || 3306,
        user: process.env.MYSQL_USER || process.env.DB_USER || 'root',
        password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || process.env.DB_DATABASE || 'crawler',
        waitForConnections: true,
        connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
        queueLimit: 0,
        charset: 'utf8mb4',
    };

    pool = mysql.createPool(config);

    try {
        const connection = await pool.getConnection();
        connection.release();
        console.log('Database connection pool initialized successfully');

        await initTables();
        console.log('Database tables initialized successfully');
    } catch (error) {
        console.error('Failed to initialize database connection pool:', error.message);
        throw error;
    }

    return pool;
}

async function initTables() {
    const connection = await getConnection();
    try {
        const mallDataTable = `
            CREATE TABLE IF NOT EXISTS ed_mall_data (
                id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
                title TEXT COMMENT '标题',
                district VARCHAR(200) COMMENT '区域',
                price VARCHAR(100) COMMENT '价格',
                image_url TEXT COMMENT '图片URL',
                detail_url TEXT COMMENT '详情页URL',
                source VARCHAR(100) COMMENT '数据来源',
                business_name TEXT COMMENT '商户名称',
                keywords TEXT COMMENT '关键词(JSON格式)',
                business_info TEXT COMMENT '商户信息(JSON格式)',
                phone_count INT DEFAULT 0 COMMENT '手机号数量',
                create_time DATETIME COMMENT '创建时间',
                INDEX idx_source (source),
                INDEX idx_create_time (create_time),
                UNIQUE KEY idx_detail_url (detail_url(512))
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商铺信息主表'
        `;

        const mallPhonesTable = `
            CREATE TABLE IF NOT EXISTS ed_mall_phones (
                id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
                mall_data_id INT COMMENT '关联的商铺ID',
                phone VARCHAR(20) NOT NULL COMMENT '电话',
                confidence_level VARCHAR(20) COMMENT '置信度级别',
                confidence_score INT COMMENT '置信度分数',
                source_count INT COMMENT '来源数量',
                sources TEXT COMMENT '来源信息(JSON格式)',
                mall_data_url TEXT COMMENT '商铺详情页URL',
                mall_data_title TEXT COMMENT '商铺标题',
                source_platform TEXT COMMENT '数据来源平台',
                create_time DATETIME COMMENT '创建时间',
                INDEX idx_phone_mall (phone, mall_data_id),
                INDEX idx_phone (phone),
                INDEX idx_confidence (confidence_level, confidence_score)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商铺手机号表'
        `;

        await connection.execute(mallDataTable);
        await connection.execute(mallPhonesTable);
    } finally {
        connection.release();
    }
}

async function getConnection() {
    if (!pool) {
        await initPool();
    }
    return pool.getConnection();
}

async function closePool() {
    if (pool) {
        await pool.end();
        pool = null;
        console.log('Database connection pool closed');
    }
}

async function checkMallDataExists(detailUrl) {
    const connection = await getConnection();
    try {
        const [rows] = await connection.execute(
            'SELECT id FROM ed_mall_data WHERE detail_url = ? LIMIT 1',
            [detailUrl]
        );
        return rows.length > 0 ? rows[0].id : null;
    } finally {
        connection.release();
    }
}

async function insertMallData(record) {
    const connection = await getConnection();
    try {
        const fields = [];
        const values = [];
        const placeholders = [];

        const fieldMapping = {
            title: 'title',
            district: 'district',
            price: 'price',
            image_url: 'imageUrl',
            detail_url: 'detailUrl',
            source: 'source',
            business_name: 'business_name',
            keywords: 'keywords',
            business_info: 'business_info',
            phone_count: 'phone_count',
            create_time: 'create_time',
        };

        for (const [dbField, recordField] of Object.entries(fieldMapping)) {
            if (record[recordField] !== undefined && record[recordField] !== null) {
                fields.push(dbField);
                if (record[recordField] instanceof Date) {
                    values.push(record[recordField]);
                } else if (Array.isArray(record[recordField]) || (typeof record[recordField] === 'object' && record[recordField] !== null)) {
                    values.push(JSON.stringify(record[recordField]));
                } else {
                    values.push(String(record[recordField]));
                }
                placeholders.push('?');
            }
        }

        if (fields.length === 0) {
            return { success: false, error: 'No fields to insert' };
        }

        const sql = `INSERT INTO ed_mall_data (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
        const [result] = await connection.execute(sql, values);

        return {
            success: true,
            insertId: result.insertId,
            affectedRows: result.affectedRows,
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            code: error.code,
        };
    } finally {
        connection.release();
    }
}

async function insertPhoneRecords(phoneRecords) {
    if (!phoneRecords || phoneRecords.length === 0) {
        return { success: true, insertedCount: 0 };
    }

    const connection = await getConnection();
    let insertedCount = 0;
    const errors = [];

    try {
        for (const phoneRecord of phoneRecords) {
            try {
                const fields = [];
                const values = [];
                const placeholders = [];

                const fieldMapping = {
                    mall_data_id: 'mall_data_id',
                    phone: 'phone',
                    confidence_level: 'confidence_level',
                    confidence_score: 'confidence_score',
                    source_count: 'source_count',
                    sources: 'sources',
                    mall_data_url: 'mall_data_url',
                    mall_data_title: 'mall_data_title',
                    source_platform: 'source_platform',
                    create_time: 'create_time',
                };

                for (const [dbField, recordField] of Object.entries(fieldMapping)) {
                    if (phoneRecord[recordField] !== undefined && phoneRecord[recordField] !== null) {
                        fields.push(dbField);
                        if (Array.isArray(phoneRecord[recordField])) {
                            values.push(JSON.stringify(phoneRecord[recordField]));
                        } else if (phoneRecord[recordField] instanceof Date) {
                            values.push(phoneRecord[recordField]);
                        } else {
                            values.push(String(phoneRecord[recordField]));
                        }
                        placeholders.push('?');
                    }
                }

                if (fields.length > 0) {
                    const sql = `INSERT INTO ed_mall_phones (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
                    await connection.execute(sql, values);
                    insertedCount++;
                }
            } catch (error) {
                if (error.code !== 'ER_DUP_ENTRY') {
                    errors.push({
                        phone: phoneRecord.phone,
                        error: error.message,
                    });
                }
            }
        }

        return {
            success: true,
            insertedCount,
            errors: errors.length > 0 ? errors : undefined,
        };
    } finally {
        connection.release();
    }
}

async function updateMallDataPhoneCount(mallDataId, phoneCount) {
    const connection = await getConnection();
    try {
        const sql = 'UPDATE ed_mall_data SET phone_count = ? WHERE id = ?';
        await connection.execute(sql, [phoneCount, mallDataId]);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    } finally {
        connection.release();
    }
}

async function getMallDataById(mallDataId) {
    const connection = await getConnection();
    try {
        const [rows] = await connection.execute(
            'SELECT * FROM ed_mall_data WHERE id = ? LIMIT 1',
            [mallDataId]
        );
        return rows[0] || null;
    } finally {
        connection.release();
    }
}

async function updateMallDataBusinessInfo(mallDataId, data) {
    const connection = await getConnection();
    try {
        const updates = [];
        const params = [];

        if (data.business_name !== undefined) {
            updates.push('business_name = ?');
            params.push(data.business_name);
        }
        if (data.keywords !== undefined) {
            updates.push('keywords = ?');
            params.push(JSON.stringify(data.keywords));
        }
        if (data.business_info !== undefined) {
            updates.push('business_info = ?');
            params.push(JSON.stringify(data.business_info));
        }

        if (updates.length === 0) {
            return { success: true };
        }

        params.push(mallDataId);
        const sql = `UPDATE ed_mall_data SET ${updates.join(', ')} WHERE id = ?`;
        await connection.execute(sql, params);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    } finally {
        connection.release();
    }
}

async function findPhonesByMallDataId(mallDataId) {
    const connection = await getConnection();
    try {
        const [rows] = await connection.execute(
            'SELECT * FROM ed_mall_phones WHERE mall_data_id = ? ORDER BY confidence_score DESC',
            [mallDataId]
        );
        return rows;
    } finally {
        connection.release();
    }
}

async function findPhonesByPhone(phone) {
    const connection = await getConnection();
    try {
        const [rows] = await connection.execute(
            'SELECT * FROM ed_mall_phones WHERE phone = ? ORDER BY confidence_score DESC',
            [phone]
        );
        return rows;
    } finally {
        connection.release();
    }
}

async function findPhoneById(id) {
    const connection = await getConnection();
    try {
        const [rows] = await connection.execute(
            'SELECT * FROM ed_mall_phones WHERE id = ? LIMIT 1',
            [id]
        );
        return rows[0] || null;
    } finally {
        connection.release();
    }
}

async function deletePhonesByMallDataId(mallDataId) {
    const connection = await getConnection();
    try {
        const [result] = await connection.execute(
            'DELETE FROM ed_mall_phones WHERE mall_data_id = ?',
            [mallDataId]
        );
        return { success: true, affectedRows: result.affectedRows };
    } catch (error) {
        return { success: false, error: error.message };
    } finally {
        connection.release();
    }
}

async function processAndSaveCrawlData(crawlData, extractorResult) {
    if (!crawlData || crawlData.length === 0) {
        return {
            success: true,
            processed: 0,
            saved: 0,
            skipped: 0,
            phonesInserted: 0,
            message: 'No crawl data to process'
        };
    }

    const connection = await getConnection();
    let saved = 0;
    let skipped = 0;
    let phonesInserted = 0;
    const errors = [];

    try {
        await connection.beginTransaction();

        for (const item of crawlData) {
            const detailUrl = item.detailUrl || item.detail_url || '';
            if (!detailUrl) continue;

            const existingId = await checkMallDataExists(detailUrl);
            if (existingId) {
                skipped++;
                continue;
            }

            const detailResult = extractorResult?.detail_results?.find(
                r => r.url === detailUrl
            );

            const mallDataRecord = {
                title: item.title || '',
                district: item.district || '',
                price: item.price || '',
                imageUrl: item.imageUrl || item.image_url || '',
                detailUrl: detailUrl,
                source: item.source || '',
                business_name: detailResult?.business_name || '',
                keywords: detailResult?.keywords || [],
                business_info: detailResult?.business_info || {},
                phone_count: 0,
                create_time: new Date(),
            };

            const insertResult = await insertMallData(mallDataRecord);
            if (!insertResult.success) {
                errors.push({
                    detailUrl,
                    error: insertResult.error,
                });
                continue;
            }

            const mallDataId = insertResult.insertId;

            const phoneRecords = [];
            if (extractorResult?.phones && extractorResult.phones.length > 0) {
                for (const scoredPhone of extractorResult.phones) {
                    phoneRecords.push({
                        mall_data_id: mallDataId,
                        phone: scoredPhone.phone,
                        confidence_level: scoredPhone.level || 'low',
                        confidence_score: scoredPhone.score || 0,
                        source_count: scoredPhone.source_count || 0,
                        sources: scoredPhone.source_detail || scoredPhone.sources || [],
                        mall_data_url: detailUrl,
                        mall_data_title: item.title || '',
                        source_platform: item.source || '',
                        create_time: new Date(),
                    });
                }
            }

            if (phoneRecords.length > 0) {
                await updateMallDataPhoneCount(mallDataId, phoneRecords.length);
                const phoneInsertResult = await insertPhoneRecords(phoneRecords);
                phonesInserted += phoneInsertResult.insertedCount;
            }

            saved++;
        }

        await connection.commit();

        return {
            success: true,
            processed: crawlData.length,
            saved,
            skipped,
            phonesInserted,
            errors: errors.length > 0 ? errors : undefined,
            message: `Processed ${crawlData.length} items, saved ${saved}, skipped ${skipped}, phones ${phonesInserted}`
        };
    } catch (error) {
        await connection.rollback();
        return {
            success: false,
            error: error.message,
            processed: crawlData.length,
            saved,
            skipped,
            phonesInserted,
            errors,
        };
    } finally {
        connection.release();
    }
}

async function getStatistics(source = null) {
    const connection = await getConnection();
    try {
        let sql = `
            SELECT 
                m.source,
                COUNT(*) as total,
                SUM(m.phone_count) as total_phones,
                SUM(CASE WHEN m.phone_count > 0 THEN 1 ELSE 0 END) as with_phone,
                MAX(m.create_time) as last_update
            FROM ed_mall_data m
        `;

        const params = [];
        if (source) {
            sql += ' WHERE m.source = ?';
            params.push(source);
        }

        sql += ' GROUP BY m.source ORDER BY total DESC';

        const [rows] = await connection.execute(sql, params);
        return rows;
    } finally {
        connection.release();
    }
}

async function getPhoneStatistics() {
    const connection = await getConnection();
    try {
        const sql = `
            SELECT 
                COUNT(*) as total_phones,
                SUM(CASE WHEN confidence_level = 'high' THEN 1 ELSE 0 END) as high_confidence,
                SUM(CASE WHEN confidence_level = 'medium' THEN 1 ELSE 0 END) as medium_confidence,
                SUM(CASE WHEN confidence_level = 'low' THEN 1 ELSE 0 END) as low_confidence,
                COUNT(DISTINCT phone) as unique_phones
            FROM ed_mall_phones
        `;
        const [rows] = await connection.execute(sql);
        return rows[0];
    } finally {
        connection.release();
    }
}

module.exports = {
    INSERTER_VERSION,
    initPool,
    getConnection,
    closePool,
    initTables,
    checkMallDataExists,
    insertMallData,
    insertPhoneRecords,
    updateMallDataPhoneCount,
    getMallDataById,
    updateMallDataBusinessInfo,
    findPhonesByMallDataId,
    findPhonesByPhone,
    findPhoneById,
    deletePhonesByMallDataId,
    processAndSaveCrawlData,
    getStatistics,
    getPhoneStatistics,
};
