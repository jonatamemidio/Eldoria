/* Eldoria - Service Worker para GitHub Pages */

const CACHE = 'eldoria-v1';

const CORE = [
  './',
  './index.html'
];

const OPTIONAL = [
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.4/peerjs.min.js'
];

// INSTALAÇÃO
self.addEventListener('install', event => {
  event.waitUntil((async () => {

    const cache = await caches.open(CACHE);

    await cache.addAll(CORE);

    await Promise.allSettled(
      OPTIONAL.map(url => cache.add(url))
    );

    await self.skipWaiting();

  })());
});

// ATIVAÇÃO E LIMPEZA DE CACHE ANTIGO
self.addEventListener('activate', event => {
  event.waitUntil((async () => {

    const keys = await caches.keys();

    await Promise.all(
      keys
        .filter(key =>
          key.startsWith('eldoria-') &&
          key !== CACHE
        )
        .map(key => caches.delete(key))
    );

    await self.clients.claim();

  })());
});

// FUNCIONAMENTO OFFLINE
self.addEventListener('fetch', event => {

  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (!['http:', 'https:'].includes(url.protocol)) return;

  const sameOrigin = url.origin === self.location.origin;

  const supportedCDN =
    url.hostname === 'cdnjs.cloudflare.com' &&
    (/\/ajax\/libs\/(three\.js|peerjs)\//).test(url.pathname);

  if (!sameOrigin && !supportedCDN) return;

  // Navegação: tenta internet primeiro
  if (sameOrigin && event.request.mode === 'navigate') {

    event.respondWith((async () => {

      try {

        const response = await fetch(event.request);

        if (response.ok) {
          (await caches.open(CACHE))
            .put(event.request, response.clone());
        }

        return response;

      } catch (_) {

        return (
          (await caches.match(event.request)) ||
          (await caches.match('./index.html')) ||
          Response.error()
        );

      }

    })());

    return;
  }

  // Outros arquivos: tenta cache primeiro
  event.respondWith((async () => {

    const cached = await caches.match(event.request);

    if (cached) return cached;

    try {

      const response = await fetch(event.request);

      if (response.ok || response.type === 'opaque') {

        (await caches.open(CACHE))
          .put(event.request, response.clone());

      }

      return response;

    } catch (_) {

      return Response.error();

    }

  })());

});
