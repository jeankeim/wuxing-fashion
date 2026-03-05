/**
 * 场景分调试测试 - 找出120分的来源
 */

// 模拟 recommendation.js 中的 calculateSceneScore
function calculateSceneScore(scheme, sceneId) {
  const SCENE_PREFERENCES = {
    work: { 
      wuxing: ['metal', 'earth'], 
      materials: ['羊毛', '羊绒', '精纺', '真丝', '棉麻'] 
    }
  };
  
  if (!sceneId || sceneId === 'daily') return 0;
  
  const scenePref = SCENE_PREFERENCES[sceneId];
  if (!scenePref) return 0;
  
  let score = 0;
  
  // 五行匹配 +15
  if (scenePref.wuxing.includes(scheme.wuxing)) {
    score += 15;
  }
  
  // 材质匹配 +10
  const materialMatch = scenePref.materials.some(m => 
    scheme.material.includes(m)
  );
  if (materialMatch) {
    score += 10;
  }
  
  return score;  // 最高25分
}

// 模拟 scorer.js 中的 scoreScene
function scoreScene(scheme, sceneId) {
  const SCENE_PREFERENCES = {
    work: { 
      wuxing: ['metal', 'earth'], 
      materials: ['羊毛', '羊绒', '精纺', '真丝', '棉麻'] 
    }
  };
  
  if (!sceneId || sceneId === 'daily') return 60;
  
  const scenePref = SCENE_PREFERENCES[sceneId];
  if (!scenePref) return 50;
  
  let score = 0;
  
  // 五行匹配 +60
  if (scenePref.wuxing.includes(scheme.wuxing)) {
    score += 60;
  }
  
  // 材质匹配 +40
  const materialMatch = scenePref.materials.some(m => 
    scheme.material.includes(m)
  );
  if (materialMatch) {
    score += 40;
  }
  
  return Math.min(score, 100);  // 最高100分
}

// 测试
const scheme = { wuxing: 'earth', material: '棉麻' };
const sceneId = 'work';

console.log('========== 场景分调试 ==========\n');

console.log('方案：麦穗黄（土，棉麻）');
console.log('场景：职场（work）\n');

// 旧评分器
const oldScore = calculateSceneScore(scheme, sceneId);
console.log('【旧评分器】recommendation.js');
console.log(`  五行匹配：土 ∈ [metal, earth] = +15`);
console.log(`  材质匹配：棉麻 ∈ [..., 棉麻] = +10`);
console.log(`  原始分：${oldScore}`);
console.log(`  加权后：${oldScore} × 25% = ${oldScore * 0.25} → 显示 ${Math.round(oldScore * 0.25)}\n`);

// 新评分器
const newScore = scoreScene(scheme, sceneId);
console.log('【新评分器】scorer.js');
console.log(`  五行匹配：土 ∈ [metal, earth] = +60`);
console.log(`  材质匹配：棉麻 ∈ [..., 棉麻] = +40`);
console.log(`  原始分：${newScore}`);
console.log(`  加权后：${newScore} × 25% = ${newScore * 0.25} → 显示 ${Math.round(newScore * 0.25)}\n`);

console.log('========== 结论 ==========\n');
console.log('如果显示 +30，可能：');
console.log('1. 使用了旧评分器，但权重不是25%，而是120%？');
console.log(`   ${oldScore} × 120% = ${oldScore * 1.2} → ${Math.round(oldScore * 1.2)}`);
console.log('2. 或者使用了新评分器，但权重是30%？');
console.log(`   ${newScore} × 30% = ${newScore * 0.3} → ${Math.round(newScore * 0.3)}`);
console.log('3. 或者有其他隐藏加成逻辑\n');

console.log('检查 engine.js 实际使用的是哪个评分器！');
