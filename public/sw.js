const CACHE = 'tintin-v1';
const SHELL = [
  '/', '/js/game.js', '/js/Wallet.js', '/css/style.css', '/manifest.json',
  '/icons/icon-192.png', '/icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first for same-origin GET: always try the freshest version, fall back
// to cache only when offline. Keeps the cache warm for offline play while making
// sure new deploys are picked up on the next load.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;   // let cross-origin go to network
  if (url.pathname.startsWith('/api/')) return;       // never cache API calls

  e.respondWith(
    fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    }).catch(() => caches.match(e.request).then(c => {
      if (c) return c;
      // la página principal solo para navegaciones: devolver HTML a un pedido de
      // JS rompe el arranque del módulo (se queda en "Cargando...")
      if (e.request.mode === 'navigate') return caches.match('/');
      return Response.error();
    }))
  );
});
