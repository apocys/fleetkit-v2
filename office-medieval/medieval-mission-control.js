(function() {
    'use strict';

    // Mission Control globals
    var mcOverlay = document.getElementById('missionControlOverlay');
    var mcBack = document.getElementById('mcBack');
    var mcLeft = document.getElementById('mcLeftCol');
    var mcCenter = document.getElementById('mcCenterCol');
    var mcRight = document.getElementById('mcRightCol');
    var mcStatus = document.getElementById('mcStatusBar');
    var mcRefreshTimer = null;
    var mcFeedMode = 'filtered'; // 'filtered' or 'raw'
    var mcTodoExpanded = false;
    var mcTodoContent = null;
    var mcTranscriptContent = null;

    // Medieval themed agents
    var MEDIEVAL_AGENTS = {
        ceo: { name: 'ApoMac', title: 'King', icon: '👑' },
        atlas: { name: 'Atlas', title: 'Royal Scribe', icon: '📜' },
        forge: { name: 'Forge', title: 'Master Smith', icon: '⚒️' },
        hunter: { name: 'Hunter', title: 'Royal Huntsman', icon: '🏹' },
        echo: { name: 'Echo', title: 'Court Bard', icon: '🎭' },
        sentinel: { name: 'Sentinel', title: 'Castle Guard', icon: '🛡️' }
    };

    function escMc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    // Open/Close Mission Control
    window.openMissionControl = function() {
        if (mcRefreshTimer) { clearInterval(mcRefreshTimer); mcRefreshTimer = null; }
        mcOverlay.style.display = 'flex';
        requestAnimationFrame(function() { mcOverlay.classList.add('visible'); });
        loadMissionControl();
        mcRefreshTimer = setInterval(loadMissionControl, 15000);
    };

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

    // F13+F14 hotkeys for Mission Control
    document.addEventListener('keydown', function(e) {
        if ((e.key === 'F13' || e.key === 'F14') && !mcOverlay.classList.contains('visible')) {
            e.preventDefault();
            openMissionControl();
        }
    });

    // Main loader with API integration
    var mcLoading = false;
    async function loadMissionControl() {
        if (mcLoading) return;
        mcLoading = true;
        var sessions = [];
        try {
            var resp = await ThemeAuth.fetch(API_URL + '/api/oc/sessions');
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

    // ═══ LEFT COLUMN — Royal Quests & Missions ═══
    function renderLeftColumn(sessions) {
        var html = '';

        // Active missions from localStorage
        var missions = [];
        try { missions = JSON.parse(localStorage.getItem('spawnkit-missions') || '[]'); } catch(e) { missions = []; }
        if (!Array.isArray(missions)) missions = [];
        var activeMissions = missions.filter(function(m) { return m.status !== 'done'; });
        var doneMissions = missions.filter(function(m) { return m.status === 'done'; });

        html += '<div class="mc-section-title">⚔️ Royal Quests (' + activeMissions.length + ')</div>';

        if (activeMissions.length === 0) {
            html += '<div style="padding:16px;text-align:center;color:var(--castle-stone-light);font-size:12px;">No active quests.<br>The realm is at peace.</div>';
        }

        activeMissions.forEach(function(m, idx) {
            var todos = m.todos || [];
            var done = todos.filter(function(t) { return t.done; }).length;
            var total = todos.length;
            var pct = total > 0 ? Math.round(done / total * 100) : 0;

            html += '<div class="mc-mission" data-midx="' + idx + '">';
            html += '<div class="mc-mission-name">' + escMc(m.name) + '</div>';
            html += '<div class="mc-mission-meta">';
            if (m.agents && m.agents.length) {
                m.agents.forEach(function(aId) {
                    var a = MEDIEVAL_AGENTS[aId] || { name: aId };
                    html += '<span class="mc-task-assignee">' + escMc(a.name) + '</span>';
                });
            }
            html += '<span>' + done + '/' + total + ' tasks</span>';
            html += '</div>';
            html += '<div class="mc-progress"><div class="mc-progress-fill" style="width:' + pct + '%"></div></div>';

            // Task table (expandable)
            html += '<div class="mc-mission-tasks">';
            todos.forEach(function(t) {
                var st = t.done ? 'done' : (t.review ? 'review' : (t.active ? 'active' : 'pending'));
                html += '<div class="mc-task-row">';
                html += '<input type="checkbox" ' + (t.done ? 'checked' : '') + ' class="mc-task-check" data-midx="' + idx + '" data-tidx="' + todos.indexOf(t) + '" />';
                html += '<span class="mc-task-name">' + escMc(t.text) + '</span>';
                if (t.assignee) html += '<span class="mc-task-assignee">' + escMc(t.assignee) + '</span>';
                html += '<span class="mc-task-status mc-task-status--' + st + '">' + st.toUpperCase() + '</span>';
                html += '</div>';
            });
            html += '</div>';
            html += '</div>';
        });

        // Completed missions
        if (doneMissions.length > 0) {
            html += '<div class="mc-section-title" style="margin-top:16px;">✅ Completed (' + doneMissions.length + ')</div>';
            doneMissions.forEach(function(m) {
                html += '<div style="padding:6px 10px;border-radius:8px;background:rgba(74, 222, 128, 0.1);margin-bottom:4px;font-size:12px;color:var(--castle-stone-light);text-decoration:line-through;">' + escMc(m.name) + '</div>';
            });
        }

        // Royal Scrolls (TODO.md)
        html += '<div class="mc-section-title" style="margin-top:16px;">📜 Royal Scrolls</div>';
        html += '<div class="mc-todo-toggle" id="mcTodoToggle">' + (mcTodoExpanded ? '▾ Hide scrolls' : '▸ Show scrolls') + '</div>';
        html += '<div class="mc-todo-raw" id="mcTodoRaw" style="display:' + (mcTodoExpanded ? 'block' : 'none') + ';">' + escMc(mcTodoContent || 'Click to reveal ancient texts...') + '</div>';

        mcLeft.innerHTML = html;

        // Wire mission expand
        mcLeft.querySelectorAll('.mc-mission').forEach(function(card) {
            card.addEventListener('click', function(e) {
                if (e.target.type === 'checkbox') return;
                card.classList.toggle('expanded');
            });
        });

        // Wire task checkboxes
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

        // Wire TODO.md toggle
        (function wireTodo() {
            var toggle = document.getElementById('mcTodoToggle');
            if (!toggle) return;
            toggle.addEventListener('click', function() {
                mcTodoExpanded = !mcTodoExpanded;
                var r = document.getElementById('mcTodoRaw');
                var t = document.getElementById('mcTodoToggle');
                if (r) r.style.display = mcTodoExpanded ? 'block' : 'none';
                if (t) t.textContent = mcTodoExpanded ? '▾ Hide scrolls' : '▸ Show scrolls';
                if (mcTodoExpanded && !mcTodoContent) {
                    if (r) r.textContent = 'Consulting the ancient archives...';
                    ThemeAuth.fetch(API_URL + '/api/oc/memory').then(function(resp) { return resp.ok ? resp.json() : null; }).then(function(data) {
                        if (data && data.todo) {
                            mcTodoContent = data.todo;
                        } else {
                            mcTodoContent = '(The scrolls are blank)';
                        }
                        var el = document.getElementById('mcTodoRaw');
                        if (el) el.textContent = mcTodoContent;
                    }).catch(function() {
                        mcTodoContent = '(The archives are sealed)';
                        var el = document.getElementById('mcTodoRaw');
                        if (el) el.textContent = mcTodoContent;
                    });
                }
            });
        })();
    }

    // ═══ CENTER COLUMN — Battle Reports & Chronicles ═══
    function renderCenterColumn(sessions) {
        var html = '';

        // Toggle: Filtered / Raw
        html += '<div class="mc-feed-toggle">';
        html += '<button class="mc-feed-toggle-btn ' + (mcFeedMode === 'filtered' ? 'active' : '') + '" data-mode="filtered">📊 Battle Reports</button>';
        html += '<button class="mc-feed-toggle-btn ' + (mcFeedMode === 'raw' ? 'active' : '') + '" data-mode="raw">📜 Raw Chronicle</button>';
        html += '</div>';

        if (mcFeedMode === 'filtered') {
            html += '<div id="mcFeedList">';
            html += renderActivityFeed(sessions);
            html += '</div>';
            html += '<div class="mc-raw-transcript" id="mcRawTranscript"></div>';
        } else {
            html += '<div id="mcFeedList" style="display:none;"></div>';
            html += '<div class="mc-raw-transcript" id="mcRawTranscript" style="display:block;">Loading royal chronicle...</div>';
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

        // Extract events with medieval theming
        arr.forEach(function(s) {
            var name = (s.label || s.displayName || s.key || 'unknown').replace(/^Cron:\s*/i, '');

            if (s.kind === 'subagent') {
                events.push({
                    time: s.lastActive || 0,
                    icon: s.status === 'active' ? '⚔️' : '🛡️',
                    text: (s.status === 'active' ? 'Knight deployed: ' : 'Quest completed: ') + name,
                    detail: 'Realm: ' + (s.model || '—') + ' • Valor: ' + (s.totalTokens || 0).toLocaleString(),
                    type: 'spawn'
                });
            } else if (s.kind === 'cron' && !(s.key && s.key.indexOf(':run:') >= 0)) {
                events.push({
                    time: s.lastActive || 0,
                    icon: '⏰',
                    text: 'Royal decree: ' + name,
                    detail: 'Status: ' + (s.status || '—') + ' • Power: ' + (s.totalTokens || 0).toLocaleString(),
                    type: 'cron'
                });
            } else if (s.key === 'agent:main:main') {
                events.push({
                    time: s.lastActive || 0,
                    icon: '👑',
                    text: 'Royal court in session',
                    detail: 'Wisdom: ' + (s.totalTokens || 0).toLocaleString() + ' • Chamber: ' + (s.channel || '—'),
                    type: 'ceo'
                });
            }
        });

        // Sort by time descending
        events.sort(function(a, b) { return b.time - a.time; });

        if (events.length === 0) {
            return '<div style="text-align:center;padding:32px;color:var(--castle-stone-light);font-size:13px;">The kingdom slumbers in peace.<br>No battles to report, my liege.</div>';
        }

        var html = '';
        events.slice(0, 50).forEach(function(ev) {
            var ago = Date.now() - ev.time;
            var agoStr = ago < 60000 ? 'moments ago' :
                ago < 3600000 ? Math.floor(ago / 60000) + ' minutes past' :
                ago < 86400000 ? Math.floor(ago / 3600000) + ' hours past' :
                Math.floor(ago / 86400000) + ' days past';

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
        el.textContent = 'Scribes are transcribing the royal conversations...';
        try {
            var resp = await ThemeAuth.fetch(API_URL + '/api/oc/chat');
            if (resp.ok) {
                var data = await resp.json();
                var messages = data.messages || data || [];
                if (Array.isArray(messages) && messages.length > 0) {
                    var text = '';
                    messages.slice(-50).forEach(function(m) {
                        var role = m.role === 'user' ? '👤 Your Majesty' : '🤖 ApoMac';
                        var content = typeof m.content === 'string' ? m.content : (m.content && m.content[0] && m.content[0].text ? m.content[0].text : '[royal decree]');
                        text += role + ':\n' + content.substring(0, 500) + '\n\n';
                    });
                    mcTranscriptContent = text || '(The chronicle pages are blank)';
                } else {
                    mcTranscriptContent = '(No royal conversations recorded)';
                }
            } else {
                mcTranscriptContent = '(Chronicle sealed — Royal Seal ' + resp.status + ')';
            }
        } catch(e) { mcTranscriptContent = '(The scribes have fled — reconnect the royal messenger)'; }
        var el2 = document.getElementById('mcRawTranscript');
        if (el2) el2.textContent = mcTranscriptContent;
    }

    // ═══ RIGHT COLUMN — Court Status ═══
    function renderRightColumn(sessions) {
        var html = '';
        var arr = Array.isArray(sessions) ? sessions : [];

        // Royal Court status
        html += '<div class="mc-section-title">🏰 Royal Court</div>';
        html += '<div class="mc-fleet-grid">';
        Object.keys(MEDIEVAL_AGENTS).forEach(function(id) {
            var agent = MEDIEVAL_AGENTS[id];
            // Check live status
            var liveSession = arr.find(function(s) {
                if (id === 'ceo') return s.key === 'agent:main:main';
                return s.label && s.label.toLowerCase().indexOf(id) >= 0 && s.kind === 'subagent';
            });
            var isActive = liveSession ? liveSession.status === 'active' : false;
            var dotColor = isActive ? '#4ade80' : '#64748b';

            html += '<div class="mc-fleet-pill" data-agent="' + escMc(id) + '">';
            html += '<div class="mc-fleet-pill-dot" style="background:' + dotColor + ';' + (isActive ? 'animation:statusPulse 2.5s infinite;' : '') + '"></div>';
            html += '<div class="mc-fleet-pill-name">' + escMc(agent.name) + '</div>';
            html += '</div>';
        });
        html += '</div>';

        // Royal Knights (sub-agents)
        var subs = arr.filter(function(s) { return s.kind === 'subagent'; });
        subs.sort(function(a, b) { return (b.lastActive || 0) - (a.lastActive || 0); });
        var activeSubs = subs.filter(function(s) { return s.status === 'active'; });

        html += '<div class="mc-section-title" style="margin-top:12px;">⚔️ Royal Knights (' + subs.length + ' total, ' + activeSubs.length + ' active)</div>';

        if (subs.length === 0) {
            html += '<div style="font-size:12px;color:var(--castle-stone-light);padding:8px 0;">No knights deployed in the field.</div>';
        } else {
            var showSubs = activeSubs.concat(subs.filter(function(s) { return s.status !== 'active'; })).slice(0, 8);
            showSubs.forEach(function(s) {
                var isAct = s.status === 'active';
                var ago = Date.now() - (s.lastActive || 0);
                var agoStr = ago < 60000 ? 'now' : ago < 3600000 ? Math.floor(ago/60000) + 'm' : Math.floor(ago/3600000) + 'h';
                var label = (s.label || s.displayName || 'knight').replace(/^Cron:\s*/i, '');

                html += '<div class="mc-sub-item">';
                html += '<div class="mc-sub-dot" style="background:' + (isAct ? '#4ade80' : '#64748b') + ';' + (isAct ? 'animation:statusPulse 2.5s infinite;' : '') + '"></div>';
                html += '<div class="mc-sub-name">' + escMc(label) + '</div>';
                html += '<div class="mc-sub-meta">' + agoStr + '</div>';
                html += '</div>';
            });
            if (subs.length > 8) html += '<div style="font-size:10px;color:var(--castle-stone-light);padding:4px 0;">+' + (subs.length - 8) + ' more</div>';
        }

        // Royal Arsenal (Skills)
        html += '<div class="mc-section-title" style="margin-top:12px;">⚡ Royal Arsenal</div>';
        html += '<div style="display:flex;flex-wrap:wrap;gap:4px;">';
        var skillList = ['brainstorm','ralph-loop','coding-agent','github','weather','summarize','gog','peekaboo','1password','apple-notes','sag','imsg'];
        skillList.forEach(function(sk) {
            html += '<span style="font-size:10px;padding:3px 8px;border-radius:4px;background:rgba(201,169,89,0.3);color:var(--castle-navy);font-weight:500;">' + escMc(sk) + '</span>';
        });
        html += '</div>';

        mcRight.innerHTML = html;

        // Wire court member clicks
        mcRight.querySelectorAll('.mc-fleet-pill').forEach(function(pill) {
            pill.addEventListener('click', function() {
                var agentId = pill.dataset.agent;
                if (agentId === 'ceo') return; // Already in Royal War Room
                closeMissionControl();
                // In future, could open agent detail panels here
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
        html += '<div class="mc-statusbar-item"><div class="mc-statusbar-dot" style="background:' + (connected ? '#4ade80' : '#ef4444') + '"></div>' + (connected ? 'Royal Network Active' : 'Castle Offline') + '</div>';
        html += '<div class="mc-statusbar-item">Court Sage: <strong>' + escMc(model) + '</strong></div>';
        html += '<div class="mc-statusbar-item">Royal Wisdom: <strong>' + totalTokens.toLocaleString() + '</strong></div>';
        html += '<div class="mc-statusbar-item">Active Missions: <strong>' + activeSessions + '</strong></div>';
        html += '<div class="mc-statusbar-item">Total Sessions: <strong>' + arr.length + '</strong></div>';
        mcStatus.innerHTML = html;
    }

    // Make Mission Control agent tiles clickable
    window.addEventListener('click', function(e) {
        var agentCard = e.target.closest('.agent-card');
        if (agentCard && agentCard.classList.contains('selected')) {
            var agentId = agentCard.dataset.agent;
            if (agentId === 'ceo' || agentId === 'apomac') {
                openMissionControl();
            }
        }
    });

})();

// ═══ AGENT DETAIL PANEL HANDLERS ═══
(function() {
    const overlay = document.getElementById('agentDetailOverlay');
    const closeBtn = document.getElementById('agentDetailClose');

    function closeAgentDetail() {
        overlay.classList.remove('visible');
        setTimeout(() => overlay.style.display = 'none', 300);
    }

    closeBtn.addEventListener('click', closeAgentDetail);
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeAgentDetail();
    });

    // Tab switching
    document.querySelectorAll('.agent-detail-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.agent-detail-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            if (window.castleApp) {
                window.castleApp.currentDetailTab = this.dataset.tab;
                const agentId = document.getElementById('agentDetailName').textContent;
                const agent = window.castleApp.agents.get(agentId);
                if (agent) {
                    window.castleApp.renderAgentDetailContent(agentId, agent);
                }
            }
        });
    });

    // ESC to close
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && overlay.classList.contains('visible')) {
            closeAgentDetail();
        }
    });
})();

// ═══════════════════════════════════════════════════════════════
//   MEDIEVAL LIVE AGENT BEHAVIORS — Real-time API Integration
// ═══════════════════════════════════════════════════════════════

(function initMedievalLiveBehaviors() {
    var lastAgentState = {};
    var lastChatMessageCount = 0;
    var pollTimer = null;
    var animationQueue = [];
    
    // Polling function for Medieval theme
    async function pollMedievalAgentState() {
        try {
            const [sessionsResp, memoryResp, chatResp] = await Promise.allSettled([
                ThemeAuth.fetch(API_URL + '/api/oc/sessions'),
                ThemeAuth.fetch(API_URL + '/api/oc/memory'),
                ThemeAuth.fetch(API_URL + '/api/oc/chat')
            ]);
            
            const sessions = sessionsResp.status === 'fulfilled' && sessionsResp.value.ok ? await sessionsResp.value.json() : [];
            const memory = memoryResp.status === 'fulfilled' && memoryResp.value.ok ? await memoryResp.value.json() : {};
            const chat = chatResp.status === 'fulfilled' && chatResp.value.ok ? await chatResp.value.json() : [];
            
            processMedievalStateChanges(sessions, memory, chat);
        } catch (error) {
            console.warn('[MedievalLiveBehaviors] Poll failed:', error.message || error);
        }
    }
    
    function processMedievalStateChanges(sessions, memory, chat) {
        const currentState = {};
        
        // Build current state
        (sessions || []).forEach(session => {
            currentState[session.key] = {
                status: session.status,
                label: session.label || session.displayName,
                kind: session.kind,
                lastActive: session.lastActive,
                totalTokens: session.totalTokens
            };
        });
        
        // Detect changes
        detectMedievalChanges(currentState);
        
        // Check for new messages
        const currentMessageCount = Array.isArray(chat) ? chat.length : (chat.messages ? chat.messages.length : 0);
        if (currentMessageCount > lastChatMessageCount && lastChatMessageCount > 0) {
            animateMedievalNewMessage();
        }
        lastChatMessageCount = currentMessageCount;
        
        // Update knight animations and status
        updateKnightBehaviors(sessions, memory);
        
        // Update Royal War Room data
        updateWarRoomData(sessions);
        
        lastAgentState = currentState;
    }
    
    function detectMedievalChanges(currentState) {
        Object.keys(currentState).forEach(key => {
            const current = currentState[key];
            const previous = lastAgentState[key];
            
            if (!previous && current.kind === 'subagent') {
                // New knight spawned
                animateKnightSpawned(key, current);
            } else if (previous && !currentState[key]) {
                // Knight decommissioned
                animateKnightDecommissioned(key, previous);
            } else if (previous && previous.status !== current.status) {
                if (current.status === 'active') {
                    animateKnightActive(key, current);
                } else {
                    animateKnightIdle(key, current);
                }
            }
        });
    }
    
    function updateKnightBehaviors(sessions, memory) {
        // Update knights in 3D scene if available
        if (window.medievalScene && window.medievalScene.knightMeshes) {
            Object.entries(window.medievalScene.knightMeshes).forEach(([knightId, mesh]) => {
                let isActive = false;
                
                if (knightId === 'king') {
                    // King = main session
                    const mainSession = (sessions || []).find(s => s.key === 'agent:main:main');
                    isActive = mainSession && mainSession.status === 'active';
                    
                    // Update king's current task from TODO.md
                    if (memory && memory.todo) {
                        const nextTask = extractMedievalNextTask(memory.todo);
                        updateKnightSpeech(knightId, nextTask ? `Commanding: ${nextTask}` : 'Ruling the kingdom...');
                    }
                } else {
                    // Knights = sub-agents
                    const subAgent = (sessions || []).find(s => 
                        s.kind === 'subagent' && 
                        s.label && 
                        s.label.toLowerCase().includes(knightId.toLowerCase())
                    );
                    isActive = subAgent && subAgent.status === 'active';
                    
                    if (subAgent && subAgent.status === 'active') {
                        updateKnightSpeech(knightId, `On quest: ${subAgent.label}`);
                    } else if (subAgent) {
                        const agoStr = formatMedievalTimeAgo(Date.now() - (subAgent.lastActive || Date.now()));
                        updateKnightSpeech(knightId, `Resting since ${agoStr}`);
                    } else {
                        updateKnightSpeech(knightId, 'Awaiting orders...');
                    }
                }
                
                // Update knight animations
                if (mesh.userData) {
                    mesh.userData.isActive = isActive;
                    // The existing animation system will pick up this state
                }
            });
        }
        
        // Update Mission Control overlay if open
        updateMedievalMissionControl(sessions, memory);
    }
    
    function updateWarRoomData(sessions) {
        // Update war room displays with real session data
        const warRoomEl = document.querySelector('.war-room, [data-room="war-room"]');
        if (warRoomEl) {
            const activeSessions = (sessions || []).filter(s => s.status === 'active').length;
            const totalSessions = (sessions || []).length;
            
            const statusEl = warRoomEl.querySelector('.room-status, .war-room-status');
            if (statusEl) {
                statusEl.textContent = `${activeSessions} knights active of ${totalSessions} total`;
                statusEl.style.color = activeSessions > 0 ? '#4ade80' : '#64748b';
            }
        }
    }
    
    function animateKnightSpawned(sessionKey, session) {
        console.log(`[Medieval] Knight spawned: ${session.label}`);
        
        // Find knight in UI and animate spawn
        const knightElements = document.querySelectorAll('.knight-card, .mc-sub-item');
        knightElements.forEach(el => {
            const label = el.textContent || '';
            if (label.toLowerCase().includes((session.label || '').toLowerCase())) {
                el.style.animation = 'knightSpawn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
                setTimeout(() => { el.style.animation = ''; }, 800);
            }
        });
        
        // Add notification to war room
        addMedievalNotification(`⚔️ Knight deployed: ${session.label}`, 'success');
    }
    
    function animateKnightActive(sessionKey, session) {
        console.log(`[Medieval] Knight active: ${session.label}`);
        
        // In 3D scene, make sword glow and knight move
        if (window.medievalScene && window.medievalScene.knightMeshes) {
            Object.entries(window.medievalScene.knightMeshes).forEach(([knightId, mesh]) => {
                if (session.label && session.label.toLowerCase().includes(knightId.toLowerCase())) {
                    // Trigger sword animation
                    if (mesh.userData) {
                        mesh.userData.startSwordAnimation = true;
                    }
                }
            });
        }
    }
    
    function animateKnightIdle(sessionKey, session) {
        // Knight sits/rests
        if (window.medievalScene && window.medievalScene.knightMeshes) {
            Object.entries(window.medievalScene.knightMeshes).forEach(([knightId, mesh]) => {
                if (session.label && session.label.toLowerCase().includes(knightId.toLowerCase())) {
                    if (mesh.userData) {
                        mesh.userData.startSwordAnimation = false;
                    }
                }
            });
        }
    }
    
    function animateKnightDecommissioned(sessionKey, session) {
        console.log(`[Medieval] Knight departed: ${session.label}`);
        addMedievalNotification(`🏰 Knight returned: ${session.label}`, 'info');
    }
    
    function animateMedievalNewMessage() {
        // Animate ravens/messenger birds
        const messageElements = document.querySelectorAll('.message-icon, [data-icon="message"]');
        messageElements.forEach(el => {
            el.style.animation = 'ravenFly 1.2s ease-in-out';
            setTimeout(() => { el.style.animation = ''; }, 1200);
        });
        
        addMedievalNotification('📜 New message from the realm', 'info');
    }
    
    function updateMedievalMissionControl(sessions, memory) {
        // Update mission control with real data if overlay is open
        const mcOverlay = document.querySelector('.mc-overlay');
        if (mcOverlay && mcOverlay.classList.contains('visible')) {
            // The existing loadMissionControl function will handle updates
            // We just ensure the data is fresh
        }
    }
    
    function addMedievalNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `medieval-notification medieval-notification--${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: rgba(244, 228, 188, 0.95);
            color: var(--castle-navy);
            padding: 8px 16px;
            border-radius: 8px;
            border: 2px solid var(--castle-gold);
            font-family: var(--font-serif);
            font-size: 12px;
            font-weight: 600;
            z-index: 2000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: medievalNotificationSlide 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
            max-width: 250px;
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'medievalNotificationFadeOut 0.3s ease-out forwards';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
    
    function updateKnightSpeech(knightId, speech) {
        // Update speech bubble or status text for knight
        const speechElements = document.querySelectorAll(`[data-knight="${knightId}"] .speech, .knight-speech-${knightId}`);
        speechElements.forEach(el => {
            el.textContent = speech;
            el.style.animation = 'speechUpdate 0.3s ease-out';
            setTimeout(() => { el.style.animation = ''; }, 300);
        });
    }
    
    function extractMedievalNextTask(todoMd) {
        if (!todoMd) return null;
        const lines = todoMd.split('\n');
        for (const line of lines) {
            if (line.includes('>>> NEXT')) {
                return line.replace(/.*>>> NEXT:?\s*/, '').trim().substring(0, 40);
            }
        }
        return null;
    }
    
    function formatMedievalTimeAgo(ms) {
        const minutes = Math.floor(ms / 60000);
        const hours = Math.floor(ms / 3600000);
        if (minutes < 1) return 'moments ago';
        if (minutes < 60) return `${minutes} minutes past`;
        if (hours < 24) return `${hours} hours past`;
        return `${Math.floor(ms / 86400000)} days past`;
    }
    
    // Medieval-specific CSS animations
    const medievalAnimationStyles = document.createElement('style');
    medievalAnimationStyles.textContent = `
        @keyframes knightSpawn {
            0% { transform: scale(0.7) rotate(-10deg); opacity: 0; }
            50% { transform: scale(1.1) rotate(5deg); }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        
        @keyframes ravenFly {
            0%, 100% { transform: scale(1) rotate(0deg); }
            25% { transform: scale(1.1) rotate(-5deg) translateX(-3px); }
            75% { transform: scale(1.05) rotate(3deg) translateX(3px); }
        }
        
        @keyframes medievalNotificationSlide {
            0% { transform: translateX(100%); opacity: 0; }
            100% { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes medievalNotificationFadeOut {
            0% { transform: translateX(0); opacity: 1; }
            100% { transform: translateX(50px); opacity: 0; }
        }
        
        @keyframes speechUpdate {
            0% { opacity: 0.7; transform: scale(0.95); }
            100% { opacity: 1; transform: scale(1); }
        }
    `;
    document.head.appendChild(medievalAnimationStyles);
    
    // Initialize medieval live behaviors
    console.log('[MedievalLiveBehaviors] Initializing...');
    
    // Initial poll
    pollMedievalAgentState();
    
    // Set up polling interval
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(pollMedievalAgentState, 15000);
    
    console.log('[MedievalLiveBehaviors] Active - polling every 15s');
    
    // Cleanup
    window.addEventListener('beforeunload', () => {
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
    });
})();
