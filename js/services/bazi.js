/**
 * Bazi Module - 八字计算
 * 支持简版和精确模式
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
  '甲': 0, '己': 0,
  '乙': 2, '庚': 2,
  '丙': 4, '辛': 4,
  '丁': 6, '壬': 6,
  '戊': 8, '癸': 8
};

/**
 * 计算年柱（简化版）
 */
function calcYearPillar(year) {
  const ganIndex = (year - 4) % 10;
  const zhiIndex = (year - 4) % 12;
  return {
    gan: TIAN_GAN[ganIndex],
    zhi: DI_ZHI[zhiIndex],
    full: TIAN_GAN[ganIndex] + DI_ZHI[zhiIndex]
  };
}

/**
 * 计算月柱（简化版）
 */
function calcMonthPillar(year, month) {
  const yearGanIndex = (year - 4) % 10;
  const monthGanBase = (yearGanIndex % 5) * 2;
  const monthGanIndex = (monthGanBase + month - 1) % 10;
  const monthZhiIndex = (month + 1) % 12;
  
  return {
    gan: TIAN_GAN[monthGanIndex],
    zhi: DI_ZHI[monthZhiIndex],
    full: TIAN_GAN[monthGanIndex] + DI_ZHI[monthZhiIndex]
  };
}

/**
 * 计算日柱（简化版）
 */
function calcDayPillar(year, month, day) {
  const baseDate = new Date(1900, 0, 31);
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
 * 计算时柱（简化版）
 */
function calcHourPillar(dayGan, hour) {
  const hourGanBase = WU_SHU_DUN[dayGan];
  const hourGanIndex = (hourGanBase + hour) % 10;
  
  return {
    gan: TIAN_GAN[hourGanIndex],
    zhi: DI_ZHI[hour],
    full: TIAN_GAN[hourGanIndex] + DI_ZHI[hour]
  };
}

/**
 * 简版八字计算
 */
export function calcBaziSimple(year, month, day, hour) {
  const yearPillar = calcYearPillar(year);
  const monthPillar = calcMonthPillar(year, month);
  const dayPillar = calcDayPillar(year, month, day);
  const hourPillar = calcHourPillar(dayPillar.gan, hour);
  
  return {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
    fullBazi: `${yearPillar.full} ${monthPillar.full} ${dayPillar.full} ${hourPillar.full}`,
    precision: 'simple'
  };
}

/**
 * 精确八字计算（使用 lunar-javascript）
 * @param {number} year - 出生年
 * @param {number} month - 出生月
 * @param {number} day - 出生日
 * @param {number} hour - 时辰 (0-23)
 * @param {number} minute - 分钟
 * @param {number} timezone - 时区偏移（默认8为北京时间）
 * @returns {Object} 四柱八字
 */
export function calcBaziPrecise(year, month, day, hour, minute = 0, timezone = 8) {
  // 检查 lunar-javascript 是否加载
  if (typeof Lunar === 'undefined') {
    console.warn('[Bazi] Lunar library not loaded, falling back to simple mode');
    return calcBaziSimple(year, month, day, Math.floor(hour / 2) % 12);
  }
  
  try {
    // 创建农历日期对象
    const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
    const lunar = solar.getLunar();
    const bazi = lunar.getEightChar();
    
    // 获取四柱
    const yearGan = bazi.getYearGan();
    const yearZhi = bazi.getYearZhi();
    const monthGan = bazi.getMonthGan();
    const monthZhi = bazi.getMonthZhi();
    const dayGan = bazi.getDayGan();
    const dayZhi = bazi.getDayZhi();
    const timeGan = bazi.getTimeGan();
    const timeZhi = bazi.getTimeZhi();
    
    return {
      year: {
        gan: yearGan,
        zhi: yearZhi,
        full: yearGan + yearZhi
      },
      month: {
        gan: monthGan,
        zhi: monthZhi,
        full: monthGan + monthZhi
      },
      day: {
        gan: dayGan,
        zhi: dayZhi,
        full: dayGan + dayZhi
      },
      hour: {
        gan: timeGan,
        zhi: timeZhi,
        full: timeGan + timeZhi
      },
      fullBazi: `${yearGan}${yearZhi} ${monthGan}${monthZhi} ${dayGan}${dayZhi} ${timeGan}${timeZhi}`,
      precision: 'precise',
      lunar: {
        year: lunar.getYear(),
        month: lunar.getMonth(),
        day: lunar.getDay()
      }
    };
  } catch (error) {
    console.error('[Bazi] Precise calculation failed:', error);
    return calcBaziSimple(year, month, day, Math.floor(hour / 2) % 12);
  }
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
 * 完整的八字计算流程（简版）
 */
export function analyzeBazi(year, month, day, hour) {
  const bazi = calcBaziSimple(year, month, day, hour);
  const profile = calcWuxingProfile(bazi);
  const recommend = getRecommendElement(profile);
  
  return {
    bazi,
    profile,
    recommend
  };
}

/**
 * 完整的八字计算流程（精确版）
 */
export function analyzeBaziPrecise(year, month, day, hour, minute = 0, timezone = 8) {
  const bazi = calcBaziPrecise(year, month, day, hour, minute, timezone);
  const profile = calcWuxingProfile(bazi);
  const recommend = getRecommendElement(profile);
  
  return {
    bazi,
    profile,
    recommend
  };
}
