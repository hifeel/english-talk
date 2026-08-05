// Per-category audio download for the category page.
//
// The service worker never precaches audio - 1,108 files, 30MB - so this is how
// a category's mp3s get saved for offline use. The page does the downloading
// itself (the Cache API works in a window, not just a worker) and the worker
// only reads AUDIO_CACHE back out. Keeping the two apart means progress
// reporting is plain async code with no postMessage plumbing.
//
// There is no separate record of what is saved: the cache is the state. A
// category counts as saved when every one of its audio files is present, which
// cannot drift the way a localStorage flag would.

var ET_AUDIO_CACHE = 'english-talk-audio-v2';  // keep in sync with sw.js
var ET_PARALLEL = 6;

function etOfflineSupported() {
    return typeof caches !== 'undefined' && 'serviceWorker' in navigator;
}

function etCategoryAudioUrls(cat) {
    var urls = [];
    for (var i = 0; i < cat.scenarios.length; i++) {
        var ds = cat.scenarios[i].dialogues;
        for (var j = 0; j < ds.length; j++) {
            urls.push(new URL(ds[j].audio, location.href).href);
        }
    }
    return urls;
}

function etFormatMB(bytes) {
    return (bytes / 1024 / 1024).toFixed(1) + 'MB';
}

// {saved: n, total: n, bytes: n} - bytes only counts what is actually stored
function etAudioStatus(cat) {
    var urls = etCategoryAudioUrls(cat);
    return caches.open(ET_AUDIO_CACHE).then(function(cache) {
        return cache.keys().then(function(reqs) {
            var have = {};
            for (var i = 0; i < reqs.length; i++) have[reqs[i].url] = true;
            var saved = urls.filter(function(u) { return have[u]; });
            if (!saved.length) return {saved: 0, total: urls.length, bytes: 0};
            return Promise.all(saved.map(function(u) {
                return cache.match(u).then(function(r) {
                    return r ? r.clone().blob().then(function(b) { return b.size; }) : 0;
                });
            })).then(function(sizes) {
                var bytes = 0;
                for (var k = 0; k < sizes.length; k++) bytes += sizes[k];
                return {saved: saved.length, total: urls.length, bytes: bytes};
            });
        });
    });
}

// Downloads whatever is missing, calling onProgress(done, total, bytes)
function etDownloadAudio(cat, onProgress) {
    var urls = etCategoryAudioUrls(cat);
    var done = 0, bytes = 0, failed = 0;

    return caches.open(ET_AUDIO_CACHE).then(function(cache) {
        var queue = urls.slice();

        function worker() {
            var url = queue.shift();
            if (!url) return Promise.resolve();
            return cache.match(url).then(function(hit) {
                if (hit) return hit.clone().blob().then(function(b) { return b.size; });
                return fetch(url, {cache: 'no-store'}).then(function(res) {
                    if (!res.ok) throw new Error(res.status + ' ' + url);
                    var copy = res.clone();
                    return cache.put(url, res).then(function() {
                        return copy.blob().then(function(b) { return b.size; });
                    });
                });
            }).then(function(size) {
                bytes += size;
            }).catch(function(e) {
                failed++;
                console.warn('[offline] failed', url, e);
            }).then(function() {
                done++;
                if (onProgress) onProgress(done, urls.length, bytes);
                return worker();
            });
        }

        var pool = [];
        for (var i = 0; i < Math.min(ET_PARALLEL, urls.length); i++) pool.push(worker());
        return Promise.all(pool).then(function() {
            return {done: done, failed: failed, bytes: bytes};
        });
    });
}

function etDeleteAudio(cat) {
    var urls = etCategoryAudioUrls(cat);
    return caches.open(ET_AUDIO_CACHE).then(function(cache) {
        return Promise.all(urls.map(function(u) { return cache.delete(u); }));
    });
}

// ============ UI ============

// The row is a three-column grid so the status sits dead centre regardless of
// what is in the right-hand slot. Delete lives behind 더보기 there: it is rare
// and destructive, and it should not sit next to the button you actually press.
function etRenderOffline(cat) {
    var box = document.getElementById('offlineArea');
    if (!box) return;
    if (!etOfflineSupported()) { box.style.display = 'none'; return; }

    etAudioStatus(cat).then(function(st) {
        var main, hasMenu = st.saved > 0;

        if (st.saved === 0) {
            main = '<button class="offline-btn" id="offlineBtn">⬇️ 오프라인 저장' +
                   '<span class="offline-note">' + st.total + '개 음성</span></button>';
        } else if (st.saved < st.total) {
            main = '<button class="offline-btn" id="offlineBtn">⬇️ 이어서 저장' +
                   '<span class="offline-note">' + st.saved + ' / ' + st.total + '개</span></button>';
        } else {
            main = '<span class="offline-done">✔️ 오프라인 저장됨' +
                   '<span class="offline-note">' + etFormatMB(st.bytes) + '</span></span>';
        }

        box.innerHTML =
            '<div class="offline-main">' + main + '</div>' +
            (hasMenu
                ? '<div class="offline-more">' +
                  '<button class="offline-more-btn" id="offlineMoreBtn" aria-label="더보기"' +
                  ' aria-haspopup="true" aria-expanded="false">⋯</button>' +
                  '<div class="offline-menu" id="offlineMenu" hidden>' +
                  '<button class="offline-menu-item" id="offlineDel">삭제</button>' +
                  '</div></div>'
                : '');

        var btn = document.getElementById('offlineBtn');
        if (btn) btn.onclick = function() { etStartDownload(cat); };
        if (hasMenu) {
            document.getElementById('offlineMoreBtn').onclick = etToggleMoreMenu;
            document.getElementById('offlineDel').onclick = function() {
                etCloseMoreMenu();
                etConfirmRemove(cat);
            };
        }
    });
}

function etCloseMoreMenu() {
    var menu = document.getElementById('offlineMenu');
    var btn = document.getElementById('offlineMoreBtn');
    if (menu) menu.hidden = true;
    if (btn) btn.setAttribute('aria-expanded', 'false');
}

function etToggleMoreMenu(e) {
    e.stopPropagation();   // the document handler below would close it again
    var menu = document.getElementById('offlineMenu');
    var btn = document.getElementById('offlineMoreBtn');
    if (!menu) return;
    var open = menu.hidden;
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

document.addEventListener('click', function(e) {
    if (!e.target.closest || !e.target.closest('.offline-more')) etCloseMoreMenu();
});
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') etCloseMoreMenu();
});

function etStartDownload(cat) {
    var box = document.getElementById('offlineArea');
    box.innerHTML =
        '<div class="offline-progress offline-full">' +
        '<div class="offline-progress-text" id="offlineText">준비 중…</div>' +
        '<div class="offline-track"><div class="offline-fill" id="offlineFill"></div></div>' +
        '</div>';
    var text = document.getElementById('offlineText');
    var fill = document.getElementById('offlineFill');

    // Ask the browser not to evict this under storage pressure. Chrome decides
    // on its own signals (installed PWA, engagement); a refusal is not an error.
    if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().catch(function() {});
    }

    etDownloadAudio(cat, function(done, total, bytes) {
        var pct = Math.round(done / total * 100);
        text.textContent = '저장 중… ' + done + ' / ' + total + '개 · ' + etFormatMB(bytes);
        fill.style.width = pct + '%';
    }).then(function(r) {
        if (r.failed) {
            text.textContent = r.failed + '개를 받지 못했습니다. 다시 시도해 주세요.';
            setTimeout(function() { etRenderOffline(cat); }, 2500);
        } else {
            etRenderOffline(cat);
        }
    });
}

// Deleting throws away a download that took minutes on a phone connection, so
// ask first. The confirmation replaces the row rather than opening a dialog:
// a native confirm() is heavier on mobile and easy to dismiss by accident.
function etConfirmRemove(cat) {
    var box = document.getElementById('offlineArea');
    if (!box) return;

    etAudioStatus(cat).then(function(st) {
        box.innerHTML =
            '<div class="offline-confirm-row offline-full">' +
            '<span class="offline-confirm">저장된 음성 ' + st.saved + '개(' +
            etFormatMB(st.bytes) + ')를 삭제할까요?</span>' +
            '<button class="offline-del danger" id="offlineDelYes">삭제</button>' +
            '<button class="offline-cancel" id="offlineDelNo">취소</button>' +
            '</div>';
        document.getElementById('offlineDelYes').onclick = function() { etRemove(cat); };
        document.getElementById('offlineDelNo').onclick = function() { etRenderOffline(cat); };
    });
}

function etRemove(cat) {
    etDeleteAudio(cat).then(function() { etRenderOffline(cat); });
}
