// Play All functionality for English Talk
let isPlaying = false;
let currentAudioIndex = 0;
let audioElements = [];
let repeatMode = false;

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
    isPlaying = true;
    currentAudioIndex = 0;
    
    document.getElementById('playAllIcon').textContent = '⏸️';
    document.getElementById('playAllText').textContent = '일시정지';
    document.getElementById('playAllProgress').style.display = 'inline-block';
    
    playNext();
}

function playNext() {
    if (!isPlaying || currentAudioIndex >= audioElements.length) {
        if (repeatMode && isPlaying) {
            currentAudioIndex = 0;
            playNext();
        } else {
            stopAll();
        }
        return;
    }
    
    updateProgress();
    highlightDialogue(currentAudioIndex);
    
    const audio = audioElements[currentAudioIndex];
    
    audio.onended = function() {
        unhighlightDialogue(currentAudioIndex);
        currentAudioIndex++;
        playNext();
    };
    
    audio.currentTime = 0;
    audio.play();
}

function stopAll() {
    isPlaying = false;
    
    if (currentAudioIndex < audioElements.length) {
        audioElements[currentAudioIndex].pause();
        audioElements[currentAudioIndex].currentTime = 0;
    }
    
    document.querySelectorAll('.dialogue').forEach(d => {
        d.classList.remove('playing');
        d.style.backgroundColor = '';
    });
    
    document.getElementById('playAllIcon').textContent = '▶️';
    document.getElementById('playAllText').textContent = '전체 재생';
    document.getElementById('playAllProgress').style.display = 'none';
}

function updateProgress() {
    const total = audioElements.length;
    const current = currentAudioIndex + 1;
    document.getElementById('progressText').textContent = `${current} / ${total}`;
}

function highlightDialogue(index) {
    const dialogue = audioElements[index].closest('.dialogue');
    if (dialogue) {
        dialogue.classList.add('playing');
        dialogue.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function unhighlightDialogue(index) {
    const dialogue = audioElements[index].closest('.dialogue');
    if (dialogue) {
        dialogue.classList.remove('playing');
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
        // Repeat mode: loop this audio
        audio.onended = function() {
            audio.currentTime = 0;
            audio.play();
        };
    } else {
        // Normal mode: play once
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
