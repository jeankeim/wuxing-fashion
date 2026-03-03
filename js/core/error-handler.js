/**
 * Error Handler Module - 统一错误处理
 */

import { showToast } from '../utils/render.js';

// 错误类型定义
export const ErrorTypes = {
  NETWORK: 'NETWORK',           // 网络错误
  TIMEOUT: 'TIMEOUT',           // 超时错误
  DATA_PARSE: 'DATA_PARSE',     // 数据解析错误
  VALIDATION: 'VALIDATION',     // 验证错误
  STORAGE: 'STORAGE',           // 存储错误
  UNKNOWN: 'UNKNOWN'            // 未知错误
};

// 错误消息映射（用户友好）
const ERROR_MESSAGES = {
  [ErrorTypes.NETWORK]: '网络连接失败，请检查网络后重试',
  [ErrorTypes.TIMEOUT]: '请求超时，请稍后重试',
  [ErrorTypes.DATA_PARSE]: '数据加载异常，请刷新页面',
  [ErrorTypes.VALIDATION]: '输入信息有误，请检查后再试',
  [ErrorTypes.STORAGE]: '本地存储失败，请检查浏览器设置',
  [ErrorTypes.UNKNOWN]: '操作失败，请稍后重试'
};

/**
 * 应用错误类
 */
export class AppError extends Error {
  constructor(type, message, originalError = null) {
    super(message || ERROR_MESSAGES[type]);
    this.type = type;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * 包装异步函数，统一错误处理
 * @param {Function} fn - 异步函数
 * @param {Object} options - 配置选项
 * @returns {Function} 包装后的函数
 */
export function withErrorHandler(fn, options = {}) {
  const {
    errorType = ErrorTypes.UNKNOWN,
    customMessage = null,
    silent = false,  // 是否静默处理（不显示 toast）
    onError = null   // 自定义错误回调
  } = options;

  return async function (...args) {
    try {
      return await fn.apply(this, args);
    } catch (error) {
      // 创建应用错误
      const appError = error instanceof AppError 
        ? error 
        : new AppError(errorType, customMessage, error);

      // 记录错误日志
      logError(appError);

      // 显示用户提示
      if (!silent) {
        showToast(appError.message);
      }

      // 执行自定义回调
      if (onError) {
        onError(appError);
      }

      // 返回 null 表示失败
      return null;
    }
  };
}

/**
 * 记录错误日志
 */
function logError(error) {
  console.error('[ErrorHandler]', {
    type: error.type,
    message: error.message,
    timestamp: error.timestamp,
    original: error.originalError?.message || null,
    stack: error.stack
  });
}

/**
 * 安全的 fetch 包装
 * @param {string} url - 请求地址
 * @param {Object} options - fetch 选项
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<Response>}
 */
export async function safeFetch(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new AppError(
        ErrorTypes.NETWORK,
        `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new AppError(ErrorTypes.TIMEOUT);
    }

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(ErrorTypes.NETWORK, null, error);
  }
}

/**
 * 安全的 JSON 解析
 * @param {Response} response - fetch 返回的 Response
 * @returns {Promise<Object>}
 */
export async function safeJsonParse(response) {
  try {
    return await response.json();
  } catch (error) {
    throw new AppError(ErrorTypes.DATA_PARSE, '数据格式错误', error);
  }
}

/**
 * 安全的本地存储操作
 * @param {Function} operation - 存储操作函数
 * @returns {any}
 */
export function safeStorage(operation) {
  try {
    return operation();
  } catch (error) {
    // 可能是存储空间不足或隐私模式
    if (error.name === 'QuotaExceededError') {
      throw new AppError(ErrorTypes.STORAGE, '存储空间不足，请清理后重试');
    }
    throw new AppError(ErrorTypes.STORAGE, null, error);
  }
}

/**
 * 全局错误监听
 */
export function initGlobalErrorHandler() {
  // 捕获未处理的 Promise 错误
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Global] Unhandled Promise rejection:', event.reason);
    
    // 如果是应用错误，显示提示
    if (event.reason instanceof AppError) {
      showToast(event.reason.message);
    } else {
      showToast('操作失败，请稍后重试');
    }
    
    event.preventDefault();
  });

  // 捕获全局错误
  window.addEventListener('error', (event) => {
    console.error('[Global] Uncaught error:', event.error);
    showToast('页面出现异常，请刷新后重试');
    event.preventDefault();
  });
}
