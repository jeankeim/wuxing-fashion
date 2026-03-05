/**
 * Profile Controller - 画像页控制器（合并收藏/日记）
 */

import { BaseController } from './base.js';
import { goBack, navigateTo } from '../core/router.js';
import { renderProfileView, renderFavoritesList } from '../utils/render.js';
import { favoritesRepo } from '../data/repository.js';
import { StateKeys } from '../core/store.js';

export class ProfileController extends BaseController {
  constructor() {
    super();
    this.containerId = 'view-profile';
    this.currentTab = 'profile';
    this.tabs = ['profile', 'favorites', 'diary'];
  }

  onMount() {
    // 动态获取容器（视图是动态加载的）
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error('[ProfileController] Container not found');
      return;
    }
    
    // 初始化当前 Tab
    this.currentTab = 'profile';
    this.switchTab('profile');
    
    // 绑定事件
    this.bindEvents();
    
    // 渲染画像
    renderProfileView();
    
    // 渲染五行雷达图和偏好条形图
    this.renderWuxingRadar();
    this.renderPreferenceBars();
    
    // 初始化八字输入
    this.initBaziInput();
    
    // 渲染收藏
    this.renderFavorites();
    
    // 初始化日记
    this.initDiary();
  }
  
  /**
   * 渲染五行雷达图
   */
  renderWuxingRadar() {
    const canvas = this.container.querySelector('#wuxing-radar-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const prefs = JSON.parse(localStorage.getItem('wuxing_preferences') || '{}');
    const wuxingScores = prefs.wuxingScores || { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
    
    // 更新图例数值
    Object.entries(wuxingScores).forEach(([wuxing, score]) => {
      const el = this.container.querySelector(`#${wuxing}-value`);
      if (el) el.textContent = score;
    });
    
    // 绘制雷达图
    this.drawWuxingRadar(ctx, canvas.width, canvas.height, wuxingScores);
  }
  
  /**
   * 绘制五行雷达图
   */
  drawWuxingRadar(ctx, width, height, scores) {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 40;
    
    // 五行配置（按顺时针：木→火→土→金→水）
    const wuxingConfig = [
      { key: 'wood', name: '木', color: '#7cb342', angle: -Math.PI / 2 },
      { key: 'fire', name: '火', color: '#ff7043', angle: -Math.PI / 2 + (Math.PI * 2 / 5) },
      { key: 'earth', name: '土', color: '#d4a574', angle: -Math.PI / 2 + (Math.PI * 4 / 5) },
      { key: 'metal', name: '金', color: '#9e9e9e', angle: -Math.PI / 2 + (Math.PI * 6 / 5) },
      { key: 'water', name: '水', color: '#42a5f5', angle: -Math.PI / 2 + (Math.PI * 8 / 5) }
    ];
    
    // 清空画布
    ctx.clearRect(0, 0, width, height);
    
    // 绘制背景网格（五层）
    for (let i = 1; i <= 5; i++) {
      ctx.beginPath();
      ctx.strokeStyle = i === 5 ? '#c9b8a0' : '#e8e0d0';
      ctx.lineWidth = i === 5 ? 2 : 1;
      
      wuxingConfig.forEach((config, index) => {
        const r = (radius / 5) * i;
        const x = centerX + Math.cos(config.angle) * r;
        const y = centerY + Math.sin(config.angle) * r;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.closePath();
      ctx.stroke();
    }
    
    // 绘制轴线
    wuxingConfig.forEach(config => {
      ctx.beginPath();
      ctx.strokeStyle = '#d0c8b8';
      ctx.lineWidth = 1;
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(config.angle) * radius,
        centerY + Math.sin(config.angle) * radius
      );
      ctx.stroke();
      
      // 绘制标签
      const labelX = centerX + Math.cos(config.angle) * (radius + 25);
      const labelY = centerY + Math.sin(config.angle) * (radius + 25);
      ctx.fillStyle = config.color;
      ctx.font = 'bold 14px "Noto Serif SC", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(config.name, labelX, labelY);
    });
    
    // 计算最大值用于归一化
    const maxScore = Math.max(...Object.values(scores), 1);
    
    // 绘制数据区域
    ctx.beginPath();
    wuxingConfig.forEach((config, index) => {
      const score = scores[config.key] || 0;
      const normalizedScore = Math.max(0, score / maxScore);
      const r = radius * normalizedScore;
      const x = centerX + Math.cos(config.angle) * r;
      const y = centerY + Math.sin(config.angle) * r;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
    
    // 填充渐变
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, 'rgba(139, 119, 101, 0.2)');
    gradient.addColorStop(1, 'rgba(139, 119, 101, 0.05)');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // 绘制边框
    ctx.strokeStyle = '#8b7765';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 绘制数据点
    wuxingConfig.forEach(config => {
      const score = scores[config.key] || 0;
      const normalizedScore = Math.max(0, score / maxScore);
      const r = radius * normalizedScore;
      const x = centerX + Math.cos(config.angle) * r;
      const y = centerY + Math.sin(config.angle) * r;
      
      ctx.beginPath();
      ctx.fillStyle = config.color;
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.stroke();
    });
  }
  
  /**
   * 渲染偏好条形图
   */
  renderPreferenceBars() {
    const prefs = JSON.parse(localStorage.getItem('wuxing_preferences') || '{}');
    
    // 渲染颜色偏好
    const colorContainer = this.container.querySelector('#color-bars-container');
    if (colorContainer && prefs.colorScores) {
      const colors = Object.entries(prefs.colorScores)
        .filter(([_, score]) => score !== 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      if (colors.length > 0) {
        colorContainer.innerHTML = colors.map(([color, score]) => {
          const maxScore = Math.max(...Object.values(prefs.colorScores));
          const percentage = (score / maxScore) * 100;
          const wuxing = this.inferWuxingFromColor(color);
          return `
            <div class="preference-bar-item">
              <span class="bar-label">${color}</span>
              <div class="bar-track">
                <div class="bar-fill ${wuxing}" style="width: ${percentage}%"></div>
              </div>
              <span class="bar-value">${score}</span>
            </div>
          `;
        }).join('');
      }
    }
    
    // 渲染材质偏好
    const materialContainer = this.container.querySelector('#material-bars-container');
    if (materialContainer && prefs.materialScores) {
      const materials = Object.entries(prefs.materialScores)
        .filter(([_, score]) => score !== 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      if (materials.length > 0) {
        materialContainer.innerHTML = materials.map(([material, score]) => {
          const maxScore = Math.max(...Object.values(prefs.materialScores));
          const percentage = (score / maxScore) * 100;
          const wuxing = this.inferWuxingFromMaterial(material);
          return `
            <div class="preference-bar-item">
              <span class="bar-label">${material}</span>
              <div class="bar-track">
                <div class="bar-fill ${wuxing}" style="width: ${percentage}%"></div>
              </div>
              <span class="bar-value">${score}</span>
            </div>
          `;
        }).join('');
      }
    }
  }
  
  /**
   * 从颜色推断五行
   */
  inferWuxingFromColor(color) {
    const colorMap = {
      '青': 'wood', '绿': 'wood', '翠': 'wood',
      '红': 'fire', '赤': 'fire', '朱': 'fire', '紫': 'fire',
      '黄': 'earth', '棕': 'earth', '褐': 'earth', '咖': 'earth',
      '白': 'metal', '银': 'metal', '灰': 'metal', '金': 'metal',
      '黑': 'water', '蓝': 'water', '玄': 'water', '青': 'water'
    };
    
    for (const [key, wuxing] of Object.entries(colorMap)) {
      if (color.includes(key)) return wuxing;
    }
    return 'earth';
  }
  
  /**
   * 从材质推断五行
   */
  inferWuxingFromMaterial(material) {
    const materialMap = {
      '棉': 'wood', '麻': 'wood', '丝': 'wood',
      '绒': 'fire', '绸': 'fire', '缎': 'fire',
      '毛': 'earth', '呢': 'earth', '皮': 'earth',
      '金': 'metal', '银': 'metal', '锦': 'metal',
      '纱': 'water', '雪纺': 'water', '蕾丝': 'water'
    };
    
    for (const [key, wuxing] of Object.entries(materialMap)) {
      if (material.includes(key)) return wuxing;
    }
    return 'earth';
  }
  
  /**
   * 初始化八字输入
   */
  initBaziInput() {
    // 填充年份选项（1900-2025）
    const yearSelect = this.container.querySelector('#profile-bazi-year');
    if (yearSelect) {
      for (let year = 2025; year >= 1900; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year + '年';
        yearSelect.appendChild(option);
      }
    }
    
    // 填充日期选项（动态根据月份）
    const monthSelect = this.container.querySelector('#profile-bazi-month');
    const daySelect = this.container.querySelector('#profile-bazi-day');
    
    if (monthSelect && daySelect) {
      const updateDays = () => {
        const year = parseInt(yearSelect?.value) || 2024;
        const month = parseInt(monthSelect.value) || 1;
        const daysInMonth = new Date(year, month, 0).getDate();
        
        daySelect.innerHTML = '<option value="">日</option>';
        for (let day = 1; day <= daysInMonth; day++) {
          const option = document.createElement('option');
          option.value = day;
          option.textContent = day + '日';
          daySelect.appendChild(option);
        }
      };
      
      monthSelect.addEventListener('change', updateDays);
      if (yearSelect) yearSelect.addEventListener('change', updateDays);
    }
    
    // 加载已保存的八字
    this.loadSavedBazi();
    
    // 保存按钮事件
    const saveBtn = this.container.querySelector('#btn-save-bazi');
    if (saveBtn) {
      this.addEventListener(saveBtn, 'click', () => {
        this.saveBazi();
      });
    }
  }
  
  /**
   * 加载已保存的八字
   */
  loadSavedBazi() {
    const bazi = this.getState(StateKeys.BAZI_DATA);
    if (bazi && bazi.year) {
      const yearSelect = this.container.querySelector('#profile-bazi-year');
      const monthSelect = this.container.querySelector('#profile-bazi-month');
      const daySelect = this.container.querySelector('#profile-bazi-day');
      const hourSelect = this.container.querySelector('#profile-bazi-hour');
      
      if (yearSelect) yearSelect.value = bazi.year;
      if (monthSelect) monthSelect.value = bazi.month;
      if (daySelect) {
        // 先更新日期选项
        const daysInMonth = new Date(bazi.year, bazi.month, 0).getDate();
        daySelect.innerHTML = '<option value="">日</option>';
        for (let day = 1; day <= daysInMonth; day++) {
          const option = document.createElement('option');
          option.value = day;
          option.textContent = day + '日';
          daySelect.appendChild(option);
        }
        daySelect.value = bazi.day;
      }
      if (hourSelect) hourSelect.value = bazi.hour;
      
      // 更新状态显示
      this.updateBaziStatus(true);
      // 显示分析结果
      this.renderBaziAnalysis(bazi);
    }
  }
  
  /**
   * 保存八字
   */
  saveBazi() {
    const year = this.container.querySelector('#profile-bazi-year')?.value;
    const month = this.container.querySelector('#profile-bazi-month')?.value;
    const day = this.container.querySelector('#profile-bazi-day')?.value;
    const hour = this.container.querySelector('#profile-bazi-hour')?.value;
    
    if (!year || !month || !day || !hour) {
      this.showToast('请填写完整的八字信息');
      return;
    }
    
    const baziData = {
      year: parseInt(year),
      month: parseInt(month),
      day: parseInt(day),
      hour: parseInt(hour)
    };
    
    // 保存到 state
    this.setState(StateKeys.BAZI_DATA, baziData);
    
    // 标记需要重新计算推荐
    this.setState('BAZI_JUST_UPDATED', true);
    
    // 更新 UI
    this.updateBaziStatus(true);
    this.renderBaziAnalysis(baziData);
    
    this.showToast('八字信息已保存');
  }
  
  /**
   * 更新八字状态显示
   */
  updateBaziStatus(hasBazi) {
    const statusEl = this.container.querySelector('#bazi-status');
    if (statusEl) {
      statusEl.textContent = hasBazi ? '已填写' : '未填写';
      statusEl.classList.toggle('filled', hasBazi);
    }
  }
  
  /**
   * 渲染八字分析结果
   */
  renderBaziAnalysis(baziData) {
    const resultEl = this.container.querySelector('#bazi-analysis-result');
    if (!resultEl) return;
    
    // 简单的八字分析展示
    const ganZhi = this.calculateGanZhi(baziData);
    
    resultEl.innerHTML = `
      <div class="bazi-pillars">
        <div class="pillar">
          <span class="pillar-label">年柱</span>
          <span class="pillar-gan">${ganZhi.yearGan}</span>
          <span class="pillar-zhi">${ganZhi.yearZhi}</span>
        </div>
        <div class="pillar">
          <span class="pillar-label">月柱</span>
          <span class="pillar-gan">${ganZhi.monthGan}</span>
          <span class="pillar-zhi">${ganZhi.monthZhi}</span>
        </div>
        <div class="pillar">
          <span class="pillar-label">日柱</span>
          <span class="pillar-gan">${ganZhi.dayGan}</span>
          <span class="pillar-zhi">${ganZhi.dayZhi}</span>
        </div>
        <div class="pillar">
          <span class="pillar-label">时柱</span>
          <span class="pillar-gan">${ganZhi.hourGan}</span>
          <span class="pillar-zhi">${ganZhi.hourZhi}</span>
        </div>
      </div>
    `;
    
    resultEl.classList.remove('hidden');
  }
  
  /**
   * 计算干支（简化版）
   */
  calculateGanZhi(bazi) {
    const gan = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const zhi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    
    // 简化计算，实际应使用 lunar.js
    const yearGan = gan[(bazi.year - 4) % 10];
    const yearZhi = zhi[(bazi.year - 4) % 12];
    
    // 这里简化处理，实际需要更复杂的计算
    return {
      yearGan, yearZhi,
      monthGan: gan[bazi.month % 10],
      monthZhi: zhi[(bazi.month + 2) % 12],
      dayGan: gan[bazi.day % 10],
      dayZhi: zhi[bazi.day % 12],
      hourGan: gan[bazi.hour % 10],
      hourZhi: zhi[bazi.hour % 12]
    };
  }
  
  /**
   * 切换 Tab
   */
  switchTab(tabName) {
    if (!this.tabs.includes(tabName)) return;
    
    this.currentTab = tabName;
    const tabIndex = this.tabs.indexOf(tabName);
    
    // 更新 Tab 按钮状态
    this.container.querySelectorAll('.profile-tab').forEach((tab, index) => {
      tab.classList.toggle('active', index === tabIndex);
    });
    
    // 滑动内容区
    const slider = this.container.querySelector('#profile-slider');
    if (slider) {
      slider.style.transform = `translateX(-${tabIndex * 100}%)`;
    }
    
    // 更新面板激活状态
    this.container.querySelectorAll('.profile-panel').forEach((panel, index) => {
      panel.classList.toggle('active', index === tabIndex);
    });
  }
  
  /**
   * 渲染收藏列表
   */
  renderFavorites() {
    const listEl = this.container.querySelector('#favorites-list');
    const emptyEl = this.container.querySelector('#favorites-empty');
    if (!listEl) return;
    
    const favorites = favoritesRepo.getAll();
    
    if (favorites.length === 0) {
      listEl.innerHTML = '';
      emptyEl?.classList.remove('hidden');
    } else {
      emptyEl?.classList.add('hidden');
      renderFavoritesList(favorites, listEl);
    }
  }
  
  /**
   * 初始化日记功能
   */
  initDiary() {
    // 日记视图切换
    const viewBtns = this.container.querySelectorAll('.diary-view-btn');
    viewBtns.forEach(btn => {
      this.addEventListener(btn, 'click', () => {
        const view = btn.dataset.view;
        this.switchDiaryView(view);
      });
    });
    
    // 添加日记按钮
    const addBtn = this.container.querySelector('#btn-add-diary');
    if (addBtn) {
      this.addEventListener(addBtn, 'click', () => {
        this.openDiaryEditor();
      });
    }
    
    // 关闭日记弹窗
    const closeBtn = this.container.querySelector('#btn-close-diary-modal');
    if (closeBtn) {
      this.addEventListener(closeBtn, 'click', () => {
        this.closeDiaryEditor();
      });
    }
    
    // 取消按钮
    const cancelBtn = this.container.querySelector('#btn-cancel-diary');
    if (cancelBtn) {
      this.addEventListener(cancelBtn, 'click', () => {
        this.closeDiaryEditor();
      });
    }
    
    // 表单提交
    const form = this.container.querySelector('#diary-form');
    if (form) {
      this.addEventListener(form, 'submit', (e) => {
        e.preventDefault();
        this.saveDiary();
      });
    }
    
    // 心情选择
    const moodBtns = this.container.querySelectorAll('.mood-btn');
    moodBtns.forEach(btn => {
      this.addEventListener(btn, 'click', () => {
        moodBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
    
    // 初始化日历
    this.initCalendar();
  }
  
  switchDiaryView(view) {
    const calendarView = this.container.querySelector('#diary-calendar-view');
    const timelineView = this.container.querySelector('#diary-timeline-view');
    
    this.container.querySelectorAll('.diary-view-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    if (view === 'calendar') {
      calendarView?.classList.remove('hidden');
      timelineView?.classList.add('hidden');
    } else {
      calendarView?.classList.add('hidden');
      timelineView?.classList.remove('hidden');
    }
  }
  
  initCalendar() {
    const prevBtn = this.container.querySelector('#btn-prev-month');
    const nextBtn = this.container.querySelector('#btn-next-month');
    
    if (prevBtn) {
      this.addEventListener(prevBtn, 'click', () => {
        this.showToast('上月功能开发中...');
      });
    }
    
    if (nextBtn) {
      this.addEventListener(nextBtn, 'click', () => {
        this.showToast('下月功能开发中...');
      });
    }
  }
  
  openDiaryEditor() {
    const modal = this.container.querySelector('#modal-diary-editor');
    if (modal) {
      modal.classList.remove('hidden');
      // 设置今天日期
      const dateInput = this.container.querySelector('#diary-date');
      if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
      }
    }
  }
  
  closeDiaryEditor() {
    const modal = this.container.querySelector('#modal-diary-editor');
    if (modal) {
      modal.classList.add('hidden');
    }
    // 重置表单
    const form = this.container.querySelector('#diary-form');
    if (form) form.reset();
    // 重置心情选择
    this.container.querySelectorAll('.mood-btn').forEach(btn => {
      btn.classList.remove('active');
    });
  }
  
  saveDiary() {
    this.showToast('日记保存成功');
    this.closeDiaryEditor();
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
    
    // Tab 切换
    this.container.querySelectorAll('.profile-tab').forEach(tab => {
      this.addEventListener(tab, 'click', () => {
        const tabName = tab.dataset.tab;
        this.switchTab(tabName);
      });
    });
    
    // 滑动手势
    this.initSwipeGesture();

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
  
  /**
   * 初始化滑动手势
   */
  initSwipeGesture() {
    const container = this.container.querySelector('#profile-swipe-container');
    if (!container) return;
    
    let startX = 0;
    let startY = 0;
    let isHorizontalSwipe = false;
    
    container.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isHorizontalSwipe = false;
    }, { passive: true });
    
    container.addEventListener('touchmove', (e) => {
      if (!startX || !startY) return;
      
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      const diffX = startX - x;
      const diffY = startY - y;
      
      // 判断是否为水平滑动
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
        isHorizontalSwipe = true;
      }
    }, { passive: true });
    
    container.addEventListener('touchend', (e) => {
      if (!isHorizontalSwipe) return;
      
      const endX = e.changedTouches[0].clientX;
      const diffX = startX - endX;
      const threshold = 50;
      
      if (Math.abs(diffX) > threshold) {
        const currentIndex = this.tabs.indexOf(this.currentTab);
        
        if (diffX > 0 && currentIndex < this.tabs.length - 1) {
          // 左滑 - 下一个 Tab
          this.switchTab(this.tabs[currentIndex + 1]);
        } else if (diffX < 0 && currentIndex > 0) {
          // 右滑 - 上一个 Tab
          this.switchTab(this.tabs[currentIndex - 1]);
        }
      }
      
      startX = 0;
      startY = 0;
      isHorizontalSwipe = false;
    }, { passive: true });
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
