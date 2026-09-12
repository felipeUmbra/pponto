const CACHE_NAME = 'pponto-v4';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './clock.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
];

// Install: precache the app shell + icon set, then switch to the new version.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

// Activate: drop old caches and take control of uncontrolled clients.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Fetch: cache-first with network revalidation for same-origin GET requests,
// falling back to the cached index.html (offline SPA shell) on network failure.
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