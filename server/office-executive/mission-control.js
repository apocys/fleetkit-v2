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
        var mcFeedMode = 'raw'; // 'filtered' or 'raw'
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
            // Stop transcript polling when MC is closed
            if (_transcriptPollTimer) { clearInterval(_transcriptPollTimer); _transcriptPollTimer = null; }
            // Clear transcript cache so it reloads fresh next time
            mcTranscriptContent = null;
        }

        mcBack.addEventListener('click', closeMissionControl);
        
        // ESC to close
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && mcOverlay.classList.contains('visible')) closeMissionControl();
        });

        // CEO click interception is handled inside openDetailPanel() directly

        // ── Main loader ──
        var mcLoading = false;
        var _lastMcHash = '';
        async function loadMissionControl() {
            if (mcLoading) return;
            mcLoading = true;
            // Clear task cache on each refresh so tasks stay current
            mcTodoContent = null;
            var sessions = [];
            try {
                var resp = await skFetch(API_URL + '/api/oc/sessions');
                if (resp.ok) sessions = await resp.json();
            } catch(e) {
                console.warn('[MC] Failed to load sessions:', e.message || e);
            }
            try {
                // Skip re-render if data unchanged (prevents blinking)
                var hash = JSON.stringify(sessions.map(function(s) { return s.key + ':' + (s.status || '') + ':' + (s.totalTokens || 0); }));
                if (hash !== _lastMcHash) {
                    _lastMcHash = hash;
                    renderLeftColumn(sessions);
                    renderCenterColumn(sessions);
                    renderRightColumn(sessions);
                }
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

            // Load tasks from /api/tasks + sessions
            if (!mcTodoContent) {
                var apiUrl = (window.OC_API_URL || (window.location.hostname.includes('spawnkit.ai') ? window.location.origin : 'http://127.0.0.1:8222'));
                skFetch(apiUrl + '/api/tasks').then(function(r) { return r.ok ? r.json() : null; }).then(function(data) {
                    if (data && data.ok) { mcTodoContent = JSON.stringify(data); renderLeftColumn(sessions); }
                }).catch(function() {});
                // Also try memory for backward compat
                skFetch(apiUrl + '/api/oc/memory').then(function(r) { return r.ok ? r.json() : null; }).then(function(data) {
                    if (data && data.todo && !mcTodoContent) { mcTodoContent = data.todo; renderLeftColumn(sessions); }
                }).catch(function() {});
            }

            // Try to parse as structured tasks first, fallback to TODO.md parsing
            var taskData = null;
            try { taskData = JSON.parse(mcTodoContent); } catch(e) {}

            if (taskData && taskData.ok) {
                // Structured task data from /api/tasks
                var allTasks = taskData.tasks || [];
                var activeTasks = allTasks.filter(function(t) { return t.status === 'active'; });
                var doneTasks = allTasks.filter(function(t) { return t.status === 'done'; });
                var milestones = taskData.milestones || [];

                // Also build from sessions passed into this function
                var sessArr = Array.isArray(sessions) ? sessions : [];
                sessArr.forEach(function(s) {
                    if (s.kind === 'subagent' && s.status === 'active') {
                        var already = activeTasks.some(function(t) { return t.id === s.key; });
                        if (!already) {
                            var ago = Date.now() - (s.lastActive || 0);
                            var agoStr = ago < 60000 ? 'just now' : ago < 3600000 ? Math.floor(ago/60000) + 'm ago' : Math.floor(ago/3600000) + 'h ago';
                            activeTasks.push({
                                text: s.label || s.displayName || 'Sub-agent',
                                status: 'active', icon: '🔥', agent: 'main',
                                subtasks: [
                                    { text: 'Model: ' + (s.model || 'unknown'), done: false },
                                    { text: 'Tokens: ' + (s.totalTokens || 0).toLocaleString(), done: false },
                                    { text: 'Last active: ' + agoStr, done: false },
                                    { text: 'Channel: ' + (s.channel || 'internal'), done: false }
                                ]
                            });
                        }
                    }
                });
                // Also show main session as a context item
                var mainSess = sessArr.find(function(s) { return s.key === 'agent:main:main'; });
                if (mainSess) {
                    activeTasks.unshift({
                        text: '🎭 Main Session (Sycopa)',
                        status: 'active', icon: '👑', agent: 'ceo',
                        subtasks: [
                            { text: 'Model: ' + (mainSess.model || 'unknown'), done: false },
                            { text: 'Tokens: ' + (mainSess.totalTokens || 0).toLocaleString(), done: false },
                            { text: 'Channel: ' + (mainSess.channel || '-'), done: false },
                            { text: 'Status: ' + (mainSess.status || 'idle'), done: false }
                        ]
                    });
                }

                var totalActive = activeTasks.length;
                var totalDone = doneTasks.length;

                // ── Progression Panel (clean checklist style) ──
                // Blue circle checkmark for done, hollow circle for active
                var checkDone = '<svg width="18" height="18" viewBox="0 0 18 18" style="flex-shrink:0;"><circle cx="9" cy="9" r="8" fill="#007AFF"/><path d="M5.5 9.5L7.5 11.5L12.5 6.5" stroke="white" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                var checkActive = '<svg width="18" height="18" viewBox="0 0 18 18" style="flex-shrink:0;"><circle cx="9" cy="9" r="8" fill="none" stroke="#FF9500" stroke-width="1.5"/><circle cx="9" cy="9" r="3" fill="#FF9500"/></svg>';
                var checkTodo = '<svg width="18" height="18" viewBox="0 0 18 18" style="flex-shrink:0;"><circle cx="9" cy="9" r="8" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/></svg>';

                // Group tasks by agent
                var byAgent = {};
                activeTasks.forEach(function(t) {
                    var key = t.agent || 'main';
                    if (!byAgent[key]) byAgent[key] = { active: [], done: [] };
                    byAgent[key].active.push(t);
                });
                doneTasks.forEach(function(t) {
                    var key = t.agent || 'main';
                    if (!byAgent[key]) byAgent[key] = { active: [], done: [] };
                    byAgent[key].done.push(t);
                });

                // If no agents, create a default group
                if (Object.keys(byAgent).length === 0) {
                    byAgent['main'] = { active: [], done: [] };
                }

                Object.keys(byAgent).forEach(function(agentKey) {
                    var group = byAgent[agentKey];
                    var allItems = group.active.concat(group.done);
                    if (allItems.length === 0) return;

                    var agentName = agentKey === 'ceo' ? 'Sycopa' : agentKey.charAt(0).toUpperCase() + agentKey.slice(1);

                    // Collapsible section per agent
                    html += '<div class="mc-progression" style="background:rgba(255,255,255,0.03);border-radius:12px;padding:12px 14px;margin-bottom:8px;">';
                    html += '<div class="mc-prog-header" style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;margin-bottom:8px;">';
                    html += '<span style="font-size:13px;font-weight:600;color:var(--text-primary);">Progression — ' + escMc(agentName) + '</span>';
                    html += '<span class="mc-prog-chevron" style="font-size:12px;color:var(--text-tertiary);transition:transform 0.2s;">▾</span>';
                    html += '</div>';
                    html += '<div class="mc-prog-items">';

                    // Active tasks
                    group.active.forEach(function(t) {
                        html += '<div style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;">';
                        html += checkActive;
                        html += '<span style="font-size:13px;color:var(--text-primary);line-height:18px;">' + escMc(t.text) + '</span>';
                        html += '</div>';
                        // Subtasks
                        if (t.subtasks && t.subtasks.length > 0) {
                            t.subtasks.forEach(function(st) {
                                html += '<div style="display:flex;align-items:flex-start;gap:8px;padding:3px 0 3px 26px;">';
                                html += (st.done ? checkDone : checkTodo);
                                html += '<span style="font-size:12px;line-height:18px;' + (st.done ? 'text-decoration:line-through;color:var(--text-tertiary);' : 'color:var(--text-secondary);') + '">' + escMc(st.text) + '</span>';
                                html += '</div>';
                            });
                        }
                    });

                    // Done tasks
                    group.done.forEach(function(t) {
                        html += '<div style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;">';
                        html += checkDone;
                        html += '<span style="font-size:13px;text-decoration:line-through;color:var(--text-tertiary);line-height:18px;">' + escMc(t.text) + '</span>';
                        html += '</div>';
                    });

                    html += '</div></div>'; // close items + progression
                });

                // Legacy "Completed" section for tasks not assigned to any agent
                if (totalDone > 0 && !Object.keys(byAgent).some(function(k) { return byAgent[k].done.length > 0; })) {
                    html += '<div class="mc-progression" style="background:rgba(255,255,255,0.03);border-radius:12px;padding:12px 14px;margin-bottom:8px;">';
                    html += '<div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:8px;">Completed</div>';
                    doneTasks.slice(0, 8).forEach(function(t) {
                        html += '<div style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;">';
                        html += checkDone;
                        html += '<span style="font-size:13px;text-decoration:line-through;color:var(--text-tertiary);line-height:18px;">' + escMc(t.text) + '</span>';
                        html += '</div>';
                        if (t.completedAt) {
                            html += '<div style="font-size:9px;color:var(--text-quaternary,#bbb);margin-left:18px;">' + new Date(t.completedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) + '</div>';
                        }
                        html += '</div>';
                    });
                }

                // Milestones from MEMORY.md
                if (milestones.length > 0) {
                    html += '<div class="mc-section-title" style="margin-top:12px;">📌 Project Log (' + milestones.length + ')</div>';
                    milestones.slice(-6).reverse().forEach(function(m) {
                        html += '<div style="padding:4px 10px;margin-bottom:2px;font-size:10px;color:var(--text-secondary);">';
                        html += '<span style="color:var(--text-tertiary);">' + escMc(m.section).substring(0, 20) + '</span> — ';
                        html += escMc(m.text).substring(0, 60);
                        html += '</div>';
                    });
                }
            } else {
                // Fallback: parse as TODO.md
                var todoData = parseTodoMd(mcTodoContent);

                html += '<div class="mc-section-title">🎯 Active Tasks (' + todoData.active.length + ')</div>';

                if (todoData.active.length === 0 && !mcTodoContent) {
                    html += '<div style="padding:16px;text-align:center;color:var(--text-tertiary);font-size:12px;">Loading tasks...</div>';
                } else if (todoData.active.length === 0) {
                    html += '<div style="padding:16px;text-align:center;color:var(--text-tertiary);font-size:12px;">No active tasks. All clear! 🎉</div>';
                }

                todoData.active.forEach(function(t) {
                    var statusColor = t.status === 'next' ? '#FF9500' : t.status === 'blocked' ? '#FF3B30' : 'var(--exec-blue)';
                    var statusLabel = t.status === 'next' ? 'NEXT' : t.status === 'blocked' ? 'BLOCKED' : 'TODO';
                    html += '<div style="padding:8px 10px;margin-bottom:4px;border-radius:8px;background:rgba(0,0,0,0.03);border-left:3px solid ' + statusColor + ';">';
                    html += '<div style="display:flex;align-items:center;gap:6px;">';
                    html += '<span>☐</span>';
                    html += '<span style="flex:1;font-size:12px;">' + escMc(t.text.substring(0, 80)) + '</span>';
                    html += '<span style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;background:' + statusColor + '22;color:' + statusColor + ';">' + statusLabel + '</span>';
                    html += '</div></div>';
                });

                if (todoData.done.length > 0) {
                    html += '<div class="mc-section-title" style="margin-top:12px;">✅ Done (' + todoData.done.length + ')</div>';
                    todoData.done.slice(0, 5).forEach(function(m) {
                        html += '<div style="padding:5px 10px;margin-bottom:3px;border-radius:8px;background:rgba(48,209,88,0.06);">';
                        html += '<span style="color:#30D158;">☑</span> <span style="font-size:11px;text-decoration:line-through;color:var(--text-tertiary);">' + escMc(m.text.substring(0, 60)) + '</span>';
                        html += '</div>';
                    });
                }
            }

            // TODO.md raw — preserve expanded state across refreshes
            html += '<div class="mc-section-title" style="margin-top:16px;">📋 Backlog (TODO.md)</div>';
            html += '<div class="mc-todo-toggle" id="mcTodoToggle">' + (mcTodoExpanded ? '▾ Hide raw backlog' : '▸ Show raw backlog') + '</div>';
            html += '<div class="mc-todo-raw" id="mcTodoRaw" style="display:' + (mcTodoExpanded ? 'block' : 'none') + ';">' + escMc(mcTodoContent || 'Click to load...') + '</div>';

            // External Messages section
            html += '<div class="mc-section-title" style="margin-top:16px;">📨 External Messages</div>';
            html += '<div id="mcExternalMessages" style="padding:4px 0;">';
            html += '<div style="text-align:center;padding:12px;color:var(--text-tertiary);font-size:12px;">No external messages<br><span style="font-size:10px;">Telegram & WhatsApp messages will appear here</span></div>';
            html += '</div>';

            mcLeft.innerHTML = html;

            // Wire mission expand
            mcLeft.querySelectorAll('.mc-mission').forEach(function(card) {
                card.addEventListener('click', function(e) {
                    if (e.target.type === 'checkbox') return;
                    card.classList.toggle('expanded');
                });
            });

            // Wire task card expand (click to show/hide subtasks)
            mcLeft.querySelectorAll('.mc-task-card').forEach(function(card) {
                card.addEventListener('click', function() {
                    var subs = card.querySelector('.mc-subtasks');
                    if (!subs) return;
                    var arrow = card.querySelector('div > span:first-child');
                    if (subs.style.display === 'none') {
                        subs.style.display = 'block';
                        if (arrow) arrow.textContent = '▾';
                        card.style.background = 'rgba(255,149,0,0.12)';
                    } else {
                        subs.style.display = 'none';
                        if (arrow) arrow.textContent = '▸';
                        card.style.background = 'rgba(255,149,0,0.06)';
                    }
                });
            });

            // Wire progression panel collapse/expand
            mcLeft.querySelectorAll('.mc-prog-header').forEach(function(header) {
                header.addEventListener('click', function() {
                    var items = header.parentElement.querySelector('.mc-prog-items');
                    var chevron = header.querySelector('.mc-prog-chevron');
                    if (!items) return;
                    if (items.style.display === 'none') {
                        items.style.display = 'block';
                        if (chevron) chevron.textContent = '▾';
                    } else {
                        items.style.display = 'none';
                        if (chevron) chevron.textContent = '▸';
                    }
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
                        skFetch(API_URL + '/api/oc/memory').then(function(resp) { return resp.ok ? resp.json() : null; }).then(function(data) {
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
            html += '<button class="mc-feed-toggle-btn ' + (mcFeedMode === 'raw' ? 'active' : '') + '" data-mode="raw">💬 Chat</button>';
            html += '<button class="mc-feed-toggle-btn ' + (mcFeedMode === 'filtered' ? 'active' : '') + '" data-mode="filtered">📊 Activity</button>';
            html += '</div>';

            if (mcFeedMode === 'filtered') {
                html += '<div id="mcFeedList">';
                html += renderActivityFeed(sessions);
                html += '</div>';
                html += '<div class="mc-raw-transcript" id="mcRawTranscript"></div>';
            } else {
                html += '<div id="mcFeedList" style="display:none;"></div>';
                html += '<div class="mc-raw-transcript" id="mcRawTranscript" style="display:block;">Loading transcript...</div>';
                html += '<div id="mcChatInputBar" style="display:flex;gap:8px;padding:8px 12px;border-top:1px solid var(--border-subtle);background:var(--bg-secondary);align-items:center;">';
                html += '<input type="text" id="mcChatInput" placeholder="Message Sycopa..." style="flex:1;padding:8px 12px;border:1px solid var(--border-medium);border-radius:20px;font-size:13px;font-family:inherit;background:var(--bg-primary);color:var(--text-primary);outline:none;" />';
                html += '<button id="mcChatSend" style="width:32px;height:32px;border-radius:50%;border:none;background:var(--exec-blue);color:white;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;">↑</button>';
                html += '</div>';
            }

            mcCenter.innerHTML = html;

            // Wire toggle
            mcCenter.querySelectorAll('.mc-feed-toggle-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    mcFeedMode = btn.dataset.mode;
                    // Stop transcript polling when switching away from Chat
                    if (mcFeedMode !== 'raw' && _transcriptPollTimer) {
                        clearInterval(_transcriptPollTimer);
                        _transcriptPollTimer = null;
                    }
                    renderCenterColumn(sessions);
                    if (mcFeedMode === 'raw') loadRawTranscript();
                });
            });

            // Wire chat input
            var chatInput = document.getElementById('mcChatInput');
            var chatSend = document.getElementById('mcChatSend');
            if (chatInput && chatSend) {
                function sendMcChat() {
                    var msg = chatInput.value.trim();
                    if (!msg) return;
                    chatInput.value = '';
                    chatInput.disabled = true;
                    chatSend.disabled = true;
                    var el = document.getElementById('mcRawTranscript');
                    if (el) {
                        el.innerHTML += '<div class="mc-transcript-msg mc-transcript-msg--user"><div class="mc-transcript-bubble"><div class="mc-transcript-role">Kira</div><div>' + msg.replace(/</g, '&lt;').replace(/\n/g, '<br>') + '</div></div></div>';
                        el.scrollTop = el.scrollHeight + 9999;
                    }
                    var apiUrl = window.OC_API_URL || (window.location.hostname.includes('spawnkit.ai') ? window.location.origin : 'http://127.0.0.1:8222');
                    skFetch(apiUrl + '/api/oc/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: msg })
                    }).then(function(r) { return r.json(); }).then(function(data) {
                        chatInput.disabled = false;
                        chatSend.disabled = false;
                        chatInput.focus();
                        if (data.reply) {
                            var el2 = document.getElementById('mcRawTranscript');
                            if (el2) {
                                el2.innerHTML += '<div class="mc-transcript-msg mc-transcript-msg--assistant"><div class="mc-transcript-bubble"><div class="mc-transcript-role">Sycopa</div><div>' + data.reply.replace(/</g, '&lt;').replace(/\n/g, '<br>') + '</div></div></div>';
                                el2.scrollTop = el2.scrollHeight + 9999;
                            }
                        }
                        mcTranscriptContent = null;
                        setTimeout(function() { loadRawTranscript(true); }, 2000);
                    }).catch(function() {
                        chatInput.disabled = false;
                        chatSend.disabled = false;
                    });
                }
                chatSend.addEventListener('click', sendMcChat);
                chatInput.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMcChat(); }
                });
            }

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

        var _transcriptMsgCount = 0; // track message count for change detection
        var _transcriptAutoScroll = true; // auto-scroll unless user scrolled up
        var _transcriptPollTimer = null;

        function renderTranscriptMessages(messages) {
            var html = '';
            messages.slice(-80).forEach(function(m, idx) {
                var role = m.role || 'assistant';
                var content = typeof m.content === 'string' ? m.content : (m.content && m.content[0] && m.content[0].text ? m.content[0].text : '');
                var isToolUse = (!content && m.content && Array.isArray(m.content) && m.content.some(function(c) { return c.type === 'tool_use'; }));
                var isToolResult = m.role === 'tool' || (!content && m.content && Array.isArray(m.content) && m.content.some(function(c) { return c.type === 'tool_result'; }));

                if (isToolUse) {
                    var tools = m.content.filter(function(c) { return c.type === 'tool_use'; });
                    tools.forEach(function(t, ti) {
                        var toolId = 'tc_' + idx + '_' + ti;
                        html += '<div class="mc-transcript-tool" data-toggle="' + toolId + '">🔧 ' + escMc(t.name || 'tool') + '</div>';
                        html += '<div class="mc-transcript-tool-detail" id="' + toolId + '">' + escMc(JSON.stringify(t.input || {}, null, 2).substring(0, 500)) + '</div>';
                    });
                    return;
                }
                if (isToolResult) return;
                if (!content) return;

                // Clean up Telegram metadata from user messages
                if (role === 'user' || role === 'human') {
                    // Strip "[Telegram ... UTC] " prefix
                    content = content.replace(/^\[Telegram [^\]]*\]\s*/g, '');
                    // Strip "[message_id: ...]" footer
                    content = content.replace(/\n?\[message_id:\s*\d+\]\s*$/g, '');
                    // Strip "[Replying to ... ] ... [/Replying]" wrappers but keep the text
                    content = content.replace(/\[Replying to [^\]]*\]\s*/g, '').replace(/\s*\[\/Replying\]/g, '');
                    // Strip "Queued #N" lines and queue headers
                    content = content.replace(/^\[Queued messages while agent was busy\]\s*---\s*/g, '');
                    content = content.replace(/^Queued #\d+\s*/gm, '');
                }
                // Strip system prefixes from assistant
                if (role === 'assistant') {
                    content = content.replace(/^✅ New session started[^\n]*\n?/g, '');
                }
                content = content.trim();
                if (!content) return;

                var preview = content.length > 600 ? content.substring(0, 600) + '…' : content;
                var isUser = role === 'user' || role === 'human';
                var roleName = isUser ? 'Kira' : 'Sycopa';
                var roleClass = isUser ? 'mc-transcript-msg--user' : 'mc-transcript-msg--assistant';

                html += '<div class="mc-transcript-msg ' + roleClass + '">';
                html += '<div class="mc-transcript-bubble">';
                html += '<div class="mc-transcript-role">' + roleName + '</div>';
                html += '<div>' + escMc(preview).replace(/\n/g, '<br>') + '</div>';
                html += '</div></div>';
            });
            return html;
        }

        async function loadRawTranscript(forceRefresh) {
            var el = document.getElementById('mcRawTranscript');
            if (!el) return;
            if (mcTranscriptContent && !forceRefresh) {
                el.innerHTML = mcTranscriptContent;
                wireTranscriptToggles();
                if (_transcriptAutoScroll) {
                    requestAnimationFrame(function() {
                        setTimeout(function() {
                            var e = document.getElementById('mcRawTranscript');
                            if (e) e.scrollTop = e.scrollHeight + 9999;
                        }, 50);
                    });
                }
                startTranscriptPolling();
                return;
            }
            if (!mcTranscriptContent) {
                el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-tertiary);font-size:12px;">Loading transcript...</div>';
            }
            try {
                var resp = await skFetch(API_URL + '/api/oc/chat');
                if (resp.ok) {
                    var data = await resp.json();
                    var messages = data.messages || data || [];
                    if (Array.isArray(messages) && messages.length > 0) {
                        var newCount = messages.length;
                        var html = renderTranscriptMessages(messages);
                        mcTranscriptContent = html || '<div style="text-align:center;padding:20px;color:var(--text-tertiary);">(Empty transcript)</div>';
                        _transcriptMsgCount = newCount;
                    } else {
                        mcTranscriptContent = '<div style="text-align:center;padding:20px;color:var(--text-tertiary);">(No messages in transcript)</div>';
                    }
                } else {
                    mcTranscriptContent = '<div style="text-align:center;padding:20px;color:var(--text-tertiary);">(Could not fetch transcript — HTTP ' + resp.status + ')</div>';
                }
            } catch(e) { mcTranscriptContent = '<div style="text-align:center;padding:20px;color:var(--text-tertiary);">(Offline — connect API bridge)</div>'; }
            var el2 = document.getElementById('mcRawTranscript');
            if (el2) {
                el2.innerHTML = mcTranscriptContent;
                wireTranscriptToggles();
                // Auto-scroll to bottom after render completes
                if (_transcriptAutoScroll) {
                    requestAnimationFrame(function() {
                        setTimeout(function() {
                            var el3 = document.getElementById('mcRawTranscript');
                            if (el3) el3.scrollTop = el3.scrollHeight + 9999;
                        }, 50);
                    });
                }
            }
            startTranscriptPolling();
        }

        function startTranscriptPolling() {
            if (_transcriptPollTimer) return; // already polling
            _transcriptPollTimer = setInterval(function() {
                // Only poll if transcript is visible
                var el = document.getElementById('mcRawTranscript');
                if (!el || el.style.display === 'none') {
                    clearInterval(_transcriptPollTimer);
                    _transcriptPollTimer = null;
                    return;
                }
                // Refresh transcript
                loadRawTranscript(true);
            }, 5000); // poll every 5 seconds
        }

        // Detect user scroll-up to pause auto-scroll
        document.addEventListener('scroll', function(e) {
            if (e.target && e.target.id === 'mcRawTranscript') {
                var el = e.target;
                var atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
                _transcriptAutoScroll = atBottom;
            }
        }, true);

        function wireTranscriptToggles() {
            document.querySelectorAll('.mc-transcript-tool[data-toggle]').forEach(function(t) {
                t.addEventListener('click', function() {
                    var detail = document.getElementById(t.dataset.toggle);
                    if (detail) detail.style.display = detail.style.display === 'block' ? 'none' : 'block';
                });
            });
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

            // Remote Offices — placeholder, filled by loadRemoteOffices()
            html += '<div class="mc-section-title" style="margin-top:12px;">🌐 Remote Offices</div>';
            html += '<div id="mcRemoteList"><div style="text-align:center;padding:8px;color:var(--text-tertiary);font-size:11px;">Loading...</div></div>';

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
            // Load remote offices after DOM is ready
            (async function() {
                var remoteEl = document.getElementById('mcRemoteList');
                if (!remoteEl) return;
                try {
                    var apiUrl = window.OC_API_URL || (window.location.hostname.includes('spawnkit.ai') ? window.location.origin : 'http://127.0.0.1:8222');
                    var resp = await skFetch(apiUrl + '/api/remote/offices');
                    var data = await resp.json();
                    if (data.ok && data.offices && data.offices.length > 0) {
                        var rhtml = '';
                        data.offices.forEach(function(o) {
                            var dotColor = o.status === 'online' ? '#30D158' : o.status === 'stale' ? '#FF9500' : '#8E8E93';
                            var delta = o.lastSeen ? Date.now() - o.lastSeen : 0;
                            var ago = delta < 60000 ? 'just now' : delta < 3600000 ? Math.floor(delta/60000) + 'm ago' : Math.floor(delta/3600000) + 'h ago';
                            var wsLabel = o.wsConnections > 0 ? ' · ' + o.wsConnections + ' ws' : '';
                            rhtml += '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-subtle,rgba(0,0,0,0.06));">';
                            rhtml += '<div style="width:8px;height:8px;border-radius:50%;background:' + dotColor + ';flex-shrink:0;"></div>';
                            rhtml += '<div style="flex:1;min-width:0;">';
                            rhtml += '<div style="font-size:12px;font-weight:600;">' + (o.emoji||'🏢') + ' ' + (o.name||o.id) + '</div>';
                            rhtml += '<div style="font-size:10px;color:var(--text-tertiary);">' + o.status + ' · ' + ago + wsLabel + '</div>';
                            rhtml += '</div></div>';
                        });
                        if (data.relay) {
                            rhtml += '<div style="margin-top:6px;font-size:10px;color:var(--text-tertiary);text-align:center;">';
                            rhtml += '🔗 Relay v' + (data.relay.version||'?') + ' · ' + (data.relay.messages||0) + ' msgs · ' + (data.relay.wsTotal||0) + ' ws';
                            rhtml += '</div>';
                        }
                        remoteEl.innerHTML = rhtml;
                    } else {
                        remoteEl.innerHTML = '<div style="text-align:center;padding:8px;color:var(--text-tertiary);font-size:11px;">🔗 Fleet relay: <strong style="color:#FF9500;">Offline</strong></div>';
                    }
                } catch(e) {
                    remoteEl.innerHTML = '<div style="text-align:center;padding:8px;color:var(--text-tertiary);font-size:11px;">🔗 Fleet relay: <strong style="color:#8E8E93;">Not available</strong></div>';
                }
            })();
        }
    })();
