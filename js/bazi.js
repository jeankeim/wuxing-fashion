/**
 * Bazi Module - 八字计算 (简化版)
 */

// 天干
const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

// 地支
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 天干五行
const GAN_WUXING = {
  '甲': 'wood', '乙': 'wood',
  '丙': 'fire', '丁': 'fire',
  '戊': 'earth', '己': 'earth',
  '庚': 'metal', '辛': 'metal',
  '壬': 'water', '癸': 'water'
};

// 地支五行
const ZHI_WUXING = {
  '子': 'water', '丑': 'earth', '寅': 'wood', '卯': 'wood',
  '辰': 'earth', '巳': 'fire', '午': 'fire', '未': 'earth',
  '申': 'metal', '酉': 'metal', '戌': 'earth', '亥': 'water'
};

// 五鼠遁 - 根据日干推时干
const WU_SHU_DUN = {
  '甲': 0, '己': 0,  // 甲己日起甲子时
  '乙': 2, '庚': 2,  // 乙庚日起丙子时
  '丙': 4, '辛': 4,  // 丙辛日起戊子时
  '丁': 6, '壬': 6,  // 丁壬日起庚子时
  '戊': 8, '癸': 8   // 戊癸日起壬子时
};

/**
 * 计算年柱
 */
function calcYearPillar(year) {
  // 以立春为界，简化处理使用公历年
  const ganIndex = (year - 4) % 10;
  const zhiIndex = (year - 4) % 12;
  return {
    gan: TIAN_GAN[ganIndex],
    zhi: DI_ZHI[zhiIndex],
    full: TIAN_GAN[ganIndex] + DI_ZHI[zhiIndex]
  };
}

/**
 * 计算月柱 (简化版，基于月份)
 */
function calcMonthPillar(year, month) {
  // 简化：根据年干推月干
  const yearGanIndex = (year - 4) % 10;
  const monthGanBase = (yearGanIndex % 5) * 2;
  const monthGanIndex = (monthGanBase + month - 1) % 10;
  
  // 月支：正月寅，二月卯...
  const monthZhiIndex = (month + 1) % 12;
  
  return {
    gan: TIAN_GAN[monthGanIndex],
    zhi: DI_ZHI[monthZhiIndex],
    full: TIAN_GAN[monthGanIndex] + DI_ZHI[monthZhiIndex]
  };
}

/**
 * 计算日柱 (简化版)
 */
function calcDayPillar(year, month, day) {
  // 简化公式：基于固定基准日期计算
  const baseDate = new Date(1900, 0, 31); // 1900年1月31日为甲子日
  const targetDate = new Date(year, month - 1, day);
  const diffDays = Math.floor((targetDate - baseDate) / (1000 * 60 * 60 * 24));
  
  const ganIndex = diffDays % 10;
  const zhiIndex = diffDays % 12;
  
  return {
    gan: TIAN_GAN[(ganIndex + 10) % 10],
    zhi: DI_ZHI[(zhiIndex + 12) % 12],
    full: TIAN_GAN[(ganIndex + 10) % 10] + DI_ZHI[(zhiIndex + 12) % 12]
  };
}

/**
 * 计算时柱
 */
function calcHourPillar(dayGan, hour) {
  // 五鼠遁
  const hourGanBase = WU_SHU_DUN[dayGan];
  const hourGanIndex = (hourGanBase + hour) % 10;
  
  return {
    gan: TIAN_GAN[hourGanIndex],
    zhi: DI_ZHI[hour],
    full: TIAN_GAN[hourGanIndex] + DI_ZHI[hour]
  };
}

/**
 * 计算八字
 * @param {number} year - 出生年
 * @param {number} month - 出生月 (1-12)
 * @param {number} day - 出生日
 * @param {number} hour - 时辰 (0-11: 子丑寅卯辰巳午未申酉戌亥)
 * @returns {Object} 四柱八字
 */
export function calcBazi(year, month, day, hour) {
  const yearPillar = calcYearPillar(year);
  const monthPillar = calcMonthPillar(year, month);
  const dayPillar = calcDayPillar(year, month, day);
  const hourPillar = calcHourPillar(dayPillar.gan, hour);
  
  return {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
    fullBazi: `${yearPillar.full} ${monthPillar.full} ${dayPillar.full} ${hourPillar.full}`
  };
}

/**
 * 计算五行分布
 */
export function calcWuxingProfile(baziData) {
  const profile = {
    wood: 0,
    fire: 0,
    earth: 0,
    metal: 0,
    water: 0
  };
  
  // 统计天干五行
  const gans = [baziData.year.gan, baziData.month.gan, baziData.day.gan, baziData.hour.gan];
  gans.forEach(gan => {
    const wuxing = GAN_WUXING[gan];
    if (wuxing) profile[wuxing]++;
  });
  
  // 统计地支五行
  const zhis = [baziData.year.zhi, baziData.month.zhi, baziData.day.zhi, baziData.hour.zhi];
  zhis.forEach(zhi => {
    const wuxing = ZHI_WUXING[zhi];
    if (wuxing) profile[wuxing]++;
  });
  
  return profile;
}

/**
 * 获取推荐五行
 */
export function getRecommendElement(profile) {
  const entries = Object.entries(profile);
  entries.sort((a, b) => a[1] - b[1]);
  
  const weakest = entries[0][0];
  const strongest = entries[entries.length - 1][0];
  
  // 推荐补充最弱的五行
  return {
    weakest,
    strongest,
    recommend: weakest,
    analysis: `五行中${getWuxingName(weakest)}较弱，宜补${getWuxingName(weakest)}；${getWuxingName(strongest)}较旺，可适当泄之。`
  };
}

function getWuxingName(wuxing) {
  const names = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };
  return names[wuxing] || wuxing;
}

/**
 * 完整的八字计算流程
 */
export function analyzeBazi(year, month, day, hour) {
  const bazi = calcBazi(year, month, day, hour);
  const profile = calcWuxingProfile(bazi);
  const recommend = getRecommendElement(profile);
  
  return {
    bazi,
    profile,
    recommend
  };
}
