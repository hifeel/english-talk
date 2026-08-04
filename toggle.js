// Simple toggle functionality
var showEnglish = true;
var showKorean = true;
var showSpeaker = true;
var repeatMode = false;

// Load states from localStorage
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

// Save states to localStorage
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
        btn.textContent = showEnglish ? '영어 ON' : '영어 OFF';
        btn.classList.toggle('active', showEnglish);
    }
    saveStates();
}

function toggleKorean() {
    showKorean = !showKorean;
    updateVisibility();
    var btn = document.getElementById('toggleKoreanBtn');
    if (btn) {
        btn.textContent = showKorean ? '한국어 ON' : '한국어 OFF';
        btn.classList.toggle('active', showKorean);
    }
    saveStates();
}

function toggleSpeaker() {
    showSpeaker = !showSpeaker;
    updateVisibility();
    var btn = document.getElementById('toggleSpeakerBtn');
    if (btn) {
        btn.textContent = showSpeaker ? '화자 ON' : '화자 OFF';
        btn.classList.toggle('active', showSpeaker);
    }
    saveStates();
}

function toggleRepeat() {
    repeatMode = !repeatMode;
    var btn = document.getElementById('repeatBtn');
    if (btn) {
        btn.textContent = repeatMode ? '반복 ON' : '반복 OFF';
        btn.classList.toggle('active', repeatMode);
    }
    saveStates();
}

function updateVisibility() {
    var scenario = document.querySelector('.scenario');
    if (!scenario) return;
    
    var englishEls = scenario.querySelectorAll('.english');
    for (var i = 0; i < englishEls.length; i++) {
        englishEls[i].style.display = showEnglish ? '' : 'none';
    }
    
    var koreanEls = scenario.querySelectorAll('.korean');
    for (var i = 0; i < koreanEls.length; i++) {
        koreanEls[i].style.display = showKorean ? '' : 'none';
    }
    
    var speakerEls = scenario.querySelectorAll('.speaker');
    for (var i = 0; i < speakerEls.length; i++) {
        speakerEls[i].style.display = showSpeaker ? '' : 'none';
    }
}

// Play audio with repeat support
function playAudioWithRepeat(audio) {
    // Stop all other audios
    var allAudios = document.querySelectorAll('audio');
    for (var i = 0; i < allAudios.length; i++) {
        if (allAudios[i] !== audio) {
            allAudios[i].pause();
            allAudios[i].currentTime = 0;
            allAudios[i].onended = null;
        }
    }
    
    if (repeatMode) {
        audio.onended = function() {
            audio.currentTime = 0;
            audio.play();
        };
    } else {
        audio.onended = null;
    }
    
    audio.currentTime = 0;
    audio.play();
}

function stopAudio(audio) {
    audio.pause();
    audio.currentTime = 0;
    audio.onended = null;
}

// Google Search
function openGoogleSearch(sentence) {
    var searchTerm = encodeURIComponent(sentence + ' 이 문장을 설명해줘');
    window.open('https://www.google.com/search?q=' + searchTerm, '_blank');
}

// Initialize
function initEnglishTalk() {
    loadStates();
    
    // Apply states to buttons
    var btn = document.getElementById('toggleEnglishBtn');
    if (btn) { btn.textContent = showEnglish ? '영어 ON' : '영어 OFF'; btn.classList.toggle('active', showEnglish); }
    
    btn = document.getElementById('toggleKoreanBtn');
    if (btn) { btn.textContent = showKorean ? '한국어 ON' : '한국어 OFF'; btn.classList.toggle('active', showKorean); }
    
    btn = document.getElementById('toggleSpeakerBtn');
    if (btn) { btn.textContent = showSpeaker ? '화자 ON' : '화자 OFF'; btn.classList.toggle('active', showSpeaker); }
    
    btn = document.getElementById('repeatBtn');
    if (btn) { btn.textContent = repeatMode ? '반복 ON' : '반복 OFF'; btn.classList.toggle('active', repeatMode); }
    
    updateVisibility();
    
    // Add click-to-play
    var dialogues = document.querySelectorAll('.dialogue');
    for (var i = 0; i < dialogues.length; i++) {
        addClickToPlay(dialogues[i]);
    }
    
    // Add Google search buttons
    for (var i = 0; i < dialogues.length; i++) {
        addGoogleButton(dialogues[i]);
    }
}

function addClickToPlay(dialogue) {
    dialogue.style.cursor = 'pointer';
    
    dialogue.addEventListener('click', function(e) {
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('.google-search-btn')) {
            return;
        }
        
        // Stop play all mode when clicking a sentence
        if (typeof stopPlayAllForClick === 'function') {
            stopPlayAllForClick();
        }
        
        var audio = this.querySelector('audio');
        if (audio) {
            if (audio.paused) {
                playAudioWithRepeat(audio);
            } else {
                stopAudio(audio);
            }
        }
    });
    
    dialogue.addEventListener('mouseenter', function() {
        if (!this.classList.contains('playing')) {
            this.style.backgroundColor = '#e8f4fd';
        }
    });
    
    dialogue.addEventListener('mouseleave', function() {
        if (!this.classList.contains('playing')) {
            this.style.backgroundColor = '';
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

// Run on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEnglishTalk);
} else {
    initEnglishTalk();
}
