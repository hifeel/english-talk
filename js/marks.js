// Bookmark review page - the sentences marked across every category, in one
// list, newest first. Reuses the .dialogue markup so toggle.js and play-all.js
// work here unchanged; the only difference is each line says where it came from.

// The rows are rebuilt on every render - including a bfcache return - but the
// container element is not, so the click handler is bound once at init against
// whatever the last render left here. Binding it per render stacked handlers,
// and the second one re-added the bookmark the first had just removed.
var ET_MARK_ITEMS = [];

function etBuildMarksPage() {
    etLoadAllCategories().then(function(cats) {
        var items = etResolveMarks(cats);
        var container = document.getElementById('marksContainer');
        var subtitle = document.getElementById('markSubtitle');
        ET_MARK_ITEMS = items;

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

        if (typeof initEnglishTalk === 'function') initEnglishTalk();
    });
}

function etOnMarkClick(e) {
    var btn = e.target.closest('.mark-btn');
    if (!btn) return;
    e.stopPropagation();
    var it = ET_MARK_ITEMS[parseInt(btn.getAttribute('data-n'), 10)];
    if (!it) return;
    etToggleMark(it.scenarioKey, it.index, it.dialogue, it.catKey);
    // Drop the row rather than leaving a hollow ☆ behind on a page
    // whose whole point is that everything on it is bookmarked.
    var row = btn.closest('.dialogue');
    if (row) row.parentNode.removeChild(row);
    var container = document.getElementById('marksContainer');
    var left = container.querySelectorAll('.dialogue').length;
    document.getElementById('markSubtitle').textContent =
        left ? left + '개 문장' : '아직 북마크한 문장이 없습니다';
    if (typeof initAudioList === 'function') initAudioList();
}

function etInitMarksPage() {
    var container = document.getElementById('marksContainer');
    if (container) container.addEventListener('click', etOnMarkClick);
    etBuildMarksPage();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', etInitMarksPage);
} else {
    etInitMarksPage();
}

window.addEventListener('pageshow', function(e) {
    if (e.persisted) etBuildMarksPage();
});
