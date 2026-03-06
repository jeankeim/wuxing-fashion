/**
 * Profile Controller - 画像页控制器（合并收藏/日记）
 */

import { BaseController } from './base.js';
import { goBack, navigateTo } from '../core/router.js';
import { renderProfileView, renderDetailModal, showModal, closeModal } from '../utils/render.js';
import { StateKeys } from '../core/store.js';
import { inferWuxingFromColor, inferWuxingFromMaterial } from '../utils/wuxing.js';
import {
  getCalendarData,
  getTimelineData,
  getDiaryStats,
  getMonthlyStats,
  getStreakDays,
  getDiaryByDate,
  saveDiaryRecord,
  deleteDiaryRecord,
  MOODS
} from '../utils/diary.js';
import { analyzeBaziPrecise } from '../services/bazi.js';
import { clearAllData, renderDataManagerPanel } from '../data/data-manager.js';

export class ProfileController extends BaseController {
  constructor() {
    super();
    this.containerId = 'view-profile';
    this.currentTab = 'profile';
    this.tabs = ['profile', 'diary', 'coming-soon'];
  }

  onMount() {
    // 动态获取容器（视图是动态加载的）
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error('[ProfileController] Container not found');
      return;
    }
    
    // 初始化当前 Tab（检查是否有自动切换标志）
    const autoSwitchTab = sessionStorage.getItem('profile_auto_switch_tab');
    if (autoSwitchTab && this.tabs.includes(autoSwitchTab)) {
      this.currentTab = autoSwitchTab;
      sessionStorage.removeItem('profile_auto_switch_tab');
    } else {
      this.currentTab = 'profile';
    }
    this.switchTab(this.currentTab);
    
    // 绑定事件
    this.bindEvents();
    
    // 渲染画像
    renderProfileView();
    
    // 渲染五行雷达图和偏好条形图
    this.renderWuxingRadar();
    this.renderPreferenceBars();
    
    // 初始化八字输入
    this.initBaziInput();
    
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
    
    // 获取八字五行数据（如果有）
    const baziData = this.getState(StateKeys.BAZI_DATA);
    const baziWuxing = baziData?.wuxingProfile || null;
    
    console.log('[Profile] Bazi Wuxing:', baziWuxing);
    console.log('[Profile] Has Bazi?', !!baziWuxing);
    
    // 获取穿搭偏好五行数据
    const prefs = JSON.parse(localStorage.getItem('wuxing_preferences') || '{}');
    const fashionWuxing = prefs.wuxingScores || { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
    
    console.log('[Profile] Fashion Wuxing:', fashionWuxing);
    
    // 合并两种五行数据
    let combinedWuxing = { ...fashionWuxing };
    let hasBazi = false;
    
    if (baziWuxing) {
      hasBazi = true;
      console.log('[Profile] Merging Bazi and Fashion wuxing...');
      // 八字权重更高（先天为本），穿搭为辅助
      Object.keys(combinedWuxing).forEach(key => {
        const baziScore = baziWuxing[key] || 0;
        const fashionScore = fashionWuxing[key] || 0;
        // 八字每个元素算 2 分，穿搭每个元素算 1 分，加权综合
        combinedWuxing[key] = baziScore * 2 + fashionScore;
        console.log(`[Profile] ${key}: Bazi=${baziScore}, Fashion=${fashionScore}, Combined=${combinedWuxing[key]}`);
      });
    }
    
    // 更新图例数值和来源标识
    const wuxingNames = {
      wood: '木',
      fire: '火',
      earth: '土',
      metal: '金',
      water: '水'
    };
    
    Object.entries(combinedWuxing).forEach(([wuxing, score]) => {
      const valueEl = this.container.querySelector(`#${wuxing}-value`);
      const sourceEl = this.container.querySelector(`#${wuxing}-source`);
      
      console.log(`[Profile] Updating ${wuxing}: score=${score}, hasBazi=${hasBazi}`);
      
      if (valueEl) {
        valueEl.textContent = score;
      }
      
      if (sourceEl) {
        if (hasBazi) {
          const baziScore = (baziWuxing[wuxing] || 0) * 2;
          const fashionScore = fashionWuxing[wuxing] || 0;
          
          console.log(`[Profile] ${wuxing} source: bazi=${baziScore}, fashion=${fashionScore}`);
          
          if (baziScore > 0 && fashionScore > 0) {
            sourceEl.textContent = `八${baziScore}+穿${fashionScore}`;
          } else if (baziScore > 0) {
            sourceEl.textContent = `八字`;
          } else if (fashionScore > 0) {
            sourceEl.textContent = `穿搭`;
          } else {
            sourceEl.textContent = '-';
          }
          sourceEl.style.display = 'inline';
        } else {
          // 没有八字数据时，只显示穿搭
          const fashionScore = fashionWuxing[wuxing] || 0;
          if (fashionScore > 0) {
            sourceEl.textContent = `穿搭`;
            sourceEl.style.display = 'inline';
          } else {
            sourceEl.textContent = '-';
            sourceEl.style.display = 'inline';
          }
        }
      }
    });
    
    // 绘制雷达图
    this.drawWuxingRadar(ctx, canvas.width, canvas.height, combinedWuxing);
    
    // 显示五行分析提示
    this.showWuxingAnalysisTip(combinedWuxing, baziWuxing, fashionWuxing, hasBazi);
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
   * 显示五行分析提示
   */
  showWuxingAnalysisTip(combined, bazi, fashion, hasBazi) {
    const tipEl = this.container.querySelector('#wuxing-analysis-tip');
    if (!tipEl) return;
    
    // 找出最强和最弱的五行
    const entries = Object.entries(combined);
    entries.sort((a, b) => b[1] - a[1]);
    
    const strongest = entries[0];
    const weakest = entries[entries.length - 1];
    
    let analysisHTML = '';
    
    if (hasBazi && bazi) {
      // 有八字数据时的详细分析
      analysisHTML = `
        <p><strong>🎯 先天八字分析：</strong></p>
        <p>您的八字五行中，${this.getWuxingName(strongest[0])}最旺，${this.getWuxingName(weakest[0])}较弱。</p>
        <p style="margin-top: var(--space-2);"><strong>💡 穿搭建议：</strong></p>
        <p>• 宜多穿${this.getWuxingName(weakest[0])}属性的颜色，可佩戴${this.getWuxingName(weakest[0])}属性饰品</p>
        <p>• 避免过多${this.getWuxingName(strongest[0])}元素，以免过旺失衡</p>
      `;
    } else {
      // 只有穿搭数据
      if (fashion && Object.values(fashion).some(v => v > 0)) {
        analysisHTML = `
          <p><strong>🎨 穿搭偏好分析：</strong></p>
          <p>您平时偏爱${this.getWuxingName(strongest[0])}属性的穿搭风格。</p>
          <p style="margin-top: var(--space-2);"><strong>💡 平衡建议：</strong></p>
          <p>可适当尝试${this.getWuxingName(weakest[0])}元素的服饰，让整体搭配更加和谐平衡。</p>
        `;
      } else {
        analysisHTML = `
          <p><strong>📝 记录您的穿搭偏好：</strong></p>
          <p>多使用"采纳"和"不喜欢"功能记录您的穿搭偏好，系统会为您生成专属的五行能量图谱。</p>
        `;
      }
    }
    
    tipEl.innerHTML = analysisHTML;
    tipEl.classList.remove('hidden');
  }
  
  /**
   * 获取五行中文名称
   */
  getWuxingName(key) {
    const names = {
      wood: '木',
      fire: '火',
      earth: '土',
      metal: '金',
      water: '水'
    };
    return names[key] || key;
  }
  
  /**
   * 获取空偏好提示
   */
  getEmptyPreferenceTip(type) {
    if (type === 'color') {
      return `
        <div class="empty-preference-tip">
          <div class="empty-icon">🎨</div>
          <p>还没有颜色偏好记录</p>
          <p class="empty-desc">在推荐结果页多使用"采纳"功能，系统会自动记录您对颜色的喜好</p>
        </div>
      `;
    } else if (type === 'material') {
      return `
        <div class="empty-preference-tip">
          <div class="empty-icon">��</div>
          <p>还没有材质偏好记录</p>
          <p class="empty-desc">在推荐结果页多使用"采纳"功能，系统会自动记录您对材质的喜好</p>
        </div>
      `;
    }
    return '';
  }
  
  /**
   * 渲染偏好条形图
   */
  renderPreferenceBars() {
    const prefs = JSON.parse(localStorage.getItem('wuxing_preferences') || '{}');
    
    // 渲染颜色偏好（Top5）
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
          const wuxing = inferWuxingFromColor(color);
          const wuxingName = this.getWuxingName(wuxing);
          
          return `
            <div class="preference-bar-item">
              <span class="bar-label">
                ${color}
                <span class="bar-wuxing-tag ${wuxing}">${wuxingName}</span>
              </span>
              <div class="bar-track">
                <div class="bar-fill ${wuxing}" style="width: ${percentage}%"></div>
              </div>
              <span class="bar-value">${score}</span>
            </div>
          `;
        }).join('');
      } else {
        colorContainer.innerHTML = this.getEmptyPreferenceTip('color');
      }
    } else if (colorContainer) {
      colorContainer.innerHTML = this.getEmptyPreferenceTip('color');
    }
    
    // 渲染材质偏好（Top5）
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
          const wuxing = inferWuxingFromMaterial(material);
          const wuxingName = this.getWuxingName(wuxing);
          
          return `
            <div class="preference-bar-item">
              <span class="bar-label">
                ${material}
                <span class="bar-wuxing-tag ${wuxing}">${wuxingName}</span>
              </span>
              <div class="bar-track">
                <div class="bar-fill ${wuxing}" style="width: ${percentage}%"></div>
              </div>
              <span class="bar-value">${score}</span>
            </div>
          `;
        }).join('');
      } else {
        materialContainer.innerHTML = this.getEmptyPreferenceTip('material');
      }
    } else if (materialContainer) {
      materialContainer.innerHTML = this.getEmptyPreferenceTip('material');
    }
  }
  
  /**
   * 填充八字日期选项（公历/农历）
   */
  fillBaziDateOptions() {
    const yearSelect = this.container.querySelector('#profile-bazi-year');
    const monthSelect = this.container.querySelector('#profile-bazi-month');
    const daySelect = this.container.querySelector('#profile-bazi-day');
    
    if (!yearSelect || !monthSelect || !daySelect) return;
    
    // 清空现有选项
    yearSelect.innerHTML = '<option value="">年</option>';
    monthSelect.innerHTML = '<option value="">月</option>';
    daySelect.innerHTML = '<option value="">日</option>';
    
    if (this.baziCalendarType === 'solar') {
      console.log('[Profile] Filling solar calendar options');
      
      // 填充年份
      for (let year = 2025; year >= 1900; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year + '年';
        yearSelect.appendChild(option);
      }
      
      // 填充月份（固定 1-12 月）
      console.log('[Profile] Filling months...');
      for (let month = 1; month <= 12; month++) {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = month + '月';
        monthSelect.appendChild(option);
      }
      console.log('[Profile] Month select has', monthSelect.options.length, 'options');
      
      // 动态更新日期
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
      
      // 立即执行一次
      updateDays();
      
      monthSelect.addEventListener('change', updateDays);
      if (yearSelect) yearSelect.addEventListener('change', updateDays);
    } else {
      // 农历模式 - 使用 lunar-javascript
      if (typeof Lunar !== 'undefined') {
        // 农历年份（近 100 年）
        for (let lunarYear = 2025; lunarYear >= 1900; lunarYear--) {
          const option = document.createElement('option');
          option.value = lunarYear;
          option.textContent = `农历${lunarYear}年`;
          yearSelect.appendChild(option);
        }
        
        // 农历月份（包括闰月）
        try {
          if (typeof Lunar !== 'undefined' && Lunar.fromYmd) {
            const sampleLunar = Lunar.fromYmd(2024, 1, 1);
            const months = sampleLunar.getMonthsInYear();
            
            months.forEach((month, index) => {
              const option = document.createElement('option');
              option.value = index + 1;
              option.textContent = month;
              monthSelect.appendChild(option);
            });
          } else {
            throw new Error('Lunar library not available');
          }
        } catch (e) {
          console.error('[Profile] Failed to get lunar months:', e);
          // 备用方案：填充标准农历月份（1-12月）
          const lunarMonths = ['正月', '二月', '三月', '四月', '五月', '六月', 
                               '七月', '八月', '九月', '十月', '冬月', '腊月'];
          lunarMonths.forEach((month, index) => {
            const option = document.createElement('option');
            option.value = index + 1;
            option.textContent = month;
            monthSelect.appendChild(option);
          });
        }
        
        // 动态更新日期
        const updateLunarDays = () => {
          const year = parseInt(yearSelect?.value) || 2024;
          const monthIndex = parseInt(monthSelect.value) || 1;
          
          try {
            const lunar = Lunar.fromYmd(year, monthIndex, 1);
            const daysInMonth = lunar.getDaysInMonth();
            
            daySelect.innerHTML = '<option value="">日</option>';
            for (let day = 1; day <= daysInMonth; day++) {
              const option = document.createElement('option');
              option.value = day;
              option.textContent = day + '日';
              daySelect.appendChild(option);
            }
          } catch (e) {
            console.error('[Profile] Failed to get lunar days:', e);
          }
        };
        
        monthSelect.addEventListener('change', updateLunarDays);
        if (yearSelect) yearSelect.addEventListener('change', updateLunarDays);
      } else {
        console.warn('[Profile] Lunar library not loaded, using solar mode');
        this.baziCalendarType = 'solar';
        
        // 切换到公历选项
        const calendarRadios = this.container.querySelectorAll('input[name="bazi-calendar"]');
        calendarRadios.forEach(radio => {
          radio.checked = (radio.value === 'solar');
        });
        const options = this.container.querySelectorAll('.calendar-type-option');
        options.forEach(opt => {
          opt.classList.toggle('active', opt.dataset.type === 'solar');
        });
        
        this.fillBaziDateOptions();
      }
    }
  }
  
  /**
   * 计算八字（支持公历/农历）
   */
  calculateBazi(year, month, day, hourIndex) {
    try {
      // 将时辰序号转换为实际小时数（取时辰的中间时刻）
      // 子时 (0): 23:00-01:00 → 0 点，丑时 (1): 01:00-03:00 → 2 点，以此类推
      const actualHour = hourIndex === 0 ? 0 : hourIndex * 2;

      if (this.baziCalendarType === 'solar') {
        // 公历直接计算
        return analyzeBaziPrecise(year, month, day, actualHour);
      } else {
        // 农历转换为公历后计算
        if (typeof Lunar === 'undefined') {
          console.error('[Profile] Lunar library not loaded');
          return null;
        }
        
        const lunarDate = Lunar.fromYmd(year, month, day);
        const solarDate = lunarDate.getSolar();
        
        return analyzeBaziPrecise(
          solarDate.getYear(),
          solarDate.getMonth(),
          solarDate.getDay(),
          actualHour
        );
      }
    } catch (error) {
      console.error('[Profile] Bazi calculation failed:', error);
      return null;
    }
  }
  
  /**
   * 初始化八字输入
   */
  initBaziInput() {
    // 当前选择的日历类型
    this.baziCalendarType = 'solar'; // 'solar' | 'lunar'
    
    // 日期类型切换（使用 radio）
    const calendarRadios = this.container.querySelectorAll('input[name="bazi-calendar"]');
    calendarRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const type = e.target.value;
        
        // 更新激活状态
        const options = this.container.querySelectorAll('.calendar-type-option');
        options.forEach(opt => {
          opt.classList.toggle('active', opt.dataset.type === type);
        });
        
        // 切换日历类型
        this.baziCalendarType = type;
        
        // 重新填充年月日选项
        this.fillBaziDateOptions();
      });
    });
    
    // 填充年月日选项
    this.fillBaziDateOptions();
    
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
      
      // 重新渲染五行雷达图和偏好条形图（显示八字五行数据）
      this.renderWuxingRadar();
      this.renderPreferenceBars();
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
    
    // 计算八字（支持公历/农历）
    const baziResult = this.calculateBazi(
      parseInt(year),
      parseInt(month),
      parseInt(day),
      parseInt(hour)
    );
    
    if (!baziResult) {
      this.showToast('八字计算失败，请检查输入');
      return;
    }
    
    // 保存原始输入和计算结果
    const baziData = {
      year: parseInt(year),
      month: parseInt(month),
      day: parseInt(day),
      hour: parseInt(hour),
      calendarType: this.baziCalendarType, // 记录使用的日历类型
      baziResult: baziResult.bazi, // 完整的八字四柱
      wuxingProfile: baziResult.profile, // 五行分布
      recommend: baziResult.recommend // 推荐五行
    };
    
    // 保存到 state
    this.setState(StateKeys.BAZI_DATA, baziData);
    
    // 标记需要重新计算推荐
    this.setState('BAZI_JUST_UPDATED', true);
    
    // 更新 UI
    this.updateBaziStatus(true);
    this.renderBaziAnalysis(baziData);
    
    // 重新渲染五行雷达图和偏好条形图（显示八字五行数据）
    this.renderWuxingRadar();
    this.renderPreferenceBars();
    
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
    
    // 使用精确计算的八字结果
    const bazi = baziData.baziResult;
    
    resultEl.innerHTML = `
      <div class="bazi-pillars">
        <div class="pillar">
          <span class="pillar-label">年柱</span>
          <span class="pillar-gan">${bazi.year.gan}</span>
          <span class="pillar-zhi">${bazi.year.zhi}</span>
        </div>
        <div class="pillar">
          <span class="pillar-label">月柱</span>
          <span class="pillar-gan">${bazi.month.gan}</span>
          <span class="pillar-zhi">${bazi.month.zhi}</span>
        </div>
        <div class="pillar">
          <span class="pillar-label">日柱</span>
          <span class="pillar-gan">${bazi.day.gan}</span>
          <span class="pillar-zhi">${bazi.day.zhi}</span>
        </div>
        <div class="pillar">
          <span class="pillar-label">时柱</span>
          <span class="pillar-gan">${bazi.hour.gan}</span>
          <span class="pillar-zhi">${bazi.hour.zhi}</span>
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
   * 初始化日记功能
   */
  initDiary() {
    // 日记相关状态
    this.diaryCurrentDate = new Date();
    this.diaryCurrentEditingDate = null;
    
    // 添加日记按钮
    const addBtn = this.container.querySelector('#btn-add-diary');
    if (addBtn) {
      this.addEventListener(addBtn, 'click', () => {
        this.openDiaryEditor();
      });
    }
    
    // 弹窗关闭
    const modal = this.container.querySelector('#modal-diary-editor');
    const backdrop = modal?.querySelector('.modal-backdrop');
    const closeBtn = modal?.querySelector('.modal-close');
    const cancelBtn = this.container.querySelector('#btn-cancel-diary');
    
    if (backdrop) {
      this.addEventListener(backdrop, 'click', () => this.closeDiaryEditor());
    }
    if (closeBtn) {
      this.addEventListener(closeBtn, 'click', () => this.closeDiaryEditor());
    }
    if (cancelBtn) {
      this.addEventListener(cancelBtn, 'click', () => this.closeDiaryEditor());
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
    
    // 照片选择
    const photoInput = this.container.querySelector('#diary-photo');
    const selectPhotoBtn = this.container.querySelector('#btn-select-photo');
    
    if (selectPhotoBtn && photoInput) {
      this.addEventListener(selectPhotoBtn, 'click', () => photoInput.click());
      this.addEventListener(photoInput, 'change', (e) => {
        if (e.target.files?.[0]) {
          this.handlePhotoSelect(e.target.files[0]);
        }
      });
    }
    
    // 删除按钮
    const deleteBtn = this.container.querySelector('#btn-delete-diary');
    if (deleteBtn) {
      this.addEventListener(deleteBtn, 'click', () => this.deleteDiary());
    }
    
    // 月份导航
    const prevMonthBtn = this.container.querySelector('#btn-prev-month');
    const nextMonthBtn = this.container.querySelector('#btn-next-month');
    
    if (prevMonthBtn) {
      this.addEventListener(prevMonthBtn, 'click', () => {
        this.diaryCurrentDate.setMonth(this.diaryCurrentDate.getMonth() - 1);
        this.renderDiaryCalendar();
      });
    }
    
    if (nextMonthBtn) {
      this.addEventListener(nextMonthBtn, 'click', () => {
        this.diaryCurrentDate.setMonth(this.diaryCurrentDate.getMonth() + 1);
        this.renderDiaryCalendar();
      });
    }
    
    // 日历点击（委托）
    const calendarTable = this.container.querySelector('#diary-calendar-table');
    if (calendarTable) {
      this.addEventListener(calendarTable, 'click', (e) => {
        const dayCell = e.target.closest('.calendar-cell');
        if (dayCell) {
          const date = dayCell.dataset.date;
          this.openDiaryEditor(date);
        }
      });
    }
    
    // 时间线点击（委托）
    const timelineList = this.container.querySelector('#diary-timeline-list');
    if (timelineList) {
      this.addEventListener(timelineList, 'click', (e) => {
        const timelineItem = e.target.closest('.timeline-item');
        if (timelineItem) {
          const date = timelineItem.dataset.date;
          this.openDiaryEditor(date);
        }
      });
    }
    
    // 初始化渲染
    this.renderDiaryCalendar();
    this.renderDiaryTimeline();
    this.renderDiaryStats();
    this.checkAchievement();
    
    // 筛选状态
    this.filterState = { mood: '', dateStart: '', dateEnd: '' };
    
    // 筛选控件
    const filterMood = this.container.querySelector('#filter-mood');
    const filterDateStart = this.container.querySelector('#filter-date-start');
    const filterDateEnd = this.container.querySelector('#filter-date-end');
    const clearFilterBtn = this.container.querySelector('#btn-clear-filter');
    const monthlySummaryBtn = this.container.querySelector('#btn-monthly-summary');
    const achievementDisplay = this.container.querySelector('#achievement-display');
    
    if (filterMood) {
      this.addEventListener(filterMood, 'change', (e) => {
        this.filterState.mood = e.target.value;
        this.applyFilter();
      });
    }
    
    if (filterDateStart) {
      this.addEventListener(filterDateStart, 'change', (e) => {
        this.filterState.dateStart = e.target.value;
        this.applyFilter();
      });
    }
    
    if (filterDateEnd) {
      this.addEventListener(filterDateEnd, 'change', (e) => {
        this.filterState.dateEnd = e.target.value;
        this.applyFilter();
      });
    }
    
    if (clearFilterBtn) {
      this.addEventListener(clearFilterBtn, 'click', () => this.clearFilter());
    }
    
    if (monthlySummaryBtn) {
      this.addEventListener(monthlySummaryBtn, 'click', () => this.showMonthlySummary());
    }
    
    if (achievementDisplay) {
      this.addEventListener(achievementDisplay, 'click', () => this.showAchievementPopup());
    }
  }
  
  /**
   * 应用筛选
   */
  applyFilter() {
    const { mood, dateStart, dateEnd } = this.filterState;
    this.renderDiaryTimelineFiltered(mood, dateStart, dateEnd);
    this.highlightFilteredDays(mood, dateStart, dateEnd);
  }
  
  /**
   * 清除筛选
   */
  clearFilter() {
    this.filterState = { mood: '', dateStart: '', dateEnd: '' };
    
    const filterMood = this.container.querySelector('#filter-mood');
    const filterDateStart = this.container.querySelector('#filter-date-start');
    const filterDateEnd = this.container.querySelector('#filter-date-end');
    
    if (filterMood) filterMood.value = '';
    if (filterDateStart) filterDateStart.value = '';
    if (filterDateEnd) filterDateEnd.value = '';
    
    this.renderDiaryTimeline();
    this.renderDiaryCalendar();
  }
  
  /**
   * 高亮筛选日期
   */
  highlightFilteredDays(mood, dateStart, dateEnd) {
    const allDays = this.container.querySelectorAll('.calendar-cell');
    
    allDays.forEach(day => {
      const date = day.dataset.date;
      if (!date) return;
      
      const record = getDiaryByDate(date);
      let match = true;
      
      if (mood && record?.mood !== mood) match = false;
      if (dateStart && date < dateStart) match = false;
      if (dateEnd && date > dateEnd) match = false;
      
      day.style.opacity = match ? '1' : '0.3';
    });
  }
  
  /**
   * 检查成就
   */
  checkAchievement() {
    const streak = getStreakDays();
    const achievementDisplay = this.container.querySelector('#achievement-display');
    const achievementIcon = achievementDisplay?.querySelector('.achievement-icon');
    
    if (!achievementDisplay) return;
    
    let icon = '🎯', label = '开始打卡';
    
    if (streak >= 30) { icon = '🏆'; label = '月度冠军'; }
    else if (streak >= 14) { icon = '💎'; label = '两周达人'; }
    else if (streak >= 7) { icon = '⭐'; label = '一周之星'; }
    else if (streak >= 3) { icon = '🔥'; label = '起步中'; }
    
    if (achievementIcon) achievementIcon.textContent = icon;
    achievementDisplay.querySelector('.stat-label').textContent = label;
    
    this.checkNewAchievement(streak);
  }
  
  /**
   * 检查新成就
   */
  checkNewAchievement(streak) {
    const lastAchievement = localStorage.getItem('wuxing_last_achievement');
    const milestones = [7, 14, 30];
    
    for (const milestone of milestones) {
      if (streak >= milestone && parseInt(lastAchievement || '0') < milestone) {
        localStorage.setItem('wuxing_last_achievement', milestone.toString());
        this.showAchievementAnimation(milestone);
        break;
      }
    }
  }
  
  /**
   * 显示成就动画
   */
  showAchievementAnimation(milestone) {
    const achievements = {
      7: { icon: '⭐', title: '一周之星', desc: '连续打卡7天，养成好习惯！' },
      14: { icon: '💎', title: '两周达人', desc: '坚持14天，你真棒！' },
      30: { icon: '🏆', title: '月度冠军', desc: '连续30天，穿搭达人诞生！' }
    };
    
    const achievement = achievements[milestone];
    if (!achievement) return;
    
    this.createConfetti();
    
    const popup = this.container.querySelector('#achievement-popup');
    if (popup) {
      popup.innerHTML = `
        <div class="achievement-badge">${achievement.icon}</div>
        <div class="achievement-title">${achievement.title}</div>
        <div class="achievement-desc">${achievement.desc}</div>
        <button class="btn btn-primary" onclick="this.closest('.achievement-popup').classList.add('hidden')">太棒了！</button>
      `;
      popup.classList.remove('hidden');
      setTimeout(() => popup.classList.add('hidden'), 5000);
    }
  }
  
  /**
   * 创建彩纸动画
   */
  createConfetti() {
    const container = document.createElement('div');
    container.className = 'achievement-animation';
    document.body.appendChild(container);
    
    const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96e6a1'];
    
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = Math.random() * 0.5 + 's';
      container.appendChild(confetti);
    }
    
    setTimeout(() => container.remove(), 3000);
  }
  
  /**
   * 显示成就弹窗
   */
  showAchievementPopup() {
    const streak = getStreakDays();
    const popup = this.container.querySelector('#achievement-popup');
    if (!popup) return;
    
    const achievements = [];
    if (streak >= 7) achievements.push({ icon: '⭐', title: '一周之星' });
    if (streak >= 14) achievements.push({ icon: '💎', title: '两周达人' });
    if (streak >= 30) achievements.push({ icon: '🏆', title: '月度冠军' });
    
    if (achievements.length === 0) {
      achievements.push({ icon: '🎯', title: '开始打卡', desc: `还需${7 - streak}天解锁第一个成就` });
    }
    
    popup.innerHTML = `
      <div class="achievement-badge">${achievements[achievements.length - 1].icon}</div>
      <div class="achievement-title">我的成就</div>
      <div class="achievement-desc" style="margin-bottom: var(--space-3);">
        ${achievements.map(a => `<div style="margin: var(--space-2) 0;">${a.icon} ${a.title}</div>`).join('')}
      </div>
      <button class="btn btn-secondary" onclick="this.closest('.achievement-popup').classList.add('hidden')">关闭</button>
    `;
    popup.classList.remove('hidden');
  }
  
  /**
   * 显示月度总结
   */
  showMonthlySummary() {
    const popup = this.container.querySelector('#achievement-popup');
    if (!popup) {
      console.error('[ProfileController] Achievement popup not found');
      return;
    }
    
    // 使用日历当前显示的月份
    const year = this.diaryCurrentDate.getFullYear();
    const month = this.diaryCurrentDate.getMonth() + 1;
    const stats = getMonthlyStats(year, month);
    const streak = getStreakDays();
    
    const moodLabels = {
      happy: '😊 开心', confident: '💪 自信', calm: '😌 平静',
      tired: '😴 疲惫', excited: '🤩 兴奋'
    };
    
    // 心情分布（排序取前5）
    const moodStats = Object.entries(stats.moodCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    // 颜色分布（排序取前3）
    const colorStats = Object.entries(stats.colorCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    // 材质分布（排序取前3）
    const materialStats = Object.entries(stats.materialCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    // 如果没有记录，显示空状态提示
    if (stats.totalDays === 0) {
      popup.innerHTML = `
        <div class="achievement-badge">📊</div>
        <div class="achievement-title">${year}年${month}月穿搭总结</div>
        <div class="achievement-desc" style="text-align: center; padding: var(--space-5);">
          <div style="font-size: 64px; margin-bottom: var(--space-3);">📝</div>
          <p style="color: var(--color-text-secondary); margin-bottom: var(--space-2);">
            本月还没有穿搭记录哦～
          </p>
          <p style="font-size: var(--text-sm); color: var(--color-text-muted);">
            点击日历上的日期，开始记录你的第一套穿搭吧！
          </p>
        </div>
        <button class="btn btn-primary" onclick="this.closest('.achievement-popup').classList.add('hidden')" style="margin-top: var(--space-4);">去记录</button>
      `;
    } else {
      // 有记录时显示详细统计
      popup.innerHTML = `
        <div class="achievement-badge">📊</div>
        <div class="achievement-title">${year}年${month}月穿搭总结</div>
        <div class="achievement-desc" style="text-align: left; max-height: 60vh; overflow-y: auto;">
          <div style="margin: var(--space-3) 0; padding: var(--space-3); background: var(--color-surface); border-radius: var(--radius-md);">
            <div style="font-size: var(--text-2xl); font-weight: 700; color: var(--color-primary); text-align: center;">
              ${stats.totalDays}<span style="font-size: var(--text-sm); font-weight: normal;">天</span>
            </div>
            <div style="text-align: center; color: var(--color-text-secondary); font-size: var(--text-sm);">本月记录</div>
          </div>
          
          <div style="margin: var(--space-3) 0;">🔥 连续打卡：<strong>${streak}</strong> 天</div>
          
          ${moodStats.length > 0 ? `
          <div style="margin: var(--space-3) 0;">
            <div style="font-weight: 600; margin-bottom: var(--space-2);">🌈 心情分布</div>
            ${moodStats.map(([mood, count]) => `
              <div style="display: flex; justify-content: space-between; align-items: center; margin: var(--space-2) 0; padding: var(--space-2); background: var(--color-surface); border-radius: var(--radius-sm);">
                <span>${moodLabels[mood] || mood}</span>
                <span style="font-weight: 600;">${count}次</span>
              </div>
            `).join('')}
          </div>
          ` : ''}
          
          ${colorStats.length > 0 ? `
          <div style="margin: var(--space-3) 0;">
            <div style="font-weight: 600; margin-bottom: var(--space-2);">🎨 颜色偏好</div>
            ${colorStats.map(([color, count]) => `
              <div style="display: flex; justify-content: space-between; align-items: center; margin: var(--space-2) 0; padding: var(--space-2); background: var(--color-surface); border-radius: var(--radius-sm);">
                <span>${color}</span>
                <span style="font-weight: 600;">${count}次</span>
              </div>
            `).join('')}
          </div>
          ` : ''}
          
          ${materialStats.length > 0 ? `
          <div style="margin: var(--space-3) 0;">
            <div style="font-weight: 600; margin-bottom: var(--space-2);">🧵 材质偏好</div>
            ${materialStats.map(([material, count]) => `
              <div style="display: flex; justify-content: space-between; align-items: center; margin: var(--space-2) 0; padding: var(--space-2); background: var(--color-surface); border-radius: var(--radius-sm);">
                <span>${material}</span>
                <span style="font-weight: 600;">${count}次</span>
              </div>
            `).join('')}
          </div>
          ` : ''}
        </div>
        <button class="btn btn-primary" onclick="this.closest('.achievement-popup').classList.add('hidden')" style="margin-top: var(--space-4);">继续加油！</button>
      `;
    }
    popup.classList.remove('hidden');
  }
  
  /**
   * 渲染筛选后的时间线
   */
  renderDiaryTimelineFiltered(filterMood, filterDateStart, filterDateEnd) {
    const timeline = this.container.querySelector('#diary-timeline-list');
    if (!timeline) return;
    
    let records = getTimelineData(30);
    
    if (filterMood) records = records.filter(r => r.mood === filterMood);
    if (filterDateStart) records = records.filter(r => r.date >= filterDateStart);
    if (filterDateEnd) records = records.filter(r => r.date <= filterDateEnd);
    
    if (records.length === 0) {
      timeline.innerHTML = `
        <div class="empty-state">
          <p>暂无匹配的记录</p>
          <p class="text-muted">尝试调整筛选条件</p>
        </div>
      `;
      return;
    }
    
    let html = '';
    records.forEach(record => {
      const moodHtml = record.mood && MOODS[record.mood] 
        ? `<span class="timeline-mood" style="background: ${MOODS[record.mood].color}">${MOODS[record.mood].icon} ${MOODS[record.mood].label}</span>`
        : '';
      
      html += `
        <div class="timeline-item" data-date="${record.date}">
          <div class="timeline-date">
            <span class="date-day">${record.date.slice(8)}</span>
            <span class="date-month">${record.date.slice(5, 7)}月</span>
          </div>
          <div class="timeline-content">
            ${record.image ? `<img src="${record.image}" class="timeline-image" alt="穿搭照片">` : ''}
            <div class="timeline-info">
              ${moodHtml}
              ${record.color ? `<span class="timeline-color">${record.color}</span>` : ''}
              ${record.material ? `<span class="timeline-material">${record.material}</span>` : ''}
              ${record.note ? `<p class="timeline-note">${record.note}</p>` : ''}
            </div>
          </div>
        </div>
      `;
    });
    
    timeline.innerHTML = html;
  }
  
  /**
   * 渲染日记日历
   */
  renderDiaryCalendar() {
    const year = this.diaryCurrentDate.getFullYear();
    const month = this.diaryCurrentDate.getMonth() + 1;
    
    // 更新月份标题
    const monthTitle = this.container.querySelector('.current-month');
    if (monthTitle) {
      monthTitle.textContent = `${year}年${month}月`;
    }
    
    // 获取日历数据
    const calendar = getCalendarData(year, month);
    
    // 渲染日历表格
    const table = this.container.querySelector('#diary-calendar-table');
    if (!table) return;
    
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    
    // 表头
    let html = '<thead><tr>';
    weekDays.forEach(day => {
      html += `<th>${day}</th>`;
    });
    html += '</tr></thead>';
    
    // 表体
    html += '<tbody>';
    calendar.forEach(week => {
      html += '<tr>';
      week.forEach(day => {
        const hasRecordClass = day.hasRecord ? 'has-record' : '';
        const isTodayClass = day.isToday ? 'is-today' : '';
        const isCurrentMonthClass = day.isCurrentMonth ? '' : 'other-month';
        
        // 日历心情显示
        let moodDot = '';
        if (day.hasRecord && day.record?.mood && MOODS[day.record.mood]) {
          moodDot = `<span class="mood-dot">${MOODS[day.record.mood].icon}</span>`;
        }
        
        html += `
          <td>
            <div class="calendar-cell ${hasRecordClass} ${isTodayClass} ${isCurrentMonthClass}" 
                 data-date="${day.date}">
              <span class="day-number">${day.day}</span>
              ${moodDot}
            </div>
          </td>
        `;
      });
      html += '</tr>';
    });
    html += '</tbody>';
    
    table.innerHTML = html;
  }
  
  /**
   * 渲染时间线
   */
  renderDiaryTimeline() {
    const timeline = this.container.querySelector('#diary-timeline-list');
    if (!timeline) return;
    
    const records = getTimelineData(30);
    
    if (records.length === 0) {
      timeline.innerHTML = `
        <div class="empty-state">
          <p>暂无穿搭记录</p>
          <p class="text-muted">点击上方日历，选择日期开始记录</p>
        </div>
      `;
      return;
    }
    
    let html = '';
    records.forEach(record => {
      const moodHtml = record.mood && MOODS[record.mood] 
        ? `<span class="timeline-mood" style="background: ${MOODS[record.mood].color}">${MOODS[record.mood].icon} ${MOODS[record.mood].label}</span>`
        : '';
      
      html += `
        <div class="timeline-item" data-date="${record.date}">
          <div class="timeline-date">
            <span class="date-day">${record.date.slice(8)}</span>
            <span class="date-month">${record.date.slice(5, 7)}月</span>
          </div>
          <div class="timeline-content">
            ${record.image ? `<img src="${record.image}" class="timeline-image" alt="穿搭照片">` : ''}
            <div class="timeline-info">
              ${moodHtml}
              ${record.color ? `<span class="timeline-color">${record.color}</span>` : ''}
              ${record.material ? `<span class="timeline-material">${record.material}</span>` : ''}
              ${record.note ? `<p class="timeline-note">${record.note}</p>` : ''}
            </div>
          </div>
        </div>
      `;
    });
    
    timeline.innerHTML = html;
  }
  
  /**
   * 渲染日记统计
   */
  renderDiaryStats() {
    const stats = getDiaryStats();
    const streak = getStreakDays();
    
    // 连续天数
    const streakEl = this.container.querySelector('.streak-days');
    if (streakEl) {
      streakEl.textContent = streak;
    }
    
    // 总记录数
    const totalEl = this.container.querySelector('.total-records');
    if (totalEl) {
      totalEl.textContent = stats.totalDays;
    }
    
  }
  
  /**
   * 打开日记编辑器
   */
  openDiaryEditor(date) {
    const modal = this.container.querySelector('#modal-diary-editor');
    const dateInput = this.container.querySelector('#diary-date');
    const deleteBtn = this.container.querySelector('#btn-delete-diary');
    
    // 设置日期
    const selectedDate = date || new Date().toISOString().split('T')[0];
    dateInput.value = selectedDate;
    this.diaryCurrentEditingDate = selectedDate;
    
    // 加载已有记录
    const existingRecord = getDiaryByDate(selectedDate);
    if (existingRecord) {
      this.loadDiaryRecord(existingRecord);
      if (deleteBtn) deleteBtn.classList.remove('hidden');
    } else {
      this.resetDiaryForm();
      if (deleteBtn) deleteBtn.classList.add('hidden');
    }
    
    // 显示弹窗
    modal.classList.remove('hidden');
  }
  
  /**
   * 关闭日记编辑器
   */
  closeDiaryEditor() {
    const modal = this.container.querySelector('#modal-diary-editor');
    if (modal) {
      modal.classList.add('hidden');
    }
    this.resetDiaryForm();
    this.diaryCurrentEditingDate = null;
  }
  
  /**
   * 加载日记记录到表单
   */
  loadDiaryRecord(record) {
    const colorInput = this.container.querySelector('#diary-color');
    const materialInput = this.container.querySelector('#diary-material');
    const noteInput = this.container.querySelector('#diary-note');
    
    if (colorInput) colorInput.value = record.color || '';
    if (materialInput) materialInput.value = record.material || '';
    if (noteInput) noteInput.value = record.note || '';
    
    // 设置心情
    this.container.querySelectorAll('.mood-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mood === record.mood);
    });
    
    // 设置照片预览
    if (record.image) {
      this.showPhotoPreview(record.image);
    } else {
      this.hidePhotoPreview();
    }
  }
  
  /**
   * 重置日记表单
   */
  resetDiaryForm() {
    const form = this.container.querySelector('#diary-form');
    if (form) form.reset();
    
    this.container.querySelectorAll('.mood-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    this.hidePhotoPreview();
  }
  
  /**
   * 处理照片选择
   */
  handlePhotoSelect(file) {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      this.showPhotoPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  }
  
  /**
   * 显示照片预览
   */
  showPhotoPreview(imageSrc) {
    const preview = this.container.querySelector('#diary-photo-preview');
    if (preview) {
      preview.innerHTML = `<img src="${imageSrc}" alt="预览">`;
      preview.classList.remove('hidden');
    }
  }
  
  /**
   * 隐藏照片预览
   */
  hidePhotoPreview() {
    const preview = this.container.querySelector('#diary-photo-preview');
    if (preview) {
      preview.innerHTML = '';
      preview.classList.add('hidden');
    }
  }
  
  /**
   * 保存日记
   */
  saveDiary() {
    const date = this.container.querySelector('#diary-date')?.value;
    const color = this.container.querySelector('#diary-color')?.value;
    const material = this.container.querySelector('#diary-material')?.value;
    const note = this.container.querySelector('#diary-note')?.value;
    
    const selectedMood = this.container.querySelector('.mood-btn.active');
    const mood = selectedMood ? selectedMood.dataset.mood : null;
    
    const previewImg = this.container.querySelector('#diary-photo-preview img');
    const image = previewImg ? previewImg.src : null;
    
    if (!date) {
      this.showToast('请选择日期');
      return;
    }
    
    const record = {
      color,
      material,
      note,
      mood,
      image
    };
    
    saveDiaryRecord(date, record);
    this.showToast('记录已保存');
    this.closeDiaryEditor();
    this.renderDiaryCalendar();
    this.renderDiaryTimeline();
    this.renderDiaryStats();
  }
  
  /**
   * 删除日记
   */
  deleteDiary() {
    if (!this.diaryCurrentEditingDate) return;
    
    if (confirm('确定要删除这条记录吗？')) {
      deleteDiaryRecord(this.diaryCurrentEditingDate);
      this.showToast('记录已删除');
      this.closeDiaryEditor();
      this.renderDiaryCalendar();
      this.renderDiaryTimeline();
      this.renderDiaryStats();
    }
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
    
    // 详情模态框关闭按钮（全局）
    const modalCloseBtn = document.querySelector('#modal-detail .modal-close');
    if (modalCloseBtn) {
      this.addEventListener(modalCloseBtn, 'click', () => {
        closeModal('modal-detail');
      });
    }
    
    // 详情模态框背景点击关闭
    const modalBackdrop = document.querySelector('#modal-detail .modal-backdrop');
    if (modalBackdrop) {
      this.addEventListener(modalBackdrop, 'click', () => {
        closeModal('modal-detail');
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
      // 执行清除所有数据
      clearAllData();
      
      // 重新渲染数据管理面板，更新统计显示为0
      const dataContainer = document.getElementById('data-manager-container');
      if (dataContainer) {
        dataContainer.innerHTML = renderDataManagerPanel();
      }
      
      // 同时刷新画像页面的其他数据展示
      this.renderWuxingRadar();
      this.renderPreferenceBars();
      
      this.showToast('数据已清除');
    }
  }
  
  onUnmount() {
    this.eventsBound = false;
  }
}
