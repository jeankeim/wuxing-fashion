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
   * @returns {Object} { total: 总分, breakdown: 分项得分, rejected: 是否被淘汰 }
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

    // 1. 计算原始分数 (0-100)
    const rawWeather = this.scoreWeather(scheme);
    const rawScene = this.scoreScene(scheme);
    const rawSolarTerm = this.scoreSolarTerm(scheme);
    const rawBazi = this.user.bazi ? this.scoreBazi(scheme) : 0;
    
    // 2. 一票否决权：天气和场景必须达到及格线
    if (rawWeather < SCORING_WEIGHTS.threshold.weather) {
      // 天气不匹配，直接淘汰
      const result = {
        total: -100,
        breakdown: { ...breakdown, weather: rawWeather },
        weights: { ...this.weights },
        rejected: true,
        rejectReason: '天气不匹配'
      };
      this._cache.set(cacheKey, result);
      return result;
    }
    
    if (rawScene < SCORING_WEIGHTS.threshold.scene) {
      // 场景不匹配，直接淘汰
      const result = {
        total: -100,
        breakdown: { ...breakdown, scene: rawScene },
        weights: { ...this.weights },
        rejected: true,
        rejectReason: '场景不匹配'
      };
      this._cache.set(cacheKey, result);
      return result;
    }
    
    // 3. 通过门槛，计算加权分数
    breakdown.weather = rawWeather * this.weights.weather;
    breakdown.scene = rawScene * this.weights.scene;
    breakdown.solarTerm = rawSolarTerm * this.weights.solarTerm;
    breakdown.bazi = rawBazi * this.weights.bazi;
    
    // 4. Bonus 分数
    breakdown.wish = this.scoreWish(scheme) * SCORING_WEIGHTS.bonus.wish;
    breakdown.history = this.scoreHistory(scheme) * SCORING_WEIGHTS.bonus.history;
    breakdown.dailyLuck = this.scoreDailyLuck(scheme) * SCORING_WEIGHTS.bonus.dailyLuck;

    // 5. 计算总分
    const baseTotal = breakdown.solarTerm + breakdown.scene + breakdown.weather;
    const baziScore = breakdown.bazi; // 八字可以有负分
    const bonusTotal = breakdown.wish + breakdown.history + breakdown.dailyLuck;
    
    // 总分 = 基础分 + 八字分 + bonus
    let total = baseTotal + baziScore + bonusTotal;
    total = Math.max(0, Math.min(100, total));

    const result = {
      total: Math.round(total),
      breakdown,
      weights: { ...this.weights },
      rejected: false
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
   * 八字评分（按新策略：喜用神+100，相生+57，其他+0，忌神-57）
   * 加权后：喜用神+35，相生+20，忌神-20
   */
  scoreBazi(scheme) {
    const bazi = this.user.bazi;
    if (!bazi || !bazi.recommend) return 0;

    const schemeElement = scheme.color.wuxing;
    const usefulGod = bazi.recommend.recommend; // 喜用神
    const strongest = bazi.recommend.strongest; // 最旺五行（可能是忌神）
    
    // 喜用神匹配 = 100分（加权后+35）
    if (schemeElement === usefulGod) {
      return 100;
    }
    
    // 忌神匹配 = -57分（加权后-20）
    if (schemeElement === strongest && strongest !== usefulGod) {
      return -57;
    }
    
    // 相生关系 = 57分（加权后+20）
    if (getElementRelationScore(usefulGod, schemeElement) >= 80) {
      return 57;
    }
    
    // 其他情况 = 0分（不加不减）
    return 0;
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
    if (!wishId) return 0;

    // 根据心愿类型获取对应五行
    const intentionTemplate = this.context.intentionTemplate;
    const wishIntention = intentionTemplate?.intention || this.getIntentionFromWishId(wishId);
    
    if (!wishIntention) return 30;
    
    // 获取心愿对应的五行
    const wishWuxing = this.getWuxingForIntention(wishIntention);
    if (!wishWuxing) return 30;
    
    const schemeWuxing = scheme.color.wuxing;
    
    // 心愿五行与方案五行匹配
    if (wishWuxing === schemeWuxing) {
      return 100; // 完全匹配
    }
    
    // 相生关系
    if (getElementRelationScore(wishWuxing, schemeWuxing) >= 80) {
      return 70;
    }
    
    // 其他情况
    return 40;
  }
  
  /**
   * 从心愿ID推断心愿类型
   */
  getIntentionFromWishId(wishId) {
    // 心愿ID到类型的映射（支持直接匹配完整ID）
    const wishIdMap = {
      // 事业财运
      'job': '求职',
      'promotion': '升职加薪',
      'deal': '签单顺利',
      'gui_ren': '贵人运',
      'avoid': '防小人避坑',
      // 情感人际
      'taohua': '桃花朵朵',
      'family': '家庭和睦',
      'reconcile': '挽回缓和',
      '新朋友缘': '新朋友缘',
      // 身心状态
      'energy': '精力充沛',
      'sleep': '安神助眠',
      'confidence': '增强自信',
      'calm': '静心专注',
      // 健康平安
      'health': '健康舒畅',
      'recovery': '身体康复',
      'safety': '出行平安',
      'travel': '远行顺利'
    };
    
    // 直接匹配
    if (wishIdMap[wishId]) return wishIdMap[wishId];
    
    // 尝试匹配前缀
    for (const [prefix, intention] of Object.entries(wishIdMap)) {
      if (wishId.startsWith(prefix)) return intention;
    }
    
    return null;
  }
  
  /**
   * 获取心愿对应的五行
   */
  getWuxingForIntention(intention) {
    // 心愿到五行的映射（基于五行生克和象征意义）
    const intentionWuxingMap = {
      // 木 - 生长、发展、求职、健康、人缘
      '求职': 'wood',
      '求职顺利': 'wood',
      '身体康复': 'wood',
      '精力充沛': 'wood',
      '新朋友缘': 'wood',
      
      // 火 - 热情、名声、桃花、自信、活力
      '桃花朵朵': 'fire',
      '增强自信': 'fire',
      '升职加薪': 'fire',
      '贵人运': 'fire',
      '元气满满': 'fire',
      
      // 土 - 稳定、家庭、信任、和睦、情绪
      '家庭和睦': 'earth',
      '签单顺利': 'earth',
      '挽回缓和': 'earth',
      '健康舒畅': 'earth',
      '出行平安': 'earth',
      '远行顺利': 'earth',
      '情绪稳定': 'earth',
      
      // 金 - 决断、肃杀、避坑、专注
      '防小人避坑': 'metal',
      '静心专注': 'metal',
      
      // 水 - 智慧、流动、安眠、沟通
      '安神助眠': 'water',
      '深度沟通': 'water'
    };
    
    return intentionWuxingMap[intention] || null;
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
   * 今日运势评分 - 基于八字喜用神计算
   */
  scoreDailyLuck(scheme) {
    const bazi = this.user.bazi;
    const schemeElement = scheme.color.wuxing;
    
    // 如果有八字，基于喜用神计算运势
    if (bazi && bazi.recommend) {
      const usefulGod = bazi.recommend.recommend; // 喜用神
      const strongest = bazi.recommend.strongest; // 最旺五行
      
      // 喜用神 = 运势最佳
      if (schemeElement === usefulGod) {
        return 100;
      }
      
      // 相生关系 = 运势增益
      if (getElementRelationScore(usefulGod, schemeElement) >= 80) {
        return 70;
      }
      
      // 忌神 = 运势不佳
      if (schemeElement === strongest && strongest !== usefulGod) {
        return 30;
      }
      
      return 50;
    }
    
    // 无八字时，基于节气五行计算
    const termWuxing = this.context.termWuxing;
    if (termWuxing) {
      // 与节气同五行 = 顺应天时
      if (schemeElement === termWuxing) {
        return 80;
      }
      
      // 相生关系
      if (getElementRelationScore(termWuxing, schemeElement) >= 80) {
        return 60;
      }
      
      return 40;
    }

    return 50;
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
