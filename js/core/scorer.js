/**
 * RecommendationScorer - 推荐评分器类
 * 封装所有评分逻辑，支持单元测试
 */

import {
  SCORING_WEIGHTS,
  WEATHER_ELEMENT_MAP,
  TEMPERATURE_ELEMENT,
  getDynamicWeights,
  getElementRelationScore
} from './scoring-config.js';

export class RecommendationScorer {
  constructor(userProfile, context) {
    this.user = userProfile || {};
    this.context = context || {};
    this.weights = getDynamicWeights(userProfile);
    
    // 缓存计算结果
    this._cache = new Map();
  }

  /**
   * 计算单个方案的总得分
   * @param {Object} scheme - 穿搭方案
   * @returns {Object} { total: 总分, breakdown: 分项得分 }
   */
  score(scheme) {
    const cacheKey = scheme.id;
    if (this._cache.has(cacheKey)) {
      return this._cache.get(cacheKey);
    }

    const breakdown = {
      solarTerm: 0,
      bazi: 0,
      scene: 0,
      weather: 0,
      wish: 0,
      history: 0,
      dailyLuck: 0
    };

    // 1. 基础分 (客观环境)
    breakdown.solarTerm = this.scoreSolarTerm(scheme) * this.weights.solarTerm;
    breakdown.weather = this.scoreWeather(scheme) * this.weights.weather;
    breakdown.scene = this.scoreScene(scheme) * this.weights.scene;
    
    // 2. 核心分 (个人命理)
    if (this.weights.bazi > 0 && this.user.bazi) {
      breakdown.bazi = this.scoreBazi(scheme) * this.weights.bazi;
    }
    
    // 3. 心愿分
    breakdown.wish = this.scoreWish(scheme) * this.weights.wish;

    // 4. 个性化加成 (历史行为)
    breakdown.history = this.scoreHistory(scheme) * SCORING_WEIGHTS.bonus.history;
    
    // 5. 今日运势
    breakdown.dailyLuck = this.scoreDailyLuck(scheme) * SCORING_WEIGHTS.bonus.dailyLuck;

    // 计算总分
    const total = Object.values(breakdown).reduce((sum, score) => sum + score, 0);

    const result = {
      total: Math.round(total),
      breakdown,
      weights: { ...this.weights }
    };

    this._cache.set(cacheKey, result);
    return result;
  }

  /**
   * 节气评分
   * 方案五行与节气五行的关系
   */
  scoreSolarTerm(scheme) {
    const termElement = this.context.termWuxing;
    if (!termElement) return 50; // 默认中等分数
    
    return getElementRelationScore(termElement, scheme.color.wuxing);
  }

  /**
   * 八字评分（带喜用神和忌神机制）
   */
  scoreBazi(scheme) {
    const bazi = this.user.bazi;
    if (!bazi || !bazi.recommend) return 0;

    const schemeElement = scheme.color.wuxing;
    const usefulGod = bazi.recommend.recommend; // 喜用神
    const strongest = bazi.recommend.strongest; // 最旺五行（可能是忌神）
    
    // 喜用神匹配 = 满分
    if (schemeElement === usefulGod) {
      return 100;
    }
    
    // 忌神匹配 = 负分（惩罚机制）
    if (schemeElement === strongest && strongest !== usefulGod) {
      return -20;
    }
    
    // 相生关系
    if (getElementRelationScore(usefulGod, schemeElement) >= 80) {
      return 70;
    }
    
    // 其他情况
    return 30;
  }

  /**
   * 场景评分
   */
  scoreScene(scheme) {
    const sceneId = this.context.sceneId;
    if (!sceneId || sceneId === 'daily') {
      return 60; // 日常场景默认中等
    }

    // 从 SCENE_PREFERENCES 获取场景偏好
    const scenePref = this.context.scenePreferences?.[sceneId];
    if (!scenePref) return 50;

    let score = 0;

    // 五行匹配
    if (scenePref.wuxing?.includes(scheme.color.wuxing)) {
      score += 60;
    }

    // 材质匹配
    const materialMatch = scenePref.materials?.some(m => 
      scheme.material.includes(m)
    );
    if (materialMatch) {
      score += 40;
    }

    return Math.min(score, 100);
  }

  /**
   * 天气评分（五行能量场联动）
   */
  scoreWeather(scheme) {
    const weather = this.context.weather;
    if (!weather || !weather.current) return 50;

    const schemeElement = scheme.color.wuxing;
    let score = 0;

    // 1. 天气五行能量场
    const weatherElement = WEATHER_ELEMENT_MAP[weather.current.type];
    if (weatherElement) {
      const relation = getElementRelationScore(weatherElement, schemeElement);
      
      // 如果天气五行过旺，推荐相克五行来平衡
      if (relation >= 80) {
        // 相生，加分较少（避免过旺）
        score += 40;
      } else if (relation <= 40) {
        // 相克，加分较多（平衡能量）
        score += 80;
      } else {
        score += 60;
      }
    }

    // 2. 温度调候
    const tempElement = TEMPERATURE_ELEMENT[weather.current.tempLevel];
    if (tempElement) {
      const tempRelation = getElementRelationScore(tempElement, schemeElement);
      if (tempRelation <= 40) {
        // 温度与方案五行相克 = 调候得当
        score += 20;
      }
    }

    // 3. 材质实用性
    const weatherRec = this.context.weatherRecommendation;
    if (weatherRec?.materials?.some(m => scheme.material.includes(m))) {
      score += 20;
    }

    return Math.min(score, 100);
  }

  /**
   * 心愿评分
   */
  scoreWish(scheme) {
    const wishId = this.context.wishId;
    if (!wishId) return 50;

    // 如果有心愿模板，使用模板中的五行
    const intentionTemplate = this.context.intentionTemplate;
    if (intentionTemplate) {
      // 这里简化处理，实际应该根据模板内容评分
      return 70;
    }

    return 50;
  }

  /**
   * 历史偏好评分
   */
  scoreHistory(scheme) {
    const prefs = this.user.preferences;
    if (!prefs) return 0;

    let score = 0;

    // 五行偏好
    const wuxingScore = prefs.wuxingScores?.[scheme.color.wuxing] || 0;
    const maxWuxing = Math.max(...Object.values(prefs.wuxingScores || {}), 1);
    score += (wuxingScore / maxWuxing) * 40;

    // 颜色偏好
    const colorScore = prefs.colorScores?.[scheme.color.name] || 0;
    const maxColor = Math.max(...Object.values(prefs.colorScores || {}), 1);
    score += (colorScore / maxColor) * 30;

    // 材质偏好
    const materialScore = prefs.materialScores?.[scheme.material] || 0;
    const maxMaterial = Math.max(...Object.values(prefs.materialScores || {}), 1);
    score += (materialScore / maxMaterial) * 30;

    return score;
  }

  /**
   * 今日运势评分
   */
  scoreDailyLuck(scheme) {
    const luck = this.context.dailyLuck;
    if (!luck) return 50;

    const schemeElement = scheme.color.wuxing;
    
    // 幸运五行
    if (schemeElement === luck.luckyWuxing) {
      return 100;
    }
    
    // 增益五行
    if (schemeElement === luck.boostWuxing) {
      return 70;
    }

    return 40;
  }

  /**
   * 批量评分并排序
   * @param {Array} schemes - 方案列表
   * @returns {Array} 按得分排序的方案列表
   */
  scoreAll(schemes) {
    const scored = schemes.map(scheme => ({
      scheme,
      ...this.score(scheme)
    }));

    // 按总分降序
    scored.sort((a, b) => b.total - a.total);

    return scored;
  }

  /**
   * 获取推荐理由解释
   * @param {Object} scheme - 方案
   * @returns {Array} 推荐理由列表
   */
  getExplanation(scheme) {
    const result = this.score(scheme);
    const explanations = [];
    const { breakdown } = result;

    // 找出得分最高的维度
    const entries = Object.entries(breakdown)
      .filter(([_, score]) => score > 0)
      .sort((a, b) => b[1] - a[1]);

    const dimensionNames = {
      solarTerm: '节气匹配',
      bazi: '八字喜用',
      scene: '场景适配',
      weather: '天气调候',
      wish: '心愿契合',
      history: '个人偏好',
      dailyLuck: '今日运势'
    };

    for (const [key, score] of entries.slice(0, 3)) {
      const percentage = Math.round((score / result.total) * 100);
      explanations.push({
        dimension: dimensionNames[key],
        score: Math.round(score),
        percentage
      });
    }

    return explanations;
  }
}

export default RecommendationScorer;
