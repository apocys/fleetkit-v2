(function() {
    const hotbar = document.getElementById('roblox-hotbar');
    if (!hotbar) return;
    const items = [
        { key: '1', icon: '🗡️', label: 'Missions', action: function() {
            if (typeof window.openBuildingPanel === 'function') window.openBuildingPanel('⚔️ Mission Hall');
            else if (typeof openMissionControl === 'function') openMissionControl();
        }},
        { key: '2', icon: '💬', label: 'Chat', action: function() {
            var chatEl = document.getElementById('medievalChat');
            if (chatEl) {
                if (chatEl.style.display === 'none' || !chatEl.style.display) {
                    chatEl.style.display = 'flex';
                    chatEl.style.flexDirection = 'column';
                    if (window.ThemeChat) ThemeChat.show();
                } else {
                    chatEl.style.display = 'none';
                    if (window.ThemeChat) ThemeChat.hide();
                }
            }
        }},
        { key: '3', icon: '📜', label: 'Skills', action: function() {
            if (typeof window.openBuildingPanel === 'function') window.openBuildingPanel('🏪 Market');
        }},
        { key: '4', icon: '🗺️', label: 'Map', action: function() {
            // Toggle minimap overlay
            var minimap = document.getElementById('minimap-overlay');
            if (minimap) {
                minimap.style.display = minimap.style.display === 'none' ? 'block' : 'none';
            } else {
                // Reset camera to overview position
                if (window.castleApp) window.castleApp.resetCamera();
            }
        }},
        { key: '5', icon: '⚙️', label: 'Settings', action: function() {
            if (typeof window.openBuildingPanel === 'function') window.openBuildingPanel('🏠 Chapel');
            else if (window.ThemeCustomize) ThemeCustomize.show();
        }},
        { key: '6', icon: '⚔️', label: 'Summon', action: function() {
            var overlay = document.getElementById('summonOverlay');
            if (!overlay) return;
            overlay.style.display = 'flex';
            setTimeout(function() { overlay.classList.add('visible'); }, 50);
        }},
        { key: '7', icon: '🏗️', label: 'Edit', action: function() {
            if (window.castleApp && window.castleApp.toggleEditMode) {
                window.castleApp.toggleEditMode();
            }
        }},
        { key: '8', icon: '🏰', label: 'Allies', action: function() {
            if (typeof window.openBuildingPanel === 'function') window.openBuildingPanel('🏰 Rookery');
        }},
        { key: '9', icon: '📜', label: 'Crons', action: function() {
            if (typeof window.openBuildingPanel === 'function') window.openBuildingPanel('📜 Scriptorium');
        }},
        { key: '0', icon: '🗺️', label: 'Memory', action: function() {
            if (typeof window.openBuildingPanel === 'function') window.openBuildingPanel('🗺️ Memory Tower');
        }},
    ];
    items.forEach(function(item) {
        var slot = document.createElement('div');
        slot.style.cssText = 'width:52px;height:52px;background:rgba(30,30,30,0.85);border:2px solid rgba(255,255,255,0.15);border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:all 0.15s;position:relative;';
        slot.innerHTML = '<span style="font-size:20px;line-height:1;">' + item.icon + '</span><span style="font-size:8px;color:rgba(255,255,255,0.5);margin-top:1px;">' + item.label + '</span><span style="position:absolute;top:2px;left:4px;font-size:9px;color:rgba(255,255,255,0.3);">' + item.key + '</span>';
        slot.addEventListener('mouseenter', function() { slot.style.borderColor = 'rgba(255,200,50,0.6)'; slot.style.transform = 'translateY(-2px)'; });
        slot.addEventListener('mouseleave', function() { slot.style.borderColor = 'rgba(255,255,255,0.15)'; slot.style.transform = 'none'; });
        slot.addEventListener('click', function() { item.action(); });
        hotbar.appendChild(slot);
    });
    document.addEventListener('keydown', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        var idx = parseInt(e.key) - 1;
        if (idx >= 0 && idx < items.length) {
            hotbar.children[idx].click();
            hotbar.children[idx].style.borderColor = 'rgba(255,200,50,0.9)';
            setTimeout(function() { hotbar.children[idx].style.borderColor = 'rgba(255,255,255,0.15)'; }, 200);
        }
    });

    // Remove floating buttons on the right side (they duplicate hotbar)
    setTimeout(function() {
        var floatingBtns = document.querySelectorAll('.theme-floating-btn, .floating-actions');
        floatingBtns.forEach(function(btn) { btn.style.display = 'none'; });
    }, 1000);
})();
