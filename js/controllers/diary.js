/**
 * Diary Controller - 穿搭日记控制器
 */

import { BaseController } from './base.js';
import { navigateTo, goBack } from '../router.js';
import { 
  getCalendarData, 
  getTimelineData, 
  getDiaryStats, 
  getStreakDays,
  getDiaryByDate,
  saveDiaryRecord,
  deleteDiaryRecord,
  MOODS 
} from '../diary.js';
import { getTodayString } from '../upload.js';

export class DiaryController extends BaseController {
  init() {
    this.container = document.getElementById('view-diary');
    this.currentDate = new Date();
    this.viewMode = 'calendar'; // 'calendar' | 'timeline'
  }

  onMount() {
    this.renderCalendar();
    this.renderStats();
  }

  bindEvents() {
    // 返回按钮
    const backBtn = this.container.querySelector('#btn-back-from-diary');
    if (backBtn) {
      this.addEventListener(backBtn, 'click', () => {
        goBack();
      });
    }

    // 视图切换
    this.container.querySelectorAll('.diary-view-btn').forEach(btn => {
      this.addEventListener(btn, 'click', () => {
        this.switchView(btn.dataset.view);
      });
    });

    // 月份导航
    const prevMonthBtn = this.container.querySelector('#btn-prev-month');
    const nextMonthBtn = this.container.querySelector('#btn-next-month');
    
    if (prevMonthBtn) {
      this.addEventListener(prevMonthBtn, 'click', () => {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.renderCalendar();
      });
    }
    
    if (nextMonthBtn) {
      this.addEventListener(nextMonthBtn, 'click', () => {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.renderCalendar();
      });
    }

    // 日历点击（委托）
    const calendarGrid = this.container.querySelector('.calendar-grid');
    if (calendarGrid) {
      this.addEventListener(calendarGrid, 'click', (e) => {
        const dayCell = e.target.closest('.calendar-day');
        if (dayCell) {
          const date = dayCell.dataset.date;
          this.openDiaryEditor(date);
        }
      });
    }
  }

  switchView(mode) {
    this.viewMode = mode;
    
    // 更新按钮状态
    this.container.querySelectorAll('.diary-view-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === mode);
    });
    
    // 切换视图
    const calendarView = this.container.querySelector('.calendar-view');
    const timelineView = this.container.querySelector('.timeline-view');
    
    if (calendarView) calendarView.classList.toggle('hidden', mode !== 'calendar');
    if (timelineView) timelineView.classList.toggle('hidden', mode !== 'timeline');
    
    if (mode === 'timeline') {
      this.renderTimeline();
    }
  }

  renderCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth() + 1;
    
    // 更新月份标题
    const monthTitle = this.container.querySelector('.current-month');
    if (monthTitle) {
      monthTitle.textContent = `${year}年${month}月`;
    }
    
    // 获取日历数据
    const calendar = getCalendarData(year, month);
    
    // 渲染日历网格
    const grid = this.container.querySelector('.calendar-grid');
    if (!grid) return;
    
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    let html = '<div class="calendar-header">';
    weekDays.forEach(day => {
      html += `<div class="week-day">${day}</div>`;
    });
    html += '</div>';
    
    html += '<div class="calendar-body">';
    calendar.forEach(week => {
      week.forEach(day => {
        const hasRecordClass = day.hasRecord ? 'has-record' : '';
        const isTodayClass = day.isToday ? 'is-today' : '';
        const isCurrentMonthClass = day.isCurrentMonth ? '' : 'other-month';
        
        html += `
          <div class="calendar-day ${hasRecordClass} ${isTodayClass} ${isCurrentMonthClass}" 
               data-date="${day.date}">
            <span class="day-number">${day.day}</span>
            ${day.hasRecord ? '<span class="record-dot"></span>' : ''}
          </div>
        `;
      });
    });
    html += '</div>';
    
    grid.innerHTML = html;
  }

  renderTimeline() {
    const timeline = this.container.querySelector('.timeline-list');
    if (!timeline) return;
    
    const records = getTimelineData();
    
    if (records.length === 0) {
      timeline.innerHTML = `
        <div class="empty-state">
          <p>暂无穿搭记录</p>
          <p class="text-muted">开始记录你的每日穿搭吧</p>
        </div>
      `;
      return;
    }
    
    let html = '';
    records.forEach(record => {
      const mood = MOODS[record.mood] || MOODS.happy;
      
      html += `
        <div class="timeline-item" data-date="${record.date}">
          <div class="timeline-date">
            <span class="date-day">${record.date.slice(8)}</span>
            <span class="date-month">${record.date.slice(5, 7)}月</span>
          </div>
          <div class="timeline-content">
            ${record.image ? `<img src="${record.image}" class="timeline-image" alt="穿搭照片">` : ''}
            <div class="timeline-info">
              <span class="timeline-mood" style="background: ${mood.color}">
                ${mood.icon} ${mood.label}
              </span>
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

  renderStats() {
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
    
    // 颜色分布
    const colorStats = this.container.querySelector('.color-stats');
    if (colorStats) {
      const sortedColors = Object.entries(stats.colorCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      colorStats.innerHTML = sortedColors.map(([color, count]) => `
        <div class="stat-bar-item">
          <span class="stat-label">${color}</span>
          <div class="stat-bar">
            <div class="stat-fill" style="width: ${(count / stats.totalDays * 100)}%"></div>
          </div>
          <span class="stat-value">${count}次</span>
        </div>
      `).join('');
    }
  }

  openDiaryEditor(date) {
    // TODO: 打开编辑弹窗
    this.showToast(`编辑 ${date} 的穿搭记录`);
  }
}
