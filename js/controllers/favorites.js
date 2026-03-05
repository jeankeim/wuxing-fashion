/**
 * Favorites Controller - 收藏页控制器
 */

import { BaseController } from './base.js';
import { navigateTo, goBack } from '../core/router.js';
import { renderFavoritesList, renderDetailModal, showModal, closeModal } from '../utils/render.js';
import { favoritesRepo } from '../data/repository.js';
import { StateKeys } from '../core/store.js';

export class FavoritesController extends BaseController {
  constructor() {
    super();
    this.containerId = 'view-favorites';
  }

  onMount() {
    // 动态获取容器（视图是动态加载的）
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error('[FavoritesController] Container not found');
      return;
    }
    
    // 绑定事件
    this.bindEvents();
    
    // 渲染收藏列表
    const favorites = favoritesRepo.getAll();
    renderFavoritesList(favorites);
  }

  bindEvents() {
    // 避免重复绑定
    if (this.eventsBound) return;
    this.eventsBound = true;
    
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
    
    // 详情模态框关闭按钮（全局）
    const modalCloseBtn = document.querySelector('#modal-detail .modal-close');
    if (modalCloseBtn) {
      this.addEventListener(modalCloseBtn, 'click', () => {
        closeModal('modal-detail');
      });
    }
    
    // 详情模态框背景点击关闭
    const modalBackdrop = document.querySelector('#modal-detail .modal-backdrop');
    if (modalBackdrop) {
      this.addEventListener(modalBackdrop, 'click', () => {
        closeModal('modal-detail');
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
    const favorites = this.getState(StateKeys.CURRENT_SCHEMES) || favoritesRepo.getAll();
    if (!favorites[index]) return;

    const scheme = favorites[index];
    favoritesRepo.remove(scheme.id);
    
    // 重新渲染
    renderFavoritesList(favoritesRepo.getAll());
    this.showToast('已取消收藏');
  }

  showDetail(index) {
    const favorites = this.getState(StateKeys.CURRENT_SCHEMES) || favoritesRepo.getAll();
    if (!favorites[index]) return;

    const scheme = favorites[index];
    
    // 渲染详情模态框（复用结果页的逻辑）
    renderDetailModal(scheme, null);
    showModal('modal-detail');
  }

  onUnmount() {
    this.eventsBound = false;
  }
}
