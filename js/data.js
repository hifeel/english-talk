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