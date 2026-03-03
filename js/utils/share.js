/**
 * Share Module - 分享功能
 * 支持文本复制、图片生成、系统分享
 */

import { showToast } from './render.js';

/**
 * 生成分享文本
 * @param {Object} scheme - 穿搭方案
 * @param {Object} termInfo - 节气信息
 * @returns {string} 分享文本
 */
export function generateShareText(scheme, termInfo) {
  const termName = termInfo?.current?.name || '今日';
  const termWuxing = termInfo?.current?.wuxingName || '';
  
  return `【五行穿搭建议】
${termName} · ${termWuxing}

推荐：${scheme.color.name} + ${scheme.material}
感受：${scheme.feeling}

解读：${scheme.annotation}

出自：${scheme.source}

—— 来自五行穿搭建议小程序`;
}

/**
 * 复制文本到剪贴板
 * @param {string} text - 要复制的文本
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // 降级方案
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    
    return success;
  } catch (error) {
    console.error('[Share] Copy failed:', error);
    return false;
  }
}

/**
 * 分享方案（综合）
 * @param {Object} scheme - 穿搭方案
 * @param {Object} termInfo - 节气信息
 */
export async function shareScheme(scheme, termInfo) {
  const shareText = generateShareText(scheme, termInfo);
  
  // 优先使用系统分享（移动端）
  if (navigator.share) {
    try {
      await navigator.share({
        title: '五行穿搭建议',
        text: shareText,
        url: window.location.href
      });
      return;
    } catch (error) {
      // 用户取消或分享失败，降级到复制
      console.log('[Share] Native share failed, fallback to copy');
    }
  }
  
  // 降级：复制到剪贴板
  const success = await copyToClipboard(shareText);
  if (success) {
    showToast('分享内容已复制到剪贴板');
  } else {
    showToast('复制失败，请手动复制');
  }
}

/**
 * 生成分享图片（使用 Canvas）
 * @param {Object} scheme - 穿搭方案
 * @param {Object} termInfo - 节气信息
 * @returns {Promise<string>} 图片 Data URL
 */
export async function generateShareImage(scheme, termInfo) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // 设置画布尺寸（适配手机屏幕）
    const width = 375;
    const height = 600;
    canvas.width = width * 2; // 高清
    canvas.height = height * 2;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    
    // 缩放以适配高清
    ctx.scale(2, 2);
    
    // 背景
    ctx.fillStyle = '#FAFAF8';
    ctx.fillRect(0, 0, width, height);
    
    // 顶部装饰条
    ctx.fillStyle = scheme.color.hex;
    ctx.fillRect(0, 0, width, 8);
    
    // 标题
    ctx.fillStyle = '#1A1A1A';
    ctx.font = 'bold 24px "LXGW WenKai", serif';
    ctx.textAlign = 'center';
    ctx.fillText('五行穿搭建议', width / 2, 60);
    
    // 节气信息
    const termName = termInfo?.current?.name || '今日';
    const termWuxing = termInfo?.current?.wuxingName || '';
    ctx.fillStyle = '#666666';
    ctx.font = '16px sans-serif';
    ctx.fillText(`${termName} · ${termWuxing}`, width / 2, 95);
    
    // 分隔线
    ctx.strokeStyle = '#E5E5E0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 120);
    ctx.lineTo(width - 40, 120);
    ctx.stroke();
    
    // 颜色块
    ctx.fillStyle = scheme.color.hex;
    ctx.fillRect((width - 120) / 2, 145, 120, 80);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(scheme.color.name, width / 2, 195);
    
    // 材质
    ctx.fillStyle = '#1A1A1A';
    ctx.font = '20px "LXGW WenKai", serif';
    ctx.fillText(scheme.material, width / 2, 260);
    
    // 感受
    ctx.fillStyle = '#666666';
    ctx.font = '14px sans-serif';
    ctx.fillText(scheme.feeling, width / 2, 290);
    
    // 解读（自动换行）
    ctx.fillStyle = '#333333';
    ctx.font = '14px "LXGW WenKai", serif';
    const maxWidth = width - 80;
    const lineHeight = 22;
    const lines = wrapText(ctx, scheme.annotation, maxWidth);
    let y = 340;
    lines.forEach(line => {
      ctx.fillText(line, width / 2, y);
      y += lineHeight;
    });
    
    // 出处
    ctx.fillStyle = '#999999';
    ctx.font = '12px serif';
    ctx.fillText(scheme.source, width / 2, 480);
    
    // 底部
    ctx.fillStyle = '#CCCCCC';
    ctx.font = '12px sans-serif';
    ctx.fillText('—— 五行穿搭建议 ——', width / 2, 550);
    
    // 生成图片
    try {
      const dataUrl = canvas.toDataURL('image/png');
      resolve(dataUrl);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 文本自动换行
 * @param {CanvasRenderingContext2D} ctx - Canvas 上下文
 * @param {string} text - 文本
 * @param {number} maxWidth - 最大宽度
 * @returns {string[]} 分行后的文本数组
 */
function wrapText(ctx, text, maxWidth) {
  const chars = text.split('');
  const lines = [];
  let currentLine = '';
  
  for (let i = 0; i < chars.length; i++) {
    const testLine = currentLine + chars[i];
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine !== '') {
      lines.push(currentLine);
      currentLine = chars[i];
    } else {
      currentLine = testLine;
    }
  }
  
  lines.push(currentLine);
  return lines;
}

/**
 * 下载分享图片
 * @param {string} dataUrl - 图片 Data URL
 * @param {string} filename - 文件名
 */
export function downloadImage(dataUrl, filename = '五行穿搭建议.png') {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * 显示分享菜单
 * @param {Object} scheme - 穿搭方案
 * @param {Object} termInfo - 节气信息
 */
export async function showShareMenu(scheme, termInfo) {
  // 创建菜单
  const menu = document.createElement('div');
  menu.className = 'share-menu';
  menu.innerHTML = `
    <div class="share-menu-backdrop"></div>
    <div class="share-menu-content">
      <h3>分享方案</h3>
      <div class="share-options">
        <button class="share-option" data-action="text">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          <span>复制文字</span>
        </button>
        <button class="share-option" data-action="image">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <span>生成图片</span>
        </button>
        <button class="share-option" data-action="system">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"/>
            <circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          <span>系统分享</span>
        </button>
      </div>
      <button class="share-cancel">取消</button>
    </div>
  `;
  
  document.body.appendChild(menu);
  
  // 动画
  requestAnimationFrame(() => {
    menu.classList.add('active');
  });
  
  // 事件处理
  const closeMenu = () => {
    menu.classList.remove('active');
    setTimeout(() => menu.remove(), 300);
  };
  
  menu.querySelector('.share-menu-backdrop').addEventListener('click', closeMenu);
  menu.querySelector('.share-cancel').addEventListener('click', closeMenu);
  
  menu.querySelectorAll('.share-option').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      
      if (action === 'text') {
        const text = generateShareText(scheme, termInfo);
        const success = await copyToClipboard(text);
        showToast(success ? '已复制到剪贴板' : '复制失败');
        closeMenu();
      } else if (action === 'image') {
        showToast('生成图片中...');
        try {
          const dataUrl = await generateShareImage(scheme, termInfo);
          downloadImage(dataUrl);
          showToast('图片已保存');
        } catch (error) {
          showToast('生成图片失败');
        }
        closeMenu();
      } else if (action === 'system') {
        if (navigator.share) {
          try {
            await navigator.share({
              title: '五行穿搭建议',
              text: generateShareText(scheme, termInfo),
              url: window.location.href
            });
          } catch (error) {
            // 用户取消
          }
        } else {
          showToast('您的设备不支持系统分享');
        }
        closeMenu();
      }
    });
  });
}
