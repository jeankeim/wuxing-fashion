/**
 * Engine Module - 推荐引擎
 */

import { safeFetch, safeJsonParse, withErrorHandler, ErrorTypes } from './error-handler.js';
import { smartSelectSchemes, recordFeedback, getDailyLuckDescription, SCENES } from './recommendation.js';

let schemesData = null;
let intentionData = null;
let baziTemplateData = null;

// 心愿ID到名称的映射
const INTENTION_MAP = {
  'career': '求职',
  'guiren': '贵人运',
  'travel': '远行顺利',
  'focus': '静心专注',
  'health': '健康舒畅'
};

// 节气ID到名称的映射
const TERM_NAME_MAP = {
  'lichun': '立春', 'yushui': '雨水', 'jingzhe': '惊蛰', 'chunfen': '春分',
  'qingming': '清明', 'guyu': '谷雨', 'lixia': '立夏', 'xiaoman': '小满',
  'mangzhong': '芒种', 'xiazhi': '夏至', 'xiaoshu': '小暑', 'dashu': '大暑',
  'liqiu': '立秋', 'chushu': '处暑', 'bailu': '白露', 'qiufen': '秋分',
  'hanlu': '寒露', 'shuangjiang': '霜降', 'lidong': '立冬', 'xiaoxue': '小雪',
  'daxue': '大雪', 'dongzhi': '冬至', 'xiaohan': '小寒', 'dahan': '大寒'
};

// 节气顺序 (用于计算距离)
const TERM_ORDER = [
  'lichun', 'yushui', 'jingzhe', 'chunfen', 'qingming', 'guyu',
  'lixia', 'xiaoman', 'mangzhong', 'xiazhi', 'xiaoshu', 'dashu',
  'liqiu', 'chushu', 'bailu', 'qiufen', 'hanlu', 'shuangjiang',
  'lidong', 'xiaoxue', 'daxue', 'dongzhi', 'xiaohan', 'dahan'
];

/**
 * 加载方案数据
 */
async function loadSchemes() {
  if (schemesData) return schemesData;
  const response = await safeFetch('data/schemes.json');
  schemesData = await safeJsonParse(response);
  return schemesData;
}

/**
 * 加载心愿模板
 */
async function loadIntentionTemplates() {
  if (intentionData) return intentionData;
  const response = await safeFetch('data/intention-templates.json');
  intentionData = await safeJsonParse(response);
  return intentionData;
}

/**
 * 加载八字模板
 */
async function loadBaziTemplates() {
  if (baziTemplateData) return baziTemplateData;
  const response = await safeFetch('data/bazi-templates.json');
  baziTemplateData = await safeJsonParse(response);
  return baziTemplateData;
}

/**
 * 计算两个节气之间的距离
 */
function getTermDistance(termId1, termName2) {
  const idx1 = TERM_ORDER.indexOf(termId1);
  // 通过名称找ID
  let idx2 = -1;
  for (const [id, name] of Object.entries(TERM_NAME_MAP)) {
    if (name === termName2) {
      idx2 = TERM_ORDER.indexOf(id);
      break;
    }
  }
  
  if (idx1 === -1 || idx2 === -1) return 24; // 最大距离
  
  const diff = Math.abs(idx1 - idx2);
  return Math.min(diff, 24 - diff); // 循环距离
}

/**
 * 查找最匹配的心愿模板
 */
function findBestIntentionTemplate(intentionName, currentTermId, templates) {
  if (!templates || !intentionName) return null;
  
  // 筛选该心愿的所有模板
  const matches = templates.filter(t => t.intention === intentionName);
  if (matches.length === 0) return null;
  
  // 按节气距离排序，取最近的
  matches.sort((a, b) => {
    const distA = getTermDistance(currentTermId, a.solarTerm);
    const distB = getTermDistance(currentTermId, b.solarTerm);
    return distA - distB;
  });
  
  return matches[0];
}

/**
 * 查找最匹配的八字模板
 */
function findBestBaziTemplate(baziResult, templates) {
  if (!templates || !baziResult) return null;
  
  const year = new Date().getFullYear();
  const strongestElement = baziResult.recommend?.strongest;
  
  if (!strongestElement) return null;
  
  // 元素名称映射
  const elementNameMap = {
    'wood': '木', 'fire': '火', 'earth': '土', 'metal': '金', 'water': '水'
  };
  
  // 查找匹配的模板 (优先匹配当年)
  const elementName = elementNameMap[strongestElement];
  
  // 先找当年匹配
  let match = templates.find(t => 
    t.baZiKey.includes(`日主${elementName}旺`) && 
    t.baZiKey.includes(`${year}`)
  );
  
  // 如果没有当年的，找任意年份匹配
  if (!match) {
    match = templates.find(t => t.baZiKey.includes(`日主${elementName}旺`));
  }
  
  return match;
}

/**
 * 构建推荐上下文
 */
function buildContext(termInfo, wishId, baziProfile) {
  const context = {
    termWuxing: termInfo?.current?.wuxing || 'wood',
    termWeight: 0.5,
    wishWuxing: null,
    wishWeight: 0.3,
    baziWuxing: null,
    baziWeight: 0.2
  };
  
  // 八字推荐五行
  if (baziProfile && baziProfile.recommend) {
    context.baziWuxing = baziProfile.recommend.recommend;
  }
  
  return context;
}

/**
 * 计算方案得分
 */
function scoreScheme(scheme, context) {
  let score = 0;
  const wuxing = scheme.color.wuxing;
  
  // 节气匹配 (权重50%)
  if (wuxing === context.termWuxing) {
    score += context.termWeight * 100;
  } else if (isGenerating(context.termWuxing, wuxing)) {
    score += context.termWeight * 60;
  }
  
  // 八字匹配 (权重20%)
  if (context.baziWuxing) {
    if (wuxing === context.baziWuxing) {
      score += context.baziWeight * 100;
    } else if (isGenerating(wuxing, context.baziWuxing)) {
      score += context.baziWeight * 60;
    }
  }
  
  return score;
}

/**
 * 五行相生关系
 */
function isGenerating(from, to) {
  const generating = {
    wood: 'fire',
    fire: 'earth',
    earth: 'metal',
    metal: 'water',
    water: 'wood'
  };
  return generating[from] === to;
}

/**
 * 选择方案（使用智能推荐算法）
 */
function selectSchemes(schemes, context, count = 3, sceneId = 'daily') {
  // 使用智能推荐算法
  return smartSelectSchemes(schemes, context, { count, sceneId });
}

/**
 * 生成推荐
 * @param {Object} termInfo - 节气信息
 * @param {string} wishId - 心愿ID
 * @param {Object} baziResult - 八字分析结果
 * @param {Object} options - 选项
 * @returns {Object} 推荐结果
 */
export async function generateRecommendation(termInfo, wishId, baziResult, options = {}) {
  const { sceneId = 'daily' } = options;
  
  // 加载数据
  const [schemes, intentions, baziTemplates] = await Promise.all([
    loadSchemes(),
    loadIntentionTemplates(),
    loadBaziTemplates()
  ]);
  
  if (!schemes || !schemes.schemes) {
    console.error('[Engine] No schemes data');
    return null;
  }
  
  // 构建上下文
  const context = buildContext(termInfo, wishId, baziResult);
  context.termId = termInfo?.current?.id;
  
  // 选择方案（使用智能推荐）
  const selectedSchemes = selectSchemes(schemes.schemes, context, 3, sceneId);
  
  // 获取心愿模板建议
  let intentionTemplate = null;
  if (wishId && intentions) {
    const intentionName = INTENTION_MAP[wishId];
    intentionTemplate = findBestIntentionTemplate(intentionName, context.termId, intentions);
  }
  
  // 获取八字模板建议
  let baziTemplate = null;
  if (baziResult && baziTemplates) {
    baziTemplate = findBestBaziTemplate(baziResult, baziTemplates);
  }
  
  // 获取今日运势
  const dailyLuck = getDailyLuckDescription();
  
  return {
    schemes: selectedSchemes,
    termInfo,
    wishId,
    sceneId,
    intentionTemplate,  // 25组心愿模板中匹配的
    baziResult,
    baziTemplate,       // 10组八字模板中匹配的
    dailyLuck,          // 今日运势
    generatedAt: new Date().toISOString()
  };
}

/**
 * 重新生成 (换一批)
 */
export async function regenerateRecommendation(termInfo, wishId, baziResult, excludeIds = [], options = {}) {
  const { sceneId = 'daily' } = options;
  const schemes = await loadSchemes();
  if (!schemes || !schemes.schemes) return null;
  
  // 过滤已排除的方案
  const available = schemes.schemes.filter(s => !excludeIds.includes(s.id));
  
  const context = buildContext(termInfo, wishId, baziResult);
  context.termId = termInfo?.current?.id;
  
  const selectedSchemes = selectSchemes(available, context, 3, sceneId);
  const dailyLuck = getDailyLuckDescription();
  
  return {
    schemes: selectedSchemes,
    termInfo,
    wishId,
    sceneId,
    baziResult,
    dailyLuck,
    generatedAt: new Date().toISOString()
  };
}

// 导出反馈记录函数和场景定义
export { recordFeedback, SCENES };
