// Offline support: every app file is cached on install; the cache name changes
// whenever any file changes, so re-deploying pushes the update to the phone.
const CACHE = '__CACHE__';
const FILES = __FILES__;
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin === location.origin && url.pathname.startsWith('/api/')) return; // always live
  if (e.request.mode === 'navigate') {
    // index.html (dark) and light.html (light) are cached separately; './' is the same page as index.html
    const pageKey = /light\.html$/.test(url.pathname) ? 'light.html' : './';
    // the app page: network first (so a new deploy shows up immediately), cached copy when offline
    e.respondWith(Promise.race([
      fetch(e.request).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(pageKey, copy)); } return res; }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 4000))
    ]).catch(() => caches.match(pageKey).then(r => r || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
    // keep a copy of anything fetched later (e.g. the barcode library) for offline use
    if (res.ok && (url.origin === location.origin || url.hostname === 'cdn.jsdelivr.net')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => e.request.mode === 'navigate' ? caches.match('./') : Response.error())));
});

// ── push notifications ──
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Seventy Hard', {
    body: d.body || '', tag: d.tag || undefined, renotify: !!d.tag,
    icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { url: d.url || './#s02' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) {
      if ('focus' in c) { if ('navigate' in c) c.navigate(target).catch(() => {}); return c.focus(); }
    }
    return self.clients.openWindow(target);
  }));
});
