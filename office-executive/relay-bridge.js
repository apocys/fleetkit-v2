(function() {
    'use strict';

    var RELAY_URL = window.OC_RELAY_URL || 'http://127.0.0.1:18789';
    var RELAY_TOKEN = window.OC_RELAY_TOKEN || '';

    // ── Relay fetch helper ──
    function relayGet(endpoint) {
        var url = RELAY_URL.replace(/\/+$/, '') + endpoint;
        var headers = { 'Accept': 'application/json' };
        if (RELAY_TOKEN) headers['Authorization'] = 'Bearer ' + RELAY_TOKEN;
        return fetch(url, { headers: headers, mode: 'cors' })
            .then(function(r) { return r.ok ? r.json() : null; })
            .catch(function() { return null; });
    }

    // ── Tab switching ──
    window.switchOrchTab = function(btn, tab) {
        document.querySelectorAll('.orch-tab').forEach(function(t) {
            t.classList.remove('active');
            t.style.borderBottomColor = 'transparent';
            t.style.color = 'var(--text-secondary)';
        });
        btn.classList.add('active');
        btn.style.borderBottomColor = 'var(--exec-blue)';
        btn.style.color = 'var(--exec-blue)';
        document.querySelectorAll('.orch-tab-content').forEach(function(c) { c.style.display = 'none'; });
        var target = document.getElementById('orchTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
        if (target) target.style.display = 'block';
        // Load tab data
        if (tab === 'agents') loadOrchAgents();
        if (tab === 'skills') loadOrchSkills();
        if (tab === 'sessions') loadOrchSessions();
        if (tab === 'missions') loadOrchMissions();
        if (tab === 'setup') loadOrchSetup();
    };

    // ── Open/Close ──
    var orchBtn = document.getElementById('orchestrationBtn');
    var orchOverlay = document.getElementById('orchestrationOverlay');
    var orchBackdrop = document.getElementById('orchestrationBackdrop');
    var orchClose = document.getElementById('orchestrationClose');

    if (orchBtn) orchBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        orchOverlay.classList.add('open');
        // Set initial active tab style
        var firstTab = document.querySelector('.orch-tab[data-tab="agents"]');
        if (firstTab) {
            firstTab.style.borderBottomColor = 'var(--exec-blue)';
            firstTab.style.color = 'var(--exec-blue)';
        }
        loadOrchAgents();
    });
    if (orchBackdrop) orchBackdrop.addEventListener('click', function() { orchOverlay.classList.remove('open'); });
    if (orchClose) orchClose.addEventListener('click', function() { orchOverlay.classList.remove('open'); });

    // ── Agents Tab ──
    function loadOrchAgents() {
        var el = document.getElementById('orchTabAgents');
        if (!el) return;
        el.innerHTML = '<div style="color:var(--text-tertiary);font-size:13px;padding:12px 0;">Loading agents…</div>';

        if (SpawnKit.mode === 'live' && SpawnKit.data && SpawnKit.data.agents) {
            renderAgents(el, SpawnKit.data.agents, SpawnKit.data.subagents || []);
        } else {
            // Try direct relay fetch
            relayGet('/api/oc/sessions').then(function(data) {
                if (data) {
                    renderAgentsFromSessions(el, data);
                } else {
                    el.innerHTML = '<div style="color:var(--text-tertiary);font-size:13px;padding:12px;">No live data. Configure relay in Setup tab.</div>';
                }
            });
        }
    }

    function renderAgents(el, agents, subagents) {
        var html = '<div style="font-size:11px;text-transform:uppercase;font-weight:600;color:var(--text-tertiary);letter-spacing:0.5px;margin-bottom:8px;">Fleet Agents (' + agents.length + ')</div>';
        agents.forEach(function(a) {
            var statusColor = a.status === 'active' ? '#34C759' : (a.status === 'idle' ? '#FF9500' : '#8E8E93');
            html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;background:var(--bg-tertiary);margin-bottom:6px;">';
            html += '<div style="width:8px;height:8px;border-radius:50%;background:' + statusColor + ';flex-shrink:0;"></div>';
            html += '<div style="flex:1;min-width:0;">';
            html += '<div style="font-size:13px;font-weight:600;color:var(--text-primary);">' + esc(a.name || a.id) + ' <span style="font-weight:400;color:var(--text-tertiary);">' + esc(a.role || '') + '</span></div>';
            html += '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">' + esc(a.currentTask || 'Standby') + '</div>';
            html += '</div>';
            if (a.model) {
                html += '<div style="font-size:10px;color:var(--text-tertiary);padding:2px 6px;background:var(--exec-blue-muted);border-radius:4px;">' + esc(a.model.split('/').pop().replace('claude-','').substring(0,12)) + '</div>';
            }
            html += '</div>';
        });

        if (subagents.length > 0) {
            html += '<div style="font-size:11px;text-transform:uppercase;font-weight:600;color:var(--text-tertiary);letter-spacing:0.5px;margin:12px 0 8px;">Sub-Agents (' + subagents.length + ')</div>';
            subagents.forEach(function(sa) {
                var prog = Math.round((sa.progress || 0) * 100);
                html += '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:8px;background:var(--bg-tertiary);margin-bottom:4px;">';
                html += '<div style="flex:1;min-width:0;">';
                html += '<div style="font-size:12px;font-weight:500;color:var(--text-primary);">' + esc(sa.agentOSName || sa.name || sa.id) + '</div>';
                html += '<div style="font-size:11px;color:var(--text-secondary);">' + esc(sa.task || '') + '</div>';
                html += '</div>';
                html += '<div style="font-size:11px;font-weight:600;color:' + (sa.status === 'running' ? 'var(--exec-blue)' : '#34C759') + ';">' + prog + '%</div>';
                html += '</div>';
            });
        }
        el.innerHTML = html;
    }

    function renderAgentsFromSessions(el, sessions) {
        var arr = Array.isArray(sessions) ? sessions : [];
        if (arr.length === 0) { el.innerHTML = '<div style="color:var(--text-tertiary);padding:12px;">No active sessions.</div>'; return; }

        // Deduplicate cron runs — keep only the parent cron job (no :run: suffix)
        var cronParents = {};
        var deduped = arr.filter(function(s) {
            if (s.key && s.key.indexOf(':run:') >= 0) {
                var parentKey = s.key.split(':run:')[0];
                if (!cronParents[parentKey]) cronParents[parentKey] = s;
                return false;
            }
            return true;
        });

        // Group by type
        var mainSession = null, cronSessions = [], subSessions = [];
        deduped.forEach(function(s) {
            if (s.key === 'agent:main:main') mainSession = s;
            else if (s.kind === 'cron') cronSessions.push(s);
            else if (s.kind === 'subagent') subSessions.push(s);
        });

        // Clean display name: remove "Cron: " prefix, use label over key
        function cleanName(s) {
            var name = s.label || s.displayName || s.key || 'unknown';
            return name.replace(/^Cron:\s*/i, '').replace(/^agent:main:(main|hook:proactive)$/, 'ApoMac (CEO)');
        }

        var html = '';

        // CEO first
        if (mainSession) {
            html += '<div style="font-size:11px;text-transform:uppercase;font-weight:600;color:var(--text-tertiary);letter-spacing:0.5px;margin-bottom:8px;">👑 CEO</div>';
            html += '<div class="orch-agent-card" data-agent="ceo" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;background:linear-gradient(135deg,rgba(255,214,10,0.08),var(--bg-tertiary));margin-bottom:8px;cursor:pointer;border:1px solid rgba(255,214,10,0.15);">';
            html += '<div style="width:8px;height:8px;border-radius:50%;background:#30D158;flex-shrink:0;"></div>';
            html += '<div style="flex:1;min-width:0;">';
            html += '<div style="font-size:13px;font-weight:600;color:var(--text-primary);">👑 ApoMac <span style="font-weight:400;color:var(--text-tertiary);">Orchestrator</span></div>';
            html += '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">' + (mainSession.totalTokens || 0).toLocaleString() + ' tokens · ' + (mainSession.model || 'unknown') + '</div>';
            html += '</div></div>';
        }

        // Sub-agents (sorted by most recent)
        if (subSessions.length > 0) {
            subSessions.sort(function(a, b) { return (b.lastActive || 0) - (a.lastActive || 0); });
            var active = subSessions.filter(function(s) { return s.status === 'active'; });
            var idle = subSessions.filter(function(s) { return s.status !== 'active'; });
            html += '<div style="font-size:11px;text-transform:uppercase;font-weight:600;color:var(--text-tertiary);letter-spacing:0.5px;margin:12px 0 8px;">🤖 Sub-Agents (' + subSessions.length + ')</div>';
            var showSubs = active.concat(idle).slice(0, 15);
            showSubs.forEach(function(s) {
                var isActive = s.status === 'active';
                var ago = Date.now() - (s.lastActive || 0);
                var agoStr = ago < 60000 ? 'now' : ago < 3600000 ? Math.floor(ago/60000) + 'm ago' : Math.floor(ago/3600000) + 'h ago';
                html += '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:8px;background:var(--bg-tertiary);margin-bottom:4px;">';
                html += '<div style="width:8px;height:8px;border-radius:50%;background:' + (isActive ? '#30D158' : '#8E8E93') + ';flex-shrink:0;' + (isActive ? 'animation:statusPulse 2.5s infinite;' : '') + '"></div>';
                html += '<div style="flex:1;min-width:0;">';
                html += '<div style="font-size:12px;font-weight:500;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(cleanName(s)) + '</div>';
                html += '<div style="font-size:11px;color:var(--text-secondary);">' + esc((s.model || '—').split('/').pop()) + ' · ' + (s.totalTokens || 0).toLocaleString() + ' tok</div>';
                html += '</div>';
                html += '<span style="font-size:10px;color:var(--text-tertiary);white-space:nowrap;">' + agoStr + '</span>';
                html += '</div>';
            });
            if (subSessions.length > 15) html += '<div style="font-size:11px;color:var(--text-tertiary);padding:4px 0;">+' + (subSessions.length - 15) + ' more</div>';
        }

        // Cron jobs
        if (cronSessions.length > 0) {
            html += '<div style="font-size:11px;text-transform:uppercase;font-weight:600;color:var(--text-tertiary);letter-spacing:0.5px;margin:12px 0 8px;">📅 Scheduled Jobs (' + cronSessions.length + ')</div>';
            cronSessions.forEach(function(s) {
                var isActive = s.status === 'active';
                html += '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:8px;background:var(--bg-tertiary);margin-bottom:4px;">';
                html += '<div style="width:8px;height:8px;border-radius:50%;background:' + (isActive ? '#30D158' : '#8E8E93') + ';flex-shrink:0;"></div>';
                html += '<div style="flex:1;min-width:0;">';
                html += '<div style="font-size:12px;font-weight:500;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(cleanName(s)) + '</div>';
                html += '<div style="font-size:11px;color:var(--text-secondary);">' + (s.totalTokens || 0).toLocaleString() + ' tokens</div>';
                html += '</div></div>';
            });
        }

        el.innerHTML = html;

        // Wire clickable CEO card → open detail panel
        el.querySelectorAll('.orch-agent-card[data-agent]').forEach(function(card) {
            card.addEventListener('click', function() {
                if (typeof openDetailPanel === 'function') openDetailPanel(card.dataset.agent);
            });
        });
    }

    // ── Skills Tab ──
    function loadOrchSkills() {
        var el = document.getElementById('orchTabSkills');
        if (!el) return;

        // Use SpawnKit skills data if available
        if (SpawnKit.data && SpawnKit.data.skills && SpawnKit.data.skills.length > 0) {
            renderSkills(el, SpawnKit.data.skills);
            return;
        }

        // Try from config or local list
        var skills = [
            { name: '1password', desc: 'Set up and use 1Password CLI', icon: '🔐' },
            { name: 'apple-notes', desc: 'Manage Apple Notes via memo CLI', icon: '📝' },
            { name: 'apple-reminders', desc: 'Manage Apple Reminders via remindctl', icon: '⏰' },
            { name: 'blogwatcher', desc: 'Monitor blogs and RSS feeds', icon: '📡' },
            { name: 'blucli', desc: 'BluOS playback and grouping', icon: '🔊' },
            { name: 'camsnap', desc: 'Capture RTSP/ONVIF cameras', icon: '📷' },
            { name: 'coding-agent', desc: 'Run Claude Code / Codex via PTY', icon: '💻' },
            { name: 'gifgrep', desc: 'Search and download GIFs', icon: '🎞️' },
            { name: 'github', desc: 'GitHub CLI integration', icon: '🐙' },
            { name: 'gog', desc: 'Google Workspace CLI', icon: '📧' },
            { name: 'goplaces', desc: 'Google Places API queries', icon: '📍' },
            { name: 'imsg', desc: 'iMessage/SMS CLI', icon: '💬' },
            { name: 'nano-banana-pro', desc: 'Gemini image generation', icon: '🎨' },
            { name: 'nano-pdf', desc: 'Edit PDFs with natural language', icon: '📄' },
            { name: 'openai-image-gen', desc: 'OpenAI image generation', icon: '🖼️' },
            { name: 'openai-whisper', desc: 'Local speech-to-text', icon: '🎤' },
            { name: 'peekaboo', desc: 'macOS UI automation', icon: '👁️' },
            { name: 'sag', desc: 'ElevenLabs TTS', icon: '🗣️' },
            { name: 'summarize', desc: 'Summarize URLs and podcasts', icon: '📋' },
            { name: 'weather', desc: 'Weather forecasts', icon: '☀️' },
            { name: 'brainstorm', desc: 'Structured design process', icon: '🧠' },
            { name: 'ralph-loop', desc: 'Iterative self-improvement', icon: '🔄' }
        ];
        renderSkills(el, skills);
    }

    function renderSkills(el, skills) {
        var html = '';
        // Search bar
        html += '<div style="margin-bottom:12px;display:flex;gap:8px;">';
        html += '<input id="skillSearchInput" type="text" placeholder="Search skills..." style="flex:1;padding:8px 12px;border-radius:8px;border:1px solid var(--border-subtle);background:var(--bg-secondary);color:var(--text-primary);font-size:13px;font-family:inherit;outline:none;" />';
        html += '<button id="installSkillBtn" style="padding:8px 14px;border-radius:8px;border:none;background:var(--exec-blue);color:white;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;">+ Install</button>';
        html += '</div>';

        html += '<div style="font-size:11px;text-transform:uppercase;font-weight:600;color:var(--text-tertiary);letter-spacing:0.5px;margin-bottom:8px;">Installed Skills (' + skills.length + ')</div>';
        html += '<div id="skillGrid" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">';
        skills.forEach(function(s, idx) {
            html += '<div class="skill-card" data-skill-idx="' + idx + '" data-skill-name="' + esc(s.name) + '" style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:10px;background:var(--bg-tertiary);cursor:pointer;transition:all 0.15s;border:1px solid transparent;">';
            html += '<span style="font-size:18px;flex-shrink:0;">' + (s.icon || '⚡') + '</span>';
            html += '<div style="min-width:0;flex:1;"><div style="font-size:12px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(s.name) + '</div>';
            html += '<div style="font-size:10px;color:var(--text-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(s.desc || s.description || '') + '</div></div>';
            html += '</div>';
        });
        html += '</div>';
        el.innerHTML = html;

        // Search filter
        var searchInput = document.getElementById('skillSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                var query = searchInput.value.toLowerCase();
                document.querySelectorAll('.skill-card').forEach(function(card) {
                    var name = (card.dataset.skillName || '').toLowerCase();
                    card.style.display = (!query || name.indexOf(query) >= 0) ? '' : 'none';
                });
            });
        }

        // Skill card click → show detail
        el.querySelectorAll('.skill-card').forEach(function(card) {
            card.addEventListener('click', function() {
                var idx = parseInt(card.dataset.skillIdx);
                var s = skills[idx];
                if (!s) return;
                // Highlight
                el.querySelectorAll('.skill-card').forEach(function(c) { c.style.borderColor = 'transparent'; });
                card.style.borderColor = 'var(--exec-blue)';
                // Show detail below grid
                var existing = document.getElementById('skillDetail');
                if (existing) existing.remove();
                var detail = document.createElement('div');
                detail.id = 'skillDetail';
                detail.style.cssText = 'margin-top:12px;padding:14px 16px;border-radius:12px;background:var(--bg-secondary);border:1px solid var(--border-subtle);';
                detail.innerHTML = '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">' +
                    '<span style="font-size:24px;">' + esc(s.icon || '⚡') + '</span>' +
                    '<div><div style="font-size:15px;font-weight:600;color:var(--text-primary);">' + esc(s.name) + '</div>' +
                    '<div style="font-size:12px;color:var(--text-secondary);">' + esc(s.desc || s.description || '') + '</div></div></div>' +
                    '<div style="display:flex;gap:8px;margin-top:10px;">' +
                    '<button class="skill-assign-btn" style="flex:1;padding:8px;border-radius:8px;border:none;background:var(--exec-blue);color:white;font-size:12px;font-weight:600;cursor:pointer;">Assign to Agent</button>' +
                    '<button class="skill-docs-btn" style="flex:1;padding:8px;border-radius:8px;border:1px solid var(--border-medium);background:transparent;color:var(--text-primary);font-size:12px;font-weight:500;cursor:pointer;">View Docs</button>' +
                    '</div>';
                el.appendChild(detail);

                // Assign button → show agent picker
                detail.querySelector('.skill-assign-btn').addEventListener('click', function() {
                    var agentNames = Object.keys(typeof AGENTS !== 'undefined' ? AGENTS : {});
                    if (agentNames.length === 0) { showToast('No agents to assign to'); return; }
                    var picker = '<div style="margin-top:8px;">';
                    agentNames.forEach(function(id) {
                        var a = AGENTS[id];
                        picker += '<button data-assign-agent="' + esc(id) + '" style="display:block;width:100%;padding:6px 10px;margin-bottom:4px;border-radius:6px;border:1px solid var(--border-subtle);background:var(--bg-tertiary);cursor:pointer;text-align:left;font-size:12px;color:var(--text-primary);font-family:inherit;">' + esc(a.name || id) + ' — ' + esc(a.role || '') + '</button>';
                    });
                    picker += '</div>';
                    detail.insertAdjacentHTML('beforeend', picker);
                    detail.querySelectorAll('[data-assign-agent]').forEach(function(btn) {
                        btn.addEventListener('click', function() {
                            var agId = btn.dataset.assignAgent;
                            var sk = 'spawnkit-agent-skills-' + agId.replace(/[^a-z0-9\-]/g, '');
                            var saved = [];
                            try { saved = JSON.parse(localStorage.getItem(sk) || '[]'); } catch(e3) { saved = []; }
                            if (!Array.isArray(saved)) saved = [];
                            if (saved.indexOf(s.name) === -1) {
                                saved.push(s.name);
                                localStorage.setItem(sk, JSON.stringify(saved));
                                showToast('✅ "' + s.name + '" assigned to ' + (AGENTS[agId] ? AGENTS[agId].name : agId));
                            } else {
                                showToast('⚠️ Already assigned');
                            }
                        });
                    });
                });

                // Docs button → link to marketplace
                detail.querySelector('.skill-docs-btn').addEventListener('click', function() {
                    showToast('📖 Skill docs: clawhub.com/skills/' + s.name);
                });
            });
        });

        // Install button → marketplace prompt
        var installBtn = document.getElementById('installSkillBtn');
        if (installBtn) {
            installBtn.addEventListener('click', function() {
                showToast('🛍️ Browse skills at clawhub.com — coming soon!');
            });
        }
    }

    // ── Sessions Tab ──
    function loadOrchSessions() {
        var el = document.getElementById('orchTabSessions');
        if (!el) return;
        el.innerHTML = '<div style="color:var(--text-tertiary);font-size:13px;padding:12px;">Loading sessions…</div>';

        relayGet('/api/oc/sessions').then(function(data) {
            if (!data) {
                el.innerHTML = '<div style="color:var(--text-tertiary);padding:12px;">Could not connect to relay. Check Setup.</div>';
                return;
            }
            var sessions = Array.isArray(data) ? data : (data.sessions || []);
            if (sessions.length === 0) {
                el.innerHTML = '<div style="color:var(--text-tertiary);padding:12px;">No sessions found.</div>';
                return;
            }
            // Deduplicate cron runs — keep only parent cron jobs
            var deduped = sessions.filter(function(s) {
                return !(s.key && s.key.indexOf(':run:') >= 0);
            });
            // Also skip hook sessions
            deduped = deduped.filter(function(s) {
                return !(s.key && s.key.indexOf(':hook:') >= 0);
            });

            // Sort: active first, then by lastActive descending
            deduped.sort(function(a, b) {
                if (a.status === 'active' && b.status !== 'active') return -1;
                if (b.status === 'active' && a.status !== 'active') return 1;
                return (b.lastActive || 0) - (a.lastActive || 0);
            });

            var html = '<div style="font-size:11px;text-transform:uppercase;font-weight:600;color:var(--text-tertiary);letter-spacing:0.5px;margin-bottom:8px;">Sessions (' + deduped.length + ')</div>';
            deduped.forEach(function(s) {
                var isActive = s.status === 'active';
                var label = (s.label || s.displayName || s.key || 'session').replace(/^Cron:\s*/i, '').replace(/^agent:main:main$/, 'ApoMac (CEO)');
                var kind = s.kind || 'unknown';
                var model = s.model || '';
                var tokens = s.totalTokens || 0;
                var kindBadge = kind === 'subagent' ? '🔧' : (kind === 'cron' ? '⏰' : (kind === 'main' ? '👑' : '📡'));

                html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;background:var(--bg-tertiary);margin-bottom:6px;cursor:pointer;" title="' + esc(s.key || '') + '">';
                html += '<div style="width:8px;height:8px;border-radius:50%;background:' + (isActive ? '#34C759' : '#8E8E93') + ';flex-shrink:0;' + (isActive ? 'animation:statusPulse 2.5s infinite;' : '') + '"></div>';
                html += '<span style="font-size:14px;">' + kindBadge + '</span>';
                html += '<div style="flex:1;min-width:0;">';
                html += '<div style="font-size:12px;font-weight:500;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(label) + '</div>';
                html += '<div style="font-size:10px;color:var(--text-tertiary);margin-top:1px;">' + esc(model.split('/').pop()) + ' · ' + tokens.toLocaleString() + ' tokens</div>';
                html += '</div>';
                html += '<div style="font-size:10px;padding:2px 6px;border-radius:4px;background:' + (isActive ? 'rgba(52,199,89,0.15)' : 'rgba(142,142,147,0.15)') + ';color:' + (isActive ? '#34C759' : '#8E8E93') + ';font-weight:600;">' + (isActive ? 'ACTIVE' : 'IDLE') + '</div>';
                html += '</div>';
            });
            el.innerHTML = html;
        });
    }

    // ── Task Graph helper ──
    function buildTaskGraphSvg(missions) {
        if (!missions || missions.length === 0) return '';
        var width = Math.max(320, missions.length * 120);
        var centerY = 60;
        var nodeRadius = 18;
        var spacing = width / (missions.length + 1);
        var svg = '';
        svg += '<div style="margin-bottom:14px;border-radius:14px;padding:12px 14px;background:var(--bg-tertiary);border:1px solid var(--border-subtle);">';
        svg += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">';
        svg += '<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;color:var(--text-tertiary);">Task Graph</div>';
        svg += '<div style="font-size:11px;color:var(--text-tertiary);">Flow of missions across your fleet</div>';
        svg += '</div>';
        svg += '<div style="overflow-x:auto;padding-bottom:4px;">';
        svg += '<svg viewBox="0 0 ' + width + ' 120" preserveAspectRatio="xMidYMid meet" style="width:100%;min-height:120px;display:block;">
  <defs>
    <linearGradient id="skTaskEdge" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="rgba(0,122,255,0.3)"/>
      <stop offset="100%" stop-color="rgba(88,86,214,0.6)"/>
    </linearGradient>
  </defs>';

        // Edges between sequential missions
        for (var i = 0; i < missions.length - 1; i++) {
            var x1 = spacing * (i + 1);
            var x2 = spacing * (i + 2);
            svg += '<path d="M' + x1 + ' ' + centerY + ' C ' + (x1 + 20) + ' ' + (centerY - 18) + ', ' + (x2 - 20) + ' ' + (centerY + 18) + ', ' + x2 + ' ' + centerY + '" stroke="url(#skTaskEdge)" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.9" />';
        }

        // Nodes
        missions.forEach(function(m, idx) {
            var x = spacing * (idx + 1);
            var status = (m.status || 'active').toLowerCase();
            var color = status === 'done' ? '#34C759' : (status === 'paused' ? '#FF9500' : '#007AFF');
            var label = esc(m.name || ('Mission ' + (idx + 1)));
            svg += '<g>';
            svg += '<circle cx="' + x + '" cy="' + centerY + '" r="' + nodeRadius + '" fill="' + color + '" fill-opacity="0.12" stroke="' + color + '" stroke-width="1.5" />';
            svg += '<circle cx="' + x + '" cy="' + centerY + '" r="4" fill="' + color + '" />';
            svg += '<rect x="' + (x - 60) + '" y="' + (centerY + 26) + '" rx="8" ry="8" width="120" height="26" fill="rgba(0,0,0,0.04)" />';
            svg += '<text x="' + x + '" y="' + (centerY + 44) + '" text-anchor="middle" font-size="11" fill="var(--text-primary)" style="font-family: system-ui, -apple-system, BlinkMacSystemFont, \"SF Pro Text\", sans-serif;">' + label + '</text>';
            svg += '</g>';
        });

        svg += '</svg></div>';
        svg += '<div style="display:flex;gap:12px;margin-top:6px;font-size:10px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.4px;">';
        svg += '<span><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#007AFF;margin-right:4px;"></span>Active</span>';
        svg += '<span><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#34C759;margin-right:4px;"></span>Done</span>';
        svg += '<span><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#FF9500;margin-right:4px;"></span>Paused</span>';
        svg += '</div>';
        svg += '</div>';
        return svg;
    }

    // ── Missions Tab (F12) ──
    function loadOrchMissions() {
        var el = document.getElementById('orchTabMissions');
        if (!el) return;

        // Load missions from localStorage (safe parse)
        var missions = [];
        try { missions = JSON.parse(localStorage.getItem('spawnkit-missions') || '[]'); } catch(e) { missions = []; }
        if (!Array.isArray(missions)) missions = [];

        var html = '';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">';
        html += '<div style="font-size:11px;text-transform:uppercase;font-weight:600;color:var(--text-tertiary);letter-spacing:0.5px;">Missions (' + missions.length + ')</div>';
        html += '<button id="newMissionBtn" style="padding:6px 14px;border-radius:8px;border:none;background:var(--exec-blue);color:white;font-size:12px;font-weight:600;cursor:pointer;">+ New Mission</button>';
        html += '</div>';

        if (missions.length === 0) {
            html += '<div style="text-align:center;padding:32px 16px;">';
            html += '<div style="font-size:32px;margin-bottom:8px;">🎯</div>';
            html += '<div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:4px;">No Active Missions</div>';
            html += '<div style="font-size:12px;color:var(--text-tertiary);line-height:1.5;">Create a mission to organize work.<br>The CEO can assign agents and track progress.</div>';
            html += '</div>';
        } else {
            // Awwwards-style task graph
            html += buildTaskGraphSvg(missions);

            // Kanban columns
            var backlog = [], inProgress = [], done = [];
            missions.forEach(function(m, idx) {
                var status = (m.status || 'active').toLowerCase();
                if (status === 'done') done.push({ m: m, idx: idx });
                else if (status === 'active') inProgress.push({ m: m, idx: idx });
                else backlog.push({ m: m, idx: idx });
            });

            function column(title, items, accent) {
                var col = '<div style="background:var(--bg-tertiary);border-radius:14px;padding:10px 10px 12px;border:1px solid var(--border-subtle);min-height:80px;">';
                col += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">';
                col += '<span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-tertiary);">' + title + '</span>';
                col += '<span style="width:8px;height:8px;border-radius:50%;background:' + accent + ';"></span>';
                col += '</div>';
                if (!items.length) {
                    col += '<div style="font-size:11px;color:var(--text-tertiary);padding:8px 4px;">No cards</div>';
                }
                items.forEach(function(entry) {
                    var m = entry.m; var idx = entry.idx;
                    var doneTasks = (m.todos || []).filter(function(t) { return t.done; }).length;
                    var totalTasks = (m.todos || []).length;
                    var progress = totalTasks > 0 ? Math.round(doneTasks / totalTasks * 100) : 0;
                    var status = (m.status || 'active').toLowerCase();
                    var statusColor = status === 'active' ? '#30D158' : status === 'done' ? '#007AFF' : '#8E8E93';

                    col += '<div class="mission-card" data-mission-idx="' + idx + '" style="padding:10px 10px;border-radius:10px;background:var(--bg-secondary);margin-bottom:6px;cursor:pointer;border:1px solid transparent;transition:all 0.15s;">';
                    col += '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;">';
                    col += '<div style="font-size:13px;font-weight:600;color:var(--text-primary);max-width:80%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(m.name) + '</div>';
                    col += '<span style="font-size:9px;padding:2px 6px;border-radius:999px;background:' + statusColor + '22;color:' + statusColor + ';font-weight:600;text-transform:uppercase;">' + esc(m.status || 'active') + '</span>';
                    col += '</div>';
                    if (m.desc) col += '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(m.desc) + '</div>';
                    if (m.agents && m.agents.length > 0) {
                        col += '<div style="display:flex;gap:4px;margin-bottom:6px;flex-wrap:wrap;">';
                        m.agents.forEach(function(aId) {
                            var a = (typeof AGENTS !== 'undefined') ? AGENTS[aId] : null;
                            col += '<span style="font-size:9px;padding:2px 6px;border-radius:999px;background:var(--exec-blue-muted);color:var(--exec-blue);font-weight:500;">' + esc(a ? a.name : aId) + '</span>';
                        });
                        col += '</div>';
                    }
                    col += '<div style="display:flex;align-items:center;gap:6px;">';
                    col += '<div style="flex:1;height:3px;border-radius:999px;background:var(--border-subtle);">';
                    col += '<div style="height:100%;width:' + progress + '%;border-radius:999px;background:' + statusColor + ';transition:width 0.25s;"></div>';
                    col += '</div>';
                    col += '<span style="font-size:10px;font-weight:600;color:var(--text-secondary);">' + doneTasks + '/' + totalTasks + '</span>';
                    col += '</div>';
                    col += '</div>';
                });
                col += '</div>';
                return col;
            }

            html += '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;align-items:flex-start;">';
            html += column('Backlog', backlog, 'rgba(142,142,147,0.8)');
            html += column('In Progress', inProgress, '#007AFF');
            html += column('Done', done, '#34C759');
            html += '</div>';
        }

        el.innerHTML = html;

        // New mission button
        document.getElementById('newMissionBtn').addEventListener('click', function() {
            showMissionCreator(el, missions);
        });

        // Mission card click → expand
        el.querySelectorAll('.mission-card').forEach(function(card) {
            card.addEventListener('click', function() {
                var idx = parseInt(card.dataset.missionIdx);
                expandMission(el, missions, idx);
            });
        });
    }

    function showMissionCreator(el, missions) {
        var html = '<div id="missionCreator" style="padding:14px;border-radius:12px;background:var(--bg-secondary);border:1px solid var(--border-medium);margin-bottom:12px;">';
        html += '<div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:10px;">Create Mission</div>';
        html += '<input id="missionNameInput" type="text" placeholder="Mission name..." style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border-subtle);background:var(--bg-tertiary);color:var(--text-primary);font-size:13px;font-family:inherit;margin-bottom:8px;box-sizing:border-box;" />';
        html += '<input id="missionDescInput" type="text" placeholder="Brief description (optional)..." style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border-subtle);background:var(--bg-tertiary);color:var(--text-primary);font-size:13px;font-family:inherit;margin-bottom:10px;box-sizing:border-box;" />';

        // Agent picker
        var agentNames = Object.keys(typeof AGENTS !== 'undefined' ? AGENTS : {});
        html += '<div style="font-size:11px;font-weight:600;color:var(--text-tertiary);margin-bottom:6px;">ASSIGN AGENTS</div>';
        html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">';
        agentNames.forEach(function(id) {
            var a = AGENTS[id];
            html += '<label style="display:flex;align-items:center;gap:4px;padding:4px 10px;border-radius:6px;background:var(--bg-tertiary);cursor:pointer;font-size:12px;color:var(--text-primary);"><input type="checkbox" class="mission-agent-check" value="' + esc(id) + '" /> ' + esc(a.name || id) + '</label>';
        });
        html += '</div>';

        html += '<div style="display:flex;gap:8px;">';
        html += '<button id="missionCreateConfirm" style="flex:1;padding:10px;border-radius:10px;border:none;background:var(--exec-blue);color:white;font-size:13px;font-weight:600;cursor:pointer;">Create Mission</button>';
        html += '<button id="missionCreateCancel" style="padding:10px 16px;border-radius:10px;border:1px solid var(--border-medium);background:transparent;color:var(--text-primary);font-size:13px;cursor:pointer;">Cancel</button>';
        html += '</div></div>';

        el.insertAdjacentHTML('afterbegin', html);

        document.getElementById('missionCreateCancel').addEventListener('click', function() {
            document.getElementById('missionCreator').remove();
        });

        document.getElementById('missionCreateConfirm').addEventListener('click', function() {
            var name = document.getElementById('missionNameInput').value.trim();
            if (!name) { showToast('⚠️ Mission name required'); return; }
            var desc = document.getElementById('missionDescInput').value.trim();
            var agents = [];
            document.querySelectorAll('.mission-agent-check:checked').forEach(function(cb) { agents.push(cb.value); });

            missions.push({
                id: 'mission-' + Date.now(),
                name: name,
                desc: desc,
                agents: agents,
                status: 'active',
                todos: [],
                createdAt: Date.now()
            });
            localStorage.setItem('spawnkit-missions', JSON.stringify(missions));
            showToast('🎯 Mission "' + name + '" created!');
            loadOrchMissions();
        });
    }

    function expandMission(el, missions, idx) {
        var m = missions[idx];
        if (!m) return;

        // Remove previous expansion
        var prev = document.getElementById('missionExpanded');
        if (prev) prev.remove();

        var html = '<div id="missionExpanded" style="padding:14px;border-radius:12px;background:var(--bg-secondary);border:1px solid var(--exec-blue);margin-top:-4px;margin-bottom:12px;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">';
        html += '<div style="font-size:15px;font-weight:700;color:var(--text-primary);">🎯 ' + esc(m.name) + '</div>';
        html += '<div style="display:flex;gap:6px;">';
        if (m.status !== 'done') html += '<button class="mission-complete-btn" style="padding:4px 10px;border-radius:6px;border:none;background:#30D158;color:white;font-size:11px;font-weight:600;cursor:pointer;">✓ Complete</button>';
        html += '<button class="mission-delete-btn" style="padding:4px 10px;border-radius:6px;border:1px solid #FF453A;background:transparent;color:#FF453A;font-size:11px;font-weight:600;cursor:pointer;">Delete</button>';
        html += '</div></div>';

        // TODO list
        html += '<div style="font-size:11px;font-weight:600;color:var(--text-tertiary);margin-bottom:6px;">TODO (' + (m.todos || []).length + ')</div>';
        (m.todos || []).forEach(function(t, tidx) {
            html += '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-subtle);">';
            html += '<input type="checkbox" class="todo-check" data-tidx="' + tidx + '" ' + (t.done ? 'checked' : '') + ' style="cursor:pointer;" />';
            html += '<span style="font-size:13px;color:var(--text-primary);' + (t.done ? 'text-decoration:line-through;opacity:0.5;' : '') + '">' + esc(t.text) + '</span>';
            html += '</div>';
        });

        // Add TODO input
        html += '<div style="display:flex;gap:6px;margin-top:8px;">';
        html += '<input id="missionTodoInput" type="text" placeholder="Add task..." style="flex:1;padding:6px 10px;border-radius:6px;border:1px solid var(--border-subtle);background:var(--bg-tertiary);color:var(--text-primary);font-size:12px;font-family:inherit;" />';
        html += '<button id="missionTodoAdd" style="padding:6px 12px;border-radius:6px;border:none;background:var(--exec-blue);color:white;font-size:12px;cursor:pointer;">Add</button>';
        html += '</div></div>';

        // Insert after the clicked card
        var cards = el.querySelectorAll('.mission-card');
        if (cards[idx]) {
            cards[idx].insertAdjacentHTML('afterend', html);
        } else {
            el.insertAdjacentHTML('beforeend', html);
        }

        // Wire todo add
        document.getElementById('missionTodoAdd').addEventListener('click', function() {
            var input = document.getElementById('missionTodoInput');
            var text = input.value.trim();
            if (!text) return;
            if (!m.todos) m.todos = [];
            m.todos.push({ text: text, done: false });
            localStorage.setItem('spawnkit-missions', JSON.stringify(missions));
            expandMission(el, missions, idx);
        });
        document.getElementById('missionTodoInput').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') document.getElementById('missionTodoAdd').click();
        });

        // Wire todo checkboxes via event delegation (avoids handler accumulation)
        var expanded = document.getElementById('missionExpanded');
        if (expanded) {
            expanded.addEventListener('change', function(e) {
                if (e.target.classList.contains('todo-check')) {
                    var tidx = parseInt(e.target.dataset.tidx);
                    if (m.todos[tidx]) m.todos[tidx].done = e.target.checked;
                    localStorage.setItem('spawnkit-missions', JSON.stringify(missions));
                    expandMission(el, missions, idx);
                }
            });
        }

        // Complete / Delete
        var compBtn = document.querySelector('#missionExpanded .mission-complete-btn');
        if (compBtn) compBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            m.status = 'done';
            localStorage.setItem('spawnkit-missions', JSON.stringify(missions));
            showToast('✅ Mission "' + m.name + '" completed!');
            loadOrchMissions();
        });
        document.querySelector('#missionExpanded .mission-delete-btn').addEventListener('click', function(e) {
            e.stopPropagation();
            missions.splice(idx, 1);
            localStorage.setItem('spawnkit-missions', JSON.stringify(missions));
            showToast('🗑️ Mission deleted');
            loadOrchMissions();
        });
    }

    // ── Setup Tab ──
    function loadOrchSetup() {
        var el = document.getElementById('orchTabSetup');
        if (!el) return;

        var stored = {};
        try { stored = JSON.parse(localStorage.getItem('spawnkit-config') || '{}'); } catch(e) {}

        var html = '';
        html += '<div style="font-size:11px;text-transform:uppercase;font-weight:600;color:var(--text-tertiary);letter-spacing:0.5px;margin-bottom:12px;">Connection Settings</div>';

        // Connection status
        var isLive = SpawnKit.mode === 'live';
        html += '<div style="display:flex;align-items:center;gap:8px;padding:12px;border-radius:10px;background:' + (isLive ? 'rgba(52,199,89,0.1)' : 'rgba(255,149,0,0.1)') + ';margin-bottom:16px;">';
        html += '<div style="width:10px;height:10px;border-radius:50%;background:' + (isLive ? '#34C759' : '#FF9500') + ';"></div>';
        html += '<div style="font-size:13px;font-weight:500;color:var(--text-primary);">' + (isLive ? '🟢 Connected to OpenClaw' : '🟡 Demo Mode — Configure relay below') + '</div>';
        html += '</div>';

        // Relay URL
        html += '<div style="margin-bottom:12px;">';
        html += '<label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:4px;">Relay URL</label>';
        html += '<input type="text" id="setupRelayUrl" value="' + esc(stored.relayUrl || RELAY_URL || 'http://127.0.0.1:18789') + '" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border-medium);background:var(--bg-secondary);color:var(--text-primary);font-size:13px;font-family:inherit;box-sizing:border-box;" />';
        html += '</div>';

        // Token
        html += '<div style="margin-bottom:12px;">';
        html += '<label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:4px;">Auth Token</label>';
        html += '<input type="password" id="setupRelayToken" value="' + esc(stored.relayToken || RELAY_TOKEN || '') + '" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border-medium);background:var(--bg-secondary);color:var(--text-primary);font-size:13px;font-family:inherit;box-sizing:border-box;" />';
        html += '</div>';

        // CEO Name
        html += '<div style="margin-bottom:16px;">';
        html += '<label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:4px;">CEO Name</label>';
        html += '<input type="text" id="setupCeoName" value="' + esc(stored.userName || 'ApoMac') + '" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border-medium);background:var(--bg-secondary);color:var(--text-primary);font-size:13px;font-family:inherit;box-sizing:border-box;" />';
        html += '</div>';

        // Save button
        html += '<div style="display:flex;gap:8px;">';
        html += '<button onclick="saveOrchSetup()" style="flex:1;padding:10px;border-radius:8px;background:var(--exec-blue);color:white;border:none;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">💾 Save & Connect</button>';
        html += '<button onclick="testOrchRelay()" style="padding:10px 16px;border-radius:8px;background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-medium);font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;">🔍 Test</button>';
        html += '</div>';

        // Test result area
        html += '<div id="setupTestResult" style="margin-top:12px;"></div>';

        el.innerHTML = html;
    }

    window.saveOrchSetup = function() {
        var url = document.getElementById('setupRelayUrl').value.trim();
        var token = document.getElementById('setupRelayToken').value.trim();
        var ceoName = document.getElementById('setupCeoName').value.trim();

        var config = {};
        try { config = JSON.parse(localStorage.getItem('spawnkit-config') || '{}'); } catch(e) { config = {}; }
        if (typeof config !== 'object' || config === null || Array.isArray(config)) config = {};
        config.relayUrl = url;
        config.relayToken = token;
        if (ceoName) config.userName = ceoName;
        localStorage.setItem('spawnkit-config', JSON.stringify(config));

        window.OC_RELAY_URL = url;
        window.OC_RELAY_TOKEN = token;
        RELAY_URL = url;
        RELAY_TOKEN = token;

        if (window.SpawnKitPanels) SpawnKitPanels.showToast('✅ Settings saved — reloading…');
        setTimeout(function() { location.reload(); }, 1000);
    };

    window.testOrchRelay = function() {
        var url = document.getElementById('setupRelayUrl').value.trim();
        var token = document.getElementById('setupRelayToken').value.trim();
        var result = document.getElementById('setupTestResult');
        result.innerHTML = '<div style="font-size:12px;color:var(--text-tertiary);padding:8px;">Testing connection…</div>';

        var headers = { 'Accept': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;

        fetch(url.replace(/\/+$/, '') + '/api/oc/sessions', { headers: headers, mode: 'cors' })
            .then(function(r) {
                if (r.ok) return r.json().then(function(d) {
                    var count = Array.isArray(d) ? d.length : (d.sessions ? d.sessions.length : 0);
                    result.innerHTML = '<div style="font-size:12px;padding:8px 12px;border-radius:8px;background:rgba(52,199,89,0.1);color:#34C759;">✅ Connected! Found ' + count + ' sessions.</div>';
                });
                result.innerHTML = '<div style="font-size:12px;padding:8px 12px;border-radius:8px;background:rgba(255,59,48,0.1);color:#FF3B30;">❌ HTTP ' + r.status + ' — check URL and token.</div>';
            })
            .catch(function(e) {
                result.innerHTML = '<div style="font-size:12px;padding:8px 12px;border-radius:8px;background:rgba(255,59,48,0.1);color:#FF3B30;">❌ Connection failed: ' + esc(e.message) + '</div>';
            });
    };

    // Helper
    function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
})();
