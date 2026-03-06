/**
 * Upload Controller - 记录今日穿搭控制器
 */

import { BaseController } from './base.js';
import { goBack, navigateTo } from '../core/router.js';
import { saveDiaryRecord, getDiaryByDate } from '../utils/diary.js';
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
    const today = getTodayString();
    
    // 设置日期为今天
    const dateInput = this.container.querySelector('#upload-date');
    if (dateInput) {
      dateInput.value = today;
    }
    
    // 尝试加载今天的记录
    const existingRecord = getDiaryByDate(today);
    
    if (existingRecord) {
      // 填充已有记录
      this.loadExistingRecord(existingRecord);
    } else {
      // 重置表单状态
      this.resetForm();
    }
  }
  
  loadExistingRecord(record) {
    // 加载心情
    this.selectedMood = record.mood || null;
    if (this.selectedMood) {
      const moodBtns = this.container.querySelectorAll('.mood-btn');
      moodBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mood === this.selectedMood);
      });
      const moodInput = this.container.querySelector('#upload-mood');
      if (moodInput) moodInput.value = this.selectedMood;
    }
    
    // 加载颜色
    const colorInput = this.container.querySelector('#upload-color');
    if (colorInput) colorInput.value = record.color || '';
    
    // 加载材质
    const materialInput = this.container.querySelector('#upload-material');
    if (materialInput) materialInput.value = record.material || '';
    
    // 加载照片
    if (record.image) {
      this.imageData = record.image;
      const placeholder = this.container.querySelector('#upload-placeholder');
      const preview = this.container.querySelector('#photo-preview');
      const previewImg = this.container.querySelector('#preview-image');
      if (previewImg) previewImg.src = this.imageData;
      if (placeholder) placeholder.classList.add('hidden');
      if (preview) preview.classList.remove('hidden');
    }
    
    // 加载备注
    const noteInput = this.container.querySelector('#upload-note');
    if (noteInput) noteInput.value = record.note || '';
  }
  
  resetForm() {
    // 重置表单状态
    this.selectedMood = null;
    this.imageData = null;
    
    // 重置心情选择
    const moodBtns = this.container.querySelectorAll('.mood-btn');
    moodBtns.forEach(btn => btn.classList.remove('active'));
    
    // 重置颜色
    const colorInput = this.container.querySelector('#upload-color');
    if (colorInput) colorInput.value = '';
    
    // 重置材质
    const materialInput = this.container.querySelector('#upload-material');
    if (materialInput) materialInput.value = '';
    
    // 重置照片预览
    const placeholder = this.container.querySelector('#upload-placeholder');
    const preview = this.container.querySelector('#photo-preview');
    if (placeholder) placeholder.classList.remove('hidden');
    if (preview) preview.classList.add('hidden');
    
    // 重置备注
    const noteInput = this.container.querySelector('#upload-note');
    if (noteInput) noteInput.value = '';
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
    
    // 延迟跳转到画像页的日记标签
    setTimeout(() => {
      // 设置标志，让画像页自动切换到日记标签
      sessionStorage.setItem('profile_auto_switch_tab', 'diary');
      navigateTo('/profile');
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
