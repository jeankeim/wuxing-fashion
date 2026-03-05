/**
 * Entry Controller - 输入页控制器
 */

import { BaseController } from './base.js';
import { navigateTo } from '../core/router.js';
import { showToast } from '../utils/render.js';
import { statsRepo } from '../data/repository.js';
import { StateKeys } from '../core/store.js';
import { SimpleWeatherWidget } from '../components/simple-weather-widget.js';
import { generateRecommendation } from '../services/engine.js';
import { analyzeBazi } from '../services/bazi.js';

export class EntryController extends BaseController {
  constructor() {
    super();
    this.containerId = 'view-entry';
    this.currentScene = 'daily';
    this.currentPrecision = 'simple';
    this.weatherWidget = null;
  }

  onMount() {
    // 动态获取容器（视图是动态加载的）
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error('[EntryController] Container not found');
      return;
    }
    
    // 绑定事件
    this.bindEvents();
    
    // 初始化天气组件
    this.initWeatherWidget();
  }

  onUnmount() {
    // 清理天气组件
    if (this.weatherWidget) {
      this.weatherWidget.unmount();
      this.weatherWidget = null;
    }
    this.eventsBound = false;
  }

  initWeatherWidget() {
    const container = document.getElementById('weather-widget-container');
    if (container) {
      this.weatherWidget = new SimpleWeatherWidget(container);
      this.weatherWidget.mount();
    }
  }

  bindEvents() {
    // 避免重复绑定
    if (this.eventsBound) return;
    this.eventsBound = true;
    
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

  async handleGenerate() {
    // 从 State 获取八字数据（用户在画像页输入的）
    const baziData = this.getState(StateKeys.BAZI_DATA);
    let baziResult = null;
    
    if (baziData && baziData.year && baziData.month && baziData.day && baziData.hour !== undefined) {
      // 用户填写了八字，计算分析结果
      baziResult = analyzeBazi(
        baziData.year,
        baziData.month,
        baziData.day,
        baziData.hour
      );
    }
    
    // 保存八字分析结果（有则保存，无则为 null）
    this.setState(StateKeys.CURRENT_BAZI_RESULT, baziResult);
    
    // 生成推荐
    try {
      const result = await generateRecommendation(
        this.getState(StateKeys.CURRENT_TERM_INFO),
        this.getState(StateKeys.CURRENT_WISH_ID),
        baziResult,
        { sceneId: this.currentScene }
      );
      
      if (result && result.schemes && result.schemes.length > 0) {
        // 保存结果
        this.setState(StateKeys.CURRENT_RESULT, result);
        
        // 更新统计
        statsRepo.increment('generates');
        
        // 导航到加载页（再自动跳转到结果页）
        navigateTo('/loading');
      } else {
        showToast('生成失败，请重试');
      }
    } catch (error) {
      showToast('生成失败，请重试');
    }
  }

}
