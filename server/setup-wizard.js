/**
 * SpawnKit Setup Wizard — Shared UI Module
 * ═════════════════════════════════════════
 * Works in both Executive and Medieval themes.
 * Driven by blueprint API, generates workspace config.
 *
 * Usage: SetupWizard.open(theme) — 'executive' or 'medieval'
 * @version 1.0.0
 */
(function() {
    'use strict';

    var API = (function() {
        if (window.OC_API_URL) return window.OC_API_URL;
        if (window.location.hostname.includes('spawnkit.ai')) return window.location.origin;
        return 'http://127.0.0.1:8222';
    })();

    // State
    var state = { step: 0, blueprint: null, variables: {}, theme: 'executive' };
    var overlay = null;

    // ── CSS ──────────────────────────────
    var style = document.createElement('style');
    style.textContent = [
        '.sw-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:5000;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .3s;backdrop-filter:blur(4px)}',
        '.sw-overlay.visible{opacity:1}',
        '.sw-panel{width:480px;max-width:92vw;max-height:85vh;overflow-y:auto;border-radius:16px;position:relative;animation:sw-in .3s ease-out}',
        '@keyframes sw-in{from{transform:translateY(20px) scale(.95);opacity:0}to{transform:none;opacity:1}}',
        /* Executive theme */
        '.sw-panel.executive{background:#1c1c1e;border:1px solid #3a3a3c;color:#fff}',
        '.sw-panel.executive .sw-title{color:#fff;font-size:20px;font-weight:700}',
        '.sw-panel.executive .sw-subtitle{color:#8e8e93;font-size:13px}',
        '.sw-panel.executive .sw-input{background:#2c2c2e;border:1px solid #3a3a3c;color:#fff;border-radius:8px;padding:10px 14px;font-size:14px;width:100%;box-sizing:border-box;outline:none}',
        '.sw-panel.executive .sw-input:focus{border-color:#0a84ff}',
        '.sw-panel.executive .sw-btn{padding:10px 20px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;border:none;transition:all .2s}',
        '.sw-panel.executive .sw-btn-primary{background:#0a84ff;color:#fff}',
        '.sw-panel.executive .sw-btn-primary:hover{background:#0070e0}',
        '.sw-panel.executive .sw-btn-secondary{background:#2c2c2e;color:#8e8e93;border:1px solid #3a3a3c}',
        /* Medieval theme */
        '.sw-panel.medieval{background:linear-gradient(135deg,#0d1b2a,#1b2838);border:2px solid rgba(201,169,89,.4);color:#f4e4bc}',
        '.sw-panel.medieval .sw-title{color:#c9a959;font-family:"Crimson Text",serif;font-size:22px}',
        '.sw-panel.medieval .sw-subtitle{color:rgba(168,162,153,.7);font-family:"Crimson Text",serif;font-size:13px}',
        '.sw-panel.medieval .sw-input{background:rgba(15,52,96,.5);border:1px solid rgba(168,162,153,.3);color:#f4e4bc;border-radius:6px;padding:10px 14px;font-size:14px;width:100%;box-sizing:border-box;outline:none;font-family:"Crimson Text",serif}',
        '.sw-panel.medieval .sw-input:focus{border-color:rgba(201,169,89,.6)}',
        '.sw-panel.medieval .sw-btn{padding:10px 20px;border-radius:6px;font-size:14px;font-weight:600;cursor:pointer;border:none;transition:all .2s;font-family:"Crimson Text",serif}',
        '.sw-panel.medieval .sw-btn-primary{background:rgba(201,169,89,.3);color:#c9a959;border:1px solid rgba(201,169,89,.5)}',
        '.sw-panel.medieval .sw-btn-primary:hover{background:rgba(201,169,89,.4)}',
        '.sw-panel.medieval .sw-btn-secondary{background:rgba(15,52,96,.4);color:rgba(168,162,153,.7);border:1px solid rgba(168,162,153,.2)}',
        /* Shared */
        '.sw-body{padding:24px}',
        '.sw-progress{display:flex;gap:4px;margin-bottom:20px}',
        '.sw-dot{height:4px;flex:1;border-radius:2px;background:rgba(255,255,255,.1);transition:background .3s}',
        '.sw-dot.active{background:#0a84ff}',
        '.sw-dot.medieval-active{background:rgba(201,169,89,.7)}',
        '.sw-dot.done{background:#34c759}',
        '.sw-field{margin-bottom:16px}',
        '.sw-label{display:block;font-size:12px;margin-bottom:6px;opacity:.7;text-transform:uppercase;letter-spacing:.5px}',
        '.sw-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:20px}',
        '.sw-feature{display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px}',
        '.sw-feature-check{color:#34c759}',
        '.sw-blueprint-card{border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:16px;cursor:pointer;transition:all .2s;margin-bottom:12px}',
        '.sw-blueprint-card:hover{border-color:#0a84ff;transform:translateY(-2px)}',
        '.sw-blueprint-card.medieval:hover{border-color:rgba(201,169,89,.6)}',
        '.sw-blueprint-card.selected{border-color:#34c759;background:rgba(52,199,89,.05)}',
        '.sw-emoji-pick{display:inline-flex;gap:6px;flex-wrap:wrap}',
        '.sw-emoji-opt{font-size:24px;cursor:pointer;padding:4px 8px;border-radius:8px;border:2px solid transparent;transition:all .2s}',
        '.sw-emoji-opt:hover,.sw-emoji-opt.selected{border-color:#0a84ff;background:rgba(10,132,255,.1)}',
        '.sw-personality{display:flex;gap:8px}',
        '.sw-pers-opt{flex:1;text-align:center;padding:12px 8px;border-radius:10px;cursor:pointer;border:1px solid rgba(255,255,255,.1);transition:all .2s;font-size:12px}',
        '.sw-pers-opt:hover{border-color:rgba(255,255,255,.3)}',
        '.sw-pers-opt.selected{border-color:#0a84ff;background:rgba(10,132,255,.1)}',
        '.sw-pers-opt.medieval.selected{border-color:rgba(201,169,89,.6);background:rgba(201,169,89,.1)}',
        '.sw-deploy-anim{text-align:center;padding:40px 0}',
        '.sw-deploy-icon{font-size:64px;animation:sw-pulse 1.5s ease-in-out infinite}',
        '@keyframes sw-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}',
        '.sw-done{text-align:center;padding:20px 0}',
        '.sw-done-icon{font-size:64px;margin-bottom:12px}',
        '.sw-close{position:absolute;top:12px;right:16px;font-size:20px;cursor:pointer;opacity:.5;background:none;border:none;color:inherit}',
        '.sw-close:hover{opacity:1}',
    ].join('\n');
    document.head.appendChild(style);

    // ── Steps ────────────────────────────
    var STEPS = [
        { title: 'Choose Blueprint', render: renderStep0 },
        { title: 'About You', render: renderStep1 },
        { title: 'Name Your Agent', render: renderStep2 },
        { title: 'Deploying', render: renderStep3 },
        { title: 'Ready', render: renderStep4 }
    ];

    function esc(s) { return typeof s !== 'string' ? '' : s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    function skFetch(url, opts) {
        var h = (opts && opts.headers) || {};
        var tk = window.localStorage.getItem('sk_token');
        if (tk) h['Authorization'] = 'Bearer ' + tk;
        return fetch(url, Object.assign({}, opts || {}, { headers: h }));
    }

    // ── Open Wizard ──────────────────────
    function open(theme) {
        state = { step: 0, blueprint: null, variables: {}, theme: theme || 'executive' };
        
        overlay = document.createElement('div');
        overlay.className = 'sw-overlay';
        overlay.addEventListener('click', function(e) { if (e.target === overlay) close(); });
        
        var panel = document.createElement('div');
        panel.className = 'sw-panel ' + state.theme;
        panel.id = 'sw-panel';
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        
        setTimeout(function() { overlay.classList.add('visible'); }, 50);
        renderCurrentStep();
    }

    function close() {
        if (overlay) {
            overlay.classList.remove('visible');
            setTimeout(function() { overlay.remove(); overlay = null; }, 300);
        }
    }

    function renderCurrentStep() {
        var panel = document.getElementById('sw-panel');
        if (!panel) return;
        
        var med = state.theme === 'medieval';
        var html = '<button class="sw-close" onclick="SetupWizard.close()">✕</button>';
        html += '<div class="sw-body">';
        
        // Progress dots
        html += '<div class="sw-progress">';
        for (var i = 0; i < STEPS.length; i++) {
            var cls = i < state.step ? 'done' : (i === state.step ? (med ? 'medieval-active' : 'active') : '');
            html += '<div class="sw-dot ' + cls + '"></div>';
        }
        html += '</div>';
        
        panel.innerHTML = html + '</div>';
        var body = panel.querySelector('.sw-body');
        STEPS[state.step].render(body);
    }

    function nextStep() { state.step = Math.min(state.step + 1, STEPS.length - 1); renderCurrentStep(); }
    function prevStep() { state.step = Math.max(state.step - 1, 0); renderCurrentStep(); }

    // ── Step 0: Choose Blueprint ─────────
    async function renderStep0(body) {
        var med = state.theme === 'medieval';
        body.innerHTML += '<div class="sw-title">' + (med ? '📜 Choose Your Scroll of Power' : '📦 Choose a Blueprint') + '</div>';
        body.innerHTML += '<div class="sw-subtitle" style="margin-bottom:16px">' + (med ? 'Select the ancient knowledge to bestow upon your agent' : 'Blueprints define your agent\'s capabilities') + '</div>';
        body.innerHTML += '<div id="sw-bp-list"><div style="text-align:center;opacity:.5;padding:20px">Loading blueprints…</div></div>';
        
        try {
            var resp = await skFetch(API + '/api/wizard/blueprints');
            var data = await resp.json();
            var list = document.getElementById('sw-bp-list');
            if (!list) return;
            
            var bps = data.blueprints || [];
            if (!bps.length) { list.innerHTML = '<div style="opacity:.5">No blueprints found.</div>'; return; }
            
            list.innerHTML = '';
            bps.forEach(function(bp) {
                var card = document.createElement('div');
                card.className = 'sw-blueprint-card' + (med ? ' medieval' : '') + (state.blueprint === bp.id ? ' selected' : '');
                card.innerHTML = '<div style="display:flex;gap:12px;align-items:flex-start">' +
                    '<span style="font-size:32px">' + esc(bp.icon) + '</span>' +
                    '<div style="flex:1"><div style="font-size:16px;font-weight:600;margin-bottom:4px">' + esc(bp.name) + '</div>' +
                    '<div style="font-size:12px;opacity:.6;margin-bottom:8px">' + esc(bp.description) + '</div>' +
                    bp.features.slice(0, 5).map(function(f) { return '<div class="sw-feature"><span class="sw-feature-check">✓</span> ' + esc(f) + '</div>'; }).join('') +
                    (bp.features.length > 5 ? '<div class="sw-feature" style="opacity:.5">+' + (bp.features.length - 5) + ' more</div>' : '') +
                    '</div></div>';
                card.addEventListener('click', function() {
                    state.blueprint = bp.id;
                    list.querySelectorAll('.sw-blueprint-card').forEach(function(c) { c.classList.remove('selected'); });
                    card.classList.add('selected');
                });
                list.appendChild(card);
            });
            
            if (bps.length === 1) state.blueprint = bps[0].id;
        } catch(e) {
            document.getElementById('sw-bp-list').innerHTML = '<div style="color:#ff453a">Failed to load blueprints</div>';
        }
        
        body.innerHTML += '<div class="sw-actions"><button class="sw-btn sw-btn-primary" id="sw-next0">' + (med ? '⚔️ Continue' : 'Next →') + '</button></div>';
        document.getElementById('sw-next0').addEventListener('click', function() {
            if (!state.blueprint) { alert(med ? 'Choose a scroll first!' : 'Select a blueprint'); return; }
            nextStep();
        });
    }

    // ── Step 1: About You ────────────────
    function renderStep1(body) {
        var med = state.theme === 'medieval';
        body.innerHTML += '<div class="sw-title">' + (med ? '👑 Identify Yourself, Sovereign' : '👤 About You') + '</div>';
        body.innerHTML += '<div class="sw-subtitle" style="margin-bottom:16px">' + (med ? 'Your agent must know its liege' : 'Your agent needs to know who it serves') + '</div>';
        
        var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        
        body.innerHTML +=
            '<div class="sw-field"><label class="sw-label">Your Name</label><input class="sw-input" id="sw-name" value="' + esc(state.variables.USER_NAME || '') + '" placeholder="' + (med ? 'Your royal name' : 'Your name') + '"></div>' +
            '<div class="sw-field"><label class="sw-label">Timezone</label><input class="sw-input" id="sw-tz" value="' + esc(state.variables.USER_TIMEZONE || tz) + '"></div>' +
            '<div class="sw-field"><label class="sw-label">' + (med ? 'Your Domain of Expertise' : 'Expertise / Domain') + '</label><input class="sw-input" id="sw-exp" value="' + esc(state.variables.USER_EXPERTISE || '') + '" placeholder="' + (med ? 'Alchemy, warfare, trade...' : 'e.g. web development, finance, data science') + '"></div>' +
            '<div class="sw-actions"><button class="sw-btn sw-btn-secondary" id="sw-back1">← Back</button><button class="sw-btn sw-btn-primary" id="sw-next1">' + (med ? '⚔️ Continue' : 'Next →') + '</button></div>';
        
        document.getElementById('sw-back1').addEventListener('click', prevStep);
        document.getElementById('sw-next1').addEventListener('click', function() {
            var name = document.getElementById('sw-name').value.trim();
            if (!name) { alert(med ? 'A sovereign must have a name!' : 'Please enter your name'); return; }
            state.variables.USER_NAME = name;
            state.variables.USER_TIMEZONE = document.getElementById('sw-tz').value.trim() || 'UTC';
            state.variables.USER_EXPERTISE = document.getElementById('sw-exp').value.trim();
            nextStep();
        });
    }

    // ── Step 2: Name Your Agent ──────────
    function renderStep2(body) {
        var med = state.theme === 'medieval';
        body.innerHTML += '<div class="sw-title">' + (med ? '⚔️ Name Your Champion' : '🤖 Name Your Agent') + '</div>';
        body.innerHTML += '<div class="sw-subtitle" style="margin-bottom:16px">' + (med ? 'Choose a name, sigil, and temperament' : 'Personalize your agent') + '</div>';
        
        var emojis = med ? ['🏰','⚔️','🛡️','🦅','🐉','👑','🔮','⚡'] : ['🤖','🚀','💡','🧠','⚡','🎯','🔧','🌟'];
        
        body.innerHTML +=
            '<div class="sw-field"><label class="sw-label">' + (med ? 'Champion Name' : 'Agent Name') + '</label><input class="sw-input" id="sw-aname" value="' + esc(state.variables.AGENT_NAME || '') + '" placeholder="' + (med ? 'e.g. Aegis, Valor, Raven' : 'e.g. Atlas, Nova, Zen') + '"></div>' +
            '<div class="sw-field"><label class="sw-label">' + (med ? 'Sigil' : 'Emoji') + '</label><div class="sw-emoji-pick" id="sw-emoji-pick">' +
            emojis.map(function(e) { return '<span class="sw-emoji-opt' + (state.variables.AGENT_EMOJI === e ? ' selected' : '') + '" data-emoji="' + e + '">' + e + '</span>'; }).join('') +
            '</div></div>' +
            '<div class="sw-field"><label class="sw-label">' + (med ? 'Temperament' : 'Personality') + '</label><div class="sw-personality" id="sw-pers">' +
            '<div class="sw-pers-opt' + (med ? ' medieval' : '') + (state.variables.AGENT_PERSONALITY === 'direct' || !state.variables.AGENT_PERSONALITY ? ' selected' : '') + '" data-pers="direct">⚡<br>' + (med ? 'Battle-Hardened' : 'Direct') + '<br><span style="font-size:10px;opacity:.5">' + (med ? 'No mercy, no fluff' : 'Cool & action-oriented') + '</span></div>' +
            '<div class="sw-pers-opt' + (med ? ' medieval' : '') + (state.variables.AGENT_PERSONALITY === 'friendly' ? ' selected' : '') + '" data-pers="friendly">🌟<br>' + (med ? 'Noble & Warm' : 'Friendly') + '<br><span style="font-size:10px;opacity:.5">' + (med ? 'Encouraging spirit' : 'Warm & collaborative') + '</span></div>' +
            '<div class="sw-pers-opt' + (med ? ' medieval' : '') + (state.variables.AGENT_PERSONALITY === 'formal' ? ' selected' : '') + '" data-pers="formal">📜<br>' + (med ? 'Royal Court' : 'Formal') + '<br><span style="font-size:10px;opacity:.5">' + (med ? 'Precise & scholarly' : 'Professional & structured') + '</span></div>' +
            '</div></div>' +
            '<div class="sw-actions"><button class="sw-btn sw-btn-secondary" id="sw-back2">← Back</button><button class="sw-btn sw-btn-primary" id="sw-next2">' + (med ? '🏰 Deploy Champion' : '🚀 Deploy Agent') + '</button></div>';
        
        // Wire emoji picker
        document.querySelectorAll('.sw-emoji-opt').forEach(function(el) {
            el.addEventListener('click', function() {
                document.querySelectorAll('.sw-emoji-opt').forEach(function(e) { e.classList.remove('selected'); });
                el.classList.add('selected');
                state.variables.AGENT_EMOJI = el.dataset.emoji;
            });
        });
        if (!state.variables.AGENT_EMOJI) state.variables.AGENT_EMOJI = emojis[0];
        
        // Wire personality picker
        document.querySelectorAll('.sw-pers-opt').forEach(function(el) {
            el.addEventListener('click', function() {
                document.querySelectorAll('.sw-pers-opt').forEach(function(e) { e.classList.remove('selected'); });
                el.classList.add('selected');
                state.variables.AGENT_PERSONALITY = el.dataset.pers;
            });
        });
        if (!state.variables.AGENT_PERSONALITY) state.variables.AGENT_PERSONALITY = 'direct';
        
        document.getElementById('sw-back2').addEventListener('click', prevStep);
        document.getElementById('sw-next2').addEventListener('click', function() {
            var name = document.getElementById('sw-aname').value.trim();
            if (!name) { alert(med ? 'A champion must have a name!' : 'Enter an agent name'); return; }
            state.variables.AGENT_NAME = name;
            nextStep();
        });
    }

    // ── Step 3: Deploying ────────────────
    async function renderStep3(body) {
        var med = state.theme === 'medieval';
        body.innerHTML += '<div class="sw-deploy-anim">' +
            '<div class="sw-deploy-icon">' + (med ? '⚔️' : '🚀') + '</div>' +
            '<div class="sw-title" style="margin-top:16px">' + (med ? 'Forging Your Champion...' : 'Deploying Agent...') + '</div>' +
            '<div class="sw-subtitle" id="sw-deploy-status">' + (med ? 'The forge burns bright' : 'Applying blueprint') + '</div>' +
            '</div>';
        
        try {
            var statusEl = document.getElementById('sw-deploy-status');
            if (statusEl) statusEl.textContent = med ? 'Inscribing ancient knowledge...' : 'Generating configuration files...';
            
            var resp = await skFetch(API + '/api/wizard/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ blueprintId: state.blueprint, variables: state.variables })
            });
            var data = await resp.json();
            
            if (data.ok) {
                state.result = data;
                var cronCount = (data.crons || []).filter(function(c) { return c.status === 'registered'; }).length;
                if (statusEl) statusEl.textContent = (med ? 'Champion forged! ' + cronCount + ' heralds deployed.' : 'Done! ' + cronCount + ' crons registered.');
                setTimeout(nextStep, 1500);
            } else {
                if (statusEl) {
                    statusEl.style.color = '#ff453a';
                    statusEl.textContent = 'Error: ' + (data.error || 'Unknown');
                }
            }
        } catch(e) {
            var s = document.getElementById('sw-deploy-status');
            if (s) { s.style.color = '#ff453a'; s.textContent = 'Deploy failed: ' + e.message; }
        }
    }

    // ── Step 4: Done ─────────────────────
    function renderStep4(body) {
        var med = state.theme === 'medieval';
        var v = state.variables;
        body.innerHTML += '<div class="sw-done">' +
            '<div class="sw-done-icon">' + esc(v.AGENT_EMOJI || '🏰') + '</div>' +
            '<div class="sw-title">' + esc(v.AGENT_NAME) + ' ' + (med ? 'Has Risen!' : 'Is Ready!') + '</div>' +
            '<div class="sw-subtitle" style="margin:8px 0 20px">' + (med ? 'Your champion stands ready to serve, ' + esc(v.USER_NAME) + '.' : 'Your agent is configured and ready, ' + esc(v.USER_NAME) + '.') + '</div>' +
            '<div style="text-align:left;font-size:13px;opacity:.7;margin-bottom:16px">' +
            '<div class="sw-feature"><span class="sw-feature-check">✅</span> ' + (med ? 'Soul inscribed' : 'Personality configured') + '</div>' +
            '<div class="sw-feature"><span class="sw-feature-check">✅</span> ' + (med ? 'Battle commands ready (/mission, /brainstorm)' : 'Slash commands ready (/mission, /brainstorm)') + '</div>' +
            '<div class="sw-feature"><span class="sw-feature-check">✅</span> 4 quality skills installed</div>' +
            '<div class="sw-feature"><span class="sw-feature-check">✅</span> ' + (med ? 'Ancient wisdom bestowed (memory)' : 'Starter memory with best practices') + '</div>' +
            '<div class="sw-feature"><span class="sw-feature-check">✅</span> ' + (med ? 'Morning heralds & review sentinels registered' : 'Morning briefings & code reviews auto-registered') + '</div>' +
            '<div class="sw-feature"><span class="sw-feature-check">✅</span> Telegram inline buttons enabled</div>' +
            '</div>' +
            '</div>' +
            '<div class="sw-actions" style="justify-content:center"><button class="sw-btn sw-btn-primary" id="sw-finish" style="padding:12px 32px;font-size:15px">' + (med ? '⚔️ Enter the Realm' : '🚀 Get Started') + '</button></div>';
        
        document.getElementById('sw-finish').addEventListener('click', function() {
            close();
            // Refresh the page to pick up new config
            if (state.result && state.result.ok) {
                setTimeout(function() { window.location.reload(); }, 500);
            }
        });
    }

    // ── Exports ──────────────────────────
    window.SetupWizard = {
        open: open,
        close: close
    };
})();
