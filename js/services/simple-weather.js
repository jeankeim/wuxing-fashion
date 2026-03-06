/**
 * Simple Weather Module - 轻量级天气服务
 * 优先使用 Open-Meteo API 获取真实天气，失败时回退到季节推断
 */

import { getUTC8Date } from './solar-terms.js';
import { getCurrentWeather, getWeatherRecommendation } from './weather.js';
import { getCachedWeather, setCachedWeather } from '../utils/weather-cache.js';

// 季节配置
const SEASON_CONFIG = {
  spring: {
    name: '春季',
    icon: '🌸',
    months: [2, 3, 4], // 3-5月
    terms: ['立春', '雨水', '惊蛰', '春分', '清明', '谷雨'],
    materials: ['棉', '麻', '针织', '轻薄面料'],
    colors: ['绿色', '粉色', '浅黄', '米色'],
    tips: '春暖花开，选择透气舒适的面料',
    tempRange: '15-25°C'
  },
  summer: {
    name: '夏季',
    icon: '☀️',
    months: [5, 6, 7], // 6-8月
    terms: ['立夏', '小满', '芒种', '夏至', '小暑', '大暑'],
    materials: ['棉', '麻', '丝', '冰丝', '透气网眼'],
    colors: ['白色', '浅蓝', '浅绿', '米色'],
    tips: '炎热多汗，选择轻薄透气、吸汗快干的面料',
    tempRange: '25-35°C'
  },
  autumn: {
    name: '秋季',
    icon: '🍂',
    months: [8, 9, 10], // 9-11月
    terms: ['立秋', '处暑', '白露', '秋分', '寒露', '霜降'],
    materials: ['棉', '针织', '薄羊毛', '牛仔'],
    colors: ['棕色', '橙色', '卡其', '深绿'],
    tips: '秋高气爽，早晚温差大，建议层次穿搭',
    tempRange: '10-25°C'
  },
  winter: {
    name: '冬季',
    icon: '❄️',
    months: [11, 0, 1], // 12-2月
    terms: ['立冬', '小雪', '大雪', '冬至', '小寒', '大寒'],
    materials: ['羽绒', '羊毛', '羊绒', '厚棉', '呢料'],
    colors: ['黑色', '深灰', '藏青', '酒红'],
    tips: '寒冷保暖，选择防风保暖的厚重面料',
    tempRange: '-5-10°C'
  }
};

// 内存缓存（用于同一会话）
let memoryCache = null;

/**
 * 获取当前季节
 * @param {Date} date 
 * @returns {string} 季节key
 */
function getCurrentSeason(date = new Date()) {
  const month = date.getMonth(); // 0-11
  
  for (const [key, config] of Object.entries(SEASON_CONFIG)) {
    if (config.months.includes(month)) {
      return key;
    }
  }
  
  return 'spring'; // 默认春季
}

/**
 * 获取天气数据（优先使用缓存，其次真实 API）
 * @returns {Promise<Object>} 天气数据
 */
export async function getSimpleWeather() {
  // 1. 优先检查内存缓存（同一会话内最快）
  if (memoryCache) {
    return memoryCache;
  }
  
  // 2. 检查 LocalStorage 缓存（跨会话）
  const localCache = getCachedWeather();
  if (localCache) {
    memoryCache = localCache;
    return localCache;
  }
  
  try {
    // 尝试获取真实天气数据
    const realWeather = await getCurrentWeather();
    const recommendation = getWeatherRecommendation(realWeather.current);
    
    // 根据温度推断季节
    const temp = realWeather.current.temperature;
    let seasonKey = 'spring';
    if (temp >= 25) seasonKey = 'summer';
    else if (temp >= 15) seasonKey = 'spring';
    else if (temp >= 10) seasonKey = 'autumn';
    else seasonKey = 'winter';
    
    const season = SEASON_CONFIG[seasonKey];
    
    const weather = {
      season: seasonKey,
      seasonName: realWeather.current.name,  // 真实天气名称（晴、雨等）
      icon: realWeather.current.icon,        // 真实天气图标
      temperature: temp,                     // 真实温度数值
      humidity: realWeather.current.humidity, // 真实湿度
      tempRange: `${temp}°C`,                // 显示实际温度
      materials: recommendation.materials || season.materials,
      colors: recommendation.colors || season.colors,
      tips: recommendation.tips || season.tips,
      currentTerm: null,
      date: new Date().toISOString().split('T')[0],
      source: 'real',                        // 标记为真实天气
      raw: realWeather                       // 保留原始数据
    };
    
    // 更新缓存（内存 + LocalStorage）
    memoryCache = weather;
    setCachedWeather(weather);
    
    return weather;
  } catch (error) {
    console.warn('获取真实天气失败，使用季节推断:', error);
    
    // 回退到季节推断
    const date = getUTC8Date();
    const seasonKey = getCurrentSeason(date);
    const season = SEASON_CONFIG[seasonKey];
    
    const month = date.getMonth();
    const termMap = {
      0: '小寒/大寒', 1: '立春/雨水', 2: '惊蛰/春分', 3: '清明/谷雨',
      4: '立夏/小满', 5: '芒种/夏至', 6: '小暑/大暑', 7: '立秋/处暑',
      8: '白露/秋分', 9: '寒露/霜降', 10: '立冬/小雪', 11: '大雪/冬至'
    };
    const currentTerm = termMap[month] || null;
    
    const weather = {
      season: seasonKey,
      seasonName: season.name,
      icon: season.icon,
      tempRange: season.tempRange,
      materials: season.materials,
      colors: season.colors,
      tips: season.tips,
      currentTerm: currentTerm,
      date: date.toISOString().split('T')[0],
      source: 'simple'
    };
    
    // 更新缓存（内存 + LocalStorage）
    memoryCache = weather;
    setCachedWeather(weather);
    
    return weather;
  }
}

/**
 * 预加载天气数据（用于后台静默加载）
 * @returns {Promise<Object|null>} 天气数据或null
 */
export async function preloadWeather() {
  try {
    // 检查是否已有缓存
    if (memoryCache || getCachedWeather()) {
      return memoryCache || getCachedWeather();
    }
    
    // 静默加载天气
    const weather = await getSimpleWeather();
    return weather;
  } catch (error) {
    // 静默失败，不抛出错误
    console.warn('[SimpleWeather] 预加载失败:', error);
    return null;
  }
}

/**
 * 获取季节推荐
 * @param {string} season 
 * @returns {Object} 推荐配置
 */
export function getSeasonRecommendation(season) {
  const config = SEASON_CONFIG[season] || SEASON_CONFIG.spring;
  
  return {
    materials: config.materials.slice(0, 3),
    colors: config.colors.slice(0, 3),
    tips: config.tips,
    tempRange: config.tempRange
  };
}

/**
 * 获取季节样式
 * @param {string} season 
 * @returns {Object} 样式配置
 */
export function getSeasonStyle(season) {
  const styles = {
    spring: { bg: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', color: '#333' },
    summer: { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff' },
    autumn: { bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: '#fff' },
    winter: { bg: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)', color: '#333' }
  };
  
  return styles[season] || styles.spring;
}

/**
 * 根据季节调整方案得分
 * @param {Object} scheme 
 * @param {string} season 
 * @returns {number} 得分加成
 */
export function calculateSeasonBoost(scheme, season) {
  const config = SEASON_CONFIG[season] || SEASON_CONFIG.spring;
  let boost = 0;
  
  // 材质匹配
  if (config.materials.some(m => scheme.material?.includes(m))) {
    boost += 10;
  }
  
  // 颜色匹配
  if (config.colors.some(c => scheme.color?.name?.includes(c))) {
    boost += 8;
  }
  
  return boost;
}
