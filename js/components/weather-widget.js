/**
 * Weather Widget Component - 天气小组件
 * 显示当前天气和穿搭建议
 */

import { Component } from './base.js';
import { getCurrentPosition, getWeatherData, getWeatherRecommendation, getWeatherStyle } from '../services/weather.js';

/**
 * 天气小组件
 */
export class WeatherWidget extends Component {
  init() {
    this.state = {
      loading: true,
      error: null,
      weather: null,
      location: null
    };
  }

  async render() {
    const { loading, error, weather, location } = this.state;

    if (loading) {
      this.container.innerHTML = `
        <div class="weather-widget loading">
          <div class="weather-spinner"></div>
          <p>正在获取天气...</p>
        </div>
      `;
      return;
    }

    if (error) {
      this.container.innerHTML = `
        <div class="weather-widget error">
          <p>⚠️ ${error}</p>
          <div class="weather-manual-input">
            <select id="city-select" class="city-select">
              <option value="">选择城市</option>
              <option value="39.9,116.4">北京</option>
              <option value="31.2,121.5">上海</option>
              <option value="23.1,113.3">广州</option>
              <option value="22.5,114.1">深圳</option>
              <option value="30.3,120.2">杭州</option>
              <option value="30.7,104.1">成都</option>
              <option value="29.6,106.5">重庆</option>
              <option value="34.3,108.9">西安</option>
              <option value="38.9,121.6">大连</option>
              <option value="36.1,120.4">青岛</option>
              <option value="24.9,118.7">厦门</option>
              <option value="25.0,102.7">昆明</option>
            </select>
            <button class="btn btn-sm" id="retry-weather">重试定位</button>
          </div>
        </div>
      `;
      return;
    }

    if (!weather) return;

    const recommendation = getWeatherRecommendation(weather.current);
    const style = getWeatherStyle(weather.current);

    this.container.innerHTML = `
      <div class="weather-widget" style="background: ${style.bg}; color: ${style.color}">
        <div class="weather-main">
          <div class="weather-icon">${weather.current.icon}</div>
          <div class="weather-info">
            <span class="weather-temp">${weather.current.temperature}°C</span>
            <span class="weather-name">${weather.current.name}</span>
          </div>
        </div>
        
        <div class="weather-details">
          <span class="weather-humidity">💧 ${weather.current.humidity}%</span>
          ${location ? `<span class="weather-location">📍 ${location.city || '当前位置'}</span>` : ''}
        </div>
        
        <div class="weather-tip">
          <p>${recommendation.fullTip}</p>
        </div>
        
        <div class="weather-recommend">
          <div class="recommend-section">
            <span class="recommend-label">推荐材质</span>
            <div class="recommend-tags">
              ${recommendation.materials.slice(0, 3).map(m => `<span class="recommend-tag">${m}</span>`).join('')}
            </div>
          </div>
          <div class="recommend-section">
            <span class="recommend-label">推荐颜色</span>
            <div class="recommend-tags">
              ${recommendation.colors.slice(0, 3).map(c => `<span class="recommend-tag">${c}</span>`).join('')}
            </div>
          </div>
        </div>
        
        ${weather.forecast && weather.forecast.length > 0 ? `
          <div class="weather-forecast">
            <span class="forecast-title">未来3天</span>
            <div class="forecast-list">
              ${weather.forecast.slice(0, 3).map(day => `
                <div class="forecast-item">
                  <span class="forecast-date">${this.formatDate(day.date)}</span>
                  <span class="forecast-icon">${day.icon}</span>
                  <span class="forecast-temp">${day.minTemp}°-${day.maxTemp}°</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  bindEvents() {
    this.addEventListener(this.container, 'click', (e) => {
      if (e.target.closest('#retry-weather')) {
        this.loadWeather();
      }
    });

    this.addEventListener(this.container, 'change', (e) => {
      if (e.target.closest('#city-select')) {
        const value = e.target.value;
        if (value) {
          const [lat, lon] = value.split(',').map(Number);
          this.loadWeatherWithCoords(lat, lon, e.target.options[e.target.selectedIndex].text);
        }
      }
    });
  }

  async onMount() {
    await this.loadWeather();
  }

  async loadWeather() {
    this.setState({ loading: true, error: null });

    try {
      // 获取位置
      const position = await getCurrentPosition();
      
      // 获取天气
      const weather = await getWeatherData(position.lat, position.lon);
      
      this.setState({
        loading: false,
        weather,
        location: { city: '当前位置' } // 可以扩展获取城市名
      });
    } catch (error) {
      this.setState({
        loading: false,
        error: error.message || '获取天气失败'
      });
    }
  }

  async loadWeatherWithCoords(lat, lon, cityName) {
    this.setState({ loading: true, error: null });

    try {
      const weather = await getWeatherData(lat, lon);
      
      this.setState({
        loading: false,
        weather,
        location: { city: cityName }
      });
    } catch (error) {
      this.setState({
        loading: false,
        error: error.message || '获取天气失败'
      });
    }
  }

  formatDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (dateStr === today.toISOString().split('T')[0]) return '今天';
    if (dateStr === tomorrow.toISOString().split('T')[0]) return '明天';
    
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
}

/**
 * 天气影响提示组件
 * 在推荐结果中显示天气影响
 */
export class WeatherImpact extends Component {
  render() {
    const { weather, boost } = this.props;
    
    if (!weather || boost <= 0) return;

    this.container.innerHTML = `
      <div class="weather-impact">
        <span class="impact-icon">🌤️</span>
        <span class="impact-text">天气适配 +${boost}分</span>
        <span class="impact-detail">${weather.name} ${weather.temperature}°C</span>
      </div>
    `;
  }
}
