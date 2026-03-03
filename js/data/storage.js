/**
 * Storage Module - 本地存储管理
 */

import { safeStorage } from '../core/error-handler.js';

const PREFIX = 'wuxing_';

export function get(key) {
  return safeStorage(() => {
    const value = localStorage.getItem(PREFIX + key);
    return value ? JSON.parse(value) : null;
  });
}

export function set(key, value) {
  return safeStorage(() => {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  });
}

export function remove(key) {
  safeStorage(() => {
    localStorage.removeItem(PREFIX + key);
  });
}

export function getKeysByPrefix(prefix) {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(PREFIX + prefix)) {
      keys.push(key.replace(PREFIX, ''));
    }
  }
  return keys;
}

export function clearAll() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(PREFIX)) {
      keys.push(key);
    }
  }
  keys.forEach(key => localStorage.removeItem(key));
}

// Business Methods
export function getLastBazi() {
  return get('last_bazi');
}

export function saveLastBazi(bazi) {
  return set('last_bazi', bazi);
}

export function getLastResult() {
  return get('last_result');
}

export function saveLastResult(result) {
  return set('last_result', result);
}

export function getFeedback(date) {
  const feedbacks = get('feedbacks') || {};
  return feedbacks[date] || null;
}

export function saveFeedback(date, feedback) {
  const feedbacks = get('feedbacks') || {};
  feedbacks[date] = feedback;
  return set('feedbacks', feedbacks);
}

export function getUploadedOutfit(date) {
  return get('outfit_' + date);
}

export function saveUploadedOutfit(date, imageData) {
  return set('outfit_' + date, imageData);
}

export function removeUploadedOutfit(date) {
  remove('outfit_' + date);
}

export function getUsageStats() {
  return get('usage_stats') || { visits: 0, generates: 0, uploads: 0 };
}

export function incrementUsage(type) {
  const stats = getUsageStats();
  stats[type] = (stats[type] || 0) + 1;
  set('usage_stats', stats);
}

export function isFirstVisit() {
  return !get('visited');
}

export function markVisited() {
  set('visited', true);
}

export function getSelectedWish() {
  return get('selected_wish');
}

export function saveSelectedWish(wishId) {
  return set('selected_wish', wishId);
}

// 收藏相关方法
export function getFavorites() {
  return get('favorites') || [];
}

export function addFavorite(scheme) {
  const favorites = getFavorites();
  // 检查是否已收藏
  if (!favorites.some(f => f.id === scheme.id)) {
    favorites.push({
      ...scheme,
      favoritedAt: new Date().toISOString()
    });
    return set('favorites', favorites);
  }
  return true;
}

export function removeFavorite(schemeId) {
  const favorites = getFavorites();
  const filtered = favorites.filter(f => f.id !== schemeId);
  return set('favorites', filtered);
}

export function isFavorite(schemeId) {
  const favorites = getFavorites();
  return favorites.some(f => f.id === schemeId);
}
