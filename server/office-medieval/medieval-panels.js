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
        container.innerHTML = '<div class="bp-section-title">Current Missions</div>';
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
            var running = sessions.filter(function (s) { return s.status === 'active' || s.status === 'running'; });
            var done    = sessions.filter(function (s) { return s.status !== 'active' && s.status !== 'running'; });

            active.innerHTML = running.length ? '' : '<div class="bp-empty">No active missions.</div>';
            running.forEach(function (s) { active.appendChild(missionCard(s)); });

            hist.innerHTML = done.length ? '' : '<div class="bp-empty">No history yet.</div>';
            done.slice(0, 8).forEach(function (s) { hist.appendChild(missionCard(s)); });
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
            '<div id="bp-brainstorm-list"><div class="bp-empty">The tavern is quiet… Start a brainstorm from the hotbar.</div></div>',
        ].join('');

        document.getElementById('bp-brainstorm-send').addEventListener('click', function () {
            var input = document.getElementById('bp-brainstorm-input');
            var q = input.value.trim();
            if (!q) return;
            var list = document.getElementById('bp-brainstorm-list');
            var card = document.createElement('div');
            card.className = 'bp-card';
            card.innerHTML = '<div style="font-size:12px;color:rgba(201,169,89,0.8)">🍺 ' + esc(q) + '</div>';
            if (list.querySelector('.bp-empty')) list.innerHTML = '';
            list.prepend(card);
            input.value = '';
        });
    }

    // ── Render: Library ─────────────────────────────────────────────────
    function renderLibrary(container) {
        container.innerHTML = '<div class="bp-section-title">Agents</div><div id="bp-agent-list"><div class="bp-empty">Loading agents…</div></div>';
        var list = document.getElementById('bp-agent-list');

        var agents = (window.castleApp && window.castleApp.agents)
            ? Object.values(window.castleApp.agents)
            : null;

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
        } else {
            container.innerHTML = '<div class="bp-empty">⚒️ Skill Forge coming soon…</div>';
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
        if (window.ThemeCustomize && typeof window.ThemeCustomize.open === 'function') window.ThemeCustomize.open();
        var conns = [['✉️','Telegram','telegram'],['📱','WhatsApp','whatsapp'],['🎮','Discord','discord'],['🔌','API','api']];
        var rows = conns.map(function (c) {
            var on = window.OC_CONNECTIONS && window.OC_CONNECTIONS[c[2]];
            return '<div class="bp-conn-row"><span>' + c[0] + ' ' + c[1] + '</span><span>' + (on ? '✅' : '❌') + '</span></div>';
        }).join('');
        container.innerHTML = '<div class="bp-section-title">Connections</div><div style="margin-bottom:16px">' + rows + '</div>'
            + '<div class="bp-section-title">Theme</div><div class="bp-card" style="cursor:default">'
            + '<div style="font-size:12px;color:rgba(168,162,153,0.7)">Theme: Medieval Castle</div>'
            + '<div style="font-size:12px;color:rgba(168,162,153,0.7);margin-top:4px">Version: v4.0</div></div>';
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
