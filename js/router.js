/**
 * Router Module - 前端路由系统
 * 支持浏览器前进后退，URL 反映应用状态
 */

import { store, StateKeys } from './store.js';

// 路由配置
const ROUTES = {
  '/': { view: 'view-welcome', title: '欢迎' },
  '/entry': { view: 'view-entry', title: '选择心愿' },
  '/results': { view: 'view-results', title: '推荐结果' },
  '/favorites': { view: 'view-favorites', title: '我的收藏' },
  '/profile': { view: 'view-profile', title: '我的画像' },
  '/diary': { view: 'view-diary', title: '穿搭日记' },
  '/upload': { view: 'view-upload', title: '上传照片' }
};

// 当前路由状态
let currentRoute = '/';

/**
 * 初始化路由系统
 */
export function initRouter() {
  // 监听浏览器前进后退
  window.addEventListener('popstate', (e) => {
    const path = window.location.pathname;
    navigateTo(path, false);
  });
  
  // 处理初始路由
  const initialPath = window.location.pathname;
  if (ROUTES[initialPath]) {
    navigateTo(initialPath, false);
  } else {
    // 未知路径，重定向到首页
    navigateTo('/', true);
  }
  
  // 拦截所有链接点击（委托）
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-router]');
    if (link) {
      e.preventDefault();
      const path = link.getAttribute('href');
      navigateTo(path, true);
    }
  });
}

/**
 * 导航到指定路径
 * @param {string} path - 目标路径
 * @param {boolean} pushState - 是否推入历史记录
 */
export function navigateTo(path, pushState = true) {
  const route = ROUTES[path];
  if (!route) {
    console.warn('[Router] Unknown route:', path);
    return;
  }
  
  // 更新当前路由
  currentRoute = path;
  
  // 更新浏览器历史
  if (pushState) {
    window.history.pushState({ path }, route.title, path);
  }
  
  // 更新页面标题
  document.title = `五行穿搭建议 - ${route.title}`;
  
  // 触发路由变化事件
  window.dispatchEvent(new CustomEvent('routechange', {
    detail: { path, route, from: getPreviousRoute() }
  }));
  
  // 更新 Store
  store.set(StateKeys.CURRENT_VIEW, route.view);
  
  console.log('[Router] Navigated to:', path);
}

/**
 * 获取当前路由
 * @returns {string} 当前路径
 */
export function getCurrentRoute() {
  return currentRoute;
}

/**
 * 获取当前路由配置
 * @returns {Object} 路由配置
 */
export function getCurrentRouteConfig() {
    return ROUTES[currentRoute];
}

/**
 * 获取所有路由配置
 * @returns {Object} 路由配置表
 */
export function getRoutes() {
  return { ...ROUTES };
}

/**
 * 检查路径是否有效
 * @param {string} path - 路径
 * @returns {boolean} 是否有效
 */
export function isValidRoute(path) {
  return !!ROUTES[path];
}

/**
 * 返回上一页
 */
export function goBack() {
  window.history.back();
}

/**
 * 获取上一页路由（简化实现）
 * @returns {string|null} 上一页路径
 */
function getPreviousRoute() {
  // 实际项目中可以维护路由历史栈
  return null;
}

/**
 * 生成路由链接
 * @param {string} path - 路径
 * @param {string} text - 链接文本
 * @param {Object} options - 选项
 * @returns {string} HTML 字符串
 */
export function createRouteLink(path, text, options = {}) {
  const { className = '', icon = '' } = options;
  const iconHtml = icon ? `<span class="link-icon">${icon}</span>` : '';
  return `<a href="${path}" data-router class="${className}">${iconHtml}${text}</a>`;
}
