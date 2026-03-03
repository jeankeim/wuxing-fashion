/**
 * Upload Controller - 上传页控制器
 */

import { BaseController } from './base.js';
import { goBack, navigateTo } from '../core/router.js';
import { updateUploadPreview } from '../utils/render.js';
import { outfitRepo } from '../data/repository.js';
import { getTodayString } from '../utils/upload.js';
import { saveDiaryRecord, deleteDiaryRecord, getDiaryByDate } from '../utils/diary.js';

export class UploadController extends BaseController {
  constructor() {
    super();
    this.containerId = 'view-upload';
  }


  onMount() {
    // 动态获取容器（视图是动态加载的）
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error('[UploadController] Container not found');
      return;
    }
    
    // 重新绑定事件
    this.bindEvents();
    // 检查今日是否已有上传
    const todayImage = outfitRepo.getByDate(getTodayString());
    if (todayImage) {
      updateUploadPreview(todayImage);
    }
  }

  bindEvents() {
    // 避免重复绑定
    if (this.eventsBound) {
      console.log('[UploadController] Events already bound, skipping');
      return;
    }
    this.eventsBound = true;
    
    // 获取 DOM 元素
    this.uploadZone = this.container?.querySelector('#upload-zone');
    this.fileInput = this.container?.querySelector('#upload-input');
    
    console.log('[UploadController] bindEvents called', {
      container: this.container,
      uploadZone: this.uploadZone,
      fileInput: this.fileInput
    });
    
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

    // 上传区域点击
    if (this.uploadZone) {
      this.addEventListener(this.uploadZone, 'click', (e) => {
        // 如果点击的是按钮，不触发上传
        if (e.target.closest('button')) return;
        this.fileInput?.click();
      });
    }

    // 文件选择
    if (this.fileInput) {
      this.addEventListener(this.fileInput, 'change', (e) => {
        this.handleFileSelect(e);
      });
    }

    // 修改图片按钮
    const changeBtn = this.container.querySelector('#btn-change-image');
    if (changeBtn) {
      this.addEventListener(changeBtn, 'click', (e) => {
        e.stopPropagation();
        this.fileInput?.click();
      });
    }

    // 移除图片
    const removeBtn = this.container.querySelector('#btn-remove-image');
    if (removeBtn) {
      this.addEventListener(removeBtn, 'click', (e) => {
        e.stopPropagation();
        this.removeImage();
      });
    }

    // 保存反馈
    const saveFeedbackBtn = this.container.querySelector('#btn-save-feedback');
    if (saveFeedbackBtn) {
      this.addEventListener(saveFeedbackBtn, 'click', () => {
        this.saveFeedback();
      });
    }

    // 发朋友圈按钮
    const shareBtn = this.container.querySelector('#btn-share-moments');
    if (shareBtn) {
      this.addEventListener(shareBtn, 'click', () => {
        this.shareToMoments();
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
      const imageData = event.target.result;
      const today = getTodayString();
      
      // 保存到上传记录
      outfitRepo.save(today, imageData);
      
      // 同步保存到日记（打通功能）
      saveDiaryRecord(today, {
        image: imageData,
        note: '',
        source: 'upload'
      });
      
      updateUploadPreview(imageData);
      this.showUploadSuccess();
    };
    reader.readAsDataURL(file);
  }

  showUploadSuccess() {
    // 显示成功提示
    const successEl = this.container.querySelector('#upload-success');
    const shareSection = this.container.querySelector('#share-section');
    
    if (successEl) {
      successEl.classList.remove('hidden');
      // 3秒后隐藏
      setTimeout(() => {
        successEl.classList.add('hidden');
      }, 3000);
    }
    
    // 显示操作按钮区域
    const actionSection = this.container.querySelector('#action-section');
    if (actionSection) {
      actionSection.classList.remove('hidden');
    }
    
    this.showToast('上传成功，已同步到日记');
  }

  removeImage() {
    const today = getTodayString();
    
    // 删除上传记录
    outfitRepo.remove(today);
    
    // 删除日记记录
    deleteDiaryRecord(today);
    
    updateUploadPreview(null);
    
    // 隐藏操作按钮区域
    const actionSection = this.container.querySelector('#action-section');
    if (actionSection) {
      actionSection.classList.add('hidden');
    }
    
    this.showToast('已删除');
  }

  shareToMoments() {
    const today = getTodayString();
    const imageData = outfitRepo.getByDate(today);
    
    if (!imageData) {
      this.showToast('请先上传照片');
      return;
    }

    // 尝试使用原生分享API
    if (navigator.share) {
      navigator.share({
        title: '今日穿搭',
        text: '分享我的今日穿搭',
        url: window.location.href
      }).then(() => {
        this.showToast('分享成功');
      }).catch(() => {
        // 用户取消或其他错误
        this.fallbackShare(imageData);
      });
    } else {
      this.fallbackShare(imageData);
    }
  }

  fallbackShare(imageData) {
    // 复制图片到剪贴板或下载
    const link = document.createElement('a');
    link.download = `穿搭-${getTodayString()}.png`;
    link.href = imageData;
    link.click();
    
    this.showToast('图片已下载，请手动分享到朋友圈');
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

  saveFeedback() {
    const textarea = this.container.querySelector('#feedback-text');
    const feedback = textarea?.value?.trim();
    
    if (!feedback) {
      this.showToast('请输入反馈内容');
      return;
    }

    const today = getTodayString();
    const imageData = outfitRepo.getByDate(today);
    
    // 获取现有日记记录或创建新记录
    const existingRecord = getDiaryByDate(today) || {};
    
    // 保存反馈到日记（使用 note 字段存储反馈）
    saveDiaryRecord(today, {
      ...existingRecord,
      image: imageData || existingRecord.image,
      note: feedback,
      source: existingRecord.source || 'upload'
    });
    
    this.showToast('反馈已保存到日记');
    if (textarea) textarea.value = '';
  }

  onUnmount() {
    this.eventsBound = false;
  }
}