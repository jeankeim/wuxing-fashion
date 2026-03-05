/**
 * Results Controller - 结果页控制器
 */

import { BaseController } from './base.js';
import { navigateTo, goBack } from '../core/router.js';
import { renderSchemeCards, renderResultHeader, renderDetailModal, showModal, closeModal } from '../utils/render.js';
import { StateKeys } from '../core/store.js';
import { WeatherImpact } from '../components/weather-widget.js';
import { calculateWeatherBoost } from '../services/weather.js';
import { getWuxingName } from '../utils/wuxing.js';

export class ResultsController extends BaseController {
  constructor() {
    super();
    this.containerId = 'view-results';
  }


  onMount() {
    // 动态获取容器（视图是动态加载的）
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error('[ResultsController] Container not found');
      return;
    }
    
    // 重新绑定事件
    this.bindEvents();
    // 渲染结果
    const result = this.getState(StateKeys.CURRENT_RESULT);
    if (result) {
      // 检查是否有八字数据
      const baziData = this.getState(StateKeys.BAZI_DATA);
      const hasBazi = baziData && baziData.year && baziData.month && baziData.day;
      
      this.renderPageSubtitle(result);
      renderResultHeader(result.termInfo);
      renderSchemeCards(result.schemes, { hasBazi });
      
      // 渲染今日运势卡片
      this.renderDailyFortune(result);
      
      // 渲染天气影响提示
      this.renderWeatherImpact(result);
      
      // 渲染八字使用状态提示
      this.renderBaziUsageHint(result);
    }
  }

  renderPageSubtitle(result) {
    const subtitleEl = document.getElementById('results-subtitle');
    if (subtitleEl && result.termInfo?.current) {
      const termName = result.termInfo.current.name;
      const schemeCount = result.schemes?.length || 3;
      subtitleEl.textContent = `根据${termName}节气，为您精选 ${schemeCount} 套五行搭配`;
    }
  }

  renderDailyFortune(result) {
    const container = document.getElementById('daily-fortune-container');
    if (!container) return;
    
    const sceneEl = document.getElementById('fortune-scene');
    const wishEl = document.getElementById('fortune-wish');
    const colorsEl = document.getElementById('fortune-colors');
    const analysisEl = document.getElementById('fortune-analysis');
    const tipEl = document.getElementById('fortune-tip');
    
    if (!sceneEl || !wishEl || !colorsEl || !analysisEl || !tipEl) return;
    
    // 获取场景和心愿信息
    const scene = this.getSceneInfo(result.sceneId);
    const wish = this.getWishInfo(result.wishId);
    const termInfo = result.termInfo?.current;
    const bazi = result.baziResult;
    const schemes = result.schemes || [];
    
    // 渲染场景和心愿
    sceneEl.innerHTML = scene ? `场景：${scene.name} ${scene.icon}` : '';
    wishEl.innerHTML = wish ? `心愿：${wish.name} ${wish.icon}` : '';
    
    // 渲染幸运色系
    const luckyColors = schemes.slice(0, 2).map(s => s.color.name);
    colorsEl.innerHTML = luckyColors.length > 0 
      ? `<span class="colors-label">🎨 幸运色系：</span><span class="colors-value">${luckyColors.join(' + ')}</span>`
      : '';
    
    // 生成五行解析
    const analysis = this.generateFortuneAnalysis(termInfo, bazi, scene, wish, schemes);
    analysisEl.innerHTML = `<div class="analysis-label">💡 五行解析：</div><div class="analysis-content">${analysis}</div>`;
    
    // 生成穿搭建议
    const tip = this.generateFortuneTip(bazi, schemes);
    tipEl.innerHTML = `<span class="tip-label">💫 穿搭 Tip：</span><span class="tip-content">${tip}</span>`;
  }
  
  getSceneInfo(sceneId) {
    const scenes = {
      daily: { name: '日常', icon: '🏠' },
      work: { name: '职场', icon: '💼' },
      date: { name: '约会', icon: '💕' },
      party: { name: '聚会', icon: '🎉' },
      sport: { name: '运动', icon: '🏃' },
      interview: { name: '面试', icon: '📝' },
      negotiation: { name: '谈判', icon: '🤝' },
      commute: { name: '通勤', icon: '🚌' },
      blind_date: { name: '相亲', icon: '💘' },
      romantic_date: { name: '浪漫约会', icon: '🌹' },
      friend_gathering: { name: '朋友聚会', icon: '🍻' },
      study: { name: '学习', icon: '📚' },
      home: { name: '居家', icon: '🏡' },
      travel: { name: '旅行', icon: '✈️' },
      benming: { name: '本命年', icon: '🧧' },
      celebration: { name: '庆典', icon: '🎊' }
    };
    return scenes[sceneId];
  }
  
  getWishInfo(wishId) {
    const wishes = {
      career: { name: '事业顺利', icon: '📈' },
      wealth: { name: '财运亨通', icon: '💰' },
      love: { name: '桃花朵朵', icon: '🌸' },
      health: { name: '身体健康', icon: '💪' },
      study: { name: '学业进步', icon: '🎓' },
      harmony: { name: '家庭和睦', icon: '👨‍👩‍👧' },
      promotion: { name: '升职加薪', icon: '📋' },
      interview: { name: '求职顺利', icon: '🎯' },
      negotiation: { name: '谈判成功', icon: '✅' },
      confession: { name: '表白成功', icon: '💝' },
      reconcile: { name: '感情修复', icon: '💞' },
      meet: { name: '遇见正缘', icon: '🤝' },
      safe: { name: '出入平安', icon: '🛡️' },
      energy: { name: '精力充沛', icon: '⚡' },
      mood: { name: '心情愉悦', icon: '😊' },
      confidence: { name: '增强自信', icon: '💫' }
    };
    return wishes[wishId];
  }
  
  generateFortuneAnalysis(termInfo, bazi, scene, wish, schemes) {
    const termName = termInfo?.name || '今日';
    const termWuxing = termInfo?.wuxingName || '';
    const mainScheme = schemes[0];
    
    let analysis = `今日节气${termName}，${termWuxing ? termWuxing + '气较旺。' : ''}`;
    
    // 场景需求
    if (scene) {
      const sceneNeeds = {
        work: '需要展现专业稳重',
        interview: '需要给面试官留下良好印象',
        date: '需要展现温柔体贴',
        party: '需要展现活力热情',
        study: '需要保持专注清醒'
      };
      if (sceneNeeds[scene.id]) {
        analysis += `你选择的「${scene.name}」场景${sceneNeeds[scene.id]}，`;
      }
    }
    
    // 八字分析
    if (bazi?.recommend) {
      const usefulGod = bazi.recommend.recommend;
      const usefulGodName = getWuxingName(usefulGod);
      analysis += `而你的八字喜${usefulGodName}。`;
    }
    
    // 推荐方案
    if (mainScheme) {
      analysis += `因此，建议穿着${mainScheme.color.name}系`;
      if (schemes[1]) {
        analysis += `，搭配${schemes[1].color.name}色`;
      }
      analysis += `（${mainScheme.material}材质），${mainScheme.feeling}，${mainScheme.annotation}。`;
    }
    
    return analysis;
  }
  
  generateFortuneTip(bazi, schemes) {
    if (!bazi?.recommend || !schemes.length) {
      return '根据今日运势选择适合的颜色，让自己更加自信！';
    }
    
    const strongest = bazi.recommend.strongest;
    const strongestName = getWuxingName(strongest);
    const mainWuxing = schemes[0]?.color?.wuxing;
    
    // 如果推荐方案的五行与忌神相同，给出提醒
    if (strongest === mainWuxing) {
      return `你的八字${strongestName}较旺，今日建议避免过多${strongestName}色，可搭配其他五行颜色平衡能量。`;
    }
    
    // 避免的颜色
    const avoidWuxing = strongest;
    const avoidName = getWuxingName(avoidWuxing);
    
    const tips = [
      `避免全身${avoidName}色，以免加重你的${avoidName}能量，影响运势发挥。`,
      `可在配饰上加入喜用神颜色，增强个人气场。`,
      `今日${schemes[0]?.color?.name}是你的幸运色，有助于提升整体运势。`
    ];
    
    return tips[Math.floor(Math.random() * tips.length)];
  }

  renderWeatherImpact(result) {
    const container = document.getElementById('weather-impact-container');
    if (!container || !result.weather) return;
    
    // 计算天气加成（取第一个方案作为示例）
    const scheme = result.schemes?.[0];
    if (scheme) {
      const boost = calculateWeatherBoost(scheme, result.weather.current);
      if (boost > 0) {
        const weatherImpact = new WeatherImpact(container, {
          weather: result.weather.current,
          boost
        });
        weatherImpact.mount();
      }
    }
  }

  /**
   * 渲染八字使用状态提示
   */
  renderBaziUsageHint(result) {
    const usageHint = document.getElementById('bazi-usage-hint');
    const missingHint = document.getElementById('bazi-missing-hint');
    
    if (!usageHint || !missingHint) return;
    
    // 检查是否有八字数据（从 state 读取）
    const baziData = this.getState(StateKeys.BAZI_DATA);
    const hasBazi = baziData && baziData.year && baziData.month && baziData.day;
    
    // 检查是否刚刚更新了八字
    const baziJustUpdated = this.getState('BAZI_JUST_UPDATED');
    
    if (baziJustUpdated) {
      // 刚更新八字 - 提示重新计算
      usageHint.classList.add('hidden');
      missingHint.classList.remove('hidden');
      missingHint.innerHTML = `
        <div class="usage-hint-content">
          <span class="usage-icon">✨</span>
          <span class="usage-text">已输入八字，点击重新计算获取个性化推荐</span>
          <button class="usage-btn" id="btn-recalculate" type="button">重新计算</button>
        </div>
      `;
      
      // 绑定重新计算按钮
      const recalcBtn = missingHint.querySelector('#btn-recalculate');
      if (recalcBtn) {
        this.addEventListener(recalcBtn, 'click', () => {
          // 清除标记
          this.setState('BAZI_JUST_UPDATED', false);
          // 跳转到输入页重新生成
          navigateTo('/entry');
        });
      }
    } else if (hasBazi) {
      // 有八字且已用于当前推荐 - 显示已使用提示
      usageHint.classList.remove('hidden');
      missingHint.classList.add('hidden');
    } else {
      // 无八字 - 显示提示去填写
      usageHint.classList.add('hidden');
      missingHint.classList.remove('hidden');
      // 恢复原始内容
      missingHint.innerHTML = `
        <div class="usage-hint-content">
          <span class="usage-icon">💡</span>
          <span class="usage-text">完善八字信息，推荐精准度可提升 30%</span>
          <button class="usage-btn" id="btn-go-profile" type="button">去填写</button>
        </div>
      `;
      
      // 绑定去填写按钮
      const goProfileBtn = missingHint.querySelector('#btn-go-profile');
      if (goProfileBtn) {
        this.addEventListener(goProfileBtn, 'click', () => {
          navigateTo('/profile');
        });
      }
    }
  }

  bindEvents() {
    // 避免重复绑定
    if (this.eventsBound) return;
    this.eventsBound = true;
    
    // 返回按钮
    const backBtn = this.container.querySelector('#btn-back-entry');
    if (backBtn) {
      this.addEventListener(backBtn, 'click', () => {
        goBack();
      });
    }

    // 画像按钮（右上角）
    const profileBtn = this.container.querySelector('#btn-profile');
    if (profileBtn) {
      this.addEventListener(profileBtn, 'click', () => {
        navigateTo('/profile');
      });
    }

    // 换一批
    const regenerateBtn = this.container.querySelector('#btn-regenerate');
    if (regenerateBtn) {
      this.addEventListener(regenerateBtn, 'click', () => {
        this.handleRegenerate();
      });
    }

    // 上传按钮
    const uploadBtn = this.container.querySelector('#btn-upload');
    if (uploadBtn) {
      this.addEventListener(uploadBtn, 'click', () => {
        navigateTo('/upload');
      });
    }

    // 方案卡片点击（委托）
    const cardsContainer = this.container.querySelector('#scheme-cards');
    if (cardsContainer) {
      this.addEventListener(cardsContainer, 'click', (e) => {
        this.handleCardClick(e);
      });
    }

    // 模态框关闭按钮
    const modalCloseBtn = document.querySelector('#modal-detail .modal-close');
    if (modalCloseBtn) {
      this.addEventListener(modalCloseBtn, 'click', () => {
        closeModal('modal-detail');
      });
    }

    // 点击模态框背景关闭
    const modalBackdrop = document.querySelector('#modal-detail .modal-backdrop');
    if (modalBackdrop) {
      this.addEventListener(modalBackdrop, 'click', () => {
        closeModal('modal-detail');
      });
    }
    
    // 反馈弹窗关闭按钮
    const feedbackCloseBtn = document.getElementById('btn-close-feedback');
    if (feedbackCloseBtn) {
      this.addEventListener(feedbackCloseBtn, 'click', () => {
        this.hideFeedbackModal();
      });
    }
    
    // 反馈弹窗背景关闭
    const feedbackModal = document.getElementById('feedback-modal');
    if (feedbackModal) {
      const feedbackBackdrop = feedbackModal.querySelector('.modal-backdrop');
      if (feedbackBackdrop) {
        this.addEventListener(feedbackBackdrop, 'click', () => {
          this.hideFeedbackModal();
        });
      }
      
      // 反馈选项点击
      const feedbackOptions = feedbackModal.querySelectorAll('.feedback-option');
      feedbackOptions.forEach(option => {
        this.addEventListener(option, 'click', () => {
          const reason = option.dataset.reason;
          this.handleFeedbackReason(reason);
        });
      });
    }
  }

  handleRegenerate() {
    // TODO: 实现换一批逻辑
    this.showToast('正在生成新推荐...');
  }

  handleCardClick(e) {
    const shareBtn = e.target.closest('.scheme-share-btn');
    const detailBtn = e.target.closest('.scheme-detail-btn');
    const feedbackBtn = e.target.closest('.feedback-btn');

    if (shareBtn) {
      const index = parseInt(shareBtn.dataset.index, 10);
      this.shareScheme(index);
    }

    if (detailBtn) {
      const index = parseInt(detailBtn.dataset.index, 10);
      this.showDetail(index);
    }
    
    if (feedbackBtn) {
      const index = parseInt(feedbackBtn.dataset.index, 10);
      const action = feedbackBtn.dataset.action;
      this.handleFeedback(index, action, feedbackBtn);
    }
  }
  
  handleFeedback(index, action, btnElement) {
    const schemes = this.getState(StateKeys.CURRENT_SCHEMES);
    if (!schemes || !schemes[index]) return;
    
    const scheme = schemes[index];
    
    if (action === 'adopt') {
      // 采纳：标记为已采纳，记录正向反馈
      btnElement.classList.add('adopted');
      btnElement.disabled = true;
      btnElement.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        已采纳
      `;
      this.recordFeedback(scheme, 'adopt');
      this.showToast('已记录您的采纳，将优化后续推荐');
    } else if (action === 'dislike') {
      // 不喜欢：显示反馈弹窗
      this.currentFeedbackScheme = scheme;
      this.currentFeedbackIndex = index;
      this.showFeedbackModal();
    }
  }
  
  showFeedbackModal() {
    const modal = document.getElementById('feedback-modal');
    if (modal) {
      modal.classList.remove('hidden');
    }
  }
  
  hideFeedbackModal() {
    const modal = document.getElementById('feedback-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
    this.currentFeedbackScheme = null;
    this.currentFeedbackIndex = null;
  }
  
  handleFeedbackReason(reason) {
    if (!this.currentFeedbackScheme) return;
    
    // 记录负向反馈
    this.recordFeedback(this.currentFeedbackScheme, 'dislike', reason);
    
    // 更新按钮状态
    const cards = this.container.querySelectorAll('.scheme-card');
    const card = cards[this.currentFeedbackIndex];
    if (card) {
      const dislikeBtn = card.querySelector('.feedback-dislike');
      if (dislikeBtn) {
        dislikeBtn.classList.add('disliked');
        dislikeBtn.disabled = true;
        dislikeBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          已反馈
        `;
      }
    }
    
    this.hideFeedbackModal();
    this.showToast('感谢您的反馈，将优化后续推荐');
  }
  
  recordFeedback(scheme, type, reason = null) {
    // 获取现有反馈数据
    const feedbackKey = 'wuxing_feedback';
    const feedback = JSON.parse(localStorage.getItem(feedbackKey) || '[]');
    
    // 添加新反馈
    feedback.push({
      schemeId: scheme.id,
      schemeWuxing: scheme.color.wuxing,
      schemeColor: scheme.color.name,
      schemeMaterial: scheme.material,
      type, // 'adopt' 或 'dislike'
      reason, // 不喜欢的原因
      timestamp: new Date().toISOString()
    });
    
    // 只保留最近50条反馈
    if (feedback.length > 50) {
      feedback.shift();
    }
    
    // 保存
    localStorage.setItem(feedbackKey, JSON.stringify(feedback));
    
    // 同时更新用户偏好（用于影响后续推荐）
    this.updateUserPreference(scheme, type, reason);
  }
  
  updateUserPreference(scheme, type, reason) {
    const prefsKey = 'wuxing_preferences';
    const prefs = JSON.parse(localStorage.getItem(prefsKey) || '{}');
    
    // 初始化结构
    if (!prefs.wuxingScores) prefs.wuxingScores = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
    if (!prefs.colorScores) prefs.colorScores = {};
    if (!prefs.materialScores) prefs.materialScores = {};
    
    const wuxing = scheme.color.wuxing;
    const color = scheme.color.name;
    const material = scheme.material;
    
    if (type === 'adopt') {
      // 采纳：增加该五行、颜色、材质的权重
      prefs.wuxingScores[wuxing] = (prefs.wuxingScores[wuxing] || 0) + 5;
      prefs.colorScores[color] = (prefs.colorScores[color] || 0) + 3;
      prefs.materialScores[material] = (prefs.materialScores[material] || 0) + 3;
    } else if (type === 'dislike') {
      // 不喜欢：根据原因减少相应权重
      if (reason === 'wuxing') {
        prefs.wuxingScores[wuxing] = (prefs.wuxingScores[wuxing] || 0) - 5;
      } else if (reason === 'color') {
        prefs.colorScores[color] = (prefs.colorScores[color] || 0) - 5;
      } else if (reason === 'material') {
        prefs.materialScores[material] = (prefs.materialScores[material] || 0) - 5;
      } else {
        // 其他原因，整体降低该方案权重
        prefs.wuxingScores[wuxing] = (prefs.wuxingScores[wuxing] || 0) - 2;
      }
    }
    
    localStorage.setItem(prefsKey, JSON.stringify(prefs));
  }

  shareScheme(index) {
    const schemes = this.getState(StateKeys.CURRENT_SCHEMES);
    if (!schemes || !schemes[index]) return;

    const scheme = schemes[index];
    
    // 构建分享文本
    const shareText = `${scheme.color.name} · ${scheme.material} · ${scheme.feeling}\n${scheme.annotation}\n${scheme.source}`;
    
    // 尝试使用 Web Share API
    if (navigator.share) {
      navigator.share({
        title: '五行穿搭推荐',
        text: shareText,
        url: window.location.href
      }).catch(() => {
        // 用户取消分享
      });
    } else {
      // 复制到剪贴板
      navigator.clipboard.writeText(shareText).then(() => {
        this.showToast('已复制到剪贴板');
      }).catch(() => {
        this.showToast('分享功能暂不可用');
      });
    }
  }

  showDetail(index) {
    const schemes = this.getState(StateKeys.CURRENT_SCHEMES);
    if (!schemes || !schemes[index]) return;

    const scheme = schemes[index];
    const result = this.getState(StateKeys.CURRENT_RESULT);
    
    // 构建 context 对象传递给 renderDetailModal
    const context = result ? {
      termInfo: result.termInfo,
      baziResult: result.baziResult,
      sceneId: result.sceneId,
      wishId: result.wishId,
      weather: result.weather
    } : null;
    
    // 渲染详情模态框
    renderDetailModal(scheme, context);
    
    // 显示模态框
    showModal('modal-detail');
  }

  onUnmount() {
    this.eventsBound = false;
  }
}
