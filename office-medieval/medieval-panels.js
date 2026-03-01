/* medieval-panels.js — Building click → contextual side panel (IIFE) */
(function () {
    'use strict';

    // ── Panel config ────────────────────────────────────────────────────
    var BUILDING_PANELS = {
        '⚔️ Mission Hall': { icon: '⚔️', title: 'Mission Hall',      render: renderMissionHall },
        '🍺 Tavern':       { icon: '🍺', title: 'Brainstorm Tavern', render: renderTavern },
        '📚 Library':      { icon: '📚', title: 'Agent Library',     render: renderLibrary },
        '🔨 Forge Workshop':{ icon: '🔨', title: 'Skill Forge',      render: renderForge },
        '🏪 Market':       { icon: '🏪', title: 'Skill Marketplace', render: renderMarket },
        '🏠 Chapel':       { icon: '🏠', title: 'Settings',         render: renderSettings },
        '🏰 Rookery':      { icon: '🐦‍⬛', title: 'Allied Kingdoms',  render: function(c) { if (window.renderAlliedKingdoms) window.renderAlliedKingdoms(c); else c.innerHTML = '<div class="bp-empty">Rookery module not loaded.</div>'; } },
    };

    // ── Inject CSS ───────────────────────────────────────────────────────
    var style = document.createElement('style');
    style.textContent = '.bp-card{background:rgba(22,33,62,0.6);border:1px solid var(--border-stone,rgba(168,162,153,0.2));border-radius:8px;padding:12px;margin-bottom:8px;cursor:pointer;transition:border-color 0.2s;}'
        + '.bp-card:hover{border-color:rgba(201,169,89,0.5);}.bp-card.bp-expanded{border-color:rgba(201,169,89,0.6);}'
        + '.bp-section-title{font-family:"Crimson Text",serif;font-size:14px;color:rgba(201,169,89,0.9);margin:16px 0 8px;text-transform:uppercase;letter-spacing:0.5px;}'
        + '.bp-row{display:flex;align-items:center;gap:8px;}.bp-status{width:8px;height:8px;border-radius:50%;background:#666;flex-shrink:0;}'
        + '.bp-status.active{background:#4caf50;}.bp-status.idle{background:#ff9800;}.bp-status.thinking{background:#2196f3;animation:bp-pulse 1s infinite;}'
        + '@keyframes bp-pulse{0%,100%{opacity:1}50%{opacity:0.4}}'
        + '.bp-tag{font-size:10px;background:rgba(201,169,89,0.15);border:1px solid rgba(201,169,89,0.3);border-radius:4px;padding:1px 5px;color:rgba(201,169,89,0.8);}'
        + '.bp-btn{background:rgba(201,169,89,0.15);border:1px solid rgba(201,169,89,0.4);color:rgba(201,169,89,0.9);border-radius:6px;padding:5px 12px;cursor:pointer;font-size:12px;}'
        + '.bp-btn:hover{background:rgba(201,169,89,0.25);}.bp-input{width:100%;box-sizing:border-box;background:rgba(15,52,96,0.5);border:1px solid rgba(168,162,153,0.3);border-radius:6px;padding:8px;color:#f4e4bc;font-size:13px;resize:none;}'
        + '.bp-input:focus{outline:none;border-color:rgba(201,169,89,0.5);}.bp-progress-bar{height:4px;background:rgba(168,162,153,0.2);border-radius:2px;margin-top:6px;}'
        + '.bp-progress-fill{height:100%;background:rgba(201,169,89,0.7);border-radius:2px;transition:width 0.4s;}.bp-detail{margin-top:8px;font-size:12px;color:rgba(168,162,153,0.8);}'
        + '.bp-empty{text-align:center;color:rgba(168,162,153,0.5);padding:32px 16px;font-style:italic;}.bp-skill-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}'
        + '.bp-conn-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(168,162,153,0.1);}';
    document.head.appendChild(style);

    // ── Ensure panel DOM exists ─────────────────────────────────────────
    function ensurePanelDOM() {
        if (document.getElementById('building-panel')) return;
        var p = document.createElement('div');
        p.id = 'building-panel';
        p.className = 'building-panel';
        p.innerHTML = [
            '<div class="building-panel-header">',
            '<span id="building-panel-icon"></span>',
            '<span id="building-panel-title"></span>',
            '<button class="panel-close-btn" onclick="closeBuildingPanel()">✕</button>',
            '</div>',
            '<div id="building-panel-content" class="building-panel-content"></div>',
        ].join('');
        document.body.appendChild(p);
    }

    // ── Public: open panel ──────────────────────────────────────────────
    window.openBuildingPanel = function (buildingName) {
        var cfg = BUILDING_PANELS[buildingName];
        if (!cfg) return;

        ensurePanelDOM();
        document.getElementById('building-panel-icon').textContent  = cfg.icon;
        document.getElementById('building-panel-title').textContent = cfg.title;

        var content = document.getElementById('building-panel-content');
        content.innerHTML = '';
        cfg.render(content);

        document.getElementById('building-panel').classList.add('panel-open');

        // Play contextual building sound
        if (window.MedievalBuildingSounds) window.MedievalBuildingSounds.play(buildingName);

        // Golden glow on building group
        var app = window.castleApp;
        if (app && app._buildingGroups) {
            clearBuildingGlow(app);
            var grp = app._buildingGroups[buildingName];
            if (grp) {
                grp.traverse(function (mesh) {
                    if (mesh.isMesh && mesh.material) {
                        mesh.material = mesh.material.clone();
                        mesh.material.emissive = { r: 0.5, g: 0.4, b: 0.0 };
                        mesh.material.emissiveIntensity = 0.6;
                    }
                });
                app._selectedBuilding = grp;
            }
        }
    };

    // ── Public: close panel ─────────────────────────────────────────────
    window.closeBuildingPanel = function () {
        var panel = document.getElementById('building-panel');
        if (panel) panel.classList.remove('panel-open');
        var app = window.castleApp;
        if (app) clearBuildingGlow(app);
    };

    function clearBuildingGlow(app) {
        if (!app._selectedBuilding) return;
        app._selectedBuilding.traverse(function (mesh) {
            if (mesh.isMesh && mesh.material && mesh.material.emissive) {
                mesh.material.emissiveIntensity = 0;
            }
        });
        app._selectedBuilding = null;
    }

    // ── Render: Mission Hall ────────────────────────────────────────────
    function renderMissionHall(container) {
        // Mission Control button
        container.innerHTML = '<button class="bp-btn" id="bp-open-mc" style="width:100%;margin-bottom:12px;">⚔️ Open Mission Control</button><div class="bp-section-title">Active Quests</div>';
        document.getElementById('bp-open-mc').addEventListener('click', function() {
            closeBuildingPanel();
            setTimeout(function() { if (window.openMissionControl) window.openMissionControl(); }, 200);
        });
        var active = document.createElement('div');
        active.id = 'bp-active-missions';
        active.innerHTML = '<div class="bp-empty">Loading missions…</div>';
        container.appendChild(active);

        var histTitle = document.createElement('div');
        histTitle.className = 'bp-section-title';
        histTitle.textContent = 'Mission History';
        container.appendChild(histTitle);

        var hist = document.createElement('div');
        hist.id = 'bp-mission-history';
        hist.innerHTML = '<div class="bp-empty">—</div>';
        container.appendChild(hist);

        var fetcher = (typeof ThemeAuth !== 'undefined' && ThemeAuth.fetch)
            ? ThemeAuth.fetch.bind(ThemeAuth)
            : window.fetch.bind(window);

        fetcher('/api/oc/sessions').then(function (r) { return r.json(); }).then(function (data) {
            var sessions = Array.isArray(data) ? data : (data.sessions || []);
            
            // Filter: only show mission-relevant sessions (sub-agents, spawned tasks)
            // Exclude: channel sessions (telegram, whatsapp, discord), heartbeats, crons
            var channelPatterns = ['telegram', 'whatsapp', 'discord', 'signal', 'slack', 'imessage', 'irc', 'heartbeat', 'cron', 'digest'];
            var missions = sessions.filter(function(s) {
                var key = (s.key || s.id || '').toLowerCase();
                var label = (s.label || '').toLowerCase();
                var kind = (s.kind || '').toLowerCase();
                // Include: sub-agents, spawned sessions, anything with a task/label
                if (kind === 'subagent' || kind === 'spawn') return true;
                // Exclude channel/system sessions
                for (var i = 0; i < channelPatterns.length; i++) {
                    if (key.includes(channelPatterns[i]) || label.includes(channelPatterns[i])) return false;
                }
                // Include main session
                if (key.includes('main')) return true;
                // Include if it has a task description
                if (s.task) return true;
                return false;
            });
            
            // Only show sub-agents and spawned sessions (not main or channel sessions)
            var running = missions.filter(function (s) {
                var kind = (s.kind || '').toLowerCase();
                return (kind === 'subagent' || kind === 'spawn') && (s.status === 'active' || s.status === 'running');
            });
            var done = missions.filter(function (s) {
                var kind = (s.kind || '').toLowerCase();
                return (kind === 'subagent' || kind === 'spawn') && s.status !== 'active' && s.status !== 'running';
            });

            active.innerHTML = running.length ? '' : '<div class="bp-empty">No active quests.</div>';
            running.forEach(function (s) { active.appendChild(missionCard(s)); });

            hist.innerHTML = done.length ? '' : '<div class="bp-empty">No completed quests yet.</div>';
            done.slice(0, 12).forEach(function (s) { hist.appendChild(missionCard(s)); });
        }).catch(function () {
            active.innerHTML = '<div class="bp-empty">Could not load missions.</div>';
        });
    }

    function missionCard(s) {
        var c = document.createElement('div');
        c.className = 'bp-card';
        var label = s.label || s.id || 'Mission';
        var model  = s.model || '';
        var status = s.status || 'unknown';
        c.innerHTML = [
            '<div class="bp-row">',
            '<span class="bp-status ' + (status === 'active' || status === 'running' ? 'active' : '') + '"></span>',
            '<strong style="flex:1;font-size:13px;color:#f4e4bc">' + esc(label) + '</strong>',
            '<span class="bp-tag">' + esc(status) + '</span>',
            '</div>',
            model ? '<div class="bp-detail">Model: ' + esc(model) + '</div>' : '',
        ].join('');
        var detail = document.createElement('div');
        detail.className = 'bp-detail';
        detail.style.display = 'none';
        detail.textContent = s.task || s.description || '';
        c.appendChild(detail);
        c.addEventListener('click', function () {
            var open = detail.style.display !== 'none';
            detail.style.display = open ? 'none' : 'block';
            c.classList.toggle('bp-expanded', !open);
        });
        return c;
    }

    // ── Render: Tavern ──────────────────────────────────────────────────
    function renderTavern(container) {
        container.innerHTML = [
            '<div class="bp-section-title">Brainstorm Room</div>',
            '<textarea class="bp-input" rows="3" placeholder="Type a question to brainstorm…" id="bp-brainstorm-input"></textarea>',
            '<div style="margin:6px 0 16px;text-align:right">',
            '<button class="bp-btn" id="bp-brainstorm-send">🍺 Start Brainstorm</button>',
            '</div>',
            '<div class="bp-section-title">Recent Brainstorms</div>',
            '<div id="bp-brainstorm-list"><div class="bp-empty">Loading past brainstorms…</div></div>',
        ].join('');

        // Load brainstorm history from localStorage + API
        loadBrainstormHistory();

        document.getElementById('bp-brainstorm-send').addEventListener('click', async function () {
            var input = document.getElementById('bp-brainstorm-input');
            var q = input.value.trim();
            if (!q) return;
            var btn = document.getElementById('bp-brainstorm-send');
            btn.disabled = true;
            btn.textContent = '⏳ Consulting the oracle...';
            // Save to localStorage
            saveBrainstorm(q);
            input.value = '';
            // Send to agent via /api/oc/chat
            try {
                var fetcher = (typeof ThemeAuth !== 'undefined' && ThemeAuth.fetch)
                    ? ThemeAuth.fetch.bind(ThemeAuth) : window.fetch.bind(window);
                var resp = await fetcher('/api/oc/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: '/brainstorm ' + q })
                });
                var data = await resp.json();
                // Extract content from OpenAI-format response
                var reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content)
                    ? data.choices[0].message.content
                    : (data.reply || data.text || data.response || 'Sent to agent');
                saveBrainstorm(q + ' → ' + reply.substring(0, 120));
            } catch(e) {
                saveBrainstorm(q + ' → [Queued — agent will respond shortly]');
            }
            loadBrainstormHistory();
            btn.disabled = false;
            btn.textContent = '🍺 Start Brainstorm';
        });
    }

    function saveBrainstorm(question) {
        var history = [];
        try { history = JSON.parse(localStorage.getItem('sk_brainstorms') || '[]'); } catch(e) {}
        history.unshift({ q: question, ts: new Date().toISOString(), source: 'tavern' });
        if (history.length > 50) history = history.slice(0, 50);
        localStorage.setItem('sk_brainstorms', JSON.stringify(history));
    }

    function loadBrainstormHistory() {
        var list = document.getElementById('bp-brainstorm-list');
        if (!list) return;

        // Load local brainstorms
        var local = [];
        try { local = JSON.parse(localStorage.getItem('sk_brainstorms') || '[]'); } catch(e) {}

        // Also fetch recent chat to find /brainstorm and /mr messages
        var fetcher = (typeof ThemeAuth !== 'undefined' && ThemeAuth.fetch) ? ThemeAuth.fetch.bind(ThemeAuth) : window.fetch.bind(window);
        fetcher('/api/oc/chat').then(function(r) { return r.json(); }).then(function(msgs) {
            var arr = Array.isArray(msgs) ? msgs : [];
            // Find brainstorm-related messages
            var brainstorms = arr.filter(function(m) {
                var text = (m.content || m.text || '').toLowerCase();
                return text.startsWith('/brainstorm') || text.startsWith('/mr ') || text.includes('🧠 **brainstorm');
            }).reverse().slice(0, 10);

            // Merge: API brainstorms + local, deduplicated by timestamp proximity
            var merged = local.slice();
            brainstorms.forEach(function(m) {
                var text = m.content || m.text || '';
                var ts = m.timestamp || '';
                var isQuestion = text.startsWith('/');
                merged.push({
                    q: isQuestion ? text.replace(/^\/(brainstorm|mr)\s*/i, '') : text.substring(0, 200),
                    ts: ts,
                    source: isQuestion ? 'telegram' : 'response',
                    role: m.role
                });
            });

            // Sort by timestamp, newest first
            merged.sort(function(a, b) { return (b.ts || '').localeCompare(a.ts || ''); });

            renderBrainstormList(list, merged.slice(0, 20));
        }).catch(function() {
            // Fallback to local only
            renderBrainstormList(list, local);
        });
    }

    function renderBrainstormList(list, items) {
        if (!items.length) {
            list.innerHTML = '<div class="bp-empty">The tavern is quiet… No brainstorms recorded yet.</div>';
            return;
        }
        list.innerHTML = '';
        items.forEach(function(item) {
            var card = document.createElement('div');
            card.className = 'bp-card';
            var icon = item.source === 'telegram' ? '📨' : (item.role === 'assistant' ? '🧠' : '🍺');
            var time = item.ts ? new Date(item.ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
            var text = (item.q || '').substring(0, 300);
            card.innerHTML = '<div style="font-size:12px;color:rgba(201,169,89,0.8)">' + icon + ' ' + esc(text) + '</div>' +
                (time ? '<div style="font-size:10px;color:rgba(168,162,153,0.4);margin-top:4px">' + esc(time) + (item.source === 'telegram' ? ' • via Telegram' : '') + '</div>' : '');
            list.appendChild(card);
        });
    }

    // ── Render: Library ─────────────────────────────────────────────────
    function renderLibrary(container) {
        container.innerHTML = '<div class="bp-section-title">Agents</div><div id="bp-agent-list"><div class="bp-empty">Loading agents…</div></div>';
        var list = document.getElementById('bp-agent-list');

        var agents = null;
        if (window.castleApp && window.castleApp.agents) {
            if (window.castleApp.agents instanceof Map) {
                agents = Array.from(window.castleApp.agents.values());
            } else {
                agents = Object.values(window.castleApp.agents);
            }
        }

        if (agents && agents.length) {
            renderAgentList(list, agents);
        } else {
            var fetcher = (typeof ThemeAuth !== 'undefined' && ThemeAuth.fetch)
                ? ThemeAuth.fetch.bind(ThemeAuth) : window.fetch.bind(window);
            fetcher('/api/oc/agents').then(function (r) { return r.json(); }).then(function (data) {
                var arr = Array.isArray(data) ? data : (data.agents || []);
                renderAgentList(list, arr);
            }).catch(function () {
                list.innerHTML = '<div class="bp-empty">Could not load agents.</div>';
            });
        }
    }

    function renderAgentList(list, agents) {
        list.innerHTML = '';
        if (!agents || !agents.length) {
            list.innerHTML = '<div class="bp-empty">No agents found.</div>';
            return;
        }
        agents.forEach(function (a) {
            var c = document.createElement('div');
            c.className = 'bp-card';
            var statusClass = a.thinking ? 'thinking' : (a.status === 'active' ? 'active' : 'idle');
            c.innerHTML = [
                '<div class="bp-row">',
                '<span class="bp-status ' + statusClass + '"></span>',
                '<span style="font-size:18px">' + esc(a.emoticon || a.emoji || '🤖') + '</span>',
                '<div style="flex:1"><div style="font-size:13px;color:#f4e4bc">' + esc(a.name || a.id) + '</div>',
                '<div style="font-size:11px;color:rgba(168,162,153,0.7)">' + esc(a.role || '') + '</div></div>',
                '</div>',
            ].join('');

            var detail = document.createElement('div');
            detail.style.display = 'none';
            detail.innerHTML = buildAgentDetail(a);
            c.appendChild(detail);
            c.addEventListener('click', function () {
                var open = detail.style.display !== 'none';
                detail.style.display = open ? 'none' : 'block';
                c.classList.toggle('bp-expanded', !open);
            });
            list.appendChild(c);
        });
    }

    function buildAgentDetail(a) {
        var p = a.progress || 0;
        var h = '<div class="bp-detail" style="margin-top:10px">';
        if (a.thinking) h += '<div style="color:#2196f3;margin-bottom:6px">💭 Thinking…</div>';
        h += '<div class="bp-progress-bar"><div class="bp-progress-fill" style="width:' + p + '%"></div></div>';
        h += '<div style="font-size:11px;color:rgba(168,162,153,0.6);margin-bottom:6px">' + p + '% complete</div>';
        if (a.todo && a.todo.length) {
            h += '<div style="font-size:11px;color:rgba(201,169,89,0.7);margin-bottom:4px">Tasks:</div>';
            a.todo.forEach(function (t) { h += '<div style="font-size:11px;padding-left:8px">• ' + esc(t) + '</div>'; });
        }
        if (a.skills && a.skills.length) {
            h += '<div style="font-size:11px;color:rgba(201,169,89,0.7);margin:6px 0 4px">Skills:</div><div class="bp-row" style="flex-wrap:wrap;gap:4px">';
            a.skills.forEach(function (sk) { h += '<span class="bp-tag">' + esc(sk) + '</span>'; });
            h += '</div>';
        }
        return h + '</div>';
    }

    // ── Render: Forge ───────────────────────────────────────────────────
    function renderForge(container) {
        if (window.SkillForge && typeof window.SkillForge.open === 'function') {
            window.SkillForge.open();
            container.innerHTML = '<div class="bp-empty">Skill Forge opened.</div>';
            return;
        }

        // Medieval skill forge UI
        container.innerHTML =
            '<div class="bp-section-title">⚒️ The Forge — Craft a Skill</div>' +
            '<p style="font-size:12px;color:rgba(168,162,153,0.7);margin-bottom:12px;">Forge a custom skill for your knights. Skills are reusable instruction sets.</p>' +
            '<div style="margin-bottom:12px;">' +
            '<label style="font-size:12px;color:rgba(201,169,89,0.8);display:block;margin-bottom:4px;">Skill Name</label>' +
            '<input class="bp-input" id="forge-skill-name" placeholder="e.g. daily-standup" style="margin-bottom:8px;">' +
            '<label style="font-size:12px;color:rgba(201,169,89,0.8);display:block;margin-bottom:4px;">Description</label>' +
            '<input class="bp-input" id="forge-skill-desc" placeholder="What does this skill do?" style="margin-bottom:8px;">' +
            '<label style="font-size:12px;color:rgba(201,169,89,0.8);display:block;margin-bottom:4px;">Instructions</label>' +
            '<textarea class="bp-input" id="forge-skill-instructions" rows="4" placeholder="Step-by-step instructions for the agent..."></textarea>' +
            '</div>' +
            '<button class="bp-btn" id="forge-skill-btn" style="width:100%;margin-bottom:16px;">🔨 Forge Skill</button>' +
            '<div class="bp-section-title">📜 Skill Templates</div>' +
            '<div class="bp-skill-grid">' +
            ['Daily Standup','Code Review','Bug Hunter','Market Scout','Memory Keeper','Report Writer'].map(function(name) {
                return '<div class="bp-card" style="text-align:center;cursor:pointer;" onclick="document.getElementById(\x27forge-skill-name\x27).value=\x27' + name.toLowerCase().replace(/ /g,'-') + '\x27;document.getElementById(\x27forge-skill-desc\x27).value=\x27' + name + ' automation\x27">' +
                    '<div style="font-size:20px">⚙️</div>' +
                    '<div style="font-size:11px;color:#f4e4bc;margin-top:4px">' + name + '</div>' +
                    '</div>';
            }).join('') +
            '</div>';

        var btn = document.getElementById('forge-skill-btn');
        if (btn) {
            btn.addEventListener('click', function() {
                var name = document.getElementById('forge-skill-name').value.trim();
                var desc = document.getElementById('forge-skill-desc').value.trim();
                var instructions = document.getElementById('forge-skill-instructions').value.trim();
                if (!name || !instructions) {
                    btn.textContent = '⚠️ Name + instructions required';
                    setTimeout(function() { btn.textContent = '🔨 Forge Skill'; }, 2000);
                    return;
                }
                // Send to chat as a skill creation request
                var msg = 'Please create a skill named "' + name + '". Description: ' + desc + '. Instructions: ' + instructions;
                if (window.ThemeChat && window.ThemeChat._sendMessage) {
                    window.ThemeChat._sendMessage(msg);
                    var chatEl = document.getElementById('medievalChat');
                    if (chatEl) { chatEl.style.display = 'flex'; chatEl.style.flexDirection = 'column'; }
                }
                btn.textContent = '✨ Skill dispatched to forge!';
                btn.style.background = 'rgba(16,185,129,0.3)';
                setTimeout(function() {
                    btn.textContent = '🔨 Forge Skill';
                    btn.style.background = '';
                    document.getElementById('forge-skill-name').value = '';
                    document.getElementById('forge-skill-desc').value = '';
                    document.getElementById('forge-skill-instructions').value = '';
                }, 2000);
            });
        }
    }

    // ── Render: Market ──────────────────────────────────────────────────
    function renderMarket(container) {
        if (window.SkillMarketplace && typeof window.SkillMarketplace.open === 'function') {
            window.SkillMarketplace.open();
            container.innerHTML = '<div class="bp-empty">Marketplace opened.</div>';
            return;
        }
        container.innerHTML = '<div class="bp-section-title">Available Skills</div><div class="bp-skill-grid" id="bp-skill-grid"><div class="bp-empty">Loading…</div></div>';
        var grid = document.getElementById('bp-skill-grid');
        var fetcher = (typeof ThemeAuth !== 'undefined' && ThemeAuth.fetch)
            ? ThemeAuth.fetch.bind(ThemeAuth) : window.fetch.bind(window);
        fetcher('/api/oc/skills').then(function (r) { return r.json(); }).then(function (data) {
            var skills = Array.isArray(data) ? data : (data.skills || []);
            grid.innerHTML = '';
            if (!skills.length) { grid.innerHTML = '<div class="bp-empty">No skills found.</div>'; return; }
            skills.forEach(function (sk) {
                var c = document.createElement('div');
                c.className = 'bp-card';
                c.innerHTML = '<div style="font-size:18px">' + esc(sk.icon || '⚙️') + '</div><div style="font-size:12px;color:#f4e4bc;margin-top:4px">' + esc(sk.name || sk.id) + '</div>';
                grid.appendChild(c);
            });
        }).catch(function () {
            grid.innerHTML = '<div class="bp-empty">Could not load skills.</div>';
        });
    }

    // ── Render: Settings ────────────────────────────────────────────────
    function renderSettings(container) {
        // Channel status — show real OpenClaw channel + wizard status
        var channelDefs = [
            ['✈️', 'Telegram', 'telegram'],
            ['📱', 'WhatsApp', 'whatsapp'],
            ['🎮', 'Discord', 'discord'],
            ['🔔', 'Signal', 'signal'],
            ['🍎', 'iMessage', 'imessage'],
            ['💼', 'Slack', 'slack'],
        ];
        var rows = channelDefs.map(function(c) {
            var wizardConnected = window.ChannelOnboarding ? window.ChannelOnboarding.isChannelConnected(c[2]) : false;
            // Check if OpenClaw has this channel active (from runtime metadata)
            var ocActive = false;
            if (window._ocChannelInfo) ocActive = !!(window._ocChannelInfo[c[2]]);
            var connected = wizardConnected || ocActive;
            return '<div class="bp-conn-row" style="cursor:pointer;" onclick="' +
                (window.ChannelOnboarding ? 'window.ChannelOnboarding.openQuickConnect(\"' + c[2] + '\")' : '') +
                '">' +
                '<span>' + c[0] + ' ' + c[1] + '</span>' +
                '<span>' + (connected ? '✅ Active' : '<span style="color:rgba(168,162,153,0.4);font-size:11px">Not configured</span>') + '</span>' +
                '</div>';
        }).join('');
        // Fetch real channel info from OC (only once per panel open, skip if already fetched)
        if (!window._ocChannelFetched) {
            window._ocChannelFetched = true;
            (async function() {
                try {
                    var fetcher = (typeof ThemeAuth !== 'undefined' && ThemeAuth.fetch) ? ThemeAuth.fetch.bind(ThemeAuth) : window.fetch.bind(window);
                    var resp = await fetcher('/api/oc/health');
                    if (resp.ok) {
                        var data = await resp.json();
                        var channels = data.channels || data.activeChannels || {};
                        window._ocChannelInfo = channels;
                        // Re-render once with real data, reset fetch flag after
                        if (Object.keys(channels).length > 0) {
                            window._ocChannelFetched = false;
                            renderSettings(container);
                        }
                    }
                } catch(e) {}
                window._ocChannelFetched = false;
            })();
        }

        container.innerHTML =
            '<div class="bp-section-title">⛪ Chapel — Royal Communications</div>' +
            '<p style="font-size:12px;color:rgba(168,162,153,0.7);margin-bottom:12px;">Connect your channels to receive messages from the realm.</p>' +
            '<div style="margin-bottom:12px;">' + rows + '</div>' +
            '<div style="display:flex;gap:8px;margin-bottom:16px;">' +
            '<button class="bp-btn" style="flex:1;" id="bp-open-channel-wizard">⚙️ Channel Wizard</button>' +
            '</div>' +
            '<div class="bp-section-title">🗺️ Realm</div>' +
            '<button class="bp-btn" style="width:100%;margin-bottom:8px;" id="bp-open-allied">🏰 Allied Kingdoms (Rookery)</button>' +
            '<button class="bp-btn" style="width:100%;margin-bottom:8px;border-color:rgba(201,169,89,.4);color:rgba(201,169,89,.9);" id="bp-open-wizard">📜 Forge Agent Blueprint</button>' +
            '<button class="bp-btn" style="width:100%;margin-bottom:8px;" id="bp-open-theme-switcher">🎨 Switch Theme / Realm</button>' +
            '<div style="font-size:11px;color:rgba(168,162,153,0.5);text-align:center;">Medieval Castle · v4.1</div>';

        var wizBtn = document.getElementById('bp-open-channel-wizard');
        if (wizBtn) {
            wizBtn.addEventListener('click', function() {
                if (window.ChannelOnboarding) window.ChannelOnboarding.open();
            });
        }
        var wizardBtn = document.getElementById('bp-open-wizard');
        if (wizardBtn) {
            wizardBtn.addEventListener('click', function() {
                closeBuildingPanel();
                setTimeout(function() { if (window.SetupWizard) window.SetupWizard.open('medieval'); }, 200);
            });
        }
        var alliedBtn = document.getElementById('bp-open-allied');
        if (alliedBtn) {
            alliedBtn.addEventListener('click', function() {
                closeBuildingPanel();
                setTimeout(function() { if (typeof window.openBuildingPanel === 'function') window.openBuildingPanel('🏰 Rookery'); }, 200);
            });
        }
        var themeBtn = document.getElementById('bp-open-theme-switcher');
        if (themeBtn) {
            themeBtn.addEventListener('click', function() {
                var overlay = document.getElementById('themeSwitcherOverlay');
                if (overlay) {
                    overlay.style.display = 'flex';
                    setTimeout(function() { overlay.classList.add('visible'); }, 50);
                }
            });
        }
    }

    // ── Utility ─────────────────────────────────────────────────────────
    function esc(str) {
        return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    // ── Hook into building click ─────────────────────────────────────────
    var BUILDING_DEFS = [
        { name: '⚔️ Mission Hall', x: -10, z: 20 },
        { name: '🍺 Tavern',        x: -4,  z: 23 },
        { name: '📚 Library',       x: 4,   z: 22 },
        { name: '🔨 Forge Workshop',x: 10,  z: 20 },
        { name: '🏪 Market',        x: 6,   z: 26 },
        { name: '🏠 Chapel',        x: -8,  z: 26 },
    ];

    function patchBuildingClick(app) {
        if (!app._buildingGroups) {
            app._buildingGroups = {};
            var groups = app.scene.children.filter(function (o) { return o.isGroup; });
            BUILDING_DEFS.forEach(function (def) {
                var match = groups.find(function (g) {
                    return Math.abs(g.position.x - def.x) < 0.5 && Math.abs(g.position.z - def.z) < 0.5;
                });
                if (match) {
                    match.userData.buildingName = def.name;
                    app._buildingGroups[def.name] = match;
                }
            });
        }

        // Patch onSceneClick
        var origClick = app.onSceneClick.bind(app);
        app.onSceneClick = function (event) {
            var ndc = app.getMouseNDC(event);
            app.raycaster.setFromCamera(ndc, app.camera);

            var buildingMeshes = [];
            Object.values(app._buildingGroups || {}).forEach(function (grp) {
                grp.traverse(function (m) { if (m.isMesh) buildingMeshes.push(m); });
            });

            if (buildingMeshes.length) {
                var hits = app.raycaster.intersectObjects(buildingMeshes, false);
                if (hits.length) {
                    var obj = hits[0].object;
                    while (obj && !obj.userData.buildingName) obj = obj.parent;
                    if (obj && obj.userData.buildingName) {
                        window.openBuildingPanel(obj.userData.buildingName);
                        return; // consumed
                    }
                }
            }
            origClick(event);
        };
    }

    // ── Init: wait for castleApp ─────────────────────────────────────────
    function init() {
        ensurePanelDOM();
        var app = window.castleApp;
        if (app && app.scene && typeof app.onSceneClick === 'function') {
            patchBuildingClick(app);
        } else {
            var attempts = 0;
            var poll = setInterval(function () {
                attempts++;
                var a = window.castleApp;
                if (a && a.scene && typeof a.onSceneClick === 'function') {
                    clearInterval(poll);
                    patchBuildingClick(a);
                } else if (attempts > 60) {
                    clearInterval(poll);
                    console.warn('[medieval-panels] castleApp not ready after 30s');
                }
            }, 500);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
