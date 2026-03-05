/**
 * 场景分显示验证测试
 */

// 场景权重
const SCENE_WEIGHT = 0.25;  // 25%

// 测试不同原始分的显示结果
const testCases = [
  { rawScene: 100, expected: 25 },
  { rawScene: 80, expected: 20 },
  { rawScene: 60, expected: 15 },
  { rawScene: 40, expected: 10 },
];

console.log('========== 场景分计算验证 ==========\n');

testCases.forEach(({ rawScene, expected }) => {
  // 加权计算
  const weighted = rawScene * SCENE_WEIGHT;
  
  // 四舍五入显示
  const displayed = Math.round(weighted);
  
  console.log(`原始分: ${rawScene} × 权重${SCENE_WEIGHT} = ${weighted}`);
  console.log(`显示值: Math.round(${weighted}) = ${displayed}`);
  console.log(`期望: ${expected}, 实际: ${displayed}, ${displayed === expected ? '✅' : '❌'}`);
  console.log('');
});

console.log('========== 为什么显示 +30 而不是 +25？ ==========\n');

// 验证你的猜测
console.log('猜测1: 向上取整/四舍五入 25→30');
console.log(`  Math.round(25) = ${Math.round(25)} ❌ 不正确\n`);

console.log('猜测2: 满分加成 +5');
console.log(`  代码中没有满分加成逻辑 ❌ 不正确\n`);

console.log('猜测3: UI层将20-29显示为30');
console.log(`  代码中没有这种优化 ❌ 不正确\n`);

console.log('========== 可能的真实原因 ==========\n');

console.log('1. 原始分不是100，而是120？');
console.log(`   120 × 0.25 = ${120 * 0.25} → Math.round(30) = 30 ✓\n`);

console.log('2. 场景权重不是0.25，而是0.30？');
console.log(`   100 × 0.30 = ${100 * 0.30} → Math.round(30) = 30 ✓\n`);

console.log('3. 有其他加成逻辑？');
console.log(`   需要检查 scorer.js 中的实际计算\n`);

console.log('========== 结论 ==========\n');
console.log('根据代码分析：');
console.log('- 原始分100 × 权重0.25 = 25');
console.log('- Math.round(25) = 25');
console.log('- 应该显示 +25，不是 +30');
console.log('');
console.log('如果实际显示+30，可能：');
console.log('1. 代码有未发现的加成逻辑');
console.log('2. 浏览器缓存了旧版本');
console.log('3. 截图中的数据来自不同版本');
