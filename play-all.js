// Play All functionality for English Talk
let isPlaying = false;
let currentAudioIndex = 0;
let audioElements = [];

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
        stopAll();
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
