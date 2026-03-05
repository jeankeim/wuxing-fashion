/**
 * Explanation Module - 推荐结果解释
 * 解释为什么推荐某个方案
 */

import { getUserPreferences, getDailyLuckFactors, SCENES } from './recommendation.js';

// 五行名称映射
const WUXING_NAMES = {
  wood: '木', fire: '火', earth: '土', metal: '金', water: '水'
};

// 五行颜色映射
const WUXING_COLORS = {
  wood: '#4A7C59', fire: '#C73E1D', earth: '#B8956A',
  metal: '#7D8A8E', water: '#2C5F6E'
};

/**
 * 生成方案推荐理由
 * @param {Object} scheme - 方案
 * @param {Object} context - 推荐上下文
 * @returns {Array} 推荐理由列表
 */
export function generateReasons(scheme, context) {
  const reasons = [];
  const wuxing = scheme.color.wuxing;
  
  // 1. 节气匹配
  if (wuxing === context.termWuxing) {
    reasons.push({
      type: 'term',
      icon: '🌿',
      title: '节气相应',
      desc: `${context.termName}五行属${WUXING_NAMES[context.termWuxing]}，${scheme.color.name}正合此时令`
    });
  } else if (isGenerating(context.termWuxing, wuxing)) {
    reasons.push({
      type: 'term',
      icon: '🌱',
      title: '节气相生',
      desc: `${WUXING_NAMES[context.termWuxing]}生${WUXING_NAMES[wuxing]}，${scheme.color.name}得令而旺`
    });
  }
  
  // 2. 八字匹配（从 context.bazi 或 context.baziResult 读取）
  const baziWuxing = context.bazi?.recommend?.recommend || context.baziResult?.recommend?.recommend;
  if (baziWuxing) {
    if (wuxing === baziWuxing) {
      reasons.push({
        type: 'bazi',
        icon: '📿',
        title: '八字补益',
        desc: `您的八字喜${WUXING_NAMES[baziWuxing]}，${scheme.color.name}可助运势`
      });
    } else if (isGenerating(wuxing, baziWuxing)) {
      reasons.push({
        type: 'bazi',
        icon: '✨',
        title: '八字相生',
        desc: `${WUXING_NAMES[wuxing]}生${WUXING_NAMES[baziWuxing]}，${scheme.color.name}间接补益`
      });
    }
  }
  
  // 3. 场景适配
  if (context.sceneId && context.sceneId !== 'daily') {
    const scene = SCENES[context.sceneId.toUpperCase()];
    if (scene) {
      reasons.push({
        type: 'scene',
        icon: scene.icon,
        title: `${scene.name}适宜`,
        desc: `${scheme.material}材质适合${scene.name}场景，${scheme.feeling}更显气质`
      });
    }
  }
  
  // 4. 今日运势
  const luck = getDailyLuckFactors();
  if (wuxing === luck.luckyWuxing) {
    reasons.push({
      type: 'luck',
      icon: '🍀',
      title: '今日幸运色',
      desc: `今日${WUXING_NAMES[luck.luckyWuxing]}气旺盛，${scheme.color.name}可增运势`
    });
  } else if (wuxing === luck.boostWuxing) {
    reasons.push({
      type: 'luck',
      icon: '⭐',
      title: '今日增益色',
      desc: `${scheme.color.name}今日有额外加成，诸事顺遂`
    });
  }
  
  // 5. 个性化推荐
  const prefs = getUserPreferences();
  const wuxingScore = prefs.wuxingScores[wuxing] || 0;
  const maxScore = Math.max(...Object.values(prefs.wuxingScores), 1);
  
  if (wuxingScore > 0 && wuxingScore >= maxScore * 0.8) {
    reasons.push({
      type: 'personal',
      icon: '💝',
      title: '根据您的偏好',
      desc: `您常收藏${WUXING_NAMES[wuxing]}色系，为您推荐${scheme.color.name}`
    });
  }
  
  return reasons;
}

/**
 * 生成五行分析
 * @param {Object} context - 推荐上下文
 * @returns {Object} 五行分析
 */
export function generateWuxingAnalysis(context) {
  const analysis = {
    current: {},
    recommended: {},
    relationship: ''
  };
  
  // 当前状态
  if (context.termWuxing) {
    analysis.current.term = {
      name: WUXING_NAMES[context.termWuxing],
      color: WUXING_COLORS[context.termWuxing],
      desc: '当令五行'
    };
  }
  
  const baziWuxing = context.bazi?.recommend?.recommend || context.baziResult?.recommend?.recommend;
  if (baziWuxing) {
    analysis.current.bazi = {
      name: WUXING_NAMES[baziWuxing],
      color: WUXING_COLORS[baziWuxing],
      desc: '八字喜用'
    };
  }
  
  // 今日运势
  const luck = getDailyLuckFactors();
  analysis.current.luck = {
    name: WUXING_NAMES[luck.luckyWuxing],
    color: WUXING_COLORS[luck.luckyWuxing],
    desc: '今日幸运'
  };
  
  return analysis;
}

/**
 * 生成匹配分数解释
 * @param {Object} scheme - 方案
 * @param {Object} scores - 各项得分
 * @returns {Array} 分数解释
 */
export function generateScoreExplanation(scheme, scores) {
  const explanations = [];
  
  if (scores.base > 0) {
    explanations.push({
      label: '基础匹配',
      score: scores.base,
      max: 100,
      desc: '节气与八字匹配度'
    });
  }
  
  if (scores.personal > 0) {
    explanations.push({
      label: '个性化',
      score: scores.personal,
      max: 100,
      desc: '基于您的偏好'
    });
  }
  
  if (scores.scene > 0) {
    explanations.push({
      label: '场景适配',
      score: scores.scene,
      max: 25,
      desc: '场景匹配度'
    });
  }
  
  if (scores.luck > 0) {
    explanations.push({
      label: '今日运势',
      score: scores.luck,
      max: 10,
      desc: '运势加成'
    });
  }
  
  return explanations;
}

/**
 * 五行相生关系
 */
function isGenerating(from, to) {
  const generating = {
    wood: 'fire', fire: 'earth', earth: 'metal',
    metal: 'water', water: 'wood'
  };
  return generating[from] === to;
}

/**
 * 生成解释卡片HTML
 * @param {Object} scheme - 方案
 * @param {Object} context - 上下文
 * @returns {string} HTML字符串
 */
export function renderExplanationCard(scheme, context) {
  const reasons = generateReasons(scheme, context);
  const analysis = generateWuxingAnalysis(context);
  
  let reasonsHtml = reasons.map(r => `
    <div class="reason-item reason-${r.type}">
      <span class="reason-icon">${r.icon}</span>
      <div class="reason-content">
        <span class="reason-title">${r.title}</span>
        <span class="reason-desc">${r.desc}</span>
      </div>
    </div>
  `).join('');
  
  return `
    <div class="explanation-card">
      <h4 class="explanation-title">为什么推荐这个方案？</h4>
      <div class="reasons-list">
        ${reasonsHtml}
      </div>
      ${renderWuxingRadar(analysis)}
    </div>
  `;
}

/**
 * 渲染五行雷达图（简化版）
 * @param {Object} analysis - 五行分析
 * @returns {string} HTML
 */
function renderWuxingRadar(analysis) {
  const wuxingList = ['wood', 'fire', 'earth', 'metal', 'water'];
  const names = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };
  
  let indicators = '';
  wuxingList.forEach((w, i) => {
    const angle = (i * 72 - 90) * Math.PI / 180;
    const x = 50 + 35 * Math.cos(angle);
    const y = 50 + 35 * Math.sin(angle);
    const isActive = analysis.current.term?.name === names[w] ||
                     analysis.current.bazi?.name === names[w] ||
                     analysis.current.luck?.name === names[w];
    indicators += `
      <text x="${x}" y="${y}" 
            class="radar-label ${isActive ? 'active' : ''}" 
            text-anchor="middle" dominant-baseline="middle">
        ${names[w]}
      </text>
    `;
  });
  
  // 简单的五边形背景
  const points = wuxingList.map((_, i) => {
    const angle = (i * 72 - 90) * Math.PI / 180;
    return `${50 + 30 * Math.cos(angle)},${50 + 30 * Math.sin(angle)}`;
  }).join(' ');
  
  return `
    <div class="wuxing-radar">
      <svg viewBox="0 0 100 100" class="radar-svg">
        <polygon points="${points}" class="radar-bg" />
        ${indicators}
      </svg>
      <div class="radar-legend">
        ${analysis.current.term ? `
          <span class="legend-item">
            <span class="legend-dot" style="background:${analysis.current.term.color}"></span>
            ${analysis.current.term.desc}
          </span>
        ` : ''}
        ${analysis.current.bazi ? `
          <span class="legend-item">
            <span class="legend-dot" style="background:${analysis.current.bazi.color}"></span>
            ${analysis.current.bazi.desc}
          </span>
        ` : ''}
      </div>
    </div>
  `;
}
