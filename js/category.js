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

        var html = '';
        for (var i = 0; i < cat.scenarios.length; i++) {
            var s = cat.scenarios[i];
            html +=
                '<a href="scenario.html?cat=' + cat.key + '&name=' + s.key + '" class="scenario-item">' +
                '<div class="scenario-icon">' + etEsc(s.icon || '💬') + '</div>' +
                '<div class="scenario-info">' +
                '<div class="scenario-name">' + etEsc(s.title) + '</div>' +
                '<div class="scenario-desc">' + etEsc(s.subtitle) + '</div>' +
                '</div>' +
                '<div class="scenario-count">' + s.dialogues.length + '문장</div>' +
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