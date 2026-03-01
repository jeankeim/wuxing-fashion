/**
 * Results Controller - 结果页控制器
 */

import { BaseController } from './base.js';
import { navigateTo, goBack } from '../router.js';
import { renderSchemeCards, renderResultHeader } from '../render.js';
import { favoritesRepo } from '../repository.js';
import { StateKeys } from '../store.js';

export class ResultsController extends BaseController {
  init() {
    this.container = document.getElementById('view-results');
  }

  onMount() {
    // 渲染结果
    const result = this.getState(StateKeys.CURRENT_RESULT);
    if (result) {
      renderResultHeader(result.termInfo);
      renderSchemeCards(result.schemes);
    }
  }

  bindEvents() {
    // 返回按钮
    const backBtn = this.container.querySelector('#btn-back-entry');
    if (backBtn) {
      this.addEventListener(backBtn, 'click', () => {
        goBack();
      });
    }

    // 收藏按钮
    const favBtn = this.container.querySelector('#btn-favorites');
    if (favBtn) {
      this.addEventListener(favBtn, 'click', () => {
        navigateTo('/favorites');
      });
    }

    // 画像按钮
    const profileBtn = this.container.querySelector('#btn-profile');
    if (profileBtn) {
      this.addEventListener(profileBtn, 'click', () => {
        navigateTo('/profile');
      });
    }

    // 日记按钮
    const diaryBtn = this.container.querySelector('#btn-diary');
    if (diaryBtn) {
      this.addEventListener(diaryBtn, 'click', () => {
        navigateTo('/diary');
      });
    }

    // 换一批
    const regenerateBtn = this.container.querySelector('#btn-regenerate');
    if (regenerateBtn) {
      this.addEventListener(regenerateBtn, 'click', () => {
        this.handleRegenerate();
      });
    }

    // 上传按钮
    const uploadBtn = this.container.querySelector('#btn-upload');
    if (uploadBtn) {
      this.addEventListener(uploadBtn, 'click', () => {
        navigateTo('/upload');
      });
    }

    // 方案卡片点击（委托）
    const cardsContainer = this.container.querySelector('#scheme-cards');
    if (cardsContainer) {
      this.addEventListener(cardsContainer, 'click', (e) => {
        this.handleCardClick(e);
      });
    }
  }

  handleRegenerate() {
    // TODO: 实现换一批逻辑
    this.showToast('正在生成新推荐...');
  }

  handleCardClick(e) {
    const favoriteBtn = e.target.closest('.scheme-favorite-btn');
    const shareBtn = e.target.closest('.scheme-share-btn');
    const detailBtn = e.target.closest('.scheme-detail-btn');

    if (favoriteBtn) {
      const index = parseInt(favoriteBtn.dataset.index, 10);
      this.toggleFavorite(index);
    }

    if (shareBtn) {
      const index = parseInt(shareBtn.dataset.index, 10);
      this.shareScheme(index);
    }

    if (detailBtn) {
      const index = parseInt(detailBtn.dataset.index, 10);
      this.showDetail(index);
    }
  }

  toggleFavorite(index) {
    const schemes = window.__currentSchemes;
    if (!schemes || !schemes[index]) return;

    const scheme = schemes[index];
    if (favoritesRepo.exists(scheme.id)) {
      favoritesRepo.remove(scheme.id);
      this.showToast('已取消收藏');
    } else {
      favoritesRepo.add(scheme);
      this.showToast('已收藏');
    }
  }

  shareScheme(index) {
    // TODO: 实现分享
    this.showToast('分享功能开发中...');
  }

  showDetail(index) {
    // TODO: 显示详情模态框
    this.showToast('详情功能开发中...');
  }
}
