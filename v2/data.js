/* v2 data layer.
 *
 * Reads the repository's existing data/ and audio/ - nothing is converted or
 * copied. These pages sit one level down, so every path from the JSON (which
 * is written relative to the repository root) gets BASE put in front of it.
 *
 * Progress, bookmarks and display toggles use the SAME localStorage keys as
 * the app at the root, so the two UIs are interchangeable: study in one, the
 * other already knows what you finished.
 */

var V2_BASE = '../';

var V2_INDEX = null;
var V2_INDEX_PROMISE = null;
var V2_CATEGORIES = {};
var V2_CATEGORY_PROMISES = {};

function v2Url(pathFromRoot) {
  return V2_BASE + pathFromRoot;
}

// Absolute, so it matches what the root app stores in the audio cache
function v2AudioUrl(pathFromRoot) {
  return new URL(V2_BASE + pathFromRoot, location.href).href;
}

function v2Esc(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function v2Param(name) {
  return new URLSearchParams(location.search).get(name);
}

function v2FetchJson(path, fallback) {
  return fetch(path).then(function (r) {
    if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
    return r.json();
  }).catch(function (e) {
    console.error('[v2] failed to load ' + path, e);
    return fallback;
  });
}

function v2LoadIndex() {
  if (V2_INDEX) return Promise.resolve(V2_INDEX);
  if (V2_INDEX_PROMISE) return V2_INDEX_PROMISE;
  V2_INDEX_PROMISE = v2FetchJson(v2Url('data/index.json'), { categories: [] })
    .then(function (d) { V2_INDEX = d; return d; });
  return V2_INDEX_PROMISE;
}

// One category with its scenarios attached; null for an unknown key
function v2LoadCategory(key) {
  if (V2_CATEGORIES[key]) return Promise.resolve(V2_CATEGORIES[key]);
  if (V2_CATEGORY_PROMISES[key]) return V2_CATEGORY_PROMISES[key];

  V2_CATEGORY_PROMISES[key] = v2LoadIndex().then(function (idx) {
    var meta = null;
    for (var i = 0; i < idx.categories.length; i++) {
      if (idx.categories[i].key === key) { meta = idx.categories[i]; break; }
    }
    if (!meta) return null;

    return v2FetchJson(v2Url('data/' + key + '.json'), null).then(function (part) {
      if (!part) return null;
      var cat = { scenarios: part.scenarios || [] };
      for (var k in meta) { if (meta.hasOwnProperty(k)) cat[k] = meta[k]; }
      V2_CATEGORIES[key] = cat;
      return cat;
    });
  }).then(function (cat) {
    // A failed load must not be cached as a permanent "not found"
    if (!cat) delete V2_CATEGORY_PROMISES[key];
    return cat;
  });
  return V2_CATEGORY_PROMISES[key];
}

function v2LoadAll() {
  return v2LoadIndex().then(function (idx) {
    return Promise.all(idx.categories.map(function (c) { return v2LoadCategory(c.key); }));
  }).then(function (cats) {
    return cats.filter(function (c) { return !!c; });
  });
}

function v2FindScenario(cat, key) {
  if (!cat) return null;
  for (var i = 0; i < cat.scenarios.length; i++) {
    if (cat.scenarios[i].key === key) return cat.scenarios[i];
  }
  return null;
}

/* ---- who is speaking ----
 * The turn cards are tinted by side, the way travel-english marks "you" against
 * the person behind the counter. That app tags each turn with a role; this data
 * only names the speaker, so the learner's side is listed here and everyone
 * else - staff, officers, drivers, strangers - is the other side.
 */
var V2_YOU = {
  'You': 1, 'Guest': 1, 'Customer': 1, 'Tourist': 1, 'Traveler': 1,
  'Passenger': 1, 'Patient': 1, 'Backpacker': 1, 'Visitor': 1
};

function v2Side(speaker) {
  return V2_YOU[speaker] ? 'you' : 'them';
}

/* ---- study progress (shared with the root app) ---- */

var V2_DONE_KEY = 'englishTalk_done';

function v2GetDone() {
  try {
    var saved = localStorage.getItem(V2_DONE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (e) { return {}; }
}

function v2IsDone(key) { return !!v2GetDone()[key]; }

function v2ToggleDone(key) {
  var done = v2GetDone();
  if (done[key]) { delete done[key]; } else { done[key] = true; }
  try { localStorage.setItem(V2_DONE_KEY, JSON.stringify(done)); } catch (e) {}
  return !!done[key];
}

function v2CategoryProgress(cat) {
  if (!cat) return { done: 0, total: 0, percent: 0 };
  var done = v2GetDone(), count = 0;
  for (var i = 0; i < cat.scenarios.length; i++) {
    if (done[cat.scenarios[i].key]) count++;
  }
  var total = cat.scenarios.length;
  return { done: count, total: total, percent: total ? Math.round(count / total * 100) : 0 };
}

function v2TotalProgress(cats) {
  var done = v2GetDone(), total = 0, count = 0;
  for (var c = 0; c < cats.length; c++) {
    for (var i = 0; i < cats[c].scenarios.length; i++) {
      total++;
      if (done[cats[c].scenarios[i].key]) count++;
    }
  }
  return { done: count, total: total, percent: total ? Math.round(count / total * 100) : 0 };
}

/* ---- bookmarks (shared with the root app) ----
 * Entries carry the English sentence as well as the position, and are repaired
 * by text when the position no longer holds that sentence - scenarios here have
 * been split and renumbered more than once.
 */

var V2_MARK_KEY = 'englishTalk_marks';

function v2GetMarks() {
  try {
    var saved = localStorage.getItem(V2_MARK_KEY);
    var arr = saved ? JSON.parse(saved) : [];
    return Object.prototype.toString.call(arr) === '[object Array]' ? arr : [];
  } catch (e) { return []; }
}

function v2SaveMarks(arr) {
  try { localStorage.setItem(V2_MARK_KEY, JSON.stringify(arr)); } catch (e) {}
}

function v2MarkIndex(scenarioKey, i) {
  var marks = v2GetMarks();
  for (var n = 0; n < marks.length; n++) {
    if (marks[n].scenario === scenarioKey && marks[n].index === i) return n;
  }
  return -1;
}

function v2IsMarked(scenarioKey, i) { return v2MarkIndex(scenarioKey, i) !== -1; }
function v2MarkCount() { return v2GetMarks().length; }

function v2ToggleMark(scenarioKey, i, dialogue, catKey) {
  var marks = v2GetMarks();
  var at = v2MarkIndex(scenarioKey, i);
  if (at !== -1) {
    marks.splice(at, 1);
    v2SaveMarks(marks);
    return false;
  }
  marks.push({
    cat: catKey, scenario: scenarioKey, index: i,
    en: dialogue.en, ko: dialogue.ko, speaker: dialogue.speaker,
    audio: dialogue.audio, at: Date.now()
  });
  v2SaveMarks(marks);
  return true;
}

function v2ResolveMarks(cats) {
  var marks = v2GetMarks();
  if (!marks.length) return [];

  var byKey = {}, byText = {};
  for (var c = 0; c < cats.length; c++) {
    var scen = cats[c].scenarios;
    for (var s = 0; s < scen.length; s++) {
      byKey[scen[s].key] = { cat: cats[c], scenario: scen[s] };
      for (var d = 0; d < scen[s].dialogues.length; d++) {
        var en = scen[s].dialogues[d].en;
        if (!byText[en]) byText[en] = { cat: cats[c], scenario: scen[s], index: d };
      }
    }
  }

  var out = [], kept = [], changed = false;
  for (var m = 0; m < marks.length; m++) {
    var mark = marks[m];
    var hit = byKey[mark.scenario];
    var dl = hit && hit.scenario.dialogues[mark.index];

    if (!dl || dl.en !== mark.en) {
      var found = byText[mark.en];
      if (!found) { changed = true; continue; }
      dl = found.scenario.dialogues[found.index];
      mark = {
        cat: found.cat.key, scenario: found.scenario.key, index: found.index,
        en: mark.en, ko: dl.ko, speaker: dl.speaker, audio: dl.audio, at: mark.at
      };
      hit = { cat: found.cat, scenario: found.scenario };
      changed = true;
    }

    kept.push(mark);
    out.push({
      mark: mark, dialogue: dl, index: mark.index,
      catKey: hit.cat.key, catTitle: hit.cat.title,
      scenarioKey: hit.scenario.key, scenarioTitle: hit.scenario.title
    });
  }
  if (changed) v2SaveMarks(kept);
  return out;
}
