/**
 * Solar Terms Module - 节气识别
 */

let termsData = null;

/**
 * 获取UTC+8时间
 */
export function getUTC8Date(date = new Date()) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + 8 * 3600000);
}

/**
 * 加载节气数据
 */
export async function loadTermsData() {
  if (termsData) return termsData;
  
  try {
    const response = await fetch('data/solar-terms.json');
    termsData = await response.json();
    return termsData;
  } catch (error) {
    console.error('[SolarTerms] Failed to load data:', error);
    return null;
  }
}

/**
 * 检测当前节气
 * @param {Date} date - 可选日期，默认为当前日期
 * @returns {Object} 节气信息
 */
export async function detectCurrentTerm(date) {
  const data = await loadTermsData();
  if (!data) return null;
  
  const now = date ? getUTC8Date(date) : getUTC8Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  
  let currentTerm = null;
  let nextTerm = null;
  
  // 查找当前节气
  for (let i = 0; i < data.terms.length; i++) {
    const term = data.terms[i];
    
    if (term.month === month) {
      if (day >= term.dayRange[0]) {
        currentTerm = term;
        nextTerm = data.terms[(i + 1) % data.terms.length];
      }
    }
  }
  
  // 如果没找到，找最近的过去节气
  if (!currentTerm) {
    // 查找上个月的节气
    const prevMonth = month === 1 ? 12 : month - 1;
    for (let i = data.terms.length - 1; i >= 0; i--) {
      const term = data.terms[i];
      if (term.month === prevMonth && day < data.terms[(i + 1) % data.terms.length].dayRange[0]) {
        currentTerm = term;
        nextTerm = data.terms[(i + 1) % data.terms.length];
        break;
      }
    }
  }
  
  // 默认使用立春
  if (!currentTerm) {
    currentTerm = data.terms[0];
    nextTerm = data.terms[1];
  }
  
  // 获取季节信息
  let seasonInfo = null;
  for (const [season, info] of Object.entries(data.seasons)) {
    if (info.terms.includes(currentTerm.id)) {
      seasonInfo = { name: season, wuxing: info.wuxing };
      break;
    }
  }
  
  return {
    current: {
      id: currentTerm.id,
      name: currentTerm.name,
      wuxing: currentTerm.wuxing,
      wuxingName: data.wuxingNames[currentTerm.wuxing]
    },
    next: nextTerm ? {
      id: nextTerm.id,
      name: nextTerm.name,
      wuxing: nextTerm.wuxing
    } : null,
    seasonInfo,
    wuxingNames: data.wuxingNames
  };
}

/**
 * 获取节气对应的五行颜色
 */
export function getWuxingColor(wuxing) {
  const colors = {
    wood: '#4A7C59',
    fire: '#C0392B',
    earth: '#C9A84C',
    metal: '#B8B8A8',
    water: '#1B3A6B'
  };
  return colors[wuxing] || '#666666';
}
