/**
 * Welcome Controller - 欢迎页控制器
 */

import { BaseController } from './base.js';
import { navigateTo } from '../router.js';
import { renderSolarBanner } from '../render.js';
import { StateKeys } from '../store.js';

/**
 * 欢迎页控制器
 */
export class WelcomeController extends BaseController {
  init() {
    this.container = document.getElementById('view-welcome');
  }

  onMount() {
    // 渲染节气横幅
    const termInfo = this.getState(StateKeys.CURRENT_TERM_INFO);
    if (termInfo) {
      renderSolarBanner(termInfo);
    }
  }

  bindEvents() {
    // 开始按钮
    const startBtn = this.container.querySelector('#btn-start');
    if (startBtn) {
      this.addEventListener(startBtn, 'click', () => {
        navigateTo('/entry');
      });
    }
  }
}
