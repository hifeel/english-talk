// Keyboard control for the dialogue pages.
//
// Listening to the same sentence on repeat means reaching for the mouse every
// time you want the next one. These keys keep hands where they are:
//
//   ArrowLeft  / ArrowUp    previous sentence
//   ArrowRight / ArrowDown  next sentence
//   Space                   stop
//
// Cross-file contract:
//   needs  playAudioWithRepeat(audio) / stopAudio(audio) from toggle.js
//          etPlayAllActive() / etPlayAllSkip(n) / togglePlayAll() from play-all.js
//   all optional - each call is guarded, so a page loading only some of these
//   still works, it just does less.
//
// Audio events do not bubble, so the play listener is registered in the capture
// phase on the document. That covers dialogues built later by js/scenario.js and
// js/marks.js without a re-init hook.

var ET_KB_CURRENT = null;   // the <audio> the keys act on

function etKbAudioList() {
    return Array.prototype.slice.call(document.querySelectorAll('.dialogue audio'));
}

// Space on a focused button activates the button, arrows inside a text field
// move the caret, and the native audio controls do their own seeking. Leave all
// of those alone.
function etKbShouldIgnore(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return true;
    var t = e.target;
    if (!t || t === document || t === document.body) return false;
    if (t.isContentEditable) return true;
    return /^(INPUT|TEXTAREA|SELECT|BUTTON|AUDIO|A)$/.test(t.tagName || '');
}

function etKbShow(audio) {
    var d = audio.closest ? audio.closest('.dialogue') : null;
    if (d && d.scrollIntoView) d.scrollIntoView({behavior: 'smooth', block: 'center'});
}

// Move `delta` sentences. A 전체 재생 run owns the sequence while it is going,
// so hand the move to it and stop there - falling through would start a second
// sentence alongside the run.
function etKbMove(delta) {
    if (typeof etPlayAllActive === 'function' && etPlayAllActive()) {
        if (typeof etPlayAllSkip === 'function') etPlayAllSkip(delta);
        return;
    }

    var list = etKbAudioList();
    if (!list.length) return;

    var i = ET_KB_CURRENT ? list.indexOf(ET_KB_CURRENT) : -1;
    var target = i === -1 ? 0 : i + delta;      // nothing played yet: start at the top
    if (target < 0 || target >= list.length) return;

    var next = list[target];
    ET_KB_CURRENT = next;
    etKbShow(next);
    if (typeof playAudioWithRepeat === 'function') {
        playAudioWithRepeat(next);              // carries repeat mode over to the new line
    } else {
        next.currentTime = 0;
        next.play();
    }
}

function etKbStop() {
    // Route through the 전체 재생 button's own handler so its label and progress
    // counter go back with it
    if (typeof etPlayAllActive === 'function' && etPlayAllActive()) {
        if (typeof togglePlayAll === 'function') togglePlayAll();
        return;
    }

    var playing = null;
    var list = etKbAudioList();
    for (var n = 0; n < list.length; n++) {
        if (!list[n].paused) { playing = list[n]; break; }
    }

    if (playing) {
        // stopAudio also clears a pending repeat, which a bare pause() would
        // leave armed to restart the sentence a moment later
        if (typeof stopAudio === 'function') stopAudio(playing);
        else { playing.pause(); playing.currentTime = 0; }
        return;
    }

    // Nothing playing: treat it as start, so one key both stops and resumes
    var again = ET_KB_CURRENT || list[0];
    if (!again) return;
    ET_KB_CURRENT = again;
    etKbShow(again);
    if (typeof playAudioWithRepeat === 'function') playAudioWithRepeat(again);
    else again.play();
}

function etInitKeyboard() {
    document.addEventListener('play', function(e) {
        if (e.target && e.target.tagName === 'AUDIO') ET_KB_CURRENT = e.target;
    }, true);

    document.addEventListener('keydown', function(e) {
        if (etKbShouldIgnore(e)) return;

        switch (e.key) {
            case 'ArrowLeft':
            case 'ArrowUp':
                etKbMove(-1); break;
            case 'ArrowRight':
            case 'ArrowDown':
                etKbMove(1); break;
            case ' ':
            case 'Spacebar':        // older WebKit reports the name, not the char
                etKbStop(); break;
            default:
                return;             // not ours - leave the browser to it
        }
        e.preventDefault();         // stop the page scrolling under the keys
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', etInitKeyboard);
} else {
    etInitKeyboard();
}
