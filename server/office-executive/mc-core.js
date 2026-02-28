(function() {
    'use strict';

    // ─── Overlay reference ───────────────────────────────────────────────────────
    var mcOverlay = document.getElementById('missionControlOverlay');
    var mcRefreshTimer = null;

    // ─── Open / Close ────────────────────────────────────────────────────────────
    window.openMissionControl = function() {
        if (mcRefreshTimer) clearInterval(mcRefreshTimer);
        mcOverlay.style.display = 'flex';
        requestAnimationFrame(function() {
            mcOverlay.classList.add('visible');
        });
        loadMC();
        mcRefreshTimer = setInterval(loadMC, 15000);
    };

    window.closeMissionControl = function() {
        mcOverlay.classList.remove('visible');
        setTimeout(function() {
            mcOverlay.style.display = 'none';
        }, 300);
        if (mcRefreshTimer) {
            clearInterval(mcRefreshTimer);
            mcRefreshTimer = null;
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
        if (mcRefreshTimer) {
            clearInterval(mcRefreshTimer);
            mcRefreshTimer = null;
        }
    });

    // ─── Data loader (core wiring) ───────────────────────────────────────────────
    var _mcLoading = false;
    var _lastMcHash = '';

    function loadMC() {
        if (_mcLoading) return;
        _mcLoading = true;

        var API_URL = window.OC_API_URL || (
            window.location.hostname.includes('spawnkit.ai')
                ? window.location.origin
                : 'http://127.0.0.1:8222'
        );
        var skF = window.skFetch || fetch;

        skF(API_URL + '/api/oc/sessions').then(function(r) {
            return r.ok ? r.json() : [];
        }).then(function(sessions) {
            if (!Array.isArray(sessions)) sessions = [];

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
        }).catch(function(err) {
            console.warn('[MC Core] Failed to load sessions:', err);
        }).finally(function() {
            _mcLoading = false;
        });
    }

    // ─── Force-refresh global ────────────────────────────────────────────────────
    window.mcRefresh = function() {
        _lastMcHash = '';
        loadMC();
    };

})();
