// English Talk - data loader & shared helpers
//
// Data lives in data/index.json (category metadata) plus one data/<key>.json
// per category (that category's scenarios). A dialogue page loads the index and
// the single category it needs, not every dialogue on the site.
//
// A "loaded category" is the index metadata with its scenarios attached, i.e.
// the shape the renderers expect: {key, icon, title, subtitle, summary, scenarios}.

var ET_INDEX = null;
var ET_INDEX_PROMISE = null;
var ET_CATEGORIES = {};          // key -> loaded category
var ET_CATEGORY_PROMISES = {};   // key -> in-flight load

function etFetchJson(path, fallback) {
    return fetch(path)
        .then(function(r) {
            if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
            return r.json();
        })
        .catch(function(e) {
            console.error('Failed to load ' + path, e);
            return fallback;
        });
}

// Category metadata for every category, without any dialogues
function etLoadIndex() {
    if (ET_INDEX) return Promise.resolve(ET_INDEX);
    if (ET_INDEX_PROMISE) return ET_INDEX_PROMISE;
    ET_INDEX_PROMISE = etFetchJson('data/index.json', {categories: []})
        .then(function(d) { ET_INDEX = d; return d; });
    return ET_INDEX_PROMISE;
}

// One category with its scenarios attached; resolves to null for an unknown key
function etLoadCategory(key) {
    if (ET_CATEGORIES[key]) return Promise.resolve(ET_CATEGORIES[key]);
    if (ET_CATEGORY_PROMISES[key]) return ET_CATEGORY_PROMISES[key];

    ET_CATEGORY_PROMISES[key] = etLoadIndex().then(function(idx) {
        var meta = null;
        for (var i = 0; i < idx.categories.length; i++) {
            if (idx.categories[i].key === key) { meta = idx.categories[i]; break; }
        }
        if (!meta) return null;

        return etFetchJson('data/' + key + '.json', null).then(function(part) {
            if (!part) return null;
            var cat = {scenarios: part.scenarios || []};
            for (var k in meta) { if (meta.hasOwnProperty(k)) cat[k] = meta[k]; }
            ET_CATEGORIES[key] = cat;
            return cat;
        });
    });
    return ET_CATEGORY_PROMISES[key];
}

// Every category fully loaded, in index order. Only the main page needs this.
function etLoadAllCategories() {
    return etLoadIndex().then(function(idx) {
        return Promise.all(idx.categories.map(function(c) {
            return etLoadCategory(c.key);
        }));
    }).then(function(cats) {
        return cats.filter(function(c) { return !!c; });
    });
}

function etFindScenario(cat, scenarioKey) {
    if (!cat) return null;
    for (var i = 0; i < cat.scenarios.length; i++) {
        if (cat.scenarios[i].key === scenarioKey) return cat.scenarios[i];
    }
    return null;
}

// URL helpers
function etGetParam(name) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name);
}

// Escape HTML for safety
function etEsc(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============ Study progress (localStorage) ============

var ET_DONE_KEY = 'englishTalk_done';

function etGetDone() {
    try {
        var saved = localStorage.getItem(ET_DONE_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch(e) { return {}; }
}

function etSaveDone(obj) {
    try { localStorage.setItem(ET_DONE_KEY, JSON.stringify(obj)); } catch(e) {}
}

function etIsDone(key) {
    return !!etGetDone()[key];
}

function etToggleDone(key) {
    var done = etGetDone();
    if (done[key]) { delete done[key]; } else { done[key] = true; }
    etSaveDone(done);
    return !!done[key];  // true if the scenario is now marked done
}

// Progress for one loaded category: {done: n, total: n, percent: int}
function etCategoryProgress(cat) {
    if (!cat) return { done: 0, total: 0, percent: 0 };
    var done = etGetDone();
    var total = cat.scenarios.length;
    var count = 0;
    for (var i = 0; i < cat.scenarios.length; i++) {
        if (done[cat.scenarios[i].key]) count++;
    }
    var percent = total > 0 ? Math.round(count / total * 100) : 0;
    return { done: count, total: total, percent: percent };
}

// Total progress across the given loaded categories
function etTotalProgress(cats) {
    var done = etGetDone();
    var total = 0, count = 0;
    for (var c = 0; c < cats.length; c++) {
        for (var i = 0; i < cats[c].scenarios.length; i++) {
            total++;
            if (done[cats[c].scenarios[i].key]) count++;
        }
    }
    var percent = total > 0 ? Math.round(count / total * 100) : 0;
    return { done: count, total: total, percent: percent };
}
// ============ Bookmarks (localStorage) ============
//
// Sentence-level, so a learner can collect the lines they keep failing on and
// review them away from the scenario they came from.
//
// Each entry stores the English text alongside the scenario key and index.
// Indexes are not stable - scenarios in this repo have been split and their
// audio renumbered more than once - so on load an entry whose slot no longer
// holds the same sentence is re-matched by text and repaired. Without that,
// restructuring a scenario would silently point bookmarks at the wrong line.

var ET_MARK_KEY = 'englishTalk_marks';

function etGetMarks() {
    try {
        var saved = localStorage.getItem(ET_MARK_KEY);
        var arr = saved ? JSON.parse(saved) : [];
        return Object.prototype.toString.call(arr) === '[object Array]' ? arr : [];
    } catch (e) { return []; }
}

function etSaveMarks(arr) {
    try { localStorage.setItem(ET_MARK_KEY, JSON.stringify(arr)); } catch (e) {}
}

function etMarkIndex(scenarioKey, i) {
    var marks = etGetMarks();
    for (var n = 0; n < marks.length; n++) {
        if (marks[n].scenario === scenarioKey && marks[n].index === i) return n;
    }
    return -1;
}

function etIsMarked(scenarioKey, i) {
    return etMarkIndex(scenarioKey, i) !== -1;
}

function etMarkCount() {
    return etGetMarks().length;
}

// Returns true if the sentence is now bookmarked
function etToggleMark(scenarioKey, i, dialogue, catKey) {
    var marks = etGetMarks();
    var at = etMarkIndex(scenarioKey, i);
    if (at !== -1) {
        marks.splice(at, 1);
        etSaveMarks(marks);
        return false;
    }
    marks.push({
        cat: catKey,
        scenario: scenarioKey,
        index: i,
        en: dialogue.en,
        ko: dialogue.ko,
        speaker: dialogue.speaker,
        audio: dialogue.audio,
        at: Date.now()
    });
    etSaveMarks(marks);
    return true;
}

// Resolve saved marks against the loaded categories, repairing moved sentences
// and dropping ones whose text is gone. Returns the live dialogue objects.
function etResolveMarks(cats) {
    var marks = etGetMarks();
    if (!marks.length) return [];

    var byKey = {};      // scenario key -> {cat, scenario}
    var byText = {};     // english text -> {cat, scenario, index}
    for (var c = 0; c < cats.length; c++) {
        var scen = cats[c].scenarios;
        for (var s = 0; s < scen.length; s++) {
            byKey[scen[s].key] = { cat: cats[c], scenario: scen[s] };
            for (var d = 0; d < scen[s].dialogues.length; d++) {
                var en = scen[s].dialogues[d].en;
                if (!byText[en]) {
                    byText[en] = { cat: cats[c], scenario: scen[s], index: d };
                }
            }
        }
    }

    var out = [], kept = [], changed = false;
    for (var m = 0; m < marks.length; m++) {
        var mark = marks[m];
        var hit = byKey[mark.scenario];
        var dl = hit && hit.scenario.dialogues[mark.index];

        if (!dl || dl.en !== mark.en) {          // moved or renumbered
            var found = byText[mark.en];
            if (!found) { changed = true; continue; }   // text gone - drop it
            mark = {
                cat: found.cat.key, scenario: found.scenario.key,
                index: found.index, en: mark.en, ko: found.scenario.dialogues[found.index].ko,
                speaker: found.scenario.dialogues[found.index].speaker,
                audio: found.scenario.dialogues[found.index].audio, at: mark.at
            };
            hit = { cat: found.cat, scenario: found.scenario };
            dl = found.scenario.dialogues[found.index];
            changed = true;
        }

        kept.push(mark);
        out.push({
            mark: mark, dialogue: dl,
            catKey: hit.cat.key, catTitle: hit.cat.title,
            scenarioKey: hit.scenario.key, scenarioTitle: hit.scenario.title,
            index: mark.index
        });
    }
    if (changed) etSaveMarks(kept);
    return out;
}
