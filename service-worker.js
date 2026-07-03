// Cache-first, network-updating service worker so the page keeps working
// offline once it has been opened at least once while online (e.g. right
// after "Add to Home Screen"). Only runs over https (or localhost) --
// browsers refuse to register service workers on file:// pages.
var CACHE_NAME = 'offline-cache-v1';
var PRECACHE_URLS = ['./', './index.html', './icon.png', './manifest.json'];

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS).catch(function () {
        // if one of the optional URLs 404s, still cache what we can
        return Promise.all(PRECACHE_URLS.map(function (u) {
          return cache.add(u).catch(function () {});
        }));
      });
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
    caches.match(req).then(function (cached) {
      var networkFetch = fetch(req).then(function (resp) {
        if (resp && resp.status === 200) {
          var copy = resp.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
        }
        return resp;
      }).catch(function () { return cached; });
      return cached || networkFetch;
    })
  );
});
