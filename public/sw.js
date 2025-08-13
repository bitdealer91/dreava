// Minimal Service Worker with focused caching for API and images
const SW_VERSION = 'v4';
const API_CACHE = `dreava-api-${SW_VERSION}`;
const IMAGE_CACHE = `dreava-images-${SW_VERSION}`;

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Clean old caches
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => ![API_CACHE, IMAGE_CACHE].includes(k)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1) Network-first for navigation to avoid white screens
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(req);
      } catch (_) {
        const cached = await caches.match('/index.html');
        return cached || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }

  // 2) Stale-while-revalidate for active collections API (same-origin)
  if (url.origin === location.origin && url.pathname.startsWith('/api/active-collections') && req.method === 'GET') {
    event.respondWith((async () => {
      const cache = await caches.open(API_CACHE);
      const cached = await cache.match(req);
      const networkPromise = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);
      // Return cached immediately, update in background
      if (cached) return cached;
      const net = await networkPromise;
      return net || new Response(JSON.stringify({ collections: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    })());
    return;
  }

  // 3) Cache-first for images (including cross-origin gateways)
  const isImage = req.destination === 'image' || /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(url.pathname);
  if (isImage && req.method === 'GET') {
    event.respondWith((async () => {
      const cache = await caches.open(IMAGE_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        // Cache opaque or ok responses
        if (res && (res.ok || res.type === 'opaque')) {
          cache.put(req, res.clone());
        }
        return res;
      } catch (_) {
        return cached || Response.error();
      }
    })());
    return;
  }
});