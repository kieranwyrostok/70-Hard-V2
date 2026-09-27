// Offline support: every app file is cached on install; the cache name changes
// whenever any file changes, so re-deploying pushes the update to the phone.
const CACHE = 'seventy-hard-71b91c3480';
const FILES = [
  "./",
  "app-frame.js",
  "fonts/04372a4e-e063-4543-9061-c43a59fb58db.woff2",
  "fonts/0e20aefa-ac41-4e26-941a-267f2a82b44d.woff2",
  "fonts/1172e03f-021e-4a82-b804-11635f9c5a89.woff2",
  "fonts/1569ffa3-795f-4918-bfd6-cf9eb9e24d53.woff2",
  "fonts/1e27eb3c-1612-48fa-97f0-ca71e62ad349.woff2",
  "fonts/1fc7c484-3373-4c94-8b09-88f3df80f3d2.woff2",
  "fonts/21bd52c2-d7ad-4157-b61b-ce5341e75d12.woff2",
  "fonts/2603df5c-acd7-4800-a038-c3c4507af1d2.woff2",
  "fonts/263914e2-0849-4117-806b-0c4e5040b605.woff2",
  "fonts/3d7e69dc-d5fa-4f09-b874-2ba11ec2293c.woff2",
  "fonts/45c0e147-167b-46e3-b6e8-bd8283743d6b.woff2",
  "fonts/485914a3-ce82-4a8e-bd4e-0469737213f8.woff2",
  "fonts/596fa141-7e62-4c95-a46b-a9924b35be88.woff2",
  "fonts/60a2ce5c-8b1e-4c5b-ae0f-9fdc34f64ce2.woff2",
  "fonts/6103e72a-d174-4fc9-96da-0e51743e3eae.woff2",
  "fonts/6c86c1a6-a8fe-4217-93f0-dbf89eaff3a6.woff2",
  "fonts/7a3e3dce-3710-498f-96a8-0d46b987dfd7.woff2",
  "fonts/85b0b1e0-0b3f-4490-b0f8-8f74cd4b4448.woff2",
  "fonts/863a9199-c8fd-4bf1-8712-595836d85241.woff2",
  "fonts/8ca842c5-adcc-4b4a-a2a0-8f986fb2edf2.woff2",
  "fonts/9b08c265-2f51-46ec-9072-c925bd0c4e42.woff2",
  "fonts/a9b8321d-fd55-4bba-b271-0a0306bca970.woff2",
  "fonts/ad7b7ff0-79ee-4e3b-999a-70bec3317f7c.woff2",
  "fonts/b46d7d2f-2c0a-4022-af15-f7f423c4878d.woff2",
  "fonts/b7cd749b-2d10-4f93-9e21-69bc9491e5d6.woff2",
  "fonts/bac6f021-853b-4be1-be4b-e4732330e1d3.woff2",
  "fonts/bb81edd8-5eb7-468f-a3d3-e089e123f185.woff2",
  "fonts/be50277a-58d6-487d-a06a-a886ba3379ca.woff2",
  "fonts/c4e9da0f-a937-448d-ad1a-69126627e709.woff2",
  "fonts/c81deb3f-db81-46ad-9e5c-4af0745446fb.woff2",
  "fonts/c885817a-c127-4804-928a-9fc71913331c.woff2",
  "fonts/db24e143-6a51-4b1c-a717-a62e4ccfdb9d.woff2",
  "fonts/dd446be4-f2f4-42e8-b04a-a1f27047ba47.woff2",
  "fonts/eadd82fd-1ffe-4912-9ad2-e2a9a4c5fd98.woff2",
  "fonts/ef2ec1d5-065e-4463-b705-9eb5003f2c2b.woff2",
  "fonts/f926fb86-5b68-4712-b861-50a61bfff696.woff2",
  "fonts/fonts.css",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "index.html",
  "light.html",
  "manifest.webmanifest",
  "push-client.js",
  "scanner.js",
  "screens-light.js",
  "screens.js",
  "vendor/dc-runtime.js",
  "vendor/react-dom.production.min.js",
  "vendor/react.production.min.js"
];
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
