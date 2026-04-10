const CACHE_NAME = 'procrastinever-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo.png'
];

// 1. INSTALACIÓN: Guarda los archivos base para que el APK abra al instante
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

// 3. FETCH: Permite que la app cargue offline (estratégico para el APK)
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

// 4. PUSH (Tu código): Recibe notificaciones incluso con la app cerrada
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

// 5. CLICK EN NOTIFICACIÓN: Vital para que el APK se abra al tocar el aviso
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            for (const client of clientList) {
                if (client.url === '/' && 'focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow('./');
        })
    );
});
