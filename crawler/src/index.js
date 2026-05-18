const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const unifiedExtractor = require('./extractor/unifiedExtractor');
const dataInserter = require('./inserter/dataInserter');

const VERSION = '2.0.0';

async function extractAndSave(crawlData, options = {}) {
    const {
        timeout = 10000,
        maxPlatforms = 6,
        saveToDb = true,
    } = options;

    if (!crawlData || crawlData.length === 0) {
        return {
            success: true,
            extraction: { phones: [], detail_results: [], summary: { total_phones: 0 } },
            save: { saved: 0, skipped: 0, processed: 0, phonesInserted: 0 },
        };
    }

    const total = crawlData.length;
    let saved = 0;
    let skipped = 0;
    let totalPhonesInserted = 0;
    const allDetailResults = [];
    const allPhones = [];
    const errors = [];

    if (saveToDb) {
        await dataInserter.initPool();
    }

    console.log(`[Extractor] Processing ${total} items one-by-one...`);

    for (let i = 0; i < total; i++) {
        const item = crawlData[i];
        const detailUrl = item.detailUrl || item.detail_url || '';
        const title = (item.title || '').substring(0, 30);

        if (!detailUrl) {
            console.log(`[${i + 1}/${total}] SKIP - no detail URL`);
            skipped++;
            continue;
        }

        console.log(`[${i + 1}/${total}] ${title}...`);

        try {
            const detailInfo = await unifiedExtractor.extractDetailPageInfo(detailUrl, timeout);
            detailInfo.source = item.source || '';
            detailInfo.original_title = item.title || '';
            allDetailResults.push(detailInfo);

            const phoneCount = detailInfo.phones ? detailInfo.phones.length : 0;
            if (phoneCount > 0) {
                console.log(`  -> Found ${phoneCount} phone(s): ${detailInfo.phones.join(', ')}`);
            } else {
                console.log(`  -> No phones found (status: ${detailInfo.status})`);
            }

            if (saveToDb) {
                const existingId = await dataInserter.checkMallDataExists(detailUrl);
                if (existingId) {
                    console.log(`  -> Already exists in DB (id=${existingId}), skipped`);
                    skipped++;
                    continue;
                }

                const mallDataRecord = {
                    title: item.title || '',
                    district: item.district || '',
                    price: item.price || '',
                    imageUrl: item.imageUrl || item.image_url || '',
                    detailUrl: detailUrl,
                    source: item.source || '',
                    business_name: detailInfo.business_name || '',
                    keywords: detailInfo.keywords || [],
                    business_info: detailInfo.business_info || {},
                    phone_count: phoneCount,
                    create_time: new Date(),
                };

                const insertResult = await dataInserter.insertMallData(mallDataRecord);
                if (!insertResult.success) {
                    console.log(`  -> DB insert failed: ${insertResult.error}`);
                    errors.push({ detailUrl, error: insertResult.error });
                    continue;
                }

                const mallDataId = insertResult.insertId;

                if (phoneCount > 0) {
                    const phoneRecords = detailInfo.phones.map(phone => ({
                        mall_data_id: mallDataId,
                        phone: phone,
                        confidence_level: 'medium',
                        confidence_score: 50,
                        source_count: 1,
                        sources: [{ source: 'detail_page', url: detailUrl }],
                        mall_data_url: detailUrl,
                        mall_data_title: item.title || '',
                        source_platform: item.source || '',
                        create_time: new Date(),
                    }));

                    const phoneInsertResult = await dataInserter.insertPhoneRecords(phoneRecords);
                    totalPhonesInserted += phoneInsertResult.insertedCount;
                    await dataInserter.updateMallDataPhoneCount(mallDataId, phoneCount);
                }

                saved++;
                console.log(`  -> Saved to DB (id=${mallDataId}, phones=${phoneCount})`);
            }
        } catch (err) {
            console.log(`  -> Error: ${err.message}`);
            errors.push({ detailUrl, error: err.message });
        }
    }

    const summary = {
        total_phones: allPhones.length,
        high_confidence: 0,
        medium_confidence: allPhones.length,
        low_confidence: 0,
        detail_pages_processed: allDetailResults.length,
        elapsed: 0,
    };

    console.log(`\n[Extractor] Done! Processed: ${total}, Saved: ${saved}, Skipped: ${skipped}, Phones: ${totalPhonesInserted}`);

    return {
        success: true,
        extraction: {
            phones: allPhones,
            detail_results: allDetailResults,
            summary,
        },
        save: {
            saved,
            skipped,
            processed: total,
            phonesInserted: totalPhonesInserted,
            errors: errors.length > 0 ? errors : undefined,
        },
    };
}

function extractPhones(text) {
    return unifiedExtractor.extractPhonesPublic(text);
}

function extractKeywords(text, businessName = '') {
    return unifiedExtractor.extractSearchKeywords(text, businessName);
}

async function extractPhonesFromUrl(url, options = {}) {
    const {
        timeout = 10000,
        includeBusinessInfo = true,
    } = options;

    const detailInfo = await unifiedExtractor.extractDetailPageInfo(url, timeout);

    if (detailInfo.status !== 'success') {
        return {
            success: false,
            status: detailInfo.status,
            status_msg: detailInfo.status_msg,
            phones: [],
            business_name: '',
            keywords: [],
        };
    }

    return {
        success: true,
        phones: detailInfo.phones,
        business_name: detailInfo.business_name,
        business_info: detailInfo.business_info,
        keywords: detailInfo.keywords,
        phone_details: {
            text_phones: detailInfo.text_phones || [],
            attr_phones: detailInfo.attr_phones || [],
            script_phones: detailInfo.script_phones || [],
        },
    };
}

async function processSingleItem(item, options = {}) {
    const detailUrl = item.detailUrl || item.detail_url;
    if (!detailUrl) {
        return {
            success: false,
            error: 'No detail URL provided',
        };
    }

    const extractResult = await extractPhonesFromUrl(detailUrl, options);

    return {
        success: extractResult.success,
        item: {
            ...item,
            phones: extractResult.phones,
            business_name: extractResult.business_name,
            business_info: extractResult.business_info,
            keywords: extractResult.keywords,
            phone_details: extractResult.phone_details,
        },
        status: extractResult.status,
        status_msg: extractResult.status_msg,
    };
}

async function extractBatch(urls, options = {}) {
    const results = [];
    for (const url of urls) {
        const result = await extractPhonesFromUrl(url, options);
        results.push({
            url,
            ...result,
        });
    }
    return results;
}

async function getStatistics(source = null) {
    await dataInserter.initPool();
    return dataInserter.getStatistics(source);
}

async function getPhoneStatistics() {
    await dataInserter.initPool();
    return dataInserter.getPhoneStatistics();
}

async function findPhonesByMallDataId(mallDataId) {
    await dataInserter.initPool();
    return dataInserter.findPhonesByMallDataId(mallDataId);
}

async function findPhonesByPhone(phone) {
    await dataInserter.initPool();
    return dataInserter.findPhonesByPhone(phone);
}

async function closeConnections() {
    await dataInserter.closePool();
}

module.exports = {
    VERSION,
    extractAndSave,
    extractPhones,
    extractKeywords,
    extractPhonesFromUrl,
    processSingleItem,
    extractBatch,
    getStatistics,
    getPhoneStatistics,
    findPhonesByMallDataId,
    findPhonesByPhone,
    closeConnections,
    extractor: unifiedExtractor,
    inserter: dataInserter,
};
