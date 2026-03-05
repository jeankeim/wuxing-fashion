/**
 * Repository Module - 数据仓库层
 * 抽象存储实现，支持 localStorage/IndexedDB/云端同步
 */

import { safeStorage } from '../core/error-handler.js';

// 存储键名常量
export const StorageKeys = {
  FEEDBACK: 'recommendation_feedback',
  PREFERENCES: 'user_preferences',
  LAST_BAZI: 'wuxing_last_bazi',
  LAST_WISH: 'wuxing_last_wish',
  LAST_RESULT: 'wuxing_last_result',
  USAGE_STATS: 'wuxing_usage_stats',
  BAZI_PRECISION: 'bazi_precision',
  LAST_SCENE: 'last_scene',
  FIRST_VISIT: 'first_visit',
  UPLOADED_OUTFITS: 'wuxing_uploaded_outfits'
};

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

/**
 * 基础 Repository 类
 */
class BaseRepository {
  constructor(key) {
    this.key = key;
  }

  /**
   * 获取数据
   * @returns {any} 存储的数据
   */
  get() {
    return storage.getItem(this.key);
  }

  /**
   * 设置数据
   * @param {any} data - 要存储的数据
   */
  set(data) {
    storage.setItem(this.key, data);
  }

  /**
   * 删除数据
   */
  remove() {
    storage.removeItem(this.key);
  }

  /**
   * 检查是否存在
   * @returns {boolean}
   */
  exists() {
    return this.get() !== null;
  }
}

/**
 * 用户偏好 Repository
 */
class PreferencesRepository extends BaseRepository {
  constructor() {
    super(StorageKeys.PREFERENCES);
  }

  /**
   * 获取偏好（带默认值）
   * @returns {Object}
   */
  get() {
    return storage.getItem(this.key) || {
      wuxingScores: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
      colorScores: {},
      materialScores: {},
      sceneScores: { daily: 0, work: 0, date: 0, party: 0, sport: 0 }
    };
  }

  /**
   * 更新五行偏好
   * @param {string} wuxing - 五行
   * @param {number} delta - 变化值
   */
  updateWuxingScore(wuxing, delta) {
    const prefs = this.get();
    prefs.wuxingScores[wuxing] = (prefs.wuxingScores[wuxing] || 0) + delta;
    this.set(prefs);
  }

  /**
   * 更新颜色偏好
   * @param {string} color - 颜色名称
   * @param {number} delta - 变化值
   */
  updateColorScore(color, delta) {
    const prefs = this.get();
    prefs.colorScores[color] = (prefs.colorScores[color] || 0) + delta;
    this.set(prefs);
  }

  /**
   * 更新材质偏好
   * @param {string} material - 材质
   * @param {number} delta - 变化值
   */
  updateMaterialScore(material, delta) {
    const prefs = this.get();
    prefs.materialScores[material] = (prefs.materialScores[material] || 0) + delta;
    this.set(prefs);
  }
}

/**
 * 反馈 Repository
 */
class FeedbackRepository extends BaseRepository {
  constructor() {
    super(StorageKeys.FEEDBACK);
  }

  /**
   * 获取所有反馈
   * @returns {Object}
   */
  getAll() {
    return this.get() || {};
  }

  /**
   * 记录反馈
   * @param {string} schemeId - 方案ID
   * @param {string} action - 动作类型
   * @param {Object} metadata - 元数据
   */
  record(schemeId, action, metadata = {}) {
    const feedback = this.getAll();
    
    if (!feedback[schemeId]) {
      feedback[schemeId] = {
        views: 0,
        selects: 0,
        dismisses: 0,
        lastInteraction: null,
        ...metadata
      };
    }

    const record = feedback[schemeId];
    
    switch (action) {
      case 'view':
        record.views++;
        break;
      case 'select':
        record.selects++;
        break;
      case 'dismiss':
        record.dismisses++;
        break;
    }
    
    record.lastInteraction = new Date().toISOString();
    this.set(feedback);
  }
}

/**
 * 八字 Repository
 */
class BaziRepository extends BaseRepository {
  constructor() {
    super(StorageKeys.LAST_BAZI);
  }

  /**
   * 保存八字
   * @param {Object} bazi - 八字数据
   */
  save(bazi) {
    this.set({
      ...bazi,
      savedAt: new Date().toISOString()
    });
  }

  /**
   * 获取八字
   * @returns {Object|null}
   */
  get() {
    return super.get();
  }
}

/**
 * 使用统计 Repository
 */
class StatsRepository extends BaseRepository {
  constructor() {
    super(StorageKeys.USAGE_STATS);
  }

  /**
   * 获取统计
   * @returns {Object}
   */
  get() {
    return super.get() || {
      visits: 0,
      generates: 0,
      uploads: 0,
      firstVisit: null,
      lastVisit: null
    };
  }

  /**
   * 增加计数
   * @param {string} key - 统计项
   */
  increment(key) {
    const stats = this.get();
    stats[key] = (stats[key] || 0) + 1;
    
    if (key === 'visits') {
      if (!stats.firstVisit) {
        stats.firstVisit = new Date().toISOString();
      }
      stats.lastVisit = new Date().toISOString();
    }
    
    this.set(stats);
  }

  /**
   * 是否首次访问
   * @returns {boolean}
   */
  isFirstVisit() {
    const stats = this.get();
    return !stats.firstVisit;
  }
}

/**
 * 穿搭照片 Repository
 */
class OutfitRepository extends BaseRepository {
  constructor() {
    super(StorageKeys.UPLOADED_OUTFITS);
  }

  /**
   * 获取指定日期的照片
   * @param {string} date - 日期字符串
   * @returns {string|null} 图片数据
   */
  getByDate(date) {
    const outfits = this.get() || {};
    return outfits[date] || null;
  }

  /**
   * 保存照片
   * @param {string} date - 日期字符串
   * @param {string} imageData - 图片数据
   */
  save(date, imageData) {
    const outfits = this.get() || {};
    outfits[date] = imageData;
    this.set(outfits);
  }

  /**
   * 删除照片
   * @param {string} date - 日期字符串
   */
  remove(date) {
    const outfits = this.get() || {};
    delete outfits[date];
    this.set(outfits);
  }
}

// 导出 Repository 实例
export const preferencesRepo = new PreferencesRepository();
export const feedbackRepo = new FeedbackRepository();
export const baziRepo = new BaziRepository();
export const statsRepo = new StatsRepository();
export const outfitRepo = new OutfitRepository();

// 通用存储工具
export const storageUtils = {
  get: (key) => storage.getItem(key),
  set: (key, value) => storage.setItem(key, value),
  remove: (key) => storage.removeItem(key),
  clear: () => localStorage.clear()
};
