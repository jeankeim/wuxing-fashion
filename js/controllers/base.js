/**
 * Base Controller - 控制器基类
 * 每个视图对应一个控制器
 */

import { store } from '../store.js';

/**
 * 基础控制器类
 */
export class BaseController {
  constructor() {
    this.isMounted = false;
    this.eventListeners = [];
    this.subscriptions = [];
  }

  /**
   * 挂载控制器
   */
  mount() {
    if (this.isMounted) return;
    
    this.init();
    this.bindEvents();
    this.subscribeStore();
    this.isMounted = true;
    this.onMount();
  }

  /**
   * 卸载控制器
   */
  unmount() {
    if (!this.isMounted) return;
    
    this.onUnmount();
    this.unsubscribeStore();
    this.removeEventListeners();
    this.isMounted = false;
  }

  /**
   * 初始化（子类覆盖）
   */
  init() {}

  /**
   * 绑定事件（子类覆盖）
   */
  bindEvents() {}

  /**
   * 订阅 Store（子类覆盖）
   */
  subscribeStore() {}

  /**
   * 挂载完成（子类覆盖）
   */
  onMount() {}

  /**
   * 卸载前（子类覆盖）
   */
  onUnmount() {}

  /**
   * 添加事件监听
   */
  addEventListener(target, type, handler, options = {}) {
    target.addEventListener(type, handler, options);
    this.eventListeners.push({ target, type, handler });
  }

  /**
   * 移除所有事件监听
   */
  removeEventListeners() {
    this.eventListeners.forEach(({ target, type, handler }) => {
      target.removeEventListener(type, handler);
    });
    this.eventListeners = [];
  }

  /**
   * 订阅 Store
   * @param {string} key - 状态键
   * @param {Function} callback - 回调函数
   */
  subscribe(key, callback) {
    const unsubscribe = store.subscribe(key, callback);
    this.subscriptions.push(unsubscribe);
  }

  /**
   * 取消所有 Store 订阅
   */
  unsubscribeStore() {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions = [];
  }

  /**
   * 获取状态
   * @param {string} key - 状态键
   */
  getState(key) {
    return store.get(key);
  }

  /**
   * 设置状态
   * @param {string} key - 状态键
   * @param {any} value - 值
   */
  setState(key, value) {
    store.set(key, value);
  }

  /**
   * 显示 Toast
   * @param {string} message - 消息
   */
  showToast(message) {
    // 触发全局 toast 事件
    window.dispatchEvent(new CustomEvent('app:toast', { detail: { message } }));
  }
}
