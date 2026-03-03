/**
 * Service Worker - 离线缓存
 * 版本号用于缓存更新
 */
const CACHE_NAME = 'wuxing-fashion-v2';

// 预缓存资源列表
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/css/main.css',
  '/css/components.css',
  '/js/core/app.js',
  '/js/core/router.js',
  '/js/core/store.js',
  '/js/core/error-handler.js',
  '/js/services/engine.js',
  '/js/services/bazi.js',
  '/js/services/solar-terms.js',
  '/js/services/weather.js',
  '/js/services/recommendation.js',
  '/js/services/explanation.js',
  '/js/data/data-manager.js',
  '/js/data/repository.js',
  '/js/data/storage.js',
  '/js/utils/render.js',
  '/js/utils/share.js',
  '/js/utils/profile.js',
  '/js/utils/diary.js',
  '/js/utils/upload.js',
  '/js/components/base.js',
  '/js/components/weather-widget.js',
  '/js/controllers/base.js',
  '/js/controllers/welcome.js',
  '/js/controllers/entry.js',
  '/js/controllers/results.js',
  '/js/controllers/favorites.js',
  '/js/controllers/profile.js',
  '/js/controllers/diary.js',
  '/js/controllers/upload.js',
  '/js/lib/lunar.js',
  '/data/schemes.json',
  '/data/solar-terms.json',
  '/data/intention-templates.json',
  '/data/bazi-templates.json',
  '/data/wish-templates.json'
];

/**
 * 安装阶段：预缓存核心资源
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Pre-caching assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[SW] Pre-cache complete');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] Pre-cache failed:', err);
      })
  );
});

/**
 * 激活阶段：清理旧缓存
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        return self.clients.claim();
      })
  );
});

/**
 * 拦截请求：缓存优先策略
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // 只处理 GET 请求
  if (request.method !== 'GET') {
    return;
  }
  
  // 跳过非同源请求（如 CDN 字体）
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // 缓存命中，直接返回
        if (cachedResponse) {
          // 后台更新缓存（Stale-While-Revalidate 策略）
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse.ok) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, networkResponse.clone());
                });
              }
            })
            .catch(() => {
              // 网络失败，使用缓存即可
            });
          
          return cachedResponse;
        }
        
        // 缓存未命中，网络请求
        return fetch(request)
          .then((networkResponse) => {
            if (!networkResponse.ok) {
              throw new Error('Network response was not ok');
            }
            
            // 缓存新资源
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
            
            return networkResponse;
          })
          .catch((error) => {
            console.error('[SW] Fetch failed:', error);
            // 可以返回离线页面
            throw error;
          });
      })
  );
});

/**
 * 消息处理：用于跳过等待
 */
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
