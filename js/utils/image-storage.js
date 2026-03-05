/**
 * Image Storage Module - 图片存储模块
 * 使用 IndexedDB 存储图片，支持压缩
 */

const DB_NAME = 'wuxing_fashion_db';
const STORE_NAME = 'images';
const DB_VERSION = 1;

let db = null;

/**
 * 初始化 IndexedDB
 */
async function initDB() {
  if (db) return db;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * 压缩图片
 * @param {File} file - 图片文件
 * @param {number} maxSize - 最大尺寸（宽或高）
 * @param {number} quality - 压缩质量 (0-1)
 * @returns {Promise<string>} Base64 图片
 */
export async function compressImage(file, maxSize = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 计算目标尺寸
        let { width, height } = img;
        
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round(height * maxSize / width);
            width = maxSize;
          } else {
            width = Math.round(width * maxSize / height);
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // 绘制并压缩
        ctx.drawImage(img, 0, 0, width, height);
        
        // 尝试压缩到目标大小（约 100KB）
        let currentQuality = quality;
        let result = canvas.toDataURL('image/jpeg', currentQuality);
        
        // 如果仍然太大，继续降低质量
        const targetSize = 100 * 1024; // 100KB
        while (result.length > targetSize * 1.37 && currentQuality > 0.3) {
          currentQuality -= 0.1;
          result = canvas.toDataURL('image/jpeg', currentQuality);
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
 * 保存图片到 IndexedDB
 * @param {string} id - 图片ID（通常是日期）
 * @param {string} imageData - Base64 图片数据
 */
export async function saveImage(id, imageData) {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.put({
      id,
      data: imageData,
      timestamp: Date.now()
    });
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * 从 IndexedDB 获取图片
 * @param {string} id - 图片ID
 * @returns {Promise<string|null>} Base64 图片数据
 */
export async function getImage(id) {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    
    request.onsuccess = () => {
      resolve(request.result?.data || null);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * 删除图片
 * @param {string} id - 图片ID
 */
export async function deleteImage(id) {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * 处理图片上传（压缩 + 存储）
 * @param {File} file - 图片文件
 * @param {string} id - 存储ID
 * @returns {Promise<string>} 压缩后的 Base64
 */
export async function processAndStoreImage(file, id) {
  const compressed = await compressImage(file);
  await saveImage(id, compressed);
  return compressed;
}

/**
 * 获取存储使用情况
 * @returns {Promise<number>} 已使用的字节数
 */
export async function getStorageUsage() {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return estimate.usage || 0;
  }
  return 0;
}
