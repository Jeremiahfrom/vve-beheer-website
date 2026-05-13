/**
 * VvE Beheer Collectief — Service Worker
 * Strategie: Cache-first voor assets, Network-first voor HTML
 * Bij offline → offline.html als fallback
 */

const CACHE_VERSION = 'vve-v1';
const OFFLINE_URL   = '/offline.html';

// Alles wat pre-gecacht wordt bij installatie
const PRE_CACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/contact.html',
  '/over-ons.html',
  '/pakketten.html',
  '/schademelding.html',
  '/privacy.html',
  '/diensten/administratief.html',
  '/diensten/financieel.html',
  '/diensten/technisch.html',
  '/diensten/juridisch.html',
  '/css/main.css',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32.png',
];

// ── INSTALL ──────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      console.log('[SW] Pre-caching assets...');
      return cache.addAll(PRE_CACHE);
    }).then(() => {
      console.log('[SW] Installatie voltooid');
      return self.skipWaiting();
    })
  );
});

// ── ACTIVATE ─────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_VERSION)
          .map(name => {
            console.log('[SW] Oude cache verwijderd:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Actief, clients overnemen');
      return self.clients.claim();
    })
  );
});

// ── FETCH ────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Sla niet-GET requests over
  if (request.method !== 'GET') return;

  // Sla externe requests over (Google Fonts e.d.) — laat browser afhandelen
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(request).catch(() => new Response('', { status: 503 }))
    );
    return;
  }

  // HTML-pagina's: Network-first, val terug op cache, dan offline.html
  if (request.headers.get('Accept') && request.headers.get('Accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Sla verse response ook op in cache
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then(cached => {
            if (cached) return cached;
            return caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // CSS, JS, afbeeldingen: Cache-first, update op achtergrond
  event.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => null);

      return cached || networkFetch;
    })
  );
});

// ── PUSH NOTIFICATIONS (voorbereiding) ──────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  self.registration.showNotification(data.title || 'VvE Beheer Collectief', {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/favicon-32.png',
    data: { url: data.url || '/' },
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
