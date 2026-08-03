// Play All functionality for English Talk
let isPlaying = false;
let currentAudioIndex = 0;
let audioElements = [];
let repeatSentence = false;
let repeatFull = false;

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
        if (repeatFull && isPlaying) {
            // Repeat full dialogue
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
        
        if (repeatSentence && isPlaying) {
            // Repeat same sentence
            audio.currentTime = 0;
            audio.play();
        } else {
            currentAudioIndex++;
            playNext();
        }
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

// Repeat toggle functions
function toggleRepeatSentence() {
    repeatSentence = !repeatSentence;
    const btn = document.getElementById('repeatSentenceBtn');
    if (btn) {
        btn.classList.toggle('active', repeatSentence);
        btn.textContent = repeatSentence ? '문장 반복 ON' : '문장 반복';
    }
    // If sentence repeat is on, turn off full repeat
    if (repeatSentence) {
        repeatFull = false;
        const fullBtn = document.getElementById('repeatFullBtn');
        if (fullBtn) {
            fullBtn.classList.remove('active');
            fullBtn.textContent = '전체 반복';
        }
    }
}

function toggleRepeatFull() {
    repeatFull = !repeatFull;
    const btn = document.getElementById('repeatFullBtn');
    if (btn) {
        btn.classList.toggle('active', repeatFull);
        btn.textContent = repeatFull ? '전체 반복 ON' : '전체 반복';
    }
    // If full repeat is on, turn off sentence repeat
    if (repeatFull) {
        repeatSentence = false;
        const sentBtn = document.getElementById('repeatSentenceBtn');
        if (sentBtn) {
            sentBtn.classList.remove('active');
            sentBtn.textContent = '문장 반복';
        }
    }
}
