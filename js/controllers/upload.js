/**
 * Upload Controller - 上传页控制器
 */

import { BaseController } from './base.js';
import { goBack } from '../router.js';
import { updateUploadPreview } from '../render.js';
import { outfitRepo } from '../repository.js';
import { getTodayString } from '../upload.js';

export class UploadController extends BaseController {
  init() {
    this.container = document.getElementById('view-upload');
    this.uploadZone = this.container.querySelector('#upload-zone');
    this.fileInput = this.container.querySelector('#upload-input');
  }

  onMount() {
    // 检查今日是否已有上传
    const todayImage = outfitRepo.getByDate(getTodayString());
    if (todayImage) {
      updateUploadPreview(todayImage);
    }
  }

  bindEvents() {
    // 返回按钮
    const backBtn = this.container.querySelector('#btn-back-results');
    if (backBtn) {
      this.addEventListener(backBtn, 'click', () => {
        goBack();
      });
    }

    // 上传区域点击
    if (this.uploadZone) {
      this.addEventListener(this.uploadZone, 'click', () => {
        this.fileInput?.click();
      });
    }

    // 文件选择
    if (this.fileInput) {
      this.addEventListener(this.fileInput, 'change', (e) => {
        this.handleFileSelect(e);
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
  }

  handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    // TODO: 验证和压缩图片
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target.result;
      outfitRepo.save(getTodayString(), imageData);
      updateUploadPreview(imageData);
      this.showToast('上传成功');
    };
    reader.readAsDataURL(file);
  }

  removeImage() {
    outfitRepo.remove(getTodayString());
    updateUploadPreview(null);
    this.showToast('已移除');
  }

  saveFeedback() {
    const textarea = this.container.querySelector('#feedback-text');
    const feedback = textarea?.value?.trim();
    
    if (!feedback) {
      this.showToast('请输入反馈内容');
      return;
    }

    // TODO: 保存反馈
    this.showToast('反馈已保存');
    if (textarea) textarea.value = '';
  }
}
