/**
 * Main Module - 应用入口
 */

import * as storage from './storage.js';
import { detectCurrentTerm, getWuxingColor } from './solar-terms.js';
import { analyzeBazi } from './bazi.js';
import { generateRecommendation, regenerateRecommendation } from './engine.js';
import {
  showView, initYearSelect, initDaySelect,
  renderSolarBanner, renderResultHeader, renderSchemeCards,
  renderDetailModal, showModal, closeModal,
  updateUploadPreview, showToast
} from './render.js';
import { validateFile, compressImage, initUploadZone, getTodayString } from './upload.js';

// 应用状态
let currentTermInfo = null;
let currentWishId = null;
let currentBaziResult = null;
let currentResult = null;

/**
 * 初始化应用
 */
async function init() {
  console.log('[App] Initializing...');
  
  // 加载节气信息
  currentTermInfo = await detectCurrentTerm();
  console.log('[App] Current term:', currentTermInfo?.current?.name);
  
  // 初始化表单
  initYearSelect();
  initDaySelect();
  
  // 渲染节气横幅
  renderSolarBanner(currentTermInfo);
  
  // 恢复上次选择的心愿
  const savedWish = storage.getSelectedWish();
  if (savedWish) {
    selectWish(savedWish);
  }
  
  // 恢复上次的八字
  const savedBazi = storage.getLastBazi();
  if (savedBazi) {
    restoreBaziForm(savedBazi);
  }
  
  // 绑定事件
  bindEvents();
  
  // 初始化上传区域
  initUploadZone(handleFileUpload);
  
  // 首次访问标记
  if (storage.isFirstVisit()) {
    storage.markVisited();
  }
  
  // 统计访问
  storage.incrementUsage('visits');
  
  console.log('[App] Initialized successfully');
}

/**
 * 绑定事件
 */
function bindEvents() {
  // 开始按钮
  document.getElementById('btn-start')?.addEventListener('click', () => {
    showView('view-entry');
  });
  
  // 返回按钮
  document.getElementById('btn-back-welcome')?.addEventListener('click', () => {
    showView('view-welcome');
  });
  
  document.getElementById('btn-back-entry')?.addEventListener('click', () => {
    showView('view-entry');
  });
  
  document.getElementById('btn-back-results')?.addEventListener('click', () => {
    showView('view-results');
  });
  
  // 心愿选择
  document.querySelectorAll('.wish-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const wishId = tag.dataset.wish;
      selectWish(wishId);
    });
  });
  
  // 生成按钮
  document.getElementById('btn-generate')?.addEventListener('click', handleGenerate);
  
  // 换一批
  document.getElementById('btn-regenerate')?.addEventListener('click', handleRegenerate);
  
  // 上传按钮
  document.getElementById('btn-upload')?.addEventListener('click', () => {
    showView('view-upload');
    // 检查今日是否有已上传的图片
    const todayImage = storage.getUploadedOutfit(getTodayString());
    if (todayImage) {
      updateUploadPreview(todayImage);
    }
  });
  
  // 移除图片
  document.getElementById('btn-remove-image')?.addEventListener('click', (e) => {
    e.stopPropagation();
    storage.removeUploadedOutfit(getTodayString());
    updateUploadPreview(null);
  });
  
  // 保存反馈
  document.getElementById('btn-save-feedback')?.addEventListener('click', handleSaveFeedback);
  
  // 详情按钮委托
  document.getElementById('scheme-cards')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.scheme-detail-btn');
    if (btn) {
      const index = parseInt(btn.dataset.index, 10);
      const schemes = window.__currentSchemes;
      if (schemes && schemes[index]) {
        renderDetailModal(schemes[index]);
        showModal('modal-detail');
      }
    }
  });
  
  // 关闭模态框
  document.querySelector('#modal-detail .modal-close')?.addEventListener('click', () => {
    closeModal('modal-detail');
  });
  
  document.querySelector('#modal-detail .modal-backdrop')?.addEventListener('click', () => {
    closeModal('modal-detail');
  });
  
  // ESC关闭模态框
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal('modal-detail');
    }
  });
}

/**
 * 选择心愿
 */
function selectWish(wishId) {
  document.querySelectorAll('.wish-tag').forEach(tag => {
    tag.classList.toggle('active', tag.dataset.wish === wishId);
  });
  currentWishId = wishId;
  storage.saveSelectedWish(wishId);
}

/**
 * 恢复八字表单
 */
function restoreBaziForm(bazi) {
  const { year, month, day, hour } = bazi;
  
  if (year) document.getElementById('bazi-year').value = year;
  if (month) document.getElementById('bazi-month').value = month;
  if (day) document.getElementById('bazi-day').value = day;
  if (hour !== undefined) document.getElementById('bazi-hour').value = hour;
}

/**
 * 获取八字表单数据
 */
function getBaziFormData() {
  const year = document.getElementById('bazi-year')?.value;
  const month = document.getElementById('bazi-month')?.value;
  const day = document.getElementById('bazi-day')?.value;
  const hour = document.getElementById('bazi-hour')?.value;
  
  if (year && month && day && hour !== '') {
    return {
      year: parseInt(year, 10),
      month: parseInt(month, 10),
      day: parseInt(day, 10),
      hour: parseInt(hour, 10)
    };
  }
  
  return null;
}

/**
 * 处理生成
 */
async function handleGenerate() {
  console.log('[App] Generating recommendation...');
  
  // 获取八字数据
  const baziForm = getBaziFormData();
  
  if (baziForm) {
    // 保存八字
    storage.saveLastBazi(baziForm);
    // 计算八字
    currentBaziResult = analyzeBazi(
      baziForm.year,
      baziForm.month,
      baziForm.day,
      baziForm.hour
    );
    console.log('[App] Bazi:', currentBaziResult?.bazi?.fullBazi);
  } else {
    currentBaziResult = null;
  }
  
  // 生成推荐
  currentResult = await generateRecommendation(
    currentTermInfo,
    currentWishId,
    currentBaziResult
  );
  
  if (currentResult && currentResult.schemes.length > 0) {
    // 保存结果
    storage.saveLastResult(currentResult);
    storage.incrementUsage('generates');
    
    // 渲染结果
    renderResultHeader(currentTermInfo);
    renderSchemeCards(currentResult.schemes);
    
    // 切换视图
    showView('view-results');
  } else {
    showToast('生成失败，请重试');
  }
}

/**
 * 处理换一批
 */
async function handleRegenerate() {
  console.log('[App] Regenerating...');
  
  const excludeIds = currentResult?.schemes?.map(s => s.id) || [];
  
  const newResult = await regenerateRecommendation(
    currentTermInfo,
    currentWishId,
    currentBaziResult,
    excludeIds
  );
  
  if (newResult && newResult.schemes.length > 0) {
    currentResult = newResult;
    storage.saveLastResult(currentResult);
    renderSchemeCards(currentResult.schemes);
    showToast('已为您换一批');
  } else {
    showToast('暂无更多推荐');
  }
}

/**
 * 处理文件上传
 */
async function handleFileUpload(file) {
  const validation = validateFile(file);
  
  if (!validation.valid) {
    showToast(validation.error);
    return;
  }
  
  try {
    const compressed = await compressImage(file);
    storage.saveUploadedOutfit(getTodayString(), compressed);
    storage.incrementUsage('uploads');
    updateUploadPreview(compressed);
    showToast('上传成功');
  } catch (error) {
    console.error('[App] Upload error:', error);
    showToast('上传失败，请重试');
  }
}

/**
 * 处理保存反馈
 */
function handleSaveFeedback() {
  const textarea = document.getElementById('feedback-text');
  const feedback = textarea?.value?.trim();
  
  if (!feedback) {
    showToast('请输入反馈内容');
    return;
  }
  
  storage.saveFeedback(getTodayString(), {
    text: feedback,
    savedAt: new Date().toISOString()
  });
  
  showToast('反馈已保存');
  textarea.value = '';
}

// 启动应用
document.addEventListener('DOMContentLoaded', init);
