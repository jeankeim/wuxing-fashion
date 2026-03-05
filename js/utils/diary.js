/**
 * Diary Module - 穿搭日记
 * 记录每日穿搭，支持日历视图和时间线
 */

import { safeStorage } from '../core/error-handler.js';

const DIARY_KEY = 'wuxing_diary';

// 心情选项
export const MOODS = {
  happy: { icon: '😊', label: '开心', color: '#FFD93D' },
  confident: { icon: '💪', label: '自信', color: '#6BCB77' },
  calm: { icon: '😌', label: '平静', color: '#4D96FF' },
  tired: { icon: '😴', label: '疲惫', color: '#9B9B9B' },
  excited: { icon: '🤩', label: '兴奋', color: '#FF6B6B' }
};

// 安全的 localStorage 操作对象
const storage = {
  getItem: (key) => {
    return safeStorage(() => {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    });
  },
  setItem: (key, value) => {
    safeStorage(() => {
      localStorage.setItem(key, JSON.stringify(value));
    });
  }
};

/**
 * 获取所有日记记录
 * @returns {Object} 日记记录对象，键为日期字符串
 */
export function getDiaryRecords() {
  return storage.getItem(DIARY_KEY) || {};
}

/**
 * 获取指定日期的记录
 * @param {string} date - 日期字符串 (YYYY-MM-DD)
 * @returns {Object|null} 日记记录
 */
export function getDiaryByDate(date) {
  const records = getDiaryRecords();
  return records[date] || null;
}

/**
 * 保存日记记录
 * @param {string} date - 日期字符串
 * @param {Object} record - 日记记录
 */
export function saveDiaryRecord(date, record) {
  const records = getDiaryRecords();
  records[date] = {
    ...record,
    date,
    updatedAt: new Date().toISOString()
  };
  storage.setItem(DIARY_KEY, records);
}

/**
 * 删除日记记录
 * @param {string} date - 日期字符串
 */
export function deleteDiaryRecord(date) {
  const records = getDiaryRecords();
  delete records[date];
  storage.setItem(DIARY_KEY, records);
}

/**
 * 检查指定日期是否有记录
 * @param {string} date - 日期字符串
 * @returns {boolean}
 */
export function hasDiaryRecord(date) {
  const records = getDiaryRecords();
  return !!records[date];
}

/**
 * 获取月份的日历数据
 * @param {number} year - 年份
 * @param {number} month - 月份 (1-12)
 * @returns {Array} 日历数据
 */
export function getCalendarData(year, month) {
  const records = getDiaryRecords();
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  
  const calendar = [];
  const currentDate = new Date(startDate);
  
  // 生成6周的数据
  for (let week = 0; week < 6; week++) {
    const weekData = [];
    for (let day = 0; day < 7; day++) {
      const dateStr = formatDate(currentDate);
      const record = records[dateStr];
      
      weekData.push({
        date: dateStr,
        day: currentDate.getDate(),
        isCurrentMonth: currentDate.getMonth() === month - 1,
        isToday: isToday(currentDate),
        hasRecord: !!record,
        record: record
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    calendar.push(weekData);
    
    // 如果已经超出本月且是完整周，停止
    if (currentDate > lastDay && currentDate.getDay() === 0) break;
  }
  
  return calendar;
}

/**
 * 获取时间线数据
 * @param {number} limit - 限制数量
 * @returns {Array} 时间线记录
 */
export function getTimelineData(limit = 30) {
  const records = getDiaryRecords();
  
  return Object.values(records)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
}

/**
 * 获取穿搭统计
 * @returns {Object} 统计数据
 */
export function getDiaryStats() {
  const records = getDiaryRecords();
  const recordList = Object.values(records);
  
  const stats = {
    totalDays: recordList.length,
    colorCount: {},
    materialCount: {},
    moodCount: {},
    schemeCount: {}
  };
  
  recordList.forEach(record => {
    // 颜色统计
    if (record.color) {
      stats.colorCount[record.color] = (stats.colorCount[record.color] || 0) + 1;
    }
    
    // 材质统计
    if (record.material) {
      stats.materialCount[record.material] = (stats.materialCount[record.material] || 0) + 1;
    }
    
    // 心情统计
    if (record.mood) {
      stats.moodCount[record.mood] = (stats.moodCount[record.mood] || 0) + 1;
    }
    
    // 方案统计
    if (record.schemeId) {
      stats.schemeCount[record.schemeId] = (stats.schemeCount[record.schemeId] || 0) + 1;
    }
  });
  
  return stats;
}

/**
 * 获取指定月份的统计数据
 * @param {number} year - 年份
 * @param {number} month - 月份 (1-12)
 * @returns {Object} 月度统计数据
 */
export function getMonthlyStats(year, month) {
  const records = getDiaryRecords();
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
  
  const monthRecords = Object.values(records).filter(record => 
    record.date && record.date.startsWith(monthPrefix)
  );
  
  const stats = {
    year,
    month,
    totalDays: monthRecords.length,
    colorCount: {},
    materialCount: {},
    moodCount: {},
    records: monthRecords
  };
  
  monthRecords.forEach(record => {
    // 颜色统计
    if (record.color) {
      stats.colorCount[record.color] = (stats.colorCount[record.color] || 0) + 1;
    }
    
    // 材质统计
    if (record.material) {
      stats.materialCount[record.material] = (stats.materialCount[record.material] || 0) + 1;
    }
    
    // 心情统计
    if (record.mood) {
      stats.moodCount[record.mood] = (stats.moodCount[record.mood] || 0) + 1;
    }
  });
  
  return stats;
}

/**
 * 格式化日期
 * @param {Date} date - 日期对象
 * @returns {string} YYYY-MM-DD
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 检查是否是今天
 * @param {Date} date - 日期对象
 * @returns {boolean}
 */
function isToday(date) {
  const today = new Date();
  return formatDate(date) === formatDate(today);
}

/**
 * 获取连续穿搭天数
 * @returns {number} 连续天数
 */
export function getStreakDays() {
  const records = getDiaryRecords();
  const dates = Object.keys(records).sort().reverse();
  
  if (dates.length === 0) return 0;
  
  let streak = 0;
  let checkDate = new Date();
  
  for (const dateStr of dates) {
    if (dateStr === formatDate(checkDate)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (dateStr < formatDate(checkDate)) {
      break;
    }
  }
  
  return streak;
}

/**
 * 导出日记数据（用于数据导出功能）
 * @returns {Object}
 */
export function exportDiaryData() {
  return {
    records: getDiaryRecords(),
    stats: getDiaryStats(),
    streak: getStreakDays()
  };
}
