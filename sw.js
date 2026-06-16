const CACHE_NAME = 'tenax-v3'

self.addEventListener('install', () => { self.skipWaiting() })

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// Navigation requests (index.html): always bypass HTTP cache so users
// always get the latest deploy without needing to clear browser cache.
// Asset requests (JS/CSS): normal network — they have content hashes anyway.
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request, { cache: 'no-store' }))
  } else {
    event.respondWith(fetch(event.request))
  }
})
