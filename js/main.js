/**
 * Main Module - 应用入口
 */

import * as storage from './storage.js';
import { detectCurrentTerm, getWuxingColor } from './solar-terms.js';
import { analyzeBazi, analyzeBaziPrecise } from './bazi.js';
import { generateRecommendation, regenerateRecommendation, recordFeedback, SCENES } from './engine.js';
import {
  showView, initYearSelect, initDaySelect,
  renderSolarBanner, renderResultHeader, renderSchemeCards,
  renderDetailModal, showModal, closeModal,
  updateUploadPreview, showToast, renderFavoritesList
} from './render.js';
import { validateFile, compressImage, initUploadZone, getTodayString } from './upload.js';
import { initGlobalErrorHandler, withErrorHandler, ErrorTypes } from './error-handler.js';
import { addFavorite, removeFavorite, isFavorite, getFavorites } from './storage.js';
import { store, StateKeys, ViewNames } from './store.js';
import { showShareMenu } from './share.js';

// 便捷访问状态的方法
const getState = (key) => store.get(key);
const setState = (key, value) => store.set(key, value);

/**
 * 初始化应用
 */
async function init() {
  console.log('[App] Initializing...');
  
  // 初始化全局错误处理
  initGlobalErrorHandler();
  
  // 订阅状态变化（用于调试）
  store.subscribe(StateKeys.CURRENT_VIEW, (view) => {
    console.log('[Store] View changed to:', view);
  });
  
  // 加载节气信息
  const termInfo = await withErrorHandler(detectCurrentTerm, {
    errorType: ErrorTypes.NETWORK,
    customMessage: '节气数据加载失败'
  })();
  
  if (termInfo) {
    setState(StateKeys.CURRENT_TERM_INFO, termInfo);
    console.log('[App] Current term:', termInfo.current?.name);
  }
  
  // 初始化表单
  initYearSelect();
  initDaySelect();
  
  // 渲染节气横幅
  renderSolarBanner(getState(StateKeys.CURRENT_TERM_INFO));
  
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
  
  // 恢复精度设置
  const savedPrecision = getPrecision();
  switchPrecision(savedPrecision);
  
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
 * 当前场景
 */
let currentSceneId = 'daily';

/**
 * 绑定事件
 */
function bindEvents() {
  // 开始按钮
  document.getElementById('btn-start')?.addEventListener('click', () => {
    showView(ViewNames.ENTRY);
    setState(StateKeys.CURRENT_VIEW, ViewNames.ENTRY);
  });
  
  // 场景选择
  document.querySelectorAll('.scene-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const sceneId = tag.dataset.scene;
      selectScene(sceneId);
    });
  });
  
  // 返回按钮
  document.getElementById('btn-back-welcome')?.addEventListener('click', () => {
    showView(ViewNames.WELCOME);
    setState(StateKeys.CURRENT_VIEW, ViewNames.WELCOME);
  });
  
  document.getElementById('btn-back-entry')?.addEventListener('click', () => {
    showView(ViewNames.ENTRY);
    setState(StateKeys.CURRENT_VIEW, ViewNames.ENTRY);
  });
  
  document.getElementById('btn-back-results')?.addEventListener('click', () => {
    showView(ViewNames.RESULTS);
    setState(StateKeys.CURRENT_VIEW, ViewNames.RESULTS);
  });
  
  // 心愿选择
  document.querySelectorAll('.wish-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const wishId = tag.dataset.wish;
      selectWish(wishId);
    });
  });
  
  // 精度切换
  document.querySelectorAll('.precision-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const precision = btn.dataset.precision;
      switchPrecision(precision);
    });
  });
  
  // 生成按钮
  document.getElementById('btn-generate')?.addEventListener('click', handleGenerate);
  
  // 换一批
  document.getElementById('btn-regenerate')?.addEventListener('click', handleRegenerate);
  
  // 上传按钮
  document.getElementById('btn-upload')?.addEventListener('click', () => {
    showView(ViewNames.UPLOAD);
    setState(StateKeys.CURRENT_VIEW, ViewNames.UPLOAD);
    // 检查今日是否有已上传的图片
    const todayImage = storage.getUploadedOutfit(getTodayString());
    if (todayImage) {
      updateUploadPreview(todayImage);
    }
  });
  
  // 收藏按钮
  document.getElementById('btn-favorites')?.addEventListener('click', () => {
    const favorites = getFavorites();
    renderFavoritesList(favorites);
    showView(ViewNames.FAVORITES);
    setState(StateKeys.CURRENT_VIEW, ViewNames.FAVORITES);
  });
  
  // 从收藏页返回
  document.getElementById('btn-back-results-from-fav')?.addEventListener('click', () => {
    showView(ViewNames.RESULTS);
    setState(StateKeys.CURRENT_VIEW, ViewNames.RESULTS);
  });
  
  // 移除图片
  document.getElementById('btn-remove-image')?.addEventListener('click', (e) => {
    e.stopPropagation();
    storage.removeUploadedOutfit(getTodayString());
    updateUploadPreview(null);
  });
  
  // 保存反馈
  document.getElementById('btn-save-feedback')?.addEventListener('click', handleSaveFeedback);
  
  // 详情按钮、收藏按钮和分享按钮委托
  document.getElementById('scheme-cards')?.addEventListener('click', (e) => {
    const detailBtn = e.target.closest('.scheme-detail-btn');
    const favoriteBtn = e.target.closest('.scheme-favorite-btn');
    const shareBtn = e.target.closest('.scheme-share-btn');
    
    if (detailBtn) {
      const index = parseInt(detailBtn.dataset.index, 10);
      const schemes = window.__currentSchemes;
      if (schemes && schemes[index]) {
        renderDetailModal(schemes[index]);
        showModal('modal-detail');
      }
    }
    
    if (favoriteBtn) {
      const index = parseInt(favoriteBtn.dataset.index, 10);
      const schemes = window.__currentSchemes;
      if (schemes && schemes[index]) {
        const scheme = schemes[index];
        const favorited = isFavorite(scheme.id);
        
        if (favorited) {
          removeFavorite(scheme.id);
          favoriteBtn.classList.remove('active');
          favoriteBtn.setAttribute('aria-label', '收藏');
          favoriteBtn.querySelector('svg').setAttribute('fill', 'none');
          showToast('已取消收藏');
        } else {
          addFavorite(scheme);
          favoriteBtn.classList.add('active');
          favoriteBtn.setAttribute('aria-label', '取消收藏');
          favoriteBtn.querySelector('svg').setAttribute('fill', 'currentColor');
          showToast('已收藏');
          
          // 记录反馈
          recordFeedback(scheme.id, 'favorite', {
            wuxing: scheme.color.wuxing,
            color: scheme.color.name,
            material: scheme.material
          });
        }
      }
    }
    
    if (shareBtn) {
      const index = parseInt(shareBtn.dataset.index, 10);
      const schemes = window.__currentSchemes;
      if (schemes && schemes[index]) {
        const scheme = schemes[index];
        const termInfo = getState(StateKeys.CURRENT_TERM_INFO);
        showShareMenu(scheme, termInfo);
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
  setState(StateKeys.CURRENT_WISH_ID, wishId);
  storage.saveSelectedWish(wishId);
}

/**
 * 选择场景
 */
function selectScene(sceneId) {
  document.querySelectorAll('.scene-tag').forEach(tag => {
    tag.classList.toggle('active', tag.dataset.scene === sceneId);
  });
  currentSceneId = sceneId;
  storage.set('last_scene', sceneId);
}

/**
 * 切换八字精度模式
 */
function switchPrecision(precision) {
  // 更新按钮状态
  document.querySelectorAll('.precision-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.precision === precision);
  });
  
  // 显示/隐藏精确字段
  const preciseFields = document.querySelector('.precise-fields');
  if (preciseFields) {
    preciseFields.classList.toggle('hidden', precision !== 'precise');
  }
  
  // 更新提示文字
  const hint = document.getElementById('precision-hint');
  if (hint) {
    hint.textContent = precision === 'simple' 
      ? '简版：仅需年月日时，快速计算'
      : '精确：考虑节气交界和出生地时差，更准确';
  }
  
  // 保存用户偏好
  storage.set('bazi_precision', precision);
}

/**
 * 获取当前精度模式
 */
function getPrecision() {
  return storage.get('bazi_precision') || 'simple';
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
    const data = {
      year: parseInt(year, 10),
      month: parseInt(month, 10),
      day: parseInt(day, 10),
      hour: parseInt(hour, 10),
      precision: getPrecision()
    };
    
    // 精确模式额外数据
    if (data.precision === 'precise') {
      const minute = document.getElementById('bazi-minute')?.value || '0';
      const timezone = document.getElementById('bazi-timezone')?.value || '8';
      data.minute = parseInt(minute, 10);
      data.timezone = parseInt(timezone, 10);
    }
    
    return data;
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
  let baziResult = null;
  
  if (baziForm) {
    // 保存八字
    storage.saveLastBazi(baziForm);
    
    // 根据精度模式计算八字
    if (baziForm.precision === 'precise') {
      // 精确模式：时辰(0-11) * 2 转换为 0-23小时
      const realHour = baziForm.hour * 2;
      baziResult = analyzeBaziPrecise(
        baziForm.year,
        baziForm.month,
        baziForm.day,
        realHour,
        baziForm.minute,
        baziForm.timezone
      );
    } else {
      // 简版模式
      baziResult = analyzeBazi(
        baziForm.year,
        baziForm.month,
        baziForm.day,
        baziForm.hour
      );
    }
    
    setState(StateKeys.CURRENT_BAZI_RESULT, baziResult);
    console.log('[App] Bazi:', baziResult?.bazi?.fullBazi, 'Mode:', baziForm.precision);
  } else {
    setState(StateKeys.CURRENT_BAZI_RESULT, null);
  }
  
  // 生成推荐
  const result = await generateRecommendation(
    getState(StateKeys.CURRENT_TERM_INFO),
    getState(StateKeys.CURRENT_WISH_ID),
    baziResult,
    { sceneId: currentSceneId }
  );
  
  if (result && result.schemes.length > 0) {
    // 保存结果到 Store
    setState(StateKeys.CURRENT_RESULT, result);
    
    // 持久化存储
    storage.saveLastResult(result);
    storage.incrementUsage('generates');
    
    // 渲染结果
    renderResultHeader(getState(StateKeys.CURRENT_TERM_INFO));
    renderSchemeCards(result.schemes);
    
    // 切换视图
    showView(ViewNames.RESULTS);
    setState(StateKeys.CURRENT_VIEW, ViewNames.RESULTS);
  } else {
    showToast('生成失败，请重试');
  }
}

/**
 * 处理换一批
 */
async function handleRegenerate() {
  console.log('[App] Regenerating...');
  
  const currentResult = getState(StateKeys.CURRENT_RESULT);
  const excludeIds = currentResult?.schemes?.map(s => s.id) || [];
  
  const newResult = await regenerateRecommendation(
    getState(StateKeys.CURRENT_TERM_INFO),
    getState(StateKeys.CURRENT_WISH_ID),
    getState(StateKeys.CURRENT_BAZI_RESULT),
    excludeIds,
    { sceneId: currentSceneId }
  );
  
  if (newResult && newResult.schemes.length > 0) {
    setState(StateKeys.CURRENT_RESULT, newResult);
    storage.saveLastResult(newResult);
    renderSchemeCards(newResult.schemes);
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
