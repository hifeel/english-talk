// Play All functionality for English Talk
var isPlaying = false;
var currentAudioIndex = 0;
var audioElements = [];

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
    var txt = document.getElementById('playAllText');
    if (txt) txt.textContent = '일시정지';
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
    
    var audio = audioElements[currentAudioIndex];
    
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
        audioElements[currentAudioIndex].onended = null;
    }
    
    var dialogues = document.querySelectorAll('.dialogue');
    for (var i = 0; i < dialogues.length; i++) {
        dialogues[i].classList.remove('playing');
        dialogues[i].style.backgroundColor = '';
    }
    
    document.getElementById('playAllIcon').textContent = '▶️';
    var txt = document.getElementById('playAllText');
    if (txt) txt.textContent = '전체 재생';
    document.getElementById('playAllProgress').style.display = 'none';
}

function updateProgress() {
    var total = audioElements.length;
    var current = currentAudioIndex + 1;
    document.getElementById('progressText').textContent = current + ' / ' + total;
}

function highlightDialogue(index) {
    var dialogue = audioElements[index].closest('.dialogue');
    if (dialogue) {
        dialogue.classList.add('playing');
        dialogue.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function unhighlightDialogue(index) {
    var dialogue = audioElements[index].closest('.dialogue');
    if (dialogue) {
        dialogue.classList.remove('playing');
    }
}

// Stop play all when clicking a sentence
function stopPlayAllForClick() {
    if (isPlaying) {
        stopAll();
    }
}
