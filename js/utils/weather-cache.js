/**
 * WeatherCache - 天气数据缓存工具
 * 实现方案2：LocalStorage 缓存 + 30分钟过期
 */

const CACHE_KEY = 'wuxing_weather_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30分钟

/**
 * 获取缓存的天气数据
 * @returns {Object|null} 缓存的天气数据或null
 */
export function getCachedWeather() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const { data, timestamp, location } = JSON.parse(cached);
    
    // 检查是否过期
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    // 检查位置是否变化（如果用户切换了城市）
    const currentLocation = localStorage.getItem('wuxing_weather_location');
    if (currentLocation && location && currentLocation !== location) {
      // 位置变化，缓存失效
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return data;
  } catch (error) {
    console.warn('[WeatherCache] 读取缓存失败:', error);
    return null;
  }
}

/**
 * 设置天气数据缓存
 * @param {Object} data - 天气数据
 * @param {string} location - 位置信息（可选）
 */
export function setCachedWeather(data, location = null) {
  try {
    const cache = {
      data,
      timestamp: Date.now(),
      location: location || localStorage.getItem('wuxing_weather_location') || 'default'
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn('[WeatherCache] 写入缓存失败:', error);
  }
}

/**
 * 清除天气缓存
 */
export function clearCachedWeather() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.warn('[WeatherCache] 清除缓存失败:', error);
  }
}

/**
 * 检查缓存是否有效
 * @returns {boolean}
 */
export function hasValidCache() {
  return getCachedWeather() !== null;
}

/**
 * 获取缓存剩余时间（秒）
 * @returns {number} 剩余秒数，0表示已过期
 */
export function getCacheRemainingTime() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return 0;
    
    const { timestamp } = JSON.parse(cached);
    const elapsed = Date.now() - timestamp;
    const remaining = Math.max(0, CACHE_DURATION - elapsed);
    return Math.floor(remaining / 1000);
  } catch (error) {
    return 0;
  }
}
