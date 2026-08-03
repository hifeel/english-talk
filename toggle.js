// Toggle visibility for English/Korean text - with localStorage persistence
let showEnglish = true;
let showKorean = true;
let showSpeaker = true;
let repeatMode = false;

// Load saved states from localStorage
function loadStates() {
    const saved = localStorage.getItem('englishTalk_states');
    if (saved) {
        const states = JSON.parse(saved);
        showEnglish = states.showEnglish !== undefined ? states.showEnglish : true;
        showKorean = states.showKorean !== undefined ? states.showKorean : true;
        showSpeaker = states.showSpeaker !== undefined ? states.showSpeaker : true;
        repeatMode = states.repeatMode !== undefined ? states.repeatMode : false;
    }
}

// Save states to localStorage
function saveStates() {
    localStorage.setItem('englishTalk_states', JSON.stringify({
        showEnglish,
        showKorean,
        showSpeaker,
        repeatMode
    }));
}

function toggleEnglish() {
    showEnglish = !showEnglish;
    updateVisibility();
    updateButtonState('toggleEnglishBtn', showEnglish, '영어 ON', '영어 OFF');
    saveStates();
}

function toggleKorean() {
    showKorean = !showKorean;
    updateVisibility();
    updateButtonState('toggleKoreanBtn', showKorean, '한국어 ON', '한국어 OFF');
    saveStates();
}

function toggleSpeaker() {
    showSpeaker = !showSpeaker;
    updateVisibility();
    updateButtonState('toggleSpeakerBtn', showSpeaker, '화자 ON', '화자 OFF');
    saveStates();
}

function updateVisibility() {
    const scenario = document.querySelector('.scenario');
    if (!scenario) return;
    
    scenario.querySelectorAll('.english').forEach(el => {
        el.style.display = showEnglish ? '' : 'none';
    });
    
    scenario.querySelectorAll('.korean').forEach(el => {
        el.style.display = showKorean ? '' : 'none';
    });
    
    scenario.querySelectorAll('.speaker').forEach(el => {
        el.style.display = showSpeaker ? '' : 'none';
    });
}

function updateButtonState(btnId, isActive, activeText, inactiveText) {
    const btn = document.getElementById(btnId);
    if (btn) {
        btn.textContent = isActive ? activeText : inactiveText;
        btn.classList.toggle('active', isActive);
    }
}

// Single repeat toggle - shows ON/OFF
function toggleRepeat() {
    repeatMode = !repeatMode;
    const btn = document.getElementById('repeatBtn');
    if (btn) {
        btn.classList.toggle('active', repeatMode);
        btn.textContent = repeatMode ? '반복 ON' : '반복 OFF';
    }
    saveStates();
}

// Play single audio with repeat support
function playAudioWithRepeat(audio) {
    // Stop all other audios first
    document.querySelectorAll('audio').forEach(a => {
        if (a !== audio) {
            a.pause();
            a.currentTime = 0;
            a.onended = null;
        }
    });
    
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

// Stop single audio
function stopAudio(audio) {
    audio.pause();
    audio.currentTime = 0;
    audio.onended = null;
}

// Click-to-play functionality with repeat support
function initClickToPlay() {
    document.querySelectorAll('.dialogue').forEach(dialogue => {
        dialogue.style.cursor = 'pointer';
        
        dialogue.addEventListener('click', function(e) {
            if (e.target.closest('.audio-controls') || 
                e.target.closest('button') || 
                e.target.closest('input') ||
                e.target.closest('.google-search-btn')) {
                return;
            }
            
            const audio = this.querySelector('audio');
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
    });
}

// Google Search - open in new tab
function openGoogleSearch(sentence) {
    const searchTerm = encodeURIComponent(sentence + ' 이 문장을 설명해줘');
    const searchUrl = `https://www.google.com/search?q=${searchTerm}`;
    window.open(searchUrl, '_blank');
}

// Add Google search buttons to dialogues
function initGoogleSearchButtons() {
    document.querySelectorAll('.dialogue').forEach(dialogue => {
        const englishEl = dialogue.querySelector('.english');
        if (!englishEl) return;
        
        const sentence = englishEl.textContent.trim();
        
        const searchBtn = document.createElement('button');
        searchBtn.className = 'google-search-btn';
        searchBtn.innerHTML = `<img src="https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png" alt="Google">`;
        searchBtn.title = '구글 검색';
        searchBtn.onclick = function(e) {
            e.stopPropagation();
            openGoogleSearch(sentence);
        };
        
        dialogue.appendChild(searchBtn);
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Load saved states
    loadStates();
    
    // Apply saved states to buttons
    updateButtonState('toggleEnglishBtn', showEnglish, '영어 ON', '영어 OFF');
    updateButtonState('toggleKoreanBtn', showKorean, '한국어 ON', '한국어 OFF');
    updateButtonState('toggleSpeakerBtn', showSpeaker, '화자 ON', '화자 OFF');
    
    // Apply saved repeat state
    const repeatBtn = document.getElementById('repeatBtn');
    if (repeatBtn) {
        repeatBtn.classList.toggle('active', repeatMode);
        repeatBtn.textContent = repeatMode ? '반복 ON' : '반복 OFF';
    }
    
    // Apply visibility
    updateVisibility();
    
    initClickToPlay();
    initGoogleSearchButtons();
});
