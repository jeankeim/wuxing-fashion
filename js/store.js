/**
 * Store Module - 全局状态管理
 * 采用简单的 Store 模式，集中管理应用状态
 */

/**
 * 创建响应式状态
 * @param {Object} initialState - 初始状态
 * @returns {Proxy} 响应式状态对象
 */
function createReactiveState(initialState, onChange) {
  return new Proxy(initialState, {
    set(target, key, value) {
      const oldValue = target[key];
      target[key] = value;
      
      // 值真正改变时才触发通知
      if (oldValue !== value) {
        onChange(key, value, oldValue);
      }
      
      return true;
    }
  });
}

/**
 * Store 类
 */
class Store {
  constructor() {
    // 初始状态
    this._state = {
      // 节气信息
      currentTermInfo: null,
      
      // 用户输入
      currentWishId: null,
      currentBaziResult: null,
      
      // 推荐结果
      currentResult: null,
      
      // 收藏列表
      favorites: [],
      
      // UI 状态
      currentView: 'view-welcome',
      isLoading: false,
      error: null
    };
    
    // 创建响应式状态
    this.state = createReactiveState(this._state, (key, value, oldValue) => {
      this._notify(key, value, oldValue);
    });
    
    // 订阅者映射
    this._subscribers = new Map();
    
    // 调试模式
    this._debug = false;
  }
  
  /**
   * 获取状态
   * @param {string} key - 状态键名
   * @returns {any} 状态值
   */
  get(key) {
    return this.state[key];
  }
  
  /**
   * 设置状态
   * @param {string} key - 状态键名
   * @param {any} value - 状态值
   */
  set(key, value) {
    if (this._debug) {
      console.log(`[Store] ${key}:`, this.state[key], '→', value);
    }
    this.state[key] = value;
  }
  
  /**
   * 批量设置状态
   * @param {Object} updates - 状态更新对象
   */
  setMultiple(updates) {
    Object.entries(updates).forEach(([key, value]) => {
      this.set(key, value);
    });
  }
  
  /**
   * 订阅状态变化
   * @param {string} key - 状态键名
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消订阅函数
   */
  subscribe(key, callback) {
    if (!this._subscribers.has(key)) {
      this._subscribers.set(key, new Set());
    }
    
    this._subscribers.get(key).add(callback);
    
    // 返回取消订阅函数
    return () => {
      this._subscribers.get(key).delete(callback);
    };
  }
  
  /**
   * 订阅多个状态变化
   * @param {string[]} keys - 状态键名数组
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消订阅函数
   */
  subscribeMultiple(keys, callback) {
    const unsubscribers = keys.map(key => this.subscribe(key, callback));
    
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }
  
  /**
   * 通知订阅者
   * @private
   */
  _notify(key, value, oldValue) {
    const subscribers = this._subscribers.get(key);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(value, oldValue, key);
        } catch (error) {
          console.error('[Store] Subscriber error:', error);
        }
      });
    }
  }
  
  /**
   * 重置状态
   * @param {string[]} keys - 要重置的键名，不传则重置所有
   */
  reset(keys = null) {
    const initialState = {
      currentTermInfo: null,
      currentWishId: null,
      currentBaziResult: null,
      currentResult: null,
      favorites: [],
      currentView: 'view-welcome',
      isLoading: false,
      error: null
    };
    
    if (keys) {
      keys.forEach(key => {
        if (key in initialState) {
          this.set(key, initialState[key]);
        }
      });
    } else {
      Object.keys(initialState).forEach(key => {
        this.set(key, initialState[key]);
      });
    }
  }
  
  /**
   * 获取完整状态快照（用于调试）
   * @returns {Object} 状态快照
   */
  snapshot() {
    return { ...this._state };
  }
  
  /**
   * 设置调试模式
   * @param {boolean} enabled - 是否启用
   */
  setDebug(enabled) {
    this._debug = enabled;
  }
}

// 创建单例实例
export const store = new Store();

// 状态键名常量（避免硬编码）
export const StateKeys = {
  CURRENT_TERM_INFO: 'currentTermInfo',
  CURRENT_WISH_ID: 'currentWishId',
  CURRENT_BAZI_RESULT: 'currentBaziResult',
  CURRENT_RESULT: 'currentResult',
  FAVORITES: 'favorites',
  CURRENT_VIEW: 'currentView',
  IS_LOADING: 'isLoading',
  ERROR: 'error'
};

// 视图名称常量
export const ViewNames = {
  WELCOME: 'view-welcome',
  ENTRY: 'view-entry',
  RESULTS: 'view-results',
  UPLOAD: 'view-upload',
  FAVORITES: 'view-favorites'
};
