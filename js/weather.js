/**
 * Weather Module - 天气联动
 * 获取实时天气，根据天气调整穿搭推荐
 */

import { safeFetch, withErrorHandler, ErrorTypes } from './error-handler.js';

// 天气代码映射
const WEATHER_CODES = {
  // 晴天
  0: { name: '晴', icon: '☀️', type: 'sunny' },
  1: { name: ' mainly clear', icon: '🌤️', type: 'clear' },
  2: { name: ' partly cloudy', icon: '⛅', type: 'cloudy' },
  3: { name: ' overcast', icon: '☁️', type: 'cloudy' },
  // 雾
  45: { name: '雾', icon: '🌫️', type: 'fog' },
  48: { name: '雾凇', icon: '🌫️', type: 'fog' },
  // 雨
  51: { name: '毛毛雨', icon: '🌦️', type: 'rain' },
  53: { name: '小雨', icon: '🌦️', type: 'rain' },
  55: { name: '中雨', icon: '🌧️', type: 'rain' },
  61: { name: '小雨', icon: '🌧️', type: 'rain' },
  63: { name: '中雨', icon: '🌧️', type: 'rain' },
  65: { name: '大雨', icon: '🌧️', type: 'rain' },
  80: { name: '阵雨', icon: '🌦️', type: 'rain' },
  81: { name: '强阵雨', icon: '🌧️', type: 'rain' },
  82: { name: '暴雨', icon: '⛈️', type: 'rain' },
  // 雪
  71: { name: '小雪', icon: '🌨️', type: 'snow' },
  73: { name: '中雪', icon: '🌨️', type: 'snow' },
  75: { name: '大雪', icon: '❄️', type: 'snow' },
  77: { name: '雪粒', icon: '🌨️', type: 'snow' },
  85: { name: '阵雪', icon: '🌨️', type: 'snow' },
  86: { name: '强阵雪', icon: '❄️', type: 'snow' },
  // 雷暴
  95: { name: '雷雨', icon: '⛈️', type: 'storm' },
  96: { name: '雷雨伴冰雹', icon: '⛈️', type: 'storm' },
  99: { name: '强雷雨', icon: '⛈️', type: 'storm' }
};

// 天气类型推荐配置
const WEATHER_RECOMMENDATIONS = {
  sunny: {
    materials: ['棉', '麻', '丝', '轻薄面料'],
    colors: ['浅色系', '白色', '米色'],
    tips: '阳光充足，注意防晒，选择透气轻薄的面料',
    umbrella: false
  },
  clear: {
    materials: ['棉', '麻', '针织'],
    colors: ['自然色系'],
    tips: '天气晴好，适合各种穿搭风格',
    umbrella: false
  },
  cloudy: {
    materials: ['棉', '混纺', '轻薄羊毛'],
    colors: ['暖色系', '大地色'],
    tips: '云层较厚，温差可能较大，建议层次穿搭',
    umbrella: false
  },
  rain: {
    materials: ['防水尼龙', '速干面料', '聚酯纤维'],
    colors: ['深色系', '耐脏颜色'],
    tips: '雨天路滑，选择防水快干材质，记得带伞',
    umbrella: true
  },
  snow: {
    materials: ['羽绒', '羊毛', '羊绒', '保暖面料'],
    colors: ['暖色系', '深色系'],
    tips: '天气寒冷，注意保暖，选择防滑鞋履',
    umbrella: false
  },
  fog: {
    materials: ['棉', '防水面料'],
    colors: ['亮色系', '高可见度颜色'],
    tips: '能见度低，选择亮色提高安全性',
    umbrella: false
  },
  storm: {
    materials: ['防水面料', '速干材质'],
    colors: ['深色系'],
    tips: '恶劣天气，尽量减少外出，必须外出时做好防护',
    umbrella: false
  }
};

/**
 * 获取当前位置
 * @returns {Promise<{lat: number, lon: number}>}
 */
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('浏览器不支持地理定位'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
      },
      (error) => {
        reject(new Error('获取位置失败: ' + error.message));
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  });
}

/**
 * 获取天气数据
 * @param {number} lat - 纬度
 * @param {number} lon - 经度
 * @returns {Promise<Object>} 天气数据
 */
export async function getWeatherData(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
  
  const response = await safeFetch(url, {}, 10000);
  const data = await response.json();
  
  return {
    current: parseCurrentWeather(data.current),
    forecast: parseForecast(data.daily)
  };
}

/**
 * 解析当前天气
 * @param {Object} current - API返回的当前天气
 * @returns {Object} 解析后的天气
 */
function parseCurrentWeather(current) {
  const weatherInfo = WEATHER_CODES[current.weather_code] || WEATHER_CODES[0];
  
  return {
    temperature: Math.round(current.temperature_2m),
    humidity: current.relative_humidity_2m,
    weatherCode: current.weather_code,
    ...weatherInfo
  };
}

/**
 * 解析天气预报
 * @param {Object} daily - API返回的每日数据
 * @returns {Array} 预报列表
 */
function parseForecast(daily) {
  const forecast = [];
  
  for (let i = 0; i < daily.time.length; i++) {
    const weatherInfo = WEATHER_CODES[daily.weather_code[i]] || WEATHER_CODES[0];
    
    forecast.push({
      date: daily.time[i],
      maxTemp: Math.round(daily.temperature_2m_max[i]),
      minTemp: Math.round(daily.temperature_2m_min[i]),
      weatherCode: daily.weather_code[i],
      ...weatherInfo
    });
  }
  
  return forecast;
}

/**
 * 获取天气推荐
 * @param {Object} weather - 天气数据
 * @returns {Object} 推荐配置
 */
export function getWeatherRecommendation(weather) {
  const type = weather.type || 'sunny';
  const recommendation = WEATHER_RECOMMENDATIONS[type] || WEATHER_RECOMMENDATIONS.sunny;
  
  // 根据温度调整
  const tempAdjustment = getTempAdjustment(weather.temperature);
  
  return {
    ...recommendation,
    tempAdjustment,
    fullTip: generateWeatherTip(weather, recommendation)
  };
}

/**
 * 获取温度调整建议
 * @param {number} temperature - 温度
 * @returns {Object} 温度建议
 */
function getTempAdjustment(temperature) {
  if (temperature >= 30) {
    return {
      level: 'hot',
      materials: ['冰丝', '真丝', '棉麻', '透气网眼'],
      colors: ['白色', '浅蓝', '浅绿'],
      tip: '高温炎热，选择最轻薄透气的面料'
    };
  } else if (temperature >= 25) {
    return {
      level: 'warm',
      materials: ['棉', '麻', '天丝'],
      colors: ['浅色系'],
      tip: '天气较热，选择透气吸汗材质'
    };
  } else if (temperature >= 15) {
    return {
      level: 'comfortable',
      materials: ['棉', '针织', '薄羊毛'],
      colors: ['自然色系'],
      tip: '温度适宜，穿搭选择较自由'
    };
  } else if (temperature >= 5) {
    return {
      level: 'cool',
      materials: ['羊毛', '羊绒', '厚棉'],
      colors: ['暖色系'],
      tip: '天气较凉，注意保暖'
    };
  } else {
    return {
      level: 'cold',
      materials: ['羽绒', '厚羊毛', '皮草'],
      colors: ['深色系', '暖色'],
      tip: '天气寒冷，重点保暖'
    };
  }
}

/**
 * 生成天气提示
 * @param {Object} weather - 天气数据
 * @param {Object} recommendation - 推荐配置
 * @returns {string} 提示文本
 */
function generateWeatherTip(weather, recommendation) {
  const tempAdjustment = getTempAdjustment(weather.temperature);
  
  let tip = `今日${weather.name}，气温${weather.temperature}°C。`;
  tip += recommendation.tips;
  tip += tempAdjustment.tip;
  
  if (recommendation.umbrella) {
    tip += '记得携带雨具。';
  }
  
  return tip;
}

/**
 * 根据天气调整方案得分
 * @param {Object} scheme - 穿搭方案
 * @param {Object} weather - 天气数据
 * @returns {number} 得分加成
 */
export function calculateWeatherBoost(scheme, weather) {
  let boost = 0;
  
  const recommendation = getWeatherRecommendation(weather);
  
  // 材质匹配
  if (recommendation.materials.some(m => scheme.material.includes(m))) {
    boost += 15;
  }
  
  // 颜色匹配
  if (recommendation.colors.some(c => scheme.color.name.includes(c))) {
    boost += 10;
  }
  
  // 温度适配
  if (recommendation.tempAdjustment.materials.some(m => scheme.material.includes(m))) {
    boost += 10;
  }
  
  return boost;
}

/**
 * 获取天气图标和样式
 * @param {Object} weather - 天气数据
 * @returns {Object} 样式配置
 */
export function getWeatherStyle(weather) {
  const styles = {
    sunny: { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff' },
    clear: { bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: '#fff' },
    cloudy: { bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: '#fff' },
    rain: { bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: '#333' },
    snow: { bg: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)', color: '#333' },
    fog: { bg: 'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)', color: '#333' },
    storm: { bg: 'linear-gradient(135deg, #13547a 0%, #80d0c7 100%)', color: '#fff' }
  };
  
  return styles[weather.type] || styles.sunny;
}
