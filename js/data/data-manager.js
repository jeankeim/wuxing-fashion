/**
 * Data Manager Module - 数据导出/导入
 * 支持用户备份和恢复本地数据
 */

import { safeStorage } from '../core/error-handler.js';

// 数据版本，用于兼容性检查
const DATA_VERSION = '1.0';

// 需要导出的数据键列表
const DATA_KEYS = [
  'recommendation_feedback',
  'user_preferences',
  'wuxing_favorites',
  'wuxing_last_bazi',
  'wuxing_last_wish',
  'wuxing_last_result',
  'wuxing_usage_stats',
  'bazi_precision',
  'last_scene'
];

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
 * 导出所有用户数据
 * @returns {Object} 导出的数据对象
 */
export function exportData() {
  const data = {
    version: DATA_VERSION,
    exportedAt: new Date().toISOString(),
    appName: '五行穿搭建议',
    userData: {}
  };
  
  // 收集所有数据
  DATA_KEYS.forEach(key => {
    const value = storage.getItem(key);
    if (value !== null) {
      data.userData[key] = value;
    }
  });
  
  // 统计信息
  data.stats = {
    totalKeys: Object.keys(data.userData).length,
    hasFavorites: !!data.userData.wuxing_favorites?.length,
    favoritesCount: data.userData.wuxing_favorites?.length || 0
  };
  
  return data;
}

/**
 * 生成导出文件并下载
 */
export function downloadExportFile() {
  const data = exportData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  // 生成文件名：wuxing-fashion-backup-YYYYMMDD-HHmmss.json
  const now = new Date();
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  const filename = `wuxing-fashion-backup-${timestamp}.json`;
  
  // 创建下载链接
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // 清理
  URL.revokeObjectURL(url);
  
  return { success: true, filename, stats: data.stats };
}

/**
 * 验证导入的数据
 * @param {Object} data - 导入的数据
 * @returns {Object} 验证结果
 */
export function validateImportData(data) {
  const errors = [];
  
  if (!data) {
    return { valid: false, errors: ['数据为空'] };
  }
  
  // 检查版本
  if (!data.version) {
    errors.push('缺少数据版本信息');
  } else if (data.version !== DATA_VERSION) {
    errors.push(`数据版本不兼容: ${data.version} (期望: ${DATA_VERSION})`);
  }
  
  // 检查数据结构
  if (!data.userData || typeof data.userData !== 'object') {
    errors.push('缺少用户数据');
  }
  
  // 检查是否有有效数据
  if (data.userData && Object.keys(data.userData).length === 0) {
    errors.push('用户数据为空');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    stats: data.stats || {}
  };
}

/**
 * 导入数据
 * @param {Object} data - 导入的数据
 * @param {Object} options - 选项
 * @returns {Object} 导入结果
 */
export function importData(data, options = {}) {
  const { merge = false, preview = false } = options;
  
  // 验证数据
  const validation = validateImportData(data);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }
  
  // 仅预览，不实际导入
  if (preview) {
    return {
      success: true,
      preview: true,
      stats: data.stats,
      keys: Object.keys(data.userData)
    };
  }
  
  // 如果不合并，先清除现有数据
  if (!merge) {
    clearAllData();
  }
  
  // 导入数据
  let importedCount = 0;
  Object.entries(data.userData).forEach(([key, value]) => {
    try {
      storage.setItem(key, value);
      importedCount++;
    } catch (error) {
      console.error(`[DataManager] Failed to import ${key}:`, error);
    }
  });
  
  return {
    success: true,
    importedCount,
    merged: merge,
    stats: data.stats
  };
}

/**
 * 从文件读取数据
 * @param {File} file - 导入的文件
 * @returns {Promise<Object>} 解析后的数据
 */
export function readImportFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('未选择文件'));
      return;
    }
    
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      reject(new Error('请选择 JSON 格式的文件'));
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        resolve(data);
      } catch (error) {
        reject(new Error('文件解析失败，请检查文件格式'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * 清除所有数据（包括所有 localStorage 数据）
 */
export function clearAllData() {
  // 清除所有 localStorage 数据
  localStorage.clear();
}

/**
 * 获取数据概览
 * @returns {Object} 数据概览
 */
export function getDataOverview() {
  const overview = {
    totalKeys: 0,
    dataSize: 0,
    items: {}
  };
  
  // 遍历 localStorage 中的所有 key
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    
    if (value !== null) {
      const jsonStr = JSON.stringify(value);
      const size = new Blob([jsonStr]).size;
      
      overview.totalKeys++;
      overview.dataSize += size;
      
      // 简化显示
      let displayValue = '';
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          displayValue = `${parsed.length} 项`;
        } else if (typeof parsed === 'object') {
          displayValue = `${Object.keys(parsed).length} 个字段`;
        } else {
          displayValue = String(parsed).substring(0, 50);
        }
      } catch (e) {
        // 非 JSON 格式
        displayValue = String(value).substring(0, 50);
      }
      
      overview.items[key] = {
        size: formatBytes(size),
        display: displayValue
      };
    }
  }
  
  overview.totalSize = formatBytes(overview.dataSize);
  
  return overview;
}

/**
 * 格式化字节大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的字符串
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 生成数据管理面板 HTML
 * @returns {string} HTML 字符串
 */
export function renderDataManagerPanel() {
  const overview = getDataOverview();
  
  let itemsHtml = '';
  Object.entries(overview.items).forEach(([key, info]) => {
    const label = getKeyLabel(key);
    itemsHtml += `
      <div class="data-item">
        <span class="data-item-name">${label}</span>
        <span class="data-item-value">${info.display}</span>
        <span class="data-item-size">${info.size}</span>
      </div>
    `;
  });
  
  return `
    <div class="data-manager-panel">
      <h3 class="panel-title">数据管理</h3>
      
      <div class="data-overview">
        <div class="overview-stat">
          <span class="stat-value">${overview.totalKeys}</span>
          <span class="stat-label">数据项</span>
        </div>
        <div class="overview-stat">
          <span class="stat-value">${overview.totalSize}</span>
          <span class="stat-label">总大小</span>
        </div>
      </div>
      
      <div class="data-items">
        ${itemsHtml || '<p class="empty-tip">暂无数据</p>'}
      </div>
      
      <div class="data-actions">
        <button class="btn btn-danger btn-ghost" id="btn-clear-data" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
          清除所有数据
        </button>
      </div>
    </div>
  `;
}

/**
 * 获取数据项的显示标签
 * @param {string} key - 数据键
 * @returns {string} 显示标签
 */
function getKeyLabel(key) {
  const labels = {
    'recommendation_feedback': '推荐反馈',
    'user_preferences': '用户偏好',
    'wuxing_favorites': '收藏方案',
    'wuxing_last_bazi': '上次八字',
    'wuxing_last_wish': '上次心愿',
    'wuxing_last_result': '上次结果',
    'wuxing_usage_stats': '使用统计',
    'bazi_precision': '精度设置',
    'last_scene': '上次场景'
  };
  return labels[key] || key;
}
