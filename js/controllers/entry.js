/**
 * Entry Controller - 输入页控制器
 */

import { BaseController } from './base.js';
import { navigateTo } from '../core/router.js';
import { initYearSelect, initDaySelect, renderResultHeader, renderSchemeCards, showToast } from '../utils/render.js';
import { baziRepo, statsRepo } from '../data/repository.js';
import { StateKeys } from '../core/store.js';
import { WeatherWidget } from '../components/weather-widget.js';
import { generateRecommendation } from '../services/engine.js';
import { analyzeBazi, analyzeBaziPrecise } from '../services/bazi.js';

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
    
    // 初始化表单
    initYearSelect();
    initDaySelect();
    
    // 恢复上次选择
    this.restoreLastSelection();
    
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
      this.weatherWidget = new WeatherWidget(container);
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

  async handleGenerate() {
    // 获取八字数据
    const baziForm = this.getBaziFormData();
    let baziResult = null;
    
    if (baziForm) {
      // 保存八字
      baziRepo.save(baziForm);
      
      // 根据精度模式计算八字
      if (baziForm.precision === 'precise') {
        const realHour = baziForm.hour * 2;
        baziResult = analyzeBaziPrecise(
          baziForm.year,
          baziForm.month,
          baziForm.day,
          realHour,
          baziForm.minute,
          baziForm.timezone
        );
      } else {
        baziResult = analyzeBazi(
          baziForm.year,
          baziForm.month,
          baziForm.day,
          baziForm.hour
        );
      }
      
      this.setState(StateKeys.CURRENT_BAZI_RESULT, baziResult);
    } else {
      this.setState(StateKeys.CURRENT_BAZI_RESULT, null);
    }
    
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
        
        // 导航到结果页
        navigateTo('/results');
      } else {
        showToast('生成失败，请重试');
      }
    } catch (error) {
      showToast('生成失败，请重试');
    }
  }

  /**
   * 获取八字表单数据
   */
  getBaziFormData() {
    const year = this.container.querySelector('#bazi-year')?.value;
    const month = this.container.querySelector('#bazi-month')?.value;
    const day = this.container.querySelector('#bazi-day')?.value;
    const hour = this.container.querySelector('#bazi-hour')?.value;
    
    if (year && month && day && hour !== '') {
      const data = {
        year: parseInt(year, 10),
        month: parseInt(month, 10),
        day: parseInt(day, 10),
        hour: parseInt(hour, 10),
        precision: this.currentPrecision
      };
      
      // 精确模式额外数据
      if (data.precision === 'precise') {
        const minute = this.container.querySelector('#bazi-minute')?.value || '0';
        const timezone = this.container.querySelector('#bazi-timezone')?.value || '8';
        data.minute = parseInt(minute, 10);
        data.timezone = parseInt(timezone, 10);
      }
      
      return data;
    }
    
    return null;
  }

  /**
   * 恢复上次选择
   */
  restoreLastSelection() {
    const lastBazi = baziRepo.get();
    if (lastBazi) {
      const yearSelect = this.container.querySelector('#bazi-year');
      const monthSelect = this.container.querySelector('#bazi-month');
      const daySelect = this.container.querySelector('#bazi-day');
      const hourSelect = this.container.querySelector('#bazi-hour');
      
      if (yearSelect) yearSelect.value = lastBazi.year || '';
      if (monthSelect) monthSelect.value = lastBazi.month || '';
      if (daySelect) daySelect.value = lastBazi.day || '';
      if (hourSelect) hourSelect.value = lastBazi.hour !== undefined ? lastBazi.hour : '';
    }
  }
}
