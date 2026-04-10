const CACHE_NAME = 'procrastinever-v1.1';
const ASSETS = [
  './index.html',
  './manifest.json',
  './logo.png'
];

// 1. INSTALACIÓN: Guarda los archivos base
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// 2. ACTIVACIÓN: Limpia versiones viejas para evitar conflictos de código
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 3. FETCH: Estrategia Network-First (Busca internet primero, si no hay, usa el caché)
self.addEventListener('fetch', (event) => {
  // No cacheamos Firebase para no romper la sincronización en tiempo real
  if (event.request.url.includes('firestore.googleapis.com') || 
      event.request.url.includes('firebasejs')) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// 4. PUSH: Recibe notificaciones
self.addEventListener('push', function(event) {
    const options = {
        body: event.data ? event.data.text() : '¡Es hora de revisar tus hábitos!',
        icon: 'logo.png',
        badge: 'logo.png',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        }
    };
    event.waitUntil(
        self.registration.showNotification('ProcrastiNever', options)
    );
});

// 5. CLICK EN NOTIFICACIÓN: Abre la app o la trae al frente en GitHub Pages
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Busca si ya hay una pestaña abierta con la app
            for (const client of clientList) {
                if (client.url.includes('index.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Si no hay ninguna abierta, abre una nueva
            if (clients.openWindow) return clients.openWindow('./index.html');
        })
    );
});
