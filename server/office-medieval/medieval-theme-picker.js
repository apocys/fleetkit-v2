(function() {
    'use strict';

    var themes = [
        { name: 'Executive Office', path: '/server/', icon: '🏢', desc: 'Frosted glass, Apple aesthetic' },
        { name: 'Medieval Castle', path: '/office-medieval/', icon: '🏰', desc: 'Three.js 3D castle (current)', current: true },
        { name: 'SimCity Village', path: '/office-simcity-nature/', icon: '🏘️', desc: 'Isometric pixel village' },
        { name: 'Green Iso', path: '/green-iso/', icon: '🌿', desc: 'Isometric agent city' },
        { name: 'GameBoy', path: '/office-gameboy/', icon: '🎮', desc: 'Retro pixel handheld' },
    ];

    function createPicker() {
        var overlay = document.createElement('div');
        overlay.id = 'theme-picker-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;';

        var parchment = document.createElement('div');
        parchment.style.cssText = 'background:linear-gradient(145deg,#f4e4bc,#e8d5a3);border-radius:12px;padding:32px;max-width:500px;width:90%;box-shadow:0 12px 40px rgba(0,0,0,0.5);border:3px solid #c9a959;';

        var title = document.createElement('h2');
        title.style.cssText = 'font-family:MedievalSharp,fantasy;color:#1a1a2e;margin:0 0 20px;text-align:center;font-size:24px;';
        title.textContent = '\uD83D\uDCDC Choose Thy Realm';
        parchment.appendChild(title);

        themes.forEach(function(t) {
            var card = document.createElement('div');
            card.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px 16px;margin-bottom:8px;background:' + (t.current ? 'rgba(201,169,89,0.3)' : 'rgba(255,255,255,0.4)') + ';border:2px solid ' + (t.current ? '#c9a959' : 'rgba(168,162,153,0.3)') + ';border-radius:8px;cursor:pointer;transition:all 0.2s;';

            var iconSpan = document.createElement('span');
            iconSpan.style.fontSize = '28px';
            iconSpan.textContent = t.icon;
            card.appendChild(iconSpan);

            var info = document.createElement('div');
            var nameDiv = document.createElement('div');
            nameDiv.style.cssText = 'font-family:Cinzel,serif;font-weight:600;color:#1a1a2e;';
            nameDiv.textContent = t.name + (t.current ? ' \u2713' : '');
            info.appendChild(nameDiv);

            var descDiv = document.createElement('div');
            descDiv.style.cssText = 'font-size:12px;color:#5c5750;';
            descDiv.textContent = t.desc;
            info.appendChild(descDiv);

            card.appendChild(info);

            if (!t.current) {
                card.addEventListener('mouseenter', function() { card.style.borderColor = '#c9a959'; card.style.background = 'rgba(201,169,89,0.15)'; });
                card.addEventListener('mouseleave', function() { card.style.borderColor = 'rgba(168,162,153,0.3)'; card.style.background = 'rgba(255,255,255,0.4)'; });
                card.addEventListener('click', function() { window.location.href = t.path; });
            }
            parchment.appendChild(card);
        });

        var closeBtn = document.createElement('button');
        closeBtn.style.cssText = 'display:block;margin:16px auto 0;background:#1a1a2e;color:#c9a959;border:2px solid #c9a959;border-radius:8px;padding:8px 24px;cursor:pointer;font-family:Crimson Text,serif;font-size:14px;';
        closeBtn.textContent = 'Close';
        closeBtn.addEventListener('click', function() { overlay.style.display = 'none'; });
        parchment.appendChild(closeBtn);

        overlay.appendChild(parchment);
        overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.style.display = 'none'; });
        document.body.appendChild(overlay);
        return overlay;
    }

    var pickerOverlay = null;
    window.openThemePicker = function() {
        if (!pickerOverlay) pickerOverlay = createPicker();
        pickerOverlay.style.display = 'flex';
    };

    // Add to hotbar
    setTimeout(function() {
        var hotbar = document.getElementById('roblox-hotbar');
        if (!hotbar) return;
        var slot = document.createElement('div');
        slot.style.cssText = 'width:52px;height:52px;background:rgba(30,30,30,0.85);border:2px solid rgba(255,255,255,0.15);border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:all 0.15s;position:relative;';

        var emoji = document.createElement('span');
        emoji.style.cssText = 'font-size:20px;line-height:1;';
        emoji.textContent = '\uD83C\uDFA8';
        slot.appendChild(emoji);

        var label = document.createElement('span');
        label.style.cssText = 'font-size:8px;color:rgba(255,255,255,0.5);margin-top:1px;';
        label.textContent = 'Themes';
        slot.appendChild(label);

        var num = document.createElement('span');
        num.style.cssText = 'position:absolute;top:2px;left:4px;font-size:9px;color:rgba(255,255,255,0.3);';
        num.textContent = '8';
        slot.appendChild(num);

        slot.addEventListener('mouseenter', function() { slot.style.borderColor = 'rgba(255,200,50,0.6)'; slot.style.transform = 'translateY(-2px)'; });
        slot.addEventListener('mouseleave', function() { slot.style.borderColor = 'rgba(255,255,255,0.15)'; slot.style.transform = 'none'; });
        slot.addEventListener('click', function() { window.openThemePicker(); });
        hotbar.appendChild(slot);

        // Key 8 shortcut
        document.addEventListener('keydown', function(e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.key === '8') { window.openThemePicker(); }
        });
    }, 2000);
})();
