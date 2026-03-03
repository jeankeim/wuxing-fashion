/**
 * Upload Module - 图片上传处理
 */

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const TARGET_SIZE = 200 * 1024; // 200KB 目标压缩大小
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

/**
 * 验证文件
 */
export function validateFile(file) {
  if (!file) {
    return { valid: false, error: '请选择文件' };
  }
  
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: '只支持 JPG 和 PNG 格式' };
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: '文件大小不能超过 5MB' };
  }
  
  return { valid: true };
}

/**
 * 压缩图片
 */
export function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 计算目标尺寸 (最大边1200px)
        let { width, height } = img;
        const maxDim = 1200;
        
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round(height * maxDim / width);
            width = maxDim;
          } else {
            width = Math.round(width * maxDim / height);
            height = maxDim;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // 绘制图片
        ctx.drawImage(img, 0, 0, width, height);
        
        // 尝试压缩到目标大小
        let quality = 0.8;
        let result = canvas.toDataURL('image/jpeg', quality);
        
        // 如果仍然太大，继续降低质量
        while (result.length > TARGET_SIZE * 1.37 && quality > 0.3) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }
        
        resolve(result);
      };
      
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = e.target.result;
    };
    
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

/**
 * 初始化上传区域
 */
export function initUploadZone(onUpload) {
  const zone = document.getElementById('upload-zone');
  const input = document.getElementById('upload-input');
  
  if (!zone || !input) return;
  
  // 点击触发选择
  zone.addEventListener('click', () => {
    input.click();
  });
  
  // 键盘支持
  zone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      input.click();
    }
  });
  
  // 文件选择
  input.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
    // 重置以允许重复选择同一文件
    input.value = '';
  });
  
  // 拖拽支持
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('dragover');
  });
  
  zone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
  });
  
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      onUpload(file);
    }
  });
}

/**
 * 获取今日日期字符串
 */
export function getTodayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
