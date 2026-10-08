const CACHE_NAME = 'spx-siborong-v5-cache-v1';
const ASSETS = [
  './siborong_dashboard_ai.html',
  './manifest.webmanifest',
  './pwa_icons/icon-72.png',
  './pwa_icons/icon-96.png',
  './pwa_icons/icon-128.png',
  './pwa_icons/icon-144.png',
  './pwa_icons/icon-152.png',
  './pwa_icons/icon-192.png',
  './pwa_icons/icon-384.png',
  './pwa_icons/icon-512.png',
  './pwa_icons/favicon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Network-first for HTML, cache-first for assets
  const url = new URL(event.request.url);
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request).then((r) => r || caches.match('./siborong_dashboard_ai.html')))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return res;
        }).catch(() => cached);
      })
    );
  }
});
