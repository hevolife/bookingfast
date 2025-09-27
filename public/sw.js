// Cache optimisé pour la production
const CACHE_NAME = 'bookingfast-v1.0.0';
const urlsToCache = [
  '/',
  '/dashboard',
  '/calendar',
  '/services',
  '/admin',
  '/emails',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png',
  '/manifest.webmanifest'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker installé - Cache activé');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Mise en cache des ressources critiques');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
  // Stratégie Cache First pour les assets statiques, Network First pour les API
  if (event.request.destination === 'image' || 
      event.request.url.includes('/assets/') ||
      event.request.url.includes('.png') ||
      event.request.url.includes('.jpg') ||
      event.request.url.includes('.css') ||
      event.request.url.includes('.js')) {
    
    // Cache First pour les assets
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request).then((response) => {
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          });
        })
    );
  } else {
    // Network First pour les API et pages
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Mettre en cache les réponses réussies
          if (response.status === 200 && event.request.method === 'GET') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback vers le cache en cas d'erreur réseau
          return caches.match(event.request);
        })
    );
  }
});

// Gestion des notifications push (optionnel)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nouvelle notification BookingFast',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Voir',
        icon: '/pwa-192x192.png'
      },
      {
        action: 'close',
        title: 'Fermer',
        icon: '/pwa-192x192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('BookingFast', options)
  );
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  }
});