/**
 * Wuxing Utils - 五行相关工具函数
 * 统一维护五行名称映射，避免多处重复定义
 */

/**
 * 五行中文名称映射表
 */
export const WUXING_NAMES = {
  wood: '木',
  fire: '火',
  earth: '土',
  metal: '金',
  water: '水'
};

/**
 * 获取五行中文名称
 * @param {string} wuxing - 五行英文标识 (wood/fire/earth/metal/water)
 * @returns {string} 五行中文名称
 */
export function getWuxingName(wuxing) {
  return WUXING_NAMES[wuxing] || wuxing;
}

/**
 * 从颜色名称推断五行
 * @param {string} color - 颜色名称（如"青色"、"红色"）
 * @returns {string} 五行标识 (wood/fire/earth/metal/water)
 */
export function inferWuxingFromColor(color) {
  const colorMap = {
    '青': 'wood', '绿': 'wood', '翠': 'wood',
    '红': 'fire', '赤': 'fire', '朱': 'fire', '紫': 'fire',
    '黄': 'earth', '棕': 'earth', '褐': 'earth', '咖': 'earth',
    '白': 'metal', '银': 'metal', '灰': 'metal', '金': 'metal',
    '黑': 'water', '蓝': 'water', '玄': 'water', '青': 'water'
  };
  
  for (const [key, wuxing] of Object.entries(colorMap)) {
    if (color.includes(key)) return wuxing;
  }
  return 'earth';
}

/**
 * 从材质名称推断五行
 * @param {string} material - 材质名称（如"棉麻"、"丝绸"）
 * @returns {string} 五行标识 (wood/fire/earth/metal/water)
 */
export function inferWuxingFromMaterial(material) {
  const materialMap = {
    '棉': 'wood', '麻': 'wood', '丝': 'wood',
    '绒': 'fire', '绸': 'fire', '缎': 'fire',
    '毛': 'earth', '呢': 'earth', '皮': 'earth',
    '金': 'metal', '银': 'metal', '锦': 'metal',
    '纱': 'water', '雪纺': 'water', '蕾丝': 'water'
  };
  
  for (const [key, wuxing] of Object.entries(materialMap)) {
    if (material.includes(key)) return wuxing;
  }
  return 'earth';
}
