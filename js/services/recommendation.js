/**
 * Recommendation Module - 智能推荐算法
 * 支持用户反馈闭环、今日运势随机因子、个性化推荐
 */

import { safeStorage } from '../core/error-handler.js';

const STORAGE_KEY = 'recommendation_feedback';
const USER_PREFERENCES_KEY = 'user_preferences';

// 安全的 localStorage 操作对象
const storage = {
  getItem: (key) => {
    return safeStorage(() => {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    });
  },
  setItem: (key, value) => {
    safeStorage(() => {
      localStorage.setItem(key, JSON.stringify(value));
    });
  },
  removeItem: (key) => {
    safeStorage(() => {
      localStorage.removeItem(key);
    });
  }
};

// 场景类型定义
export const SCENES = {
  // 基础场景
  DAILY: { id: 'daily', name: '日常', icon: '🌿', category: '基础' },
  WORK: { id: 'work', name: '职场', icon: '💼', category: '工作' },
  DATE: { id: 'date', name: '约会', icon: '💕', category: '情感' },
  PARTY: { id: 'party', name: '聚会', icon: '🎉', category: '社交' },
  SPORT: { id: 'sport', name: '运动', icon: '⚡', category: '健康' },
  
  // 工作/事业场景
  INTERVIEW: { id: 'interview', name: '面试/答辩', icon: '🎤', category: '工作', description: '稳重、专业、值得信赖' },
  NEGOTIATION: { id: 'negotiation', name: '商务谈判', icon: '🤝', category: '工作', description: '果断、权威、锐利' },
  COMMUTE: { id: 'commute', name: '日常通勤', icon: '🚇', category: '工作', description: '舒适、耐脏、平和' },
  
  // 情感/社交场景
  BLIND_DATE: { id: 'blind_date', name: '初次见面', icon: '🌸', category: '情感', description: '温暖、亲切、不具攻击性' },
  ROMANTIC_DATE: { id: 'romantic_date', name: '浪漫约会', icon: '🍷', category: '情感', description: '浪漫、柔情、流动感' },
  FRIEND_GATHERING: { id: 'friend_gathering', name: '朋友聚餐', icon: '🍻', category: '社交', description: '活跃、热闹、亮眼' },
  
  // 自我/成长场景
  STUDY: { id: 'study', name: '考试/学习', icon: '📚', category: '成长', description: '文昌、思路清晰、向上' },
  HOME: { id: 'home', name: '居家休息', icon: '🏠', category: '生活', description: '包容、放松、接地气' },
  TRAVEL: { id: 'travel', name: '旅行/户外', icon: '✈️', category: '生活', description: '自由、舒展、适应环境' },
  
  // 特殊/运势场景
  BENMING: { id: 'benming', name: '本命年化煞', icon: '🧧', category: '运势', description: '化煞、平衡、趋吉避凶' },
  CELEBRATION: { id: 'celebration', name: '重要庆典', icon: '🎊', category: '社交', description: '喜庆、隆重、气场全开' }
};

// 场景偏好权重
export const SCENE_PREFERENCES = {
  // 基础场景
  work: { wuxing: ['metal', 'earth'], materials: ['羊毛', '羊绒', '精纺', '真丝', '棉麻'] },
  date: { wuxing: ['fire', 'wood'], materials: ['丝绸', '雪纺', '蕾丝', '天丝', '莫代尔'] },
  party: { wuxing: ['fire', 'metal'], materials: ['丝绒', '亮面', '丝绸', '珠片'] },
  sport: { wuxing: ['wood', 'water'], materials: ['速干', '弹力', '冰丝', '透气'] },
  daily: { wuxing: ['wood', 'earth'], materials: ['棉', '麻', '针织', '混纺'] },
  
  // 工作/事业场景
  interview: { wuxing: ['earth', 'metal'], materials: ['精纺羊毛', '羊绒', '真丝', '棉麻', '西装料'] },
  negotiation: { wuxing: ['metal', 'earth'], materials: ['精纺', '丝绒', '真丝', '高支棉', '羊绒'] },
  commute: { wuxing: ['wood', 'earth'], materials: ['棉', '针织', '混纺', '牛仔', '休闲面料'] },
  
  // 情感/社交场景
  blind_date: { wuxing: ['fire', 'earth'], materials: ['雪纺', '针织', '棉麻', '天丝', '莫代尔'] },
  romantic_date: { wuxing: ['fire', 'wood'], materials: ['丝绸', '蕾丝', '丝绒', '雪纺', '真丝'] },
  friend_gathering: { wuxing: ['fire'], materials: ['棉', '牛仔', '休闲面料', '亮面', '印花'] },
  
  // 自我/成长场景
  study: { wuxing: ['wood', 'metal'], materials: ['棉', '针织', '麻', '舒适面料', '透气'] },
  home: { wuxing: ['earth'], materials: ['棉', '麻', '针织', '绒布', '家居服面料'] },
  travel: { wuxing: ['wood', 'water'], materials: ['速干', '弹力', '尼龙', '透气', '轻便面料'] },
  
  // 特殊/运势场景
  benming: { wuxing: ['fire', 'earth'], materials: ['棉', '真丝', '红色面料', '吉祥纹样'] },
  celebration: { wuxing: ['fire', 'metal'], materials: ['丝绸', '丝绒', '亮面', '锦缎', '喜庆面料'] }
};

/**
 * 获取今日运势种子（基于日期）
 * @returns {number} 0-1 之间的随机种子
 */
export function getDailyLuckSeed() {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  
  // 简单的字符串哈希
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  // 转为 0-1
  const seed = Math.abs(hash) % 10000 / 10000;
  return seed;
}

/**
 * 基于种子生成伪随机数
 * @param {number} seed - 种子
 * @returns {number} 0-1 之间的随机数
 */
export function seededRandom(seed) {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

/**
 * 获取今日运势因子
 * @returns {Object} 运势因子
 */
export function getDailyLuckFactors() {
  const seed = getDailyLuckSeed();
  const wuxingList = ['wood', 'fire', 'earth', 'metal', 'water'];
  
  // 基于种子打乱五行顺序
  const shuffled = [...wuxingList].sort(() => seededRandom(seed) - 0.5);
  
  return {
    luckyWuxing: shuffled[0],      // 今日幸运五行
    luckyColor: shuffled[1],       // 今日幸运色
    boostWuxing: shuffled[2],      // 今日增益五行
    seed: seed
  };
}

/**
 * 记录用户反馈
 * @param {string} schemeId - 方案ID
 * @param {string} action - 动作类型: 'view'|'favorite'|'select'|'dismiss'
 * @param {Object} metadata - 额外元数据
 */
export function recordFeedback(schemeId, action, metadata = {}) {
  const feedback = storage.getItem(STORAGE_KEY) || {};
  
  if (!feedback[schemeId]) {
    feedback[schemeId] = {
      views: 0,
      favorites: 0,
      selects: 0,
      dismisses: 0,
      lastInteraction: null,
      wuxing: metadata.wuxing,
      color: metadata.color,
      material: metadata.material
    };
  }
  
  const record = feedback[schemeId];
  
  switch (action) {
    case 'view':
      record.views++;
      break;
    case 'favorite':
      record.favorites++;
      break;
    case 'select':
      record.selects++;
      break;
    case 'dismiss':
      record.dismisses++;
      break;
  }
  
  record.lastInteraction = new Date().toISOString();
  
  storage.setItem(STORAGE_KEY, feedback);
  
  // 更新用户偏好
  updateUserPreferences(schemeId, action, metadata);
}

/**
 * 更新用户偏好
 * @param {string} schemeId - 方案ID
 * @param {string} action - 动作
 * @param {Object} metadata - 元数据
 */
function updateUserPreferences(schemeId, action, metadata) {
  const prefs = storage.getItem(USER_PREFERENCES_KEY) || {
    wuxingScores: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
    colorScores: {},
    materialScores: {},
    sceneScores: { daily: 0, work: 0, date: 0, party: 0, sport: 0 }
  };
  
  const weight = action === 'favorite' ? 3 : action === 'select' ? 2 : 1;
  
  // 更新五行偏好
  if (metadata.wuxing) {
    prefs.wuxingScores[metadata.wuxing] = (prefs.wuxingScores[metadata.wuxing] || 0) + weight;
  }
  
  // 更新颜色偏好
  if (metadata.color) {
    prefs.colorScores[metadata.color] = (prefs.colorScores[metadata.color] || 0) + weight;
  }
  
  // 更新材质偏好
  if (metadata.material) {
    prefs.materialScores[metadata.material] = (prefs.materialScores[metadata.material] || 0) + weight;
  }
  
  storage.setItem(USER_PREFERENCES_KEY, prefs);
}

/**
 * 获取用户偏好
 * @returns {Object} 用户偏好数据
 */
export function getUserPreferences() {
  return storage.getItem(USER_PREFERENCES_KEY) || {
    wuxingScores: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
    colorScores: {},
    materialScores: {},
    sceneScores: { daily: 0, work: 0, date: 0, party: 0, sport: 0 }
  };
}

/**
 * 获取反馈数据
 * @returns {Object} 反馈数据
 */
export function getFeedbackData() {
  return storage.getItem(STORAGE_KEY) || {};
}

/**
 * 获取今日运势描述
 * @returns {Object} 运势描述
 */
export function getDailyLuckDescription() {
  const luck = getDailyLuckFactors();
  const wuxingNames = {
    wood: '木', fire: '火', earth: '土', metal: '金', water: '水'
  };
  
  const descriptions = {
    wood: '今日木气旺盛，宜穿绿色系，利事业拓展',
    fire: '今日火气当令，宜穿红色系，利社交人际',
    earth: '今日土气稳定，宜穿黄色系，利稳固根基',
    metal: '今日金气清肃，宜穿白色系，利决断决策',
    water: '今日水气流动，宜穿黑色系，利智慧思考'
  };
  
  return {
    luckyWuxing: wuxingNames[luck.luckyWuxing],
    luckyColor: wuxingNames[luck.luckyColor],
    description: descriptions[luck.luckyWuxing],
    seed: luck.seed
  };
}

/**
 * 清除推荐数据（用于测试）
 */
export function clearRecommendationData() {
  storage.removeItem(STORAGE_KEY);
  storage.removeItem(USER_PREFERENCES_KEY);
}
