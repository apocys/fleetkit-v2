/* ═══════════════════════════════════════════════════════════════
   FEATURE 2: Agent Marketplace
   ═══════════════════════════════════════════════════════════════ */
(function() {
    'use strict';

    var AGENT_TEMPLATES = [
        { id: 'writer', name: 'Content Writer', emoji: '✍️', role: 'CMO', desc: 'Blog posts, social media, copywriting. Powered by Claude.', skills: ['writing', 'summarize', 'sag'], tier: 'Free' },
        { id: 'coder', name: 'Code Engineer', emoji: '💻', role: 'CTO', desc: 'Full-stack development, debugging, code review.', skills: ['coding-agent', 'github'], tier: 'Free' },
        { id: 'analyst', name: 'Data Analyst', emoji: '📊', role: 'COO', desc: 'Research, reports, competitive analysis, market data.', skills: ['web_search', 'summarize'], tier: 'Free' },
        { id: 'designer', name: 'Creative Director', emoji: '🎨', role: 'CDO', desc: 'Image generation, brand design, visual concepts.', skills: ['nano-banana-pro', 'openai-image-gen'], tier: 'Pro' },
        { id: 'security', name: 'Security Officer', emoji: '🛡️', role: 'CISO', desc: 'Vulnerability scanning, compliance, threat modeling.', skills: ['healthcheck', 'sentinel'], tier: 'Pro' },
        { id: 'scheduler', name: 'Operations Manager', emoji: '📅', role: 'COO', desc: 'Task scheduling, calendar management, reminders.', skills: ['cron', 'weather', 'gog'], tier: 'Free' },
        { id: 'researcher', name: 'Research Analyst', emoji: '🔍', role: 'Analyst', desc: 'Deep web research, fact-checking, citation gathering.', skills: ['web_search', 'web_fetch', 'summarize'], tier: 'Free' },
        { id: 'media', name: 'Media Producer', emoji: '🎬', role: 'Producer', desc: 'Video scripts, TikTok content, voice synthesis.', skills: ['tts', 'video-frames', 'openai-whisper-api'], tier: 'Pro' }
    ];

    var activatedAgents = {};
    try { activatedAgents = JSON.parse(localStorage.getItem('spawnkit-marketplace-activated') || '{}'); } catch(e) {}

    function escMk(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    function renderMarketplace() {
        var body = document.getElementById('marketplaceBody');
        if (!body) return;
        var html = '<div class="mk-grid">';
        AGENT_TEMPLATES.forEach(function(t) {
            var isActivated = !!activatedAgents[t.id];
            html += '<div class="mk-card">';
            html += '<div class="mk-card-top">';
            html += '<div class="mk-card-emoji">' + t.emoji + '</div>';
            html += '<div class="mk-card-info">';
            html += '<div class="mk-card-name">' + escMk(t.name) + '</div>';
            html += '<div class="mk-card-role">' + escMk(t.role) + '</div>';
            html += '</div>';
            html += '<span class="mk-tier-badge mk-tier-' + t.tier.toLowerCase() + '">' + escMk(t.tier) + '</span>';
            html += '</div>';
            html += '<div class="mk-card-desc">' + escMk(t.desc) + '</div>';
            html += '<div class="mk-skills-row">';
            t.skills.forEach(function(sk) {
                html += '<span class="mk-skill-tag">' + escMk(sk) + '</span>';
            });
            html += '</div>';
            html += '<button class="mk-activate-btn' + (isActivated ? ' activated' : '') + '" data-agent-id="' + escMk(t.id) + '">';
            html += isActivated ? '✅ Activated' : 'Activate';
            html += '</button>';
            html += '</div>';
        });
        html += '</div>';
        body.innerHTML = html;

        body.querySelectorAll('.mk-activate-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var id = btn.getAttribute('data-agent-id');
                var tmpl = AGENT_TEMPLATES.find(function(t) { return t.id === id; });
                if (!tmpl) return;
                activatedAgents[id] = true;
                try { localStorage.setItem('spawnkit-marketplace-activated', JSON.stringify(activatedAgents)); } catch(e) {}
                btn.textContent = '✅ Activated';
                btn.classList.add('activated');
                // Show toast
                var toast = document.getElementById('execToast');
                if (toast) {
                    toast.textContent = tmpl.emoji + ' ' + tmpl.name + ' agent activated!';
                    toast.classList.add('visible');
                    setTimeout(function() { toast.classList.remove('visible'); }, 2800);
                }
            });
        });
    }

    window.openMarketplace = openMarketplace;
    function openMarketplace() {
        if (typeof window.closeAllPanels === 'function') window.closeAllPanels();
        if (window.SkillMarketplace && typeof window.SkillMarketplace.open === 'function') {
            window.SkillMarketplace.open();
            return;
        }
        var overlay = document.getElementById('marketplaceOverlay');
        if (!overlay) return;
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        renderMarketplace();
    }
    function closeMarketplace() {
        var overlay = document.getElementById('marketplaceOverlay');
        if (overlay) overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    document.addEventListener('DOMContentLoaded', function() {
        var btn = document.getElementById('marketplaceBtn');
        if (btn) btn.addEventListener('click', openMarketplace);
        var closeBtn = document.getElementById('marketplaceClose');
        if (closeBtn) closeBtn.addEventListener('click', closeMarketplace);
        var backdrop = document.getElementById('marketplaceBackdrop');
        if (backdrop) backdrop.addEventListener('click', closeMarketplace);
    });
})();

