/**
 * Simple Weather Widget - 轻量级天气组件
 * 基于季节/节气，无需外部 API
 */

import { Component } from './base.js';
import { getSimpleWeather, getSeasonStyle } from '../services/simple-weather.js';
import { getCachedWeather } from '../utils/weather-cache.js';

export class SimpleWeatherWidget extends Component {
  init() {
    this.state = {
      loading: false,
      weather: null
    };
    
    // 【优化】优先使用缓存数据立即显示
    const cachedWeather = getCachedWeather();
    if (cachedWeather) {
      this.state.weather = cachedWeather;
      console.log('[WeatherWidget] 使用缓存数据立即显示');
    }
  }

  async render() {
    const { weather } = this.state;

    if (!weather) {
      this.container.innerHTML = `
        <div class="simple-weather-widget loading">
          <span>🌤️</span>
          <span>--°</span>
        </div>
      `;
      return;
    }

    const style = getSeasonStyle(weather.season);

    // 根据数据来源调整显示
    const isRealWeather = weather.source === 'real';
    const tempDisplay = isRealWeather 
      ? `${weather.temperature}°C ${weather.humidity ? `· 湿度${weather.humidity}%` : ''}`
      : weather.tempRange;
    
    this.container.innerHTML = `
      <div class="simple-weather-widget" style="background: ${style.bg}; color: ${style.color}">
        <div class="simple-weather-main">
          <span class="simple-weather-icon">${weather.icon}</span>
          <div class="simple-weather-info">
            <span class="simple-weather-season">${weather.seasonName}</span>
            <span class="simple-weather-temp">${tempDisplay}</span>
          </div>
        </div>
        ${weather.currentTerm ? `<span class="simple-weather-term">${weather.currentTerm}</span>` : ''}
        <div class="simple-weather-tags">
          <span class="simple-tag">${weather.materials[0]}</span>
          <span class="simple-tag">${weather.colors[0]}</span>
        </div>
      </div>
    `;
  }

  async onMount() {
    // 如果已有缓存数据，先显示缓存，后台更新
    const cachedWeather = getCachedWeather();
    
    try {
      // 获取最新天气数据（会更新缓存）
      const weather = await getSimpleWeather();
      
      // 只有当数据变化时才重新渲染
      if (JSON.stringify(weather) !== JSON.stringify(cachedWeather)) {
        this.setState({ weather });
      }
    } catch (error) {
      // 如果获取失败但已有缓存，保持缓存显示
      if (!cachedWeather) {
        console.error('[WeatherWidget] 加载天气失败:', error);
      }
    }
  }
}

/**
 * 季节影响提示组件
 */
export class SeasonImpact extends Component {
  render() {
    const { season, boost } = this.props;
    
    if (!season || boost <= 0) return;

    const seasonNames = {
      spring: '春季',
      summer: '夏季',
      autumn: '秋季',
      winter: '冬季'
    };

    this.container.innerHTML = `
      <div class="season-impact">
        <span class="impact-icon">🌿</span>
        <span class="impact-text">${seasonNames[season]}适配 +${boost}分</span>
      </div>
    `;
  }
}
