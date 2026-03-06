/**
 * Results Controller - 结果页控制器
 */

import { BaseController } from './base.js';
import { navigateTo, goBack } from '../core/router.js';
import { renderSchemeCards, renderResultHeader, renderDetailModal, showModal, closeModal } from '../utils/render.js';
import { StateKeys, store } from '../core/store.js';
import { getWuxingName } from '../utils/wuxing.js';
import { regenerateRecommendation } from '../services/engine.js';

export class ResultsController extends BaseController {
  constructor() {
    super();
    this.containerId = 'view-results';
    // 从 localStorage 加载反馈状态
    this.feedbackStates = this.loadFeedbackStates();
  }
  
  // 生成方案唯一标识（颜色+材质+感受）
  getSchemeId(scheme) {
    return `${scheme.color.name}-${scheme.material}-${scheme.feeling}`;
  }
  
  // 从 localStorage 加载反馈状态
  loadFeedbackStates() {
    try {
      const data = localStorage.getItem('wuxing_feedback_states');
      return data ? new Map(JSON.parse(data)) : new Map();
    } catch (e) {
      return new Map();
    }
  }
  
  // 保存反馈状态到 localStorage
  saveFeedbackStates() {
    try {
      localStorage.setItem('wuxing_feedback_states', JSON.stringify([...this.feedbackStates]));
    } catch (e) {
      console.warn('保存反馈状态失败:', e);
    }
  }
  
  // 恢复反馈状态到UI
  restoreFeedbackStates(schemes) {
    const cards = this.container.querySelectorAll('.scheme-card');
    schemes.forEach((scheme, index) => {
      const schemeId = this.getSchemeId(scheme);
      const savedState = this.feedbackStates.get(schemeId);
      const card = cards[index];
      if (!card || !savedState) return;
      
      const action = savedState?.action || savedState; // 兼容旧数据格式
      
      if (action === 'adopt') {
        const adoptBtn = card.querySelector('.feedback-adopt');
        if (adoptBtn) this.setAdoptedButton(adoptBtn);
      } else if (action === 'dislike') {
        const dislikeBtn = card.querySelector('.feedback-dislike');
        if (dislikeBtn) {
          const reasonText = savedState?.reasonText || '已反馈';
          dislikeBtn.classList.add('disliked');
          dislikeBtn.innerHTML = `<span>${reasonText}</span>`;
        }
      }
    });
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
    
    // 获取结果数据
    const result = this.getState(StateKeys.CURRENT_RESULT);
    
    if (result) {
      // 有数据：直接渲染内容
      // 检查是否有八字数据
      const baziData = this.getState(StateKeys.BAZI_DATA);
      const hasBazi = baziData && baziData.year && baziData.month && baziData.day;
      
      this.renderPageSubtitle(result);
      renderResultHeader(result.termInfo);
      renderSchemeCards(result.schemes, { hasBazi });
      
      // 恢复之前保存的反馈状态
      this.restoreFeedbackStates(result.schemes);
      
      // 渲染今日运势卡片
      this.renderDailyFortune(result);
      
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
    if (scene) {
      sceneEl.innerHTML = `场景：${scene.name} ${scene.icon}`;
      sceneEl.style.display = '';
    } else {
      sceneEl.style.display = 'none';
    }
    
    if (wish) {
      wishEl.innerHTML = `心愿：${wish.name} ${wish.icon}`;
      wishEl.style.display = '';
    } else {
      wishEl.style.display = 'none';
    }
    
    // 渲染幸运色系（带颜色样式，空格分隔）
    const luckyColorsHtml = this.renderLuckyColors(schemes.slice(0, 2));
    colorsEl.innerHTML = luckyColorsHtml;
    
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
    // 支持中文心愿名称（与 entry.html 中的 data-wish 对应）
    const wishes = {
      // 事业财运
      '求职': { name: '求职顺利', icon: '🎯' },
      '升职加薪': { name: '升职加薪', icon: '📈' },
      '签单顺利': { name: '签单顺利', icon: '🤝' },
      '贵人运': { name: '贵人运', icon: '🌟' },
      '防小人避坑': { name: '防小人避坑', icon: '🛡️' },
      // 情感人际
      '桃花朵朵': { name: '桃花朵朵', icon: '🌸' },
      '家庭和睦': { name: '家庭和睦', icon: '🏠' },
      '挽回缓和': { name: '挽回缓和', icon: '💝' },
      '新朋友缘': { name: '新朋友缘', icon: '🤗' },
      // 身心状态
      '精力充沛': { name: '精力充沛', icon: '⚡' },
      '安神助眠': { name: '安神助眠', icon: '🌙' },
      '增强自信': { name: '增强自信', icon: '💪' },
      '静心专注': { name: '静心专注', icon: '🧘‍♀️' },
      // 健康平安
      '健康舒畅': { name: '健康舒畅', icon: '🌿' },
      '身体康复': { name: '身体康复', icon: '💊' },
      '出行平安': { name: '出行平安', icon: '🚗' },
      '远行顺利': { name: '远行顺利', icon: '✈️' }
    };
    return wishes[wishId];
  }
  
  /**
   * 渲染幸运色系（带颜色样式，空格分隔）
   * @param {Array} schemes - 方案数组
   * @returns {string} HTML字符串
   */
  renderLuckyColors(schemes) {
    if (!schemes || schemes.length === 0) return '';
    
    // 颜色名称到文字颜色的映射
    const colorTextMap = {
      '榴红': '#C62828',
      '莲粉': '#F48FB1',
      '桃红': '#EC407A',
      '玫红': '#D81B60',
      '樱粉': '#F8BBD9',
      '绯红': '#E53935',
      '朱红': '#D32F2F',
      '殷红': '#B71C1C',
      '茜红': '#C2185B',
      '绛红': '#AD1457',
      '翠绿': '#2E7D32',
      '竹青': '#558B2F',
      '松绿': '#33691E',
      '葱绿': '#7CB342',
      '柳绿': '#8BC34A',
      '苔绿': '#689F38',
      '薄荷绿': '#4CAF50',
      '湖水绿': '#009688',
      '墨绿': '#1B5E20',
      '蔚蓝': '#1976D2',
      '天蓝': '#42A5F5',
      '湖蓝': '#0288D1',
      '靛蓝': '#303F9F',
      '藏蓝': '#1A237E',
      '宝石蓝': '#3F51B5',
      '海蓝': '#0277BD',
      '钴蓝': '#1565C0',
      '明黄': '#FBC02D',
      '鹅黄': '#FFF176',
      '杏黄': '#FFCC80',
      '橘黄': '#FFB74D',
      '柠檬黄': '#FFF59D',
      '金黄': '#F9A825',
      '土黄': '#F57F17',
      '奶白': '#FFF8E1',
      '米白': '#F5F5DC',
      '象牙白': '#FFFFF0',
      '珍珠白': '#FAFAFA',
      '银白': '#E0E0E0',
      '霜白': '#F5F5F5',
      '雪白': '#FFFFFF',
      '炭黑': '#212121',
      '玄黑': '#000000',
      '墨黑': '#1a1a1a',
      '青黑': '#263238',
      '铁灰': '#616161',
      '银灰': '#9E9E9E',
      '烟灰': '#757575',
      '雾灰': '#BDBDBD',
      '咖啡': '#795548',
      '驼色': '#8D6E63',
      '卡其': '#A1887F',
      '棕色': '#5D4037',
      '赭石': '#6D4C41',
      '栗色': '#4E342E',
      '紫色': '#7B1FA2',
      '紫罗兰': '#9C27B0',
      '茄紫': '#6A1B9A',
      '葡萄紫': '#8E24AA',
      '藕荷': '#CE93D8',
      '青紫': '#AB47BC',
      '橙红': '#FF5722',
      '珊瑚': '#FF7043',
      '橘红': '#FF8A65',
      '柿子': '#FFAB91',
      '橙色': '#FF9800',
      '赤橙': '#F57C00'
    };
    
    const colorsHtml = schemes.map(scheme => {
      const colorName = scheme.color.name;
      const textColor = colorTextMap[colorName] || scheme.color.hex || '#333';
      return `<span class="lucky-color-item" style="color: ${textColor}; font-weight: 600;">${colorName}</span>`;
    }).join(' ');
    
    return `<span class="colors-label">🎨 幸运色系：</span><span class="colors-value">${colorsHtml}</span>`;
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

  async handleRegenerate() {
    // 获取当前结果数据
    const result = this.getState(StateKeys.CURRENT_RESULT);
    console.log('[ResultsController] 换一批 - 当前结果:', result);
    
    if (!result || !result.schemes || result.schemes.length === 0) {
      this.showToast('暂无推荐数据');
      return;
    }
    
    this.showToast('正在生成新推荐...');
    
    // 获取当前已显示方案的ID，用于排除
    const excludeIds = result.schemes.map(s => s.id).filter(Boolean);
    console.log('[ResultsController] 换一批 - 排除ID:', excludeIds);
    
    try {
      // 调用引擎重新生成推荐（排除已显示的方案）
      console.log('[ResultsController] 换一批 - 调用 regenerateRecommendation');
      const newResult = await regenerateRecommendation(
        result.termInfo,
        result.wishId,
        result.baziResult,
        excludeIds,
        { sceneId: result.sceneId || 'daily' }
      );
      
      console.log('[ResultsController] 换一批 - 新结果:', newResult);
      
      if (!newResult || !newResult.schemes || newResult.schemes.length === 0) {
        this.showToast('暂无更多推荐方案');
        return;
      }
      
      // 更新 Store 中的结果
      store.set(StateKeys.CURRENT_RESULT, {
        ...result,
        schemes: newResult.schemes,
        regeneratedAt: new Date().toISOString()
      });
      
      // 重新渲染方案卡片
      const baziData = this.getState(StateKeys.BAZI_DATA);
      const hasBazi = baziData && baziData.year && baziData.month && baziData.day;
      renderSchemeCards(newResult.schemes, { hasBazi });
      
      // 恢复反馈状态（新方案没有之前的反馈）
      this.restoreFeedbackStates(newResult.schemes);
      
      this.showToast('已为您换一批推荐');
    } catch (error) {
      console.error('[ResultsController] 换一批失败:', error);
      this.showToast('生成推荐失败，请重试');
    }
  }

  handleCardClick(e) {
    const detailBtn = e.target.closest('.scheme-detail-btn');
    const feedbackBtn = e.target.closest('.feedback-btn');

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
    const schemeId = this.getSchemeId(scheme);
    const savedState = this.feedbackStates.get(schemeId);
    const currentAction = savedState?.action || savedState; // 兼容旧数据格式
    const cards = this.container.querySelectorAll('.scheme-card');
    const card = cards[index];
    
    if (action === 'adopt') {
      if (currentAction === 'adopt') {
        // 已采纳，再次点击取消
        this.feedbackStates.delete(schemeId);
        this.saveFeedbackStates();
        this.resetAdoptButton(btnElement);
        this.recordFeedback(scheme, 'cancel_adopt');
        this.showToast('已取消采纳');
      } else {
        // 采纳：如果之前是不喜欢，先取消不喜欢
        if (currentAction === 'dislike') {
          this.resetDislikeButton(card);
        }
        // 设置采纳状态
        this.feedbackStates.set(schemeId, 'adopt');
        this.saveFeedbackStates();
        this.setAdoptedButton(btnElement);
        this.recordFeedback(scheme, 'adopt');
        this.showToast('已记录您的采纳，将优化后续推荐');
      }
    } else if (action === 'dislike') {
      if (currentAction === 'dislike') {
        // 已不喜欢，再次点击取消
        this.feedbackStates.delete(schemeId);
        this.saveFeedbackStates();
        this.resetDislikeButton(card);
        this.recordFeedback(scheme, 'cancel_dislike');
        this.showToast('已取消反馈');
      } else {
        // 不喜欢：如果之前是采纳，先取消采纳
        if (currentAction === 'adopt') {
          const adoptBtn = card.querySelector('.feedback-adopt');
          if (adoptBtn) this.resetAdoptButton(adoptBtn);
        }
        // 显示反馈弹窗
        this.currentFeedbackScheme = scheme;
        this.currentFeedbackIndex = index;
        this.showFeedbackModal();
      }
    }
  }
  
  // 设置采纳按钮状态
  setAdoptedButton(btn) {
    btn.classList.add('adopted');
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      已采纳
    `;
  }
  
  // 重置采纳按钮状态
  resetAdoptButton(btn) {
    btn.classList.remove('adopted');
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      采纳
    `;
  }
  
  // 重置不喜欢按钮状态
  resetDislikeButton(card) {
    const btn = card.querySelector('.feedback-dislike');
    if (btn) {
      btn.classList.remove('disliked');
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        不喜欢
      `;
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
    
    const schemeId = this.getSchemeId(this.currentFeedbackScheme);
    const index = this.currentFeedbackIndex;
    
    // 原因映射（简短显示）
    const reasonTextMap = {
      'color': '🎨 颜色',
      'style': '👔 款式',
      'wuxing': '☯️ 五行',
      'material': '🧵 材质',
      'other': '🤔 其他'
    };
    const reasonText = reasonTextMap[reason] || '已反馈';
    
    // 设置不喜欢状态并保存（包含原因）
    this.feedbackStates.set(schemeId, { action: 'dislike', reason, reasonText });
    this.saveFeedbackStates();
    
    // 记录负向反馈
    this.recordFeedback(this.currentFeedbackScheme, 'dislike', reason);
    
    // 更新按钮状态，显示具体原因
    const cards = this.container.querySelectorAll('.scheme-card');
    const card = cards[index];
    if (card) {
      const dislikeBtn = card.querySelector('.feedback-dislike');
      if (dislikeBtn) {
        dislikeBtn.classList.add('disliked');
        dislikeBtn.innerHTML = `<span>${reasonText}</span>`;
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
