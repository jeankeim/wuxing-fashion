/**
 * Welcome Controller - 欢迎页控制器
 */

import { BaseController } from './base.js';
import { navigateTo } from '../core/router.js';
import { renderSolarBanner } from '../utils/render.js';
import { StateKeys } from '../core/store.js';

/**
 * 欢迎页控制器
 */
export class WelcomeController extends BaseController {
  constructor() {
    super();
    this.containerId = 'view-welcome';
  }

  onMount() {
    // 动态获取容器（视图是动态加载的）
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error('[WelcomeController] Container not found');
      return;
    }
    
    // 绑定事件
    this.bindEvents();
    
    // 渲染品牌节气卡片
    const termInfo = this.getState(StateKeys.CURRENT_TERM_INFO);
    if (termInfo) {
      this.renderBrandSolarCard(termInfo);
    }
  }

  renderBrandSolarCard(termInfo) {
    if (!termInfo?.current) return;
    
    const current = termInfo.current;
    const termOrder = this.getTermOrder(current.id);
    
    // 更新节气图标
    const iconEl = document.getElementById('solar-icon');
    if (iconEl) {
      iconEl.textContent = current.icon || this.getDefaultIcon(current.id);
    }
    
    // 更新节气名称
    const nameEl = document.getElementById('solar-term-name');
    if (nameEl) {
      nameEl.textContent = current.name;
    }
    
    // 更新节气描述
    const descEl = document.getElementById('solar-term-desc');
    if (descEl) {
      descEl.textContent = `第 ${termOrder} 个节气 · ${current.wuxingName}气${this.getWuxingAction(current.wuxing)}`;
    }
    
    // 更新五行标签
    const wuxingTag = document.querySelector('.wuxing-tag');
    if (wuxingTag) {
      wuxingTag.textContent = current.wuxingName;
    }
    
    // 更新宜穿颜色
    const wuxingHint = document.querySelector('.wuxing-hint');
    if (wuxingHint) {
      wuxingHint.textContent = `宜${this.getWuxingColor(current.wuxing)}`;
    }
    
    // 更新五行标签颜色
    const termWuxing = document.getElementById('solar-wuxing');
    if (termWuxing && current.wuxing) {
      const wuxingColors = {
        wood: { bg: 'var(--color-wood-bg)', color: 'var(--color-wood)' },
        fire: { bg: 'var(--color-fire-bg)', color: 'var(--color-fire)' },
        earth: { bg: 'var(--color-earth-bg)', color: 'var(--color-earth)' },
        metal: { bg: 'var(--color-metal-bg)', color: 'var(--color-metal)' },
        water: { bg: 'var(--color-water-bg)', color: 'var(--color-water)' }
      };
      const colors = wuxingColors[current.wuxing];
      if (colors) {
        termWuxing.style.background = colors.bg;
        termWuxing.style.color = colors.color;
      }
    }
  }
  
  getTermOrder(termId) {
    const order = {
      lichun: 1, yushui: 2, jingzhe: 3, chunfen: 4, qingming: 5, guyu: 6,
      lixia: 7, xiaoman: 8, mangzhong: 9, xiazhi: 10, xiaoshu: 11, dashu: 12,
      liqiu: 13, chushu: 14, bailu: 15, qiufen: 16, hanlu: 17, shuangjiang: 18,
      lidong: 19, xiaoxue: 20, daxue: 21, dongzhi: 22, xiaohan: 23, dahan: 24
    };
    return order[termId] || 1;
  }
  
  getDefaultIcon(termId) {
    const icons = {
      lichun: '🌱', yushui: '🌧️', jingzhe: '⚡', chunfen: '🌸', qingming: '🌿', guyu: '🌾',
      lixia: '🌺', xiaoman: '🌾', mangzhong: '🌾', xiazhi: '☀️', xiaoshu: '🌞', dashu: '🔥',
      liqiu: '🍂', chushu: '🌾', bailu: '💧', qiufen: '🌗', hanlu: '❄️', shuangjiang: '🧊',
      lidong: '❄️', xiaoxue: '❄️', daxue: '☃️', dongzhi: '🌨️', xiaohan: '🧣', dahan: '🧤'
    };
    return icons[termId] || '🌿';
  }
  
  getWuxingAction(wuxing) {
    const actions = {
      wood: '生发',
      fire: '旺盛',
      earth: '中和',
      metal: '肃杀',
      water: '润下'
    };
    return actions[wuxing] || '当令';
  }
  
  getWuxingColor(wuxing) {
    const colors = {
      wood: '青绿',
      fire: '红紫',
      earth: '黄棕',
      metal: '白灰',
      water: '黑蓝'
    };
    return colors[wuxing] || '适宜';
  }

  bindEvents() {
    // 避免重复绑定
    if (this.eventsBound) return;
    this.eventsBound = true;
    
    // 开始按钮
    const startBtn = this.container?.querySelector('#btn-start');
    if (startBtn) {
      this.addEventListener(startBtn, 'click', () => {
        navigateTo('/entry');
      });
    }
  }

  onUnmount() {
    this.eventsBound = false;
  }
}
