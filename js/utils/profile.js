/**
 * Profile Module - 用户画像可视化
 * 展示用户的偏好统计和趋势
 */

import { getUserPreferences, getFeedbackData, getDailyLuckFactors } from '../services/recommendation.js';

// 五行名称映射
const WUXING_NAMES = {
  wood: '木', fire: '火', earth: '土', metal: '金', water: '水'
};

// 五行颜色
const WUXING_COLORS = {
  wood: '#4A7C59', fire: '#C73E1D', earth: '#B8956A',
  metal: '#7D8A8E', water: '#2C5F6E'
};

/**
 * 获取用户画像数据
 * @returns {Object} 用户画像
 */
export function getUserProfile() {
  const prefs = getUserPreferences();
  const feedback = getFeedbackData();
  
  // 计算五行偏好分数（归一化到0-100）
  const wuxingScores = normalizeScores(prefs.wuxingScores);
  
  // 计算颜色偏好
  const colorScores = Object.entries(prefs.colorScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  // 计算材质偏好
  const materialScores = Object.entries(prefs.materialScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  // 统计场景使用
  const sceneStats = calculateSceneStats(feedback);
  
  // 互动统计
  const interactionStats = calculateInteractionStats(feedback);
  
  return {
    wuxingScores,
    colorScores,
    materialScores,
    sceneStats,
    interactionStats,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * 归一化分数
 * @param {Object} scores - 原始分数
 * @returns {Object} 归一化后的分数
 */
function normalizeScores(scores) {
  const values = Object.values(scores);
  const max = Math.max(...values, 1);
  
  const normalized = {};
  for (const [key, value] of Object.entries(scores)) {
    normalized[key] = Math.round((value / max) * 100);
  }
  
  // 确保所有五行都有值
  const wuxingList = ['wood', 'fire', 'earth', 'metal', 'water'];
  wuxingList.forEach(w => {
    if (normalized[w] === undefined) {
      normalized[w] = 0;
    }
  });
  
  return normalized;
}

/**
 * 计算场景统计
 * @param {Object} feedback - 反馈数据
 * @returns {Object} 场景统计
 */
function calculateSceneStats(feedback) {
  // 这里简化处理，实际应该记录每次生成的场景
  // 返回模拟数据
  return {
    daily: 45,
    work: 25,
    date: 15,
    party: 10,
    sport: 5
  };
}

/**
 * 计算互动统计
 * @param {Object} feedback - 反馈数据
 * @returns {Object} 互动统计
 */
function calculateInteractionStats(feedback) {
  let views = 0;
  let selects = 0;
  
  Object.values(feedback).forEach(f => {
    views += f.views || 0;
    selects += f.selects || 0;
  });
  
  return { views, selects };
}

/**
 * 渲染五行雷达图
 * @param {Object} profile - 用户画像
 * @returns {string} SVG HTML
 */
export function renderWuxingRadarChart(profile) {
  const scores = profile.wuxingScores;
  const wuxingList = ['wood', 'fire', 'earth', 'metal', 'water'];
  const centerX = 100;
  const centerY = 100;
  const radius = 80;
  
  // 计算多边形顶点
  let points = '';
  wuxingList.forEach((wuxing, i) => {
    const angle = (i * 72 - 90) * Math.PI / 180;
    const score = scores[wuxing] || 0;
    const r = radius * (score / 100);
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    points += `${x},${y} `;
  });
  
  // 背景网格
  let grid = '';
  for (let i = 1; i <= 4; i++) {
    const r = radius * (i / 4);
    const gridPoints = wuxingList.map((_, j) => {
      const angle = (j * 72 - 90) * Math.PI / 180;
      return `${centerX + r * Math.cos(angle)},${centerY + r * Math.sin(angle)}`;
    }).join(' ');
    grid += `<polygon points="${gridPoints}" class="radar-grid" />`;
  }
  
  // 轴线
  let axes = '';
  wuxingList.forEach((_, i) => {
    const angle = (i * 72 - 90) * Math.PI / 180;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    axes += `<line x1="${centerX}" y1="${centerY}" x2="${x}" y2="${y}" class="radar-axis" />`;
  });
  
  // 标签
  let labels = '';
  wuxingList.forEach((wuxing, i) => {
    const angle = (i * 72 - 90) * Math.PI / 180;
    const x = centerX + (radius + 20) * Math.cos(angle);
    const y = centerY + (radius + 20) * Math.sin(angle);
    const score = scores[wuxing] || 0;
    labels += `
      <text x="${x}" y="${y}" class="radar-label" text-anchor="middle" dominant-baseline="middle">
        ${WUXING_NAMES[wuxing]}${score > 0 ? ` ${score}` : ''}
      </text>
    `;
  });
  
  return `
    <svg viewBox="0 0 200 220" class="wuxing-radar-chart">
      ${grid}
      ${axes}
      <polygon points="${points}" class="radar-area" />
      ${labels}
    </svg>
  `;
}

/**
 * 渲染颜色偏好柱状图
 * @param {Object} profile - 用户画像
 * @returns {string} HTML
 */
export function renderColorBarChart(profile) {
  const colors = profile.colorScores;
  if (colors.length === 0) {
    return '<p class="chart-empty">暂无颜色偏好数据</p>';
  }
  
  const maxScore = Math.max(...colors.map(c => c[1]), 1);
  
  let bars = '';
  colors.forEach(([color, score], i) => {
    const width = (score / maxScore) * 100;
    bars += `
      <div class="bar-item" style="animation-delay: ${i * 0.1}s">
        <span class="bar-label">${color}</span>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${width}%"></div>
        </div>
        <span class="bar-value">${score}</span>
      </div>
    `;
  });
  
  return `<div class="bar-chart">${bars}</div>`;
}

/**
 * 渲染场景饼图
 * @param {Object} profile - 用户画像
 * @returns {string} SVG HTML
 */
export function renderScenePieChart(profile) {
  const scenes = profile.sceneStats;
  const total = Object.values(scenes).reduce((a, b) => a + b, 0);
  
  if (total === 0) {
    return '<p class="chart-empty">暂无场景数据</p>';
  }
  
  const sceneNames = {
    daily: '日常', work: '职场', date: '约会', party: '聚会', sport: '运动'
  };
  
  const colors = ['#4A7C59', '#C73E1D', '#B8956A', '#7D8A8E', '#2C5F6E'];
  
  let currentAngle = -90; // 从顶部开始
  let slices = '';
  let legend = '';
  
  Object.entries(scenes).forEach(([scene, count], i) => {
    const percentage = count / total;
    const angle = percentage * 360;
    
    // 计算路径
    const startAngle = currentAngle * Math.PI / 180;
    const endAngle = (currentAngle + angle) * Math.PI / 180;
    
    const x1 = 50 + 40 * Math.cos(startAngle);
    const y1 = 50 + 40 * Math.sin(startAngle);
    const x2 = 50 + 40 * Math.cos(endAngle);
    const y2 = 50 + 40 * Math.sin(endAngle);
    
    const largeArc = angle > 180 ? 1 : 0;
    
    slices += `
      <path d="M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z"
            fill="${colors[i]}" class="pie-slice" />
    `;
    
    legend += `
      <div class="pie-legend-item">
        <span class="legend-color" style="background: ${colors[i]}"></span>
        <span class="legend-name">${sceneNames[scene]}</span>
        <span class="legend-value">${Math.round(percentage * 100)}%</span>
      </div>
    `;
    
    currentAngle += angle;
  });
  
  return `
    <div class="pie-chart-container">
      <svg viewBox="0 0 100 100" class="pie-chart">
        ${slices}
        <circle cx="50" cy="50" r="25" fill="white" />
      </svg>
      <div class="pie-legend">${legend}</div>
    </div>
  `;
}

/**
 * 渲染用户画像面板
 * @returns {string} HTML
 */
export function renderUserProfilePanel() {
  const profile = getUserProfile();
  
  return `
    <div class="user-profile-panel">
      <h3 class="profile-title">我的穿搭画像</h3>
      
      <div class="profile-stats">
        <div class="stat-item">
          <span class="stat-value">${profile.interactionStats.views}</span>
          <span class="stat-label">浏览次数</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${profile.interactionStats.selects}</span>
          <span class="stat-label">采纳次数</span>
        </div>
      </div>
      
      <div class="profile-section">
        <h4>五行偏好</h4>
        ${renderWuxingRadarChart(profile)}
      </div>
      
      <div class="profile-section">
        <h4>颜色偏好 TOP5</h4>
        ${renderColorBarChart(profile)}
      </div>
      
      <div class="profile-section">
        <h4>场景分布</h4>
        ${renderScenePieChart(profile)}
      </div>
    </div>
  `;
}
