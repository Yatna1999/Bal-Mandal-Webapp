self.addEventListener('push', e => {
  const d = e.data.json();
  e.waitUntil(self.registration.showNotification(d.title, {
    body: d.body,
    tag: d.tag,
    icon: d.icon || '/icons/icon-192.png',
    badge: d.badge || '/icons/badge-96.png',
    data: { url: d.url || '/' },
    renotify: false,
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const open = list.find(c => 'focus' in c);
      if (open) { open.navigate(e.notification.data.url); return open.focus(); }
      return clients.openWindow(e.notification.data.url);
    })
  );
});
