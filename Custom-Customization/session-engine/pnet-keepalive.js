(function() {
    if (window.__pnetKeepaliveActive) return;
    window.__pnetKeepaliveActive = true;
    setInterval(function() {
        fetch('/api/auth', { credentials: 'same-origin' }).catch(function() {});
    }, 180000);
})();
