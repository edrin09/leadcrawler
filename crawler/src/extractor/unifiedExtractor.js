const EXTRACTOR_VERSION = '2.0.0';

const AI_CONFIG = {
    enabled: process.env.AI_ENABLED === 'true' || false,
    provider: process.env.AI_PROVIDER || 'deepseek',
    apiKey: process.env.AI_API_KEY || '',
    endpoint: process.env.AI_ENDPOINT || 'https://api.deepseek.com/chat/completions',
    model: process.env.AI_MODEL || 'deepseek-chat',
    timeout: parseInt(process.env.AI_TIMEOUT) || 15000,
    maxRetries: parseInt(process.env.AI_MAX_RETRIES) || 2,
    batchSize: parseInt(process.env.AI_BATCH_SIZE) || 10,
    cacheEnabled: process.env.AI_CACHE_ENABLED !== 'false',
};

const PHONE_PATTERNS = {
    exact: [
        /1[3-9]\d{9}/g,
        /1[3-9]\d{2}[-.\s]?\d{4}[-.\s]?\d{4}/g,
    ],
    special: [
        /0\d{2,3}[-.]?\d{7,8}/g,
    ]
};

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
};

const PLATFORMS = [
    { name: '58同城', url: 'https://xa.58.com/shangpu/?key=%s' },
    { name: '安居客', url: 'https://xa.sydc.anjuke.com/sp-zu/?kw=%s' },
    { name: '房天下', url: 'https://xian.esf.fang.com/shangpu/?keyword=%s' },
    { name: '贝壳找房', url: 'https://xa.ke.com/xiaoqu/?keyword=%s' },
    { name: '百度地图', url: 'https://map.baidu.com/search/%s' },
    { name: '高德地图', url: 'https://amap.com/search?query=%s' },
    { name: '美团', url: 'https://www.meituan.com/s/%s/' },
    { name: '小红书', url: 'https://xiaohongshu.com/search_result?keyword=%s' },
    { name: '抖音', url: 'https://www.douyin.com/search/%s' },
    { name: '闲鱼', url: 'https://2.taobao.com/list/list.htm?q=%s' },
    { name: '大众点评', url: 'https://www.dianping.com/search/category/7/10/r60114/kw%s' },
    { name: '腾讯地图', url: 'https://map.qq.com/search/%s' },
];

const COMPANY_SUFFIXES = [
    '有限公司', '有限责任公司', '集团有限公司', '股份有限公司',
    '实业公司', '科技公司', '商贸公司', '餐饮公司', '管理公司',
    '咨询公司', '服务公司', '发展公司', '投资公司', '置业公司',
    '房地产公司', '物业公司', '装饰公司', '装修公司', '文化公司',
    '传媒公司', '教育公司', '医疗公司', '医药公司', '食品公司',
    '贸易公司', '电子商务公司', '网络公司', '信息公司', '软件公司',
    '技术公司'
];

const SHOP_SUFFIXES = [
    '店', '铺', '行', '馆', '坊', '社', '部', '中心',
    '工作室', '经营部', '服务部', '商行', '商店', '商场', '超市',
    '酒店', '饭店', '餐厅', '宾馆', '旅馆'
];

const ALL_SUFFIXES = [...COMPANY_SUFFIXES, ...SHOP_SUFFIXES];

const COMPANY_REGEX = new RegExp(
    `[\\u4e00-\\u9fa5]{2,20}(?:${COMPANY_SUFFIXES.join('|')})`,
    'gu'
);

const SHOP_REGEX = new RegExp(
    `[\\u4e00-\\u9fa5]{2,20}(?:${SHOP_SUFFIXES.join('|')})`,
    'gu'
);

const INDIVIDUAL_REGEX = /[\u4e00-\u9fa5]{2,10}(?:个体工商户|个体户)/gu;

const META_PATTERNS = [
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
    /<title[^>]*>([^<]+)<\/title>/i,
];

const STRUCTURED_PATTERNS = [
    /(?:公司名称|企业名称|商户名称|店铺名称|名称)[：:]\s*([^\n\r]{4,50})/u,
    /(?:联系人|店主|老板|负责人)[：:]\s*([^\n\r]{2,20})/u,
];

const ANTI_BOT_SIGNATURES = {
    '请输入验证码': '页面需要验证码验证，当前IP已被目标站点反爬系统拦截',
    '访问过于频繁': '访问频率过高，当前IP已被目标站点限流',
    '滑块验证': '页面需要滑块验证，当前IP触发了反爬机制',
    '人机验证': '页面需要人机验证，当前IP被目标站点识别为爬虫',
    '请点击按钮进行验证': '页面要求点击验证，当前IP被反爬系统拦截',
    '安全验证': '页面触发安全验证，当前IP被目标站点拦截',
    '请输入图形验证码': '页面需要图形验证码，当前IP被反爬系统拦截',
    'ISDCaptcha': '页面触发58同城系反爬验证，当前IP已被拦截',
    'NEcaptcha': '页面触发58同城系反爬验证，当前IP已被拦截',
};

const CONTACT_HINTS = ['电话', '手机', '联系', 'tel', 'phone', 'mobile', '客服', '热线'];

const PHONE_CONTEXT_POSITIVE = [
    '联系', '电话', '手机', '热线', '客服', '咨询', '拨打', '来电',
    '联系方式', '联系电话', '联系手机', '商家电话', '店铺电话',
    '掌柜电话', '店主电话', '老板电话', '负责人电话', '联系人',
    '招商', '加盟', '预约', '预订', '下单'
];

const PHONE_CONTEXT_NEGATIVE = [
    '邮编', '邮政编码', '面积', '平方米', '平米', '价格', '元',
    '平方米', '㎡', '岁', '年龄', '年份', '年度', '账号', '密码',
    'ID', '编号', '序号', '第', '篇', '页', '条', '个', '次'
];

const SEMANTIC_BUSINESS_KEYWORDS = [
    '餐饮', '美食', '酒店', '宾馆', '民宿', '公寓', '写字楼', '商铺',
    '房产', '中介', '装修', '建材', '家居', '家电', '家具', '超市',
    '便利店', '药店', '医院', '门诊', '学校', '培训', '教育',
    '美容', '美发', 'SPA', '健身', '运动', '瑜伽', '游泳', '网球',
    '足球', '篮球', '羽毛球', '乒乓球', '台球', '高尔夫', '滑雪',
    '游泳馆', '健身房', '瑜伽馆', '舞蹈', '音乐', '美术', '钢琴',
    '吉他', '古筝', '架子鼓', '跆拳道', '武术', '拳击', '泰拳',
    '摄影', '摄像', '婚庆', '主持', 'DJ', 'MC', '演员', '歌手',
    '模特', '经纪人', '导演', '编剧', '制片', '剪辑', '特效',
    '设计', '广告', '传媒', '公关', '策划', '咨询', '法律', '会计',
    '审计', '税务', '评估', '担保', '典当', '拍卖', '回收', '维修',
    '清洗', '保洁', '搬家', '物流', '快递', '仓储', '运输', '货运'
];

const aiCache = new Map();

function detectEncoding(content) {
    const gbkSignatures = ['charset=gbk', 'charset=gb2312', 'charset=gb18030', 'gb2312', 'gbk'];
    const lowerContent = content.toLowerCase();
    for (const sig of gbkSignatures) {
        if (lowerContent.includes(sig)) {
            return 'gbk';
        }
    }
    return 'utf-8';
}

function convertEncoding(content, fromEncoding) {
    if (fromEncoding === 'gbk' || fromEncoding === 'gb2312' || fromEncoding === 'gb18030') {
        try {
            return Buffer.from(content, 'binary').toString('utf8');
        } catch (e) {
            return content;
        }
    }
    return content;
}

function stripHtmlTags(html) {
    return html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(num))
        .replace(/\s+/g, ' ')
        .trim();
}

function detectAntiBot(html) {
    for (const [signature, message] of Object.entries(ANTI_BOT_SIGNATURES)) {
        if (html.includes(signature)) {
            return message;
        }
    }

    if (html.length < 8000 && /验证|校验|频繁|拦截/i.test(html)) {
        return `页面内容异常（疑似反爬拦截），页面大小仅${html.length}字节`;
    }

    return '';
}

function cleanPhone(phone) {
    let cleaned = phone.replace(/[-\s()（）·*.。_]/g, '');

    const invalidPatterns = [
        /^0{2,}/,
        /^1[012]/,
        /^0123456789$/,
        /^0+[1-9]0+$/,
        /^\d{3,4}0{4,}$/,
        /^0{3,}\d+$/,
        /^400\d+$/,
        /^800\d+$/,
    ];

    for (const pattern of invalidPatterns) {
        if (pattern.test(cleaned)) {
            return null;
        }
    }

    if (/^0\d{2,3}\d{7,8}$/.test(cleaned)) {
        return null;
    }

    if (cleaned.startsWith('1') && cleaned.length === 11) {
        const second = cleaned[1];
        if (['3', '4', '5', '6', '7', '8', '9'].includes(second)) {
            const prefix = cleaned.slice(0, 3);
            const invalidPrefixes = [
                '170', '171', '167', '162', '164', '165',
                '168', '169'
            ];
            if (invalidPrefixes.includes(prefix)) {
                return null;
            }

            const uniqueDigits = new Set(cleaned.split(''));
            if (uniqueDigits.size >= 2) {
                return cleaned;
            }
        }
        return null;
    }

    return null;
}

function getCacheKey(type, data) {
    return `${type}:${JSON.stringify(data)}`;
}

async function callAIEndpoint(messages, retryCount = 0) {
    if (!AI_CONFIG.enabled || !AI_CONFIG.apiKey) {
        return null;
    }

    const cacheKey = getCacheKey('ai', messages);
    if (AI_CONFIG.cacheEnabled && aiCache.has(cacheKey)) {
        return aiCache.get(cacheKey);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_CONFIG.timeout);

    try {
        const response = await fetch(AI_CONFIG.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
            },
            body: JSON.stringify({
                model: AI_CONFIG.model,
                messages: messages,
                temperature: 0.3,
                max_tokens: 500,
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`AI API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (content && AI_CONFIG.cacheEnabled) {
            aiCache.set(cacheKey, content);
            if (aiCache.size > 1000) {
                const firstKey = aiCache.keys().next().value;
                aiCache.delete(firstKey);
            }
        }

        return content;
    } catch (error) {
        clearTimeout(timeoutId);
        console.warn(`AI API call failed (attempt ${retryCount + 1}):`, error.message);

        if (retryCount < AI_CONFIG.maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
            return callAIEndpoint(messages, retryCount + 1);
        }

        return null;
    }
}

async function validatePhoneWithAI(phone, context = '') {
    if (!AI_CONFIG.enabled) {
        return { valid: true, confidence: 0.5, reason: 'AI validation disabled' };
    }

    const messages = [
        {
            role: 'system',
            content: `你是一个专业的中国电话号码验证助手。请判断给定的电话号码是否是一个真实有效的商业联系号码。
判断标准：
1. 号码格式正确（中国手机号：1[3-9]开头的11位数字，或固话：区号+号码）
2. 号码出现在商业/联系上下文中（不是价格、面积、年龄等无关内容）
3. 号码是真实的商业联系电话，不是测试号、假号或随机数字

请只返回一个JSON对象：{"valid": true/false, "confidence": 0.0-1.0, "reason": "简短原因"}`
        },
        {
            role: 'user',
            content: `电话号码：${phone}\n上下文：${context || '无'}`
        }
    ];

    const result = await callAIEndpoint(messages);
    if (!result) {
        return { valid: true, confidence: 0.5, reason: 'AI validation failed, assuming valid' };
    }

    try {
        const cleanedResult = result.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
        return JSON.parse(cleanedResult);
    } catch (e) {
        console.warn('Failed to parse AI response:', result);
        return { valid: true, confidence: 0.5, reason: 'Parse error, assuming valid' };
    }
}

async function extractKeywordsWithAI(text, businessName = '') {
    if (!AI_CONFIG.enabled || text.length < 50) {
        return [];
    }

    const sampleText = text.slice(0, 2000);
    const messages = [
        {
            role: 'system',
            content: `你是一个商业信息提取专家。请从文本中提取与商业相关的关键词，用于搜索商家信息。

要求：
1. 提取商家名称、行业关键词、地址关键词
2. 每个关键词2-10个中文字符
3. 排除数字、符号、通用词汇（如"首页"、"登录"等）
4. 最多返回10个最有价值的关键词
5. 考虑上下文语义，选择与商业经营相关的词汇

请返回JSON数组格式：["关键词1", "关键词2", ...]`
        },
        {
            role: 'user',
            content: `商家名称：${businessName || '未知'}\n文本内容：${sampleText}`
        }
    ];

    const result = await callAIEndpoint(messages);
    if (!result) {
        return [];
    }

    try {
        const cleanedResult = result.replace(/^\[/, '[').replace(/\]$/, ']');
        const keywords = JSON.parse(cleanedResult);
        if (Array.isArray(keywords)) {
            return keywords.filter(k => typeof k === 'string' && k.length >= 2 && k.length <= 10);
        }
        return [];
    } catch (e) {
        console.warn('Failed to parse AI keywords response:', result);
        return [];
    }
}

function analyzePhoneContext(text, phone) {
    const contextRadius = 100;
    const phoneIndex = text.indexOf(phone);
    let context = '';

    if (phoneIndex !== -1) {
        const start = Math.max(0, phoneIndex - contextRadius);
        const end = Math.min(text.length, phoneIndex + phone.length + contextRadius);
        context = text.slice(start, end);
    }

    let positiveScore = 0;
    let negativeScore = 0;

    for (const keyword of PHONE_CONTEXT_POSITIVE) {
        if (context.includes(keyword)) {
            positiveScore += 1;
        }
    }

    for (const keyword of PHONE_CONTEXT_NEGATIVE) {
        if (context.includes(keyword)) {
            negativeScore += 1;
        }
    }

    const proximityBonus = [];
    for (const keyword of PHONE_CONTEXT_POSITIVE) {
        const idx = context.indexOf(keyword);
        if (idx !== -1) {
            const distance = Math.abs(idx - phoneIndex);
            if (distance < 50) {
                proximityBonus.push({ keyword, distance });
            }
        }
    }

    return {
        context,
        positiveScore,
        negativeScore,
        proximityBonus,
        isPositiveContext: positiveScore > negativeScore,
        hasStrongContactSignal: positiveScore >= 2 || proximityBonus.length > 0
    };
}

function filterPhonesByContext(phones, text, businessName = '') {
    const filtered = [];

    for (const phone of phones) {
        const analysis = analyzePhoneContext(text, phone);

        const contextScore = analysis.positiveScore * 10 - analysis.negativeScore * 5;

        let businessRelevance = 0;
        if (businessName) {
            const textLower = text.toLowerCase();
            const nameLower = businessName.toLowerCase();
            if (textLower.includes(nameLower)) {
                businessRelevance += 15;
            }
        }

        for (const kw of SEMANTIC_BUSINESS_KEYWORDS) {
            if (text.includes(kw)) {
                businessRelevance += 3;
                break;
            }
        }

        const totalScore = contextScore + businessRelevance;

        if (totalScore >= 5 || analysis.hasStrongContactSignal) {
            filtered.push({
                phone,
                contextAnalysis: analysis,
                filterScore: totalScore,
                passed: true
            });
        } else if (analysis.positiveScore > 0 || analysis.negativeScore < 2) {
            filtered.push({
                phone,
                contextAnalysis: analysis,
                filterScore: totalScore,
                passed: totalScore >= 0
            });
        } else {
            filtered.push({
                phone,
                contextAnalysis: analysis,
                filterScore: totalScore,
                passed: false
            });
        }
    }

    return filtered;
}

function enhancedCleanPhone(phone) {
    const basicCleaned = cleanPhone(phone);
    if (!basicCleaned) {
        return null;
    }

    if (basicCleaned.length === 11 && basicCleaned.startsWith('1')) {
        const prefix = basicCleaned.slice(0, 3);
        const invalidPrefixes = ['100', '101', '102', '103', '104', '105', '106', '107', '108', '109', '110', '111', '112', '120', '121', '122', '123', '125', '127', '129'];
        if (invalidPrefixes.includes(prefix)) {
            return null;
        }

        const carrierPrefixes = {
            '133': '中国电信', '153': '中国电信', '177': '中国电信', '180': '中国电信', '181': '中国电信', '189': '中国电信', '199': '中国电信',
            '130': '中国联通', '131': '中国联通', '132': '中国联通', '155': '中国联通', '156': '中国联通', '166': '中国联通', '175': '中国联通', '176': '中国联通', '185': '中国联通', '186': '中国联通',
            '134': '中国移动', '135': '中国移动', '136': '中国移动', '137': '中国移动', '138': '中国移动', '139': '中国移动', '147': '中国移动', '150': '中国移动', '151': '中国移动', '152': '中国移动', '157': '中国移动', '158': '中国移动', '159': '中国移动', '178': '中国移动', '182': '中国移动', '183': '中国移动', '184': '中国移动', '187': '中国移动', '188': '中国移动', '197': '中国移动', '198': '中国移动'
        };

        if (!carrierPrefixes[prefix]) {
            return null;
        }
    }

    return basicCleaned;
}

function extractPhones(text, matchType = 'all', useEnhanced = true, excludeLandline = true) {
    const phones = [];
    const seenPhones = new Set();
    const patternGroups = matchType === 'all' ? ['exact', 'special'] : ['exact'];

    const separatedMobilePattern = /1[3-9]\d[-.\s]?\d{4}[-.\s]?\d{4}/g;
    const cleaner = useEnhanced ? enhancedCleanPhone : cleanPhone;

    for (const group of patternGroups) {
        for (const pattern of PHONE_PATTERNS[group]) {
            const matches = text.match(pattern);
            if (matches) {
                for (const match of matches) {
                    const phone = cleaner(match);
                    if (phone && !seenPhones.has(phone)) {
                        if (excludeLandline && isLandline(phone)) {
                            continue;
                        }
                        phones.push(phone);
                        seenPhones.add(phone);
                    }
                }
            }
        }
    }

    const separatedMatches = text.match(separatedMobilePattern);
    if (separatedMatches) {
        for (const match of separatedMatches) {
            const phone = cleaner(match);
            if (phone && !seenPhones.has(phone)) {
                if (excludeLandline && isLandline(phone)) {
                    continue;
                }
                phones.push(phone);
                seenPhones.add(phone);
            }
        }
    }

    return phones.sort();
}

function extractPhonesPublic(text) {
    return extractPhones(text, 'all', false, true);
}

function extractFromAttributes(html) {
    const phones = [];
    const attrs = ['href', 'data-phone', 'data-tel', 'data-mobile', 'tel', 'phone'];

    for (const attr of attrs) {
        const regex = new RegExp(`${attr}=["']([^"']+)["']`, 'gi');
        const matches = html.matchAll(regex);
        for (const match of matches) {
            const attrPhones = extractPhones(match[1]);
            phones.push(...attrPhones);
        }
    }

    return phones;
}

function extractFromScripts(html) {
    const phones = [];
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    const matches = html.matchAll(scriptRegex);
    for (const match of matches) {
        const scriptPhones = extractPhones(match[1]);
        phones.push(...scriptPhones);
    }
    return phones;
}

function extractCompanyNameFromText(text) {
    const stripped = stripHtmlTags(text).trim();

    const companyMatch = stripped.match(COMPANY_REGEX);
    if (companyMatch) {
        return companyMatch[0].trim();
    }

    const shopMatch = stripped.match(SHOP_REGEX);
    if (shopMatch) {
        return shopMatch[0].trim();
    }

    const individualMatch = stripped.match(INDIVIDUAL_REGEX);
    if (individualMatch) {
        return individualMatch[0].trim();
    }

    return null;
}

function extractBusinessName(text, html = '') {
    const names = [];

    if (html) {
        for (const pattern of META_PATTERNS) {
            const match = html.match(pattern);
            if (match && match[1]) {
                const candidate = extractCompanyNameFromText(match[1]);
                if (candidate) {
                    names.push(candidate);
                }
            }
        }
    }

    for (const pattern of STRUCTURED_PATTERNS) {
        const matches = text.matchAll(new RegExp(pattern.source, 'gu'));
        for (const match of matches) {
            const m = match[1].trim();
            if (m.length >= 2 && !/^\d+$/.test(m)) {
                names.push(m);
            }
        }
    }

    const companyMatches = text.match(COMPANY_REGEX);
    if (companyMatches) {
        names.push(...companyMatches);
    }

    const shopMatches = text.match(SHOP_REGEX);
    if (shopMatches) {
        names.push(...shopMatches);
    }

    const individualMatches = text.match(INDIVIDUAL_REGEX);
    if (individualMatches) {
        names.push(...individualMatches);
    }

    const uniqueNames = [...new Set(names)];
    const filteredNames = uniqueNames.filter(n => {
        return n.length >= 2 && !/^\d+[\d\s]*$/.test(n);
    });

    for (const name of filteredNames) {
        if (/(公司|有限|集团|股份)/u.test(name)) {
            return name;
        }
    }

    return filteredNames[0] || '';
}

function extractBusinessInfo(text) {
    const info = {};

    const creditCodeMatch = text.match(/(?:统一社会信用代码|统一信用代码|信用代码|统一代码|社会信用代码)(?:：|:)\s*([0-9A-Z]{18})/u);
    if (creditCodeMatch) {
        info.credit_code = creditCodeMatch[1];
    }

    const licenseMatch = text.match(/(?:营业执照注册号|营业执照|注册号)(?:：|:)\s*(\d{15})/u);
    if (licenseMatch) {
        info.license_no = licenseMatch[1];
    }

    const orgCodeMatch = text.match(/(?:组织机构代码|组织代码|组织机构)(?:：|:)\s*([0-9A-Z]{8}-?[0-9A-Z])/u);
    if (orgCodeMatch) {
        info.org_code = orgCodeMatch[1].replace(/-/g, '');
    }

    const legalPersonMatch = text.match(/(?:法定代表人|法人代表|负责人)(?:：|:)\s*([^\n\r]{2,10})/u);
    if (legalPersonMatch) {
        info.legal_person = legalPersonMatch[1].trim();
    }

    const capitalMatch = text.match(/(?:注册资本)(?:：|:)\s*([^\n\r]{2,30})/u);
    if (capitalMatch) {
        info.registered_capital = capitalMatch[1].trim();
    }

    const dateMatch = text.match(/(?:成立日期|注册日期)(?:：|:)\s*(\d{4}[-年]\d{1,2}[-月]\d{1,2}[日]?)/u);
    if (dateMatch) {
        info.establish_date = dateMatch[1].trim();
    }

    const addressMatch = text.match(/(?:住所|经营场所|注册地址|地址)(?:：|:)\s*([^\n\r]{5,80})/u);
    if (addressMatch) {
        info.address = addressMatch[1].trim();
    }

    const scopeMatch = text.match(/(?:经营范围)(?:：|:)\s*([^\n\r]{10,200})/u);
    if (scopeMatch) {
        info.business_scope = scopeMatch[1].trim();
    }

    const taxMatch = text.match(/(?:纳税人识别号|税务登记号)(?:：|:)\s*(\d{15,20})/u);
    if (taxMatch) {
        info.tax_no = taxMatch[1];
    }

    return info;
}

function extractSearchKeywords(text, businessName = '') {
    const keywords = [];

    if (businessName) {
        keywords.push(businessName);
        let coreName = businessName;
        for (const suffix of ALL_SUFFIXES) {
            coreName = coreName.replace(new RegExp(suffix, 'u'), '');
        }
        coreName = coreName.trim();
        if (coreName.length >= 2 && coreName !== businessName) {
            keywords.push(coreName);
        }
    }

    const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
        const title = stripHtmlTags(titleMatch[1]).trim();
        const titleParts = title.split(/[_\-\|｜\s]+/u);
        for (const part of titleParts) {
            const trimmed = part.trim();
            if (trimmed.length >= 3 && trimmed.length <= 20 && !/^\d+$/.test(trimmed)) {
                keywords.push(trimmed);
            }
        }
    }

    const addressMatches = text.matchAll(/(?:地址|位置|位于)[：:\s]*([^\n\r]{5,40})/gu);
    for (const match of addressMatches) {
        const addr = match[1].trim();
        if (addr.length >= 5) {
            keywords.push(addr);
        }
    }

    const scopeMatch = text.match(/(?:经营范围|主营业务|经营)[：:\s]*([^\n\r]{5,50})/u);
    if (scopeMatch) {
        const scope = scopeMatch[1].trim();
        const scopeParts = scope.split(/[、，,;\s]+/u);
        for (const part of scopeParts) {
            const trimmed = part.trim();
            if (trimmed.length >= 2 && trimmed.length <= 10) {
                keywords.push(trimmed);
            }
        }
    }

    const contactMatch = text.match(/(?:联系人|店主|老板|负责人)[：:\s]*([^\n\r]{2,10})/u);
    if (contactMatch) {
        const contact = contactMatch[1].trim();
        if (contact.length >= 2) {
            keywords.push(contact);
        }
    }

    const uniqueKeywords = [...new Set(keywords)];
    const filteredKeywords = uniqueKeywords.filter(kw => {
        const trimmed = kw.trim();
        return trimmed.length >= 2
            && !/^\d+$/.test(trimmed)
            && !['首页', '下一页', '上一页', '返回', '搜索', '登录', '注册'].includes(trimmed);
    });

    filteredKeywords.sort((a, b) => b.length - a.length);

    return filteredKeywords.slice(0, 10);
}

async function extractDetailPageInfo(url, timeout = 10000) {
    const content = await fetchPage(url, timeout);
    if (!content) {
        return {
            url,
            phones: [],
            business_name: '',
            business_info: {},
            keywords: [],
            status: 'fetch_failed',
            status_msg: '页面抓取失败，请检查URL是否可访问',
            content_length: 0,
            text_length: 0,
        };
    }

    const antiBotStatus = detectAntiBot(content);
    if (antiBotStatus) {
        return {
            url,
            phones: [],
            business_name: '',
            business_info: {},
            keywords: [],
            status: 'antibot',
            status_msg: antiBotStatus,
            content_length: content.length,
            text_length: 0,
        };
    }

    if (content.length < 30000) {
        console.warn(`Small page detected: url=${url}, size=${content.length}`);
    }

    const encoding = detectEncoding(content);
    const processedContent = encoding !== 'utf-8' ? convertEncoding(content, encoding) : content;
    const text = stripHtmlTags(processedContent);

    const phones = extractPhones(text);
    const attrPhones = extractFromAttributes(processedContent);
    const scriptPhones = extractFromScripts(processedContent);
    const allPhones = [...new Set([...phones, ...attrPhones, ...scriptPhones])];

    const businessName = extractBusinessName(text, processedContent);
    const businessInfo = extractBusinessInfo(text);
    const keywords = extractSearchKeywords(text, businessName);

    const phoneFilterResults = filterPhonesByContext(allPhones, text, businessName);
    const filteredPhones = phoneFilterResults
        .filter(r => r.passed)
        .map(r => r.phone);

    const aiKeywords = await extractKeywordsWithAI(text, businessName);
    const combinedKeywords = [...new Set([...keywords, ...aiKeywords])];

    return {
        url,
        phones: filteredPhones,
        business_name: businessName,
        business_info: businessInfo,
        keywords: combinedKeywords.slice(0, 10),
        status: 'success',
        status_msg: '页面解析成功',
        content_length: processedContent.length,
        text_length: text.length,
        text_phones: phones,
        attr_phones: attrPhones,
        script_phones: scriptPhones,
        phone_filter_results: phoneFilterResults,
    };
}

function fetchPage(url, timeout = 10000) {
    return new Promise((resolve) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        fetch(url, {
            method: 'GET',
            headers: HEADERS,
            signal: controller.signal,
            redirect: 'follow',
        })
            .then(response => {
                clearTimeout(timeoutId);
                if (response.status >= 400) {
                    console.warn(`fetchPage HTTP error: url=${url}, httpCode=${response.status}`);
                    resolve(null);
                    return;
                }
                return response.text();
            })
            .then(content => {
                clearTimeout(timeoutId);
                resolve(content);
            })
            .catch(error => {
                clearTimeout(timeoutId);
                console.warn(`fetchPage failed: url=${url}, error=${error.message}`);
                resolve(null);
            });
    });
}

function trackPhoneSources(map, phones, source, context = '') {
    for (const phone of phones) {
        if (!map[phone]) {
            map[phone] = [];
        }
        map[phone].push({
            source,
            context,
        });
    }
}

function scorePhoneCredibility(phone, sources, businessNames = [], businessInfo = {}, filterAnalysis = null) {
    let score = 0;

    let hasDetailPage = false;
    let platformCount = 0;
    const uniquePlatforms = {};

    for (const src of sources) {
        if (src.source === 'detail_page') {
            hasDetailPage = true;
        } else {
            platformCount++;
            uniquePlatforms[src.source] = true;
        }
    }

    if (hasDetailPage) {
        score += 30;
    } else if (platformCount > 0) {
        score += Math.min(platformCount * 8, 24);
    }

    const totalSources = sources.length;
    if (totalSources >= 4) {
        score += 25;
    } else if (totalSources >= 3) {
        score += 20;
    } else if (totalSources >= 2) {
        score += 15;
    } else if (totalSources === 1) {
        score += 5;
    }

    let contextScore = 0;
    for (const src of sources) {
        const context = src.context || '';

        for (const name of businessNames) {
            if (name && context.includes(name)) {
                contextScore += 10;
                break;
            }
        }

        for (const [key, value] of Object.entries(businessInfo)) {
            if (value && typeof value === 'string' && context.includes(value)) {
                contextScore += 8;
                break;
            }
        }

        for (const hint of CONTACT_HINTS) {
            if (context.toLowerCase().includes(hint.toLowerCase())) {
                contextScore += 5;
                break;
            }
        }
    }
    score += Math.min(contextScore, 25);

    if (filterAnalysis) {
        if (filterAnalysis.hasStrongContactSignal) {
            score += 20;
        }
        if (filterAnalysis.positiveScore > 0) {
            score += filterAnalysis.positiveScore * 5;
        }
        if (filterAnalysis.proximityBonus && filterAnalysis.proximityBonus.length > 0) {
            score += Math.min(filterAnalysis.proximityBonus.length * 8, 24);
        }
        if (!filterAnalysis.isPositiveContext && filterAnalysis.negativeScore > 2) {
            score -= filterAnalysis.negativeScore * 5;
        }
        score += Math.max(filterAnalysis.filterScore, 0);
    }

    if (phone.length === 11 && phone.startsWith('1')) {
        const second = phone[1];
        if (['3', '4', '5', '6', '7', '8', '9'].includes(second)) {
            score += 10;
        } else {
            score += 5;
        }
    } else if (phone.startsWith('029')) {
        score += 7;
    } else if (/^0\d{2,3}\d{7,8}$/.test(phone)) {
        score += 5;
    } else {
        score += 2;
    }

    const uniquePlatformCount = Object.keys(uniquePlatforms).length;
    if (uniquePlatformCount >= 3) {
        score += 10;
    } else if (uniquePlatformCount >= 2) {
        score += 7;
    } else if (uniquePlatformCount >= 1) {
        score += 4;
    }

    return Math.max(0, Math.min(score, 100));
}

async function enhancedScorePhoneCredibility(phone, sources, businessNames = [], businessInfo = {}, text = '') {
    let score = scorePhoneCredibility(phone, sources, businessNames, businessInfo);

    if (AI_CONFIG.enabled && text) {
        const contextAnalysis = analyzePhoneContext(text, phone);
        score = scorePhoneCredibility(phone, sources, businessNames, businessInfo, contextAnalysis);

        const aiValidation = await validatePhoneWithAI(phone, text);
        if (!aiValidation.valid) {
            score = Math.floor(score * 0.3);
        } else if (aiValidation.confidence > 0.8) {
            score = Math.floor(score * 1.2);
        } else if (aiValidation.confidence < 0.5) {
            score = Math.floor(score * 0.7);
        }
    }

    return Math.max(0, Math.min(score, 100));
}

function classifyConfidence(score) {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
}

function classifyPhoneType(phone) {
    if (phone.length === 11 && phone.startsWith('1')) {
        return 'mobile';
    }
    if (phone.startsWith('029')) {
        return 'local_landline';
    }
    if (/^0\d{2,3}\d{7,8}$/.test(phone)) {
        return 'landline';
    }
    if (/^400\d+$/.test(phone) || /^800\d+$/.test(phone)) {
        return 'hotline';
    }
    return 'other';
}

function isLandline(phone) {
    if (/^0\d{2,3}\d{7,8}$/.test(phone)) {
        return true;
    }
    if (/^0\d{2,3}[-.]?\d{7,8}$/.test(phone)) {
        return true;
    }
    return false;
}

function isMobile(phone) {
    if (phone.length === 11 && phone.startsWith('1') && /^[3-9]/.test(phone.slice(1, 2))) {
        return true;
    }
    return false;
}

async function searchPlatform(platform, keywords) {
    const url = platform.url.replace('%s', encodeURIComponent(keywords));
    const content = await fetchPage(url);
    return content ? extractPhones(content) : [];
}

async function crossPlatformSearch(businessInfo, maxPlatforms = 6) {
    const results = {};
    const searchKeywords = [];

    if (businessInfo.business_name) {
        searchKeywords.push(businessInfo.business_name);
    }
    if (businessInfo.keywords && Array.isArray(businessInfo.keywords)) {
        searchKeywords.push(...businessInfo.keywords);
    }
    if (businessInfo.address) {
        searchKeywords.push(businessInfo.address);
    }
    if (businessInfo.legal_person) {
        searchKeywords.push(businessInfo.legal_person);
    }

    const uniqueKeywords = [...new Set(searchKeywords)].slice(0, 5);
    const priorityPlatforms = PLATFORMS.slice(0, maxPlatforms);

    for (const keyword of uniqueKeywords) {
        if (!keyword.trim()) continue;

        for (const platform of priorityPlatforms) {
            const phones = await searchPlatform(platform, keyword);
            if (phones.length > 0) {
                const key = `${platform.name}_${keyword}`;
                if (!results[key]) {
                    results[key] = {
                        platform: platform.name,
                        keyword,
                        phones,
                        count: phones.length,
                    };
                }
            }
        }
    }

    return Object.values(results);
}

async function unifiedExtract(options = {}) {
    const startTime = Date.now();
    const timeout = options.timeout || 10000;
    const maxPlatforms = options.max_platforms || 6;
    const location = options.location || '';
    const extraKeywords = options.keywords || '';

    const allDetailResults = [];
    const allCrossResults = [];
    const phoneSourceMap = {};

    if (options.url) {
        const detailInfo = await extractDetailPageInfo(options.url, timeout);
        allDetailResults.push(detailInfo);

        if (detailInfo.status === 'success') {
            trackPhoneSources(phoneSourceMap, detailInfo.phones, 'detail_page', options.url);
            const crossResults = await crossPlatformSearch({
                business_name: detailInfo.business_name,
                keywords: detailInfo.keywords,
                address: detailInfo.business_info?.address || '',
                legal_person: detailInfo.business_info?.legal_person || '',
            }, maxPlatforms);
            allCrossResults.push(...crossResults);
            for (const cr of crossResults) {
                trackPhoneSources(phoneSourceMap, cr.phones, cr.platform, cr.keyword);
            }
        }
    }

    if (options.crawl_data && Array.isArray(options.crawl_data)) {
        for (const item of options.crawl_data) {
            const detailUrl = item.detailUrl || item.detail_url || '';
            if (!detailUrl) continue;

            const detailInfo = await extractDetailPageInfo(detailUrl, timeout);
            detailInfo.source = item.source || '';
            detailInfo.original_title = item.title || '';
            allDetailResults.push(detailInfo);

            if (detailInfo.status === 'success') {
                trackPhoneSources(phoneSourceMap, detailInfo.phones, 'detail_page', detailUrl);
                const crossResults = await crossPlatformSearch({
                    business_name: detailInfo.business_name,
                    keywords: detailInfo.keywords,
                    address: detailInfo.business_info?.address || '',
                    legal_person: detailInfo.business_info?.legal_person || '',
                }, maxPlatforms);
                allCrossResults.push(...crossResults);
                for (const cr of crossResults) {
                    trackPhoneSources(phoneSourceMap, cr.phones, cr.platform, cr.keyword);
                }
            }
        }
    }

    if (allDetailResults.length === 0 && extraKeywords) {
        const crossResults = await crossPlatformSearch({
            business_name: '',
            keywords: [extraKeywords],
            address: location,
            legal_person: '',
        }, maxPlatforms);
        allCrossResults.push(...crossResults);
        for (const cr of crossResults) {
            trackPhoneSources(phoneSourceMap, cr.phones, cr.platform, cr.keyword);
        }
    }

    const allBusinessNames = [];
    const allBusinessInfo = {};
    const allKeywords = [];
    const allSearchKeywords = [];

    for (const dr of allDetailResults) {
        if (dr.business_name) {
            allBusinessNames.push(dr.business_name);
        }
        if (dr.business_info && Object.keys(dr.business_info).length > 0) {
            Object.assign(allBusinessInfo, dr.business_info);
        }
        if (dr.keywords && dr.keywords.length > 0) {
            allKeywords.push(...dr.keywords);
        }
    }
    const uniqueBusinessNames = [...new Set(allBusinessNames)];
    const uniqueKeywords = [...new Set(allKeywords)];

    for (const cr of allCrossResults) {
        if (cr.keyword) {
            allSearchKeywords.push(cr.keyword);
        }
    }
    const uniqueSearchKeywords = [...new Set(allSearchKeywords)];

    const scoredPhones = [];
    for (const [phone, sources] of Object.entries(phoneSourceMap)) {
        let filterAnalysis = null;
        for (const dr of allDetailResults) {
            if (dr.phone_filter_results) {
                const phoneFilterResult = dr.phone_filter_results.find(r => r.phone === phone);
                if (phoneFilterResult) {
                    filterAnalysis = phoneFilterResult.contextAnalysis;
                    break;
                }
            }
        }

        const score = scorePhoneCredibility(phone, sources, uniqueBusinessNames, allBusinessInfo, filterAnalysis);
        const uniqueSources = [...new Set(sources.map(s => s.source))];
        scoredPhones.push({
            phone,
            score,
            level: classifyConfidence(score),
            sources: uniqueSources,
            source_count: sources.length,
            source_detail: sources,
            type: classifyPhoneType(phone),
            filter_analysis: filterAnalysis,
        });
    }

    scoredPhones.sort((a, b) => b.score - a.score);

    const highCount = scoredPhones.filter(p => p.level === 'high').length;
    const mediumCount = scoredPhones.filter(p => p.level === 'medium').length;
    const lowCount = scoredPhones.filter(p => p.level === 'low').length;

    const filteredCount = scoredPhones.filter(p => p.score >= 40).length;
    const originalCount = Object.keys(phoneSourceMap).length;

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    return {
        phones: scoredPhones,
        business_names: uniqueBusinessNames,
        business_info: allBusinessInfo,
        keywords: uniqueKeywords.slice(0, 10),
        search_keywords: uniqueSearchKeywords,
        detail_results: allDetailResults,
        cross_platform_results: allCrossResults,
        summary: {
            total_phones: scoredPhones.length,
            high_confidence: highCount,
            medium_confidence: mediumCount,
            low_confidence: lowCount,
            quality_filtered_count: originalCount - filteredCount,
            quality_filter_rate: originalCount > 0 ? ((originalCount - filteredCount) / originalCount * 100).toFixed(1) + '%' : '0%',
            detail_pages_processed: allDetailResults.length,
            cross_platform_searches: allCrossResults.length,
            elapsed: parseFloat(elapsed),
        },
    };
}

function formatHeaders() {
    return Object.entries(HEADERS).map(([key, value]) => `${key}: ${value}`);
}

module.exports = {
    EXTRACTOR_VERSION,
    AI_CONFIG,
    PHONE_PATTERNS,
    HEADERS,
    PLATFORMS,
    detectAntiBot,
    cleanPhone,
    enhancedCleanPhone,
    isLandline,
    isMobile,
    extractPhones,
    extractPhonesPublic,
    extractFromAttributes,
    extractFromScripts,
    extractCompanyNameFromText,
    extractBusinessName,
    extractBusinessInfo,
    extractSearchKeywords,
    extractDetailPageInfo,
    fetchPage,
    trackPhoneSources,
    scorePhoneCredibility,
    enhancedScorePhoneCredibility,
    classifyConfidence,
    classifyPhoneType,
    crossPlatformSearch,
    unifiedExtract,
    formatHeaders,
    analyzePhoneContext,
    filterPhonesByContext,
    validatePhoneWithAI,
    extractKeywordsWithAI,
    callAIEndpoint,
    stripHtmlTags,
};
