// Registers the service worker that makes the app installable and lets it open
// offline. Loaded by index/category/scenario; the redirect stubs skip it since
// they navigate away immediately.
//
// Registration is intentionally quiet: nothing here should be able to break the
// page if service workers are unavailable or the registration fails.
(function() {
    if (!('serviceWorker' in navigator)) return;

    window.addEventListener('load', function() {
        navigator.serviceWorker.register('sw.js').catch(function(e) {
            console.warn('[pwa] service worker registration failed', e);
        });
    });
})();
