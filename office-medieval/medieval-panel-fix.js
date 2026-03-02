/* medieval-panel-fix.js — Panel stacking fix + closeAllPanels + fetch timeouts + ESC handler
   Mirrors the executive office pattern. Load AFTER all other medieval scripts.
   Commit: medieval S+ parity — panel orchestration fix */
(function() {
    'use strict';

    // ── closeAllPanels: close every overlay/panel in the medieval theme ──
    function closeAllPanels() {
        // 1. Building panel (side panel from clicking buildings)
        if (typeof window.closeBuildingPanel === 'function') {
            window.closeBuildingPanel();
        }

        // 2. Mission Control overlay
        var mc = document.getElementById('missionControlOverlay');
        if (mc && mc.classList.contains('visible')) {
            mc.classList.remove('visible');
            setTimeout(function() { mc.style.display = 'none'; }, 300);
        }

        // 3. Agent Detail overlay
        var ad = document.getElementById('agentDetailOverlay');
        if (ad && ad.classList.contains('visible')) {
            ad.classList.remove('visible');
            setTimeout(function() { ad.style.display = 'none'; }, 300);
        }

        // 4. Summon Knight overlay
        var so = document.getElementById('summonOverlay');
        if (so && (so.classList.contains('visible') || so.style.display === 'flex')) {
            so.classList.remove('visible');
            setTimeout(function() { so.style.display = 'none'; }, 300);
        }

        // 5. Theme Switcher overlay
        var ts = document.getElementById('themeSwitcherOverlay');
        if (ts && (ts.classList.contains('visible') || ts.style.display === 'flex')) {
            ts.classList.remove('visible');
            setTimeout(function() { ts.style.display = 'none'; }, 300);
        }

        // 6. Channel Onboarding
        if (window.ChannelOnboarding && typeof window.ChannelOnboarding.close === 'function') {
            window.ChannelOnboarding.close();
        }

        // 7. Setup Wizard
        if (window.SetupWizard && typeof window.SetupWizard.close === 'function') {
            window.SetupWizard.close();
        }

        // 8. Sidebar panels
        var sidebar = document.querySelector('.castle-sidebar');
        if (sidebar) sidebar.classList.remove('panel-open');

        var rightpanel = document.querySelector('.castle-rightpanel');
        if (rightpanel) rightpanel.classList.remove('panel-open');

        // 9. Chat panel
        var chat = document.getElementById('medievalChat');
        if (chat && chat.style.display !== 'none') {
            chat.style.display = 'none';
            if (window.ThemeChat) window.ThemeChat.hide();
        }

        // 10. Kanban Board
        var kanban = document.getElementById('medievalKanban');
        if (kanban && kanban.style.display !== 'none') {
            kanban.style.display = 'none';
            if (window.KanbanBoard) window.KanbanBoard.hide();
        }

        // 11. Minimap
        var minimap = document.getElementById('minimap-overlay');
        if (minimap) minimap.style.display = 'none';
    }

    window.closeAllPanels = closeAllPanels;

    // ── Patch openBuildingPanel to close others first ──
    var origOpenBuildingPanel = window.openBuildingPanel;
    if (origOpenBuildingPanel) {
        window.openBuildingPanel = function(buildingName) {
            // Close everything except building panel itself
            var mc = document.getElementById('missionControlOverlay');
            if (mc && mc.classList.contains('visible')) {
                mc.classList.remove('visible');
                setTimeout(function() { mc.style.display = 'none'; }, 300);
            }
            var ad = document.getElementById('agentDetailOverlay');
            if (ad && ad.classList.contains('visible')) {
                ad.classList.remove('visible');
                setTimeout(function() { ad.style.display = 'none'; }, 300);
            }
            var so = document.getElementById('summonOverlay');
            if (so && so.classList.contains('visible')) {
                so.classList.remove('visible');
                setTimeout(function() { so.style.display = 'none'; }, 300);
            }
            origOpenBuildingPanel(buildingName);
        };
    }

    // ── Patch openMissionControl to close others first ──
    var origOpenMC = window.openMissionControl;
    if (origOpenMC) {
        window.openMissionControl = function() {
            if (typeof window.closeBuildingPanel === 'function') window.closeBuildingPanel();
            var ad = document.getElementById('agentDetailOverlay');
            if (ad && ad.classList.contains('visible')) {
                ad.classList.remove('visible');
                setTimeout(function() { ad.style.display = 'none'; }, 300);
            }
            origOpenMC();
        };
    }

    // ── Patch openAgentDetailPanel to close others first ──
    function patchAgentDetail() {
        var app = window.castleApp;
        if (!app) return;
        var origOpen = app.openAgentDetailPanel;
        if (!origOpen || app._panelFixPatched) return;
        app._panelFixPatched = true;

        app.openAgentDetailPanel = function(agentId) {
            if (typeof window.closeBuildingPanel === 'function') window.closeBuildingPanel();
            var mc = document.getElementById('missionControlOverlay');
            if (mc && mc.classList.contains('visible')) {
                mc.classList.remove('visible');
                setTimeout(function() { mc.style.display = 'none'; }, 300);
            }
            origOpen.call(app, agentId);
        };
    }

    // ── Unified ESC handler (capture phase to beat fragmented ones) ──
    document.addEventListener('keydown', function(e) {
        if (e.key !== 'Escape') return;

        // Priority order: topmost overlay first
        var summon = document.getElementById('summonOverlay');
        if (summon && summon.classList.contains('visible')) {
            e.stopImmediatePropagation();
            summon.classList.remove('visible');
            setTimeout(function() { summon.style.display = 'none'; }, 300);
            return;
        }

        var theme = document.getElementById('themeSwitcherOverlay');
        if (theme && (theme.classList.contains('visible') || theme.style.display === 'flex')) {
            e.stopImmediatePropagation();
            theme.classList.remove('visible');
            setTimeout(function() { theme.style.display = 'none'; }, 300);
            return;
        }

        var ad = document.getElementById('agentDetailOverlay');
        if (ad && ad.classList.contains('visible')) {
            e.stopImmediatePropagation();
            ad.classList.remove('visible');
            setTimeout(function() { ad.style.display = 'none'; }, 300);
            return;
        }

        var mc = document.getElementById('missionControlOverlay');
        if (mc && mc.classList.contains('visible')) {
            // Let the existing MC handler deal with this one (it clears intervals)
            return;
        }

        // Building panel
        var bp = document.getElementById('building-panel');
        if (bp && bp.classList.contains('panel-open')) {
            e.stopImmediatePropagation();
            if (typeof window.closeBuildingPanel === 'function') window.closeBuildingPanel();
            return;
        }

        // Chat
        var chat = document.getElementById('medievalChat');
        if (chat && chat.style.display !== 'none' && chat.style.display !== '') {
            e.stopImmediatePropagation();
            chat.style.display = 'none';
            if (window.ThemeChat) window.ThemeChat.hide();
            return;
        }
    }, true); // capture phase

    // ── Fetch timeout wrapper ──
    function patchFetchTimeout() {
        if (!window.ThemeAuth || !window.ThemeAuth.fetch) return;
        var origFetch = window.ThemeAuth.fetch.bind(window.ThemeAuth);
        if (window.ThemeAuth._timeoutPatched) return;
        window.ThemeAuth._timeoutPatched = true;

        window.ThemeAuth.fetch = function(url, options) {
            options = options || {};
            if (options.signal) return origFetch(url, options);

            var controller = new AbortController();
            var timer = setTimeout(function() { controller.abort(); }, 8000);
            options.signal = controller.signal;

            return origFetch(url, options).then(function(resp) {
                clearTimeout(timer);
                return resp;
            }).catch(function(err) {
                clearTimeout(timer);
                throw err;
            });
        };
    }

    // ── Init on DOM ready ──
    function init() {
        patchAgentDetail();
        patchFetchTimeout();
        console.log('[medieval-panel-fix] closeAllPanels + panel stacking + ESC + fetch timeout active');
    }

    // Wait for castleApp
    var attempts = 0;
    var poll = setInterval(function() {
        attempts++;
        if (window.castleApp) {
            clearInterval(poll);
            init();
        } else if (attempts > 30) {
            clearInterval(poll);
            patchFetchTimeout();
            console.log('[medieval-panel-fix] castleApp not found, partial init');
        }
    }, 500);
})();
