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