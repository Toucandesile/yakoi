/* Service worker Yakoi — reçoit les rappels même quand l'app est fermée. */

self.addEventListener('install', (event) => {
  // Le nouveau service worker prend la main immédiatement
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/*
 * La page principale est TOUJOURS demandée au réseau. Sans cela, un navigateur
 * peut continuer à servir un index.html périmé qui référence un bundle
 * supprimé du serveur : l'app reste alors bloquée sur une ancienne version,
 * parfois avec des bugs déjà corrigés. Les fichiers JS/CSS portent une
 * empreinte dans leur nom : ils restent mis en cache sans risque.
 */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || req.mode !== 'navigate') return;
  event.respondWith(
    fetch(req).catch(() => caches.match(req).then((r) => r || fetch(req)))
  );
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Yakoi', body: event.data ? event.data.text() : '' };
  }
  const title = payload.title || 'Yakoi';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/yakoi/favicon.ico',
    badge: payload.icon || '/yakoi/favicon.ico',
    tag: payload.tag || 'yakoi-rappel',
    data: { url: payload.url || '/yakoi/' },
    // Regrouper les rappels d'un même type plutôt que d'empiler
    renotify: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

/* Ouvrir l'app (ou la remettre au premier plan) au clic sur la notification */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/yakoi/';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if (client.url.includes('/yakoi') && 'focus' in client) return client.focus();
        }
        return self.clients.openWindow(target);
      })
  );
});
