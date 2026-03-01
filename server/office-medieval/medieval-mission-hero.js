(function() {
    'use strict';

    function createHero() {
        var overlay = document.createElement('div');
        overlay.id = 'mission-hero-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:900;background:rgba(0,0,0,0.6);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;';

        var scroll = document.createElement('div');
        scroll.style.cssText = 'background:linear-gradient(145deg,#f4e4bc,#e8d5a3);border-radius:16px;padding:40px;max-width:600px;width:90%;box-shadow:0 16px 48px rgba(0,0,0,0.5);border:3px solid #c9a959;text-align:center;position:relative;';

        // Badge
        var badge = document.createElement('div');
        badge.style.cssText = 'position:absolute;top:-20px;left:50%;transform:translateX(-50%);background:#1a1a2e;color:#c9a959;padding:4px 20px;border-radius:20px;font-family:MedievalSharp,fantasy;font-size:13px;border:2px solid #c9a959;';
        badge.textContent = '\u2694\uFE0F Royal Decree';
        scroll.appendChild(badge);

        // Heading
        var heading = document.createElement('h1');
        heading.style.cssText = 'font-family:MedievalSharp,fantasy;color:#1a1a2e;margin:12px 0 8px;font-size:28px;';
        heading.textContent = 'What is thy command?';
        scroll.appendChild(heading);

        // Subtitle
        var subtitle = document.createElement('p');
        subtitle.style.cssText = 'font-family:Crimson Text,serif;color:#5c5750;margin-bottom:20px;font-size:14px;';
        subtitle.textContent = 'Speak thy wish and the court shall make it so';
        scroll.appendChild(subtitle);

        var input = document.createElement('textarea');
        input.id = 'mission-hero-input';
        input.placeholder = 'Build a REST API for managing quests...';
        input.style.cssText = 'width:100%;box-sizing:border-box;height:100px;background:rgba(26,26,46,0.08);border:2px solid rgba(201,169,89,0.4);border-radius:12px;padding:16px;font-family:Crimson Text,serif;font-size:16px;color:#1a1a2e;resize:none;outline:none;transition:border-color 0.2s;';
        input.addEventListener('focus', function() { input.style.borderColor = '#c9a959'; });
        input.addEventListener('blur', function() { input.style.borderColor = 'rgba(201,169,89,0.4)'; });
        scroll.appendChild(input);

        var btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:12px;justify-content:center;margin-top:16px;';

        var sendBtn = document.createElement('button');
        sendBtn.style.cssText = 'background:#1a1a2e;color:#c9a959;border:2px solid #c9a959;border-radius:10px;padding:10px 28px;cursor:pointer;font-family:Cinzel,serif;font-weight:600;font-size:14px;transition:all 0.2s;';
        sendBtn.textContent = '\u2694\uFE0F Execute Royal Decree';
        sendBtn.addEventListener('mouseenter', function() { sendBtn.style.background = '#c9a959'; sendBtn.style.color = '#1a1a2e'; });
        sendBtn.addEventListener('mouseleave', function() { sendBtn.style.background = '#1a1a2e'; sendBtn.style.color = '#c9a959'; });
        sendBtn.addEventListener('click', function() {
            var text = input.value.trim();
            if (!text) return;
            // Send via chat
            if (window.ThemeChat && window.ThemeChat._sendMessage) {
                window.ThemeChat._sendMessage(text);
            }
            overlay.style.display = 'none';
            input.value = '';
            // Show chat
            var chatEl = document.getElementById('medievalChat');
            if (chatEl) { chatEl.style.display = 'flex'; chatEl.style.flexDirection = 'column'; }
            if (window.ThemeChat) window.ThemeChat.show();
        });
        btnRow.appendChild(sendBtn);

        var cancelBtn = document.createElement('button');
        cancelBtn.style.cssText = 'background:transparent;color:#5c5750;border:1px solid rgba(92,87,80,0.3);border-radius:10px;padding:10px 20px;cursor:pointer;font-family:Crimson Text,serif;font-size:14px;';
        cancelBtn.textContent = 'Dismiss';
        cancelBtn.addEventListener('click', function() { overlay.style.display = 'none'; });
        btnRow.appendChild(cancelBtn);

        scroll.appendChild(btnRow);

        // Keyboard: Enter to send (Shift+Enter for newline)
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendBtn.click();
            }
        });

        overlay.appendChild(scroll);
        overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.style.display = 'none'; });
        document.body.appendChild(overlay);
        return overlay;
    }

    var heroOverlay = null;
    window.openMissionHero = function() {
        if (!heroOverlay) heroOverlay = createHero();
        heroOverlay.style.display = 'flex';
        setTimeout(function() {
            var input = document.getElementById('mission-hero-input');
            if (input) input.focus();
        }, 100);
    };

    // Show on first visit (after loading) if not shown before
    setTimeout(function() {
        if (localStorage.getItem('medieval-hero-shown')) return;
        localStorage.setItem('medieval-hero-shown', '1');
        window.openMissionHero();
    }, 5000);
})();
