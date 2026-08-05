// English Talk service worker - offline support for the app shell, the dialogue
// data, and any audio the user has chosen to save.
//
// Strategy is stale-while-revalidate for the shell: a page opens from the cache
// instantly and offline, while a fresh copy is fetched in the background for
// next time. Combined with skipWaiting/clients.claim, a deploy lands on the
// visit after it is published.
//
// Audio is never precached - 1,108 files at 30MB. js/offline.js fills
// AUDIO_CACHE one category at a time when the user asks; anything not saved
// falls through to the network.
//
// Bump CACHE when the precache list changes; the activate handler drops every
// cache except the current one and AUDIO_CACHE, which must survive so a version
// bump does not throw away the user's downloads.
var CACHE = 'english-talk-v3';
var AUDIO_CACHE = 'english-talk-audio-v1';

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
    'js/offline.js',
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
                if (k === CACHE || k === AUDIO_CACHE) return null;
                return caches.delete(k);
            }));
        }).then(function() { return self.clients.claim(); })
    );
});

function isAudio(url) {
    return url.pathname.indexOf('/audio/') !== -1 || /\.mp3$/.test(url.pathname);
}

// Media elements ask for byte ranges when you drag the scrubber. The Cache API
// only ever stores whole 200 responses, and handing one back for a Range
// request leaves the browser unable to seek - the same failure you get from a
// server with no Accept-Ranges. So slice the cached body and build the 206
// ourselves. Files here are 10-50KB, so this is cheap.
function rangeResponse(cached, rangeHeader) {
    return cached.arrayBuffer().then(function(buf) {
        var total = buf.byteLength;
        var m = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
        if (!m) {
            return new Response(null, {status: 416, headers: {
                'Content-Range': 'bytes */' + total
            }});
        }

        var start, end;
        if (m[1] === '') {                       // "bytes=-500" -> last 500 bytes
            var suffix = parseInt(m[2], 10);
            if (!suffix) return new Response(null, {status: 416});
            start = Math.max(0, total - suffix);
            end = total - 1;
        } else {
            start = parseInt(m[1], 10);
            end = m[2] === '' ? total - 1 : parseInt(m[2], 10);
        }
        if (isNaN(start) || start >= total || start > end) {
            return new Response(null, {status: 416, headers: {
                'Content-Range': 'bytes */' + total
            }});
        }
        if (end >= total) end = total - 1;

        return new Response(buf.slice(start, end + 1), {
            status: 206,
            statusText: 'Partial Content',
            headers: {
                'Content-Type': cached.headers.get('Content-Type') || 'audio/mpeg',
                'Content-Length': String(end - start + 1),
                'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
                'Accept-Ranges': 'bytes'
            }
        });
    });
}

// Saved audio comes from the cache; anything else goes to the network untouched
function handleAudio(req, url) {
    return caches.open(AUDIO_CACHE).then(function(cache) {
        // match on the URL alone - the request may carry a Range header
        return cache.match(url.href).then(function(cached) {
            if (!cached) return fetch(req);
            var range = req.headers.get('range');
            return range ? rangeResponse(cached, range) : cached;
        });
    });
}

self.addEventListener('fetch', function(e) {
    var req = e.request;
    if (req.method !== 'GET') return;

    var url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    if (isAudio(url)) {
        e.respondWith(handleAudio(req, url));
        return;
    }

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
