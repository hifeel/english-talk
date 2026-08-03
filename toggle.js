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
    
    // Toggle English
    scenario.querySelectorAll('.english').forEach(el => {
        el.style.display = showEnglish ? '' : 'none';
    });
    
    // Toggle Korean
    scenario.querySelectorAll('.korean').forEach(el => {
        el.style.display = showKorean ? '' : 'none';
    });
    
    // Toggle Speaker
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

// Click-to-play functionality
function initClickToPlay() {
    document.querySelectorAll('.dialogue').forEach(dialogue => {
        dialogue.style.cursor = 'pointer';
        
        dialogue.addEventListener('click', function(e) {
            // Don't trigger if clicking on audio controls or buttons
            if (e.target.closest('.audio-controls') || 
                e.target.closest('button') || 
                e.target.closest('input')) {
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
                        }
                    });
                    audio.currentTime = 0;
                    audio.play();
                } else {
                    audio.pause();
                    audio.currentTime = 0;
                }
            }
        });
        
        // Add hover effect
        dialogue.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#e8f4fd';
        });
        
        dialogue.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '';
        });
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Set initial button states
    updateButtonState('toggleEnglishBtn', showEnglish, '영어 ON', '영어 OFF');
    updateButtonState('toggleKoreanBtn', showKorean, '한국어 ON', '한국어 OFF');
    updateButtonState('toggleSpeakerBtn', showSpeaker, '화자 ON', '화자 OFF');
    
    // Initialize click-to-play
    initClickToPlay();
});
