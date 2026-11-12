const CACHE_NAME = 'daftar-deyon-v1.0.0';
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon.svg'];
const CDN_ASSETS = ['https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    // Cache Excel support during installation when the device is online.
    for (const url of CDN_ASSETS) {
      try {
        const response = await fetch(url, { mode: 'cors' });
        if (response.ok) await cache.put(url, response);
      } catch (_) { /* App remains usable; Excel needs a connection until cached. */ }
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('daftar-deyon-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const isAppAsset = url.origin === self.location.origin;
  const isXlsx = url.href.includes('cdn.jsdelivr.net/npm/xlsx@0.18.5/');
  if (!isAppAsset && !isXlsx) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request, { ignoreSearch: false }) || (isXlsx ? await cache.match(CDN_ASSETS[0]) : null);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && response.ok) await cache.put(request, response.clone());
      return response;
    } catch (error) {
      if (cached) return cached;
      throw error;
    }
  })());
});
