// Self-destructing Service Worker to eliminate zombie caches in development
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    }).then(() => {
      return self.registration.unregister();
    }).then(() => {
      return self.clients.matchAll();
    }).then((clients) => {
      clients.forEach((c) => {
        if (c.url && 'navigate' in c) {
          c.navigate(c.url);
        }
      });
    })
  );
});

// Pass through all fetch requests directly to network without caching
self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request));
});
