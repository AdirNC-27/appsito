// Service worker de Appsito: funciona sin internet y recibe las notificaciones.
const VERSION = 'appsito-v1';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/config.js', 'js/firebase.js', 'js/store.js', 'js/ui.js', 'js/push.js', 'js/theme.js', 'js/seed.js',
  'js/shared/time.js', 'js/shared/model.js', 'js/shared/ics.js',
  'js/views/home.js', 'js/views/calendar.js', 'js/views/task.js', 'js/views/grades.js', 'js/views/study.js', 'js/views/settings.js', 'js/views/courses.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];
const CDN = ['www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Primero la red (para recibir mejoras), y si no hay internet, la copia guardada.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  if (!same && !CDN.includes(url.hostname)) return; // Firestore y otros: los maneja Firebase
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: same }).then((r) => r || (req.mode === 'navigate' ? caches.match('index.html') : undefined)))
  );
});

self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch { data = { title: 'Appsito', body: e.data ? e.data.text() : '' }; }
  const title = data.title || 'Appsito';
  e.waitUntil(self.registration.showNotification(title, {
    body: data.body || '',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: data.tag || undefined,
    data: { url: data.url || '#/' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const hash = (e.notification.data && e.notification.data.url) || '#/';
  const target = new URL(hash.startsWith('#') ? './' + hash : hash, self.registration.scope).href;
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const client = all.find((c) => c.url.startsWith(self.registration.scope));
    if (client) {
      await client.focus();
      client.postMessage({ type: 'navigate', url: hash.startsWith('#') ? hash : '#/' });
      return;
    }
    await self.clients.openWindow(target);
  })());
});
