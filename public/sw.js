// This is the service worker
const CACHE_NAME = 'frotacheck-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/icon-192x192.png',
        '/icon-512x512.png',
        '/manifest.webmanifest'
      ]);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // basic fetch listener
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response if found, else fetch from network
      return response || fetch(event.request).catch(() => {
        // Fallback for offline if the resource isn't cached
        // (Just returning new Response('') to avoid throwing unhandled errors)
      });
    })
  );
});
