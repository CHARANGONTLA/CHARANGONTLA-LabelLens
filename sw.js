const CACHE_NAME = 'labellens-cache-v1';

// Install: Open cache on installation
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME));
});

// Activate: Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

// Fetch: Use a network-first strategy.
// Fetch from the network, if it fails, fallback to the cache.
// If the network succeeds, update the cache.
self.addEventListener('fetch', event => {
  // We only want to cache GET requests.
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // If we get a valid response, clone it, cache it, and return it.
        // We only cache successful responses to avoid caching errors.
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // If the network request fails, try to serve the response from the cache.
        return caches.match(event.request).then(response => {
          // Return the cached response if found, otherwise the error will propagate.
          return response; 
        });
      })
  );
});
