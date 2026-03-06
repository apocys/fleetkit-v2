/* ═══════════════════════════════════════════════
   SpawnKit Executive — Overlay Panels
   (Detail, TODO, Cron, Memory, Remote)
   ═══════════════════════════════════════════════ */
(function() {
    'use strict';
    var E = window.Exec;
    var AGENTS = E.AGENTS;
    var API = E.API;
    var DEFAULT_SKILLS = E.DEFAULT_SKILLS;
    var AVATAR_MAP = E.AVATAR_MAP;
    var esc = E.esc;
    var md = E.md;
    var showToast = E.showToast;
    var parseTodoMd = E.parseTodoMd;
    var loadLiveAgentData = E.loadLiveAgentData;

    /* ═══════════════════════════════════════════════
       TODO Panel DOM refs + openTodoForAgent
       ═══════════════════════════════════════════════ */

    // TODO Panel elements
    var todoOverlay     = document.getElementById('todoOverlay');
    var todoBackdrop    = document.getElementById('todoBackdrop');
    var todoClose       = document.getElementById('todoClose');
    var todoAvatar      = document.getElementById('todoAvatar');
    var todoName        = document.getElementById('todoName');
    var todoRole        = document.getElementById('todoRole');
    var todoContent     = document.getElementById('todoContent');

    // Wire TODO panel to show real agent data
    function openTodoForAgent(agentId) {
        var agent = AGENTS[agentId] || (window._spawnkitAgents && window._spawnkitAgents[agentId]);
        if (!agent) return;
        if (todoName) todoName.textContent = agent.name || agentId;
        if (todoRole) todoRole.textContent = agent.role || 'Agent';
        // Populate TODO list from LIVE_AGENT_DATA
        var data = E.LIVE_AGENT_DATA[agentId];
        if (todoContent && data && data.todos && data.todos.length) {
            var todoHtml = '';
            if (data.currentTask) {
                todoHtml += '<div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:12px;">\ud83c\udfaf ' + esc(data.currentTask) + '</div>';
            }
            data.todos.forEach(function(t) {
                var isDone = t.status === 'done';
                todoHtml += '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-subtle);">';
                todoHtml += '<span style="font-size:14px;">' + esc(t.icon) + '</span>';
                todoHtml += '<span style="font-size:13px;color:var(--text-primary);' + (isDone ? 'opacity:0.5;text-decoration:line-through;' : '') + '">' + esc(t.text) + '</span>';
                todoHtml += '</div>';
            });
            todoContent.innerHTML = todoHtml;
        } else if (todoContent) {
            todoContent.innerHTML = '<div style="color:var(--text-tertiary);font-size:13px;padding:16px 0;">No TODO data available. Connect to a live OpenClaw instance.</div>';
        }
        if (todoOverlay) todoOverlay.style.display = 'flex';
    }

    // Meeting Panel elements
    var meetingOverlay  = document.getElementById('meetingOverlay');
    var meetingBackdrop = document.getElementById('meetingBackdrop');
    var meetingClose    = document.getElementById('meetingClose');
    var meetingContent  = document.getElementById('meetingContent');

    // Chat/Cron/Memory panel elements — declared in unified implementation below

    /* ═══════════════════════════════════════════════
       TODO Panel — Open / Close
       ═══════════════════════════════════════════════ */

    /* ═══════════════════════════════════════════════
       Agent Detail Panel — NEW (Feature 1)
       Uses the new detail-overlay with rich content
       ═══════════════════════════════════════════════ */
    var detailOverlay  = document.getElementById('detailOverlay');
    var detailBackdrop = document.getElementById('detailBackdrop');
    var detailClose    = document.getElementById('detailClose');

    async function openDetailPanel(agentId) {
        // F13: Redirect CEO to Mission Control full-screen
        if (agentId === 'ceo' && typeof window.openMissionControl === 'function') {
            closeDetailPanel();
            window.openMissionControl();
            return;
        }

        window.closeMailbox();
        closeTodoPanel();

        var agent = AGENTS[agentId] || (window._spawnkitAgents && window._spawnkitAgents[agentId]);
        if (!agent) { console.warn('Agent registry unavailable for:', agentId); return; }

        // Hero section
        var avatarId = AVATAR_MAP[agent.name];
        var avatarEl = document.getElementById('detailAvatar');
        if (avatarId) {
            avatarEl.innerHTML = '<svg><use href="#' + esc(avatarId) + '"/></svg><div class="detail-hero-status" id="detailStatusDot"></div>';
        } else {
            avatarEl.innerHTML = '<div style="width:64px;height:64px;border-radius:50%;background:' + esc(agent.color) + ';display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;font-weight:700">' + esc(agent.name.charAt(0)) + '</div>';
        }
        var sc = (agent.status === 'active' || agent.status === 'working') ? 'var(--status-active)' :
                 (agent.status === 'busy' || agent.status === 'building') ? 'var(--status-busy)' : 'var(--status-idle)';
        var dot = document.getElementById('detailStatusDot');
        if (dot) dot.style.background = sc;

        document.getElementById('detailName').textContent = agent.name;
        document.getElementById('detailRole').textContent = agent.role;
        document.getElementById('detailTask').textContent = agent.task || (agent.status === 'idle' ? '\ud83d\udca4 Idle' : '\u2014');

        // Also update the TODO sidebar panel with this agent's data
        if (typeof window.openTodoForAgent === 'function') {
            window.openTodoForAgent(agentId);
        }

        // Build body
        var body = '';

        // Metrics section
        body += '<div class="detail-section"><div class="detail-section-title">Metrics</div>';
        // Calculate KPIs immediately from OcStore (no async wait)
        var kpiTokens = 0, kpiSessions = 0, kpiLastActive = 0, kpiModel = '\u2014';
        if (window.OcStore && window.OcStore.sessions.length > 0) {
            window.OcStore.sessions.forEach(function(s) {
                var match = false;
                if (agentId === 'ceo') {
                    match = (s.key && s.key.startsWith('agent:main'));
                } else {
                    match = (s.kind === 'subagent' && s.label && s.label.toLowerCase().indexOf(agentId.toLowerCase()) >= 0);
                }
                if (match) {
                    kpiTokens += s.totalTokens || 0;
                    kpiSessions++;
                    if (s.lastActive > kpiLastActive) {
                        kpiLastActive = s.lastActive;
                        if (s.model && s.model !== 'unknown') kpiModel = s.model;
                    }
                }
            });
        }
        var kpiLastStr = '\u2014';
        if (kpiLastActive > 0) {
            var kpiAgo = Date.now() - kpiLastActive;
            kpiLastStr = kpiAgo < 60000 ? 'Just now' :
                kpiAgo < 3600000 ? Math.floor(kpiAgo/60000) + 'm ago' :
                kpiAgo < 86400000 ? Math.floor(kpiAgo/3600000) + 'h ago' :
                Math.floor(kpiAgo/86400000) + 'd ago';
        }
        body += '<div class="detail-metrics">';
        body += '<div class="detail-metric"><div class="detail-metric-value">' + (['active','working','busy','building'].indexOf(agent.status) >= 0 ? '\ud83d\udfe2' : '\ud83d\udca4') + '</div><div class="detail-metric-label">Status</div></div>';
        body += '<div class="detail-metric"><div class="detail-metric-value">' + (kpiTokens > 0 ? kpiTokens.toLocaleString() : '\u2014') + '</div><div class="detail-metric-label">Tokens Used</div></div>';
        body += '<div class="detail-metric"><div class="detail-metric-value">' + (kpiSessions > 0 ? kpiSessions.toString() : '\u2014') + '</div><div class="detail-metric-label">Sessions</div></div>';
        body += '<div class="detail-metric"><div class="detail-metric-value">' + kpiLastStr + '</div><div class="detail-metric-label">Last Active</div></div>';
        body += '</div></div>';

        // Use cached sessions from OcStore (no extra fetch)
        (async function() {
            try {
                var sessions = (window.OcStore && window.OcStore.sessions) || [];
                // Map agentId to session key patterns
                // Match strategy per agent role
                var totalTokens = 0, subCount = 0, lastActiveMs = 0, modelName = '\u2014';
                sessions.forEach(function(s) {
                    var keyMatch = false;
                    if (agentId === 'ceo') {
                        // CEO = main agent + all subagents + all crons (the whole operation)
                        keyMatch = (s.key && s.key.startsWith('agent:main'));
                    } else {
                        // Other roles: match subagents whose label contains the role name
                        var roleName = agentId.toLowerCase();
                        keyMatch = (s.kind === 'subagent' && s.label && s.label.toLowerCase().indexOf(roleName) >= 0);
                    }
                    if (keyMatch) {
                        totalTokens += s.totalTokens || 0;
                        subCount++;
                        if (s.lastActive > lastActiveMs) {
                            lastActiveMs = s.lastActive;
                            if (s.model && s.model !== 'unknown') modelName = s.model;
                        }
                    }
                });
                var metricsEls = document.querySelectorAll('#detailBody .detail-metric-value');
                if (metricsEls.length >= 4) {
                    if (totalTokens > 0) metricsEls[1].textContent = totalTokens.toLocaleString();
                    if (subCount > 0) metricsEls[2].textContent = subCount.toString();
                    if (lastActiveMs > 0) {
                        var ago = Date.now() - lastActiveMs;
                        var agoStr = ago < 60000 ? 'Just now' :
                            ago < 3600000 ? Math.floor(ago/60000) + 'm ago' :
                            ago < 86400000 ? Math.floor(ago/3600000) + 'h ago' :
                            Math.floor(ago/86400000) + 'd ago';
                        metricsEls[3].textContent = agoStr;
                    }
                }
                // Also update model in detail if available
                var modelEl = document.querySelector('#detailBody .detail-metric-label');
                if (modelName !== '\u2014') {
                    var modelRow = document.getElementById('detailModel');
                    if (modelRow) modelRow.textContent = modelName;
                }
            } catch(e) { console.warn('Metrics load error:', e); }
        })();

        // TODO list section — from REAL live data only
        var todoData = E.LIVE_AGENT_DATA[agentId];
        if (todoData) {
            body += '<div class="detail-section"><div class="detail-section-title">Current Task</div>';
            body += '<div style="font-size:14px;font-weight:500;color:var(--text-primary)">' + esc(todoData.currentTask || agent.task || 'Idle') + '</div>';
            body += '</div>';

            if (todoData.todos && todoData.todos.length) {
                body += '<div class="detail-section"><div class="detail-section-title">TODO List</div>';
                todoData.todos.forEach(function(todo) {
                    body += '<div class="detail-todo-item' + (todo.status === 'done' ? ' detail-todo-item--done' : '') + '">';
                    body += '<span class="detail-todo-icon">' + esc(todo.icon) + '</span>';
                    body += '<span class="detail-todo-text">' + esc(todo.text) + '</span>';
                    body += '</div>';
                });
                body += '</div>';
            }
        }

        // Sub-agents section — fetched from API bridge (F8)
        body += '<div class="detail-section" id="detailSubAgents"><div class="detail-section-title">Sub-Agents</div>';
        body += '<div id="detailSubAgentList" style="color:var(--text-tertiary);font-size:13px;">Loading...</div></div>';

        // Populate sub-agents from OcStore cache (no extra fetch)
        (async function() {
            try {
                var sessions = (window.OcStore && window.OcStore.sessions) || [];
                var agentKeyMap = { ceo: 'main', atlas: 'atlas', forge: 'forge', hunter: 'hunter', echo: 'echo', sentinel: 'sentinel' };
                var matchKey = agentKeyMap[agentId] || agentId;
                // Find sub-agents: sessions with kind=subagent whose label contains the matchKey
                var subs = sessions.filter(function(s) {
                    if (s.kind !== 'subagent') return false;
                    if (matchKey === 'main') return true; // CEO sees all sub-agents
                    return s.label && s.label.toLowerCase().indexOf(matchKey) >= 0;
                });
                var el = document.getElementById('detailSubAgentList');
                if (!el) return;
                if (subs.length === 0) {
                    el.textContent = 'No active sub-agents';
                    return;
                }
                // Sort by lastActive descending, show max 10
                subs.sort(function(a, b) { return (b.lastActive || 0) - (a.lastActive || 0); });
                var subHtml = '';
                subs.slice(0, 10).forEach(function(s) {
                    var isActive = s.status === 'active';
                    var ago = Date.now() - (s.lastActive || 0);
                    var agoStr = ago < 60000 ? 'now' : ago < 3600000 ? Math.floor(ago/60000) + 'm' : Math.floor(ago/3600000) + 'h';
                    subHtml += '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-subtle);">';
                    subHtml += '<span style="width:6px;height:6px;border-radius:50%;background:' + (isActive ? '#30D158' : '#8E8E93') + ';flex-shrink:0;"></span>';
                    subHtml += '<div style="flex:1;min-width:0;">';
                    subHtml += '<div style="font-size:13px;font-weight:500;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(s.label || s.displayName || 'sub-agent') + '</div>';
                    subHtml += '<div style="font-size:11px;color:var(--text-tertiary);">' + esc(s.model || '\u2014') + ' \u00b7 ' + (s.totalTokens || 0).toLocaleString() + ' tokens</div>';
                    subHtml += '</div>';
                    subHtml += '<span style="font-size:10px;color:var(--text-tertiary);white-space:nowrap;">' + agoStr + '</span>';
                    subHtml += '</div>';
                });
                if (subs.length > 10) subHtml += '<div style="font-size:11px;color:var(--text-tertiary);padding-top:4px;">+' + (subs.length - 10) + ' more</div>';
                el.innerHTML = subHtml;
            } catch(e) {
                var el2 = document.getElementById('detailSubAgentList');
                if (el2) el2.textContent = 'Offline \u2014 connect API bridge';
            }
        })();

        // Skills section — from real per-agent SKILLS.md (FIX #5) + management (NEW #1)
        var agentSkills = (todoData && todoData.skills && todoData.skills.length) ? todoData.skills : [];
        if (agentSkills.length > 0) {
            body += '<div class="detail-section"><div class="detail-section-title">Skills</div>';
            body += '<div class="detail-skill-chips" id="detailSkillChips">';
            agentSkills.forEach(function(s, idx) {
                body += '<span class="detail-skill-chip" data-skill-idx="' + idx + '">' + esc(s.name || s) + ' <button class="skill-remove-btn" data-skill-name="' + esc(s.name || s) + '" title="Remove skill" style="background:none;border:none;cursor:pointer;color:var(--text-tertiary);font-size:11px;margin-left:4px;padding:0 2px;">\u00d7</button></span>';
            });
            body += '</div>';
            body += '<button class="detail-add-skill-btn" id="addSkillBtn" style="margin-top:8px;padding:6px 14px;border-radius:8px;border:1px dashed var(--border-medium);background:transparent;color:var(--exec-blue);font-size:12px;font-weight:500;cursor:pointer;">+ Add Skill</button>';
            body += '</div>';
        } else {
            body += '<div class="detail-section"><div class="detail-section-title">Skills</div>';
            body += '<div style="color:var(--text-tertiary);font-size:13px;">No skills defined in SKILLS.md</div>';
            body += '<button class="detail-add-skill-btn" id="addSkillBtn" style="margin-top:8px;padding:6px 14px;border-radius:8px;border:1px dashed var(--border-medium);background:transparent;color:var(--exec-blue);font-size:12px;font-weight:500;cursor:pointer;">+ Add Skill</button>';
            body += '</div>';
        }

        // SOUL excerpt + Edit button (NEW #4)
        if (API) {
            try {
                var agentInfo = await API.getAgentInfo(agentId);
                if (agentInfo && agentInfo.soul) {
                    var excerpt = agentInfo.soul.substring(0, 500);
                    body += '<div class="detail-section"><div class="detail-section-title">Soul (Personality)</div>';
                    body += '<div class="detail-soul-excerpt" id="soulExcerpt">' + excerpt.replace(/</g,'&lt;').replace(/>/g,'&gt;') + (agentInfo.soul.length > 500 ? '\u2026' : '') + '</div>';

                    // Edit button — disabled for sub-agents
                    if (agentId !== 'ceo') {
                        body += '<button class="detail-edit-btn" id="editAgentBtn" style="margin-top:8px;padding:6px 14px;border-radius:8px;border:1px solid var(--exec-blue);background:transparent;color:var(--exec-blue);font-size:12px;font-weight:500;cursor:pointer;">\u270f\ufe0f Edit Agent</button>';
                    }
                    body += '</div>';
                }
            } catch(e) {}
        }

        document.getElementById('detailBody').innerHTML = body;

        // Wire up skill management buttons (NEW #1) — works with or without API
        var addSkillBtn = document.getElementById('addSkillBtn');
        if (addSkillBtn) {
            addSkillBtn.addEventListener('click', async function() {
                try {
                    // Try API first, fallback to default skill catalog
                    var available = null;
                    if (API && typeof API.listAvailableSkills === 'function') {
                        try { available = await API.listAvailableSkills(); } catch(e) {}
                    }
                    if (!available || available.length === 0) {
                        // Fallback: built-in skill catalog
                        available = [
                            { name: '\ud83d\udd0d Web Search', description: 'Search the web for information' },
                            { name: '\ud83d\udcdd Code Review', description: 'Review and improve code quality' },
                            { name: '\ud83e\uddea Testing', description: 'Write and run automated tests' },
                            { name: '\ud83d\udcca Data Analysis', description: 'Analyze data and generate reports' },
                            { name: '\ud83c\udf10 API Integration', description: 'Connect to external APIs' },
                            { name: '\ud83d\udcc4 Documentation', description: 'Write technical documentation' },
                            { name: '\ud83d\udee1\ufe0f Security Audit', description: 'Scan for vulnerabilities' },
                            { name: '\ud83c\udfa8 UI/UX Design', description: 'Design user interfaces' },
                            { name: '\u26a1 Performance', description: 'Optimize speed and efficiency' },
                            { name: '\ud83d\udd04 CI/CD', description: 'Continuous integration pipelines' },
                            { name: '\ud83d\udcac Communication', description: 'Send messages and notifications' },
                            { name: '\ud83d\udcc5 Scheduling', description: 'Schedule and manage cron tasks' }
                        ];
                    }
                    // Show skill picker dropdown
                    var dropdown = document.createElement('div');
                    dropdown.style.cssText = 'position:absolute;background:var(--bg-secondary);border:1px solid var(--border-medium);border-radius:12px;padding:8px;z-index:999;box-shadow:0 8px 30px rgba(0,0,0,0.15);max-height:240px;overflow-y:auto;min-width:220px;';
                    var dropdownHeader = document.createElement('div');
                    dropdownHeader.style.cssText = 'padding:6px 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-tertiary);font-weight:600;margin-bottom:4px;';
                    dropdownHeader.textContent = 'Available Skills';
                    dropdown.appendChild(dropdownHeader);
                    available.forEach(function(skill) {
                        var item = document.createElement('div');
                        item.style.cssText = 'padding:8px 12px;cursor:pointer;font-size:13px;border-radius:8px;transition:background 0.15s;';
                        var itemName = document.createElement('div');
                        itemName.style.cssText = 'font-weight:500;color:var(--text-primary)';
                        itemName.textContent = skill.name;
                        item.appendChild(itemName);
                        if (skill.description) {
                            var itemDesc = document.createElement('div');
                            itemDesc.style.cssText = 'font-size:11px;color:var(--text-tertiary);margin-top:2px';
                            itemDesc.textContent = skill.description;
                            item.appendChild(itemDesc);
                        }
                        item.onmouseover = function() { item.style.background = 'var(--bg-tertiary)'; };
                        item.onmouseout = function() { item.style.background = ''; };
                        item.onclick = async function() {
                            dropdown.remove();
                            var currentSkills = (todoData && todoData.skills) ? todoData.skills.slice() : [];
                            currentSkills.push({ name: skill.name, description: skill.description || '', location: skill.location || '' });

                            // Try API save, fallback to local-only
                            if (API && typeof API.saveAgentSkills === 'function') {
                                try {
                                    var result = await API.saveAgentSkills(agentId, currentSkills);
                                    if (result && result.success) {
                                        showToast('\u2705 Skill "' + skill.name + '" added');
                                        await loadLiveAgentData();
                                        openDetailPanel(agentId);
                                        return;
                                    }
                                } catch(e) {}
                            }
                            // Fallback: persist in localStorage + update UI
                            var storageKey = 'spawnkit-agent-skills-' + agentId.replace(/[^a-z0-9\-]/g, '');
                            var savedSkills = [];
                            try { savedSkills = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch(e) { savedSkills = []; }
                            if (!Array.isArray(savedSkills)) savedSkills = [];
                            // Dedup: check BEFORE adding to UI
                            if (savedSkills.indexOf(skill.name) !== -1) {
                                showToast('\u26a0\ufe0f Skill "' + skill.name + '" already added');
                                return;
                            }
                            savedSkills.push(skill.name);
                            localStorage.setItem(storageKey, JSON.stringify(savedSkills));

                            var chipsEl = document.getElementById('detailSkillChips');
                            if (chipsEl) {
                                var chip = document.createElement('span');
                                chip.className = 'detail-skill-chip';
                                chip.textContent = skill.name;
                                // Add remove button
                                var removeBtn = document.createElement('span');
                                removeBtn.textContent = ' \u00d7';
                                removeBtn.style.cssText = 'cursor:pointer;margin-left:4px;opacity:0.6;';
                                removeBtn.onclick = function(e) {
                                    e.stopPropagation();
                                    chip.remove();
                                    var ss = [];
                                    try { ss = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch(e2) { ss = []; }
                                    if (!Array.isArray(ss)) ss = [];
                                    ss = ss.filter(function(s) { return s !== skill.name; });
                                    localStorage.setItem(storageKey, JSON.stringify(ss));
                                    showToast('Skill "' + skill.name + '" removed');
                                };
                                chip.appendChild(removeBtn);
                                chipsEl.appendChild(chip);
                            }
                            showToast('\u2705 Skill "' + skill.name + '" added');
                        };
                        dropdown.appendChild(item);
                    });
                    addSkillBtn.parentElement.style.position = 'relative';
                    addSkillBtn.parentElement.appendChild(dropdown);
                    // Position dropdown near button
                    var btnRect = addSkillBtn.getBoundingClientRect();
                    var parentRect = addSkillBtn.parentElement.getBoundingClientRect();
                    dropdown.style.left = (btnRect.left - parentRect.left) + 'px';
                    dropdown.style.top = (btnRect.bottom - parentRect.top + 4) + 'px';
                    // Close on click outside
                    setTimeout(function() {
                        document.addEventListener('click', function closeDropdown(e) {
                            if (!dropdown.contains(e.target) && e.target !== addSkillBtn) { dropdown.remove(); document.removeEventListener('click', closeDropdown); }
                        });
                    }, 10);
                } catch(e) { showToast('Error loading skills: ' + e.message); }
            });
        }

        // Wire up skill remove buttons
        document.querySelectorAll('.skill-remove-btn').forEach(function(btn) {
            btn.addEventListener('click', async function(e) {
                e.stopPropagation();
                var skillName = btn.dataset.skillName;
                if (!API) return;
                var currentSkills = (todoData && todoData.skills) ? todoData.skills.filter(function(s) { return (s.name || s) !== skillName; }) : [];
                var result = await API.saveAgentSkills(agentId, currentSkills);
                if (result && result.success) {
                    showToast('Skill "' + skillName + '" removed');
                    await loadLiveAgentData();
                    openDetailPanel(agentId);
                }
            });
        });

        // Wire up Edit Agent button (NEW #4)
        var editBtn = document.getElementById('editAgentBtn');
        if (editBtn && API) {
            editBtn.addEventListener('click', function() {
                var soulEl = document.getElementById('soulExcerpt');
                if (!soulEl) return;

                // Replace soul excerpt with inline editor
                var editorEl = document.createElement('div');
                editorEl.className = 'soul-editor';
                editorEl.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

                var nameLabel = document.createElement('label');
                nameLabel.style.cssText = 'font-size:11px;color:var(--text-tertiary);';
                nameLabel.textContent = 'Name';
                editorEl.appendChild(nameLabel);

                var nameInput = document.createElement('input');
                nameInput.type = 'text';
                nameInput.id = 'editName';
                nameInput.value = agent.name || '';
                nameInput.style.cssText = 'padding:6px 10px;border-radius:8px;border:1px solid var(--border-medium);font-size:13px;background:var(--bg-tertiary);color:var(--text-primary);';
                editorEl.appendChild(nameInput);

                var roleLabel = document.createElement('label');
                roleLabel.style.cssText = 'font-size:11px;color:var(--text-tertiary);';
                roleLabel.textContent = 'Role';
                editorEl.appendChild(roleLabel);

                var roleInput = document.createElement('input');
                roleInput.type = 'text';
                roleInput.id = 'editRole';
                roleInput.value = agent.role || '';
                roleInput.style.cssText = 'padding:6px 10px;border-radius:8px;border:1px solid var(--border-medium);font-size:13px;background:var(--bg-tertiary);color:var(--text-primary);';
                editorEl.appendChild(roleInput);

                var traitsLabel = document.createElement('label');
                traitsLabel.style.cssText = 'font-size:11px;color:var(--text-tertiary);';
                traitsLabel.textContent = 'Traits';
                editorEl.appendChild(traitsLabel);

                var traitsInput = document.createElement('input');
                traitsInput.type = 'text';
                traitsInput.id = 'editTraits';
                traitsInput.placeholder = 'e.g. meticulous, strategic';
                traitsInput.style.cssText = 'padding:6px 10px;border-radius:8px;border:1px solid var(--border-medium);font-size:13px;background:var(--bg-tertiary);color:var(--text-primary);';
                editorEl.appendChild(traitsInput);

                var btnRow = document.createElement('div');
                btnRow.style.cssText = 'display:flex;gap:8px;margin-top:4px;';

                var saveBtn = document.createElement('button');
                saveBtn.id = 'saveEditBtn';
                saveBtn.style.cssText = 'padding:6px 16px;border-radius:8px;border:none;background:var(--exec-blue);color:#fff;font-size:12px;font-weight:500;cursor:pointer;';
                saveBtn.textContent = 'Save';
                btnRow.appendChild(saveBtn);

                var cancelBtn = document.createElement('button');
                cancelBtn.id = 'cancelEditBtn';
                cancelBtn.style.cssText = 'padding:6px 16px;border-radius:8px;border:1px solid var(--border-medium);background:transparent;color:var(--text-secondary);font-size:12px;cursor:pointer;';
                cancelBtn.textContent = 'Cancel';
                btnRow.appendChild(cancelBtn);

                editorEl.appendChild(btnRow);

                soulEl.textContent = '';
                soulEl.appendChild(editorEl);
                editBtn.style.display = 'none';

                cancelBtn.addEventListener('click', function() {
                    openDetailPanel(agentId);
                });

                saveBtn.addEventListener('click', async function() {
                    var name = document.getElementById('editName').value.trim();
                    var role = document.getElementById('editRole').value.trim();
                    var traits = document.getElementById('editTraits').value.trim();
                    var result = await API.saveAgentSoul(agentId, { name: name, role: role, traits: traits });
                    if (result && result.success) {
                        showToast('\u2705 Agent updated');
                        openDetailPanel(agentId);
                    } else {
                        showToast('\u26a0\ufe0f Failed to save: ' + (result.error || 'unknown'));
                    }
                });
            });
        }

        window.closeAllPanels();
        detailOverlay.classList.add('open');
        detailClose.focus();
        document.body.style.overflow = 'hidden';
    }

    function closeDetailPanel() {
        detailOverlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    detailBackdrop.addEventListener('click', closeDetailPanel);
    detailClose.addEventListener('click', closeDetailPanel);

    /* Keep the old openTodoPanel as a wrapper for backwards compat */
    function openTodoPanel(agentId) {
        openDetailPanel(agentId);
    }

    function closeTodoPanel() {
        todoOverlay.classList.remove('open');
        closeDetailPanel();
        document.body.style.overflow = '';
    }

    todoBackdrop.addEventListener('click', closeTodoPanel);
    todoClose.addEventListener('click', closeTodoPanel);

    /* ═══════════════════════════════════════════════
       Cron / Calendar Panel (Feature 4)
       ═══════════════════════════════════════════════ */
    var cronOverlay = document.getElementById('cronOverlay');
    var cronBackdropEl = document.getElementById('cronBackdrop');
    var cronCloseBtn = document.getElementById('cronClose');
    var cronBody = document.getElementById('cronBody');

    function openCronPanel() {
        window.closeAllPanels();
        cronOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        renderCronJobs();
    }
    function closeCronPanel() {
        cronOverlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    document.getElementById('cronBtn').addEventListener('click', openCronPanel);
    cronBackdropEl.addEventListener('click', closeCronPanel);
    cronCloseBtn.addEventListener('click', closeCronPanel);

    function humanCron(schedule) {
        if (!schedule) return '\u2014';
        // Handle string-based cron expressions
        if (typeof schedule === 'string') {
            var m = { '*/30 * * * *': 'Every 30 min', '0 * * * *': 'Every hour',
                      '0 9 * * *': 'Daily 9:00', '0 9 * * 1': 'Mon 9:00',
                      '*/5 * * * *': 'Every 5 min', '0 */2 * * *': 'Every 2h',
                      '0 8 * * 1-5': 'Weekdays 8:00', '30 6 * * *': 'Daily 6:30',
                      '0 0,6,12,18 * * *': 'Every 6h', '0 8 * * *': 'Daily 8:00' };
            if (m[schedule]) return m[schedule];
            // Try to parse simple cron: M H * * *
            var parts = schedule.split(' ');
            if (parts.length === 5 && parts[2] === '*' && parts[3] === '*') {
                var min = parts[0], hour = parts[1], dow = parts[4];
                if (dow === '*' && !hour.includes(',') && !hour.includes('/')) {
                    return 'Daily ' + hour.padStart(2,'0') + ':' + min.padStart(2,'0');
                }
                if (dow === '1-5') return 'Weekdays ' + hour.padStart(2,'0') + ':' + min.padStart(2,'0');
            }
            return schedule;
        }
        // Handle OpenClaw schedule objects {kind, everyMs, cron, anchorMs}
        if (typeof schedule === 'object') {
            if (schedule.kind === 'every' && schedule.everyMs) {
                var ms = schedule.everyMs;
                if (ms < 60000) return 'Every ' + Math.round(ms / 1000) + 's';
                if (ms < 3600000) return 'Every ' + Math.round(ms / 60000) + ' min';
                if (ms < 86400000) return 'Every ' + (ms / 3600000).toFixed(0) + 'h';
                return 'Every ' + (ms / 86400000).toFixed(0) + ' days';
            }
            if (schedule.kind === 'cron' && (schedule.cron || schedule.expr)) {
                return humanCron(schedule.cron || schedule.expr); // Recurse with string
            }
            if (schedule.kind === 'daily') {
                return 'Daily' + (schedule.atHour !== undefined ? ' ' + String(schedule.atHour).padStart(2,'0') + ':00' : '');
            }
            return schedule.kind || '\u2014';
        }
        return String(schedule);
    }

    async function renderCronJobs() {
        var crons = null;

        // Show loading state (safe: static string, no user input)
        cronBody.textContent = '';
        var loadingEl = document.createElement('div');
        loadingEl.style.cssText = 'text-align:center;padding:40px 20px;color:var(--text-tertiary);font-size:13px;';
        loadingEl.textContent = 'Loading cron jobs\u2026';
        cronBody.appendChild(loadingEl);

        // 1) Prefer API bridge (has full state with nextRunAtMs)
        try {
            var apiUrl = (window.OC_API_URL || (window.location.origin));
            var fetchFn = (window.skFetch || fetch);
            var resp = await fetchFn(apiUrl + '/api/oc/crons');
            if (resp.ok) {
                var data = await resp.json();
                crons = data.jobs || data.crons || (Array.isArray(data) ? data : []);
            }
        } catch(e) {}

        // 2) Fallback to cached liveCronData if bridge failed
        if ((!crons || !Array.isArray(crons) || crons.length === 0) && E.liveCronData) {
            crons = E.liveCronData;
        }

        // 3) Fallback to SpawnKit data-bridge (direct)
        if ((!crons || !Array.isArray(crons) || crons.length === 0) && window.SpawnKit && window.SpawnKit.data && window.SpawnKit.data.crons) {
            crons = window.SpawnKit.data.crons;
        }

        // 4) Fallback to API bridge getCrons() (may have loaded since prefetch)
        if ((!crons || !Array.isArray(crons) || crons.length === 0) && window.OcStore && window.OcStore.crons) {
            try { crons = window.OcStore.crons.jobs || []; } catch(e) {}
        }

        if (!crons || !Array.isArray(crons) || crons.length === 0) {
            var emptyEl = document.createElement('div');
            emptyEl.className = 'cron-empty';
            emptyEl.style.cssText = 'text-align:center;padding:40px 20px;';
            var emptyIcon = document.createElement('div');
            emptyIcon.style.cssText = 'font-size:40px;margin-bottom:12px;';
            emptyIcon.textContent = '\ud83d\udcc5';
            emptyEl.appendChild(emptyIcon);
            var emptyTitle = document.createElement('div');
            emptyTitle.style.cssText = 'font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:6px;';
            emptyTitle.textContent = 'No Cron Jobs';
            emptyEl.appendChild(emptyTitle);
            var emptyDesc = document.createElement('div');
            emptyDesc.style.cssText = 'font-size:12px;color:var(--text-tertiary);line-height:1.5;';
            emptyDesc.textContent = 'No scheduled jobs found. Crons defined in OpenClaw will appear here automatically.';
            emptyEl.appendChild(emptyDesc);
            cronBody.textContent = '';
            cronBody.appendChild(emptyEl);
            return;
        }

        // Group by owner
        var groups = {};
        crons.forEach(function(c) {
            var owner = c.owner || 'System';
            if (!groups[owner]) groups[owner] = [];
            groups[owner].push(c);
        });

        // Build cron list using DOM methods
        cronBody.textContent = '';
        Object.keys(groups).forEach(function(owner) {
            var groupEl = document.createElement('div');
            groupEl.className = 'cron-group';
            var groupTitle = document.createElement('div');
            groupTitle.className = 'cron-group-title';
            groupTitle.textContent = owner;
            groupEl.appendChild(groupTitle);

            groups[owner].forEach(function(c) {
                // Normalize status from OpenClaw format (enabled boolean + state obj) or string
                var status = c.status || (c.enabled === true ? 'active' : c.enabled === false ? 'paused' : 'unknown');
                if (c.state && c.state.lastStatus === 'error') status = 'error';
                var statusCls = status === 'active' ? 'active' : status === 'error' ? 'error' : 'paused';
                var icon = status === 'active' ? '\u23f0' : status === 'error' ? '\u274c' : '\u23f8\ufe0f';
                // Get next run from state.nextRunAtMs or c.nextRun
                var nextRunMs = (c.state && c.state.nextRunAtMs) || c.nextRun;
                var nextRun = nextRunMs ? new Date(nextRunMs).toLocaleString('en-GB', {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '\u2014';

                var itemEl = document.createElement('div');
                itemEl.className = 'cron-item';

                var iconSpan = document.createElement('span');
                iconSpan.className = 'cron-item-icon';
                iconSpan.textContent = icon;
                itemEl.appendChild(iconSpan);

                var infoDiv = document.createElement('div');
                infoDiv.className = 'cron-item-info';

                var nameDiv = document.createElement('div');
                nameDiv.className = 'cron-item-name';
                nameDiv.textContent = c.name || c.id || 'Unnamed';
                infoDiv.appendChild(nameDiv);

                var schedDiv = document.createElement('div');
                schedDiv.className = 'cron-item-schedule';
                schedDiv.textContent = humanCron(c.schedule);
                infoDiv.appendChild(schedDiv);

                var nextDiv = document.createElement('div');
                nextDiv.className = 'cron-item-next';
                nextDiv.textContent = 'Next: ' + nextRun;
                infoDiv.appendChild(nextDiv);

                if (nextRunMs) {
                    var countdownDiv = document.createElement('div');
                    countdownDiv.className = 'cron-countdown';
                    countdownDiv.dataset.nextRun = nextRunMs;
                    countdownDiv.style.cssText = 'font-size:11px;font-weight:600;color:var(--exec-blue);font-family:\'SF Mono\',monospace;margin-top:2px;';
                    countdownDiv.textContent = '\u23f1 calculating...';
                    infoDiv.appendChild(countdownDiv);
                }
                itemEl.appendChild(infoDiv);

                var statusSpan = document.createElement('span');
                statusSpan.className = 'cron-item-status cron-item-status--' + statusCls;
                statusSpan.textContent = status;
                itemEl.appendChild(statusSpan);

                var toggleBtn = document.createElement('button');
                toggleBtn.className = 'cron-toggle' + (c.enabled !== false ? ' on' : '');
                toggleBtn.dataset.cronId = c.id || '';
                toggleBtn.setAttribute('aria-label', 'Toggle');
                itemEl.appendChild(toggleBtn);

                groupEl.appendChild(itemEl);
            });
            cronBody.appendChild(groupEl);
        });

        // Toggle click -> API call
        cronBody.querySelectorAll('.cron-toggle').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var cronId = btn.dataset.cronId;
                var currentState = btn.classList.contains('on');
                btn.classList.toggle('on'); // optimistic update
                var apiUrl = window.OC_API_URL || (window.location.origin);
                (window.skFetch || fetch)(apiUrl + '/api/oc/crons', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({action: 'update', jobId: cronId, patch: {enabled: !currentState}})
                }).then(function(r) {
                    if (!r.ok) throw new Error('HTTP ' + r.status);
                    return r.json();
                }).then(function(data) {
                    if (!data.ok && data.ok !== undefined) throw new Error(data.error || 'Failed');
                    showToast((currentState ? '\u23f8 Cron disabled' : '\u25b6\ufe0f Cron enabled'));
                }).catch(function(err) {
                    btn.classList.toggle('on'); // revert
                    showToast('\u26a0\ufe0f Failed to update cron: ' + err.message);
                });
            });
        });

        // Make cron items clickable -> show details
        cronBody.querySelectorAll('.cron-item').forEach(function(item, idx) {
            item.style.cursor = 'pointer';
            item.addEventListener('click', function() {
                var c = crons[idx];
                if (!c) return;
                var details = '\ud83d\udcc5 ' + (c.name || 'Unnamed') + '\n\n';
                details += 'Schedule: ' + humanCron(c.schedule) + '\n';
                details += 'Enabled: ' + (c.enabled !== false ? 'Yes' : 'No') + '\n';
                details += 'ID: ' + (c.id || '\u2014') + '\n';
                if (c.state && c.state.lastRunAtMs) details += 'Last run: ' + new Date(c.state.lastRunAtMs).toLocaleString() + '\n';
                if (c.state && c.state.nextRunAtMs) details += 'Next run: ' + new Date(c.state.nextRunAtMs).toLocaleString() + '\n';
                if (c.payload && c.payload.kind) details += 'Type: ' + c.payload.kind + '\n';
                alert(details);
            });
        });

        // Start countdown timer — atomic swap to prevent orphaned intervals
        var prevInterval = window._cronCountdownInterval;
        window._cronCountdownInterval = null;
        if (prevInterval) clearInterval(prevInterval);
        window._cronCountdownInterval = setInterval(function() {
            document.querySelectorAll('.cron-countdown[data-next-run]').forEach(function(el) {
                var nextMs = parseInt(el.dataset.nextRun);
                if (!nextMs) return;
                var diff = nextMs - Date.now();
                if (diff <= 0) {
                    el.textContent = '\u23f1 Running now...';
                    el.style.color = '#30D158';
                } else {
                    var h = Math.floor(diff / 3600000);
                    var m = Math.floor((diff % 3600000) / 60000);
                    var s = Math.floor((diff % 60000) / 1000);
                    el.textContent = '\u23f1 ' + (h > 0 ? h + 'h ' : '') + m + 'm ' + s + 's';
                }
            });
        }, 1000);
    }

    /* ═══════════════════════════════════════════════
       Memory View Panel (Feature 5)
       ═══════════════════════════════════════════════ */
    var memoryOverlay = document.getElementById('memoryOverlay');
    var memoryBackdropEl = document.getElementById('memoryBackdrop');
    var memoryCloseBtn = document.getElementById('memoryClose');
    var memoryBody = document.getElementById('memoryBody');

    function openMemoryPanel() {
        window.closeAllPanels();
        memoryOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        renderMemory();
    }
    function closeMemoryPanel() {
        memoryOverlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    document.getElementById('memoryBtn').addEventListener('click', openMemoryPanel);
    memoryBackdropEl.addEventListener('click', closeMemoryPanel);
    memoryCloseBtn.addEventListener('click', closeMemoryPanel);

    function renderMarkdown(mdStr) {
        if (!mdStr) return '<em>No content</em>';
        return mdStr
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.+?)`/g, '<code>$1</code>')
            .replace(/^- (.+)$/gm, '<li>$1</li>')
            .replace(/\n{2,}/g, '<br><br>')
            .replace(/\n/g, '<br>');
    }

    async function renderMemory() {
        // Show loading state
        memoryBody.textContent = '';
        var loadingEl = document.createElement('div');
        loadingEl.style.cssText = 'text-align:center;padding:40px 20px;color:var(--text-tertiary);font-size:13px;';
        loadingEl.textContent = 'Loading memory\u2026';
        memoryBody.appendChild(loadingEl);

        var mem = E.liveMemoryData;
        // Resolve if liveMemoryData is a Promise
        if (mem && typeof mem.then === 'function') {
            try { mem = await mem; } catch(e) { mem = null; }
        }
        if (API && !mem) {
            try { mem = (window.OcStore && window.OcStore.memory) ? window.OcStore.memory : {}; } catch(e) {}
        }

        // Fallback to SpawnKit data-bridge (direct)
        if (!mem && window.SpawnKit && window.SpawnKit.data && window.SpawnKit.data.memory) {
            mem = window.SpawnKit.data.memory;
        }

        // If mem came from data-bridge, it has {longTerm, daily, ...} shape
        // If longTerm is a string (legacy), wrap it
        if (mem && typeof mem.longTerm === 'string') {
            mem.longTerm = { content: mem.longTerm, size: mem.longTerm.length };
        }

        // Fallback: fetch from API bridge
        if (!mem) {
            try {
                var apiUrl = (window.OC_API_URL || (window.location.origin));
                var fetchFn = (window.skFetch || fetch);
                var resp = await fetchFn(apiUrl + '/api/oc/memory');
                if (resp.ok) {
                    var data = await resp.json();
                    // API bridge returns { main: "content", files: [{name,size,modified}] }
                    if (data.main || (data.files && data.files.length > 0)) {
                        mem = {
                            longTerm: data.main ? { content: data.main, size: data.main.length } : null,
                            daily: (data.files || []).map(function(f) {
                                return { date: f.name.replace('.md',''), name: f.name, size: f.size, preview: 'Daily log' };
                            }).sort(function(a, b) { return b.date.localeCompare(a.date); })
                        };
                    }
                }
            } catch(e) { console.warn('[Memory] API bridge fetch failed:', e.message); }
        }

        if (!mem) {
            var memEmptyEl = document.createElement('div');
            memEmptyEl.className = 'cron-empty';
            memEmptyEl.style.cssText = 'text-align:center;padding:40px 20px;';
            var memEmptyIcon = document.createElement('div');
            memEmptyIcon.style.cssText = 'font-size:40px;margin-bottom:12px;';
            memEmptyIcon.textContent = '\ud83e\udde0';
            memEmptyEl.appendChild(memEmptyIcon);
            var memEmptyTitle = document.createElement('div');
            memEmptyTitle.style.cssText = 'font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:6px;';
            memEmptyTitle.textContent = 'No Memory Data';
            memEmptyEl.appendChild(memEmptyTitle);
            var memEmptyDesc = document.createElement('div');
            memEmptyDesc.style.cssText = 'font-size:12px;color:var(--text-tertiary);line-height:1.5;';
            memEmptyDesc.textContent = 'Memory files will appear here when available. Ensure the SpawnKit server is running.';
            memEmptyEl.appendChild(memEmptyDesc);
            memoryBody.textContent = '';
            memoryBody.appendChild(memEmptyEl);
            return;
        }

        var memHtml = '';

        // Golden rules — extract sections from long-term
        if (mem.longTerm && mem.longTerm.content) {
            var content = mem.longTerm.content;
            var goldenMatch = content.match(/## \ud83d\udd34[^\n]*\n[\s\S]*?(?=\n## |$)/g);
            if (goldenMatch && goldenMatch.length > 0) {
                memHtml += '<div class="memory-section">';
                memHtml += '<div class="memory-section-title">\ud83d\udd34 Golden Rules</div>';
                goldenMatch.forEach(function(rule) {
                    memHtml += '<div class="memory-golden-rules" style="background:rgba(255,69,58,0.06);border:1px solid rgba(255,69,58,0.15);border-radius:10px;padding:12px;margin-bottom:8px;">';
                    memHtml += '<div class="memory-content-md">' + renderMarkdown(rule.trim()) + '</div>';
                    memHtml += '</div>';
                });
                memHtml += '</div>';
            }

            // Full MEMORY.md
            memHtml += '<div class="memory-section">';
            memHtml += '<div class="memory-section-title">\ud83d\udcdd MEMORY.md <span style="font-weight:400;color:var(--text-tertiary);text-transform:none;letter-spacing:0">(' + (mem.longTerm.size ? (mem.longTerm.size / 1024).toFixed(1) + ' KB' : '\u2014') + ')</span></div>';
            memHtml += '<div class="memory-content-md" style="background:var(--bg-tertiary);border-radius:10px;padding:14px;font-size:12px;line-height:1.6;max-height:300px;overflow-y:auto;">' + renderMarkdown(content.substring(0, 3000)) + '</div>';
            if (content.length > 3000) {
                memHtml += '<div style="color:var(--text-tertiary);font-size:11px;margin-top:8px">\u2026truncated (' + content.length + ' chars total)</div>';
            }
            memHtml += '</div>';
        }

        // Daily memory files
        memHtml += '<div class="memory-section">';
        memHtml += '<div class="memory-section-title">\ud83d\udcc5 Daily Notes</div>';
        if (mem.daily && mem.daily.length > 0) {
            memHtml += '<div class="memory-daily-list" style="display:flex;flex-direction:column;gap:4px;">';
            mem.daily.slice(0, 14).forEach(function(d) {
                memHtml += '<div class="memory-daily-item" style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--bg-tertiary);border-radius:8px;font-size:12px;">';
                memHtml += '<span style="font-weight:600;color:var(--text-primary);min-width:100px;">' + esc(d.date || d.name || '\u2014') + '</span>';
                memHtml += '<span style="flex:1;color:var(--text-secondary);margin:0 8px;">' + esc(d.preview || d.description || 'Daily log') + '</span>';
                memHtml += '<span style="color:var(--text-tertiary);font-size:11px;">' + (d.size ? (d.size / 1024).toFixed(1) + ' KB' : '') + '</span>';
                memHtml += '</div>';
            });
            memHtml += '</div>';
        } else {
            memHtml += '<div style="padding:10px 12px;background:var(--bg-tertiary);border-radius:8px;font-size:12px;color:var(--text-tertiary);font-style:italic;">\ud83d\udcdd Coming soon \u2014 daily notes will appear here</div>';
        }
        memHtml += '</div>';

        // Heartbeat state
        if (mem.heartbeat) {
            memHtml += '<div class="memory-section">';
            memHtml += '<div class="memory-section-title">\ud83d\udc93 Heartbeat State</div>';
            memHtml += '<div class="memory-content-md"><pre style="font-size:11px;background:var(--bg-tertiary);padding:10px;border-radius:8px;overflow-x:auto">' + JSON.stringify(mem.heartbeat, null, 2).replace(/</g,'&lt;') + '</pre></div>';
            memHtml += '</div>';
        }

        // Read-only label
        memHtml += '<div class="memory-section" style="margin-top:12px;">';
        memHtml += '<div style="text-align:center;color:var(--text-tertiary);font-size:11px;">\ud83d\udd12 Only the CEO can edit memory</div>';
        memHtml += '</div>';

        memoryBody.innerHTML = memHtml;
    }

    /* ═══════════════════════════════════════════════
       Remote Office Panel
       ═══════════════════════════════════════════════ */
    var remoteOverlay = document.getElementById('remoteOverlay');

    function openRemoteOverlay() {
        window.closeAllPanels();
        remoteOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        renderRemote();
    }

    function closeRemotePanel() {
        if (remoteOverlay) remoteOverlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    async function renderRemote() {
        var remoteBody = document.getElementById('remoteBody');
        if (!remoteBody) return;

        // Resolve ceoName from config
        var setupConfig = {};
        try { setupConfig = JSON.parse(localStorage.getItem('spawnkit-config') || '{}'); } catch(e) {}
        var ceoName = setupConfig.userName || 'ApoMac';

        // Build Fleet Network header using DOM
        var container = document.createElement('div');
        container.style.marginBottom = '16px';

        var fleetLabel = document.createElement('div');
        fleetLabel.style.cssText = 'font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#8E8E93;font-weight:600;margin-bottom:12px';
        fleetLabel.textContent = 'Fleet Network';
        container.appendChild(fleetLabel);

        // This IS the CEO's HQ — show as home office with green status
        var hqCard = document.createElement('div');
        hqCard.className = 'remote-office-card';
        hqCard.style.cssText = 'border:1.5px solid #34C75940;background:var(--bg-tertiary);';

        var hqHeader = document.createElement('div');
        hqHeader.className = 'remote-office-header';

        var hqEmoji = document.createElement('span');
        hqEmoji.className = 'remote-office-emoji';
        hqEmoji.textContent = '\ud83c\udfad';
        hqHeader.appendChild(hqEmoji);

        var hqInfo = document.createElement('div');
        var hqName = document.createElement('div');
        hqName.className = 'remote-office-name';
        hqName.textContent = ceoName + ' HQ ';
        var hqBadge = document.createElement('span');
        hqBadge.style.cssText = 'font-size:10px;font-weight:500;background:#34C75920;color:#34C759;border-radius:4px;padding:1px 6px;margin-left:6px;';
        hqBadge.textContent = 'This Office';
        hqName.appendChild(hqBadge);
        hqInfo.appendChild(hqName);

        var hqStatus = document.createElement('div');
        hqStatus.className = 'remote-office-status online';
        hqStatus.style.color = '#34C759';
        hqStatus.textContent = '\u25cf Online \u2014 ' + ceoName + ' (CEO)';
        hqInfo.appendChild(hqStatus);
        hqHeader.appendChild(hqInfo);
        hqCard.appendChild(hqHeader);

        var hqFooter = document.createElement('div');
        hqFooter.style.cssText = 'font-size:12px;color:#8E8E93;padding:6px 0 0';
        hqFooter.textContent = 'fleet.spawnkit.ai \u2022 Hetzner node';
        hqCard.appendChild(hqFooter);
        container.appendChild(hqCard);

        // Fetch remote offices from API
        try {
            var apiUrl = window.OC_API_URL || (window.location.origin);
            var resp = await (window.skFetch || fetch)(apiUrl + '/api/remote/offices');
            if (resp.ok) {
                var data = await resp.json();
                var remoteOffices = data.offices || [];
                if (remoteOffices.length > 0) {
                    remoteOffices.forEach(function(office) {
                        var statusClass = (office.status === 'online') ? 'online' : 'offline';
                        var statusText = (office.status === 'online') ? '\u25cf Online' : '\u25cb Offline';
                        var statusColor = (office.status === 'online') ? '#34C759' : '#8E8E93';

                        var officeCard = document.createElement('div');
                        officeCard.className = 'remote-office-card';
                        officeCard.style.marginTop = '8px';

                        var officeHeader = document.createElement('div');
                        officeHeader.className = 'remote-office-header';

                        var officeEmoji = document.createElement('span');
                        officeEmoji.className = 'remote-office-emoji';
                        officeEmoji.textContent = office.emoji || '\ud83c\udfe2';
                        officeHeader.appendChild(officeEmoji);

                        var officeInfo = document.createElement('div');
                        var officeName = document.createElement('div');
                        officeName.className = 'remote-office-name';
                        officeName.textContent = office.name || office.id || 'Remote Office';
                        officeInfo.appendChild(officeName);

                        var officeStatus = document.createElement('div');
                        officeStatus.className = 'remote-office-status ' + statusClass;
                        officeStatus.style.color = statusColor;
                        officeStatus.textContent = statusText;
                        officeInfo.appendChild(officeStatus);
                        officeHeader.appendChild(officeInfo);
                        officeCard.appendChild(officeHeader);

                        if (office.agents && office.agents.length > 0) {
                            var agentCount = document.createElement('div');
                            agentCount.style.cssText = 'font-size:12px;color:#8E8E93;margin-top:6px;';
                            agentCount.textContent = office.agents.length + ' agent(s)';
                            officeCard.appendChild(agentCount);
                        }
                        if (office.lastSeen) {
                            var lastSeen = document.createElement('div');
                            lastSeen.style.cssText = 'font-size:11px;color:var(--text-tertiary);margin-top:4px;';
                            lastSeen.textContent = 'Last seen: ' + new Date(office.lastSeen).toLocaleTimeString();
                            officeCard.appendChild(lastSeen);
                        }
                        container.appendChild(officeCard);
                    });
                }

                // Show recent inter-office messages
                var recentMessages = data.recentMessages || [];
                var msgContainer = document.createElement('div');
                msgContainer.style.marginBottom = '16px';

                var msgLabel = document.createElement('div');
                msgLabel.style.cssText = 'font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#8E8E93;font-weight:600;margin-bottom:12px';
                msgLabel.textContent = 'Inter-Office Messages';
                msgContainer.appendChild(msgLabel);

                if (recentMessages.length === 0) {
                    var emptyMsg = document.createElement('div');
                    emptyMsg.style.cssText = 'padding:20px;text-align:center;color:#8E8E93;font-size:13px';
                    emptyMsg.textContent = '\ud83d\udced No inter-office messages yet';
                    var emptyHint = document.createElement('span');
                    emptyHint.style.cssText = 'font-size:11px;margin-top:4px;display:block;';
                    emptyHint.textContent = 'Relay messages via Mission Control';
                    emptyMsg.appendChild(document.createElement('br'));
                    emptyMsg.appendChild(emptyHint);
                    msgContainer.appendChild(emptyMsg);
                } else {
                    recentMessages.slice(0, 10).forEach(function(msg) {
                        var msgEl = document.createElement('div');
                        msgEl.className = 'remote-message';

                        var msgFrom = document.createElement('div');
                        msgFrom.className = 'remote-message-from';
                        msgFrom.textContent = (msg.from || 'Unknown') + ' \u2192 ' + (msg.to || 'HQ');
                        msgEl.appendChild(msgFrom);

                        var msgText = document.createElement('div');
                        msgText.className = 'remote-message-text';
                        msgText.textContent = (msg.message || msg.text || '').substring(0, 200);
                        msgEl.appendChild(msgText);

                        if (msg.timestamp) {
                            var msgTime = document.createElement('div');
                            msgTime.className = 'remote-message-time';
                            msgTime.textContent = new Date(msg.timestamp).toLocaleTimeString();
                            msgEl.appendChild(msgTime);
                        }
                        msgContainer.appendChild(msgEl);
                    });
                }

                remoteBody.textContent = '';
                remoteBody.appendChild(container);
                remoteBody.appendChild(msgContainer);
                return;
            }
        } catch(e) { console.warn('[Remote] fetch failed:', e); }

        // Fallback: no API
        var fallbackMsg = document.createElement('div');
        fallbackMsg.style.cssText = 'padding:16px;text-align:center;color:#8E8E93;font-size:13px;';
        fallbackMsg.textContent = '\ud83d\udce1 Could not reach fleet relay.';
        var fallbackHint = document.createElement('span');
        fallbackHint.style.cssText = 'font-size:11px;';
        fallbackHint.textContent = 'Check that the relay is running on port 18790.';
        fallbackMsg.appendChild(document.createElement('br'));
        fallbackMsg.appendChild(fallbackHint);

        remoteBody.textContent = '';
        remoteBody.appendChild(container);
        remoteBody.appendChild(fallbackMsg);
    }

    // Wire up remote button + close handlers
    document.getElementById('remoteBtn').addEventListener('click', openRemoteOverlay);
    document.getElementById('remoteBackdrop').addEventListener('click', closeRemotePanel);
    document.getElementById('remoteClose').addEventListener('click', closeRemotePanel);

    // Exports
    window.openDetailPanel = openDetailPanel;
    window.closeDetailPanel = closeDetailPanel;
    window.openTodoPanel = openTodoPanel;
    window.closeTodoPanel = closeTodoPanel;
    window.openTodoForAgent = openTodoForAgent;
    window.openCronPanel = openCronPanel;
    window.closeCronPanel = closeCronPanel;
    window.openMemoryPanel = openMemoryPanel;
    window.closeMemoryPanel = closeMemoryPanel;
    window.openRemoteOverlay = openRemoteOverlay;
    window.closeRemotePanel = closeRemotePanel;
    window.renderRemote = renderRemote;
})();
