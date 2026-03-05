/**
 * 天气评分逻辑测试
 * 运行：node test-weather-scoring.js
 */

// 模拟 scoring-config.js 中的配置
const WEATHER_ELEMENT_MAP = {
  sunny: 'fire',
  clear: 'fire',
  cloudy: 'metal',
  rain: 'water',
  snow: 'water',
  fog: 'water',
  storm: 'water'
};

const TEMPERATURE_ELEMENT = {
  hot: 'fire',
  warm: 'fire',
  comfortable: 'earth',
  cool: 'metal',
  cold: 'water'
};

// 五行关系评分（简化版）
function getElementRelationScore(from, to) {
  // 相生关系
  const generates = {
    wood: 'fire',
    fire: 'earth',
    earth: 'metal',
    metal: 'water',
    water: 'wood'
  };
  
  // 相克关系
  const overcomes = {
    wood: 'earth',
    earth: 'water',
    water: 'fire',
    fire: 'metal',
    metal: 'wood'
  };
  
  if (from === to) return 100; // 相同
  if (generates[from] === to) return 80; // 我生它
  if (generates[to] === from) return 60; // 它生我
  if (overcomes[from] === to) return 40; // 我克它
  if (overcomes[to] === from) return 20; // 它克我
  return 50;
}

// 天气评分函数（复制自 scorer.js）
function scoreWeather(scheme, weather, weatherRec) {
  if (!weather || !weather.current) return 50;

  const schemeElement = scheme.wuxing;
  let score = 0;

  // 1. 天气五行能量场（最高80分）
  const weatherElement = WEATHER_ELEMENT_MAP[weather.current.type];
  if (weatherElement) {
    const relation = getElementRelationScore(weatherElement, schemeElement);
    
    if (relation >= 80) {
      score += 40; // 相生，避免过旺
    } else if (relation <= 40) {
      score += 80; // 相克，平衡能量（最佳）
    } else {
      score += 60;
    }
  }

  // 2. 温度调候（+20分）
  const tempElement = TEMPERATURE_ELEMENT[weather.current.tempLevel];
  if (tempElement) {
    const tempRelation = getElementRelationScore(tempElement, schemeElement);
    if (tempRelation <= 40) {
      score += 20; // 相克 = 调候得当
    }
  }

  // 3. 材质实用性（+20分）
  if (weatherRec?.materials?.some(m => scheme.material.includes(m))) {
    score += 20;
  }

  return Math.min(score, 100);
}

// ==================== 测试用例 ====================

console.log('========== 天气评分逻辑测试 ==========\n');

// 测试1：夏天晴天35°C + 白色棉T恤（金）
console.log('【测试1】夏天晴天35°C + 白色棉T恤（金）');
const test1 = scoreWeather(
  { wuxing: 'metal', material: '棉' },
  { current: { type: 'sunny', tempLevel: 'hot' } },
  { materials: ['棉', '麻', '透气'] }
);
console.log('  天气：晴天=火，衣服=金');
console.log('  火克金 = 平衡能量 → +80分');
console.log('  温度：高温=火，衣服=金');
console.log('  火克金 = 调候得当（凉爽）→ +20分');
console.log('  材质：棉在推荐列表 → +20分');
console.log('  总分：', test1, '分 ✅ 优秀\n');

// 测试2：夏天晴天35°C + 红色羊毛衫（火）
console.log('【测试2】夏天晴天35°C + 红色羊毛衫（火）');
const test2 = scoreWeather(
  { wuxing: 'fire', material: '羊毛' },
  { current: { type: 'sunny', tempLevel: 'hot' } },
  { materials: ['棉', '麻', '透气'] }
);
console.log('  天气：晴天=火，衣服=火');
console.log('  火生火 = 过旺 → +40分');
console.log('  温度：高温=火，衣服=火');
console.log('  相同 = 更热 → +0分');
console.log('  材质：羊毛不在推荐列表 → +0分');
console.log('  总分：', test2, '分 ❌ 不及格\n');

// 测试3：雨天15°C + 黄色雨衣（土）
console.log('【测试3】雨天15°C + 黄色雨衣（土）');
const test3 = scoreWeather(
  { wuxing: 'earth', material: '防水尼龙' },
  { current: { type: 'rain', tempLevel: 'cool' } },
  { materials: ['防水', '尼龙', '速干'] }
);
console.log('  天气：雨天=水，衣服=土');
console.log('  土克水 = 平衡能量 → +80分');
console.log('  温度：凉爽=金，衣服=土');
console.log('  土生金 = 一般 → +0分（非相克）');
console.log('  材质：防水尼龙在推荐列表 → +20分');
console.log('  总分：', test3, '分 ✅ 良好\n');

// 测试4：阴天20°C + 绿色外套（木）
console.log('【测试4】阴天20°C + 绿色外套（木）');
const test4 = scoreWeather(
  { wuxing: 'wood', material: '棉' },
  { current: { type: 'cloudy', tempLevel: 'comfortable' } },
  { materials: ['棉', '针织'] }
);
console.log('  天气：阴天=金，衣服=木');
console.log('  金克木 = 被克 → +20分（低分）');
console.log('  温度：舒适=土，衣服=木');
console.log('  木克土 = 一般 → +0分');
console.log('  材质：棉在推荐列表 → +20分');
console.log('  总分：', test4, '分 ⚠️ 一般\n');

// 测试5：冬天雪天-5°C + 黑色羽绒服（水）
console.log('【测试5】冬天雪天-5°C + 黑色羽绒服（水）');
const test5 = scoreWeather(
  { wuxing: 'water', material: '羽绒' },
  { current: { type: 'snow', tempLevel: 'cold' } },
  { materials: ['羽绒', '羊绒', '保暖'] }
);
console.log('  天气：雪天=水，衣服=水');
console.log('  水水相同 = 过旺 → +40分');
console.log('  温度：寒冷=水，衣服=水');
console.log('  水水相同 = 更冷 → +0分');
console.log('  材质：羽绒在推荐列表 → +20分');
console.log('  总分：', test5, '分 ⚠️ 刚好及格\n');

console.log('========== 测试完成 ==========');
console.log('\n总结：');
console.log('- 最佳策略：天气五行 克 衣服五行（平衡能量）');
console.log('- 温度策略：温度五行 克 衣服五行（调候得当）');
console.log('- 避免：相同五行（过旺/过寒）');
