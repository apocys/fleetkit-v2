(function() {
    'use strict';

    // ─── Overlay reference ───────────────────────────────────────────────────────
    var mcOverlay = document.getElementById('missionControlOverlay');
    var _mcSubscriber = null;

    // ─── Open / Close ────────────────────────────────────────────────────────────
    window.openMissionControl = function() {
        mcOverlay.style.display = 'flex';
        requestAnimationFrame(function() {
            mcOverlay.classList.add('visible');
        });
        // Render immediately from OcStore cache
        loadMC();
        // Subscribe for live updates while MC is open
        if (window.OcStore && !_mcSubscriber) {
            _mcSubscriber = function() { loadMC(); };
            window.OcStore.subscribe(_mcSubscriber);
        }
    };

    window.closeMissionControl = function() {
        mcOverlay.classList.remove('visible');
        setTimeout(function() {
            mcOverlay.style.display = 'none';
        }, 300);
        // Unsubscribe when MC closes
        if (window.OcStore && _mcSubscriber) {
            window.OcStore.unsubscribe(_mcSubscriber);
            _mcSubscriber = null;
        }
    };

    // ─── ESC to close ────────────────────────────────────────────────────────────
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && mcOverlay.classList.contains('visible')) {
            window.closeMissionControl();
        }
    });

    // ─── Cleanup on unload ───────────────────────────────────────────────────────
    window.addEventListener('beforeunload', function() {
        if (window.OcStore && _mcSubscriber) {
            window.OcStore.unsubscribe(_mcSubscriber);
            _mcSubscriber = null;
        }
    });

    // ─── Data loader (uses OcStore cache) ────────────────────────────────────────
    var _mcLoading = false;
    var _lastMcHash = '';

    function loadMC() {
        if (_mcLoading) return;
        _mcLoading = true;

        // Read sessions from OcStore instead of fetching
        var sessions = (window.OcStore && window.OcStore.sessions) || [];

        // Hash check — skip re-render if nothing changed
        var hash = JSON.stringify(sessions.map(function(s) {
            return s.key + ':' + (s.status || '') + ':' + (s.totalTokens || 0);
        }));

        if (hash !== _lastMcHash) {
            _lastMcHash = hash;

            // Delegate rendering to each panel module
            if (window.McSidebarLeft)  window.McSidebarLeft.render(sessions);
            if (window.McCenter)       window.McCenter.render(sessions);
            if (window.McSidebarRight) window.McSidebarRight.render(sessions);
        }

        _mcLoading = false;
    }

    // ─── Force-refresh global ────────────────────────────────────────────────────
    window.mcRefresh = function() {
        _lastMcHash = '';
        if (window.OcStore) window.OcStore.refresh();
        loadMC();
    };

})();
