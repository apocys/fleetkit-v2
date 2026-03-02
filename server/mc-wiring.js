(function() {
    'use strict';

    var mcOverlay = document.getElementById('missionControlOverlay');
    var mcBack = document.getElementById('mcBack');
    var mcLeft = document.getElementById('mcLeftCol');
    var mcCenter = document.getElementById('mcCenterCol');
    var mcRight = document.getElementById('mcRightCol');
    var mcStatus = document.getElementById('mcStatusBar');
    var API_URL = window.OC_API_URL || (window.location.hostname.includes('spawnkit.ai') ? window.location.origin : 'http://127.0.0.1:8222');
    var mcRefreshTimer = null;
    var mcFeedMode = 'filtered'; // 'filtered' or 'raw'
    var mcTodoExpanded = false;
    var mcTodoContent = null; // cache loaded TODO content
    var mcTranscriptContent = null; // cache loaded transcript

    function escMc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    // ── Open/Close ──
    window.openMissionControl = function() {
        if (mcRefreshTimer) { clearInterval(mcRefreshTimer); mcRefreshTimer = null; }
        mcOverlay.style.display = 'flex';
        requestAnimationFrame(function() { mcOverlay.classList.add('visible'); });
        loadMissionControl();
        mcRefreshTimer = setInterval(loadMissionControl, 15000);
    };
    window.addEventListener('beforeunload', function() {
        if (mcRefreshTimer) { clearInterval(mcRefreshTimer); mcRefreshTimer = null; }
    });

    function closeMissionControl() {
        mcOverlay.classList.remove('visible');
        setTimeout(function() { mcOverlay.style.display = 'none'; }, 300);
        if (mcRefreshTimer) { clearInterval(mcRefreshTimer); mcRefreshTimer = null; }
    }

    mcBack.addEventListener('click', closeMissionControl);

    // ESC to close
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && mcOverlay.classList.contains('visible')) closeMissionControl();
    });

    // CEO click interception is handled inside openDetailPanel() directly

    // ── Main loader ──
    var mcLoading = false;
    async function loadMissionControl() {
        if (mcLoading) return;
        mcLoading = true;
        var sessions = [];
        try {
            var resp = await fetch(API_URL + '/api/oc/sessions');
            if (resp.ok) sessions = await resp.json();
        } catch(e) {
            console.warn('[MC] Failed to load sessions:', e.message || e);
        }
        try {
            renderLeftColumn(sessions);
            renderCenterColumn(sessions);
            renderRightColumn(sessions);
            renderStatusBar(sessions);
        } catch(renderErr) {
            console.error('[MC] Render error:', renderErr);
        } finally {
            mcLoading = false;
        }
    }

    // ═══ LEFT COLUMN — Progression ═══
    function renderLeftColumn(sessions) {
        var html = '';

        // Parse TODO.md into structured tasks
        function parseTodoMd(raw) {
            if (!raw) return { active: [], done: [], queued: [] };
            var lines = raw.split('\n');
            var active = [], done = [], queued = [];
            var currentSection = '';
            var inQueued = false;
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                if (/^##\s/.test(line)) {
                    if (/Queued/i.test(line)) inQueued = true;
                    else if (/Completed/i.test(line) || /🟢/.test(line)) inQueued = false;
                    else inQueued = false;
                }
                if (/^###\s/.test(line)) currentSection = line.replace(/^###\s*/, '').replace(/\|.*/, '').trim();
                // Active items: >>> NEXT or 🔴 or ⬜
                if (/>>>\s*NEXT/.test(line)) {
                    active.unshift({ text: currentSection || line.replace(/^.*>>>\s*NEXT:?\s*/, ''), status: 'next', icon: '🔥' });
                } else if (/^- 🔴/.test(line)) {
                    active.push({ text: line.replace(/^- 🔴\s*/, '').replace(/\*\*/g, ''), status: 'blocked', icon: '🔴' });
                } else if (/^- ⬜/.test(line) && !inQueued) {
                    active.push({ text: line.replace(/^- ⬜\s*/, '').replace(/\*\*/g, ''), status: 'todo', icon: '⬜' });
                } else if (/^- ✅/.test(line) && !inQueued) {
                    done.push({ text: line.replace(/^- ✅\s*/, '').replace(/\*\*/g, ''), status: 'done' });
                } else if (/^- ⬜/.test(line) && inQueued) {
                    queued.push({ text: line.replace(/^- ⬜\s*/, '').replace(/\*\*/g, ''), status: 'queued', icon: '📋' });
                }
            }
            return { active: active.slice(0, 8), done: done.slice(0, 5), queued: queued.slice(0, 6) };
        }

        // Load TODO from API (cached in mcTodoContent)
        if (!mcTodoContent) {
            var apiUrl = (window.OC_API_URL || (window.location.hostname.includes('spawnkit.ai') ? window.location.origin : 'http://127.0.0.1:8222'));
            fetch(apiUrl + '/api/oc/memory').then(function(r) { return r.ok ? r.json() : null; }).then(function(data) {
                if (data && data.todo) { mcTodoContent = data.todo; renderLeftColumn(sessions); }
            }).catch(function() {});
        }
        var todoData = parseTodoMd(mcTodoContent);

        // Active tasks from TODO.md
        html += '<div class="mc-section-title">🎯 Active Tasks (' + todoData.active.length + ')</div>';

        if (todoData.active.length === 0 && !mcTodoContent) {
            html += '<div style="padding:16px;text-align:center;color:var(--text-tertiary);font-size:12px;">Loading tasks from TODO.md...</div>';
        } else if (todoData.active.length === 0) {
            html += '<div style="padding:16px;text-align:center;color:var(--text-tertiary);font-size:12px;">No active tasks. All clear! 🎉</div>';
        }

        todoData.active.forEach(function(t) {
            var statusColor = t.status === 'next' ? '#FF9500' : t.status === 'blocked' ? '#FF3B30' : 'var(--exec-blue)';
            var statusLabel = t.status === 'next' ? 'NEXT' : t.status === 'blocked' ? 'BLOCKED' : 'TODO';
            html += '<div class="mc-task-row" style="padding:8px 10px;margin-bottom:4px;border-radius:8px;background:rgba(0,0,0,0.03);">';
            html += '<span style="margin-right:6px;">' + t.icon + '</span>';
            html += '<span class="mc-task-name" style="flex:1;font-size:12px;">' + escMc(t.text.substring(0, 80)) + '</span>';
            html += '<span style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;background:' + statusColor + '22;color:' + statusColor + ';">' + statusLabel + '</span>';
            html += '</div>';
        });

        // Recently completed
        if (todoData.done.length > 0) {
            html += '<div class="mc-section-title" style="margin-top:12px;">✅ Recently Done (' + todoData.done.length + ')</div>';
            todoData.done.slice(0, 3).forEach(function(m) {
                html += '<div style="padding:5px 10px;border-radius:8px;background:rgba(48,209,88,0.06);margin-bottom:3px;font-size:11px;color:var(--text-tertiary);">' + escMc(m.text.substring(0, 60)) + '</div>';
            });
        }

        // Queued
        if (todoData.queued.length > 0) {
            html += '<div class="mc-section-title" style="margin-top:12px;">📋 Queued (' + todoData.queued.length + ')</div>';
            todoData.queued.slice(0, 4).forEach(function(m) {
                html += '<div style="padding:5px 10px;border-radius:8px;background:rgba(0,122,255,0.04);margin-bottom:3px;font-size:11px;color:var(--text-secondary);">📋 ' + escMc(m.text.substring(0, 60)) + '</div>';
            });
        }

        // TODO.md raw — preserve expanded state across refreshes
        html += '<div class="mc-section-title" style="margin-top:16px;">📋 Backlog (TODO.md)</div>';
        html += '<div class="mc-todo-toggle" id="mcTodoToggle">' + (mcTodoExpanded ? '▾ Hide raw backlog' : '▸ Show raw backlog') + '</div>';
        html += '<div class="mc-todo-raw" id="mcTodoRaw" style="display:' + (mcTodoExpanded ? 'block' : 'none') + ';">' + escMc(mcTodoContent || 'Click to load...') + '</div>';

        mcLeft.innerHTML = html;

        // Wire mission expand
        mcLeft.querySelectorAll('.mc-mission').forEach(function(card) {
            card.addEventListener('click', function(e) {
                if (e.target.type === 'checkbox') return;
                card.classList.toggle('expanded');
            });
        });

        // Wire task checkboxes via delegation
        mcLeft.addEventListener('change', function(e) {
            if (!e.target.classList.contains('mc-task-check')) return;
            var midx = parseInt(e.target.dataset.midx);
            var tidx = parseInt(e.target.dataset.tidx);
            var ms = [];
            try { ms = JSON.parse(localStorage.getItem('spawnkit-missions') || '[]'); } catch(e2) { ms = []; }
            if (!Array.isArray(ms)) ms = [];
            var active = ms.filter(function(m) { return m.status !== 'done'; });
            if (active[midx] && active[midx].todos[tidx]) {
                active[midx].todos[tidx].done = e.target.checked;
                localStorage.setItem('spawnkit-missions', JSON.stringify(ms));
            }
        });

        // Wire TODO.md toggle — use state vars to survive re-renders
        (function wireTodo() {
            var toggle = document.getElementById('mcTodoToggle');
            if (!toggle) return;
            toggle.addEventListener('click', function() {
                mcTodoExpanded = !mcTodoExpanded;
                var r = document.getElementById('mcTodoRaw');
                var t = document.getElementById('mcTodoToggle');
                if (r) r.style.display = mcTodoExpanded ? 'block' : 'none';
                if (t) t.textContent = mcTodoExpanded ? '▾ Hide raw backlog' : '▸ Show raw backlog';
                if (mcTodoExpanded && !mcTodoContent) {
                    if (r) r.textContent = 'Loading...';
                    fetch(API_URL + '/api/oc/memory').then(function(resp) { return resp.ok ? resp.json() : null; }).then(function(data) {
                        if (data && data.todo) {
                            mcTodoContent = data.todo;
                        } else {
                            mcTodoContent = '(Could not load TODO.md)';
                        }
                        var el = document.getElementById('mcTodoRaw');
                        if (el) el.textContent = mcTodoContent;
                    }).catch(function() {
                        mcTodoContent = '(Offline)';
                        var el = document.getElementById('mcTodoRaw');
                        if (el) el.textContent = mcTodoContent;
                    });
                }
            });
        })();
    }

    // ═══ CENTER COLUMN — Activity Feed ═══
    function renderCenterColumn(sessions) {
        var html = '';

        // Toggle: Filtered / Raw
        html += '<div class="mc-feed-toggle">';
        html += '<button class="mc-feed-toggle-btn ' + (mcFeedMode === 'filtered' ? 'active' : '') + '" data-mode="filtered">📊 Activity</button>';
        html += '<button class="mc-feed-toggle-btn ' + (mcFeedMode === 'raw' ? 'active' : '') + '" data-mode="raw">📜 Raw Transcript</button>';
        html += '</div>';

        if (mcFeedMode === 'filtered') {
            html += '<div id="mcFeedList">';
            html += renderActivityFeed(sessions);
            html += '</div>';
            html += '<div class="mc-raw-transcript" id="mcRawTranscript"></div>';
        } else {
            html += '<div id="mcFeedList" style="display:none;"></div>';
            html += '<div class="mc-raw-transcript" id="mcRawTranscript" style="display:block;">Loading transcript...</div>';
        }

        mcCenter.innerHTML = html;

        // Wire toggle
        mcCenter.querySelectorAll('.mc-feed-toggle-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                mcFeedMode = btn.dataset.mode;
                renderCenterColumn(sessions);
                if (mcFeedMode === 'raw') loadRawTranscript();
            });
        });

        // Wire feed item expand
        mcCenter.querySelectorAll('.mc-feed-item').forEach(function(item) {
            item.style.cursor = 'pointer';
            item.addEventListener('click', function() { item.classList.toggle('expanded'); });
        });

        if (mcFeedMode === 'raw') loadRawTranscript();
    }

    function renderActivityFeed(sessions) {
        var events = [];
        var arr = Array.isArray(sessions) ? sessions : [];

        // Extract events from sessions
        arr.forEach(function(s) {
            var name = (s.label || s.displayName || s.key || 'unknown').replace(/^Cron:\s*/i, '');

            if (s.kind === 'subagent') {
                events.push({
                    time: s.lastActive || 0,
                    icon: s.status === 'active' ? '🤖' : '✅',
                    text: (s.status === 'active' ? 'Agent running: ' : 'Agent completed: ') + name,
                    detail: 'Model: ' + (s.model || '—') + ' · Tokens: ' + (s.totalTokens || 0).toLocaleString(),
                    type: 'spawn'
                });
            } else if (s.kind === 'cron' && !(s.key && s.key.indexOf(':run:') >= 0)) {
                events.push({
                    time: s.lastActive || 0,
                    icon: '⏰',
                    text: 'Cron: ' + name,
                    detail: 'Status: ' + (s.status || '—') + ' · Tokens: ' + (s.totalTokens || 0).toLocaleString(),
                    type: 'cron'
                });
            } else if (s.key === 'agent:main:main') {
                events.push({
                    time: s.lastActive || 0,
                    icon: '👑',
                    text: 'CEO session active',
                    detail: 'Tokens: ' + (s.totalTokens || 0).toLocaleString() + ' · Channel: ' + (s.channel || '—'),
                    type: 'ceo'
                });
            }
        });

        // Sort by time descending
        events.sort(function(a, b) { return b.time - a.time; });

        if (events.length === 0) {
            return '<div style="text-align:center;padding:32px;color:var(--text-tertiary);font-size:13px;">No activity yet.<br>Events will appear as the CEO works.</div>';
        }

        var html = '';
        events.slice(0, 50).forEach(function(ev) {
            var ago = Date.now() - ev.time;
            var agoStr = ago < 60000 ? 'just now' :
                ago < 3600000 ? Math.floor(ago / 60000) + 'm ago' :
                ago < 86400000 ? Math.floor(ago / 3600000) + 'h ago' :
                Math.floor(ago / 86400000) + 'd ago';

            html += '<div class="mc-feed-item">';
            html += '<span class="mc-feed-icon">' + ev.icon + '</span>';
            html += '<div class="mc-feed-body">';
            html += '<div class="mc-feed-text">' + escMc(ev.text) + '</div>';
            html += '<div class="mc-feed-time">' + agoStr + '</div>';
            if (ev.detail) html += '<div class="mc-feed-detail">' + escMc(ev.detail) + '</div>';
            html += '</div></div>';
        });
        return html;
    }

    async function loadRawTranscript() {
        var el = document.getElementById('mcRawTranscript');
        if (!el) return;
        if (mcTranscriptContent) { el.textContent = mcTranscriptContent; return; }
        el.textContent = 'Loading transcript...';
        try {
            var resp = await fetch(API_URL + '/api/oc/chat');
            if (resp.ok) {
                var data = await resp.json();
                var messages = data.messages || data || [];
                if (Array.isArray(messages) && messages.length > 0) {
                    var text = '';
                    messages.slice(-50).forEach(function(m) {
                        var role = m.role === 'user' ? '👤 Kira' : '🤖 ApoMac';
                        var content = typeof m.content === 'string' ? m.content : (m.content && m.content[0] && m.content[0].text ? m.content[0].text : '[tool call]');
                        text += role + ':\n' + content.substring(0, 500) + '\n\n';
                    });
                    mcTranscriptContent = text || '(Empty transcript)';
                } else {
                    mcTranscriptContent = '(No messages in transcript)';
                }
            } else {
                mcTranscriptContent = '(Could not fetch transcript — HTTP ' + resp.status + ')';
            }
        } catch(e) { mcTranscriptContent = '(Offline — connect API bridge)'; }
        var el2 = document.getElementById('mcRawTranscript');
        if (el2) el2.textContent = mcTranscriptContent;
    }

    // ═══ RIGHT COLUMN — Context ═══
    function renderRightColumn(sessions) {
        var html = '';
        var arr = Array.isArray(sessions) ? sessions : [];

        // Fleet status pastilles
        var fleetAgents = ['ceo', 'atlas', 'forge', 'hunter', 'echo', 'sentinel'];
        html += '<div class="mc-section-title">🏢 Fleet Status</div>';
        html += '<div class="mc-fleet-grid">';
        fleetAgents.forEach(function(id) {
            var agent = (typeof AGENTS !== 'undefined' && AGENTS[id]) ? AGENTS[id] : { name: id, status: 'idle' };
            // Check live status
            var liveSession = arr.find(function(s) {
                if (id === 'ceo') return s.key === 'agent:main:main';
                return s.label && s.label.toLowerCase().indexOf(id) >= 0 && s.kind === 'subagent';
            });
            var isActive = liveSession ? liveSession.status === 'active' : agent.status === 'active';
            var dotColor = isActive ? '#30D158' : '#8E8E93';

            html += '<div class="mc-fleet-pill" data-agent="' + escMc(id) + '">';
            html += '<div class="mc-fleet-pill-dot" style="background:' + dotColor + ';' + (isActive ? 'animation:statusPulse 2.5s infinite;' : '') + '"></div>';
            html += '<div class="mc-fleet-pill-name">' + escMc(agent.name || id) + '</div>';
            html += '</div>';
        });
        html += '</div>';

        // Active sub-agents
        var subs = arr.filter(function(s) { return s.kind === 'subagent'; });
        subs.sort(function(a, b) { return (b.lastActive || 0) - (a.lastActive || 0); });
        var activeSubs = subs.filter(function(s) { return s.status === 'active'; });

        html += '<div class="mc-section-title" style="margin-top:12px;">🤖 Sub-Agents (' + subs.length + ' total, ' + activeSubs.length + ' active)</div>';

        if (subs.length === 0) {
            html += '<div style="font-size:12px;color:var(--text-tertiary);padding:8px 0;">No sub-agents spawned yet.</div>';
        } else {
            var showSubs = activeSubs.concat(subs.filter(function(s) { return s.status !== 'active'; })).slice(0, 8);
            showSubs.forEach(function(s) {
                var isAct = s.status === 'active';
                var ago = Date.now() - (s.lastActive || 0);
                var agoStr = ago < 60000 ? 'now' : ago < 3600000 ? Math.floor(ago/60000) + 'm' : Math.floor(ago/3600000) + 'h';
                var label = (s.label || s.displayName || 'sub-agent').replace(/^Cron:\s*/i, '');

                html += '<div class="mc-sub-item">';
                html += '<div class="mc-sub-dot" style="background:' + (isAct ? '#30D158' : '#8E8E93') + ';' + (isAct ? 'animation:statusPulse 2.5s infinite;' : '') + '"></div>';
                html += '<div class="mc-sub-name">' + escMc(label) + '</div>';
                html += '<div class="mc-sub-meta">' + agoStr + '</div>';
                html += '</div>';
            });
            if (subs.length > 8) html += '<div style="font-size:10px;color:var(--text-tertiary);padding:4px 0;">+' + (subs.length - 8) + ' more</div>';
        }

        // Skills
        html += '<div class="mc-section-title" style="margin-top:12px;">⚡ Skills</div>';
        html += '<div style="display:flex;flex-wrap:wrap;gap:4px;">';
        var skillList = ['brainstorm','ralph-loop','coding-agent','github','weather','summarize','gog','peekaboo','1password','apple-notes','sag','imsg'];
        skillList.forEach(function(sk) {
            html += '<span style="font-size:10px;padding:3px 8px;border-radius:4px;background:rgba(0,122,255,0.08);color:var(--exec-blue);font-weight:500;">' + escMc(sk) + '</span>';
        });
        html += '</div>';

        mcRight.innerHTML = html;

        // Wire fleet pills → close MC and open agent detail
        mcRight.querySelectorAll('.mc-fleet-pill').forEach(function(pill) {
            pill.addEventListener('click', function() {
                var agentId = pill.dataset.agent;
                if (agentId === 'ceo') return; // Already in CEO panel
                closeMissionControl();
                setTimeout(function() {
                    if (typeof openDetailPanel === 'function') openDetailPanel(agentId);
                }, 350);
            });
        });
    }

    // ═══ STATUS BAR ═══
    function renderStatusBar(sessions) {
        var arr = Array.isArray(sessions) ? sessions : [];
        var totalTokens = 0;
        arr.forEach(function(s) { totalTokens += s.totalTokens || 0; });

        var mainSession = arr.find(function(s) { return s.key === 'agent:main:main'; });
        var model = mainSession ? (mainSession.model || 'unknown') : 'unknown';
        var activeSessions = arr.filter(function(s) { return s.status === 'active'; }).length;
        var connected = arr.length > 0;

        var html = '';
        html += '<div class="mc-statusbar-item"><div class="mc-statusbar-dot" style="background:' + (connected ? '#30D158' : '#FF453A') + '"></div>' + (connected ? 'Connected' : 'Offline') + '</div>';
        html += '<div class="mc-statusbar-item">Model: <strong>' + escMc(model) + '</strong></div>';
        html += '<div class="mc-statusbar-item">Total tokens: <strong>' + totalTokens.toLocaleString() + '</strong></div>';
        html += '<div class="mc-statusbar-item">Active sessions: <strong>' + activeSessions + '</strong></div>';
        html += '<div class="mc-statusbar-item">Sessions: <strong>' + arr.length + '</strong></div>';
        mcStatus.innerHTML = html;
    }
})();
