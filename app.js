/* Player.
 *
 * The shape of this is travel-english's app.js - one player driving .turn
 * cards, a play-all that walks them, a browser-TTS fallback when an mp3 is
 * missing. Added here:
 *
 *   - saved audio is played straight out of the Cache API as a blob, so a
 *     downloaded category plays offline whether or not the service worker is
 *     in control, and without the Range/206 response it has to build
 *   - the display toggles persist in englishTalk_states
 *   - keyboard control (arrows move, space stops)
 */
(function (global) {
  var AUDIO_CACHE = 'english-talk-audio-v2';   // same store the root app fills
  var GAP_MS = 200;                            // the breath play-all leaves

  var player = null;        // one <audio>, reused for every sentence
  var objectUrl = null;     // blob URL currently held, if any
  var currentTurn = null;
  var playAllMode = false;
  var playAllIndex = 0;
  var advanceTimer = null;

  var showEn = true, showKo = true, repeatOn = false;
  // v2 has no speaker toggle - the speaker line carries the buttons, so hiding
  // it would hide them. The root app still offers it, and the key is shared, so
  // the value is carried through untouched rather than overwritten.
  var speakerPref = true;

  /* ---- display state, shared with the root app ---- */

  function loadStates() {
    try {
      var s = JSON.parse(localStorage.getItem('englishTalk_states') || '{}');
      showEn = s.showEnglish !== false;
      showKo = s.showKorean !== false;
      speakerPref = s.showSpeaker !== false;
      repeatOn = s.repeatMode === true;
    } catch (e) {}
  }
  function saveStates() {
    try {
      localStorage.setItem('englishTalk_states', JSON.stringify({
        showEnglish: showEn, showKorean: showKo,
        showSpeaker: speakerPref, repeatMode: repeatOn
      }));
    } catch (e) {}
  }
  function paint() {
    document.body.classList.toggle('hide-en', !showEn);
    document.body.classList.toggle('hide-ko', !showKo);
    setOff('toggleEn', !showEn);
    setOff('toggleKo', !showKo);
    setOff('toggleRepeat', !repeatOn);
  }
  function setOff(id, off) {
    var el = document.getElementById(id);
    if (el) el.classList.toggle('off', off);
  }
  function applyStates() { loadStates(); paint(); }

  function toggleLang(which) {
    if (which === 'en') showEn = !showEn;
    else showKo = !showKo;
    paint();
    saveStates();
  }
  function toggleRepeat() {
    repeatOn = !repeatOn;
    paint();
    saveStates();
  }

  /* ---- element helpers ---- */

  function turns() {
    return Array.prototype.slice.call(document.querySelectorAll('.turn'));
  }
  function playAllBtn() { return document.getElementById('playAllBtn'); }

  function resetTurnButtons() {
    turns().forEach(function (t) {
      t.classList.remove('playing');
      var b = t.querySelector('.play-btn');
      if (b) { b.classList.remove('playing'); b.textContent = '▶'; }
    });
  }
  function resetAllButtons() {
    resetTurnButtons();
    var a = playAllBtn();
    if (a) { a.classList.remove('playing'); a.textContent = '▶ 전체 재생'; }
  }
  function markPlaying(el) {
    resetTurnButtons();
    var a = playAllBtn();
    if (playAllMode && a) { a.classList.add('playing'); a.textContent = '■ 정지'; }
    if (!el) return;
    el.classList.add('playing');
    var btn = el.querySelector('.play-btn');
    if (btn) { btn.classList.add('playing'); btn.textContent = '■'; }
  }

  /* ---- audio ---- */

  function clearAdvance() {
    if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; }
  }
  function releaseObjectUrl() {
    if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
  }
  function ensurePlayer() {
    if (!player) {
      player = new Audio();
      player.preload = 'auto';
    }
    return player;
  }
  function killAudio() {
    clearAdvance();
    try { speechSynthesis.cancel(); } catch (e) {}
    if (player) {
      player.onended = null;
      player.onerror = null;
      try { player.pause(); } catch (e) {}
    }
    releaseObjectUrl();
  }
  function stopCurrent() {
    killAudio();
    resetAllButtons();
    currentTurn = null;
    playAllMode = false;
  }

  // Saved audio comes from the cache, everything else straight off the network
  function resolveSrc(url) {
    if (!url) return Promise.resolve('');
    if (typeof caches === 'undefined') return Promise.resolve(url);
    return caches.open(AUDIO_CACHE)
      .then(function (c) { return c.match(url); })
      .then(function (hit) {
        if (!hit) return url;
        return hit.blob().then(function (b) {
          objectUrl = URL.createObjectURL(b);
          return objectUrl;
        });
      })
      .catch(function () { return url; });
  }

  function speakFallback(el, done) {
    try {
      var en = el && el.querySelector('.en');
      if (!en) { done(); return; }
      var u = new SpeechSynthesisUtterance(en.textContent.trim());
      u.lang = 'en-US';
      u.rate = 0.95;
      u.onend = done;
      u.onerror = done;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch (e) { done(); }
  }

  function playSrc(el, onDone) {
    var finished = false;
    function done() {
      if (finished) return;
      finished = true;
      clearAdvance();
      if (onDone) onDone();
    }

    killAudio();
    currentTurn = el;
    markPlaying(el);

    var raw = el.getAttribute('data-src');
    if (!raw) { speakFallback(el, done); return; }

    var a = ensurePlayer();
    resolveSrc(raw).then(function (src) {
      if (currentTurn !== el) return;        // moved on while the cache answered
      a.onended = done;
      a.onerror = function () { speakFallback(el, done); };
      a.src = src;
      var p = a.play();
      if (p && p.catch) p.catch(function () { speakFallback(el, done); });
    });
  }

  function playTurn(el) {
    if (currentTurn === el && player && !player.paused && !playAllMode) {
      stopCurrent();
      return;
    }
    playAllMode = false;
    function afterOne() {
      if (repeatOn && currentTurn === el && !playAllMode) {
        advanceTimer = setTimeout(function () {
          if (repeatOn && currentTurn === el && !playAllMode) playSrc(el, afterOne);
        }, GAP_MS);
        return;
      }
      currentTurn = null;
      resetAllButtons();
    }
    playSrc(el, afterOne);
  }

  function playNextInAll() {
    if (!playAllMode) return;
    var list = turns();
    if (!list.length) { stopCurrent(); return; }     // nothing to walk
    if (playAllIndex >= list.length) {
      if (repeatOn) { playAllIndex = 0; playNextInAll(); return; }
      stopCurrent();
      return;
    }
    var el = list[playAllIndex];
    try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
    playSrc(el, function () {
      if (!playAllMode) return;
      playAllIndex += 1;
      advanceTimer = setTimeout(function () {
        if (playAllMode) playNextInAll();
      }, GAP_MS);
    });
  }

  function playAll() {
    if (playAllMode) { stopCurrent(); return; }
    playAllMode = true;
    playAllIndex = 0;
    var a = playAllBtn();
    if (a) { a.classList.add('playing'); a.textContent = '■ 정지'; }
    playNextInAll();
  }

  /* ---- keyboard ----
   * Space on a focused button has to keep pressing the button, but the arrows
   * do not - the root app blocks both, so the arrows go dead as soon as you
   * click anything. Only text fields swallow the arrows here.
   */
  function typing(e) {
    var t = e.target;
    if (!t || t === document || t === document.body) return false;
    if (t.isContentEditable) return true;
    return /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || '');
  }
  function pressable(e) {
    var t = e.target;
    return t && /^(BUTTON|A|AUDIO)$/.test(t.tagName || '');
  }

  function move(delta) {
    var list = turns();
    if (!list.length) return;
    if (playAllMode) {                       // the run owns the order
      var next = playAllIndex + delta;
      if (next < 0 || next >= list.length) return;
      playAllIndex = next;
      killAudio();
      playNextInAll();
      return;
    }
    var i = currentTurn ? list.indexOf(currentTurn) : -1;
    var target = i === -1 ? 0 : i + delta;
    if (target < 0 || target >= list.length) return;
    var el = list[target];
    try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
    playTurn(el);
  }

  function spaceKey() {
    if (playAllMode) { stopCurrent(); return; }
    if (player && !player.paused) { stopCurrent(); return; }
    var el = currentTurn || turns()[0];
    if (el) playTurn(el);
  }

  function initKeyboard() {
    document.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e)) return;
      switch (e.key) {
        case 'ArrowLeft': case 'ArrowUp': move(-1); break;
        case 'ArrowRight': case 'ArrowDown': move(1); break;
        case ' ': case 'Spacebar':
          if (pressable(e)) return;          // let the focused button take it
          spaceKey();
          break;
        default: return;
      }
      e.preventDefault();
    });
  }

  global.V2Player = {
    playTurn: playTurn,
    playAll: playAll,
    toggleLang: toggleLang,
    toggleRepeat: toggleRepeat,
    stopCurrent: stopCurrent,
    applyStates: applyStates,
    initKeyboard: initKeyboard
  };
})(window);
