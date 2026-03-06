/* ═══════════════════════════════════════════════════════════════
   FEATURE 3: Skills / MCP Catalog
   ═══════════════════════════════════════════════════════════════ */
(function() {
    'use strict';

    var SKILL_CATALOG = [
        { name: 'Web Search', icon: '🔍', desc: 'Search the web via Brave API', category: 'Research', status: 'active' },
        { name: 'Weather', icon: '🌤️', desc: 'Current weather and forecasts', category: 'Data', status: 'active' },
        { name: 'GitHub', icon: '🐙', desc: 'Issues, PRs, CI runs via gh CLI', category: 'Dev', status: 'active' },
        { name: 'Coding Agent', icon: '💻', desc: 'Run Claude Code or Codex for programming', category: 'Dev', status: 'active' },
        { name: 'Image Gen', icon: '🖼️', desc: 'Generate images via OpenAI or Gemini', category: 'Creative', status: 'active' },
        { name: 'TTS', icon: '🔊', desc: 'Text-to-speech audio generation', category: 'Creative', status: 'active' },
        { name: 'Whisper', icon: '🎤', desc: 'Audio transcription via OpenAI Whisper', category: 'Creative', status: 'active' },
        { name: 'Health Check', icon: '🛡️', desc: 'Security audit and hardening', category: 'Security', status: 'active' },
        { name: 'Video Frames', icon: '🎬', desc: 'Extract frames from videos', category: 'Creative', status: 'active' },
        { name: 'Browser', icon: '🌐', desc: 'Web browser automation', category: 'Automation', status: 'active' },
        { name: 'Cron Jobs', icon: '⏰', desc: 'Scheduled task management', category: 'Automation', status: 'active' },
        { name: 'Fleet Relay', icon: '📡', desc: 'Inter-office messaging', category: 'Communication', status: 'active' }
    ];

    var CATEGORIES = ['All', 'Research', 'Data', 'Dev', 'Creative', 'Security', 'Automation', 'Communication'];
    var skActiveCat = 'All';
    var skSearchQuery = '';

    function escSk(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    function renderSkillsCatTabs() {
        var tabs = document.getElementById('skillsCatTabs');
        if (!tabs) return;
        var html = '';
        CATEGORIES.forEach(function(cat) {
            html += '<button class="sk-cat-tab' + (cat === skActiveCat ? ' active' : '') + '" data-cat="' + escSk(cat) + '">' + escSk(cat) + '</button>';
        });
        tabs.innerHTML = html;
        tabs.querySelectorAll('.sk-cat-tab').forEach(function(btn) {
            btn.addEventListener('click', function() {
                skActiveCat = btn.getAttribute('data-cat');
                renderSkillsBody();
                tabs.querySelectorAll('.sk-cat-tab').forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
            });
        });
    }

    function renderSkillsBody() {
        var body = document.getElementById('skillsBody');
        if (!body) return;
        var filtered = SKILL_CATALOG.filter(function(sk) {
            var catMatch = skActiveCat === 'All' || sk.category === skActiveCat;
            var searchMatch = !skSearchQuery ||
                sk.name.toLowerCase().includes(skSearchQuery.toLowerCase()) ||
                sk.desc.toLowerCase().includes(skSearchQuery.toLowerCase()) ||
                sk.category.toLowerCase().includes(skSearchQuery.toLowerCase());
            return catMatch && searchMatch;
        });
        if (filtered.length === 0) {
            body.innerHTML = '<div class="sk-empty">No skills found matching "' + escSk(skSearchQuery) + '"</div>';
            return;
        }
        var html = '';
        filtered.forEach(function(sk) {
            html += '<div class="sk-item">';
            html += '<div class="sk-item-icon">' + sk.icon + '</div>';
            html += '<div class="sk-item-info">';
            html += '<div class="sk-item-name">' + escSk(sk.name) + '</div>';
            html += '<div class="sk-item-desc">' + escSk(sk.desc) + '</div>';
            html += '</div>';
            html += '<span class="sk-item-cat">' + escSk(sk.category) + '</span>';
            html += '<div class="sk-item-status"><div class="sk-status-dot"></div>Active</div>';
            html += '</div>';
        });
        body.innerHTML = html;
    }

    function renderSkills() {
        renderSkillsCatTabs();
        renderSkillsBody();
    }

    window.openSkills = openSkills;
    function openSkills() {
        var overlay = document.getElementById('skillsOverlay');
        if (!overlay) return;
        if (typeof window.closeAllPanels === 'function') window.closeAllPanels();
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        skActiveCat = 'All';
        skSearchQuery = '';
        renderSkills();
        var searchEl = document.getElementById('skillsSearch');
        if (searchEl) { searchEl.value = ''; searchEl.focus(); }
    }
    function closeSkills() {
        var overlay = document.getElementById('skillsOverlay');
        if (overlay) overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    document.addEventListener('DOMContentLoaded', function() {
        var btn = document.getElementById('skillsBtn');
        if (btn) btn.addEventListener('click', openSkills);
        var closeBtn = document.getElementById('skillsClose');
        if (closeBtn) closeBtn.addEventListener('click', closeSkills);
        var backdrop = document.getElementById('skillsBackdrop');
        if (backdrop) backdrop.addEventListener('click', closeSkills);
        var searchEl = document.getElementById('skillsSearch');
        if (searchEl) {
            searchEl.addEventListener('input', function() {
                skSearchQuery = searchEl.value.trim();
                renderSkillsBody();
            });
        }
    });
})();

