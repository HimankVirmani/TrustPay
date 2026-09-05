/* TrustPay service worker: app-shell caching + offline fallback.
 *
 * Bump CACHE whenever the shell changes. The activate handler deletes every
 * cache whose name does not match, so a version bump is what forces existing
 * installs to drop stale assets after a redeploy. */
const CACHE = 'trustpay-v2';
const SHELL = ['/', '/offline.html', '/manifest.webmanifest',
  '/icons/icon-192.png', '/icons/icon-512.png', '/ml/metrics.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  // Never cache payment or risk decisions -- they must always hit the server.
  if (new URL(request.url).pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(() => caches.match('/offline.html').then((r) => r || Response.error()))
    );
    return;
  }

  // Stale-while-revalidate: answer from cache for speed, but always refresh the
  // cached copy in the background so the next load picks up a new deploy.
  // Plain cache-first would pin users to whichever build they saw first.
  e.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((res) => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return res;
      }).catch(() => cached || Response.error());
      return cached || network;
    })
  );
});
