const CACHE_NAME = 'ponto-dot8-v2';
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './clock.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET same-origin requests in production; skip during dev
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (self.location.origin !== url.origin) return;

  // Never intercept Vite dev server HMR / module requests
  if (url.port === '5199' || url.pathname.startsWith('/@')) return;
  if (url.pathname.startsWith('/src/')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match('./index.html'));
    }),
  );
});