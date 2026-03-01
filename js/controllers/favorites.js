/**
 * Favorites Controller - 收藏页控制器
 */

import { BaseController } from './base.js';
import { navigateTo, goBack } from '../router.js';
import { renderFavoritesList } from '../render.js';
import { favoritesRepo } from '../repository.js';

export class FavoritesController extends BaseController {
  init() {
    this.container = document.getElementById('view-favorites');
  }

  onMount() {
    // 渲染收藏列表
    const favorites = favoritesRepo.getAll();
    renderFavoritesList(favorites);
  }

  bindEvents() {
    // 返回按钮
    const backBtn = this.container.querySelector('#btn-back-results-from-fav');
    if (backBtn) {
      this.addEventListener(backBtn, 'click', () => {
        goBack();
      });
    }

    // 收藏列表点击（委托）
    const listContainer = this.container.querySelector('#favorites-list');
    if (listContainer) {
      this.addEventListener(listContainer, 'click', (e) => {
        this.handleListClick(e);
      });
    }
  }

  handleListClick(e) {
    const favoriteBtn = e.target.closest('.scheme-favorite-btn');
    const detailBtn = e.target.closest('.scheme-detail-btn');

    if (favoriteBtn) {
      const index = parseInt(favoriteBtn.dataset.index, 10);
      this.removeFavorite(index);
    }

    if (detailBtn) {
      const index = parseInt(detailBtn.dataset.index, 10);
      this.showDetail(index);
    }
  }

  removeFavorite(index) {
    const favorites = window.__currentFavorites || favoritesRepo.getAll();
    if (!favorites[index]) return;

    const scheme = favorites[index];
    favoritesRepo.remove(scheme.id);
    
    // 重新渲染
    renderFavoritesList(favoritesRepo.getAll());
    this.showToast('已取消收藏');
  }

  showDetail(index) {
    // TODO: 显示详情
    this.showToast('详情功能开发中...');
  }
}
