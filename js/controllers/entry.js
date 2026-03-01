/**
 * Entry Controller - 输入页控制器
 */

import { BaseController } from './base.js';
import { navigateTo } from '../router.js';
import { initYearSelect, initDaySelect } from '../render.js';
import { baziRepo } from '../repository.js';
import { StateKeys } from '../store.js';

export class EntryController extends BaseController {
  init() {
    this.container = document.getElementById('view-entry');
    this.currentScene = 'daily';
    this.currentPrecision = 'simple';
  }

  onMount() {
    // 初始化表单
    initYearSelect();
    initDaySelect();
    
    // 恢复上次选择
    this.restoreLastSelection();
  }

  bindEvents() {
    // 返回按钮
    const backBtn = this.container.querySelector('#btn-back-welcome');
    if (backBtn) {
      this.addEventListener(backBtn, 'click', () => {
        navigateTo('/');
      });
    }

    // 场景选择
    this.container.querySelectorAll('.scene-tag').forEach(tag => {
      this.addEventListener(tag, 'click', () => {
        this.selectScene(tag.dataset.scene);
      });
    });

    // 心愿选择
    this.container.querySelectorAll('.wish-tag').forEach(tag => {
      this.addEventListener(tag, 'click', () => {
        this.selectWish(tag.dataset.wish);
      });
    });

    // 精度切换
    this.container.querySelectorAll('.precision-btn').forEach(btn => {
      this.addEventListener(btn, 'click', () => {
        this.switchPrecision(btn.dataset.precision);
      });
    });

    // 生成按钮
    const generateBtn = this.container.querySelector('#btn-generate');
    if (generateBtn) {
      this.addEventListener(generateBtn, 'click', () => {
        this.handleGenerate();
      });
    }
  }

  selectScene(sceneId) {
    this.currentScene = sceneId;
    this.container.querySelectorAll('.scene-tag').forEach(tag => {
      tag.classList.toggle('active', tag.dataset.scene === sceneId);
    });
  }

  selectWish(wishId) {
    this.container.querySelectorAll('.wish-tag').forEach(tag => {
      tag.classList.toggle('active', tag.dataset.wish === wishId);
    });
    this.setState(StateKeys.CURRENT_WISH_ID, wishId);
  }

  switchPrecision(precision) {
    this.currentPrecision = precision;
    this.container.querySelectorAll('.precision-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.precision === precision);
    });
    
    const preciseFields = this.container.querySelector('.precise-fields');
    if (preciseFields) {
      preciseFields.classList.toggle('hidden', precision !== 'precise');
    }
  }

  handleGenerate() {
    // TODO: 实现生成逻辑
    navigateTo('/results');
  }

  restoreLastSelection() {
    // 恢复场景
    const lastScene = baziRepo.get()?.scene || 'daily';
    this.selectScene(lastScene);
  }
}
