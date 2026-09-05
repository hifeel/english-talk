// Play All functionality for English Talk
//
// Cross-file contract (see also toggle.js, js/media-session.js):
//   exposes  togglePlayAll()   - the 전체 재생 button in scenario.html
//            etStopPlayAll()   - stop if running; safe to call anytime
//            etPlayAllActive() - is a run in progress?
//            etPlayAllSkip(n)  - move n sentences within a run; false if not running
//            etGapMs()         - the pause between sentences, shared with toggle.js
//   needs    etRepeatEnabled() from toggle.js, optional - without it, no repeat
// Everything else here is private to this file. Load order does not matter:
// function declarations hoist and the cross-file calls happen at click time.
var isPlaying = false;
var currentAudioIndex = 0;
var audioElements = [];

// A breath between sentences. trim_silence.py strips the padding edge-tts leaves
// on each clip, so without this the next sentence starts the instant the last
// one stops. Done here rather than by padding 1,412 mp3s: no second lossy
// re-encode, and nobody has to re-download audio they already saved offline.
var ET_GAP_MS = 200;
var etGapTimer = null;

function etClearGap() {
    if (etGapTimer !== null) {
        clearTimeout(etGapTimer);
        etGapTimer = null;
    }
}

// toggle.js reads this so the repeat loop pauses by the same amount
function etGapMs() {
    return ET_GAP_MS;
}

function initAudioList() {
    audioElements = Array.from(document.querySelectorAll('audio'));
}

function togglePlayAll() {
    if (isPlaying) {
        stopAll();
    } else {
        startAll();
    }
}

function startAll() {
    initAudioList();
    etClearGap();
    isPlaying = true;
    currentAudioIndex = 0;
    
    // Stop any currently playing individual audio first
    stopAllIndividualAudio();
    
    document.getElementById('playAllIcon').textContent = '⏸️';
    var txt = document.getElementById('playAllText');
    if (txt) txt.textContent = '일시정지';
    document.getElementById('playAllProgress').style.display = 'inline-block';
    
    playNext();
}

function stopAllIndividualAudio() {
    for (var i = 0; i < audioElements.length; i++) {
        audioElements[i].pause();
        audioElements[i].currentTime = 0;
        audioElements[i].onended = null;
    }
}

function playNext() {
    if (!isPlaying || currentAudioIndex >= audioElements.length) {
        // toggle.js owns the repeat setting; if it isn't loaded, just don't repeat.
        // The length check is what keeps an empty list from recursing forever:
        // marks.html keeps its 전체 재생 button with no bookmarks on the page.
        if (isPlaying && audioElements.length &&
            typeof etRepeatEnabled === 'function' && etRepeatEnabled()) {
            currentAudioIndex = 0;
            playNext();
        } else {
            stopAll();
        }
        return;
    }
    
    updateProgress();
    scrollToDialogue(currentAudioIndex);
    
    var audio = audioElements[currentAudioIndex];
    
    audio.onended = function() {
        audio.removeAttribute('data-playall');
        currentAudioIndex++;
        etClearGap();
        etGapTimer = setTimeout(function() {
            etGapTimer = null;
            playNext();
        }, ET_GAP_MS);
    };
    
    audio.currentTime = 0;
    // Mark this audio as being driven by play-all
    audio.setAttribute('data-playall', '1');
    audio.play();
}

function stopAll() {
    isPlaying = false;
    etClearGap();   // a pending gap would otherwise start the next sentence

    if (currentAudioIndex < audioElements.length) {
        audioElements[currentAudioIndex].pause();
        audioElements[currentAudioIndex].currentTime = 0;
        audioElements[currentAudioIndex].onended = null;
    }

    // Clear the play-all marker everywhere; a stale one would make a later
    // click on that sentence fail to stop play-all (toggle.js play handler)
    for (var k = 0; k < audioElements.length; k++) {
        audioElements[k].removeAttribute('data-playall');
    }
    
    var dialogues = document.querySelectorAll('.dialogue');
    for (var i = 0; i < dialogues.length; i++) {
        dialogues[i].classList.remove('playing');
        dialogues[i].style.backgroundColor = '';
    }
    
    document.getElementById('playAllIcon').textContent = '▶️';
    var txt = document.getElementById('playAllText');
    if (txt) txt.textContent = '전체 재생';
    document.getElementById('playAllProgress').style.display = 'none';
}

function updateProgress() {
    var total = audioElements.length;
    var current = currentAudioIndex + 1;
    document.getElementById('progressText').textContent = current + ' / ' + total;
}

// The .playing mark belongs to toggle.js, which sets it from the audio events -
// this only has to bring the sentence into view.
function scrollToDialogue(index) {
    var dialogue = audioElements[index].closest('.dialogue');
    if (dialogue) dialogue.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Entry point for other scripts: stop play-all if it is running, else do nothing
function etStopPlayAll() {
    if (isPlaying) {
        stopAll();
    }
}

function etPlayAllActive() {
    return isPlaying;
}

// Jump `delta` sentences within a running play-all. Returns false if play-all
// is not running or the jump would fall off either end, so the caller can
// handle the move itself.
function etPlayAllSkip(delta) {
    if (!isPlaying) return false;
    var target = currentAudioIndex + delta;
    if (target < 0 || target >= audioElements.length) return false;

    // A skip is deliberate, so go now rather than sitting through a pending gap
    etClearGap();

    var cur = audioElements[currentAudioIndex];
    cur.pause();
    cur.onended = null;
    cur.removeAttribute('data-playall');

    currentAudioIndex = target;
    playNext();
    return true;
}
