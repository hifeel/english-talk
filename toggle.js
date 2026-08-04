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
    
    var els = scenario.querySelectorAll('.english');
    for (var i = 0; i < els.length; i++) els[i].style.display = showEnglish ? '' : 'none';
    
    els = scenario.querySelectorAll('.korean');
    for (var i = 0; i < els.length; i++) els[i].style.display = showKorean ? '' : 'none';
    
    els = scenario.querySelectorAll('.speaker');
    for (var i = 0; i < els.length; i++) els[i].style.display = showSpeaker ? '' : 'none';
}

// Play audio with repeat support
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

// Regenerate audio
function regenerateAudio(dialogue) {
    var englishEl = dialogue.querySelector('.english');
    var audioEl = dialogue.querySelector('audio');
    if (!englishEl || !audioEl) return;
    
    var sentence = englishEl.textContent.trim();
    if (!confirm('이 음성을 다시 생성하시겠습니까?\n"' + sentence + '"')) return;
    
    // Show loading state
    var btn = dialogue.querySelector('.refresh-btn');
    if (btn) btn.textContent = '⏳';
    
    var encodedText = encodeURIComponent(sentence);
    var apiUrl = 'https://englishtalk.duckdns.org/tts?text=' + encodedText + '&voice=en-US-GuyNeural';
    
    fetch(apiUrl)
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.status === 'success' && data.audio_url) {
                var newAudioUrl = 'https://englishtalk.duckdns.org' + data.audio_url;
                
                // Update audio source
                audioEl.src = newAudioUrl;
                audioEl.load();
                
                if (btn) btn.textContent = '🔄';
                alert('음성이 다시 생성되었습니다! ✓');
            } else {
                if (btn) btn.textContent = '🔄';
                alert('음성 생성에 실패했습니다.');
            }
        })
        .catch(function(err) {
            if (btn) btn.textContent = '🔄';
            alert('오류가 발생했습니다: ' + err.message);
        });
}

// Initialize
function initEnglishTalk() {
    loadStates();
    
    var btn = document.getElementById('toggleEnglishBtn');
    if (btn) { btn.textContent = showEnglish ? '영어 ON' : '영어 OFF'; btn.classList.toggle('active', showEnglish); }
    
    btn = document.getElementById('toggleKoreanBtn');
    if (btn) { btn.textContent = showKorean ? '한국어 ON' : '한국어 OFF'; btn.classList.toggle('active', showKorean); }
    
    btn = document.getElementById('toggleSpeakerBtn');
    if (btn) { btn.textContent = showSpeaker ? '화자 ON' : '화자 OFF'; btn.classList.toggle('active', showSpeaker); }
    
    btn = document.getElementById('repeatBtn');
    if (btn) { btn.textContent = repeatMode ? '반복 ON' : '반복 OFF'; btn.classList.toggle('active', repeatMode); }
    
    updateVisibility();
    
    var dialogues = document.querySelectorAll('.dialogue');
    for (var i = 0; i < dialogues.length; i++) {
        addClickToPlay(dialogues[i]);
        addGoogleButton(dialogues[i]);
        addRefreshButton(dialogues[i]);
    }
}

function addClickToPlay(dialogue) {
    dialogue.style.cursor = 'pointer';
    
    dialogue.addEventListener('click', function(e) {
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('.google-search-btn') || e.target.closest('.refresh-btn')) {
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
    
    dialogue.addEventListener('mouseenter', function() {
        if (!this.classList.contains('playing')) this.style.backgroundColor = '#e8f4fd';
    });
    
    dialogue.addEventListener('mouseleave', function() {
        if (!this.classList.contains('playing')) this.style.backgroundColor = '';
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

function addRefreshButton(dialogue) {
    var refreshBtn = document.createElement('button');
    refreshBtn.className = 'refresh-btn';
    refreshBtn.innerHTML = '🔄';
    refreshBtn.title = '음성 다시 생성';
    refreshBtn.onclick = function(e) {
        e.stopPropagation();
        regenerateAudio(dialogue);
    };
    
    dialogue.appendChild(refreshBtn);
}

// Run on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEnglishTalk);
} else {
    initEnglishTalk();
}
