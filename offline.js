/* Per-category audio download.
 *
 * URLs are resolved through v2AudioUrl(), which makes them absolute - the same
 * keys anything saved before this interface landed was stored under, so those
 * downloads carry over rather than having to be fetched again.
 *
 * Playback does not depend on the service worker: app.js reads this cache
 * itself and plays from a blob, so a saved category works even before the
 * worker is in control.
 *
 * There is no separate record of what is saved - the cache is the state, so it
 * cannot drift the way a flag would.
 */

var V2_AUDIO_CACHE = 'english-talk-audio-v2';
var V2_PARALLEL = 6;

function v2OfflineSupported() {
  return typeof caches !== 'undefined';
}

function v2CategoryAudioUrls(cat) {
  var urls = [];
  for (var i = 0; i < cat.scenarios.length; i++) {
    var ds = cat.scenarios[i].dialogues;
    for (var j = 0; j < ds.length; j++) urls.push(v2AudioUrl(ds[j].audio));
  }
  return urls;
}

function v2FormatMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(1) + 'MB';
}

function v2AudioStatus(cat) {
  var urls = v2CategoryAudioUrls(cat);
  return caches.open(V2_AUDIO_CACHE).then(function (cache) {
    return cache.keys().then(function (reqs) {
      var have = {};
      for (var i = 0; i < reqs.length; i++) have[reqs[i].url] = true;
      var saved = urls.filter(function (u) { return have[u]; });
      if (!saved.length) return { saved: 0, total: urls.length, bytes: 0 };
      return Promise.all(saved.map(function (u) {
        return cache.match(u).then(function (r) {
          return r ? r.clone().blob().then(function (b) { return b.size; }) : 0;
        });
      })).then(function (sizes) {
        var bytes = 0;
        for (var k = 0; k < sizes.length; k++) bytes += sizes[k];
        return { saved: saved.length, total: urls.length, bytes: bytes };
      });
    });
  });
}

function v2DownloadAudio(cat, onProgress) {
  var urls = v2CategoryAudioUrls(cat);
  var done = 0, bytes = 0, failed = 0;

  return caches.open(V2_AUDIO_CACHE).then(function (cache) {
    var queue = urls.slice();

    function worker() {
      var url = queue.shift();
      if (!url) return Promise.resolve();
      return cache.match(url).then(function (hit) {
        if (hit) return hit.clone().blob().then(function (b) { return b.size; });
        return fetch(url, { cache: 'no-store' }).then(function (res) {
          if (!res.ok) throw new Error(res.status + ' ' + url);
          var copy = res.clone();
          return cache.put(url, res).then(function () {
            return copy.blob().then(function (b) { return b.size; });
          });
        });
      }).then(function (size) {
        bytes += size;
      }).catch(function (e) {
        failed++;
        console.warn('[v2 offline] failed', url, e);
      }).then(function () {
        done++;
        if (onProgress) onProgress(done, urls.length, bytes);
        return worker();
      });
    }

    var pool = [];
    for (var i = 0; i < Math.min(V2_PARALLEL, urls.length); i++) pool.push(worker());
    return Promise.all(pool).then(function () {
      return { done: done, failed: failed, bytes: bytes };
    });
  });
}

function v2DeleteAudio(cat) {
  var urls = v2CategoryAudioUrls(cat);
  return caches.open(V2_AUDIO_CACHE).then(function (cache) {
    return Promise.all(urls.map(function (u) { return cache.delete(u); }));
  });
}

/* ---- UI ---- */

function v2RenderOffline(cat) {
  var box = document.getElementById('offlineArea');
  if (!box) return;
  if (!v2OfflineSupported()) { box.style.display = 'none'; return; }

  v2AudioStatus(cat).then(function (st) {
    var html;
    if (st.saved === 0) {
      html = '<button class="offline-btn" id="offlineBtn">⬇️ 오프라인 저장' +
             '<span class="offline-note">' + st.total + '개 음성</span></button>';
    } else if (st.saved < st.total) {
      html = '<button class="offline-btn" id="offlineBtn">⬇️ 이어서 저장' +
             '<span class="offline-note">' + st.saved + ' / ' + st.total + '개</span></button>';
    } else {
      html = '<span class="offline-done">✔️ 오프라인 저장됨' +
             '<span class="offline-note">' + v2FormatMB(st.bytes) + '</span></span>';
    }
    if (st.saved > 0) html += '<button class="offline-del" id="offlineDel">삭제</button>';
    box.innerHTML = html;

    var btn = document.getElementById('offlineBtn');
    if (btn) btn.onclick = function () { v2StartDownload(cat); };
    var del = document.getElementById('offlineDel');
    if (del) del.onclick = function () { v2ConfirmRemove(cat); };
  });
}

function v2StartDownload(cat) {
  var box = document.getElementById('offlineArea');
  box.innerHTML =
    '<div class="offline-progress">' +
    '<div class="progress-text" id="offlineText">준비 중…</div>' +
    '<div class="track"><div class="fill" id="offlineFill" style="width:0"></div></div>' +
    '</div>';
  var text = document.getElementById('offlineText');
  var fill = document.getElementById('offlineFill');

  // Ask not to be evicted under storage pressure; a refusal is not an error
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(function () {});
  }

  v2DownloadAudio(cat, function (done, total, bytes) {
    text.textContent = '저장 중… ' + done + ' / ' + total + '개 · ' + v2FormatMB(bytes);
    fill.style.width = Math.round(done / total * 100) + '%';
  }).then(function (r) {
    if (r.failed) {
      text.textContent = r.failed + '개를 받지 못했습니다. 다시 시도해 주세요.';
      setTimeout(function () { v2RenderOffline(cat); }, 2500);
    } else {
      v2RenderOffline(cat);
    }
  });
}

// Deleting throws away a download that took minutes on a phone, so ask first
function v2ConfirmRemove(cat) {
  var box = document.getElementById('offlineArea');
  if (!box) return;
  v2AudioStatus(cat).then(function (st) {
    box.innerHTML =
      '<span class="offline-note" style="flex:1">저장된 음성 ' + st.saved + '개(' +
      v2FormatMB(st.bytes) + ')를 삭제할까요?</span>' +
      '<button class="offline-del danger" id="delYes">삭제</button>' +
      '<button class="offline-del" id="delNo">취소</button>';
    document.getElementById('delYes').onclick = function () {
      v2DeleteAudio(cat).then(function () { v2RenderOffline(cat); });
    };
    document.getElementById('delNo').onclick = function () { v2RenderOffline(cat); };
  });
}
