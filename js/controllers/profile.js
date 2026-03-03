/**
 * Profile Controller - 画像页控制器
 */

import { BaseController } from './base.js';
import { goBack } from '../core/router.js';
import { renderProfileView } from '../utils/render.js';

export class ProfileController extends BaseController {
  constructor() {
    super();
    this.containerId = 'view-profile';
  }

  onMount() {
    // 动态获取容器（视图是动态加载的）
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error('[ProfileController] Container not found');
      return;
    }
    
    // 绑定事件
    this.bindEvents();
    
    // 渲染画像
    renderProfileView();
  }

  bindEvents() {
    // 避免重复绑定
    if (this.eventsBound) return;
    this.eventsBound = true;
    
    // 返回按钮
    const backBtn = this.container.querySelector('#btn-back-results-from-profile');
    if (backBtn) {
      this.addEventListener(backBtn, 'click', () => {
        goBack();
      });
    }

    // 数据管理按钮（委托）
    this.container.addEventListener('click', (e) => {
      if (e.target.closest('#btn-export-data')) {
        this.exportData();
      }
      if (e.target.closest('#btn-import-data')) {
        this.importData();
      }
      if (e.target.closest('#btn-clear-data')) {
        this.clearData();
      }
    });

    // 文件选择
    const fileInput = this.container.querySelector('#import-file-input');
    if (fileInput) {
      this.addEventListener(fileInput, 'change', (e) => {
        this.handleFileSelect(e);
      });
    }
  }

  exportData() {
    this.showToast('导出功能开发中...');
  }

  importData() {
    const fileInput = this.container.querySelector('#import-file-input');
    if (fileInput) {
      fileInput.click();
    }
  }

  handleFileSelect(e) {
    this.showToast('导入功能开发中...');
    e.target.value = '';
  }

  clearData() {
    if (confirm('确定要清除所有数据吗？此操作不可恢复。')) {
      this.showToast('数据已清除');
    }
  }

  onUnmount() {
    this.eventsBound = false;
  }
}
