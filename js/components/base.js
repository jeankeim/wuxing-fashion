/**
 * Base Component - 组件基类
 * 提供组件生命周期管理和事件绑定
 */

/**
 * 基础组件类
 */
export class Component {
  /**
   * @param {HTMLElement} container - 容器元素
   * @param {Object} props - 组件属性
   */
  constructor(container, props = {}) {
    this.container = container;
    this.props = props;
    this.state = {};
    this.eventListeners = [];
    this.isMounted = false;
  }

  /**
   * 设置状态
   * @param {Object} newState - 新状态
   */
  setState(newState) {
    this.state = { ...this.state, ...newState };
    if (this.isMounted) {
      this.render();
    }
  }

  /**
   * 挂载组件
   */
  mount() {
    if (this.isMounted) return;
    
    this.init();
    this.render();
    this.bindEvents();
    this.isMounted = true;
    this.onMount();
  }

  /**
   * 卸载组件
   */
  unmount() {
    if (!this.isMounted) return;
    
    this.onUnmount();
    this.removeEventListeners();
    this.container.innerHTML = '';
    this.isMounted = false;
  }

  /**
   * 初始化（子类可覆盖）
   */
  init() {}

  /**
   * 渲染（子类必须实现）
   */
  render() {
    throw new Error('Component must implement render() method');
  }

  /**
   * 绑定事件（子类可覆盖）
   */
  bindEvents() {}

  /**
   * 挂载完成回调（子类可覆盖）
   */
  onMount() {}

  /**
   * 卸载前回调（子类可覆盖）
   */
  onUnmount() {}

  /**
   * 添加事件监听（自动管理）
   * @param {EventTarget} target - 目标元素
   * @param {string} type - 事件类型
   * @param {Function} handler - 处理函数
   * @param {Object} options - 选项
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
}
