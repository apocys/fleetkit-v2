    // Read config from setup wizard (if available)
    try {
      const setupConfig = JSON.parse(localStorage.getItem('spawnkit-config') || '{}');
      if (setupConfig.userName) {
        // Replace "Sycopa" with the user's name in the CEO card
        document.addEventListener('DOMContentLoaded', () => {
          const ceoNames = document.querySelectorAll('[data-agent="ceo"] .agent-name, .ceo-name');
          ceoNames.forEach(el => el.textContent = setupConfig.userName);
        });
      }
      if (setupConfig.ceoName) {
        // Replace CEO agent name
        document.addEventListener('DOMContentLoaded', () => {
          const ceoLabels = document.querySelectorAll('[data-agent="ceo"] .agent-label');
          ceoLabels.forEach(el => el.textContent = setupConfig.ceoName);
        });
      }
    } catch(e) { /* ignore */ }

    (function() {
        'use strict';
        try {

        /* ═══════════════════════════════════════════════
           Configuration & Mock Data
           ═══════════════════════════════════════════════ */

        // Get user's setup config for personalization
        var setupConfig = {};
        try {
            setupConfig = JSON.parse(localStorage.getItem('spawnkit-config') || '{}');
        } catch(e) {}

        /* Check if spawnkitAPI is available (Electron preload) */
        // spawnkitAPI reference — isAvailable() is async, resolved at init time
        var API = (typeof window.spawnkitAPI !== 'undefined') ? window.spawnkitAPI : null;
        
        /* BRIDGE: Connect HTML API calls to SpawnKit data system */
        function createAPIBridge() {
            if (API && typeof API.isAvailable === 'function') return; // Already have a real API
            if (!window.SpawnKit) return; // SpawnKit not ready yet
            
            console.log('🔌 Creating API bridge to SpawnKit data system');
            API = {
                async isAvailable() { return true; },
                async getSessions() {
                    if (!window.SpawnKit.data) return { subagents: [], sessions: [] };
                    return {
                        subagents: window.SpawnKit.data.subagents || [],
                        sessions: window.SpawnKit.data.sessions || []
                    };
                },
                async getActiveSubagents() {
                    if (!window.SpawnKit.data || !window.SpawnKit.data.subagents) return [];
                    return window.SpawnKit.data.subagents.filter(sa => sa.status === 'active');
                },
                async getCrons() {
                    if (!window.SpawnKit.data || !window.SpawnKit.data.crons) return [];
                    return window.SpawnKit.data.crons;
                },
                async getMemory() {
                    if (!window.SpawnKit.data || !window.SpawnKit.data.memory) return null;
                    return window.SpawnKit.data.memory;
                },
                async getAgentInfo(agentId) {
                    // Return basic info for agent panels
                    return { soul: 'Agent personality and traits would appear here.' };
                },
                async listAvailableSkills() {
                    // Return basic skill list
                    return [
                        { name: '🔍 Web Search', description: 'Search the web for information' },
                        { name: '📝 Note Taking', description: 'Take and manage notes' },
                        { name: '🎯 Task Planning', description: 'Plan and organize tasks' }
                    ];
                },
                async saveAgentSkills(agentId, skills) {
                    console.log('saveAgentSkills called for', agentId, skills);
                    return { success: true };
                },
                async saveAgentSoul(agentId, soul) {
                    console.log('saveAgentSoul called for', agentId, soul);
                    return { success: true };
                },
                async getApiKeys() {
                    return {}; // No API keys in browser mode
                },
                async saveApiKey(provider, key) {
                    console.log('saveApiKey called for', provider);
                    return { success: true };
                },
                async deleteApiKey(provider) {
                    console.log('deleteApiKey called for', provider);
                    return { success: true };
                },
                async getTranscript(sessionKey) {
                    try {
                        var apiUrl = window.OC_API_URL || (window.location.hostname.includes('spawnkit.ai') ? window.location.origin : 'http://127.0.0.1:8222');
                        var resp = await fetch(apiUrl + '/api/oc/chat');
                        if (!resp.ok) return [];
                        var data = await resp.json();
                        return Array.isArray(data) ? data : (data.messages || []);
                    } catch(e) { console.warn('getTranscript error:', e); return []; }
                }
            };
        }
        
        // Try to create bridge immediately (after DOM loads)
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                createAPIBridge();
                // Trigger initial meeting preview update if needed
                if (window.API && typeof updateMeetingPreview === 'function') {
                    updateMeetingPreview();
                }
            }, 1000);
        });
        
        // Also create bridge when SpawnKit initializes
        if (window.SpawnKit && window.SpawnKit.on) {
            window.SpawnKit.on('init:complete', createAPIBridge);
            window.SpawnKit.on('data:refresh', createAPIBridge);
        }
        
        // Fallback: Try every 2 seconds until SpawnKit is available
        const bridgeRetryInterval = setInterval(() => {
            if (window.SpawnKit && window.SpawnKit.data && !window.API) {
                createAPIBridge();
                if (window.API) {
                    clearInterval(bridgeRetryInterval);
                }
            }
        }, 2000);

        var AGENTS = {
            ceo:      { name: setupConfig.userName || 'Sycopa', role: setupConfig.ceoName || 'CEO', color: '#007AFF', status: 'active', task: 'Orchestrating fleet operations' },
            atlas:    { name: 'Atlas',    role: 'COO',           color: '#BF5AF2', status: 'idle', task: '' },
            forge:    { name: 'Forge',    role: 'CTO',           color: '#FF9F0A', status: 'idle', task: '' },
            hunter:   { name: 'Hunter',   role: 'CRO',           color: '#FF453A', status: 'idle', task: '' },
            echo:     { name: 'Echo',     role: 'CMO',           color: '#0A84FF', status: 'idle', task: '' },
            sentinel: { name: 'Sentinel', role: 'QA & Security', color: '#30D158', status: 'idle', task: '' },
        };

        /* Default skills by role (Feature 6 fallback) */
        var DEFAULT_SKILLS = {
            ceo:      ['🎯 Orchestration', '📊 Strategy', '🔮 Vision', '👥 Leadership'],
            atlas:    ['⚙️ Operations', '📋 Process', '📝 Docs', '🔄 Workflows'],
            forge:    ['🛠️ Engineering', '🔒 Security', '🏗️ Architecture', '⚡ Perf'],
            hunter:   ['💰 Revenue', '📈 Growth', '🎯 Sales', '🔍 Research'],
            echo:     ['🎨 Brand', '📱 Content', '🎬 Video', '✍️ Copy'],
            sentinel: ['🛡️ Audit', '✅ QA', '⚠️ Risk', '🔍 Review']
        };

        /* Live data caches */
        var liveSessionData = null;
        var liveCronData = null;
        var liveMemoryData = null;
        var chatHistory = JSON.parse(localStorage.getItem('spawnkit-chat-history') || '[]');

        /* Pre-fetch cron + memory data for panels */
        async function prefetchPanelData() {
            if (!API) return;
            try { liveCronData = await Promise.resolve(API.getCrons()); } catch(e) {}
            try { liveMemoryData = await Promise.resolve(API.getMemory()); } catch(e) {}
        }
        prefetchPanelData();
        setInterval(prefetchPanelData, 30000);

        /* SVG avatar ID map for mailbox rendering */
        var AVATAR_MAP = {
            'Sycopa': 'avatar-ceo',
            [setupConfig.userName || 'Sycopa']: 'avatar-ceo',
            'Atlas': 'avatar-atlas',
            'Forge': 'avatar-forge',
            'Hunter': 'avatar-hunter',
            'Echo': 'avatar-echo',
            'Sentinel': 'avatar-sentinel'
        };

        // Live messages loaded from transcript
        var LIVE_MESSAGES = [];

        /* Agent TODO Data — Live from spawnkitAPI */  
        var LIVE_AGENT_DATA = {};
        
        /* ── Load Live Agent Data — REAL per-agent TODO.md + SKILLS.md ──────── */
        async function loadLiveAgentData() {
            var agentIds = ['ceo', 'atlas', 'forge', 'hunter', 'echo', 'sentinel'];
            
            if (!window.spawnkitAPI || !await window.spawnkitAPI.isAvailable()) {
                console.debug('🏢 [Executive] No live data — showing empty state');
                LIVE_AGENT_DATA = {};
                agentIds.forEach(function(id) {
                    LIVE_AGENT_DATA[id] = {
                        currentTask: 'Connect to OpenClaw for live data',
                        todos: [],
                        skills: []
                    };
                });
                return;
            }
            
            try {
                // Load per-agent TODO and skills in parallel
                var todoPromises = agentIds.map(function(id) {
                    return window.spawnkitAPI.getAgentTodos(id);
                });
                var skillPromises = agentIds.map(function(id) {
                    return window.spawnkitAPI.getAgentSkills(id);
                });
                
                var allTodos = await Promise.all(todoPromises);
                var allSkills = await Promise.all(skillPromises);
                
                LIVE_AGENT_DATA = {};
                agentIds.forEach(function(id, i) {
                    var todoData = allTodos[i] || { todos: [], currentTask: 'Standby' };
                    var skillsData = allSkills[i] || [];
                    
                    LIVE_AGENT_DATA[id] = {
                        currentTask: todoData.currentTask || 'Standby',
                        todos: todoData.todos || [],
                        skills: skillsData.map(function(s, idx) {
                            return { name: s.name || s.dirName || 'Skill', percentage: Math.max(70, 95 - idx * 5), description: s.description || '' };
                        })
                    };
                });
                
                console.debug('🏢 [Executive] Loaded REAL per-agent data for', Object.keys(LIVE_AGENT_DATA).length, 'agents');
            } catch (e) {
                console.warn('🏢 [Executive] Failed to load agent data:', e);
                LIVE_AGENT_DATA = {};
                agentIds.forEach(function(id) {
                    LIVE_AGENT_DATA[id] = {
                        currentTask: 'Error loading data',
                        todos: [],
                        skills: []
                    };
                });
            }
        }

        /* ═══════════════════════════════════════════════
           DOM References
           ═══════════════════════════════════════════════ */

        var mailboxBtn      = document.getElementById('mailboxBtn');
        var mailboxOverlay  = document.getElementById('mailboxOverlay');
        var mailboxBackdrop = document.getElementById('mailboxBackdrop');
        var mailboxClose    = document.getElementById('mailboxClose');
        var mailboxMessages = document.getElementById('mailboxMessages');
        var commandInput    = document.getElementById('commandInput');
        var gridView        = document.getElementById('gridView');
        var hierarchyView   = document.getElementById('hierarchyView');
        var tabGrid         = document.getElementById('tabGrid');
        var tabHierarchy    = document.getElementById('tabHierarchy');

        // TODO Panel elements
        var todoOverlay     = document.getElementById('todoOverlay');
        var todoBackdrop    = document.getElementById('todoBackdrop');
        var todoClose       = document.getElementById('todoClose');
        var todoAvatar      = document.getElementById('todoAvatar');
        var todoName        = document.getElementById('todoName');
        var todoRole        = document.getElementById('todoRole');
        var todoContent     = document.getElementById('todoContent');

        // Meeting Panel elements
        var meetingOverlay  = document.getElementById('meetingOverlay');
        var meetingBackdrop = document.getElementById('meetingBackdrop');
        var meetingClose    = document.getElementById('meetingClose');
        var meetingContent  = document.getElementById('meetingContent');
        
        // Chat/Cron/Memory panel elements — declared in unified implementation below

        /* ═══════════════════════════════════════════════
           View Toggle — Grid / Hierarchy
           ═══════════════════════════════════════════════ */

        function switchView(view) {
            if (view === 'grid') {
                gridView.classList.remove('hidden');
                hierarchyView.classList.remove('visible');
                tabGrid.classList.add('active');
                tabGrid.setAttribute('aria-selected', 'true');
                tabHierarchy.classList.remove('active');
                tabHierarchy.setAttribute('aria-selected', 'false');
            } else {
                gridView.classList.add('hidden');
                hierarchyView.classList.add('visible');
                tabHierarchy.classList.add('active');
                tabHierarchy.setAttribute('aria-selected', 'true');
                tabGrid.classList.remove('active');
                tabGrid.setAttribute('aria-selected', 'false');
                renderOrgChart();
            }
        }

        /* ═══════════════════════════════════════════════
           Dynamic Org Chart Renderer
           ═══════════════════════════════════════════════ */
        function renderOrgChart() {
            var tree = document.getElementById('orgTree');
            if (!tree) return;

            // Collect live sub-agent data from last session refresh
            var liveSubagents = [];
            if (API) {
                try {
                    var cached = liveSessionData;
                    if (cached && cached.subagents) liveSubagents = cached.subagents;
                } catch(e) {}
            }

            // Group sub-agents by parent
            var subsByParent = {};
            liveSubagents.forEach(function(sa) {
                var parent = (sa.parent || sa.agentId || 'ceo').toLowerCase();
                // Map parent to known agent ids
                if (parent.indexOf('atlas') !== -1) parent = 'atlas';
                else if (parent.indexOf('forge') !== -1) parent = 'forge';
                else if (parent.indexOf('hunter') !== -1) parent = 'hunter';
                else if (parent.indexOf('echo') !== -1) parent = 'echo';
                else if (parent.indexOf('sentinel') !== -1) parent = 'sentinel';
                else parent = 'ceo';
                if (!subsByParent[parent]) subsByParent[parent] = [];
                subsByParent[parent].push(sa);
            });

            var clevel = [
                { id: 'atlas',    name: AGENTS.atlas.name,    role: AGENTS.atlas.role,    avatar: 'avatar-atlas',    status: AGENTS.atlas.status },
                { id: 'forge',    name: AGENTS.forge.name,    role: AGENTS.forge.role,    avatar: 'avatar-forge',    status: AGENTS.forge.status },
                { id: 'echo',     name: AGENTS.echo.name,     role: AGENTS.echo.role,     avatar: 'avatar-echo',     status: AGENTS.echo.status },
                { id: 'hunter',   name: AGENTS.hunter.name,   role: AGENTS.hunter.role,   avatar: 'avatar-hunter',   status: AGENTS.hunter.status },
                { id: 'sentinel', name: AGENTS.sentinel.name, role: AGENTS.sentinel.role, avatar: 'avatar-sentinel', status: AGENTS.sentinel.status }
            ];

            var html = '';

            // ── CEO node ──
            html += '<div class="org-node">';
            html += '  <div class="org-card org-card--ceo" data-agent="ceo" tabindex="0" role="button" aria-label="' + esc(AGENTS.ceo.name) + ' — ' + esc(AGENTS.ceo.role) + '">';
            html += '    <div class="agent-avatar agent-avatar--lg" aria-hidden="true"><svg><use href="#avatar-ceo"/></svg>';
            html += '      <span class="agent-status-dot agent-status-dot--active"></span>';
            html += '    </div>';
            html += '    <div class="org-card-info">';
            html += '      <span class="agent-name">' + esc(AGENTS.ceo.name) + '</span>';
            html += '      <span class="agent-role">' + esc(AGENTS.ceo.role === 'CEO' ? 'Chief Executive Officer' : AGENTS.ceo.role) + '</span>';
            html += '    </div>';
            html += '  </div>';
            // CEO sub-agents
            if (subsByParent['ceo'] && subsByParent['ceo'].length > 0) {
                html += renderSubagentCluster(subsByParent['ceo']);
            }
            html += '</div>';

            // ── Connector ──
            html += '<div class="org-connector"></div>';

            // ── C-Level children ──
            html += '<div class="org-children" id="orgChildren">';
            clevel.forEach(function(agent) {
                var statusClass = agent.status === 'active' ? 'active' : (agent.status === 'busy' ? 'busy' : 'idle');
                html += '<div class="org-child">';
                html += '  <div class="org-connector--branch"></div>';
                html += '  <div class="org-card" data-agent="' + agent.id + '" tabindex="0" role="button" aria-label="' + esc(agent.name) + ' — ' + esc(agent.role) + '">';
                html += '    <div class="agent-avatar" aria-hidden="true"><svg><use href="#' + agent.avatar + '"/></svg>';
                html += '      <span class="agent-status-dot agent-status-dot--' + statusClass + '"></span>';
                html += '    </div>';
                html += '    <div class="org-card-info">';
                html += '      <span class="agent-name">' + esc(agent.name) + '</span>';
                html += '      <span class="agent-role">' + esc(agent.role) + '</span>';
                html += '    </div>';
                html += '  </div>';
                // Sub-agents under this C-level
                var subs = subsByParent[agent.id] || [];
                if (subs.length > 0) {
                    html += renderSubagentCluster(subs);
                }
                html += '</div>';
            });
            html += '</div>';

            tree.innerHTML = html;

            // Compute --bar-half-width for the horizontal connector bar
            requestAnimationFrame(function() {
                var childrenEl = document.getElementById('orgChildren');
                if (childrenEl && childrenEl.children.length >= 2) {
                    var first = childrenEl.children[0];
                    var last = childrenEl.children[childrenEl.children.length - 1];
                    var firstRect = first.getBoundingClientRect();
                    var lastRect = last.getBoundingClientRect();
                    var parentRect = childrenEl.getBoundingClientRect();
                    var firstCenter = firstRect.left + firstRect.width / 2 - parentRect.left;
                    var lastCenter = lastRect.left + lastRect.width / 2 - parentRect.left;
                    var barWidth = (lastCenter - firstCenter) / 2;
                    var parentCenter = parentRect.width / 2;
                    childrenEl.style.setProperty('--bar-half-width', Math.max(barWidth, 100) + 'px');
                }
            });

            // Wire org-card clicks to open detail panels
            tree.querySelectorAll('.org-card[data-agent]').forEach(function(card) {
                card.addEventListener('click', function() {
                    var agentId = card.dataset.agent;
                    if (typeof openDetailPanel === 'function') openDetailPanel(agentId);
                });
            });
        }

        function renderSubagentCluster(subs) {
            var h = '<div class="org-sub-level">';
            h += '<div class="org-connector"></div>';
            h += '<div class="org-sub-children">';
            subs.forEach(function(sa) {
                var name = sa.displayName || sa.label || sa.agentOSName || sa.id || 'Sub-agent';
                var task = sa.task || sa.description || sa.status || '';
                var statusColor = sa.status === 'running' ? '#30D158' : (sa.status === 'error' ? '#FF453A' : '#8E8E93');
                h += '<div class="org-sub-card" title="' + esc(task) + '">';
                h += '  <div class="sub-agent-name">' + esc(name) + '</div>';
                h += '  <div class="sub-agent-role">' + esc(task.length > 30 ? task.substring(0, 27) + '…' : task) + '</div>';
                if (sa.status === 'running') {
                    h += '  <div style="width:6px;height:6px;border-radius:50%;background:' + statusColor + ';margin-top:2px;animation:statusPulse 2.5s ease-in-out infinite;"></div>';
                }
                h += '</div>';
            });
            h += '</div></div>';
            return h;
        }

        tabGrid.addEventListener('click', function() { switchView('grid'); });
        tabHierarchy.addEventListener('click', function() { switchView('hierarchy'); });

        // Keyboard nav for tabs
        document.querySelector('.view-toggle-group').addEventListener('keydown', function(e) {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                var current = document.querySelector('.view-toggle-btn.active');
                var next = e.key === 'ArrowRight' ? tabHierarchy : tabGrid;
                switchView(next.dataset.view);
                next.focus();
            }
        });

        /* ═══════════════════════════════════════════════
           CEO Communications Hub (was Mailbox) — Open / Close / Tabs
           ═══════════════════════════════════════════════ */

        window.openMailbox = function openMailbox(tab) {
            if (typeof tab === 'object') tab = undefined; // Handle event object
            closeTodoPanel();
            closeDetailPanel();
            closeChatPanel(); // Close old chat panel if open
            mailboxOverlay.classList.add('open');
            
            // Switch to specified tab or default to Messages when opened via mailbox button
            if (tab === 'chat') {
                switchCommTab('chat');
                loadChatTargets(); // Load available targets for chat tab
                document.getElementById('chatTabInput').focus();
            } else {
                switchCommTab('messages'); // Default to Messages tab when opened via CEO mailbox button
                mailboxClose.focus();
            }
            
            document.body.style.overflow = 'hidden';
            loadChatTabTranscript(); // Load chat data when opening
        }

        function closeMailbox() {
            if (mailboxOverlay) mailboxOverlay.classList.remove('open');
            document.body.style.overflow = '';
            if (mailboxBtn) mailboxBtn.focus();
        }

        function switchCommTab(tabName) {
            // Update tab buttons
            document.querySelectorAll('.comm-tab').forEach(tab => {
                tab.classList.remove('active');
                if (tab.dataset.tab === tabName) {
                    tab.classList.add('active');
                }
            });
            
            // Update tab content
            document.querySelectorAll('.comm-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            const targetContent = document.getElementById(tabName + 'TabContent');
            if (targetContent) {
                targetContent.classList.add('active');
            }
            
            // Load content based on tab
            if (tabName === 'chat') {
                loadChatTabTranscript();
                loadChatTargets(); // Load targets when switching to chat tab
            } else if (tabName === 'messages') {
                loadLiveMessages(); // Refresh messages
            } else if (tabName === 'activity') {
                loadActivityData();
            }
        }

        // Tab click handlers
        document.getElementById('chatTab').addEventListener('click', () => switchCommTab('chat'));
        document.getElementById('messagesTab').addEventListener('click', () => switchCommTab('messages'));
        document.getElementById('activityTab').addEventListener('click', () => switchCommTab('activity'));

        if (mailboxBtn) mailboxBtn.addEventListener('click', () => openMailbox('messages'));
        if (mailboxBackdrop) mailboxBackdrop.addEventListener('click', closeMailbox);
        if (mailboxClose) mailboxClose.addEventListener('click', closeMailbox);
        
        /* Chat/Cron/Memory panels — see unified implementation below (Forge v3) */

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
            
            closeMailbox();
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
            document.getElementById('detailTask').textContent = agent.task || (agent.status === 'idle' ? '💤 Idle' : '—');

            // Build body
            var body = '';

            // Metrics section
            body += '<div class="detail-section"><div class="detail-section-title">Metrics</div>';
            body += '<div class="detail-metrics">';
            body += '<div class="detail-metric"><div class="detail-metric-value">' + (['active','working','busy','building'].indexOf(agent.status) >= 0 ? '🟢' : '💤') + '</div><div class="detail-metric-label">Status</div></div>';
            body += '<div class="detail-metric"><div class="detail-metric-value">—</div><div class="detail-metric-label">Tokens Used</div></div>';
            body += '<div class="detail-metric"><div class="detail-metric-value">—</div><div class="detail-metric-label">API Calls</div></div>';
            body += '<div class="detail-metric"><div class="detail-metric-value">—</div><div class="detail-metric-label">Last Active</div></div>';
            body += '</div></div>';

            // Fetch real metrics from API bridge
            (async function() {
                try {
                    var apiUrl = (window.OC_API_URL || (window.location.hostname.includes('spawnkit.ai') ? window.location.origin : 'http://127.0.0.1:8222'));
                    var resp = await  skFetch(apiUrl + '/api/oc/sessions');
                    if (!resp.ok) return;
                    var sessions = await resp.json();
                    // Map agentId to session key patterns
                    var agentKeyMap = {
                        ceo: 'agent:main:main',
                        atlas: 'atlas', forge: 'forge', hunter: 'hunter', echo: 'echo', sentinel: 'sentinel'
                    };
                    var matchKey = agentKeyMap[agentId] || agentId;
                    // Find main session or matching sub-agents
                    var totalTokens = 0, subCount = 0, lastActiveMs = 0, modelName = '—';
                    sessions.forEach(function(s) {
                        var keyMatch = (matchKey === 'agent:main:main') ?
                            (s.key === 'agent:main:main') :
                            (s.label && s.label.toLowerCase().indexOf(matchKey) >= 0);
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
                    if (modelName !== '—') {
                        var modelRow = document.getElementById('detailModel');
                        if (modelRow) modelRow.textContent = modelName;
                    }
                } catch(e) { console.warn('Metrics load error:', e); }
            })();

            // TODO list section — from REAL live data only
            var todoData = LIVE_AGENT_DATA[agentId];
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

            // Async: populate sub-agents from live sessions
            (async function() {
                try {
                    var apiUrl = (window.OC_API_URL || (window.location.hostname.includes('spawnkit.ai') ? window.location.origin : 'http://127.0.0.1:8222'));
                    var resp = await  skFetch(apiUrl + '/api/oc/sessions');
                    if (!resp.ok) return;
                    var sessions = await resp.json();
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
                    var html = '';
                    subs.slice(0, 10).forEach(function(s) {
                        var isActive = s.status === 'active';
                        var ago = Date.now() - (s.lastActive || 0);
                        var agoStr = ago < 60000 ? 'now' : ago < 3600000 ? Math.floor(ago/60000) + 'm' : Math.floor(ago/3600000) + 'h';
                        html += '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-subtle);">';
                        html += '<span style="width:6px;height:6px;border-radius:50%;background:' + (isActive ? '#30D158' : '#8E8E93') + ';flex-shrink:0;"></span>';
                        html += '<div style="flex:1;min-width:0;">';
                        html += '<div style="font-size:13px;font-weight:500;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(s.label || s.displayName || 'sub-agent') + '</div>';
                        html += '<div style="font-size:11px;color:var(--text-tertiary);">' + esc(s.model || '—') + ' · ' + (s.totalTokens || 0).toLocaleString() + ' tokens</div>';
                        html += '</div>';
                        html += '<span style="font-size:10px;color:var(--text-tertiary);white-space:nowrap;">' + agoStr + '</span>';
                        html += '</div>';
                    });
                    if (subs.length > 10) html += '<div style="font-size:11px;color:var(--text-tertiary);padding-top:4px;">+' + (subs.length - 10) + ' more</div>';
                    el.innerHTML = html;
                } catch(e) { 
                    var el = document.getElementById('detailSubAgentList');
                    if (el) el.textContent = 'Offline — connect API bridge';
                }
            })();

            // Skills section — from real per-agent SKILLS.md (FIX #5) + management (NEW #1)
            var agentSkills = (todoData && todoData.skills && todoData.skills.length) ? todoData.skills : [];
            if (agentSkills.length > 0) {
                body += '<div class="detail-section"><div class="detail-section-title">Skills</div>';
                body += '<div class="detail-skill-chips" id="detailSkillChips">';
                agentSkills.forEach(function(s, idx) {
                    body += '<span class="detail-skill-chip" data-skill-idx="' + idx + '">' + esc(s.name || s) + ' <button class="skill-remove-btn" data-skill-name="' + esc(s.name || s) + '" title="Remove skill" style="background:none;border:none;cursor:pointer;color:var(--text-tertiary);font-size:11px;margin-left:4px;padding:0 2px;">×</button></span>';
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
                        body += '<div class="detail-soul-excerpt" id="soulExcerpt">' + excerpt.replace(/</g,'&lt;').replace(/>/g,'&gt;') + (agentInfo.soul.length > 500 ? '…' : '') + '</div>';
                        
                        // Edit button — disabled for sub-agents
                        if (agentId !== 'ceo') {
                            body += '<button class="detail-edit-btn" id="editAgentBtn" style="margin-top:8px;padding:6px 14px;border-radius:8px;border:1px solid var(--exec-blue);background:transparent;color:var(--exec-blue);font-size:12px;font-weight:500;cursor:pointer;">✏️ Edit Agent</button>';
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
                                { name: '🔍 Web Search', description: 'Search the web for information' },
                                { name: '📝 Code Review', description: 'Review and improve code quality' },
                                { name: '🧪 Testing', description: 'Write and run automated tests' },
                                { name: '📊 Data Analysis', description: 'Analyze data and generate reports' },
                                { name: '🌐 API Integration', description: 'Connect to external APIs' },
                                { name: '📄 Documentation', description: 'Write technical documentation' },
                                { name: '🛡️ Security Audit', description: 'Scan for vulnerabilities' },
                                { name: '🎨 UI/UX Design', description: 'Design user interfaces' },
                                { name: '⚡ Performance', description: 'Optimize speed and efficiency' },
                                { name: '🔄 CI/CD', description: 'Continuous integration pipelines' },
                                { name: '💬 Communication', description: 'Send messages and notifications' },
                                { name: '📅 Scheduling', description: 'Schedule and manage cron tasks' }
                            ];
                        }
                        // Show skill picker dropdown
                        var dropdown = document.createElement('div');
                        dropdown.style.cssText = 'position:absolute;background:var(--bg-secondary);border:1px solid var(--border-medium);border-radius:12px;padding:8px;z-index:999;box-shadow:0 8px 30px rgba(0,0,0,0.15);max-height:240px;overflow-y:auto;min-width:220px;';
                        dropdown.innerHTML = '<div style="padding:6px 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-tertiary);font-weight:600;margin-bottom:4px;">Available Skills</div>';
                        available.forEach(function(skill) {
                            var item = document.createElement('div');
                            item.style.cssText = 'padding:8px 12px;cursor:pointer;font-size:13px;border-radius:8px;transition:background 0.15s;';
                            item.innerHTML = '<div style="font-weight:500;color:var(--text-primary)">' + esc(skill.name) + '</div>' +
                                (skill.description ? '<div style="font-size:11px;color:var(--text-tertiary);margin-top:2px">' + esc(skill.description) + '</div>' : '');
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
                                            showToast('✅ Skill "' + skill.name + '" added');
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
                                    showToast('⚠️ Skill "' + skill.name + '" already added');
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
                                    removeBtn.textContent = ' ×';
                                    removeBtn.style.cssText = 'cursor:pointer;margin-left:4px;opacity:0.6;';
                                    removeBtn.onclick = function(e) {
                                        e.stopPropagation();
                                        chip.remove();
                                        var ss = [];
                                        try { ss = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch(e2) { ss = []; }
                                        if (!Array.isArray(ss)) ss = [];
                                        ss = ss.filter(function(s) { return s !== skill.name; });
                                        localStorage.setItem(storageKey, JSON.stringify(ss));
                                        showToast('🗑️ Skill "' + skill.name + '" removed');
                                    };
                                    chip.appendChild(removeBtn);
                                    chipsEl.appendChild(chip);
                                }
                                showToast('✅ Skill "' + skill.name + '" added');
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
                        showToast('🗑️ Skill "' + skillName + '" removed');
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
                    var editHtml = '<div class="soul-editor" style="display:flex;flex-direction:column;gap:8px;">';
                    editHtml += '<label style="font-size:11px;color:var(--text-tertiary);">Name</label>';
                    editHtml += '<input type="text" id="editName" value="' + esc(agent.name || '') + '" style="padding:6px 10px;border-radius:8px;border:1px solid var(--border-medium);font-size:13px;background:var(--bg-tertiary);color:var(--text-primary);" />';
                    editHtml += '<label style="font-size:11px;color:var(--text-tertiary);">Role</label>';
                    editHtml += '<input type="text" id="editRole" value="' + esc(agent.role || '') + '" style="padding:6px 10px;border-radius:8px;border:1px solid var(--border-medium);font-size:13px;background:var(--bg-tertiary);color:var(--text-primary);" />';
                    editHtml += '<label style="font-size:11px;color:var(--text-tertiary);">Traits</label>';
                    editHtml += '<input type="text" id="editTraits" placeholder="e.g. meticulous, strategic" style="padding:6px 10px;border-radius:8px;border:1px solid var(--border-medium);font-size:13px;background:var(--bg-tertiary);color:var(--text-primary);" />';
                    editHtml += '<div style="display:flex;gap:8px;margin-top:4px;">';
                    editHtml += '<button id="saveEditBtn" style="padding:6px 16px;border-radius:8px;border:none;background:var(--exec-blue);color:#fff;font-size:12px;font-weight:500;cursor:pointer;">Save</button>';
                    editHtml += '<button id="cancelEditBtn" style="padding:6px 16px;border-radius:8px;border:1px solid var(--border-medium);background:transparent;color:var(--text-secondary);font-size:12px;cursor:pointer;">Cancel</button>';
                    editHtml += '</div></div>';
                    
                    soulEl.innerHTML = editHtml;
                    editBtn.style.display = 'none';
                    
                    document.getElementById('cancelEditBtn').addEventListener('click', function() {
                        openDetailPanel(agentId);
                    });
                    
                    document.getElementById('saveEditBtn').addEventListener('click', async function() {
                        var name = document.getElementById('editName').value.trim();
                        var role = document.getElementById('editRole').value.trim();
                        var traits = document.getElementById('editTraits').value.trim();
                        var result = await API.saveAgentSoul(agentId, { name: name, role: role, traits: traits });
                        if (result && result.success) {
                            showToast('✅ Agent updated');
                            openDetailPanel(agentId);
                        } else {
                            showToast('⚠️ Failed to save: ' + (result.error || 'unknown'));
                        }
                    });
                });
            }

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

        // Expose globally so mission-desk.js can call it directly
        window.openDetailPanel = openDetailPanel;
        window.closeDetailPanel = closeDetailPanel;

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
           Meeting Panel — Open / Close
           ═══════════════════════════════════════════════ */

        /* ── Brainstorm helpers ─────────────────────── */
        var _brainstormCompleted = null; // stores last completed brainstorm result
        var _brainstormHistory = JSON.parse(localStorage.getItem('spawnkit-brainstorm-history') || '[]');
        function saveBrainstormToHistory(result) {
            if (!result || !result.answer) return;
            _brainstormHistory.unshift(result);
            if (_brainstormHistory.length > 20) _brainstormHistory = _brainstormHistory.slice(0, 20);
            localStorage.setItem('spawnkit-brainstorm-history', JSON.stringify(_brainstormHistory));
        }

        function buildBrainstormEmptyState() {
            return '<div class="brainstorm-empty" style="text-align:left;">' +
                '<div style="text-align:center;margin-bottom:16px;">' +
                '<div class="brainstorm-empty-icon">🧠</div>' +
                '<div class="brainstorm-empty-title">Brainstorm Room</div>' +
                '<div class="brainstorm-empty-desc" style="max-width:500px;margin:0 auto;">Your AI team debates ideas together. The CEO orchestrates, specialists research, verify, and challenge — so you get better answers.</div>' +
                '</div>' +
                '<div style="background:var(--bg-primary,#fff);border:1px solid var(--border-subtle);border-radius:14px;padding:20px;margin-bottom:16px;width:100%;box-sizing:border-box;">' +
                '<div style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;">What should your team work on?</div>' +
                '<textarea class="brainstorm-input" id="inlineBrainstormInput" rows="3" placeholder="e.g. What is the best stablecoin strategy for 2025?" style="width:100%;box-sizing:border-box;"></textarea>' +
                '<div style="display:flex;align-items:center;gap:8px;margin-top:8px;">' +
                '<label for="brainstormFileInput" style="display:flex;align-items:center;gap:4px;padding:4px 10px;border-radius:8px;border:1px solid var(--border-medium);background:var(--bg-tertiary);font-size:11px;color:var(--text-secondary);cursor:pointer;transition:all 0.15s;">📎 Attach file</label>' +
                '<input type="file" id="brainstormFileInput" style="display:none;" accept=".txt,.md,.json,.csv,.pdf,.js,.py,.html,.css" />' +
                '<span id="brainstormFileName" style="font-size:11px;color:var(--text-tertiary);"></span>' +
                '</div>' +
                '<div style="display:flex;gap:12px;margin-top:12px;align-items:center;flex-wrap:wrap;">' +
                '<div style="font-size:12px;font-weight:600;color:var(--text-tertiary);">Complexity:</div>' +
                '<div style="display:flex;gap:6px;">' +
                '<button class="complexity-option active" data-value="quick" style="padding:6px 14px;border-radius:8px;border:1px solid var(--exec-blue);background:var(--exec-blue);color:white;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">⚡ Quick</button>' +
                '<button class="complexity-option" data-value="deep" style="padding:6px 14px;border-radius:8px;border:1px solid var(--border-medium);background:transparent;color:var(--text-secondary);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">🔍 Deep</button>' +
                '<button class="complexity-option" data-value="thorough" style="padding:6px 14px;border-radius:8px;border:1px solid var(--border-medium);background:transparent;color:var(--text-secondary);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">🔬 Thorough</button>' +
                '</div>' +
                '</div>' +
                '<div style="display:flex;gap:8px;margin-top:16px;">' +
                '<button class="brainstorm-btn-primary" id="btnInlineBrainstorm" style="flex:1;">Start Brainstorm →</button>' +
                '</div>' +
                '</div>' +
                '<div style="text-align:center;padding:10px;border-radius:10px;background:rgba(0,122,255,0.04);font-size:12px;color:var(--text-tertiary);line-height:1.6;">' +
                '<strong>How it works:</strong><br>' +
                '📡 Echo researches → 🔬 Forge verifies → 😈 Sentinel challenges → 🎯 CEO synthesizes' +
                '</div>' +
                '</div>';
        }

        function buildBrainstormActiveState(subagents) {
            var agentDefs = [
                { key: 'echo',     emoji: '📡', name: 'Echo' },
                { key: 'forge',    emoji: '🔬', name: 'Forge' },
                { key: 'sentinel', emoji: '😈', name: 'Sentinel' },
                { key: 'ceo',      emoji: '🎯', name: 'CEO' }
            ];
            var total = subagents.length;
            var phaseNum = 1;
            var phaseName = 'Research';
            var progressPct = 25;

            var cards = agentDefs.map(function(a) {
                var match = subagents.find(function(s) {
                    return (s.parentAgent || '').toLowerCase() === a.key || (s.label || '').toLowerCase().indexOf(a.key) !== -1;
                });
                var isActive = !!match;
                var status = isActive ? 'Working…' : 'Waiting';
                return '<div class="brainstorm-agent-card' + (isActive ? ' active' : '') + '">' +
                    '<div class="brainstorm-agent-avatar">' + a.emoji + '</div>' +
                    '<div class="brainstorm-agent-name">' + a.name + '</div>' +
                    '<div class="brainstorm-agent-status">' + status + '</div>' +
                    '</div>';
            }).join('');

            return '<div class="brainstorm-active">' +
                '<div class="brainstorm-active-header">' +
                '<div class="brainstorm-active-title">🧠 Brainstorm in Progress</div>' +
                '<div class="brainstorm-active-topic">' + total + ' agent' + (total !== 1 ? 's' : '') + ' working</div>' +
                '</div>' +
                '<div class="brainstorm-flow">' + cards + '</div>' +
                '<div class="brainstorm-phase">Phase: ' + phaseNum + '/4 — ' + phaseName + '</div>' +
                '<div>' +
                '<div class="brainstorm-progress"><div class="brainstorm-progress-bar" style="width:' + progressPct + '%"></div></div>' +
                '<div class="brainstorm-progress-label">' + progressPct + '%</div>' +
                '</div>' +
                '</div>';
        }

        function buildBrainstormCompleteState(result) {
            result = result || {};
            var html = '<div class="brainstorm-complete">';
            html += '<div style="font-size:24px;text-align:center;margin-bottom:8px;">✅</div>';
            html += '<h3 style="text-align:center;margin:0 0 4px;font-size:15px;font-weight:600;">Brainstorm Complete</h3>';
            if (result.complexity || result.timestamp) {
                html += '<p style="text-align:center;color:var(--text-tertiary);font-size:12px;margin-bottom:16px;">';
                if (result.complexity) html += esc(result.complexity);
                if (result.complexity && result.timestamp) html += ' · ';
                if (result.timestamp) html += new Date(result.timestamp).toLocaleTimeString();
                html += '</p>';
            }
            if (result.question) {
                html += '<div style="background:var(--bg-tertiary,#f5f5f5);border-radius:10px;padding:12px;margin-bottom:12px;">';
                html += '<div style="font-size:11px;color:var(--text-tertiary,#888);margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em;">Question</div>';
                html += '<div style="font-size:13px;font-weight:500;">' + esc(result.question) + '</div>';
                html += '</div>';
            }
            if (result.answer) {
                html += '<div style="background:white;border:1px solid var(--exec-gray-200,#e5e7eb);border-radius:10px;padding:16px;margin-bottom:16px;font-size:13px;line-height:1.6;max-height:400px;overflow-y:auto;">';
                html += typeof renderMarkdown === 'function' ? renderMarkdown(result.answer) : '<pre style="white-space:pre-wrap;font-family:inherit;margin:0;">' + esc(result.answer) + '</pre>';
                html += '</div>';
            }
            html += '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">';
            html += '<button class="brainstorm-btn-secondary" id="btnBrainstormFollowUp" style="background:var(--exec-blue);color:white;border:none;font-weight:600;">💬 Follow Up</button>';
            html += '<button class="brainstorm-btn-secondary" id="btnBrainstormSave" style="border-color:var(--exec-blue);color:var(--exec-blue);font-weight:600;">📌 Save</button>';
            html += '<button class="brainstorm-btn-primary" id="btnNewTopic">New Topic</button>';
            html += '<button class="brainstorm-btn-secondary" id="btnCloseBrainstorm">Close</button>';
            html += '</div>';
            html += '</div>';
            return html;
        }

        function openBrainstormModal() {
            var existing = document.getElementById('brainstormModalOverlay');
            if (existing) existing.remove();

            var overlay = document.createElement('div');
            overlay.className = 'brainstorm-modal-overlay';
            overlay.id = 'brainstormModalOverlay';
            overlay.innerHTML =
                '<div class="brainstorm-modal-backdrop" id="brainstormModalBackdrop"></div>' +
                '<div class="brainstorm-modal">' +
                '<div class="brainstorm-modal-title">🧠 Start a Brainstorm</div>' +
                '<div>' +
                '<div class="brainstorm-modal-label">What should your team work on?</div>' +
                '<textarea class="brainstorm-input" id="brainstormQuestion" rows="3" placeholder="e.g. What is the best stablecoin strategy for 2025?"></textarea>' +
                '</div>' +
                '<div>' +
                '<div class="brainstorm-modal-label">Complexity:</div>' +
                '<div class="complexity-selector">' +
                '<button class="complexity-option active" data-complexity="quick">⚡ Quick</button>' +
                '<button class="complexity-option" data-complexity="deep">🔍 Deep</button>' +
                '<button class="complexity-option" data-complexity="thorough">🔬 Thorough</button>' +
                '</div>' +
                '</div>' +
                '<div>' +
                '<div class="brainstorm-modal-label">Team:</div>' +
                '<div class="brainstorm-team">' +
                '<span class="brainstorm-team-member">📡 Echo</span>' +
                '<span class="brainstorm-team-member">🔬 Forge</span>' +
                '<span class="brainstorm-team-member">😈 Sentinel</span>' +
                '</div>' +
                '<div style="font-size:11px;color:var(--text-tertiary);margin-top:4px;">All active by default</div>' +
                '</div>' +
                '<div class="brainstorm-modal-actions">' +
                '<button class="brainstorm-btn-primary" id="btnStartBrainstorm">Start Brainstorm →</button>' +
                '<button class="brainstorm-btn-secondary" id="btnCancelBrainstorm">Cancel</button>' +
                '</div>' +
                '</div>';

            document.body.appendChild(overlay);

            // Complexity selector toggle
            overlay.querySelectorAll('.complexity-option').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    overlay.querySelectorAll('.complexity-option').forEach(function(b) { b.classList.remove('active'); });
                    btn.classList.add('active');
                });
            });

            // Close on backdrop
            document.getElementById('brainstormModalBackdrop').addEventListener('click', function() { overlay.remove(); });

            // Cancel
            document.getElementById('btnCancelBrainstorm').addEventListener('click', function() { overlay.remove(); });

            // Start
            document.getElementById('btnStartBrainstorm').addEventListener('click', function() {
                var question = (document.getElementById('brainstormQuestion') || {}).value || '';
                var activeComplexityBtn = overlay.querySelector('.complexity-option.active');
                var complexity = activeComplexityBtn ? (activeComplexityBtn.dataset.complexity || 'quick') : 'quick';

                if (!question.trim()) {
                    showToast('Please enter a question');
                    return;
                }

                // Close the modal
                overlay.remove();

                // Close the boardroom panel if open (so it reopens fresh after)
                var meetingOverlayEl = document.getElementById('meetingOverlay');
                if (meetingOverlayEl) meetingOverlayEl.classList.remove('open');

                showToast('🧠 Brainstorm started — your team is working on it...');

                skFetch('/api/brainstorm', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ question: question, complexity: complexity })
                })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.ok && data.answer) {
                        _brainstormCompleted = {
                            question: question,
                            answer: data.answer,
                            complexity: complexity,
                            timestamp: new Date().toISOString()
                        };
                        saveBrainstormToHistory(_brainstormCompleted);
                        showToast('✅ Brainstorm complete!');
                        // Auto-open the boardroom to show results
                        setTimeout(function() {
                            var boardroomEl = document.querySelector('[data-room="meeting"]');
                            if (boardroomEl) boardroomEl.click();
                        }, 500);
                    } else {
                        showToast('⚠️ Brainstorm failed: ' + (data.error || 'Unknown error'));
                    }
                })
                .catch(function(err) {
                    showToast('⚠️ Network error: ' + err.message);
                });
            });

            // Focus textarea
            setTimeout(function() {
                var ta = document.getElementById('brainstormQuestion');
                if (ta) ta.focus();
            }, 50);
        }

        function attachBrainstormListeners() {
            var askBtn = document.getElementById('btnAskQuestion');
            if (askBtn) askBtn.addEventListener('click', openBrainstormModal);

            // Inline brainstorm form (no popup)
            var inlineBtn = document.getElementById('btnInlineBrainstorm');
            if (inlineBtn) {
                // Wire complexity toggles
                var panel = inlineBtn.closest('.brainstorm-empty') || document;
                panel.querySelectorAll('.complexity-option').forEach(function(btn) {
                    btn.addEventListener('click', function() {
                        panel.querySelectorAll('.complexity-option').forEach(function(b) {
                            b.classList.remove('active');
                            b.style.background = 'transparent';
                            b.style.borderColor = 'var(--border-medium)';
                            b.style.color = 'var(--text-secondary)';
                        });
                        btn.classList.add('active');
                        btn.style.background = 'var(--exec-blue)';
                        btn.style.borderColor = 'var(--exec-blue)';
                        btn.style.color = 'white';
                    });
                });

                // Wire file input
                var fileInput = document.getElementById('brainstormFileInput');
                var fileNameEl = document.getElementById('brainstormFileName');
                var _brainstormFileContent = '';
                if (fileInput) {
                    fileInput.addEventListener('change', function() {
                        var file = fileInput.files[0];
                        if (!file) { _brainstormFileContent = ''; if (fileNameEl) fileNameEl.textContent = ''; return; }
                        if (file.size > 100000) { showToast('File too large (max 100KB)'); fileInput.value = ''; return; }
                        if (fileNameEl) fileNameEl.textContent = '📄 ' + file.name + ' (' + (file.size / 1024).toFixed(1) + 'KB)';
                        var reader = new FileReader();
                        reader.onload = function(e) { _brainstormFileContent = e.target.result; };
                        reader.readAsText(file);
                    });
                }

                inlineBtn.addEventListener('click', function() {
                    var question = (document.getElementById('inlineBrainstormInput') || {}).value || '';
                    var activeOpt = panel.querySelector('.complexity-option.active');
                    var complexity = activeOpt ? (activeOpt.dataset.value || 'quick') : 'quick';
                    // Append file content as context
                    if (_brainstormFileContent) {
                        question += '\n\n--- ATTACHED FILE ---\n' + _brainstormFileContent.substring(0, 10000);
                    }
                    if (!question.trim()) { showToast('Please enter a question'); return; }
                    showToast('🧠 Brainstorm started — your team is working on it...');
                    // Close the meeting panel so it reopens with result
                    var meetingOverlayEl = document.getElementById('meetingOverlay');
                    if (meetingOverlayEl) meetingOverlayEl.classList.remove('open');
                    skFetch('/api/brainstorm', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ question: question, complexity: complexity })
                    })
                    .then(function(r) { return r.json(); })
                    .then(function(data) {
                        if (data.ok && data.answer) {
                            _brainstormCompleted = { question: question, answer: data.answer, complexity: complexity, timestamp: new Date().toISOString() };
                            saveBrainstormToHistory(_brainstormCompleted);
                            showToast('✅ Brainstorm complete!');
                            setTimeout(function() {
                                var br = document.querySelector('[data-room="meeting"]') || Array.from(document.querySelectorAll('button')).find(function(b) { return b.textContent.includes('Boardroom'); });
                                if (br) br.click();
                            }, 500);
                        } else {
                            showToast('⚠️ ' + (data.error || 'Brainstorm failed'));
                        }
                    })
                    .catch(function(err) { showToast('⚠️ Error: ' + err.message); });
                });
            }

            var missionBtn = document.getElementById('btnStartMission');
            if (missionBtn) missionBtn.addEventListener('click', function() { showToast('Missions are coming soon'); });

            var viewBtn = document.getElementById('btnViewDiscussion');
            if (viewBtn) viewBtn.addEventListener('click', function() { showToast('Full discussion view coming soon'); });

            var newTopicBtn = document.getElementById('btnNewTopic');
            if (newTopicBtn) newTopicBtn.addEventListener('click', function() {
                _brainstormCompleted = null;
                openMeetingPanel();
            });

            // History item clicks — load past brainstorm into view
            document.querySelectorAll('.brainstorm-history-item').forEach(function(item) {
                item.addEventListener('click', function() {
                    var idx = parseInt(item.dataset.bsIdx);
                    if (_brainstormHistory[idx]) {
                        _brainstormCompleted = _brainstormHistory[idx];
                        openMeetingPanel();
                    }
                });
                item.addEventListener('mouseenter', function() { item.style.background = 'var(--exec-gray-200,#e5e7eb)'; });
                item.addEventListener('mouseleave', function() { item.style.background = 'var(--bg-tertiary,#f5f5f5)'; });
            });

            // Follow Up — pre-fill chat with brainstorm context
            var followUpBtn = document.getElementById('btnBrainstormFollowUp');
            if (followUpBtn) followUpBtn.addEventListener('click', function() {
                if (!_brainstormCompleted) return;
                // Close boardroom, open Mission Control with chat pre-filled
                var meetingOverlayEl = document.getElementById('meetingOverlay');
                if (meetingOverlayEl) meetingOverlayEl.classList.remove('open');
                // Try to open Mission Control and pre-fill chat
                var ceoRoom = document.querySelector('[data-agent="ceo"]');
                if (ceoRoom) ceoRoom.click();
                setTimeout(function() {
                    var chatInput = document.getElementById('mcChatInput');
                    if (chatInput) {
                        chatInput.value = 'Regarding the brainstorm on: "' + _brainstormCompleted.question + '"\n\n';
                        chatInput.focus();
                        chatInput.setSelectionRange(chatInput.value.length, chatInput.value.length);
                    }
                }, 800);
                showToast('💬 Chat opened with brainstorm context');
            });

            // Save — store to brainstorm history + show confirmation
            var saveBtn = document.getElementById('btnBrainstormSave');
            if (saveBtn) saveBtn.addEventListener('click', function() {
                if (!_brainstormCompleted) return;
                // Already in history from when it completed, but ensure it's there
                saveBrainstormToHistory(_brainstormCompleted);
                saveBtn.textContent = '✅ Saved!';
                saveBtn.style.background = 'rgba(48,209,88,0.12)';
                saveBtn.style.color = '#30D158';
                saveBtn.style.borderColor = '#30D158';
                setTimeout(function() {
                    saveBtn.textContent = '📌 Save';
                    saveBtn.style.background = '';
                    saveBtn.style.color = 'var(--exec-blue)';
                    saveBtn.style.borderColor = 'var(--exec-blue)';
                }, 2000);
                showToast('📌 Saved to brainstorm history');
            });

            var closeBtn = document.getElementById('btnCloseBrainstorm');
            if (closeBtn) closeBtn.addEventListener('click', function() {
                var meetingOverlayEl = document.getElementById('meetingOverlay');
                if (meetingOverlayEl) meetingOverlayEl.classList.remove('open');
            });
        }

        window.openMeetingPanel = openMeetingPanel;
        async function openMeetingPanel() {
            closeTodoPanel(); // Close TODO panel if open
            closeMailbox();   // Close mailbox if open

            var activeSubagents = [];
            if (API) {
                try {
                    activeSubagents = await API.getActiveSubagents();
                } catch(e) { console.warn('Failed to load active subagents:', e); }
            }

            var content = '';

            // ── Brainstorm section (top) ──────────────────
            content += '<div class="meeting-section">';
            content += '<div class="meeting-section-title">🧠 Brainstorm</div>';

            if (_brainstormCompleted) {
                content += buildBrainstormCompleteState(_brainstormCompleted);
            } else if (activeSubagents && activeSubagents.length > 0) {
                content += buildBrainstormActiveState(activeSubagents);
            } else {
                content += buildBrainstormEmptyState();
            }

            content += '</div>';

            // ── Past Brainstorms ──────────────────────────
            if (_brainstormHistory.length > 0) {
                content += '<div class="meeting-section">';
                content += '<div class="meeting-section-title">📋 Past Sessions (' + _brainstormHistory.length + ')</div>';
                content += '<div style="display:flex;flex-direction:column;gap:6px;">';
                _brainstormHistory.forEach(function(bs, idx) {
                    var ts = bs.timestamp ? new Date(bs.timestamp) : null;
                    var timeStr = ts ? ts.toLocaleDateString('en-GB', {day:'numeric',month:'short'}) + ' ' + ts.toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'}) : '';
                    var preview = (bs.answer || '').replace(/[#*_`\n]/g, ' ').substring(0, 80).trim();
                    content += '<div class="brainstorm-history-item" data-bs-idx="' + idx + '" style="background:var(--bg-tertiary,#f5f5f5);border-radius:10px;padding:12px;cursor:pointer;transition:background 0.15s;">';
                    content += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">';
                    content += '<div style="font-size:13px;font-weight:600;color:var(--text-primary);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(bs.question || 'Untitled') + '</div>';
                    content += '<div style="font-size:11px;color:var(--text-tertiary);margin-left:8px;flex-shrink:0;">' + esc(bs.complexity || '') + '</div>';
                    content += '</div>';
                    content += '<div style="font-size:11px;color:var(--text-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(preview) + '</div>';
                    content += '<div style="font-size:10px;color:var(--text-quaternary,#aaa);margin-top:4px;">' + esc(timeStr) + '</div>';
                    content += '</div>';
                });
                content += '</div>';
                content += '</div>';
            }

            // ── Active Work Sessions (fallback/supplemental) ──
            content += '<div class="meeting-section">';
            content += '<div class="meeting-section-title">Active Work Sessions</div>';
            content += '<div class="meeting-list">';
            
            if (activeSubagents && activeSubagents.length > 0) {
                activeSubagents.forEach(function(sa) {
                    var duration = sa.durationMs ? Math.floor(sa.durationMs / 60000) + 'm' : '—';
                    var parentAvatar = sa.parentAgent || 'main';
                    var avatarMap = { forge: 'avatar-forge', atlas: 'avatar-atlas', hunter: 'avatar-hunter', echo: 'avatar-echo', sentinel: 'avatar-sentinel', main: 'avatar-ceo' };
                    var avatarId = avatarMap[parentAvatar] || 'avatar-ceo';
                    
                    content += '<div class="meeting-item meeting-item--active">';
                    content += '<div class="meeting-item-header">';
                    content += '<div class="meeting-item-title">🔴 ' + (sa.label || 'Sub-agent ' + sa.id) + '</div>';
                    content += '<div class="meeting-item-status">' + duration + '</div>';
                    content += '</div>';
                    content += '<div class="meeting-item-description">Active sub-agent under ' + (sa.parentAgent || 'main') + '</div>';
                    content += '<div class="meeting-participants">';
                    content += '<div class="meeting-participant"><svg><use href="#' + avatarId + '"/></svg></div>';
                    content += '</div>';
                    content += '</div>';
                });
            } else {
                content += '<div class="meeting-item" style="opacity:0.6">';
                content += '<div class="meeting-item-header">';
                content += '<div class="meeting-item-title">💤 No active work sessions</div>';
                content += '</div>';
                content += '<div class="meeting-item-description">All sub-agents have completed their tasks.</div>';
                content += '</div>';
            }

            content += '</div>';
            content += '</div>';

            // Recently completed sessions section (from sessions data)
            content += '<div class="meeting-section">';
            content += '<div class="meeting-section-title">Recent</div>';
            content += '<div class="meeting-list">';
            
            if (API) {
                try {
                    var sessions = await API.getSessions();
                    var completed = (sessions.subagents || []).filter(function(sa) { return sa.status === 'completed'; }).slice(0, 4);
                    if (completed.length > 0) {
                        completed.forEach(function(sa) {
                            content += '<div class="meeting-item">';
                            content += '<div class="meeting-item-header">';
                            content += '<div class="meeting-item-title">✅ ' + (sa.name || sa.label || sa.id) + '</div>';
                            content += '<div class="meeting-item-status">Completed</div>';
                            content += '</div>';
                            content += '<div class="meeting-item-description">' + (sa.task || 'Task completed') + '</div>';
                            content += '</div>';
                        });
                    } else {
                        content += '<div class="meeting-item" style="opacity:0.5">';
                        content += '<div class="meeting-item-description">No recently completed sessions</div>';
                        content += '</div>';
                    }
                } catch(e) {
                    content += '<div class="meeting-item"><div class="meeting-item-description">Could not load session data</div></div>';
                }
            }

            meetingContent.innerHTML = content;
            attachBrainstormListeners();

            // Show panel
            meetingOverlay.classList.add('open');
            meetingClose.focus();
            document.body.style.overflow = 'hidden';
        }

        function closeMeetingPanel() {
            meetingOverlay.classList.remove('open');
            document.body.style.overflow = '';
        }

        meetingBackdrop.addEventListener('click', closeMeetingPanel);
        meetingClose.addEventListener('click', closeMeetingPanel);

        // Close panels on Escape — all overlays
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                if (document.getElementById('chatHistoryOverlay') && document.getElementById('chatHistoryOverlay').classList.contains('open')) {
                    closeChatHistory();
                } else if (document.getElementById('remoteOverlay').classList.contains('open')) {
                    closeRemotePanel();
                } else if (document.getElementById('missionsOverlay').classList.contains('open')) {
                    closeMissionsPanel();
                } else if (document.getElementById('settingsOverlay').classList.contains('open')) {
                    closeSettingsPanel();
                } else if (document.getElementById('chatOverlay').classList.contains('open')) {
                    closeChatPanel();
                } else if (document.getElementById('cronOverlay').classList.contains('open')) {
                    closeCronPanel();
                } else if (document.getElementById('memoryOverlay').classList.contains('open')) {
                    closeMemoryPanel();
                } else if (detailOverlay.classList.contains('open')) {
                    closeDetailPanel();
                } else if (todoOverlay.classList.contains('open')) {
                    closeTodoPanel();
                } else if (meetingOverlay.classList.contains('open')) {
                    closeMeetingPanel();
                } else if (mailboxOverlay.classList.contains('open')) {
                    closeMailbox();
                }
            }
        });

        /* ── Update Mailbox Badge ───────────────────── */
        function updateMailboxBadge() {
            var messagesUnread = LIVE_MESSAGES.filter(function(msg) { return !msg.read; }).length;
            
            // Count unread chat messages (simple heuristic: recent messages in chat history)
            var chatUnread = 0;
            if (chatHistory.length > 0) {
                var recent = chatHistory.slice(-3).filter(function(m) { return m.role === 'ai' && !m.typing; });
                chatUnread = recent.length; // Assume recent AI messages are unread
            }
            
            var totalUnread = messagesUnread + chatUnread;
            var badge = document.getElementById('mailboxBadge');
            if (badge) {
                badge.textContent = totalUnread;
                if (totalUnread === 0) {
                    badge.style.opacity = '0.5';
                } else {
                    badge.style.opacity = '1';
                }
            }
            
            // Update mailbox button aria-label
            if (mailboxBtn) {
                var label = 'Open communications — ' + totalUnread + ' unread message' + (totalUnread === 1 ? '' : 's');
                mailboxBtn.setAttribute('aria-label', label);
            }
        }

        /* ── Load Live Messages — Fleet Relay messages from remote offices ─── */
        async function loadLiveMessages() {
            try {
                var apiUrl = window.OC_API_URL || (window.location.hostname.includes('spawnkit.ai') ? window.location.origin : 'http://127.0.0.1:8222');
                var resp = await skFetch(apiUrl + '/api/remote/offices');
                if (resp.ok) {
                    var data = await resp.json();
                    var recentMessages = data.recentMessages || [];
                    if (recentMessages.length > 0) {
                        LIVE_MESSAGES = recentMessages.map(function(msg, idx) {
                            return {
                                sender: msg.from || msg.sender || msg.office || 'Remote',
                                color: '#007AFF',
                                time: msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('en-US', {
                                    hour: '2-digit', minute: '2-digit', hour12: false
                                }) : 'Now',
                                text: (msg.message || msg.text || msg.content || '').substring(0, 300),
                                read: idx > 1,
                                priority: msg.priority || 'normal'
                            };
                        });
                        renderMessages(LIVE_MESSAGES);
                        return;
                    }
                }
            } catch(e) {
                console.warn('🏢 [Executive] Failed to load fleet relay messages:', e);
            }
            LIVE_MESSAGES = [{ sender: 'Fleet Relay', color: '#636366', time: 'Now', text: 'No inter-office messages yet', read: true }];
            renderMessages(LIVE_MESSAGES);
        }

        /* ── Render Messages ────────────────────────── */
        function renderMessages(messages) {
            mailboxMessages.innerHTML = '';
            messages.forEach(function(msg, i) {
                if (i > 0) {
                    var divider = document.createElement('div');
                    divider.className = 'mail-divider';
                    divider.setAttribute('aria-hidden', 'true');
                    mailboxMessages.appendChild(divider);
                }

                var item = document.createElement('div');
                item.className = 'mail-item' + (msg.read ? ' mail-item--read' : '');
                item.dataset.messageIndex = i;

                // Use SVG avatar if available, else fallback to letter
                var avatarId = AVATAR_MAP[msg.sender];
                var avatarContent;
                if (avatarId) {
                    avatarContent = '<svg><use href="#' + avatarId + '"/></svg>';
                } else {
                    avatarContent = (msg.sender || '?').charAt(0);
                }

                var unreadIndicator = msg.read ? '' : '<div class="mail-unread-dot" aria-hidden="true"></div>';

                // Priority flag
                var priorityFlag = '';
                var pri = msg.priority || 'normal';
                if (pri === 'urgent') priorityFlag = '<span class="mail-flag mail-flag--urgent">🔴 Urgent</span>';
                else if (pri === 'info') priorityFlag = '<span class="mail-flag mail-flag--info">🟢 Info</span>';
                else priorityFlag = '<span class="mail-flag mail-flag--normal">🟡 Normal</span>';

                // Dispatch indicator
                var dispatchHtml = '';
                if (msg.assignedTo) {
                    dispatchHtml = '<div class="mail-dispatch"><span>📨</span> <span class="mail-dispatch-arrow">→</span> <strong>' + esc(msg.assignedTo) + '</strong></div>';
                }

                item.innerHTML =
                    '<div class="mail-avatar" style="background: ' + esc(msg.color) + ';" aria-hidden="true">' + avatarContent + '</div>' +
                    '<div class="mail-content">' +
                        '<div class="mail-header">' +
                            '<span class="mail-sender">' + esc(msg.sender) + '</span>' +
                            '<span class="mail-time">' + esc(msg.time) + '</span>' +
                        '</div>' +
                        '<div class="mail-preview">' + esc(msg.text) + '</div>' +
                        '<div class="mail-flags">' + priorityFlag + '</div>' +
                        dispatchHtml +
                    '</div>' + unreadIndicator;

                // Click to mark as read
                item.addEventListener('click', function() {
                    if (!msg.read) {
                        msg.read = true;
                        item.classList.add('mail-item--read');
                        var dot = item.querySelector('.mail-unread-dot');
                        if (dot) dot.remove();
                        updateMailboxBadge();
                    }
                });

                mailboxMessages.appendChild(item);
            });
            
            updateMailboxBadge();
        }

        // Load live data
        loadLiveMessages();
        loadLiveAgentData();

        /* ═══════════════════════════════════════════════
           Agent Room — Click to Show TODO Panel
           ═══════════════════════════════════════════════ */

        var expandedRoom = null;

        // Handle agent room clicks in both grid and hierarchy views
        document.addEventListener('click', function(e) {
            var agentElement = e.target.closest('[data-agent]');
            if (agentElement) {
                // Don't toggle if clicking mailbox button
                if (e.target.closest('.ceo-mailbox')) return;

                var agentId = agentElement.dataset.agent;
                openTodoPanel(agentId);
                return;
            }

            // Handle meeting room clicks
            var meetingElement = e.target.closest('[data-room="meeting"]');
            if (meetingElement) {
                openMeetingPanel();
                return;
            }

            // Handle detail expansion (legacy behavior for non-agent elements)
            var room = e.target.closest('.exec-room[data-agent]');
            if (room && !e.target.closest('.ceo-mailbox')) {
                var agentId = room.dataset.agent;
                var detail = document.getElementById('detail-' + agentId);
                if (detail) {
                    if (expandedRoom && expandedRoom !== detail) {
                        expandedRoom.classList.remove('visible');
                    }
                    detail.classList.toggle('visible');
                    expandedRoom = detail.classList.contains('visible') ? detail : null;
                }
            }

            // Close detail when clicking outside
            if (!room && expandedRoom) {
                expandedRoom.classList.remove('visible');
                expandedRoom = null;
            }
        });

        // Keyboard: Enter/Space to open TODO panel
        document.querySelectorAll('[data-agent]').forEach(function(element) {
            element.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    var agentId = element.dataset.agent;
                    openTodoPanel(agentId);
                }
            });
        });

        // Keyboard: Enter/Space to open Meeting panel
        document.querySelectorAll('[data-room="meeting"]').forEach(function(element) {
            element.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openMeetingPanel();
                }
            });
        });

        /* ═══════════════════════════════════════════════
           Command Input — Enter to send via postMessage
           ═══════════════════════════════════════════════ */

        commandInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && commandInput.value.trim()) {
                var cmd = commandInput.value.trim();
                commandInput.value = '';
                // Open mailbox to chat tab and send as mission
                openMailbox('chat');
                chatTabInput.value = cmd;
                sendChatTabMessage();
            }
        });

        /* ═══════════════════════════════════════════════
           postMessage Bridge — Communication with Parent
           ═══════════════════════════════════════════════ */

        window.addEventListener('message', function(e) {
            if (!e.data || typeof e.data !== 'object') return;
            var isSameOrigin = (e.origin === window.location.origin || e.origin === 'null');
            if (!isSameOrigin) return;

            switch (e.data.type) {
                case 'spawnkit:data':
                    handleDataUpdate(e.data.payload);
                    break;

                case 'spawnkit:agents':
                    handleAgentsUpdate(e.data.agents);
                    break;

                case 'spawnkit:messages':
                    handleMessagesUpdate(e.data.messages);
                    break;

                case 'spawnkit:theme':
                    handleThemeChange(e.data.theme);
                    break;

                case 'spawnkit:ping':
                    if (window.parent !== window) {
                        window.parent.postMessage({
                            type: 'executive:pong',
                            theme: 'executive',
                            timestamp: Date.now()
                        }, '*');
                    }
                    break;
            }
        });

        /* ── Data Update Handlers ───────────────────── */

        function handleDataUpdate(payload) {
            if (!payload) return;

            if (payload.agents) {
                handleAgentsUpdate(payload.agents);
            }

            if (payload.agents) {
                var count = payload.agents.length;
                document.getElementById('statusAgentCount').textContent = count + ' Agent' + (count !== 1 ? 's' : '');
            }
        }

        function handleAgentsUpdate(agents) {
            if (!agents || !Array.isArray(agents)) return;

            // Update inactive room states based on which agents are real
            if (typeof updateActiveAgentsFromData === 'function') {
                updateActiveAgentsFromData(agents);
            }

            agents.forEach(function(agent) {
                if (!agent || !agent.name) return;
                var id = agent.name.toLowerCase();

                // Update in both grid and hierarchy views
                document.querySelectorAll('[data-agent="' + id + '"]').forEach(function(el) {
                    var dot = el.querySelector('.agent-status-dot');
                    if (dot && agent.status) {
                        dot.className = 'agent-status-dot';
                        var statusMap = { active: 'active', working: 'active', building: 'busy', idle: 'idle', error: 'idle' };
                        dot.classList.add('agent-status-dot--' + (statusMap[agent.status] || 'idle'));
                    }
                    
                    // Update agent name to show Agent OS format if available
                    var nameEl = el.querySelector('.agent-name');
                    if (nameEl && agent.role && window.AgentOSNaming) {
                        // Try to construct Agent OS name format for main agents
                        var parentMap = { Hunter: 'Hunter', Forge: 'Forge', Echo: 'Echo', Atlas: 'Atlas', Sentinel: 'Sentinel', Sycopa: 'Main' };
                        var parent = parentMap[agent.name] || agent.name;
                        var roleMap = { CTO: 'CodeBuilder', CRO: 'Researcher', CMO: 'ContentCreator', COO: 'OpsRunner', CEO: 'Coordinator', 'QA & Security': 'Auditor' };
                        var role = roleMap[agent.role] || 'TaskRunner';
                        var agentOSName = parent + '.' + role + '-01';
                        nameEl.textContent = agentOSName;
                        
                        // Add model badge if available
                        if (agent.model && window.ModelIdentity) {
                            var modelIdentity = window.ModelIdentity.getIdentity(agent.model);
                            var badge = el.querySelector('.model-badge') || document.createElement('span');
                            badge.className = 'model-badge';
                            badge.textContent = modelIdentity.level;
                            badge.style.color = modelIdentity.color;
                            badge.style.marginLeft = '6px';
                            badge.style.fontSize = '10px';
                            badge.style.fontWeight = '600';
                            if (!el.querySelector('.model-badge')) {
                                nameEl.appendChild(badge);
                            }
                        }
                    }
                });

                // Update detail if exists
                var detail = document.getElementById('detail-' + id);
                if (detail && agent.currentTask) {
                    var taskEl = detail.querySelectorAll('.agent-detail-value')[1];
                    if (taskEl) taskEl.textContent = agent.currentTask;
                }
            });
        }

        function handleMessagesUpdate(messages) {
            if (!messages || !Array.isArray(messages)) return;
            renderMessages(messages);
            var badge = document.getElementById('mailboxBadge');
            if (badge) {
                badge.textContent = messages.length;
            }
        }

        function handleThemeChange(theme) {
            // Could apply light/dark mode in future
        }

        /* ═══════════════════════════════════════════════
           Inactive Room State — Honest Mode
           ═══════════════════════════════════════════════ */

        // Set of agent IDs that are real (activated) — populated from SpawnKit data
        var _storedActive = [];
        try { _storedActive = JSON.parse(localStorage.getItem('spawnkit-active-agents') || '[]'); } catch(e) {}
        var ACTIVE_AGENT_IDS = new Set(['ceo'].concat(_storedActive)); // CEO always active + persisted

        // Map SpawnKit agent names to room IDs
        var AGENT_NAME_TO_ID = {
            'main': 'ceo', 'sycopa': 'ceo',
            'atlas': 'atlas', 'forge': 'forge', 'hunter': 'hunter',
            'echo': 'echo', 'sentinel': 'sentinel'
        };

        // Role descriptions for the modal
        var AGENT_ROLE_DESC = {
            atlas:    'COO — Operations & Workflows',
            forge:    'CTO — Engineering & Architecture',
            hunter:   'CRO — Revenue & Growth',
            echo:     'CMO — Brand & Content',
            sentinel: 'QA & Security — Audit & Review'
        };

        function applyInactiveRoomStates() {
            var NON_CEO_AGENTS = ['atlas', 'forge', 'hunter', 'echo', 'sentinel'];
            NON_CEO_AGENTS.forEach(function(id) {
                var roomEl = document.querySelector('.exec-room[data-agent="' + id + '"]');
                if (!roomEl) return;
                if (ACTIVE_AGENT_IDS.has(id)) {
                    // Room is active — remove inactive state if previously set
                    roomEl.classList.remove('room-inactive');
                    var overlay = roomEl.querySelector('.room-inactive-overlay');
                    if (overlay) overlay.remove();
                } else {
                    // Room is inactive — apply greyed state
                    if (!roomEl.classList.contains('room-inactive')) {
                        roomEl.classList.add('room-inactive');
                        var overlay = document.createElement('div');
                        overlay.className = 'room-inactive-overlay';
                        overlay.innerHTML = '🔒 Not yet activated';
                        roomEl.appendChild(overlay);
                    }
                }
            });
        }

        function updateActiveAgentsFromData(agents) {
            if (!agents || !Array.isArray(agents)) return;
            ACTIVE_AGENT_IDS = new Set(['ceo']); // always keep CEO
            agents.forEach(function(agent) {
                if (!agent || !agent.name) return;
                var name = agent.name.toLowerCase();
                var id = AGENT_NAME_TO_ID[name] || name;
                ACTIVE_AGENT_IDS.add(id);
            });
            applyInactiveRoomStates();
        }

        // ── Activate Agent Modal — Skill Picker ──────────────────────

        // Inline skills data (essential fields only, no systemPrompt)
        var SPAWNKIT_SKILLS = [
            { id: 'legal-counsel',       name: 'Legal Counsel',       icon: '⚖️',  description: 'Contract review, IP protection, regulatory analysis, legal research, and risk identification', agentRole: 'atlas', tags: ['legal','compliance','contracts','IP','regulation','risk'], composesWellWith: ['compliance-officer','strategy-advisor','auditor'] },
            { id: 'finance-analyst',     name: 'Financial Analyst',   icon: '📊',  description: 'Financial modeling, valuation, market analysis, investment memos, and reporting', agentRole: 'atlas', tags: ['finance','modeling','valuation','markets','reporting','investment'], composesWellWith: ['compliance-officer','strategy-advisor','auditor','data-analyst'] },
            { id: 'compliance-officer',  name: 'Compliance Officer',  icon: '🛡️', description: 'Regulatory compliance, audit preparation, policy review, KYC/AML, and risk frameworks', agentRole: 'atlas', tags: ['compliance','regulatory','audit','KYC','AML','GDPR','SOC2','policy'], composesWellWith: ['legal-counsel','auditor','security-specialist','finance-analyst'] },
            { id: 'product-manager',     name: 'Product Manager',     icon: '🗺️', description: 'PRDs, user stories, roadmap planning, feature prioritization, and product strategy', agentRole: 'ceo',   tags: ['product','PRD','roadmap','user-stories','prioritization','strategy'], composesWellWith: ['ux-designer','engineering-lead','data-analyst','strategy-advisor'] },
            { id: 'ux-designer',         name: 'UX Designer',         icon: '🎨',  description: 'Wireframes, user flows, heuristic evaluation, accessibility audits, and design systems', agentRole: 'cto',   tags: ['UX','design','wireframes','user-flows','accessibility','usability'], composesWellWith: ['product-manager','engineering-lead','game-designer'] },
            { id: 'game-designer',       name: 'Game Designer',       icon: '🎮',  description: 'Game mechanics, level design, balance tuning, progression systems, and narrative design', agentRole: 'cto',   tags: ['games','mechanics','level-design','balance','progression','narrative'], composesWellWith: ['ux-designer','writer','data-analyst'] },
            { id: 'engineering-lead',    name: 'Engineering Lead',    icon: '⚙️',  description: 'Code review, architecture design, debugging, technical documentation, and engineering process', agentRole: 'cto',   tags: ['engineering','code-review','architecture','debugging','documentation','systems'], composesWellWith: ['security-specialist','data-analyst','product-manager'] },
            { id: 'data-analyst',        name: 'Data Analyst',        icon: '📈',  description: 'SQL queries, dashboards, statistical analysis, data visualization, and insight generation', agentRole: 'atlas', tags: ['data','SQL','analytics','dashboards','statistics','visualization'], composesWellWith: ['finance-analyst','product-manager','marketing-specialist','strategy-advisor'] },
            { id: 'marketing-specialist',name: 'Marketing Specialist',icon: '📣',  description: 'Content strategy, SEO, campaign planning, copywriting, brand positioning, and growth', agentRole: 'cmo',   tags: ['marketing','content','SEO','campaigns','copywriting','growth','brand'], composesWellWith: ['sales-specialist','data-analyst','writer','strategy-advisor'] },
            { id: 'sales-specialist',    name: 'Sales Specialist',    icon: '💼',  description: 'Outreach sequences, pitch decks, CRM management, lead qualification, and deal strategy', agentRole: 'cro',   tags: ['sales','outreach','pitch','CRM','prospecting','negotiation','revenue'], composesWellWith: ['marketing-specialist','strategy-advisor','finance-analyst'] },
            { id: 'hr-specialist',       name: 'HR Specialist',       icon: '👥',  description: 'Job descriptions, interview frameworks, policy writing, onboarding, and people operations', agentRole: 'coo',   tags: ['HR','recruiting','people-ops','policies','culture','onboarding'], composesWellWith: ['legal-counsel','compliance-officer','strategy-advisor'] },
            { id: 'security-specialist', name: 'Security Specialist', icon: '🔐',  description: 'Threat modeling, penetration testing planning, security audits, and incident response', agentRole: 'cto',   tags: ['security','threat-modeling','pentesting','audit','incident-response','OWASP'], composesWellWith: ['engineering-lead','compliance-officer','auditor'] },
            { id: 'research-analyst',    name: 'Research Analyst',    icon: '🔍',  description: 'Literature review, competitive analysis, market research, synthesis, and evidence-based recommendations', agentRole: 'atlas', tags: ['research','analysis','competitive-intel','market-research','synthesis'], composesWellWith: ['strategy-advisor','finance-analyst','data-analyst','marketing-specialist'] },
            { id: 'operations-manager',  name: 'Operations Manager',  icon: '⚡',  description: 'Process optimization, SOP creation, vendor management, operational efficiency, and scaling', agentRole: 'coo',   tags: ['operations','process','SOP','vendor-management','efficiency','scaling'], composesWellWith: ['finance-analyst','hr-specialist','compliance-officer','data-analyst'] },
            { id: 'auditor',             name: 'Auditor',             icon: '🔎',  description: 'Financial audit, process audit, compliance audit, risk assessment, and controls testing', agentRole: 'atlas', tags: ['audit','financial-audit','controls','risk-assessment','internal-audit'], composesWellWith: ['compliance-officer','finance-analyst','legal-counsel','security-specialist'] },
            { id: 'writer',              name: 'Professional Writer', icon: '✍️',  description: 'Technical writing, blog posts, documentation, editing, ghostwriting, and content production', agentRole: 'atlas', tags: ['writing','technical-writing','documentation','editing','content','ghostwriting'], composesWellWith: ['marketing-specialist','product-manager','research-analyst'] },
            { id: 'strategy-advisor',    name: 'Strategy Advisor',    icon: '🧭',  description: 'Business strategy, competitive analysis, M&A assessment, market entry, and strategic planning', agentRole: 'ceo',   tags: ['strategy','competitive-analysis','M&A','market-entry','planning','OKRs'], composesWellWith: ['finance-analyst','research-analyst','sales-specialist','marketing-specialist'] }
        ];

        // Agent-to-role mapping for recommended skills
        var AGENT_ROLE_MAP = {
            atlas:    'coo',
            forge:    'cto',
            hunter:   'cro',
            echo:     'cmo',
            sentinel: 'qa'
        };

        // Recommended skill IDs per agent
        var AGENT_RECOMMENDED_SKILLS = {
            atlas:    ['operations-manager', 'hr-specialist'],
            forge:    ['engineering-lead', 'ux-designer'],
            hunter:   ['sales-specialist', 'strategy-advisor'],
            echo:     ['marketing-specialist', 'writer'],
            sentinel: ['security-specialist', 'compliance-officer']
        };

        var activateModalAgentId = null;
        var activateSelectedSkills = []; // array of skill IDs

        function openActivateModal(agentId) {
            var agent = AGENTS[agentId];
            if (!agent) return;
            activateModalAgentId = agentId;
            activateSelectedSkills = [];

            // Pre-select recommended skills
            var recommended = AGENT_RECOMMENDED_SKILLS[agentId] || [];
            activateSelectedSkills = recommended.slice(0, 3);

            // Reset to step 1
            document.getElementById('activateStep1').classList.add('active');
            document.getElementById('activateStep2').classList.remove('active');

            // Set title
            var roleLabel = AGENT_ROLE_DESC[agentId] || agent.role;
            var roleName = roleLabel.split('—')[0].trim(); // e.g. "COO"
            var agentEmojis = { atlas: '🛡️', forge: '🔧', hunter: '🎯', echo: '📣', sentinel: '🔍' };
            var emoji = agentEmojis[agentId] || '';
            document.getElementById('activateModalTitle').textContent =
                emoji + ' Activate ' + agent.name + ' as ' + roleName;

            // Build recommended chips
            var recChips = document.getElementById('activateRecommendedChips');
            var recSection = document.getElementById('activateRecommendedSection');
            recChips.innerHTML = '';
            if (recommended.length > 0) {
                recSection.style.display = '';
                recommended.forEach(function(skillId) {
                    var skill = SPAWNKIT_SKILLS.find(function(s) { return s.id === skillId; });
                    if (skill) recChips.appendChild(makeSkillChip(skill, true));
                });
            } else {
                recSection.style.display = 'none';
            }

            // Build all-skills chips (excluding recommended)
            var allChips = document.getElementById('activateAllChips');
            allChips.innerHTML = '';
            SPAWNKIT_SKILLS.forEach(function(skill) {
                if (recommended.indexOf(skill.id) === -1) {
                    var isSelected = activateSelectedSkills.indexOf(skill.id) !== -1;
                    allChips.appendChild(makeSkillChip(skill, isSelected));
                }
            });

            updateSkillCounter();
            document.getElementById('activateAgentModal').classList.add('open');
        }

        function makeSkillChip(skill, selected) {
            var btn = document.createElement('button');
            btn.className = 'skill-chip' + (selected ? ' selected' : '');
            btn.dataset.skillId = skill.id;
            btn.title = skill.description;
            btn.innerHTML = '<span class="chip-icon">' + skill.icon + '</span>' +
                            '<span class="chip-name">' + skill.name + '</span>' +
                            '<span class="chip-check">✓</span>';
            btn.addEventListener('click', function() {
                toggleSkill(skill.id);
            });
            return btn;
        }

        function toggleSkill(skillId) {
            var idx = activateSelectedSkills.indexOf(skillId);
            if (idx !== -1) {
                // Deselect
                activateSelectedSkills.splice(idx, 1);
            } else {
                // Select — max 3
                if (activateSelectedSkills.length >= 3) return;
                activateSelectedSkills.push(skillId);
            }
            refreshChipStates();
            updateSkillCounter();
        }

        function refreshChipStates() {
            var maxReached = activateSelectedSkills.length >= 3;
            var allButtons = document.querySelectorAll('#activateAgentModal .skill-chip');
            allButtons.forEach(function(btn) {
                var id = btn.dataset.skillId;
                var sel = activateSelectedSkills.indexOf(id) !== -1;
                btn.classList.toggle('selected', sel);
                btn.classList.toggle('disabled', !sel && maxReached);
            });
        }

        function updateSkillCounter() {
            var countEl = document.getElementById('activateSelectedCount');
            if (countEl) countEl.textContent = activateSelectedSkills.length;
        }

        function closeActivateModal() {
            document.getElementById('activateAgentModal').classList.remove('open');
            activateModalAgentId = null;
            activateSelectedSkills = [];
        }

        function doActivateAgent() {
            var agentId = activateModalAgentId;
            var agent = agentId ? AGENTS[agentId] : null;
            if (!agent) return;

            // Spawn a session via API
            var agentName = agent.name;
            var apiUrl = window.OC_API_URL || (window.location.hostname.includes('spawnkit.ai') ? window.location.origin : 'http://127.0.0.1:8222');
            skFetch(apiUrl + '/api/oc/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Activate agent: ' + agentName })
            }).then(function(r) { return r.json(); }).then(function(data) {
                if (data && (data.ok || data.reply)) {
                    showToast('✅ ' + agentName + ' session started');
                }
            }).catch(function(e) { console.warn('[Activate] spawn failed:', e); });

            // Add to active set, persist, and refresh rooms
            ACTIVE_AGENT_IDS.add(agentId);
            try { localStorage.setItem('spawnkit-active-agents', JSON.stringify(Array.from(ACTIVE_AGENT_IDS).filter(function(x){return x!=='ceo';}))); } catch(e) {}
            applyInactiveRoomStates();

            // Build confirmation step
            var roleLabel = AGENT_ROLE_DESC[agentId] || agent.role;
            var roleName = roleLabel.split('—')[0].trim();

            document.getElementById('activateConfirmTitle').textContent = agent.name + ' Activated!';

            var skillsList = document.getElementById('activateConfirmSkillsList');
            skillsList.innerHTML = '';
            var selectedSkillObjs = activateSelectedSkills.map(function(id) {
                return SPAWNKIT_SKILLS.find(function(s) { return s.id === id; });
            }).filter(Boolean);

            if (selectedSkillObjs.length === 0) {
                var li = document.createElement('li');
                li.textContent = 'No specific skills — general ' + roleName + ' assistant';
                skillsList.appendChild(li);
            } else {
                selectedSkillObjs.forEach(function(skill) {
                    var li = document.createElement('li');
                    li.innerHTML = '<span>' + skill.icon + '</span><span>' + skill.name + '</span>';
                    skillsList.appendChild(li);
                });
            }

            // Build short capabilities summary
            var capsSummary = selectedSkillObjs.map(function(s) {
                return s.description.split(',')[0].toLowerCase();
            }).join(', ');
            var descEl = document.getElementById('activateConfirmDesc');
            if (capsSummary) {
                descEl.textContent = agent.name + ' is ready to help with ' + capsSummary + ', and more.';
            } else {
                descEl.textContent = agent.name + ' is now active as your ' + roleName + '.';
            }

            // Switch to step 2
            document.getElementById('activateStep1').classList.remove('active');
            document.getElementById('activateStep2').classList.add('active');
        }

        document.addEventListener('DOMContentLoaded', function() {
            var backdrop = document.getElementById('activateModalBackdrop');
            var later    = document.getElementById('activateModalLater');
            var confirm  = document.getElementById('activateModalConfirm');
            var closeBtn = document.getElementById('activateModalClose');
            var startConvo = document.getElementById('activateStartConvo');

            if (backdrop)   backdrop.addEventListener('click', closeActivateModal);
            if (later)      later.addEventListener('click', closeActivateModal);
            if (confirm)    confirm.addEventListener('click', doActivateAgent);
            if (closeBtn)   closeBtn.addEventListener('click', closeActivateModal);
            if (startConvo) startConvo.addEventListener('click', function() {
                var agentId = activateModalAgentId;
                var agent = agentId ? AGENTS[agentId] : null;
                closeActivateModal();
                // Open the chat panel with this agent's target
                openMailbox('chat');
                setTimeout(function() {
                    // Set the chat target to this agent if available
                    var select = document.getElementById('chatTargetSelect');
                    if (select && agent) {
                        // Try to find a matching target or add it temporarily
                        var agentTargetId = 'agent-' + agentId;
                        var exists = Array.from(select.options).some(function(o) { return o.value === agentTargetId; });
                        if (!exists) {
                            var opt = document.createElement('option');
                            opt.value = agentTargetId;
                            opt.textContent = (agent.name || agentId);
                            select.appendChild(opt);
                        }
                        select.value = agentTargetId;
                        currentChatTarget = agentTargetId;
                    }
                    // Focus the input
                    var input = document.getElementById('chatTabInput');
                    if (input) input.focus();
                }, 200);
            });
        });

        // ── Override openTodoPanel — always open detail panel, show activate CTA if inactive ──
        var _originalOpenTodoPanel = openTodoPanel;
        openTodoPanel = function(agentId) {
            // Always open the detail panel — even for inactive agents
            _originalOpenTodoPanel(agentId);
            // If agent is not activated, add an activate CTA inside the detail panel
            if (agentId !== 'ceo' && !ACTIVE_AGENT_IDS.has(agentId)) {
                setTimeout(function() {
                    var body = document.getElementById('detailBody');
                    if (body && !body.querySelector('.detail-activate-cta')) {
                        var cta = document.createElement('div');
                        cta.className = 'detail-activate-cta detail-section';
                        cta.innerHTML = '<div style="text-align:center;padding:16px 0;">' +
                            '<div style="font-size:32px;margin-bottom:8px;">🔒</div>' +
                            '<div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:4px;">Not Yet Activated</div>' +
                            '<div style="font-size:12px;color:var(--text-tertiary);margin-bottom:12px;">Activate this agent to assign skills and start working</div>' +
                            '<button onclick="openActivateModal(\'' + agentId + '\')" style="padding:8px 20px;border:none;border-radius:8px;background:var(--exec-blue);color:white;font-family:var(--font-family);font-size:13px;font-weight:600;cursor:pointer;">Activate Agent</button>' +
                            '</div>';
                        body.insertBefore(cta, body.firstChild);
                    }
                }, 50);
            }
        };

        // Run initially (offline state = only CEO)
        applyInactiveRoomStates();

        /* ═══════════════════════════════════════════════
           Status Bar — Clock & System Status
           ═══════════════════════════════════════════════ */

        function updateClock() {
            var now = new Date();
            var h = now.getHours().toString().padStart(2, '0');
            var m = now.getMinutes().toString().padStart(2, '0');
            var statusEl = document.getElementById('statusSystem');
            if (statusEl) {
                statusEl.textContent = 'All systems nominal • ' + h + ':' + m;
            }
        }

        updateClock();
        setInterval(updateClock, 30000);

        /* ═══════════════════════════════════════════════
           Chat Tab Functionality (integrated into Communications Hub)
           ═══════════════════════════════════════════════ */
        var chatTabMsgsEl = document.getElementById('chatTabMessages');
        var chatTabInput = document.getElementById('chatTabInput');
        var chatTabSendBtn = document.getElementById('chatTabSend');
        var chatTabEmptyEl = document.getElementById('chatTabEmpty');

        // Update chat button to open mailbox with chat tab
        document.getElementById('chatBtn').addEventListener('click', () => openMailbox('chat'));

        // Keep old chat panel references for compatibility but hide the panel
        var chatOverlay = document.getElementById('chatOverlay');
        if (chatOverlay) {
            chatOverlay.style.display = 'none'; // Hide old chat panel
        }

        function closeChatPanel() {
            // For compatibility - now handled by closeMailbox
            if (chatOverlay) chatOverlay.classList.remove('open');
            document.body.style.overflow = '';
        }

        /* ── Chat Tab Functions ─────────────────────── */
        var currentChatTarget = 'ceo'; // Default target: CEO (Sycopa)
        var availableChatTargets = [
            { id: 'ceo', name: 'CEO (Sycopa)', emoji: '🎭' },
            { id: 'apomac', name: 'ApoMac (Remote)', emoji: '🍎' }
        ];

        function loadChatTargets() {
            updateChatTargetSelector();
        }

        function updateChatTargetSelector() {
            const select = document.getElementById('chatTargetSelect');
            const currentTargetEl = document.getElementById('chatCurrentTarget');
            
            if (!select) return;
            
            select.innerHTML = '';
            availableChatTargets.forEach(function(target) {
                const option = document.createElement('option');
                option.value = target.id;
                option.textContent = target.emoji + ' ' + target.name;
                if (target.id === currentChatTarget) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
            
            // Update current target display
            const target = availableChatTargets.find(t => t.id === currentChatTarget);
            if (target && currentTargetEl) {
                const iconEl = currentTargetEl.querySelector('.target-icon');
                const nameEl = currentTargetEl.querySelector('.target-name');
                if (iconEl) iconEl.textContent = target.emoji;
                if (nameEl) nameEl.textContent = target.name;
            }
        }

        function loadChatTabTranscript() {
            if (!API) return;
            try {
                var transcript = API.getTranscript('agent:main:main');
                if (transcript && transcript.length > 0) {
                    chatHistory = transcript.slice(-50).map(function(m) {
                        return {
                            role: m.role === 'user' ? 'user' : 'ai',
                            text: m.text || m.content || '',
                            time: m.timestamp ? new Date(m.timestamp).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) : ''
                        };
                    });
                    renderChatTabMessages();
                }
            } catch(e) { console.warn('Chat transcript load:', e); }
        }

        var _lastChatHash = '';
        function renderChatTabMessages() {
            if (chatHistory.length === 0) {
                chatTabEmptyEl.style.display = '';
                return;
            }
            chatTabEmptyEl.style.display = 'none';

            // Only re-render if messages actually changed
            var hash = chatHistory.map(function(m) { return m.role + ':' + m.time + ':' + m.text.substring(0,50); }).join('|');
            if (hash === _lastChatHash) return;
            _lastChatHash = hash;

            // Preserve scroll position if user scrolled up
            var wasAtBottom = (chatTabMsgsEl.scrollHeight - chatTabMsgsEl.scrollTop - chatTabMsgsEl.clientHeight) < 60;

            chatTabMsgsEl.innerHTML = '';
            chatHistory.forEach(function(m) {
                var div = document.createElement('div');
                div.className = 'chat-tab-msg chat-tab-msg--' + m.role;
                var bodyHtml;
                if (m.typing) {
                    bodyHtml = '<div class="typing-dots"><span>●</span><span>●</span><span>●</span></div>';
                } else {
                    var preview = m.text.length > 300 ? m.text.substring(0, 300) + '…' : m.text;
                    bodyHtml = '<div>' + esc(preview) + '</div>';
                }
                div.innerHTML = bodyHtml +
                    (m.time ? '<div class="chat-tab-msg-time">' + esc(m.time) + '</div>' : '');
                chatTabMsgsEl.appendChild(div);
            });

            // Only scroll to bottom if user was already at bottom
            if (wasAtBottom) chatTabMsgsEl.scrollTop = chatTabMsgsEl.scrollHeight;
        }

        // Legacy function for compatibility
        function loadChatTranscript() {
            loadChatTabTranscript();
        }

        function renderChatMessages() {
            renderChatTabMessages();
        }

        async function sendChatTabMessage() {
            var text = chatTabInput.value.trim();
            if (!text) return;
            chatTabInput.value = '';

            var now = new Date();
            var timeStr = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
            chatHistory.push({ role: 'user', text: text, time: timeStr });
            localStorage.setItem('spawnkit-chat-history', JSON.stringify(chatHistory.filter(m => !m.typing).slice(-50)));
            renderChatTabMessages();

            // Show typing indicator
            chatHistory.push({ role: 'ai', text: '⌛ Thinking...', time: timeStr, typing: true });
            renderChatTabMessages();

            try {
                // Send to local API bridge (primary) or fleet relay (fallback)
                var apiUrl = (window.OC_API_URL || (window.location.hostname.includes('spawnkit.ai') ? window.location.origin : 'http://127.0.0.1:8222')) + '/api/oc/chat';
                const response = await skFetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        message: text,
                        target: currentChatTarget
                    })
                });

                // Remove typing indicator
                chatHistory = chatHistory.filter(msg => !msg.typing);

                if (!response.ok) {
                    const error = await response.text();
                    chatHistory.push({ role: 'ai', text: '⚠️ Request failed: ' + error, time: timeStr });
                    localStorage.setItem('spawnkit-chat-history', JSON.stringify(chatHistory.filter(m => !m.typing).slice(-50)));
                    renderChatTabMessages();
                    return;
                }

                const data = await response.json();
                // Parse reply from multiple possible response shapes
                var replyText = null;
                if (data.reply) {
                    replyText = data.reply;
                } else if (data.ok && data.result && data.result.reply) {
                    replyText = data.result.reply;
                } else if (data.message) {
                    replyText = data.message;
                } else if (data.text) {
                    replyText = data.text;
                }
                
                if (replyText) {
                    chatHistory.push({ role: 'ai', text: esc(replyText), time: timeStr });
                } else {
                    chatHistory.push({ role: 'ai', text: '⚠️ Unexpected response format', time: timeStr });
                    console.warn('[Chat] Unexpected response:', data);
                }
                localStorage.setItem('spawnkit-chat-history', JSON.stringify(chatHistory.filter(m => !m.typing).slice(-50)));
                renderChatTabMessages();

            } catch (error) {
                // Remove typing indicator
                chatHistory = chatHistory.filter(msg => !msg.typing);
                chatHistory.push({ role: 'ai', text: '⚠️ Network error: ' + esc(error.message), time: timeStr });
                localStorage.setItem('spawnkit-chat-history', JSON.stringify(chatHistory.filter(m => !m.typing).slice(-50)));
                renderChatTabMessages();
            }
        }

        // Legacy function for compatibility
        async function sendChatMessage() {
            return sendChatTabMessage();
        }

        chatTabSendBtn.addEventListener('click', sendChatTabMessage);
        chatTabInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); sendChatTabMessage(); }
        });

        // Target selector change handler
        document.addEventListener('DOMContentLoaded', function() {
            const targetSelect = document.getElementById('chatTargetSelect');
            if (targetSelect) {
                targetSelect.addEventListener('change', function() {
                    currentChatTarget = this.value;
                    updateChatTargetSelector();
                    showToast('Target changed to ' + (availableChatTargets.find(t => t.id === currentChatTarget)?.name || currentChatTarget));
                });
            }
        });

        /* ── Chat History Functions ─────────────────── */
        async function openChatHistory() {
            const overlay = document.getElementById('chatHistoryOverlay');
            const body = document.getElementById('chatHistoryBody');
            
            if (!overlay || !body) return;
            
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
            
            body.innerHTML = '<div class="history-loading">Loading unified chat history...</div>';
            
            // Combine local chat history + API sessions
            var combinedHistory = [];
            
            // 1. Add current in-memory chat history
            chatHistory.filter(function(m) { return !m.typing; }).forEach(function(m) {
                combinedHistory.push({
                    role: m.role === 'ai' ? 'assistant' : 'user',
                    content: m.text,
                    timestamp: Date.now(), // approximate
                    target: currentChatTarget
                });
            });
            
            try {
                // 2. Fetch from local API bridge (sessions data)
                var apiUrl = (window.OC_API_URL || (window.location.hostname.includes('spawnkit.ai') ? window.location.origin : 'http://127.0.0.1:8222'));
                
                // Try the dedicated chat history endpoint first
                var response = await  skFetch(apiUrl + '/api/oc/chat/history');
                if (response.ok) {
                    var data = await response.json();
                    if (data.ok && data.history) {
                        combinedHistory = combinedHistory.concat(data.history);
                    }
                }
                
                // 3. Also fetch sessions for additional context
                var sessResponse = await  skFetch(apiUrl + '/api/oc/sessions');
                if (sessResponse.ok) {
                    var sessions = await sessResponse.json();
                    if (Array.isArray(sessions)) {
                        sessions.filter(function(s) { return s.status === 'active'; }).slice(0, 10).forEach(function(s) {
                            combinedHistory.push({
                                role: 'assistant',
                                content: '📋 Session: ' + (s.label || s.displayName || s.key) + ' (' + s.model + ')',
                                timestamp: s.lastActive || Date.now(),
                                target: s.channel || 'system'
                            });
                        });
                    }
                }
            } catch (error) {
                console.warn('[ChatHistory] API fetch failed:', error.message);
            }
            
            // Deduplicate and sort
            combinedHistory.sort(function(a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });
            
            if (combinedHistory.length > 0) {
                renderChatHistory(combinedHistory);
            } else {
                body.innerHTML = '<div class="history-loading">No chat history found. Start a conversation!</div>';
            }
        }

        function renderChatHistory(history) {
            const body = document.getElementById('chatHistoryBody');
            if (!body || !history.length) {
                body.innerHTML = '<div class="history-loading">No chat history found.</div>';
                return;
            }
            
            let html = '';
            history.forEach(function(msg) {
                const roleClass = msg.role === 'user' ? 'user' : 'assistant';
                const roleText = msg.role === 'user' ? 'User' : 'Assistant';
                const time = msg.timestamp ? new Date(msg.timestamp).toLocaleString() : 'Unknown';
                
                html += '<div class="history-message ' + roleClass + '">';
                html += '<div class="history-message-meta">';
                html += '<div class="history-message-role">' + roleText + '</div>';
                html += '<div class="history-message-time">' + esc(time) + '</div>';
                if (msg.target) {
                    const target = availableChatTargets.find(t => t.id === msg.target);
                    if (target) {
                        html += '<div class="history-message-time">' + target.emoji + ' ' + esc(target.name) + '</div>';
                    }
                }
                html += '</div>';
                html += '<div class="history-message-content">' + esc(msg.content || msg.text || '') + '</div>';
                html += '</div>';
            });
            
            body.innerHTML = html;
        }

        function closeChatHistory() {
            const overlay = document.getElementById('chatHistoryOverlay');
            if (overlay) {
                overlay.classList.remove('open');
                document.body.style.overflow = '';
            }
        }

        // Wire up chat history events
        document.addEventListener('DOMContentLoaded', function() {
            const historyBtn = document.getElementById('chatHistoryBtn');
            const historyClose = document.getElementById('chatHistoryClose');
            const historyBackdrop = document.getElementById('chatHistoryBackdrop');
            
            if (historyBtn) historyBtn.addEventListener('click', openChatHistory);
            if (historyClose) historyClose.addEventListener('click', closeChatHistory);
            if (historyBackdrop) historyBackdrop.addEventListener('click', closeChatHistory);
        });

        /* ── Activity Tab Functions ────────────────── */
        async function loadActivityData() {
            var feed = document.getElementById('activityFeedList');
            if (!feed) return;
            feed.innerHTML = '<div class="activity-item"><span class="activity-icon">⏳</span><div class="activity-content"><div class="activity-text">Loading…</div><div class="activity-time"></div></div></div>';

            var activities = [];
            var apiUrl = window.OC_API_URL || (window.location.hostname.includes('spawnkit.ai') ? window.location.origin : 'http://127.0.0.1:8222');

            // Fetch sessions from API
            try {
                var sessResp = await skFetch(apiUrl + '/api/oc/sessions');
                if (sessResp.ok) {
                    var sessData = await sessResp.json();
                    var sessions = Array.isArray(sessData) ? sessData : (sessData.sessions || []);
                    sessions.forEach(function(s) {
                        if (s.startedAt || s.lastActive || s.createdAt) {
                            var ts = s.startedAt || s.createdAt || s.lastActive;
                            var name = s.label || s.displayName || s.key || 'Session';
                            var icon = s.kind === 'subagent' ? '🤖' : '💻';
                            var statusText = s.status === 'active' ? 'started' : (s.status === 'ended' ? 'ended' : s.status || 'active');
                            activities.push({ time: new Date(ts), icon: icon, text: name + ' ' + statusText });
                        }
                    });
                }
            } catch(e) { console.warn('[Activity] sessions fetch:', e); }

            // Fetch cron run history
            try {
                var cronResp = await skFetch(apiUrl + '/api/oc/crons');
                if (cronResp.ok) {
                    var cronData = await cronResp.json();
                    var cronList = Array.isArray(cronData) ? cronData : (cronData.jobs || cronData.crons || []);
                    cronList.forEach(function(c) {
                        if (c.state && c.state.lastRunAtMs) {
                            activities.push({ time: new Date(c.state.lastRunAtMs), icon: '⏰', text: (c.name || 'Cron') + ' triggered' });
                        }
                    });
                }
            } catch(e) { console.warn('[Activity] crons fetch:', e); }

            // From in-memory agents
            var agents = (window.SpawnKit && SpawnKit.data && SpawnKit.data.agents) ? SpawnKit.data.agents : [];
            agents.forEach(function(a) {
                if (a.lastSeen) activities.push({ time: new Date(a.lastSeen), icon: '🤖', text: (a.name || 'Agent') + ' — ' + (a.status || 'active') });
            });

            activities.sort(function(a, b) { return b.time - a.time; });

            if (activities.length === 0) {
                feed.innerHTML = '<div class="activity-item"><span class="activity-icon">💤</span><div class="activity-content"><div class="activity-text">No recent activity</div><div class="activity-time"></div></div></div>';
                return;
            }

            var now = Date.now();
            feed.innerHTML = activities.slice(0, 30).map(function(item) {
                var diffMs = now - item.time.getTime();
                var timeLabel;
                if (isNaN(diffMs) || diffMs < 0) {
                    timeLabel = item.time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                } else if (diffMs < 60000) {
                    timeLabel = 'just now';
                } else if (diffMs < 3600000) {
                    timeLabel = Math.floor(diffMs / 60000) + ' min ago';
                } else if (diffMs < 86400000) {
                    timeLabel = Math.floor(diffMs / 3600000) + ' hour' + (Math.floor(diffMs / 3600000) !== 1 ? 's' : '') + ' ago';
                } else {
                    timeLabel = item.time.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                }
                return '<div class="activity-item">' +
                    '<span class="activity-icon">' + item.icon + '</span>' +
                    '<div class="activity-content">' +
                    '<div class="activity-text">' + esc(item.text) + '</div>' +
                    '<div class="activity-time">' + timeLabel + '</div>' +
                    '</div></div>';
            }).join('');
        }

        // Auto-refresh chat every 10s when communications hub is open with chat tab active
        setInterval(function() {
            if (mailboxOverlay.classList.contains('open') && document.getElementById('chatTab').classList.contains('active')) {
                loadChatTabTranscript();
            }
        }, 10000);

        /* ═══════════════════════════════════════════════
           Cron / Calendar Panel (Feature 4)
           ═══════════════════════════════════════════════ */
        var cronOverlay = document.getElementById('cronOverlay');
        var cronBackdropEl = document.getElementById('cronBackdrop');
        var cronCloseBtn = document.getElementById('cronClose');
        var cronBody = document.getElementById('cronBody');

        function openCronPanel() {
            closeAllPanels();
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
            if (!schedule) return '—';
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
                return schedule.kind || '—';
            }
            return String(schedule);
        }

        async function renderCronJobs() {
            var crons = null;

            // Always prefer API bridge (has full state with nextRunAtMs)
            {
                try {
                    var apiUrl = (window.OC_API_URL || (window.location.hostname.includes('spawnkit.ai') ? window.location.origin : 'http://127.0.0.1:8222'));
                    var resp = await  skFetch(apiUrl + '/api/oc/crons');
                    if (resp.ok) {
                        var data = await resp.json();
                        crons = data.jobs || data.crons || (Array.isArray(data) ? data : []);
                    }
                } catch(e) {}
            }

            // Fallback to cached liveCronData if bridge failed
            if ((!crons || !Array.isArray(crons) || crons.length === 0) && liveCronData) {
                crons = liveCronData;
            }

            if (!crons || !Array.isArray(crons) || crons.length === 0) {
                cronBody.innerHTML = '<div class="cron-empty" style="text-align:center;padding:40px 20px;">' +
                    '<div style="font-size:40px;margin-bottom:12px;">📅</div>' +
                    '<div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:6px;">No Cron Jobs</div>' +
                    '<div style="font-size:12px;color:var(--text-tertiary);line-height:1.5;">No scheduled jobs found.<br>Crons defined in OpenClaw will appear here automatically.</div>' +
                    '</div>';
                return;
            }

            // Group by owner
            var groups = {};
            crons.forEach(function(c) {
                var owner = c.owner || 'System';
                if (!groups[owner]) groups[owner] = [];
                groups[owner].push(c);
            });

            var html = '';
            Object.keys(groups).forEach(function(owner) {
                html += '<div class="cron-group">';
                html += '<div class="cron-group-title">' + esc(owner) + '</div>';
                groups[owner].forEach(function(c) {
                    // Normalize status from OpenClaw format (enabled boolean + state obj) or string
                    var status = c.status || (c.enabled === true ? 'active' : c.enabled === false ? 'paused' : 'unknown');
                    if (c.state && c.state.lastStatus === 'error') status = 'error';
                    var statusCls = status === 'active' ? 'active' : status === 'error' ? 'error' : 'paused';
                    var icon = status === 'active' ? '⏰' : status === 'error' ? '❌' : '⏸️';
                    // Get next run from state.nextRunAtMs or c.nextRun
                    var nextRunMs = (c.state && c.state.nextRunAtMs) || c.nextRun;
                    var nextRun = nextRunMs ? new Date(nextRunMs).toLocaleString('en-GB', {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
                    html += '<div class="cron-item">';
                    html += '<span class="cron-item-icon">' + icon + '</span>';
                    html += '<div class="cron-item-info">';
                    html += '<div class="cron-item-name">' + esc(c.name || c.id || 'Unnamed') + '</div>';
                    html += '<div class="cron-item-schedule">' + humanCron(c.schedule) + '</div>';
                    html += '<div class="cron-item-next">Next: ' + nextRun + '</div>';
                    if (nextRunMs) {
                        html += '<div class="cron-countdown" data-next-run="' + nextRunMs + '" style="font-size:11px;font-weight:600;color:var(--exec-blue);font-family:\'SF Mono\',monospace;margin-top:2px;">⏱ calculating...</div>';
                    }
                    html += '</div>';
                    html += '<span class="cron-item-status cron-item-status--' + statusCls + '">' + esc(status) + '</span>';
                    html += '<button class="cron-toggle ' + (c.enabled !== false ? 'on' : '') + '" data-cron-id="' + esc(c.id || '') + '" aria-label="Toggle"></button>';
                    html += '</div>';
                });
                html += '</div>';
            });
            cronBody.innerHTML = html;

            // Toggle click → API call
            cronBody.querySelectorAll('.cron-toggle').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    var cronId = btn.dataset.cronId;
                    var currentState = btn.classList.contains('on');
                    btn.classList.toggle('on'); // optimistic update
                    var apiUrl = window.OC_API_URL || (window.location.hostname.includes('spawnkit.ai') ? window.location.origin : 'http://127.0.0.1:8222');
                    skFetch(apiUrl + '/api/oc/crons', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({action: 'update', jobId: cronId, patch: {enabled: !currentState}})
                    }).then(function(r) {
                        if (!r.ok) throw new Error('HTTP ' + r.status);
                        return r.json();
                    }).then(function(data) {
                        if (!data.ok && data.ok !== undefined) throw new Error(data.error || 'Failed');
                        showToast((currentState ? '⏸ Cron disabled' : '▶️ Cron enabled'));
                    }).catch(function(err) {
                        btn.classList.toggle('on'); // revert
                        showToast('⚠️ Failed to update cron: ' + err.message);
                    });
                });
            });

            // Make cron items clickable → show details
            cronBody.querySelectorAll('.cron-item').forEach(function(item, idx) {
                item.style.cursor = 'pointer';
                item.addEventListener('click', function() {
                    var c = crons[idx];
                    if (!c) return;
                    var details = '📅 ' + (c.name || 'Unnamed') + '\n\n';
                    details += 'Schedule: ' + humanCron(c.schedule) + '\n';
                    details += 'Enabled: ' + (c.enabled !== false ? 'Yes' : 'No') + '\n';
                    details += 'ID: ' + (c.id || '—') + '\n';
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
                        el.textContent = '⏱ Running now...';
                        el.style.color = '#30D158';
                    } else {
                        var h = Math.floor(diff / 3600000);
                        var m = Math.floor((diff % 3600000) / 60000);
                        var s = Math.floor((diff % 60000) / 1000);
                        el.textContent = '⏱ ' + (h > 0 ? h + 'h ' : '') + m + 'm ' + s + 's';
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
            closeAllPanels();
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

        function renderMarkdown(md) {
            if (!md) return '<em>No content</em>';
            return md
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
            var mem = liveMemoryData;
            // Resolve if liveMemoryData is a Promise
            if (mem && typeof mem.then === 'function') {
                try { mem = await mem; } catch(e) { mem = null; }
            }
            if (API && !mem) {
                try { mem = await Promise.resolve(API.getMemory()); } catch(e) {}
            }
            // If mem came from data-bridge, it has {longTerm, daily, ...} shape
            // If longTerm is a string (legacy), wrap it
            if (mem && typeof mem.longTerm === 'string') {
                mem.longTerm = { content: mem.longTerm, size: mem.longTerm.length };
            }

            // Fallback: fetch from API bridge
            if (!mem) {
                try {
                    var apiUrl = (window.OC_API_URL || (window.location.hostname.includes('spawnkit.ai') ? window.location.origin : 'http://127.0.0.1:8222'));
                    var resp = await  skFetch(apiUrl + '/api/oc/memory');
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
                memoryBody.innerHTML = '<div class="cron-empty" style="text-align:center;padding:40px 20px;">' +
                    '<div style="font-size:40px;margin-bottom:12px;">🧠</div>' +
                    '<div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:6px;">No Memory Data</div>' +
                    '<div style="font-size:12px;color:var(--text-tertiary);line-height:1.5;">Memory files will appear here when available.<br>Ensure the API bridge is running on port 8222.</div>' +
                    '</div>';
                return;
            }

            var html = '';

            // Golden rules — extract 🔴 sections from long-term
            if (mem.longTerm && mem.longTerm.content) {
                var content = mem.longTerm.content;
                var goldenMatch = content.match(/## 🔴[^\n]*\n[\s\S]*?(?=\n## |$)/g);
                if (goldenMatch && goldenMatch.length > 0) {
                    html += '<div class="memory-section">';
                    html += '<div class="memory-section-title">🔴 Golden Rules</div>';
                    goldenMatch.forEach(function(rule) {
                        html += '<div class="memory-golden-rules" style="background:rgba(255,69,58,0.06);border:1px solid rgba(255,69,58,0.15);border-radius:10px;padding:12px;margin-bottom:8px;">';
                        html += '<div class="memory-content-md">' + renderMarkdown(rule.trim()) + '</div>';
                        html += '</div>';
                    });
                    html += '</div>';
                }

                // Full MEMORY.md
                html += '<div class="memory-section">';
                html += '<div class="memory-section-title">📝 MEMORY.md <span style="font-weight:400;color:var(--text-tertiary);text-transform:none;letter-spacing:0">(' + (mem.longTerm.size ? (mem.longTerm.size / 1024).toFixed(1) + ' KB' : '—') + ')</span></div>';
                html += '<div class="memory-content-md" style="background:var(--bg-tertiary);border-radius:10px;padding:14px;font-size:12px;line-height:1.6;max-height:300px;overflow-y:auto;">' + renderMarkdown(content.substring(0, 3000)) + '</div>';
                if (content.length > 3000) {
                    html += '<div style="color:var(--text-tertiary);font-size:11px;margin-top:8px">…truncated (' + content.length + ' chars total)</div>';
                }
                html += '</div>';
            }

            // Daily memory files
            html += '<div class="memory-section">';
            html += '<div class="memory-section-title">📅 Daily Notes</div>';
            if (mem.daily && mem.daily.length > 0) {
                html += '<div class="memory-daily-list" style="display:flex;flex-direction:column;gap:4px;">';
                mem.daily.slice(0, 14).forEach(function(d) {
                    html += '<div class="memory-daily-item" style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--bg-tertiary);border-radius:8px;font-size:12px;">';
                    html += '<span style="font-weight:600;color:var(--text-primary);min-width:100px;">' + esc(d.date || d.name || '—') + '</span>';
                    html += '<span style="flex:1;color:var(--text-secondary);margin:0 8px;">' + esc(d.preview || d.description || 'Daily log') + '</span>';
                    html += '<span style="color:var(--text-tertiary);font-size:11px;">' + (d.size ? (d.size / 1024).toFixed(1) + ' KB' : '') + '</span>';
                    html += '</div>';
                });
                html += '</div>';
            } else {
                html += '<div style="padding:10px 12px;background:var(--bg-tertiary);border-radius:8px;font-size:12px;color:var(--text-tertiary);font-style:italic;">📝 Coming soon — daily notes will appear here</div>';
            }
            html += '</div>';

            // Heartbeat state
            if (mem.heartbeat) {
                html += '<div class="memory-section">';
                html += '<div class="memory-section-title">💓 Heartbeat State</div>';
                html += '<div class="memory-content-md"><pre style="font-size:11px;background:var(--bg-tertiary);padding:10px;border-radius:8px;overflow-x:auto">' + JSON.stringify(mem.heartbeat, null, 2).replace(/</g,'&lt;') + '</pre></div>';
                html += '</div>';
            }

            // Read-only label
            html += '<div class="memory-section" style="margin-top:12px;">';
            html += '<div style="text-align:center;color:var(--text-tertiary);font-size:11px;">🔒 Only the CEO can edit memory</div>';
            html += '</div>';

            memoryBody.innerHTML = html;
        }

        /* Toast helper */
        function showToast(msg) {
            var t = document.getElementById('execToast');
            if (!t) return;
            t.textContent = msg;
            t.classList.add('show');
            clearTimeout(t._timer);
            t._timer = setTimeout(function() { t.classList.remove('show'); }, 2500);
        }

        /* Close all panels helper */
        function closeRemotePanel() {
            var el = document.getElementById('remoteOverlay');
            if (el) el.classList.remove('open');
            document.body.style.overflow = '';
        }

        function closeAllPanels() {
            closeMailbox();
            closeTodoPanel();
            closeMeetingPanel();
            closeDetailPanel();
            closeChatPanel();
            closeCronPanel();
            closeMemoryPanel();
            closeRemotePanel();
        }

        /* ═══════════════════════════════════════════════
           Announce readiness to parent
           ═══════════════════════════════════════════════ */

        if (window.parent !== window) {
            window.parent.postMessage({
                type: 'executive:ready',
                theme: 'executive',
                timestamp: Date.now()
            }, '*');
        }

        /* ═══════════════════════════════════════════════
           Shared scripts compatibility
           ═══════════════════════════════════════════════ */

        window.__EXEC_THEME = 'executive';

        /* ═══════════════════════════════════════════════
           Live Activity Simulation — Makes it feel alive
           ═══════════════════════════════════════════════ */

        var ACTIVITY_VERBS = {
            ceo:      ['Orchestrating', 'Reviewing', 'Synthesizing', 'Delegating', 'Planning'],
            atlas:    ['Coordinating', 'Documenting', 'Syncing', 'Auditing', 'Scheduling'],
            forge:    ['Building', 'Deploying', 'Optimizing', 'Refactoring', 'Testing'],
            hunter:   ['Prospecting', 'Analyzing', 'Pricing', 'Pitching', 'Converting'],
            echo:     ['Crafting', 'Writing', 'Designing', 'Scripting', 'Publishing'],
            sentinel: ['Scanning', 'Auditing', 'Reviewing', 'Monitoring', 'Verifying']
        };

        var ACTIVITY_OBJECTS = {
            ceo:      ['fleet operations', 'quality pipeline', 'revenue strategy', 'sprint goals', 'SS+ roadmap'],
            atlas:    ['workflows', 'FeedCast ops', 'deployment pipeline', 'cron schedules', 'fleet status'],
            forge:    ['security middleware', 'executive dashboard', 'API endpoints', 'live data bridge', 'Hetzner infra'],
            hunter:   ['Stripe payments', 'lead pipeline', 'pricing tiers', 'market segments', 'conversion funnel'],
            echo:     ['TikTok scripts', 'brand story', 'video pipeline', 'landing page copy', 'social content'],
            sentinel: ['codebase', 'fleet deliverables', 'security posture', 'compliance gates', 'deploy artifacts']
        };

        function randomActivity(agentId) {
            var verbs = ACTIVITY_VERBS[agentId] || ACTIVITY_VERBS.ceo;
            var objects = ACTIVITY_OBJECTS[agentId] || ACTIVITY_OBJECTS.ceo;
            return verbs[Math.floor(Math.random() * verbs.length)] + ' ' + objects[Math.floor(Math.random() * objects.length)];
        }

        /* Rotate agent tasks every 15-45 seconds for liveness */
        function simulateActivity() {
            var agentIds = Object.keys(AGENTS);
            var targetId = agentIds[Math.floor(Math.random() * agentIds.length)];
            var newTask = randomActivity(targetId);
            AGENTS[targetId].task = newTask;

            /* Update visible task text in grid view */
            document.querySelectorAll('[data-agent="' + targetId + '"]').forEach(function(el) {
                var taskEl = el.querySelector('.agent-task');
                if (taskEl) {
                    taskEl.style.opacity = '0';
                    setTimeout(function() {
                        taskEl.textContent = newTask;
                        taskEl.style.opacity = '1';
                    }, 200);
                }
            });

            /* Schedule next update — random 15-45s */
            setTimeout(simulateActivity, 15000 + Math.random() * 30000);
        }

        /* Start after 8 seconds */
        setTimeout(simulateActivity, 8000);

        /* ── Uptime Counter in Status Bar ───────────── */
        var startTime = Date.now() - (8 * 3600000 + 23 * 60000); /* Simulate 8h23m uptime */
        function updateUptime() {
            var elapsed = Date.now() - startTime;
            var h = Math.floor(elapsed / 3600000);
            var m = Math.floor((elapsed % 3600000) / 60000);
            var uptimeEl = document.getElementById('statusAgentCount');
            if (uptimeEl) {
                uptimeEl.textContent = '6 Agents • ' + h + 'h' + m.toString().padStart(2, '0') + 'm uptime';
            }
        }
        updateUptime();
        setInterval(updateUptime, 60000);

        // ── SpawnKit Integration for Agent OS Names ─────────────────────
        function handleSubagentsUpdate(subagents) {
            if (!subagents || !Array.isArray(subagents)) return;
            
            // Update existing subagent cards with Agent OS names
            subagents.forEach(function(subagent) {
                if (!subagent.agentOSName) return;
                
                // Find subagent elements and update names
                document.querySelectorAll('.sub-agent-name').forEach(function(el) {
                    // Check if this element matches our subagent (by parent or task context)
                    var card = el.closest('.org-sub-card');
                    if (card && window.AgentOSNaming) {
                        var displayName = window.AgentOSNaming.displayName(subagent.agentOSName, 'full');
                        el.textContent = displayName;
                        
                        // Add model badge if available
                        if (subagent.model && window.ModelIdentity) {
                            var modelIdentity = window.ModelIdentity.getIdentity(subagent.model);
                            var roleEl = card.querySelector('.sub-agent-role');
                            if (roleEl) {
                                roleEl.innerHTML = esc(subagent.task) + ' <span class="model-badge" style="color: ' + 
                                    esc(modelIdentity.color) + '; font-size: 8px; font-weight: 600;">(' + 
                                    esc(modelIdentity.level) + ')</span>';
                            }
                        }
                    }
                });
            });
        }

        // Listen for SpawnKit data updates
        if (window.SpawnKit) {
            SpawnKit.on('data:refresh', function(data) {
                if (data.agents) handleAgentsUpdate(data.agents);
                if (data.subagents) handleSubagentsUpdate(data.subagents);
            });
        }

        // Wire up live data if available
        if (window.SpawnKit && window.SpawnKit.mode === 'live') {
            SpawnKit.on('data:refresh', function(data) {
                if (typeof handleDataUpdate === 'function') handleDataUpdate(data);
            });
            SpawnKit.refresh();
        }

        /* ═══════════════════════════════════════════════
           Missions Panel (NEW #2)
           ═══════════════════════════════════════════════ */
        var missionsOverlay = document.getElementById('missionsOverlay');
        var missionsBackdropEl = document.getElementById('missionsBackdrop');
        var missionsCloseBtn = document.getElementById('missionsClose');
        var missionsBody = document.getElementById('missionsBody');

        function openMissionsPanel() {
            closeAllPanels();
            missionsOverlay.classList.add('open');
            document.body.style.overflow = 'hidden';
            renderMissions();
        }
        window.openMissionsPanel = openMissionsPanel;
        function closeMissionsPanel() {
            missionsOverlay.classList.remove('open');
            document.body.style.overflow = '';
        }

        document.getElementById('missionsBtn').addEventListener('click', openMissionsPanel);
        missionsBackdropEl.addEventListener('click', closeMissionsPanel);
        missionsCloseBtn.addEventListener('click', closeMissionsPanel);

        // New Mission form
        var newMissionForm = document.getElementById('newMissionForm');
        document.getElementById('newMissionBtn').addEventListener('click', function() {
            newMissionForm.style.display = newMissionForm.style.display === 'none' ? 'block' : 'none';
            if (newMissionForm.style.display === 'block') {
                setTimeout(function() { document.getElementById('newMissionInput').focus(); }, 100);
            }
        });
        document.getElementById('cancelMissionBtn').addEventListener('click', function() {
            newMissionForm.style.display = 'none';
            document.getElementById('newMissionInput').value = '';
        });
        document.getElementById('launchMissionBtn').addEventListener('click', function() {
            var task = document.getElementById('newMissionInput').value.trim();
            if (!task) { showToast('Please describe the mission'); return; }
            var model = 'sonnet';
            var btn = document.getElementById('launchMissionBtn');
            btn.disabled = true;
            btn.textContent = '🚀 Launching...';

            // Send as brainstorm (uses the CEO to process)
            var apiUrl = window.OC_API_URL || (window.location.hostname.includes('spawnkit.ai') ? window.location.origin : 'http://127.0.0.1:8222');
             skFetch(apiUrl + '/api/brainstorm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: '🚀 MISSION: ' + task + '\n\nPlease execute this mission thoroughly. Complexity: thorough.',
                    complexity: 'deep'
                })
            })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                btn.disabled = false;
                btn.textContent = '🚀 Launch';
                newMissionForm.style.display = 'none';
                document.getElementById('newMissionInput').value = '';
                if (data.ok) {
                    showToast('✅ Mission complete! Check the Boardroom for results.');
                    renderMissions();
                } else {
                    showToast('⚠️ Mission failed: ' + (data.error || 'Unknown error'));
                }
            })
            .catch(function(err) {
                btn.disabled = false;
                btn.textContent = '🚀 Launch';
                showToast('⚠️ Error: ' + err.message);
            });
        });

        async function renderMissions() {
            var sessions = null;
            
            // Try API first
            if (API) {
                try { sessions = await API.getSessions(); } catch(e) {}
            }
            
            // Fallback: fetch from API bridge
            if (!sessions) {
                try {
                    var apiUrl = (window.OC_API_URL || (window.location.hostname.includes('spawnkit.ai') ? window.location.origin : 'http://127.0.0.1:8222'));
                    var resp = await  skFetch(apiUrl + '/api/oc/sessions');
                    if (resp.ok) {
                        var data = await resp.json();
                        // API bridge returns array of sessions
                        if (Array.isArray(data)) {
                            sessions = { 
                                subagents: data.filter(function(s) { return s.kind === 'subagent'; }).map(function(s) {
                                    return {
                                        id: s.key,
                                        name: s.label || s.displayName || s.key.split(':').pop(),
                                        label: s.label || s.displayName,
                                        status: s.status === 'active' ? 'running' : 'completed',
                                        parentAgent: s.key.split(':')[1] || 'main',
                                        model: s.model,
                                        totalTokens: s.totalTokens || 0,
                                        lastActive: s.lastActive
                                    };
                                }),
                                activeSessions: data.filter(function(s) { return s.status === 'active'; })
                            };
                        }
                    }
                } catch(e) {}
            }

            // Build mission list from sessions
            var subagents = (sessions && sessions.subagents) || [];
            var activeSessions = (sessions && sessions.activeSessions) || 
                (Array.isArray(sessions) ? sessions.filter(function(s) { return s.status === 'active'; }) : []);
            var running = subagents.filter(function(sa) { return sa.status === 'running'; });
            // completed section removed (Kira fix 2026-02-28)
            var errored = subagents.filter(function(sa) { return sa.status === 'error'; }).slice(0, 3);

            // If no subagents but we have active sessions, show those as missions
            if (running.length === 0 && activeSessions.length === 0) {
                missionsBody.innerHTML = '<div class="cron-empty" style="text-align:center;padding:40px 20px;">' +
                    '<div style="font-size:40px;margin-bottom:12px;">🎯</div>' +
                    '<div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:6px;">All Clear</div>' +
                    '<div style="font-size:12px;color:var(--text-tertiary);line-height:1.5;">No active missions or sub-agents running.</div>' +
                    '</div>';
                return;
            }

            var html = '';

            // Active sessions as missions
            if (activeSessions.length > 0 && running.length === 0) {
                html += '<div class="cron-group"><div class="cron-group-title">🟢 Active Sessions (' + activeSessions.length + ')</div>';
                activeSessions.forEach(function(s) {
                    var name = s.label || s.displayName || s.key || 'Session';
                    var model = s.model || '—';
                    var tokens = s.totalTokens ? (s.totalTokens / 1000).toFixed(1) + 'k tokens' : '';
                    var lastActive = s.lastActive ? new Date(s.lastActive).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '';
                    html += '<div class="cron-item">';
                    html += '<span class="cron-item-icon">🟢</span>';
                    html += '<div class="cron-item-info">';
                    html += '<div class="cron-item-name">' + esc(name) + '</div>';
                    html += '<div class="cron-item-schedule">' + esc(model) + (tokens ? ' • ' + tokens : '') + (lastActive ? ' • ' + lastActive : '') + '</div>';
                    html += '</div>';
                    html += '<span class="cron-item-status cron-item-status--active">Live</span>';
                    html += '</div>';
                });
                html += '</div>';
            }

            // Active sub-agent missions
            if (running.length > 0) {
                html += '<div class="cron-group"><div class="cron-group-title">🔴 Active Missions (' + running.length + ')</div>';
                running.forEach(function(sa) {
                    var duration = sa.durationMs ? Math.floor(sa.durationMs / 60000) : 0;
                    var progress = sa.progress || 0.5;
                    html += '<div class="cron-item">';
                    html += '<span class="cron-item-icon">🚀</span>';
                    html += '<div class="cron-item-info">';
                    html += '<div class="cron-item-name">' + esc(sa.name || sa.label || sa.id) + '</div>';
                    html += '<div class="cron-item-schedule">Parent: ' + esc(sa.parentAgent || 'main') + (duration ? ' • ' + duration + 'm' : '') + '</div>';
                    html += '<div style="margin-top:4px;height:4px;background:var(--bg-tertiary);border-radius:2px;overflow:hidden;"><div style="width:' + Math.round(progress * 100) + '%;height:100%;background:var(--exec-blue);border-radius:2px;transition:width 0.3s;"></div></div>';
                    html += '</div>';
                    html += '<span class="cron-item-status cron-item-status--active">' + Math.round(progress * 100) + '%</span>';
                    html += '</div>';
                });
                html += '</div>';
            }

            // Completed section removed (Kira fix 2026-02-28)

            // Errored
            if (errored.length > 0) {
                html += '<div class="cron-group"><div class="cron-group-title">❌ Errors (' + errored.length + ')</div>';
                errored.forEach(function(sa) {
                    html += '<div class="cron-item" style="opacity:0.6">';
                    html += '<span class="cron-item-icon">❌</span>';
                    html += '<div class="cron-item-info">';
                    html += '<div class="cron-item-name">' + esc(sa.name || sa.label || sa.id) + '</div>';
                    html += '</div>';
                    html += '<span class="cron-item-status cron-item-status--error">Error</span>';
                    html += '</div>';
                });
                html += '</div>';
            }

            missionsBody.innerHTML = html;
        }

        // Auto-refresh missions every 15s when open
        setInterval(function() {
            if (missionsOverlay.classList.contains('open')) renderMissions();
        }, 15000);

        /* ═══════════════════════════════════════════════
           Settings Panel (NEW #3: API Keys + NEW #5: Mapping)
           ═══════════════════════════════════════════════ */
        var settingsOverlay = document.getElementById('settingsOverlay');
        var settingsBackdropEl = document.getElementById('settingsBackdrop');
        var settingsCloseBtn = document.getElementById('settingsClose');
        var settingsBody = document.getElementById('settingsBody');

        function openSettingsPanel() {
            closeAllPanels();
            settingsOverlay.classList.add('open');
            document.body.style.overflow = 'hidden';
            renderSettings();
        }
        function closeSettingsPanel() {
            settingsOverlay.classList.remove('open');
            document.body.style.overflow = '';
        }

        document.getElementById('settingsBtn').addEventListener('click', openSettingsPanel);
        settingsBackdropEl.addEventListener('click', closeSettingsPanel);
        settingsCloseBtn.addEventListener('click', closeSettingsPanel);

        async function renderSettings() {
            var html = '';

            // API Keys section (NEW #3)
            html += '<div class="cron-group"><div class="cron-group-title">🔑 API Keys</div>';
            
            var providers = ['anthropic', 'openai', 'elevenlabs', 'google'];
            var providerLabels = { anthropic: 'Anthropic', openai: 'OpenAI', elevenlabs: 'ElevenLabs', google: 'Google' };
            var providerPrefixes = { anthropic: 'sk-ant-', openai: 'sk-', elevenlabs: '', google: '' };
            
            var currentKeys = {};
            if (API) {
                try { currentKeys = await API.getApiKeys(); } catch(e) {}
            }

            providers.forEach(function(prov) {
                var info = currentKeys[prov] || {};
                var masked = info.hasKey ? info.masked : 'Not set';
                var hasKey = info.hasKey || false;
                
                html += '<div class="cron-item" style="flex-wrap:wrap;">';
                html += '<div class="cron-item-info" style="flex:1;min-width:150px;">';
                html += '<div class="cron-item-name">' + providerLabels[prov] + '</div>';
                html += '<div class="cron-item-schedule" style="font-family:monospace;font-size:11px;">' + esc(masked) + '</div>';
                html += '</div>';
                html += '<div style="display:flex;gap:4px;align-items:center;">';
                html += '<input type="password" id="apikey-' + prov + '" placeholder="' + (providerPrefixes[prov] || '') + '..." style="width:160px;padding:4px 8px;border-radius:6px;border:1px solid var(--border-medium);font-size:11px;font-family:monospace;background:var(--bg-tertiary);color:var(--text-primary);" />';
                html += '<button class="apikey-save-btn" data-provider="' + prov + '" style="padding:4px 10px;border-radius:6px;border:none;background:var(--exec-blue);color:#fff;font-size:11px;cursor:pointer;font-weight:500;">Save</button>';
                if (hasKey) {
                    html += '<button class="apikey-delete-btn" data-provider="' + prov + '" style="padding:4px 8px;border-radius:6px;border:1px solid var(--status-error);background:transparent;color:var(--status-error);font-size:11px;cursor:pointer;">🗑️</button>';
                }
                html += '</div>';
                html += '</div>';
            });
            html += '</div>';

            // Skills section
            var skillsList = [
                { name: 'large-build', desc: 'Decompose large projects into parallel sub-agent modules', icon: '🏗️' },
                { name: 'research', desc: 'Deep web research with synthesis and summary', icon: '🔍' },
                { name: 'brainstorm', desc: 'Creative ideation and strategic planning sessions', icon: '💡' },
                { name: 'code-review', desc: 'Automated code review and quality analysis', icon: '🔎' },
                { name: 'tiktok-pipeline', desc: 'HeyGen avatar video generation pipeline', icon: '🎬' },
                { name: 'memory-update', desc: 'Update and consolidate fleet memory', icon: '🧠' },
                { name: 'fleet-relay', desc: 'Inter-office messaging via Fleet Relay', icon: '📡' }
            ];
            // Try to load from API
            try {
                var apiUrl2 = window.OC_API_URL || (window.location.hostname.includes('spawnkit.ai') ? window.location.origin : 'http://127.0.0.1:8222');
                skFetch(apiUrl2 + '/api/oc/agents').then(function(r) {
                    if (r.ok) return r.json();
                }).then(function(data) {
                    if (data && data.skills && Array.isArray(data.skills) && data.skills.length > 0) {
                        // Dynamically update if API returns skills
                    }
                }).catch(function() {});
            } catch(e) {}
            html += '<div class="cron-group"><div class="cron-group-title">⚡ Available Skills</div>';
            html += '<div style="display:flex;flex-direction:column;gap:6px;">';
            skillsList.forEach(function(sk) {
                html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--bg-tertiary);border-radius:10px;">';
                html += '<div style="font-size:22px;min-width:28px;text-align:center;">' + sk.icon + '</div>';
                html += '<div><div style="font-size:13px;font-weight:600;color:var(--text-primary);">' + esc(sk.name) + '</div>';
                html += '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">' + esc(sk.desc) + '</div></div>';
                html += '</div>';
            });
            html += '</div></div>';

            // Village Profile section
            html += '<div class="cron-group"><div class="cron-group-title">🏡 Village Profile</div>';
            html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--bg-tertiary);border-radius:10px;">';
            html += '<div>';
            html += '<div style="font-size:13px;font-weight:600;color:var(--text-primary);">Creator Profile &amp; Village Settings</div>';
            html += '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">Manage village name, share link &amp; identity</div>';
            html += '</div>';
            html += '<button id="openCreatorProfileBtn" style="padding:8px 14px;border-radius:8px;border:none;background:var(--exec-blue);color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">Open Profile</button>';
            html += '</div></div>';

            settingsBody.innerHTML = html;

            // Wire creator profile button
            var cpBtn = document.getElementById('openCreatorProfileBtn');
            if (cpBtn && typeof window.openCreatorProfile === 'function') {
                cpBtn.addEventListener('click', function() {
                    closeSettingsPanel();
                    window.openCreatorProfile();
                });
            }

            // Wire up API key save buttons
            document.querySelectorAll('.apikey-save-btn').forEach(function(btn) {
                btn.addEventListener('click', async function() {
                    var prov = btn.dataset.provider;
                    var input = document.getElementById('apikey-' + prov);
                    var key = input ? input.value.trim() : '';
                    if (!key) { showToast('Please enter an API key'); return; }
                    if (API) {
                        var result = await API.saveApiKey(prov, key);
                        if (result && result.success) {
                            showToast('✅ ' + providerLabels[prov] + ' key saved');
                            input.value = '';
                            renderSettings();
                        } else {
                            showToast('⚠️ Failed: ' + (result.error || 'unknown'));
                        }
                    }
                });
            });

            // Wire up API key delete buttons
            document.querySelectorAll('.apikey-delete-btn').forEach(function(btn) {
                btn.addEventListener('click', async function() {
                    var prov = btn.dataset.provider;
                    if (API) {
                        var result = await API.deleteApiKey(prov);
                        if (result && result.success) {
                            showToast('🗑️ ' + providerLabels[prov] + ' key deleted');
                            renderSettings();
                        }
                    }
                });
            });
        }

        /* ═══════════════════════════════════════════════
           Remote Office Panel
           ═══════════════════════════════════════════════ */
        function openRemoteOverlay() {
            closeAllPanels();
            var overlay = document.getElementById('remoteOverlay');
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
            renderRemote();
        }

        async function renderRemote() {
            var body = document.getElementById('remoteBody');
            if (!body) return;

            var html = '<div style="margin-bottom:16px">';
            html += '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#8E8E93;font-weight:600;margin-bottom:12px">Fleet Network</div>';

            // This IS Sycopa HQ — show as home office with green status
            html += '<div class="remote-office-card" style="border:1.5px solid #34C75940;background:var(--bg-tertiary);">';
            html += '<div class="remote-office-header">';
            html += '<span class="remote-office-emoji">🎭</span>';
            html += '<div>';
            html += '<div class="remote-office-name">Sycopa HQ <span style="font-size:10px;font-weight:500;background:#34C75920;color:#34C759;border-radius:4px;padding:1px 6px;margin-left:6px;">This Office</span></div>';
            html += '<div class="remote-office-status online" style="color:#34C759;">● Online — Sycopa (CEO)</div>';
            html += '</div></div>';
            html += '<div style="font-size:12px;color:#8E8E93;padding:6px 0 0">fleet.spawnkit.ai • Hetzner node</div>';
            html += '</div>';

            // Fetch remote offices from API
            try {
                var apiUrl = window.OC_API_URL || (window.location.hostname.includes('spawnkit.ai') ? window.location.origin : 'http://127.0.0.1:8222');
                var resp = await skFetch(apiUrl + '/api/remote/offices');
                if (resp.ok) {
                    var data = await resp.json();
                    var remoteOffices = data.offices || [];
                    if (remoteOffices.length > 0) {
                        remoteOffices.forEach(function(office) {
                            var statusClass = (office.status === 'online') ? 'online' : 'offline';
                            var statusText = (office.status === 'online') ? '● Online' : '○ Offline';
                            var statusColor = (office.status === 'online') ? '#34C759' : '#8E8E93';
                            html += '<div class="remote-office-card" style="margin-top:8px;">';
                            html += '<div class="remote-office-header">';
                            html += '<span class="remote-office-emoji">' + esc(office.emoji || '🏢') + '</span>';
                            html += '<div><div class="remote-office-name">' + esc(office.name || office.id || 'Remote Office') + '</div>';
                            html += '<div class="remote-office-status ' + statusClass + '" style="color:' + statusColor + ';">' + statusText + '</div></div>';
                            html += '</div>';
                            if (office.agents && office.agents.length > 0) {
                                html += '<div style="font-size:12px;color:#8E8E93;margin-top:6px;">' + office.agents.length + ' agent(s)</div>';
                            }
                            if (office.lastSeen) {
                                html += '<div style="font-size:11px;color:var(--text-tertiary);margin-top:4px;">Last seen: ' + new Date(office.lastSeen).toLocaleTimeString() + '</div>';
                            }
                            html += '</div>';
                        });
                    }

                    // Show recent inter-office messages
                    var recentMessages = data.recentMessages || [];
                    html += '</div>';
                    html += '<div style="margin-bottom:16px">';
                    html += '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#8E8E93;font-weight:600;margin-bottom:12px">Inter-Office Messages</div>';
                    if (recentMessages.length === 0) {
                        html += '<div style="padding:20px;text-align:center;color:#8E8E93;font-size:13px">📭 No inter-office messages yet<br><span style="font-size:11px;margin-top:4px;display:block;">Relay messages via Mission Control</span></div>';
                    } else {
                        recentMessages.slice(0, 10).forEach(function(msg) {
                            html += '<div class="remote-message">';
                            html += '<div class="remote-message-from">' + esc(msg.from || 'Unknown') + ' → ' + esc(msg.to || 'HQ') + '</div>';
                            html += '<div class="remote-message-text">' + esc((msg.message || msg.text || '').substring(0, 200)) + '</div>';
                            if (msg.timestamp) {
                                html += '<div class="remote-message-time">' + new Date(msg.timestamp).toLocaleTimeString() + '</div>';
                            }
                            html += '</div>';
                        });
                    }
                    html += '</div>';
                    body.innerHTML = html;
                    return;
                }
            } catch(e) { console.warn('[Remote] fetch failed:', e); }

            // Fallback: no API
            html += '</div>';
            html += '<div style="padding:16px;text-align:center;color:#8E8E93;font-size:13px;">📡 Fetching fleet status…</div>';
            body.innerHTML = html;
        }

        // Helper: escape HTML (if not already defined)
        function esc(s) {
            if (typeof s !== 'string') return '';
            return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        }

        // Wire up remote button + close handlers
        document.getElementById('remoteBtn').addEventListener('click', openRemoteOverlay);
        document.getElementById('remoteBackdrop').addEventListener('click', closeRemotePanel);
        document.getElementById('remoteClose').addEventListener('click', closeRemotePanel);

        /* ═══════════════════════════════════════════════
           Decommission Animation (NEW #7)
           ═══════════════════════════════════════════════ */
        var previousSubagentIds = new Set();
        
        function checkForDecommissions() {
            if (!API) return;
            API.getSessions().then(function(sessions) {
                var currentIds = new Set((sessions.subagents || []).filter(function(sa) { return sa.status === 'running'; }).map(function(sa) { return sa.id; }));
                
                // Find decommissioned (was running, now gone)
                previousSubagentIds.forEach(function(oldId) {
                    if (!currentIds.has(oldId)) {
                        // Find the name from previous data
                        var sa = (sessions.subagents || []).find(function(s) { return s.id === oldId; });
                        var name = sa ? (sa.name || sa.label || oldId) : oldId;
                        triggerDecommission(name);
                    }
                });
                
                previousSubagentIds = currentIds;
            }).catch(function() {});
        }
        
        function triggerDecommission(agentName) {
            // Show toast
            showToast('🔥 ' + agentName + ' decommissioned');
            
            // Find and animate any matching org-sub-card
            document.querySelectorAll('.org-sub-card').forEach(function(card) {
                var nameEl = card.querySelector('.sub-agent-name');
                if (nameEl && nameEl.textContent.toLowerCase().includes(agentName.toLowerCase().split('-')[0])) {
                    card.classList.add('decommission-anim');
                    
                    // Add particles
                    var rect = card.getBoundingClientRect();
                    for (var p = 0; p < 8; p++) {
                        var particle = document.createElement('div');
                        particle.className = 'decommission-particle';
                        particle.style.left = (rect.left + Math.random() * rect.width) + 'px';
                        particle.style.top = (rect.top + Math.random() * rect.height) + 'px';
                        particle.style.animationDelay = (Math.random() * 200) + 'ms';
                        document.body.appendChild(particle);
                        setTimeout(function() { particle.remove(); }, 800);
                    }
                    
                    // Remove card after animation
                    setTimeout(function() { card.remove(); }, 800);
                }
            });
        }
        
        // Check for decommissions every 10s
        setInterval(checkForDecommissions, 10000);
        // Initialize the set
        if (API) {
            API.getSessions().then(function(sessions) {
                (sessions.subagents || []).filter(function(sa) { return sa.status === 'running'; }).forEach(function(sa) {
                    previousSubagentIds.add(sa.id);
                });
            }).catch(function() {});
        }

        /* ═══════════════════════════════════════════════
           Update meeting room preview on load (FIX #7)
           ═══════════════════════════════════════════════ */
        async function updateMeetingPreview() {
            var preview = document.getElementById('meetingPreview');
            var count = document.getElementById('meetingCount');
            if (!preview || !API) return;
            
            try {
                var active = await API.getActiveSubagents();
                if (active && active.length > 0) {
                    if (count) count.textContent = active.length;
                    preview.innerHTML = active.slice(0, 2).map(function(sa) {
                        return '<div class="meeting-active">🔴 ' + esc(sa.label || 'sub-agent') + '</div>';
                    }).join('');
                    if (active.length > 2) {
                        preview.innerHTML += '<div class="meeting-active" style="opacity:0.6">+' + (active.length - 2) + ' more</div>';
                    }
                } else {
                    if (count) count.textContent = '0';
                    preview.innerHTML = '<div class="meeting-active" style="opacity:0.5">💤 No active sessions</div>';
                }
            } catch(e) {
                preview.innerHTML = '<div class="meeting-active" style="opacity:0.5">—</div>';
            }
        }
        updateMeetingPreview();
        setInterval(updateMeetingPreview, 15000);

        /* Update closeAllPanels to include new panels */
        var _origCloseAll = closeAllPanels;
        closeAllPanels = function() {
            _origCloseAll();
            closeMissionsPanel();
            closeSettingsPanel();
        };

        /* ═══════════════════════════════════════════════
           Fleet Communication Animation System
           ═══════════════════════════════════════════════ */
        
        // CEO → C-Level Request Pulse Animation
        window.animateCEOToAgent = function(targetRoomClass) {
            const ceoRoom = document.querySelector('.exec-room--ceo');
            const targetRoom = document.querySelector('.' + targetRoomClass);
            if (!ceoRoom || !targetRoom) return;
            
            // Get positions
            const ceoRect = ceoRoom.getBoundingClientRect();
            const targetRect = targetRoom.getBoundingClientRect();
            
            // Calculate distance and position
            const startX = ceoRect.left + ceoRect.width / 2;
            const startY = ceoRect.bottom - 10;
            const targetX = targetRect.left + targetRect.width / 2;
            const targetY = targetRect.top + 10;
            
            const distance = Math.sqrt(Math.pow(targetX - startX, 2) + Math.pow(targetY - startY, 2));
            
            // Create pulse dot
            const dot = document.createElement('div');
            dot.className = 'fleet-pulse-dot';
            dot.style.left = startX + 'px';
            dot.style.top = startY + 'px';
            dot.style.setProperty('--pulse-distance', (targetY - startY) + 'px');
            
            document.body.appendChild(dot);
            
            // Animate towards target
            setTimeout(() => {
                dot.style.left = targetX + 'px';
                dot.style.top = targetY + 'px';
            }, 50);
            
            // Add glow to target room when pulse arrives
            setTimeout(() => {
                targetRoom.classList.add('tile-receiving');
                setTimeout(() => targetRoom.classList.remove('tile-receiving'), 1000);
            }, 600);
            
            // Clean up pulse dot
            setTimeout(() => {
                if (dot.parentNode) dot.remove();
            }, 1000);
        };

        // C-Level → Sub-Agent Spawn Ripple Animation  
        window.animateSpawnRipple = function(roomClass) {
            const room = document.querySelector('.' + roomClass);
            if (!room) return;
            
            const ripple = document.createElement('div');
            ripple.className = 'spawn-ripple';
            room.appendChild(ripple);
            
            // Change status dot to busy during spawn
            const statusDot = room.querySelector('.agent-status-dot');
            if (statusDot) {
                const originalClass = statusDot.className;
                statusDot.className = 'agent-status-dot agent-status-dot--busy';
                setTimeout(() => {
                    statusDot.className = originalClass;
                }, 2000);
            }
            
            // Clean up ripple
            setTimeout(() => ripple.remove(), 800);
        };

        // Remote Office → Agent Communication Streak
        window.animateRemoteIncoming = function(targetRoomClass) {
            const targetRoom = document.querySelector('.' + targetRoomClass);
            if (!targetRoom) return;
            
            const targetRect = targetRoom.getBoundingClientRect();
            
            const streak = document.createElement('div');
            streak.className = 'remote-streak';
            streak.style.top = (targetRect.top + targetRect.height / 2) + 'px';
            streak.style.right = '0px';
            streak.style.width = (window.innerWidth - targetRect.right + 50) + 'px';
            
            document.body.appendChild(streak);
            
            // Animate towards target
            setTimeout(() => {
                streak.style.right = (window.innerWidth - targetRect.right) + 'px';
            }, 50);
            
            // Add glow to target room when streak arrives
            setTimeout(() => {
                targetRoom.classList.add('tile-receiving');
                setTimeout(() => targetRoom.classList.remove('tile-receiving'), 1000);
            }, 800);
            
            // Clean up streak
            setTimeout(() => {
                if (streak.parentNode) streak.remove();
            }, 1200);
        };

        // Demo: Random Fleet Activity Animations
        window.startFleetAnimations = function() {
            const agents = ['atlas', 'forge', 'hunter', 'echo', 'sentinel'];
            
            function triggerRandomAnimation() {
                const action = Math.random();
                const agent = agents[Math.floor(Math.random() * agents.length)];
                
                if (action < 0.4) {
                    // CEO sends request to C-level (40% chance)
                    animateCEOToAgent('exec-room--' + agent);
                } else if (action < 0.7) {
                    // C-level spawns sub-agent (30% chance)
                    animateSpawnRipple('exec-room--' + agent);
                } else {
                    // Remote communication (30% chance)
                    animateRemoteIncoming('exec-room--' + agent);
                }
            }
            
            // Start with initial animation after 2 seconds
            setTimeout(triggerRandomAnimation, 2000);
            
            // Then continue with random intervals between 4-8 seconds
            setInterval(triggerRandomAnimation, 4000 + Math.random() * 4000);
        };

        document.addEventListener('DOMContentLoaded', function() {
            if (typeof SpawnKitUX !== 'undefined') {
                SpawnKitUX.init({ theme: 'executive' });
            }
            if (typeof OpenClawHelpers !== 'undefined') {
                OpenClawHelpers.init({ theme: 'executive' });
            }
            if (typeof initThemeSwitcher === 'function') {
                initThemeSwitcher();
            }
            if (typeof SpawnKitUX !== 'undefined') {
                SpawnKitUX.ready();
            }
            
            // Start fleet communication animations
            startFleetAnimations();

            // Fleet client auto-refresh
            if (window.FleetClient) {
                FleetClient.on('office:update', function() {
                    if (document.getElementById('remoteOverlay') && document.getElementById('remoteOverlay').classList.contains('open')) {
                        renderRemote();
                    }
                });
                FleetClient.on('message:new', function(msg) {
                    var fromName = (msg.message && msg.message.from) || (msg.from) || 'Remote Office';
                    var msgText = (msg.message && msg.message.text) || (msg.text) || 'New fleet message';
                    var msgTime = (msg.message && msg.message.time) || new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
                    
                    showToast('📬 New message from ' + fromName);
                    
                    // Add to LIVE_MESSAGES for inbox display
                    if (typeof LIVE_MESSAGES !== 'undefined') {
                        LIVE_MESSAGES.unshift({
                            sender: fromName,
                            color: '#BF5AF2',
                            time: msgTime,
                            text: msgText,
                            read: false,
                            fleet: true,
                            priority: (msg.message && msg.message.priority) || 'medium'
                        });
                        // Re-render messages if mailbox is open
                        if (typeof renderMessages === 'function') {
                            renderMessages(LIVE_MESSAGES);
                        }
                        // Update badge
                        if (typeof updateMailboxBadge === 'function') {
                            updateMailboxBadge();
                        }
                    }
                    
                    if (document.getElementById('remoteOverlay') && document.getElementById('remoteOverlay').classList.contains('open')) {
                        renderRemote();
                    }
                });
                
                // Also check for unread count from fleet welcome
                var fleetMailbox = FleetClient.getMailbox ? FleetClient.getMailbox() : [];
                if (fleetMailbox.length > 0 && typeof LIVE_MESSAGES !== 'undefined') {
                    fleetMailbox.forEach(function(fm) {
                        var exists = LIVE_MESSAGES.some(function(m) { return m.text === (fm.text || fm.content); });
                        if (!exists) {
                            LIVE_MESSAGES.unshift({
                                sender: fm.from || fm.sender || 'Fleet',
                                color: '#BF5AF2',
                                time: fm.time || 'Earlier',
                                text: fm.text || fm.content || 'Fleet message',
                                read: fm.read || false,
                                fleet: true
                            });
                        }
                    });
                    if (typeof renderMessages === 'function') renderMessages(LIVE_MESSAGES);
                    if (typeof updateMailboxBadge === 'function') updateMailboxBadge();
                }
            }
        });

        } catch(e) {
            console.error('SpawnKit Executive initialization error:', e);
            // Safe error message escaping (fallback if esc() fails)
            var errorMsg = e.message ? String(e.message).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : 'Unknown error';
            document.body.innerHTML = '<div style="padding:40px;text-align:center;font-family:system-ui"><h2>⚠️ SpawnKit failed to load</h2><p style="color:#666">Please refresh the page. Error: ' + errorMsg + '</p></div>';
        }
    })();

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

    function openMarketplace() {
        var overlay = document.getElementById('marketplaceOverlay');
        if (!overlay) return;
        // Close other overlays first
        ['skillsOverlay', 'creatorProfileOverlay'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.classList.remove('open');
        });
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

    function openSkills() {
        var overlay = document.getElementById('skillsOverlay');
        if (!overlay) return;
        ['marketplaceOverlay', 'creatorProfileOverlay'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.classList.remove('open');
        });
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

/* ═══════════════════════════════════════════════════════════════
   FEATURE 5: Creator Profile
   ═══════════════════════════════════════════════════════════════ */
(function() {
    'use strict';

    function escCp(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    function getVillageName() {
        return localStorage.getItem('spawnkit-village-name') || 'My Village';
    }
    function setVillageName(name) {
        localStorage.setItem('spawnkit-village-name', name);
    }
    function getOwnerName() {
        try {
            var cfg = JSON.parse(localStorage.getItem('spawnkit-config') || '{}');
            return cfg.userName || cfg.ownerName || cfg.name || 'Village Owner';
        } catch(e) { return 'Village Owner'; }
    }
    function getCreatedDate() {
        var ts = localStorage.getItem('spawnkit-created');
        if (!ts) {
            ts = new Date().toISOString();
            localStorage.setItem('spawnkit-created', ts);
        }
        try {
            return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        } catch(e) { return ts.substring(0, 10); }
    }

    function renderCreatorProfile() {
        var body = document.getElementById('creatorProfileBody');
        if (!body) return;
        var villageName = getVillageName();
        var ownerName = getOwnerName();
        var createdDate = getCreatedDate();
        var initial = villageName.charAt(0).toUpperCase() || '🏡';

        var html = '';
        html += '<div class="cp-avatar-row">';
        html += '<div class="cp-avatar-circle">' + escCp(initial) + '</div>';
        html += '<div>';
        html += '<div class="cp-village-name">' + escCp(villageName) + '</div>';
        html += '<div class="cp-village-sub">SpawnKit Village</div>';
        html += '</div></div>';

        html += '<div class="cp-row"><span class="cp-row-label">Village Name</span>';
        html += '<input class="cp-edit-input" id="cpVillageNameInput" type="text" value="' + escCp(villageName) + '" placeholder="My Village" /></div>';

        html += '<div class="cp-row"><span class="cp-row-label">Owner</span>';
        html += '<span class="cp-row-value">' + escCp(ownerName) + '</span></div>';

        html += '<div class="cp-row"><span class="cp-row-label">Theme</span>';
        html += '<span class="cp-row-value">🏢 Executive</span></div>';

        html += '<div class="cp-row"><span class="cp-row-label">Created</span>';
        html += '<span class="cp-row-value">' + escCp(createdDate) + '</span></div>';

        html += '<button class="cp-share-btn" id="cpShareBtn">🔗 Share Village</button>';
        body.innerHTML = html;

        var nameInput = document.getElementById('cpVillageNameInput');
        if (nameInput) {
            nameInput.addEventListener('change', function() {
                var newName = nameInput.value.trim() || 'My Village';
                setVillageName(newName);
                var toast = document.getElementById('execToast');
                if (toast) {
                    toast.textContent = '✅ Village name saved!';
                    toast.classList.add('visible');
                    setTimeout(function() { toast.classList.remove('visible'); }, 2000);
                }
                renderCreatorProfile(); // Re-render to update avatar
            });
        }

        var shareBtn = document.getElementById('cpShareBtn');
        if (shareBtn) {
            shareBtn.addEventListener('click', function() {
                var shareUrl = window.location.origin + '/?village=' + encodeURIComponent(getVillageName());
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(shareUrl).then(function() {
                        var toast = document.getElementById('execToast');
                        if (toast) {
                            toast.textContent = '📋 Village URL copied to clipboard!';
                            toast.classList.add('visible');
                            setTimeout(function() { toast.classList.remove('visible'); }, 2500);
                        }
                    }).catch(function() {
                        prompt('Copy this village URL:', shareUrl);
                    });
                } else {
                    prompt('Copy this village URL:', shareUrl);
                }
            });
        }
    }

    function openCreatorProfile() {
        var overlay = document.getElementById('creatorProfileOverlay');
        if (!overlay) return;
        ['marketplaceOverlay', 'skillsOverlay'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.classList.remove('open');
        });
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        renderCreatorProfile();
    }
    function closeCreatorProfile() {
        var overlay = document.getElementById('creatorProfileOverlay');
        if (overlay) overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    // Expose globally so settings panel can open it if desired
    window.openCreatorProfile = openCreatorProfile;

    document.addEventListener('DOMContentLoaded', function() {
        var closeBtn = document.getElementById('creatorProfileClose');
        if (closeBtn) closeBtn.addEventListener('click', closeCreatorProfile);
        var backdrop = document.getElementById('creatorProfileBackdrop');
        if (backdrop) backdrop.addEventListener('click', closeCreatorProfile);
    });
})();
