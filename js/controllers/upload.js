/**
 * Upload Controller - 记录今日穿搭控制器
 */

import { BaseController } from './base.js';
import { goBack, navigateTo } from '../core/router.js';
import { saveDiaryRecord } from '../utils/diary.js';
import { getTodayString } from '../utils/upload.js';

export class UploadController extends BaseController {
  constructor() {
    super();
    this.containerId = 'view-upload';
    this.selectedMood = null;
    this.imageData = null;
  }

  onMount() {
    // 动态获取容器（视图是动态加载的）
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error('[UploadController] Container not found');
      return;
    }
    
    // 初始化表单
    this.initForm();
  }

  initForm() {
    // 设置日期为今天
    const dateInput = this.container.querySelector('#upload-date');
    if (dateInput) {
      dateInput.value = getTodayString();
    }
    
    // 重置表单状态
    this.selectedMood = null;
    this.imageData = null;
    
    // 重置心情选择
    const moodBtns = this.container.querySelectorAll('.mood-btn');
    moodBtns.forEach(btn => btn.classList.remove('active'));
    
    // 重置照片预览
    const placeholder = this.container.querySelector('#upload-placeholder');
    const preview = this.container.querySelector('#photo-preview');
    if (placeholder) placeholder.classList.remove('hidden');
    if (preview) preview.classList.add('hidden');
  }

  bindEvents() {
    // 返回按钮
    const backBtn = this.container.querySelector('#btn-back-results');
    if (backBtn) {
      this.addEventListener(backBtn, 'click', () => {
        goBack();
      });
    }

    // 关闭应用按钮
    const closeBtn = this.container.querySelector('#btn-close-app');
    if (closeBtn) {
      this.addEventListener(closeBtn, 'click', () => {
        this.closeApp();
      });
    }

    // 心情选择
    const moodSelector = this.container.querySelector('#mood-selector');
    if (moodSelector) {
      this.addEventListener(moodSelector, 'click', (e) => {
        const moodBtn = e.target.closest('.mood-btn');
        if (!moodBtn) return;
        
        // 移除其他选中状态
        moodSelector.querySelectorAll('.mood-btn').forEach(btn => {
          btn.classList.remove('active');
        });
        
        // 设置当前选中
        moodBtn.classList.add('active');
        this.selectedMood = moodBtn.dataset.mood;
        
        // 更新隐藏字段
        const moodInput = this.container.querySelector('#upload-mood');
        if (moodInput) moodInput.value = this.selectedMood;
      });
    }

    // 照片上传区域点击
    const photoZone = this.container.querySelector('#photo-upload-zone');
    const photoInput = this.container.querySelector('#upload-photo');
    
    if (photoZone) {
      this.addEventListener(photoZone, 'click', (e) => {
        // 如果点击的是移除按钮，不触发上传
        if (e.target.closest('#btn-remove-photo')) return;
        photoInput?.click();
      });
    }

    // 文件选择
    if (photoInput) {
      this.addEventListener(photoInput, 'change', (e) => {
        this.handleFileSelect(e);
      });
    }

    // 移除照片按钮
    const removePhotoBtn = this.container.querySelector('#btn-remove-photo');
    if (removePhotoBtn) {
      this.addEventListener(removePhotoBtn, 'click', (e) => {
        e.stopPropagation();
        this.removePhoto();
      });
    }

    // 表单提交
    const form = this.container.querySelector('#upload-form');
    if (form) {
      this.addEventListener(form, 'submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
    }
  }

  handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      this.showToast('请选择图片文件');
      return;
    }

    // 验证文件大小（5MB）
    if (file.size > 5 * 1024 * 1024) {
      this.showToast('图片大小不能超过5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      this.imageData = event.target.result;
      this.showPhotoPreview();
    };
    reader.readAsDataURL(file);
  }

  showPhotoPreview() {
    const placeholder = this.container.querySelector('#upload-placeholder');
    const preview = this.container.querySelector('#photo-preview');
    const previewImg = this.container.querySelector('#preview-image');
    
    if (previewImg) previewImg.src = this.imageData;
    if (placeholder) placeholder.classList.add('hidden');
    if (preview) preview.classList.remove('hidden');
  }

  removePhoto() {
    this.imageData = null;
    
    const placeholder = this.container.querySelector('#upload-placeholder');
    const preview = this.container.querySelector('#photo-preview');
    const photoInput = this.container.querySelector('#upload-photo');
    
    if (placeholder) placeholder.classList.remove('hidden');
    if (preview) preview.classList.add('hidden');
    if (photoInput) photoInput.value = '';
  }

  handleSubmit() {
    // 验证必填项
    if (!this.selectedMood) {
      this.showToast('请选择今日心情');
      return;
    }
    
    if (!this.imageData) {
      this.showToast('请上传穿搭照片');
      return;
    }

    const today = getTodayString();
    const color = this.container.querySelector('#upload-color')?.value?.trim() || '';
    const material = this.container.querySelector('#upload-material')?.value?.trim() || '';
    const note = this.container.querySelector('#upload-note')?.value?.trim() || '';

    // 构建日记记录
    const diaryRecord = {
      date: today,
      mood: this.selectedMood,
      color: color,
      material: material,
      image: this.imageData,
      note: note,
      source: 'upload'
    };

    // 保存记录
    saveDiaryRecord(today, diaryRecord);
    
    this.showToast('记录保存成功！');
    
    // 延迟跳转到画像页的日记时间线
    setTimeout(() => {
      navigateTo('/profile');
      
      // 在画像页滚动到日记时间线位置
      setTimeout(() => {
        // 找到日记时间线 section（包含"时间线"标题的 diary-section）
        const diarySections = document.querySelectorAll('.diary-section');
        let timelineSection = null;
        
        diarySections.forEach(section => {
          const title = section.querySelector('.diary-section-title');
          if (title && title.textContent.includes('时间线')) {
            timelineSection = section;
          }
        });
        
        if (timelineSection) {
          timelineSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    }, 800);
  }

  closeApp() {
    // 尝试关闭窗口
    if (window.close) {
      window.close();
    } else {
      // 返回首页
      navigateTo('/');
      this.showToast('已返回首页');
    }
  }

  onUnmount() {
    this.selectedMood = null;
    this.imageData = null;
  }
}
