/**
 * Diary Controller - 穿搭日记控制器
 */

import { BaseController } from './base.js';
import { navigateTo, goBack } from '../core/router.js';
import { 
  getCalendarData, 
  getTimelineData, 
  getDiaryStats, 
  getStreakDays,
  getDiaryByDate,
  saveDiaryRecord,
  deleteDiaryRecord,
  MOODS 
} from '../utils/diary.js';
import { getTodayString } from '../utils/upload.js';

export class DiaryController extends BaseController {
  init() {
    this.currentDate = new Date();
    this.viewMode = 'calendar'; // 'calendar' | 'timeline'
  }

  onMount() {
    // 动态获取容器（视图是动态加载的）
    this.container = document.getElementById('view-diary');
    if (!this.container) {
      console.error('[DiaryController] Container not found');
      return;
    }
    
    // 重新绑定事件（因为视图刚加载）
    this.bindEvents();
    
    this.renderCalendar();
    this.renderStats();
  }

  bindEvents() {
    // 避免重复绑定
    if (this.eventsBound) return;
    this.eventsBound = true;
    
    // 返回按钮
    const backBtn = this.container.querySelector('#btn-back-from-diary');
    if (backBtn) {
      this.addEventListener(backBtn, 'click', () => {
        goBack();
      });
    }

    // 添加记录按钮
    const addBtn = this.container.querySelector('#btn-add-diary');
    if (addBtn) {
      this.addEventListener(addBtn, 'click', () => {
        this.openDiaryEditor();
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

    // 弹窗关闭
    const modal = this.container.querySelector('#modal-diary-editor');
    const backdrop = modal?.querySelector('.modal-backdrop');
    const closeBtn = modal?.querySelector('.modal-close');
    const cancelBtn = modal?.querySelector('#btn-cancel-diary');
    
    if (backdrop) {
      this.addEventListener(backdrop, 'click', () => this.closeDiaryEditor());
    }
    if (closeBtn) {
      this.addEventListener(closeBtn, 'click', () => this.closeDiaryEditor());
    }
    if (cancelBtn) {
      this.addEventListener(cancelBtn, 'click', () => this.closeDiaryEditor());
    }

    // 心情选择
    this.container.querySelectorAll('.mood-btn').forEach(btn => {
      this.addEventListener(btn, 'click', () => this.selectMood(btn));
    });

    // 照片选择
    const photoInput = this.container.querySelector('#diary-photo');
    const selectPhotoBtn = this.container.querySelector('#btn-select-photo');
    
    if (selectPhotoBtn && photoInput) {
      this.addEventListener(selectPhotoBtn, 'click', () => photoInput.click());
      this.addEventListener(photoInput, 'change', (e) => {
        this.handlePhotoSelect(e.target.files[0]);
      });
    }

    // 表单提交
    const form = this.container.querySelector('#diary-form');
    if (form) {
      this.addEventListener(form, 'submit', (e) => this.saveDiaryRecord(e));
    }

    // 删除按钮
    const deleteBtn = this.container.querySelector('#btn-delete-diary');
    if (deleteBtn) {
      this.addEventListener(deleteBtn, 'click', () => this.deleteDiaryRecord());
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
      // 有心情显示心情，没有心情不显示
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
    const modal = this.container.querySelector('#modal-diary-editor');
    const dateInput = this.container.querySelector('#diary-date');
    const deleteBtn = this.container.querySelector('#btn-delete-diary');
    
    // 设置日期
    const selectedDate = date || new Date().toISOString().split('T')[0];
    dateInput.value = selectedDate;
    this.currentEditingDate = selectedDate;
    
    // 加载已有记录
    const existingRecord = getDiaryByDate(selectedDate);
    if (existingRecord) {
      this.loadDiaryRecord(existingRecord);
      // 显示删除按钮
      if (deleteBtn) deleteBtn.classList.remove('hidden');
    } else {
      this.resetDiaryForm();
      // 隐藏删除按钮
      if (deleteBtn) deleteBtn.classList.add('hidden');
    }
    
    // 显示弹窗
    modal.classList.remove('hidden');
  }

  closeDiaryEditor() {
    const modal = this.container.querySelector('#modal-diary-editor');
    modal.classList.add('hidden');
    this.resetDiaryForm();
    this.currentEditingDate = null;
  }

  deleteDiaryRecord() {
    if (!this.currentEditingDate) return;
    
    if (confirm('确定要删除这条记录吗？')) {
      deleteDiaryRecord(this.currentEditingDate);
      this.showToast('记录已删除');
      this.closeDiaryEditor();
      this.renderCalendar();
      this.renderStats();
    }
  }

  loadDiaryRecord(record) {
    const colorInput = this.container.querySelector('#diary-color');
    const materialInput = this.container.querySelector('#diary-material');
    const noteInput = this.container.querySelector('#diary-note');
    
    if (colorInput) colorInput.value = record.color || '';
    if (materialInput) materialInput.value = record.material || '';
    if (noteInput) noteInput.value = record.note || '';
    
    // 设置心情
    if (record.mood) {
      this.container.querySelectorAll('.mood-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mood === record.mood);
      });
    }
    
    // 设置照片预览
    if (record.image) {
      this.showPhotoPreview(record.image);
    }
  }

  resetDiaryForm() {
    const form = this.container.querySelector('#diary-form');
    if (form) form.reset();
    
    this.container.querySelectorAll('.mood-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    this.hidePhotoPreview();
  }

  selectMood(moodBtn) {
    this.container.querySelectorAll('.mood-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    moodBtn.classList.add('active');
  }

  handlePhotoSelect(file) {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      this.showPhotoPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  showPhotoPreview(imageSrc) {
    const preview = this.container.querySelector('#diary-photo-preview');
    if (preview) {
      preview.innerHTML = `<img src="${imageSrc}" alt="预览">`;
      preview.classList.remove('hidden');
    }
  }

  hidePhotoPreview() {
    const preview = this.container.querySelector('#diary-photo-preview');
    if (preview) {
      preview.innerHTML = '';
      preview.classList.add('hidden');
    }
  }

  saveDiaryRecord(e) {
    e.preventDefault();
    
    const date = this.container.querySelector('#diary-date').value;
    const color = this.container.querySelector('#diary-color').value;
    const material = this.container.querySelector('#diary-material').value;
    const note = this.container.querySelector('#diary-note').value;
    
    const selectedMood = this.container.querySelector('.mood-btn.active');
    const mood = selectedMood ? selectedMood.dataset.mood : 'happy';
    
    const preview = this.container.querySelector('#diary-photo-preview img');
    const image = preview ? preview.src : null;
    
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
    this.renderCalendar();
    this.renderStats();
  }

  showToast(message) {
    // 使用全局 toast 或简单 alert
    if (window.showToast) {
      window.showToast(message);
    } else {
      alert(message);
    }
  }

  onUnmount() {
    this.eventsBound = false;
  }
}
