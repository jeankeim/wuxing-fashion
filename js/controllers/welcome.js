/**
 * Welcome Controller - 欢迎页控制器
 */

import { BaseController } from './base.js';
import { navigateTo } from '../core/router.js';
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
    
    // 检查是否首次访问，显示仪式感加载
    this.showRitualLoading();
    
    // 更新画像按钮样式
    this.updateProfileButton();
    
    // 绑定事件
    this.bindEvents();
    
    // 渲染品牌节气卡片
    const termInfo = this.getState(StateKeys.CURRENT_TERM_INFO);
    if (termInfo) {
      this.renderBrandSolarCard(termInfo);
    }
  }
  
  /**
   * 更新画像按钮样式
   * 未填写：呼吸淡色 | 已填写：对应五行颜色
   */
  updateProfileButton() {
    const profileBtn = document.getElementById('btn-profile');
    if (!profileBtn) return;
    
    const bazi = this.getState(StateKeys.BAZI_DATA);
    const hasBazi = bazi && bazi.year && bazi.month && bazi.day;
    
    if (hasBazi) {
      // 已填写，根据日主五行设置颜色
      const dayGan = bazi.day?.gan; // 日干
      const wuxing = this.getGanWuxing(dayGan);
      profileBtn.classList.remove('empty');
      profileBtn.classList.add(`filled-${wuxing}`);
      // 更新图标为五行符号
      const icons = { wood: '🌲', fire: '🔥', earth: '🏔️', metal: '⚜️', water: '💧' };
      const iconEl = profileBtn.querySelector('.profile-icon');
      if (iconEl) iconEl.textContent = icons[wuxing] || '👤';
    } else {
      // 未填写，呼吸淡色
      profileBtn.classList.add('empty');
    }
  }
  
  /**
   * 获取天干对应五行
   */
  getGanWuxing(gan) {
    const map = {
      '甲': 'wood', '乙': 'wood',
      '丙': 'fire', '丁': 'fire',
      '戊': 'earth', '己': 'earth',
      '庚': 'metal', '辛': 'metal',
      '壬': 'water', '癸': 'water'
    };
    return map[gan] || 'earth';
  }
  
  /**
   * 显示仪式感加载（首次访问）
   */
  showRitualLoading() {
    const hasVisited = localStorage.getItem('wuxing_visited');
    const loadingEl = document.getElementById('welcome-loading');
    
    if (!hasVisited && loadingEl) {
      // 首次访问，显示加载动画
      loadingEl.classList.remove('hidden');
      
      setTimeout(() => {
        loadingEl.classList.add('hidden');
        localStorage.setItem('wuxing_visited', 'true');
      }, 1500); // 1.5秒仪式感
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
    
    // 我的画像按钮（右上角）
    const profileBtn = this.container?.querySelector('#btn-profile');
    if (profileBtn) {
      this.addEventListener(profileBtn, 'click', () => {
        this.handleProfileClick();
      });
    }
  }
  
  /**
   * 处理画像按钮点击
   * 已输入八字：跳转到 profile
   * 未输入八字：显示传统风格提示
   */
  handleProfileClick() {
    const bazi = this.getState(StateKeys.BAZI_DATA);
    const hasBazi = bazi && bazi.year && bazi.month && bazi.day;
    
    if (hasBazi) {
      // 已输入八字，跳转到画像页
      navigateTo('/profile');
    } else {
      // 未输入八字，显示传统风格提示
      this.showWuxingToast();
    }
  }
  
  /**
   * 显示五行风格提示弹窗
   */
  showWuxingToast() {
    // 创建遮罩
    const overlay = document.createElement('div');
    overlay.className = 'wuxing-toast-overlay';
    
    // 创建弹窗
    const toast = document.createElement('div');
    toast.className = 'wuxing-toast';
    toast.innerHTML = `
      <div class="wuxing-toast-title">✨ 完善画像</div>
      <div class="wuxing-toast-desc">
        完善生辰八字后<br>
        推荐精准度可提升 <strong>30%</strong><br>
        <small>五行相生，衣运相通</small>
      </div>
      <div class="wuxing-toast-actions">
        <button class="wuxing-toast-btn primary" id="toast-confirm">立即填写</button>
        <button class="wuxing-toast-btn secondary" id="toast-cancel">先体验</button>
      </div>
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(toast);
    
    // 绑定按钮事件
    toast.querySelector('#toast-confirm').addEventListener('click', () => {
      document.body.removeChild(overlay);
      document.body.removeChild(toast);
      navigateTo('/profile');
    });
    
    toast.querySelector('#toast-cancel').addEventListener('click', () => {
      document.body.removeChild(overlay);
      document.body.removeChild(toast);
      // 留在当前页，用户可以继续点击"开始今日穿搭"
    });
    
    // 点击遮罩关闭
    overlay.addEventListener('click', () => {
      document.body.removeChild(overlay);
      document.body.removeChild(toast);
    });
  }

  onUnmount() {
    this.eventsBound = false;
  }
}
