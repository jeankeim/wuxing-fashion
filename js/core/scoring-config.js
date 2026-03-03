/**
 * Scoring Configuration - 评分权重配置
 * 采用加权系数法，总分归一化为 1.0 (100%)
 */

// 基础权重配置
export const SCORING_WEIGHTS = {
  base: {
    solarTerm: 0.25,   // 节气匹配 (25%)
    bazi: 0.20,        // 八字喜用 (20%) - 若无八字则平分给其他
    scene: 0.20,       // 场景匹配 (20%)
    weather: 0.15,     // 天气联动 (15%)
    wish: 0.15         // 心愿匹配 (15%)
  },
  bonus: {
    history: 0.10,     // 历史偏好 (额外加成，可突破 100% 上限)
    dailyLuck: 0.05    // 今日运势 (随机种子)
  }
};

// 五行相生关系
export const GENERATING_CYCLE = {
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood'
};

// 五行相克关系
export const CONTROLLING_CYCLE = {
  wood: 'earth',
  earth: 'water',
  water: 'fire',
  fire: 'metal',
  metal: 'wood'
};

// 天气对应的五行能量场
export const WEATHER_ELEMENT_MAP = {
  sunny: 'fire',      // 晴天 = 火气旺
  clear: 'fire',
  cloudy: 'metal',    // 阴天 = 金气肃杀
  rain: 'water',      // 雨天 = 水气旺
  snow: 'water',
  fog: 'water',
  storm: 'water'
};

// 温度对应的五行调候
export const TEMPERATURE_ELEMENT = {
  hot: 'fire',        // 高温 = 火旺
  warm: 'fire',
  comfortable: 'earth', // 舒适 = 土中和
  cool: 'metal',      // 凉爽 = 金凉
  cold: 'water'       // 寒冷 = 水寒
};

// 评分等级
export const SCORE_LEVELS = {
  PERFECT: 100,       // 完美匹配
  EXCELLENT: 80,      // 优秀
  GOOD: 60,           // 良好
  FAIR: 40,           // 一般
  POOR: 20,           // 较差
  BAD: 0              // 不匹配
};

/**
 * 获取动态权重（根据用户数据调整）
 * @param {Object} userProfile - 用户画像
 * @returns {Object} 调整后的权重
 */
export function getDynamicWeights(userProfile = {}) {
  const weights = { ...SCORING_WEIGHTS.base };
  
  // 如果没有八字，将八字权重平分给节气和场景
  if (!userProfile.bazi) {
    const redistribute = weights.bazi / 2;
    weights.solarTerm += redistribute;
    weights.scene += redistribute;
    weights.bazi = 0;
  }
  
  // 如果是新用户，降低历史偏好权重
  if (userProfile.isNewUser) {
    weights.solarTerm += 0.05;
    weights.scene += 0.05;
  }
  
  return weights;
}

/**
 * 检查五行是否相生
 * @param {string} from - 起始五行
 * @param {string} to - 目标五行
 * @returns {boolean}
 */
export function isGenerating(from, to) {
  return GENERATING_CYCLE[from] === to;
}

/**
 * 检查五行是否相克
 * @param {string} from - 起始五行
 * @param {string} to - 目标五行
 * @returns {boolean}
 */
export function isControlling(from, to) {
  return CONTROLLING_CYCLE[from] === to;
}

/**
 * 获取五行关系得分
 * @param {string} source - 源五行
 * @param {string} target - 目标五行
 * @returns {number} 得分 (0-100)
 */
export function getElementRelationScore(source, target) {
  if (source === target) return SCORE_LEVELS.PERFECT;
  if (isGenerating(source, target)) return SCORE_LEVELS.EXCELLENT;
  if (isGenerating(target, source)) return SCORE_LEVELS.GOOD;
  if (isControlling(source, target)) return SCORE_LEVELS.FAIR;
  if (isControlling(target, source)) return SCORE_LEVELS.POOR;
  return SCORE_LEVELS.BAD;
}
