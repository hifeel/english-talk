// Lock screen / notification controls for the dialogue page.
//
// Media Session lets the OS show what is playing and take play, pause and
// track-skip from the lock screen, the notification shade and headset buttons -
// which is the point of 전체 재생 on a phone with the screen off.
//
// Cross-file contract:
//   needs  etPlayAllActive() / etPlayAllSkip(n) from play-all.js, both optional
//
// Audio events do not bubble, so the listeners below are registered in the
// capture phase on the document. That way the dialogues js/scenario.js builds
// after this file runs are covered without any re-init hook.

var ET_MS_CURRENT = null;   // the <audio> the OS is currently showing

function etMediaSessionSupported() {
    return 'mediaSession' in navigator && typeof MediaMetadata === 'function';
}

function etDialogueOf(audio) {
    return audio.closest ? audio.closest('.dialogue') : null;
}

function etAllAudio() {
    return Array.prototype.slice.call(document.querySelectorAll('.dialogue audio'));
}

function etTextOf(dialogue, cls) {
    var el = dialogue && dialogue.querySelector(cls);
    return el ? el.textContent.trim() : '';
}

function etUpdateMetadata(audio) {
    var d = etDialogueOf(audio);
    if (!d) return;

    var titleEl = document.getElementById('pageTitle');
    navigator.mediaSession.metadata = new MediaMetadata({
        title: etTextOf(d, '.english') || etTextOf(d, '.korean'),
        artist: etTextOf(d, '.speaker'),
        album: titleEl ? titleEl.textContent.trim() : 'English Talk',
        artwork: [
            {src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png'},
            {src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png'}
        ]
    });
}

// The lock screen scrubber. duration is NaN until metadata loads, and
// setPositionState throws on anything invalid, so guard it.
function etUpdatePosition(audio) {
    if (!navigator.mediaSession.setPositionState) return;
    var d = audio.duration;
    if (!d || !isFinite(d) || d <= 0) return;
    try {
        navigator.mediaSession.setPositionState({
            duration: d,
            playbackRate: audio.playbackRate || 1,
            position: Math.min(audio.currentTime, d)
        });
    } catch (e) { /* a racing seek can still make this invalid; not worth failing */ }
}

// Move `delta` sentences. During 전체 재생 the run owns the sequence, so hand
// the move to it; otherwise play the neighbouring sentence directly.
function etMediaSkip(delta) {
    if (typeof etPlayAllSkip === 'function' && etPlayAllSkip(delta)) return;

    var list = etAllAudio();
    var i = ET_MS_CURRENT ? list.indexOf(ET_MS_CURRENT) : -1;
    if (i === -1) return;
    var next = list[i + delta];
    if (!next) return;

    ET_MS_CURRENT.pause();
    ET_MS_CURRENT.currentTime = 0;
    next.currentTime = 0;
    var d = etDialogueOf(next);
    if (d && d.scrollIntoView) d.scrollIntoView({behavior: 'smooth', block: 'center'});
    next.play();
}

function etInitMediaSession() {
    if (!etMediaSessionSupported()) return;

    document.addEventListener('play', function(e) {
        var audio = e.target;
        if (!audio || audio.tagName !== 'AUDIO') return;
        ET_MS_CURRENT = audio;
        etUpdateMetadata(audio);
        etUpdatePosition(audio);
        navigator.mediaSession.playbackState = 'playing';
    }, true);

    document.addEventListener('pause', function(e) {
        if (e.target === ET_MS_CURRENT) {
            navigator.mediaSession.playbackState = 'paused';
        }
    }, true);

    document.addEventListener('timeupdate', function(e) {
        if (e.target === ET_MS_CURRENT) etUpdatePosition(e.target);
    }, true);

    // A 전체 재생 run moves on by itself; keep the OS in step until it ends.
    document.addEventListener('ended', function(e) {
        if (e.target !== ET_MS_CURRENT) return;
        if (typeof etPlayAllActive === 'function' && etPlayAllActive()) return;
        navigator.mediaSession.playbackState = 'paused';
    }, true);

    var handlers = {
        play: function() { if (ET_MS_CURRENT) ET_MS_CURRENT.play(); },
        pause: function() { if (ET_MS_CURRENT) ET_MS_CURRENT.pause(); },
        previoustrack: function() { etMediaSkip(-1); },
        nexttrack: function() { etMediaSkip(1); },
        stop: function() {
            if (typeof etStopPlayAll === 'function') etStopPlayAll();
            if (ET_MS_CURRENT) { ET_MS_CURRENT.pause(); ET_MS_CURRENT.currentTime = 0; }
            navigator.mediaSession.playbackState = 'none';
        },
        seekto: function(details) {
            if (!ET_MS_CURRENT || details.seekTime == null) return;
            ET_MS_CURRENT.currentTime = details.seekTime;
            etUpdatePosition(ET_MS_CURRENT);
        }
    };

    for (var action in handlers) {
        if (!handlers.hasOwnProperty(action)) continue;
        try {
            navigator.mediaSession.setActionHandler(action, handlers[action]);
        } catch (e) {
            // browsers reject actions they do not implement; the rest still work
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', etInitMediaSession);
} else {
    etInitMediaSession();
}
