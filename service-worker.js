// Network-first, cache-fallback service worker: whenever the device is
// online it always fetches the latest version (so edits show up on the very
// next load instead of waiting for a background-refresh cycle), and only
// falls back to the last cached copy when the network request fails, which
// is what makes the page keep working offline once it has been opened at
// least once while online (e.g. right after "Add to Home Screen"). Only
// runs over https (or localhost) -- browsers refuse to register service
// workers on file:// pages.
var CACHE_NAME = 'offline-cache-v2';
var PRECACHE_URLS = ['./', './index.html', './icon.png', './manifest.json'];

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return Promise.all(PRECACHE_URLS.map(function (u) {
        return cache.add(u).catch(function () {});
      }));
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') { return; }
  event.respondWith(
    fetch(req).then(function (resp) {
      if (resp && resp.status === 200) {
        var copy = resp.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
      }
      return resp;
    }).catch(function () {
      return caches.match(req).then(function (cached) { return cached || Promise.reject('offline and not cached'); });
    })
  );
});
