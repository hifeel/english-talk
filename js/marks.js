// Bookmark review page - the sentences marked across every category, in one
// list, newest first. Reuses the .dialogue markup so toggle.js and play-all.js
// work here unchanged; the only difference is each line says where it came from.

function etBuildMarksPage() {
    etLoadAllCategories().then(function(cats) {
        var items = etResolveMarks(cats);
        var container = document.getElementById('marksContainer');
        var subtitle = document.getElementById('markSubtitle');

        if (!items.length) {
            subtitle.textContent = '아직 북마크한 문장이 없습니다';
            container.innerHTML =
                '<p class="marks-empty">대화문에서 문장 옆의 ☆ 를 누르면 여기에 모입니다.</p>';
            return;
        }

        items.sort(function(a, b) { return (b.mark.at || 0) - (a.mark.at || 0); });
        subtitle.textContent = items.length + '개 문장';

        var html = '';
        for (var i = 0; i < items.length; i++) {
            var it = items[i];
            var d = it.dialogue;
            var href = 'scenario.html?cat=' + encodeURIComponent(it.catKey) +
                       '&name=' + encodeURIComponent(it.scenarioKey);
            html +=
                '<div class="dialogue">' +
                '<button class="mark-btn marked" data-n="' + i + '" title="북마크 해제"' +
                ' aria-pressed="true">★</button>' +
                '<div class="mark-source">' +
                '<a href="' + href + '">' + etEsc(it.catTitle) + ' › ' +
                etEsc(it.scenarioTitle) + '</a>' +
                '</div>' +
                '<div class="speaker">' + etEsc(d.speaker) + '</div>' +
                '<div class="english">' + etEsc(d.en) + '</div>' +
                '<div class="korean">' + etEsc(d.ko) + '</div>' +
                '<div class="audio-controls">' +
                '<audio controls src="' + etEsc(d.audio) + '"></audio>' +
                '</div>' +
                '</div>';
        }
        container.innerHTML = html;

        container.addEventListener('click', function(e) {
            var btn = e.target.closest('.mark-btn');
            if (!btn) return;
            e.stopPropagation();
            var it = items[parseInt(btn.getAttribute('data-n'), 10)];
            etToggleMark(it.scenarioKey, it.index, it.dialogue, it.catKey);
            // Drop the row rather than leaving a hollow ☆ behind on a page
            // whose whole point is that everything on it is bookmarked.
            var row = btn.closest('.dialogue');
            if (row) row.parentNode.removeChild(row);
            var left = container.querySelectorAll('.dialogue').length;
            subtitle.textContent = left ? left + '개 문장' : '아직 북마크한 문장이 없습니다';
            if (typeof initAudioList === 'function') initAudioList();
        });

        if (typeof initEnglishTalk === 'function') initEnglishTalk();
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', etBuildMarksPage);
} else {
    etBuildMarksPage();
}

window.addEventListener('pageshow', function(e) {
    if (e.persisted) etBuildMarksPage();
});
