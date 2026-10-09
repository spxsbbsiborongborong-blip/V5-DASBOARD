const CACHE_NAME = 'spx-siborong-v5-cache-v4';
const ASSETS = ['./index.html','./styles.css','./data.js','./app-core.js','./app-ai.js','./manifest.webmanifest','./favicon.png','./icon-72.png','./icon-96.png','./icon-128.png','./icon-144.png','./icon-152.png','./icon-192.png','./icon-384.png','./icon-512.png'];
self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE_NAME).then(function(c) { return c.addAll(ASSETS); }).then(function() { return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e) {
  e.waitUntil(caches.keys().then(function(keys) {
    return Promise.all(keys.filter(function(k) { return k !== CACHE_NAME; }).map(function(k) { return caches.delete(k); }));
  }).then(function() { return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(fetch(e.request).then(function(res) {
      var clone = res.clone();
      caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
      return res;
    }).catch(function() { return caches.match(e.request).then(function(r) { return r || caches.match('./index.html'); }); }));
  } else {
    e.respondWith(caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(res) {
        var clone = res.clone();
        caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
        return res;
      }).catch(function() { return cached; });
    }));
  }
});
