// Cache-busting service worker — clears all old PropertyFlow caches
const CACHE_NAME = 'tenax-v2'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', async event => {
  // Delete ALL old caches (including propertyflow-v1 and anything else)
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// Network-first: never serve stale HTML from cache
self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request))
})
