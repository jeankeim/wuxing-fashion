/**
 * Loading Controller - 计算加载页控制器
 * 显示五行能量动画和文案轮播
 */

import { BaseController } from './base.js';
import { navigateTo } from '../core/router.js';

export class LoadingController extends BaseController {
  constructor() {
    super();
    this.containerId = 'view-loading';
    this.loadingMessages = [
      '正在分析八字喜用...',
      '正在匹配节气五行...',
      '正在结合天气材质...',
      '正在校准五行能量...',
      '正在生成穿搭方案...'
    ];
    this.currentMessageIndex = 0;
    this.progress = 0;
    this.loadingInterval = null;
    this.messageInterval = null;
    this.minLoadingTime = 1500; // 最小加载时间 1.5秒
    this.maxLoadingTime = 3000; // 最大加载时间 3秒
    this.startTime = 0;
    this.navigated = false;
    this.eventsBound = false;
  }

  onMount() {
    // 重置导航状态，确保每次进入都能正常跳转
    this.navigated = false;
    this.startTime = Date.now();
    this.initLoading();
  }

  onUnmount() {
    this.clearIntervals();
    // 重置所有状态，确保下次进入是全新的
    this.navigated = false;
    this.progress = 0;
    this.currentMessageIndex = 0;
    this.canNavigate = false;
    this.startTime = 0;
  }

  initLoading() {
    // 随机打乱文案顺序
    this.shuffleMessages();
    
    // 开始文案轮播
    this.startMessageRotation();
    
    // 开始进度条
    this.startProgress();
    
    // 自动跳转到结果页
    this.scheduleNavigation();
  }

  shuffleMessages() {
    // Fisher-Yates 洗牌算法
    for (let i = this.loadingMessages.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.loadingMessages[i], this.loadingMessages[j]] = 
      [this.loadingMessages[j], this.loadingMessages[i]];
    }
  }

  startMessageRotation() {
    const messageEl = document.getElementById('loading-message');
    if (!messageEl) return;

    // 立即显示第一条
    messageEl.textContent = this.loadingMessages[0];
    
    // 每 600ms 切换一条（1.5秒至少显示2-3条）
    this.messageInterval = setInterval(() => {
      this.currentMessageIndex = (this.currentMessageIndex + 1) % this.loadingMessages.length;
      messageEl.style.opacity = '0';
      
      setTimeout(() => {
        messageEl.textContent = this.loadingMessages[this.currentMessageIndex];
        messageEl.style.opacity = '1';
      }, 200);
    }, 600);
  }

  startProgress() {
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    if (!progressFill || !progressText) return;

    const updateInterval = 30; // 每30ms更新一次，让进度条更流畅
    const increment = 100 / (this.maxLoadingTime / updateInterval);

    this.loadingInterval = setInterval(() => {
      this.progress += increment;
      
      if (this.progress >= 100) {
        this.progress = 100;
        this.clearIntervals();
        // 进度100%立即跳转
        this.navigateToResults();
      }
      
      progressFill.style.width = `${this.progress}%`;
      progressText.textContent = `${Math.floor(this.progress)}%`;
    }, updateInterval);
  }

  scheduleNavigation() {
    // 确保至少显示 1.5 秒
    setTimeout(() => {
      this.canNavigate = true;
      // 如果已到最大时间，自动跳转
      const elapsed = Date.now() - this.startTime;
      if (elapsed >= this.maxLoadingTime) {
        this.navigateToResults();
      }
    }, this.minLoadingTime);

    // 最大 3 秒后强制跳转
    setTimeout(() => {
      this.navigateToResults();
    }, this.maxLoadingTime);
  }

  navigateToResults() {
    if (this.navigated) return;
    
    // 检查是否已达到最小加载时间（仅用于跳过按钮，现在已移除）
    const elapsed = Date.now() - this.startTime;
    if (elapsed < this.minLoadingTime) {
      setTimeout(() => this.navigateToResults(), this.minLoadingTime - elapsed);
      return;
    }
    
    this.navigated = true;
    this.clearIntervals();
    navigateTo('/results');
  }

  clearIntervals() {
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
      this.loadingInterval = null;
    }
    if (this.messageInterval) {
      clearInterval(this.messageInterval);
      this.messageInterval = null;
    }
  }
}
