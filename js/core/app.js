/**
 * App Module - 应用主入口（重构版）
 * 职责：初始化、路由协调、全局事件、动态视图加载
 */

import { initRouter, navigateTo } from './router.js';
import { store, StateKeys } from './store.js';
import { initGlobalErrorHandler, withErrorHandler, ErrorTypes } from './error-handler.js';
import { detectCurrentTerm } from '../services/solar-terms.js';
import { statsRepo } from '../data/repository.js';
import { showToast } from '../utils/render.js';

// 视图控制器
import { WelcomeController } from '../controllers/welcome.js';
import { EntryController } from '../controllers/entry.js';
import { ResultsController } from '../controllers/results.js';
import { FavoritesController } from '../controllers/favorites.js';
import { ProfileController } from '../controllers/profile.js';
import { DiaryController } from '../controllers/diary.js';
import { UploadController } from '../controllers/upload.js';

// 视图配置
const VIEW_CONFIG = {
  'view-welcome': { controller: WelcomeController, html: 'views/welcome.html' },
  'view-entry': { controller: EntryController, html: 'views/entry.html' },
  'view-results': { controller: ResultsController, html: 'views/results.html' },
  'view-favorites': { controller: FavoritesController, html: 'views/favorites.html' },
  'view-profile': { controller: ProfileController, html: 'views/profile.html' },
  'view-diary': { controller: DiaryController, html: 'views/diary.html' },
  'view-upload': { controller: UploadController, html: 'views/upload.html' }
};

/**
 * 应用类
 */
class App {
  constructor() {
    this.controllers = new Map();
    this.currentController = null;
    this.loadedViews = new Set();
    this.appContainer = null;
  }

  /**
   * 初始化应用
   */
  async init() {
    // 初始化错误处理
    initGlobalErrorHandler();
    
    // 获取应用容器
    this.appContainer = document.querySelector('.app-container');
    
    // 预加载首屏视图
    await this.loadView('view-welcome');
    await this.loadView('view-entry');
    
    // 注册首屏控制器
    this.registerController('view-welcome');
    this.registerController('view-entry');
    
    // 监听路由变化
    window.addEventListener('routechange', (e) => this.handleRouteChange(e));
    
    // 加载基础数据
    await this.loadBaseData();
    
    // 初始化路由
    initRouter();
    
    // 初始化统计
    this.initStats();
  }

  /**
   * 动态加载视图 HTML
   * @param {string} viewId - 视图 ID
   */
  async loadView(viewId) {
    if (this.loadedViews.has(viewId)) return;
    
    const config = VIEW_CONFIG[viewId];
    if (!config) return;
    
    try {
      const response = await fetch(config.html);
      if (!response.ok) throw new Error(`Failed to load ${config.html}`);
      
      const html = await response.text();
      
      // 创建临时容器解析 HTML
      const temp = document.createElement('div');
      temp.innerHTML = html;
      const viewElement = temp.firstElementChild;
      
      // 插入到应用容器
      if (this.appContainer) {
        this.appContainer.appendChild(viewElement);
        this.loadedViews.add(viewId);
      }
    } catch (error) {
      console.error(`[App] Failed to load view ${viewId}:`, error);
    }
  }

  /**
   * 注册单个控制器
   * @param {string} viewId - 视图 ID
   */
  registerController(viewId) {
    if (this.controllers.has(viewId)) return;
    
    const config = VIEW_CONFIG[viewId];
    if (config) {
      this.controllers.set(viewId, new config.controller());
    }
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
    }
  }

  /**
   * 初始化统计
   */
  initStats() {
    // 标记访问
    statsRepo.increment('visits');
  }

  /**
   * 处理路由变化
   * @param {CustomEvent} e - 路由变化事件
   */
  async handleRouteChange(e) {
    const { route } = e.detail;
    
    // 动态加载视图（如果未加载）
    await this.loadView(route.view);
    
    // 注册控制器（如果未注册）
    this.registerController(route.view);
    
    // 卸载当前控制器
    if (this.currentController) {
      this.currentController.unmount();
    }
    
    // 获取并挂载新控制器
    const controller = this.controllers.get(route.view);
    if (controller) {
      controller.mount();
      this.currentController = controller;
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
