// Category list renderer - renders a scenario list page from JSON data

function etBuildCategoryPage() {
    var catKey = etGetParam('cat');

    etLoadData().then(function() {
        var cat = etFindCategory(catKey);
        if (!cat) {
            document.getElementById('scenarioList').innerHTML = '<p>카테고리를 찾을 수 없습니다.</p>';
            return;
        }

        document.getElementById('pageTitle').textContent = cat.title;
        // subtitle from first scenario category description is not stored globally;
        // derive from index subtitle map if present
        var subMap = {
            hotel: '호텔에서 필요한 영어 회화',
            shopping: '쇼핑할 때 필요한 영어 회화',
            airport: '공항에서 필요한 영어 회화',
            restaurant: '레스토랑에서 필요한 영어 회화',
            transport: '교통 이용 시 필요한 영어 회화',
            hospital: '병원에서 필요한 영어 회화',
            travel: '여행할 때 필요한 영어 회화'
        };
        document.getElementById('pageSubtitle').textContent = subMap[catKey] || '';

        // Progress bar
        var prog = etCategoryProgress(catKey);
        var progBar = document.getElementById('progressArea');
        progBar.innerHTML =
            '<div class="progress-text">공부 완료 ' + prog.done + ' / ' + prog.total + ' 시나리오 (' + prog.percent + '%)</div>' +
            '<div class="progress-track"><div class="progress-fill" style="width:' + prog.percent + '%"></div></div>';

        var html = '';
        for (var i = 0; i < cat.scenarios.length; i++) {
            var s = cat.scenarios[i];
            var isDone = etIsDone(s.key);
            var doneMark = isDone ? '<div class="scenario-done-mark">✔️ 완료</div>' : '';
            html +=
                '<a href="scenario.html?cat=' + cat.key + '&name=' + s.key + '" class="scenario-item' + (isDone ? ' done' : '') + '">' +
                '<div class="scenario-icon">' + etEsc(s.icon || '💬') + '</div>' +
                '<div class="scenario-info">' +
                '<div class="scenario-name">' + etEsc(s.title) + '</div>' +
                '<div class="scenario-desc">' + etEsc(s.subtitle) + '</div>' +
                '</div>' +
                '<div class="scenario-side">' +
                doneMark +
                '<div class="scenario-count">' + s.dialogues.length + '문장</div>' +
                '</div>' +
                '</a>';
        }
        document.getElementById('scenarioList').innerHTML = html;
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', etBuildCategoryPage);
} else {
    etBuildCategoryPage();
}

// Re-render when returning from bfcache (back button) so done marks update instantly
window.addEventListener('pageshow', function(e) {
    if (e.persisted) {
        etBuildCategoryPage();
    }
});