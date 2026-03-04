/**
 * Simple Weather Widget - 轻量级天气组件
 * 基于季节/节气，无需外部 API
 */

import { Component } from './base.js';
import { getSimpleWeather, getSeasonStyle } from '../services/simple-weather.js';

export class SimpleWeatherWidget extends Component {
  init() {
    this.state = {
      loading: false, // 立即显示，无需加载
      weather: null
    };
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

    this.container.innerHTML = `
      <div class="simple-weather-widget" style="background: ${style.bg}; color: ${style.color}">
        <div class="simple-weather-main">
          <span class="simple-weather-icon">${weather.icon}</span>
          <div class="simple-weather-info">
            <span class="simple-weather-season">${weather.seasonName}</span>
            <span class="simple-weather-temp">${weather.tempRange}</span>
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
    // 立即加载，无需等待
    const weather = await getSimpleWeather();
    this.setState({ weather });
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
