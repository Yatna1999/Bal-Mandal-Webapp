const CACHE_NAME = 'bal-mandal-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png',
  '/icons/badge-96.png',
];

// Install Event: Cache app shell & static assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Cache-first for static assets, Network-ONLY for API & Supabase
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // STRICT RULE: Do NOT cache any API or Supabase responses!
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase.co') ||
    e.request.method !== 'GET'
  ) {
    return; // Fallback to standard network request
  }

  // Network-first for HTML pages, Cache-first for static assets
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => {
        return caches.match('/') || Response.error();
      })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic'
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});

// Push Event: Web Push Notifications (from WO-31)
self.addEventListener('push', (e) => {
  if (!e.data) return;
  const d = e.data.json();
  e.waitUntil(
    self.registration.showNotification(d.title, {
      body: d.body,
      tag: d.tag,
      icon: d.icon || '/icons/icon-192.png',
      badge: d.badge || '/icons/badge-96.png',
      data: { url: d.url || '/' },
      renotify: false,
    })
  );
});

// Notification Click Event: Focus or Open Window
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => 'focus' in c);
      if (open) {
        open.navigate(e.notification.data.url);
        return open.focus();
      }
      return clients.openWindow(e.notification.data.url);
    })
  );
});
