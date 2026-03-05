/**
 * Render Module - DOM渲染
 */

import { renderExplanationCard } from '../services/explanation.js';
import { renderUserProfilePanel } from './profile.js';
import { renderDataManagerPanel } from '../data/data-manager.js';
import { getWuxingName } from './wuxing.js';
import { store, StateKeys } from '../core/store.js';

/**
 * 显示指定视图
 */
export function showView(viewId) {
  document.querySelectorAll('.view').forEach(view => {
    view.classList.add('hidden');
  });
  const target = document.getElementById(viewId);
  if (target) {
    target.classList.remove('hidden');
  }
}

/**
 * 初始化年份选择器
 */
export function initYearSelect() {
  const select = document.getElementById('bazi-year');
  if (!select) return;
  
  const currentYear = new Date().getFullYear();
  const startYear = 1950;
  const endYear = currentYear - 16; // 至少16岁
  
  for (let year = endYear; year >= startYear; year--) {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year + '年';
    select.appendChild(option);
  }
}

/**
 * 初始化日期选择器
 */
export function initDaySelect() {
  const select = document.getElementById('bazi-day');
  if (!select) return;
  
  for (let day = 1; day <= 31; day++) {
    const option = document.createElement('option');
    option.value = day;
    option.textContent = day + '日';
    select.appendChild(option);
  }
}

/**
 * 渲染节气横幅
 */
export function renderSolarBanner(termInfo) {
  const banner = document.getElementById('solar-banner');
  if (!banner || !termInfo) return;
  
  const nameEl = banner.querySelector('.solar-term-name');
  const elementEl = banner.querySelector('.solar-term-element');
  
  if (nameEl) {
    nameEl.textContent = termInfo.current.name;
  }
  
  if (elementEl) {
    elementEl.textContent = termInfo.current.wuxingName;
    elementEl.style.backgroundColor = getWuxingBgColor(termInfo.current.wuxing);
    elementEl.style.color = getWuxingTextColor(termInfo.current.wuxing);
  }
}

/**
 * 获取五行背景色
 */
function getWuxingBgColor(wuxing) {
  const colors = {
    wood: '#E8F5E9',
    fire: '#FFEBEE',
    earth: '#FFF8E1',
    metal: '#F5F5F5',
    water: '#E3F2FD'
  };
  return colors[wuxing] || '#F5F5F5';
}

/**
 * 获取五行文字色
 */
function getWuxingTextColor(wuxing) {
  const colors = {
    wood: '#2E7D32',
    fire: '#C62828',
    earth: '#F57F17',
    metal: '#616161',
    water: '#1565C0'
  };
  return colors[wuxing] || '#666666';
}

/**
 * 渲染结果页标题
 */
export function renderResultHeader(termInfo) {
  const termEl = document.getElementById('results-term');
  if (termEl && termInfo) {
    termEl.textContent = `${termInfo.current.name} · ${termInfo.current.wuxingName}`;
  }
}

/**
 * 渲染方案卡片
 */
export function renderSchemeCards(schemes, options = {}) {
  const container = document.getElementById('scheme-cards');
  if (!container) return;
  
  container.innerHTML = '';
  
  // 检查是否有八字数据（从 options 或全局状态）
  const hasBazi = options.hasBazi || window.__currentBaziData || false;
  
  schemes.forEach((scheme, index) => {
    const card = createSchemeCard(scheme, index, hasBazi);
    container.appendChild(card);
  });
  
  // 保存到 Store 供详情模态框使用（替代全局变量）
  store.set(StateKeys.CURRENT_SCHEMES, schemes);
}

/**
 * 创建方案卡片
 */
function createSchemeCard(scheme, index, hasBazi = false) {
  const card = document.createElement('div');
  card.className = 'scheme-card';
  card.style.animationDelay = `${index * 100}ms`;
  
  // 获取推荐理由（如果有评分数据）
  const explanationHtml = generateSchemeExplanation(scheme, index, hasBazi);
  
  // 推荐类型标签
  const typeLabel = getSchemeTypeLabel(scheme._type);
  
  card.innerHTML = `
    <div class="scheme-color-bar" style="background-color: ${scheme.color.hex}"></div>
    ${typeLabel}
    <div class="scheme-keywords">
      <span class="scheme-keyword">${scheme.color.name}</span>
      <span class="scheme-keyword">${scheme.material}</span>
      <span class="scheme-keyword">${scheme.feeling}</span>
    </div>
    <p class="scheme-annotation">${scheme.annotation}</p>
    <p class="scheme-source">${scheme.source}</p>
    ${explanationHtml}
    <div class="scheme-actions">
      <button class="scheme-share-btn" data-index="${index}" type="button" aria-label="分享">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="18" cy="5" r="3"/>
          <circle cx="6" cy="12" r="3"/>
          <circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
      </button>
      <button class="scheme-detail-btn" data-index="${index}" type="button">
        查看详解
      </button>
    </div>
    <div class="scheme-feedback">
      <button class="feedback-btn feedback-adopt" data-index="${index}" data-action="adopt" type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        采纳
      </button>
      <button class="feedback-btn feedback-dislike" data-index="${index}" data-action="dislike" type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        不喜欢
      </button>
    </div>
  `;
  
  // 绑定推荐理由展开/收起事件
  bindExplanationToggle(card, index);
  
  return card;
}

/**
 * 获取方案类型标签
 */
function getSchemeTypeLabel(type) {
  const labels = {
    best: { text: '最佳匹配', class: 'type-best' },
    alternative: { text: '同系替代', class: 'type-alternative' },
    balance: { text: '平衡之选', class: 'type-balance' },
    supplement: { text: '备选方案', class: 'type-supplement' }
  };
  
  const label = labels[type];
  if (!label) return '';
  
  return `<span class="scheme-type-label ${label.class}">${label.text}</span>`;
}

/**
 * 生成方案推荐理由HTML
 * @param {Object} scheme - 方案
 * @param {number} index - 索引
 * @param {boolean} hasBazi - 是否有八字数据
 */
function generateSchemeExplanation(scheme, index, hasBazi = false) {
  // 如果没有评分数据，不显示推荐理由
  if (!scheme._score && !scheme._breakdown) {
    return '';
  }
  
  const breakdown = scheme._breakdown || {};
  const explanations = [];
  const formulaParts = [];
  
  // 维度配置（包含权重信息）- 与新评分逻辑保持一致
  const dimensionConfig = {
    bazi: { name: '八字', icon: '📿', weight: 0.35 },      // 35% 核心差异化
    scene: { name: '场景', icon: '🎯', weight: 0.25 },    // 25% 一票否决
    solarTerm: { name: '节气', icon: '🌿', weight: 0.20 }, // 20% 顺应天时
    weather: { name: '天气', icon: '🌤️', weight: 0.20 },  // 20% 一票否决
    wish: { name: '心愿', icon: '💫', weight: 0.10, isBonus: true },    // Bonus +10
    history: { name: '偏好', icon: '💝', weight: 0.05, isBonus: true },  // Bonus +5
    dailyLuck: { name: '运势', icon: '🍀', weight: 0.05, isBonus: true } // Bonus +5
  };
  
  // 找出所有维度，过滤掉八字（如果没有八字数据）
  let sortedEntries = Object.entries(breakdown)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  
  // 如果没有八字，过滤掉八字维度
  if (!hasBazi) {
    sortedEntries = sortedEntries.filter(([key]) => key !== 'bazi');
  }
  
  for (const [key, score] of sortedEntries) {
    const config = dimensionConfig[key];
    if (!config) continue;
    
    // 计算百分比：基于该维度的最大可能得分（权重 * 100）
    const maxPossibleScore = config.weight * 100;
    const percentage = Math.min(Math.round((Math.abs(score) / maxPossibleScore) * 100), 100);
    const isNegative = score < 0;
    
    // 构建计算公式部分（显示原始贡献值）
    const rawScore = isNegative ? score : `+${Math.round(score)}`;
    formulaParts.push(`${config.name}${rawScore}`);
    
    explanations.push(`
      <div class="explanation-item ${isNegative ? 'negative' : ''}">
        <span class="explanation-icon">${config.icon}</span>
        <span class="explanation-name">${config.name}</span>
        <span class="explanation-weight">${config.isBonus ? '加成' : Math.round(config.weight * 100) + '%'}</span>
        <div class="explanation-bar">
          <div class="explanation-fill ${isNegative ? 'negative' : ''}" style="width: ${percentage}%"></div>
        </div>
        <span class="explanation-score ${isNegative ? 'negative' : ''}">${rawScore}</span>
      </div>
    `);
  }
  
  if (explanations.length === 0) return '';
  
  // 构建计算公式文本（取前3个）
  const formula = formulaParts.slice(0, 3).join(' + ');
  
  return `
    <div class="scheme-explanation">
      <button class="explanation-toggle" data-index="${index}" type="button">
        <span>为什么推荐这套？</span>
        <svg class="explanation-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      <div class="explanation-content hidden" id="explanation-${index}">
        <div class="explanation-formula">${formula} = 高分推荐</div>
        <div class="explanation-score-total">
          <span class="score-label">综合得分</span>
          <span class="score-value">${Math.round(scheme._score)}</span>
        </div>
        <div class="explanation-list">
          ${explanations.join('')}
        </div>
      </div>
    </div>
  `;
}

/**
 * 绑定推荐理由展开/收起事件
 */
function bindExplanationToggle(card, index) {
  const toggle = card.querySelector('.explanation-toggle');
  if (!toggle) return;
  
  toggle.addEventListener('click', () => {
    const content = card.querySelector(`#explanation-${index}`);
    const arrow = toggle.querySelector('.explanation-arrow');
    
    if (content) {
      content.classList.toggle('hidden');
      arrow.style.transform = content.classList.contains('hidden') ? '' : 'rotate(180deg)';
    }
  });
}

/**
 * 渲染详情模态框
 * @param {Object} scheme - 方案
 * @param {Object} context - 推荐上下文（可选）
 */
export function renderDetailModal(scheme, context = null) {
  const body = document.getElementById('modal-detail-body');
  if (!body || !scheme) return;
  
  let explanationHtml = '';
  let reasonTextHtml = '';
  
  if (context) {
    explanationHtml = renderExplanationCard(scheme, context);
    // 生成推荐理由文字描述
    reasonTextHtml = generateReasonText(scheme, context);
  }
  
  body.innerHTML = `
    <div class="detail-section">
      <div class="scheme-color-bar" style="background-color: ${scheme.color.hex}; height: 40px; border-radius: 8px;"></div>
    </div>
    
    <div class="detail-section">
      <p class="detail-label">色彩</p>
      <p class="detail-text">${scheme.color.name} (${scheme.color.hex})</p>
    </div>
    
    <div class="detail-section">
      <p class="detail-label">材质</p>
      <p class="detail-text">${scheme.material}</p>
    </div>
    
    <div class="detail-section">
      <p class="detail-label">感受</p>
      <p class="detail-text">${scheme.feeling}</p>
    </div>
    
    <div class="detail-section">
      <p class="detail-label">五行解读</p>
      <p class="detail-text">${scheme.annotation}</p>
    </div>
    
    <div class="detail-section">
      <p class="detail-label">典籍出处</p>
      <div class="detail-quote">${scheme.source}</div>
    </div>
    
    ${explanationHtml}
    
    ${reasonTextHtml}
  `;
}

/**
 * 生成推荐理由文字描述
 */
function generateReasonText(scheme, context) {
  const { termInfo, baziResult, sceneId, wishId } = context;
  const parts = [];
  
  // 节气因素
  if (termInfo?.current) {
    parts.push(`今日${termInfo.current.name}，${termInfo.current.wuxingName}气当令`);
    parts.push(`${scheme.color.name}属${getWuxingName(scheme.color.wuxing)}，与节气${termInfo.current.wuxingName}相生相合`);
  }
  
  // 八字因素
  if (baziResult?.recommend) {
    const usefulGod = baziResult.recommend.recommend;
    const usefulGodName = getWuxingName(usefulGod);
    if (scheme.color.wuxing === usefulGod) {
      parts.push(`您的八字喜${usefulGodName}，${scheme.color.name}正是您的喜用色，有助提升运势`);
    }
  }
  
  // 场景因素
  if (sceneId) {
    const sceneNames = {
      work: '职场', date: '约会', party: '聚会', 
      sport: '运动', interview: '面试', daily: '日常'
    };
    if (sceneNames[sceneId]) {
      parts.push(`${scheme.feeling}的风格非常适合${sceneNames[sceneId]}场景`);
    }
  }
  
  // 材质因素
  parts.push(`${scheme.material}材质${getMaterialWuxingDesc(scheme.material, scheme.color.wuxing)}`);
  
  return `
    <div class="detail-section reason-text-section">
      <p class="detail-label">💡 推荐理由</p>
      <div class="reason-text-content">
        ${parts.map(p => `<p class="reason-paragraph">${p}。</p>`).join('')}
      </div>
    </div>
  `;
}

function getMaterialWuxingDesc(material, wuxing) {
  const descs = {
    wood: '温润自然，助长木气生发',
    fire: '温暖热烈，增强火性活力',
    earth: '厚重踏实，稳固土行根基',
    metal: '清凉坚韧，收敛金气精华',
    water: '柔顺流动，滋养水性智慧'
  };
  return descs[wuxing] || '质地舒适，贴合肌肤';
}

/**
 * 渲染用户画像视图
 */
export function renderProfileView() {
  // 渲染数据管理面板
  const dataContainer = document.getElementById('data-manager-container');
  if (dataContainer) {
    dataContainer.innerHTML = renderDataManagerPanel();
  }
}

/**
 * 显示模态框
 */
export function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

/**
 * 关闭模态框
 */
export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

/**
 * 更新上传预览
 */
export function updateUploadPreview(imageData) {
  const placeholder = document.querySelector('.upload-placeholder');
  const preview = document.querySelector('.upload-preview');
  const previewImg = document.getElementById('preview-image');
  const feedbackSection = document.getElementById('feedback-section');
  
  if (imageData) {
    placeholder?.classList.add('hidden');
    preview?.classList.remove('hidden');
    if (previewImg) previewImg.src = imageData;
    feedbackSection?.classList.remove('hidden');
  } else {
    placeholder?.classList.remove('hidden');
    preview?.classList.add('hidden');
    if (previewImg) previewImg.src = '';
    feedbackSection?.classList.add('hidden');
  }
}

/**
 * 显示Toast消息
 */
export function showToast(message, duration = 2000) {
  // 移除已有toast
  const existingToast = document.querySelector('.toast');
  if (existingToast) existingToast.remove();
  
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.8);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 500;
    animation: fadeInUp 0.3s ease;
  `;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
