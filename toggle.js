// Simple toggle functionality
//
// Cross-file contract (see also play-all.js):
//   exposes  etRepeatEnabled()  - is the 반복 toggle on? read by play-all.js
//            initEnglishTalk()  - (re)bind the UI, called by js/scenario.js
//                                 after it renders dialogues
//   needs    etStopPlayAll() from play-all.js, optional
// The display flags below are private to this file.
var showEnglish = true;
var showKorean = true;
var showSpeaker = true;
var repeatMode = false;

function loadStates() {
    try {
        var saved = localStorage.getItem('englishTalk_states');
        if (saved) {
            var states = JSON.parse(saved);
            showEnglish = states.showEnglish !== false;
            showKorean = states.showKorean !== false;
            showSpeaker = states.showSpeaker !== false;
            repeatMode = states.repeatMode === true;
        }
    } catch(e) {}
}

function saveStates() {
    try {
        localStorage.setItem('englishTalk_states', JSON.stringify({
            showEnglish: showEnglish,
            showKorean: showKorean,
            showSpeaker: showSpeaker,
            repeatMode: repeatMode
        }));
    } catch(e) {}
}

function toggleEnglish() {
    showEnglish = !showEnglish;
    updateVisibility();
    var btn = document.getElementById('toggleEnglishBtn');
    if (btn) {
        btn.textContent = '영어';
        btn.classList.toggle('active', showEnglish);
    }
    saveStates();
}

function toggleKorean() {
    showKorean = !showKorean;
    updateVisibility();
    var btn = document.getElementById('toggleKoreanBtn');
    if (btn) {
        btn.textContent = '한국어';
        btn.classList.toggle('active', showKorean);
    }
    saveStates();
}

function toggleSpeaker() {
    showSpeaker = !showSpeaker;
    updateVisibility();
    var btn = document.getElementById('toggleSpeakerBtn');
    if (btn) {
        btn.textContent = '화자';
        btn.classList.toggle('active', showSpeaker);
    }
    saveStates();
}

function toggleRepeat() {
    repeatMode = !repeatMode;
    var btn = document.getElementById('repeatBtn');
    if (btn) {
        btn.textContent = '반복';
        btn.classList.toggle('active', repeatMode);
    }
    saveStates();
}

// Read by play-all.js to decide whether to loop the whole scenario
function etRepeatEnabled() {
    return repeatMode;
}

function updateVisibility() {
    var scenario = document.querySelector('.scenario');
    if (!scenario) return;

    // Hiding the speaker line moves the first English line up under the Google
    // button; the gutter that clears it is keyed off this class (toggle.css)
    scenario.classList.toggle('speaker-hidden', !showSpeaker);

    var els = scenario.querySelectorAll('.english');
    for (var i = 0; i < els.length; i++) els[i].style.display = showEnglish ? '' : 'none';
    
    els = scenario.querySelectorAll('.korean');
    for (var i = 0; i < els.length; i++) els[i].style.display = showKorean ? '' : 'none';
    
    els = scenario.querySelectorAll('.speaker');
    for (var i = 0; i < els.length; i++) els[i].style.display = showSpeaker ? '' : 'none';
}

function playAudioWithRepeat(audio) {
    var allAudios = document.querySelectorAll('audio');
    for (var i = 0; i < allAudios.length; i++) {
        if (allAudios[i] !== audio) {
            allAudios[i].pause();
            allAudios[i].currentTime = 0;
            allAudios[i].onended = null;
        }
    }
    
    if (repeatMode) {
        audio.onended = function() { audio.currentTime = 0; audio.play(); };
    } else {
        audio.onended = null;
    }
    
    audio.currentTime = 0;
    audio.play();
}

// Hand off to play-all.js if it is loaded; it decides whether anything is running
function etStopPlayAllIfLoaded() {
    if (typeof etStopPlayAll === 'function') etStopPlayAll();
}

function stopAudio(audio) {
    audio.pause();
    audio.currentTime = 0;
    audio.onended = null;
}

function openGoogleSearch(sentence) {
    var searchTerm = encodeURIComponent(sentence + ' 이 문장을 설명해줘');
    window.open('https://www.google.com/search?q=' + searchTerm, '_blank');
}

function initEnglishTalk() {
    loadStates();
    
    var btn = document.getElementById('toggleEnglishBtn');
    if (btn) { btn.textContent = '영어'; btn.classList.toggle('active', showEnglish); }
    
    btn = document.getElementById('toggleKoreanBtn');
    if (btn) { btn.textContent = '한국어'; btn.classList.toggle('active', showKorean); }
    
    btn = document.getElementById('toggleSpeakerBtn');
    if (btn) { btn.textContent = '화자'; btn.classList.toggle('active', showSpeaker); }
    
    btn = document.getElementById('repeatBtn');
    if (btn) { btn.textContent = '반복'; btn.classList.toggle('active', repeatMode); }
    
    updateVisibility();
    
    var dialogues = document.querySelectorAll('.dialogue');
    for (var i = 0; i < dialogues.length; i++) {
        addClickToPlay(dialogues[i]);
        addLongPressSelect(dialogues[i]);
        addGoogleButton(dialogues[i]);
    }

    // Once the selection is dropped, go back to tap-to-play on that line
    if (!etSelectionWatcherAdded) {
        etSelectionWatcherAdded = true;
        document.addEventListener('selectionchange', function() {
            var sel = window.getSelection();
            if (sel && !sel.isCollapsed) return;
            var open = document.querySelectorAll('.dialogue.selecting');
            for (var k = 0; k < open.length; k++) open[k].classList.remove('selecting');
        });
    }
    
    // When any sentence audio starts playing (user-initiated), stop play-all
    var audios = document.querySelectorAll('audio');
    for (var j = 0; j < audios.length; j++) {
        audios[j].addEventListener('play', function() {
            if (this.getAttribute('data-playall')) return;
            etStopPlayAllIfLoaded();
        });
    }
}

// Long press on a touch screen selects the word under the finger instead of
// playing the line, so a word can be looked up. CSS keeps .dialogue
// unselectable until this adds .selecting - see the pointer: coarse block in
// styles.css. Set while the press is being handled so the click that follows
// knows to skip playback.
var etLongPressed = false;
var etSelectionWatcherAdded = false;
var ET_LONG_PRESS_MS = 450;
var ET_LONG_PRESS_SLOP = 10;  // px of drift still counted as holding still

function etSelectWordAt(x, y) {
    var range = null;
    if (document.caretRangeFromPoint) {
        range = document.caretRangeFromPoint(x, y);
    } else if (document.caretPositionFromPoint) {
        var pos = document.caretPositionFromPoint(x, y);
        if (pos) {
            range = document.createRange();
            range.setStart(pos.offsetNode, pos.offset);
            range.collapse(true);
        }
    }
    if (!range) return false;
    var sel = window.getSelection();
    if (!sel) return false;
    sel.removeAllRanges();
    sel.addRange(range);
    // modify() is the only way to reach word boundaries without reimplementing
    // them; where it is missing the caret selection is left as-is.
    if (sel.modify) {
        sel.modify('move', 'backward', 'word');
        sel.modify('extend', 'forward', 'word');
    }
    return true;
}

function addLongPressSelect(dialogue) {
    var timer = null, startX = 0, startY = 0;

    function cancel() {
        if (timer) { clearTimeout(timer); timer = null; }
    }

    dialogue.addEventListener('touchstart', function(e) {
        if (e.touches.length !== 1) { cancel(); return; }
        if (e.target.closest('button') || e.target.closest('audio')) return;
        var t = e.touches[0];
        startX = t.clientX;
        startY = t.clientY;
        etLongPressed = false;
        dialogue.classList.remove('selecting');
        cancel();
        timer = setTimeout(function() {
            timer = null;
            etLongPressed = true;
            // The class has to land before the selection, or the range is made
            // on an element the browser still treats as unselectable.
            dialogue.classList.add('selecting');
            etSelectWordAt(startX, startY);
        }, ET_LONG_PRESS_MS);
    }, { passive: true });

    dialogue.addEventListener('touchmove', function(e) {
        var t = e.touches[0];
        if (!t) return;
        if (Math.abs(t.clientX - startX) > ET_LONG_PRESS_SLOP ||
            Math.abs(t.clientY - startY) > ET_LONG_PRESS_SLOP) {
            cancel();
        }
    }, { passive: true });

    dialogue.addEventListener('touchend', cancel, { passive: true });
    dialogue.addEventListener('touchcancel', function() {
        cancel();
        dialogue.classList.remove('selecting');
    }, { passive: true });
}

function addClickToPlay(dialogue) {
    dialogue.style.cursor = 'pointer';

    dialogue.addEventListener('click', function(e) {
        // Let the native audio controls handle their own clicks; without this the
        // click bubbles up here too and seeking/pausing fights with our handler
        if (e.target.closest('button') || e.target.closest('input') ||
            e.target.closest('.google-search-btn') || e.target.closest('audio')) {
            return;
        }

        // A long press was a word lookup, not a request to play the line
        if (etLongPressed) {
            etLongPressed = false;
            return;
        }

        etStopPlayAllIfLoaded();
        
        var audio = this.querySelector('audio');
        if (audio) {
            if (audio.paused) {
                playAudioWithRepeat(audio);
            } else {
                stopAudio(audio);
            }
        }
    });
}

// Inlined so the page has no external requests and works offline
var ET_GOOGLE_G_SVG =
    '<svg viewBox="0 0 48 48" width="16" height="16" aria-hidden="true" focusable="false">' +
    '<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>' +
    '<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>' +
    '<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>' +
    '<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>' +
    '</svg>';

function addGoogleButton(dialogue) {
    var englishEl = dialogue.querySelector('.english');
    if (!englishEl) return;

    var sentence = englishEl.textContent.trim();

    var searchBtn = document.createElement('button');
    searchBtn.className = 'google-search-btn';
    searchBtn.innerHTML = ET_GOOGLE_G_SVG;
    searchBtn.setAttribute('aria-label', '구글 검색');
    searchBtn.title = '구글 검색';
    searchBtn.onclick = function(e) {
        e.stopPropagation();
        openGoogleSearch(sentence);
    };
    
    dialogue.appendChild(searchBtn);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEnglishTalk);
} else {
    initEnglishTalk();
}
