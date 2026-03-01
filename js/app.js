/**
 * App Module - 应用主入口（重构版）
 * 职责：初始化、路由协调、全局事件
 */

import { initRouter, navigateTo } from './router.js';
import { store, StateKeys } from './store.js';
import { initGlobalErrorHandler, withErrorHandler, ErrorTypes } from './error-handler.js';
import { detectCurrentTerm } from './solar-terms.js';
import { statsRepo } from './repository.js';
import { showToast } from './render.js';

// 视图控制器
import { WelcomeController } from './controllers/welcome.js';
import { EntryController } from './controllers/entry.js';
import { ResultsController } from './controllers/results.js';
import { FavoritesController } from './controllers/favorites.js';
import { ProfileController } from './controllers/profile.js';
import { UploadController } from './controllers/upload.js';

/**
 * 应用类
 */
class App {
  constructor() {
    this.controllers = new Map();
    this.currentController = null;
  }

  /**
   * 初始化应用
   */
  async init() {
    console.log('[App] Initializing...');
    
    // 初始化错误处理
    initGlobalErrorHandler();
    
    // 初始化路由
    initRouter();
    
    // 注册视图控制器
    this.registerControllers();
    
    // 监听路由变化
    window.addEventListener('routechange', (e) => this.handleRouteChange(e));
    
    // 监听 Store 变化（用于调试）
    store.subscribe(StateKeys.CURRENT_VIEW, (view) => {
      console.log('[Store] View changed to:', view);
    });
    
    // 加载基础数据
    await this.loadBaseData();
    
    // 初始化统计
    this.initStats();
    
    console.log('[App] Initialized successfully');
  }

  /**
   * 注册视图控制器
   */
  registerControllers() {
    this.controllers.set('view-welcome', new WelcomeController());
    this.controllers.set('view-entry', new EntryController());
    this.controllers.set('view-results', new ResultsController());
    this.controllers.set('view-favorites', new FavoritesController());
    this.controllers.set('view-profile', new ProfileController());
    this.controllers.set('view-upload', new UploadController());
  }

  /**
   * 加载基础数据
   */
  async loadBaseData() {
    const termInfo = await withErrorHandler(detectCurrentTerm, {
      errorType: ErrorTypes.NETWORK,
      customMessage: '节气数据加载失败'
    })();
    
    if (termInfo) {
      store.set(StateKeys.CURRENT_TERM_INFO, termInfo);
      console.log('[App] Current term:', termInfo.current?.name);
    }
  }

  /**
   * 初始化统计
   */
  initStats() {
    // 标记访问
    statsRepo.increment('visits');
    
    // 首次访问
    if (statsRepo.isFirstVisit()) {
      console.log('[App] First visit');
    }
  }

  /**
   * 处理路由变化
   * @param {CustomEvent} e - 路由变化事件
   */
  handleRouteChange(e) {
    const { route } = e.detail;
    
    // 卸载当前控制器
    if (this.currentController) {
      this.currentController.unmount();
    }
    
    // 获取并挂载新控制器
    const controller = this.controllers.get(route.view);
    if (controller) {
      controller.mount();
      this.currentController = controller;
    } else {
      console.error('[App] No controller for view:', route.view);
    }
    
    // 切换视图显示
    this.switchView(route.view);
  }

  /**
   * 切换视图显示
   * @param {string} viewId - 视图ID
   */
  switchView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
      view.classList.add('hidden');
    });
    
    const target = document.getElementById(viewId);
    if (target) {
      target.classList.remove('hidden');
      window.scrollTo(0, 0);
    }
  }

  /**
   * 导航到指定路径
   * @param {string} path - 路径
   */
  navigate(path) {
    navigateTo(path, true);
  }
}

// 导出单例
export const app = new App();

/**
 * 启动应用
 */
export function bootstrap() {
  document.addEventListener('DOMContentLoaded', () => {
    app.init();
  });
}
