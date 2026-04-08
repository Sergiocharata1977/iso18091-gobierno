// Service Worker para Don Cándido IA - PWA
// Versión: 1.0.0

const CACHE_NAME = 'don-candido-pwa-v1';
const OFFLINE_URL = '/offline.html';

// Archivos a cachear para funcionamiento offline
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/don-candido-favicon.png',
  '/offline.html',
];

// Rutas del vendedor para offline
const VENDEDOR_ROUTES = [
  '/vendedor',
  '/vendedor/clientes',
  '/vendedor/sync',
  '/vendedor/perfil',
];

// Instalación del Service Worker
self.addEventListener('install', event => {
  console.log('[SW] Installing Service Worker');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activar inmediatamente
  self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener('activate', event => {
  console.log('[SW] Activating Service Worker');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  // Tomar control inmediato de todas las páginas
  self.clients.claim();
});

// Estrategia de cacheo: Network First con fallback a cache
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requests que no son GET
  if (request.method !== 'GET') {
    return;
  }

  // Ignorar requests a APIs externas
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  // Para archivos estáticos: Cache First
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then(response => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(request, response.clone());
            return response;
          });
        });
      })
    );
    return;
  }

  // Para páginas del vendedor: Network First con cache fallback
  if (isVendedorRoute(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cachear la respuesta exitosa
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Si falla la red, usar cache
          return caches.match(request).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Si no hay cache, mostrar página offline
            return caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // Para otras páginas: Network First
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // Página offline como fallback
        if (request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// Helpers
function isStaticAsset(pathname) {
  const staticExtensions = [
    '.png',
    '.jpg',
    '.jpeg',
    '.svg',
    '.ico',
    '.css',
    '.js',
    '.woff',
    '.woff2',
  ];
  return (
    staticExtensions.some(ext => pathname.endsWith(ext)) ||
    pathname === '/manifest.json'
  );
}

function isVendedorRoute(pathname) {
  return pathname.startsWith('/vendedor');
}

// Background Sync para vendedor (sincronización offline)
self.addEventListener('sync', event => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-visitas') {
    event.waitUntil(syncVisitas());
  }

  if (event.tag === 'sync-fotos') {
    event.waitUntil(syncFotos());
  }
});

async function syncVisitas() {
  console.log('[SW] Syncing visitas...');
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_AVAILABLE', target: 'visitas' });
  });
}

async function syncFotos() {
  console.log('[SW] Syncing fotos...');
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_AVAILABLE', target: 'fotos' });
  });
}

// Push Notifications
self.addEventListener('push', event => {
  console.log('[SW] Push received:', event.data?.text());

  const options = {
    body: event.data?.text() || 'Nueva notificación',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
  };

  event.waitUntil(
    self.registration.showNotification('Don Cándido IA', options)
  );
});

// Click en notificación
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked');
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

console.log('[SW] Service Worker loaded');
