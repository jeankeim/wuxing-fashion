/**
 * Engine Module - 推荐引擎 (重构版)
 * 使用新的评分器类和权重配置
 */

import { safeFetch, safeJsonParse } from '../core/error-handler.js';
import { RecommendationScorer } from '../core/scorer.js';
import { getDailyLuckFactors, getDailyLuckDescription, SCENES, SCENE_PREFERENCES, recordFeedback } from './recommendation.js';
import { getCurrentWeather, getWeatherRecommendation } from './weather.js';

let schemesData = null;
let intentionData = null;
let baziTemplateData = null;

// 心愿名称映射（支持新扩充的心愿）
const INTENTION_MAP = {
  // 事业财运
  '求职': '求职',
  '升职加薪': '升职加薪',
  '签单顺利': '签单顺利',
  '贵人运': '贵人运',
  '防小人避坑': '防小人避坑',
  // 情感人际
  '桃花朵朵': '桃花朵朵',
  '家庭和睦': '家庭和睦',
  '挽回缓和': '挽回缓和',
  '新朋友缘': '新朋友缘',
  // 身心状态
  '精力充沛': '精力充沛',
  '安神助眠': '安神助眠',
  '增强自信': '增强自信',
  '静心专注': '静心专注',
  // 健康平安
  '健康舒畅': '健康舒畅',
  '身体康复': '身体康复',
  '出行平安': '出行平安',
  '远行顺利': '远行顺利'
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
 * 获取基础路径（支持GitHub Pages子目录部署）
 */
function getBasePath() {
  // 检测是否在 GitHub Pages 环境
  const isGitHubPages = window.location.hostname.includes('github.io');
  
  if (!isGitHubPages) {
    // 本地开发环境，直接使用根路径
    return '';
  }
  
  // 在GitHub Pages上，仓库名会作为路径前缀
  const pathSegments = window.location.pathname.split('/');
  // 如果路径包含仓库名（如 /wuxing-fashion/entry），返回 /wuxing-fashion/
  if (pathSegments.length > 1 && pathSegments[1] && pathSegments[1] !== '') {
    return '/' + pathSegments[1];
  }
  return '';
}

/**
 * 加载方案数据
 */
async function loadSchemes() {
  if (schemesData) return schemesData;
  const basePath = getBasePath();
  const response = await safeFetch(`${basePath}/data/schemes.json`);
  schemesData = await safeJsonParse(response);
  return schemesData;
}

/**
 * 加载心愿模板
 */
async function loadIntentionTemplates() {
  if (intentionData) return intentionData;
  const basePath = getBasePath();
  const response = await safeFetch(`${basePath}/data/intention-templates.json`);
  intentionData = await safeJsonParse(response);
  return intentionData;
}

/**
 * 加载八字模板
 */
async function loadBaziTemplates() {
  if (baziTemplateData) return baziTemplateData;
  const basePath = getBasePath();
  const response = await safeFetch(`${basePath}/data/bazi-templates.json`);
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
 * 构建用户画像
 */
function buildUserProfile(baziResult, preferences = null) {
  const profile = {
    bazi: baziResult,
    preferences: preferences || getDefaultPreferences(),
    isNewUser: !preferences
  };
  return profile;
}

/**
 * 获取默认用户偏好（解决冷启动）
 */
function getDefaultPreferences() {
  return {
    wuxingScores: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
    colorScores: {},
    materialScores: {},
    style: 'casual'
  };
}

/**
 * 构建推荐上下文
 */
function buildContext(termInfo, wishId, baziProfile, weatherData = null, intentionTemplate = null) {
  const context = {
    termWuxing: termInfo?.current?.wuxing || 'wood',
    termId: termInfo?.current?.id,
    wishId,
    bazi: baziProfile,
    weather: weatherData,
    intentionTemplate,
    scenePreferences: SCENE_PREFERENCES,
    dailyLuck: getDailyLuckFactors()
  };
  
  // 添加天气推荐信息
  if (weatherData?.current) {
    context.weatherRecommendation = getWeatherRecommendation(weatherData.current);
    // 添加温度等级
    const temp = weatherData.current.temperature;
    if (temp >= 30) context.weather.current.tempLevel = 'hot';
    else if (temp >= 25) context.weather.current.tempLevel = 'warm';
    else if (temp >= 15) context.weather.current.tempLevel = 'comfortable';
    else if (temp >= 5) context.weather.current.tempLevel = 'cool';
    else context.weather.current.tempLevel = 'cold';
  }
  
  return context;
}

/**
 * 选择方案（使用新的评分器类）
 * 采用梯度推荐策略：最佳匹配 + 保守替代 + 平衡方案
 * 一票否决：天气和场景不达标的方案直接淘汰
 */
function selectSchemes(schemes, userProfile, context, count = 3) {
  // 创建评分器
  const scorer = new RecommendationScorer(userProfile, context);
  
  // 批量评分
  const allScored = scorer.scoreAll(schemes);
  
  // 过滤被淘汰的方案（一票否决）
  const scoredSchemes = allScored.filter(item => !item.rejected);
  
  // 如果全部被淘汰，放宽条件（降级模式）
  if (scoredSchemes.length === 0) {
    console.warn('[Engine] 所有方案被一票否决，启用降级模式');
    // 按原始分数排序，选择相对最好的
    scoredSchemes.push(...allScored.sort((a, b) => b.total - a.total).slice(0, count));
  }
  
  // 梯度推荐策略
  const selected = [];
  const usedWuxing = new Set();
  
  // 第一套：最佳匹配（最高分）
  if (scoredSchemes.length > 0) {
    const best = scoredSchemes[0];
    selected.push({
      ...best.scheme,
      _score: best.total,
      _breakdown: best.breakdown,
      _type: 'best' // 最佳匹配
    });
    usedWuxing.add(best.scheme.color.wuxing);
  }
  
  // 第二套：保守替代（同五行，不同风格/材质）
  for (const item of scoredSchemes.slice(1)) {
    if (selected.length >= 2) break;
    
    const wuxing = item.scheme.color.wuxing;
    const firstWuxing = selected[0]?.color?.wuxing;
    
    // 同五行但不同方案
    if (wuxing === firstWuxing && item.scheme.id !== selected[0].id) {
      selected.push({
        ...item.scheme,
        _score: item.total,
        _breakdown: item.breakdown,
        _type: 'alternative' // 保守替代
      });
      break;
    }
  }
  
  // 第三套：平衡方案（不同五行，平衡今日能量）
  for (const item of scoredSchemes) {
    if (selected.length >= 3) break;
    if (selected.some(s => s.id === item.scheme.id)) continue;
    
    const wuxing = item.scheme.color.wuxing;
    const termWuxing = context.termWuxing;
    
    // 选择与节气五行相克或不同的（平衡能量）
    const isDifferent = !usedWuxing.has(wuxing);
    const isBalancing = isControlling(wuxing, termWuxing) || isControlling(termWuxing, wuxing);
    
    if (isDifferent || isBalancing) {
      selected.push({
        ...item.scheme,
        _score: item.total,
        _breakdown: item.breakdown,
        _type: 'balance' // 平衡方案
      });
      usedWuxing.add(wuxing);
    }
  }
  
  // 如果不够，补充高分方案
  if (selected.length < count) {
    for (const item of scoredSchemes) {
      if (selected.length >= count) break;
      if (!selected.some(s => s.id === item.scheme.id)) {
        selected.push({
          ...item.scheme,
          _score: item.total,
          _breakdown: item.breakdown,
          _type: 'supplement'
        });
      }
    }
  }
  
  return selected.slice(0, count);
}

/**
 * 五行相克关系
 */
function isControlling(from, to) {
  const controlling = {
    wood: 'earth',
    earth: 'water',
    water: 'fire',
    fire: 'metal',
    metal: 'wood'
  };
  return controlling[from] === to;
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
  const { sceneId = 'daily', weatherData = null, userPreferences = null } = options;
  
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
  
  // 获取天气数据（如果未提供）
  let weather = weatherData;
  if (!weather) {
    try {
      weather = await getCurrentWeather();
    } catch (e) {
      console.log('[Engine] Weather data unavailable');
    }
  }
  
  // 获取心愿模板建议
  let intentionTemplate = null;
  if (wishId && intentions) {
    const intentionName = INTENTION_MAP[wishId] || wishId;
    intentionTemplate = findBestIntentionTemplate(intentionName, termInfo?.current?.id, intentions);
  }
  
  // 构建用户画像
  const userProfile = buildUserProfile(baziResult, userPreferences);
  
  // 构建上下文
  const context = buildContext(termInfo, wishId, baziResult, weather, intentionTemplate);
  context.sceneId = sceneId;
  
  // 选择方案（使用新的评分器）
  const selectedSchemes = selectSchemes(schemes.schemes, userProfile, context, 3);
  
  // 获取八字模板建议
  let baziTemplate = null;
  if (baziResult && baziTemplates) {
    baziTemplate = findBestBaziTemplate(baziResult, baziTemplates);
  }
  
  // 获取今日运势
  const dailyLuck = getDailyLuckFactors();
  
  return {
    schemes: selectedSchemes,
    termInfo,
    wishId,
    sceneId,
    intentionTemplate,
    baziResult,
    baziTemplate,
    dailyLuck,
    weather,
    generatedAt: new Date().toISOString(),
    // 新增：推荐理由（用于前端展示）
    explanations: selectedSchemes.map(s => ({
      schemeId: s.id,
      type: s._type,
      score: s._score,
      breakdown: s._breakdown
    }))
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
