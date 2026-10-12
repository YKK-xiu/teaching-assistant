// Service Worker - 教学助手 PWA
const CACHE_NAME = 'teaching-assistant-v5';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/css/style.css',
  '/js/api.js',
  '/js/common.js',
  '/js/app.js',
  '/js/pages/dashboard.js',
  '/js/pages/knowledge.js',
  '/js/pages/questions.js',
  '/js/pages/papers.js',
  '/js/pages/lessonPlans.js',
  '/js/pages/research.js',
  '/js/pages/students.js',
  '/js/pages/courses.js',
  '/js/pages/settings.js'
];

// 安装：缓存静态资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 请求拦截：API 请求走网络，静态资源缓存优先
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // API 请求：网络优先，失败时不缓存（数据是实时的）
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ code: 1, message: '网络不可用' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }
  // 静态资源：缓存优先，回退网络
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
