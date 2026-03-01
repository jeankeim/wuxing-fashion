/**
 * Service Worker - 离线缓存
 * 版本号用于缓存更新
 */
const CACHE_NAME = 'wuxing-fashion-v1';

// 预缓存资源列表
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/css/tokens.css',
  '/css/base.css',
  '/css/layout.css',
  '/css/components.css',
  '/css/animations.css',
  '/js/main.js',
  '/js/engine.js',
  '/js/bazi.js',
  '/js/solar-terms.js',
  '/js/render.js',
  '/js/storage.js',
  '/js/upload.js',
  '/js/error-handler.js',
  '/js/store.js',
  '/js/share.js',
  '/js/recommendation.js',
  '/js/explanation.js',
  '/js/profile.js',
  '/js/data-manager.js',
  '/js/router.js',
  '/js/repository.js',
  '/js/app.js',
  '/js/diary.js',
  '/js/weather.js',
  '/js/components/base.js',
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
  '/data/bazi-templates.json'
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
