// Service worker: shows push notifications (tasks, approvals, deadlines, chat) even when the tracker is closed.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { body: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(d.title || 'Lead Strategus Tracker', {
    body: d.body || '',
    tag: d.tag || undefined, // the same tag as the in-page alert, so one event never shows twice
    icon: '/logo.jpg',
    badge: '/favicon.svg',
    data: { url: d.url || '/' },
    requireInteraction: d.kind === 'deadline',
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
