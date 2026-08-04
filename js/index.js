// Main index renderer - builds topic cards from JSON data

var ET_TOPIC_META = {
    hotel:    { icon: '🏨', subtitle: '체크인, 체크아웃, 요청, 문제 해결' },
    shopping: { icon: '🛍️', subtitle: '옷 고르기, 가격 확인, 결제' },
    airport:  { icon: '🛫', subtitle: '체크인, 보안검색, 탑승, 면세점' },
    restaurant:{ icon: '🍽️', subtitle: '좌석, 주문, 요청, 계산' },
    transport:{ icon: '🚕', subtitle: '택시, 지하철, 버스, 렌터카' },
    hospital: { icon: '🏥', subtitle: '접수, 증상, 진찰, 처방전' },
    travel:   { icon: '✈️', subtitle: '호텔 예약, 여행 팁, 비상 상황, 관광지' }
};

function etBuildIndex() {
    etLoadData().then(function() {
        var cats = etGetCategories();
        var html = '';
        for (var i = 0; i < cats.length; i++) {
            var c = cats[i];
            var meta = ET_TOPIC_META[c.key] || { icon: '💬', subtitle: '' };
            var totalDialogues = 0;
            for (var j = 0; j < c.scenarios.length; j++) {
                totalDialogues += c.scenarios[j].dialogues.length;
            }
            var prog = etCategoryProgress(c.key);
            var shortTitle = c.title.replace(/^[^\s]+\s/, '');
            html +=
                '<a href="category.html?cat=' + c.key + '" class="topic-card">' +
                '<div class="topic-icon">' + meta.icon + '</div>' +
                '<div class="topic-title">' + etEsc(shortTitle) + '</div>' +
                '<div class="topic-subtitle">' + etEsc(meta.subtitle) + '</div>' +
                '<div class="topic-count">' + totalDialogues + '문장</div>' +
                '<div class="topic-progress">' +
                '<div class="topic-progress-text">' + prog.done + ' / ' + prog.total + ' 완료</div>' +
                '<div class="topic-progress-track"><div class="topic-progress-fill" style="width:' + prog.percent + '%"></div></div>' +
                '</div>' +
                '</a>';
        }

        // Overall progress banner at top
        var overall = etTotalProgress();
        var banner = document.getElementById('overallProgress');
        banner.innerHTML =
            '<div class="overall-text">📚 전체 공부 진행률: ' + overall.done + ' / ' + overall.total + ' 시나리오 (' + overall.percent + '%)</div>' +
            '<div class="progress-track"><div class="progress-fill" style="width:' + overall.percent + '%"></div></div>';

        document.getElementById('topicsGrid').innerHTML = html;
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', etBuildIndex);
} else {
    etBuildIndex();
}

// Re-render when returning from bfcache (back button) so progress updates instantly
window.addEventListener('pageshow', function(e) {
    if (e.persisted) {
        etBuildIndex();
    }
});