// English Talk - data loader & shared helpers
// Loads dialogue data from data/dialogues.json

var ET_DATA = null;
var ET_DATA_PROMISE = null;

function etLoadData() {
    if (ET_DATA) return Promise.resolve(ET_DATA);
    if (ET_DATA_PROMISE) return ET_DATA_PROMISE;
    ET_DATA_PROMISE = fetch('data/dialogues.json')
        .then(function(r) { return r.json(); })
        .then(function(d) { ET_DATA = d; return d; })
        .catch(function(e) { console.error('Failed to load dialogues.json', e); return {categories: []}; });
    return ET_DATA_PROMISE;
}

function etGetCategories() {
    return ET_DATA ? ET_DATA.categories : [];
}

function etFindCategory(key) {
    var cats = etGetCategories();
    for (var i = 0; i < cats.length; i++) {
        if (cats[i].key === key) return cats[i];
    }
    return null;
}

function etFindScenario(categoryKey, scenarioKey) {
    var cat = etFindCategory(categoryKey);
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

// Progress for a category: {done: n, total: n, percent: int}
function etCategoryProgress(catKey) {
    var cat = etFindCategory(catKey);
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

// Total progress across all categories
function etTotalProgress() {
    var cats = etGetCategories();
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