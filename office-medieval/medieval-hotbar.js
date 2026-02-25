(function() {
    const hotbar = document.getElementById('roblox-hotbar');
    if (!hotbar) return;
    const items = [
        { key: '1', icon: '🗡️', label: 'Missions', action: 'missions' },
        { key: '2', icon: '💬', label: 'Chat', action: 'chat' },
        { key: '3', icon: '📜', label: 'Skills', action: 'skills' },
        { key: '4', icon: '🗺️', label: 'Map', action: 'map' },
        { key: '5', icon: '⚙️', label: 'Settings', action: 'settings' },
    ];
    items.forEach(item => {
        const slot = document.createElement('div');
        slot.style.cssText = 'width:52px;height:52px;background:rgba(30,30,30,0.85);border:2px solid rgba(255,255,255,0.15);border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:all 0.15s;position:relative;';
        slot.innerHTML = `<span style="font-size:20px;line-height:1;">${item.icon}</span><span style="font-size:8px;color:rgba(255,255,255,0.5);margin-top:1px;">${item.label}</span><span style="position:absolute;top:2px;left:4px;font-size:9px;color:rgba(255,255,255,0.3);">${item.key}</span>`;
        slot.addEventListener('mouseenter', () => { slot.style.borderColor = 'rgba(255,200,50,0.6)'; slot.style.transform = 'translateY(-2px)'; });
        slot.addEventListener('mouseleave', () => { slot.style.borderColor = 'rgba(255,255,255,0.15)'; slot.style.transform = 'none'; });
        slot.addEventListener('click', () => {
            if (item.action === 'missions' && typeof openMissionControl === 'function') openMissionControl();
            if (item.action === 'chat' && window.ThemeChat) ThemeChat.show();
            if (item.action === 'skills' && window.KanbanBoard) KanbanBoard.show();
            if (item.action === 'settings' && window.ThemeCustomize) ThemeCustomize.show();
        });
        hotbar.appendChild(slot);
    });
    document.addEventListener('keydown', e => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        const idx = parseInt(e.key) - 1;
        if (idx >= 0 && idx < items.length) {
            hotbar.children[idx].click();
            hotbar.children[idx].style.borderColor = 'rgba(255,200,50,0.9)';
            setTimeout(() => { hotbar.children[idx].style.borderColor = 'rgba(255,255,255,0.15)'; }, 200);
        }
    });
})();
