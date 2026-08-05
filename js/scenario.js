// Scenario page renderer - renders a dialogue scenario from JSON data

function etBuildScenarioPage() {
    var catKey = etGetParam('cat');
    var name = etGetParam('name');

    etLoadCategory(catKey).then(function(cat) {
        if (!cat) {
            document.getElementById('scenarioContainer').innerHTML = '<p>카테고리를 찾을 수 없습니다.</p>';
            return;
        }
        var scenario = etFindScenario(cat, name);
        if (!scenario) {
            document.getElementById('scenarioContainer').innerHTML = '<p>대화문을 찾을 수 없습니다.</p>';
            return;
        }

        // Back nav: 메인 > 카테고리 (e.g. 쇼핑)
        var backNav = document.getElementById('backNav');
        backNav.innerHTML =
            '<a href="index.html" class="back-link">🏠 메인</a>' +
            '<span class="nav-sep">></span>' +
            '<a href="category.html?cat=' + cat.key + '" class="back-link">' + etEsc(cat.title) + '</a>';
        // Title
        document.getElementById('pageTitle').textContent = scenario.icon + ' ' + scenario.title;
        document.getElementById('pageSubtitle').textContent = scenario.subtitle;

        // Done button state
        etUpdateDoneBtn(scenario.key);

        // Build dialogues
        var html = '';
        for (var i = 0; i < scenario.dialogues.length; i++) {
            var d = scenario.dialogues[i];
            var marked = etIsMarked(scenario.key, i);
            html +=
                '<div class="dialogue">' +
                '<button class="mark-btn' + (marked ? ' marked' : '') + '"' +
                ' data-i="' + i + '" title="북마크"' +
                ' aria-pressed="' + (marked ? 'true' : 'false') + '">' +
                (marked ? '★' : '☆') + '</button>' +
                '<div class="speaker">' + etEsc(d.speaker) + '</div>' +
                '<div class="english">' + etEsc(d.en) + '</div>' +
                '<div class="korean">' + etEsc(d.ko) + '</div>' +
                '<div class="audio-controls">' +
                '<audio controls src="' + etEsc(d.audio) + '"></audio>' +
                '</div>' +
                '</div>';
        }
        var container = document.getElementById('scenarioContainer');
        container.innerHTML = html;

        // One delegated listener rather than one per sentence. stopPropagation
        // keeps the tap off the .dialogue play handler in toggle.js.
        container.addEventListener('click', function(e) {
            var btn = e.target.closest('.mark-btn');
            if (!btn) return;
            e.stopPropagation();
            var i = parseInt(btn.getAttribute('data-i'), 10);
            var on = etToggleMark(scenario.key, i, scenario.dialogues[i], cat.key);
            btn.classList.toggle('marked', on);
            btn.textContent = on ? '★' : '☆';
            btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        });

        // Page nav (prev/next within category)
        var idx = -1;
        for (var j = 0; j < cat.scenarios.length; j++) {
            if (cat.scenarios[j].key === scenario.key) { idx = j; break; }
        }
        var navHtml = '';
        if (idx > 0) {
            var prev = cat.scenarios[idx - 1];
            navHtml += '<a href="scenario.html?cat=' + cat.key + '&name=' + prev.key + '">← ' + etEsc(prev.title) + '</a>';
        } else {
            navHtml += '<span></span>';
        }
        if (idx >= 0 && idx < cat.scenarios.length - 1) {
            var next = cat.scenarios[idx + 1];
            navHtml += '<a href="scenario.html?cat=' + cat.key + '&name=' + next.key + '">' + etEsc(next.title) + ' →</a>';
        } else {
            navHtml += '<span></span>';
        }
        document.getElementById('pageNav').innerHTML = navHtml;

        // Re-run init for new dynamic content
        if (typeof initEnglishTalk === 'function') initEnglishTalk();
    });
}

function etToggleScenarioDone(key) {
    etToggleDone(key);
    etUpdateDoneBtn(key);
}

// Update the done button in the control bar
var etCurrentScenarioKey = null;

function etUpdateDoneBtn(key) {
    etCurrentScenarioKey = key;
    var btn = document.getElementById('doneBtn');
    if (!btn) return;
    var isDone = etIsDone(key);
    btn.textContent = isDone ? '✔️ 완료됨' : '☐ 완료';
    btn.classList.toggle('checked', isDone);
}

function etToggleDoneBtn() {
    if (!etCurrentScenarioKey) return;
    etToggleDone(etCurrentScenarioKey);
    etUpdateDoneBtn(etCurrentScenarioKey);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', etBuildScenarioPage);
} else {
    etBuildScenarioPage();
}