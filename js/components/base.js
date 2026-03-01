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

  /**
   * 触发事件
   * @param {string} eventName - 事件名
   * @param {any} detail - 事件数据
   */
  emit(eventName, detail = null) {
    const event = new CustomEvent(eventName, { detail, bubbles: true });
    this.container.dispatchEvent(event);
  }
}

/**
 * 按钮组件
 */
export class Button extends Component {
  render() {
    const { text, variant = 'primary', icon = '', onClick } = this.props;
    const iconHtml = icon ? `<span class="btn-icon">${icon}</span>` : '';
    
    this.container.innerHTML = `
      <button class="btn btn-${variant}" type="button">
        ${iconHtml}
        <span class="btn-text">${text}</span>
      </button>
    `;
    
    if (onClick) {
      this.addEventListener(this.container.querySelector('button'), 'click', onClick);
    }
  }
}

/**
 * 卡片组件
 */
export class Card extends Component {
  render() {
    const { title, content, actions = [] } = this.props;
    
    const actionsHtml = actions.map(action => `
      <button class="card-action" data-action="${action.id}">${action.text}</button>
    `).join('');
    
    this.container.innerHTML = `
      <div class="card">
        ${title ? `<div class="card-header"><h3>${title}</h3></div>` : ''}
        <div class="card-body">${content}</div>
        ${actions.length ? `<div class="card-actions">${actionsHtml}</div>` : ''}
      </div>
    `;
  }
}

/**
 * 模态框组件
 */
export class Modal extends Component {
  init() {
    this.state = { isOpen: false };
  }

  render() {
    const { title, content } = this.props;
    const { isOpen } = this.state;
    
    this.container.innerHTML = `
      <div class="modal ${isOpen ? '' : 'hidden'}" role="dialog" aria-modal="true">
        <div class="modal-backdrop"></div>
        <div class="modal-content">
          <header class="modal-header">
            <h3>${title}</h3>
            <button class="btn btn-icon modal-close" aria-label="关闭">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </header>
          <div class="modal-body">${content}</div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const backdrop = this.container.querySelector('.modal-backdrop');
    const closeBtn = this.container.querySelector('.modal-close');
    
    this.addEventListener(backdrop, 'click', () => this.close());
    this.addEventListener(closeBtn, 'click', () => this.close());
  }

  open() {
    this.setState({ isOpen: true });
    document.body.style.overflow = 'hidden';
    this.emit('modal:open');
  }

  close() {
    this.setState({ isOpen: false });
    document.body.style.overflow = '';
    this.emit('modal:close');
  }
}

/**
 * 标签页组件
 */
export class Tabs extends Component {
  init() {
    this.state = { activeTab: this.props.defaultTab || 0 };
  }

  render() {
    const { tabs } = this.props;
    const { activeTab } = this.state;
    
    const tabsHtml = tabs.map((tab, index) => `
      <button class="tab-btn ${index === activeTab ? 'active' : ''}" data-index="${index}">
        ${tab.icon ? `<span class="tab-icon">${tab.icon}</span>` : ''}
        ${tab.label}
      </button>
    `).join('');
    
    const contentHtml = tabs[activeTab]?.content || '';
    
    this.container.innerHTML = `
      <div class="tabs">
        <div class="tabs-header">${tabsHtml}</div>
        <div class="tabs-content">${contentHtml}</div>
      </div>
    `;
  }

  bindEvents() {
    const buttons = this.container.querySelectorAll('.tab-btn');
    buttons.forEach((btn, index) => {
      this.addEventListener(btn, 'click', () => {
        this.setState({ activeTab: index });
        this.emit('tab:change', { index, tab: this.props.tabs[index] });
      });
    });
  }
}

/**
 * 加载状态组件
 */
export class Loading extends Component {
  render() {
    const { text = '加载中...' } = this.props;
    
    this.container.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        <p class="loading-text">${text}</p>
      </div>
    `;
  }
}

/**
 * 空状态组件
 */
export class EmptyState extends Component {
  render() {
    const { icon = '', title, description } = this.props;
    
    this.container.innerHTML = `
      <div class="empty-state">
        ${icon ? `<div class="empty-icon">${icon}</div>` : ''}
        <p class="empty-title">${title}</p>
        ${description ? `<p class="empty-description">${description}</p>` : ''}
      </div>
    `;
  }
}
