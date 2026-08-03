// Toggle visibility for English/Korean text
let showEnglish = true;
let showKorean = true;
let showSpeaker = true;

function toggleEnglish() {
    showEnglish = !showEnglish;
    updateVisibility();
    updateButtonState('toggleEnglishBtn', showEnglish, '영어 ON', '영어 OFF');
}

function toggleKorean() {
    showKorean = !showKorean;
    updateVisibility();
    updateButtonState('toggleKoreanBtn', showKorean, '한국어 ON', '한국어 OFF');
}

function toggleSpeaker() {
    showSpeaker = !showSpeaker;
    updateVisibility();
    updateButtonState('toggleSpeakerBtn', showSpeaker, '화자 ON', '화자 OFF');
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
                    // Stop all other audios first
                    document.querySelectorAll('audio').forEach(a => {
                        if (a !== audio) {
                            a.pause();
                            a.currentTime = 0;
                            a.onended = null;
                        }
                    });
                    
                    // Use repeat-aware play function
                    if (typeof playAudioWithRepeat === 'function') {
                        playAudioWithRepeat(audio);
                    } else {
                        audio.currentTime = 0;
                        audio.play();
                    }
                } else {
                    // Stop this audio
                    if (typeof stopAudio === 'function') {
                        stopAudio(audio);
                    } else {
                        audio.pause();
                        audio.currentTime = 0;
                        audio.onended = null;
                    }
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
    updateButtonState('toggleEnglishBtn', showEnglish, '영어 ON', '영어 OFF');
    updateButtonState('toggleKoreanBtn', showKorean, '한국어 ON', '한국어 OFF');
    updateButtonState('toggleSpeakerBtn', showSpeaker, '화자 ON', '화자 OFF');
    
    // Set initial repeat button state
    const repeatBtn = document.getElementById('repeatBtn');
    if (repeatBtn) {
        repeatBtn.textContent = '반복 OFF';
    }
    
    initClickToPlay();
    initGoogleSearchButtons();
});
