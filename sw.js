```javascript
/* Eldoria — Service Worker
 * Cache local files for faster loading and basic offline support.
 * Keep this file in the same folder as index.html.
 */

const CACHE_NAME = 'eldoria-cache-v1';
const OFFLINE_URLS = ['./', './index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Cache only resources that exist. A missing optional path should not
    // prevent the service worker from installing.
    await Promise.all(OFFLINE_URLS.map(async (url) => {
      try {
        const response = await fetch(url, { cache: 'reload' });
        if (response.ok) {
          await cache.put(url, response);
        }
      } catch (_) {
        // Continue even if the browser is offline during installation.
      }
    }));

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();

    await Promise.all(
      keys
        .filter(
          (key) =>
            key.startsWith('eldoria-cache-') &&
            key !== CACHE_NAME
        )
        .map((key) => caches.delete(key))
    );

    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Leave external libraries and third-party resources to the browser.
  if (url.origin !== self.location.origin) {
    return;
  }

  // For page navigation, prefer the latest version.
  // If offline, use the cached index.html as a fallback.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        const response = await fetch(request);

        if (response && response.ok) {
          cache.put('./index.html', response.clone()).catch(() => {});
        }

        return response;
      } catch (_) {
        return (
          await cache.match(request) ||
          await cache.match('./index.html') ||
          new Response(
            'Eldoria está offline. Conecte-se à internet e tente novamente.',
            {
              status: 503,
              headers: {
                'Content-Type': 'text/plain; charset=utf-8'
              }
            }
          )
        );
      }
    })());

    return;
  }

  // For same-origin assets, use cache first and update the cache
  // in the background when the network is available.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    const networkPromise = fetch(request).then((response) => {
      if (response && (response.ok || response.type === 'opaque')) {
        cache.put(request, response.clone()).catch(() => {});
      }

      return response;
    });

    if (cached) {
      event.waitUntil(networkPromise.catch(() => {}));
      return cached;
    }

    try {
      return await networkPromise;
    } catch (_) {
      return new Response('', {
        status: 504,
        statusText: 'Gateway Timeout'
      });
    }
  })());
});
```
