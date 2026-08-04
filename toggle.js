// Simple toggle functionality
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

function updateVisibility() {
    var scenario = document.querySelector('.scenario');
    if (!scenario) return;
    
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

// Stop play-all when a sentence audio starts playing
function stopPlayAllIfActive() {
    if (typeof isPlaying !== 'undefined' && isPlaying && typeof stopAll === 'function') {
        stopAll();
    }
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
        addGoogleButton(dialogues[i]);
    }
    
    // When any sentence audio starts playing (user-initiated), stop play-all
    var audios = document.querySelectorAll('audio');
    for (var j = 0; j < audios.length; j++) {
        audios[j].addEventListener('play', function() {
            if (this.getAttribute('data-playall')) return;
            stopPlayAllIfActive();
        });
    }
}

function addClickToPlay(dialogue) {
    dialogue.style.cursor = 'pointer';
    
    dialogue.addEventListener('click', function(e) {
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('.google-search-btn')) {
            return;
        }
        
        if (typeof stopPlayAllForClick === 'function') stopPlayAllForClick();
        
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

function addGoogleButton(dialogue) {
    var englishEl = dialogue.querySelector('.english');
    if (!englishEl) return;
    
    var sentence = englishEl.textContent.trim();
    
    var searchBtn = document.createElement('button');
    searchBtn.className = 'google-search-btn';
    searchBtn.innerHTML = '<img src="https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png" alt="Google">';
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
