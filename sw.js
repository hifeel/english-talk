// English Talk service worker - offline support for the app shell and dialogue
// data. Audio is deliberately left alone: it is 30MB across 1,108 files, so it
// belongs behind a per-category download the user asks for, not an install-time
// precache. Until that exists, mp3 requests go straight to the network.
//
// Strategy is stale-while-revalidate for everything cached: a page opens from
// the cache instantly and offline, while a fresh copy is fetched in the
// background for next time. Combined with skipWaiting/clients.claim, a deploy
// lands on the visit after it is published.
//
// Bump CACHE when the precache list changes; the activate handler drops
// everything that does not match.
var CACHE = 'english-talk-v2';

// The shell plus every data file. 337KB in total, so precaching all of it costs
// less than one dialogue's audio.
var PRECACHE = [
    './',
    'index.html',
    'category.html',
    'scenario.html',
    'styles.css',
    'toggle.css',
    'toggle.js',
    'play-all.js',
    'js/data.js',
    'js/index.js',
    'js/category.js',
    'js/scenario.js',
    'js/pwa.js',
    'manifest.json',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'icons/icon-maskable-512.png',
    'data/index.json',
    'data/hotel.json',
    'data/shopping.json',
    'data/airport.json',
    'data/restaurant.json',
    'data/transport.json',
    'data/hospital.json',
    'data/travel.json'
];

self.addEventListener('install', function(e) {
    e.waitUntil(
        caches.open(CACHE).then(function(c) {
            // addAll is all-or-nothing; one 404 would leave the worker uninstalled
            return Promise.all(PRECACHE.map(function(url) {
                return c.add(url).catch(function(err) {
                    console.warn('[sw] precache skipped', url, err);
                });
            }));
        }).then(function() { return self.skipWaiting(); })
    );
});

self.addEventListener('activate', function(e) {
    e.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(keys.map(function(k) {
                return k === CACHE ? null : caches.delete(k);
            }));
        }).then(function() { return self.clients.claim(); })
    );
});

function isAudio(url) {
    return url.pathname.indexOf('/audio/') !== -1 || /\.mp3$/.test(url.pathname);
}

self.addEventListener('fetch', function(e) {
    var req = e.request;
    if (req.method !== 'GET') return;

    var url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    // Audio needs Range requests to be seekable; a cache lookup would answer a
    // Range request with a 200 for the whole file and break seeking.
    if (isAudio(url)) return;

    // Page loads carry ?cat=&name=, but scenario.html is the same file for all
    // 117 scenarios - the content comes from the JSON. Key pages on the path
    // alone, or every scenario would miss the precache and store a duplicate.
    var cacheKey = req.mode === 'navigate'
        ? new Request(url.origin + url.pathname)
        : req;

    e.respondWith(
        caches.open(CACHE).then(function(cache) {
            return cache.match(cacheKey).then(function(hit) {
                var fresh = fetch(req).then(function(res) {
                    if (res && res.ok && res.type === 'basic') {
                        cache.put(cacheKey, res.clone());
                    }
                    return res;
                }).catch(function() {
                    // Offline. Unknown pages (the old redirect stubs) have
                    // nothing cached, so land on the home screen.
                    return hit || cache.match('index.html');
                });
                return hit || fresh;
            });
        })
    );
});
