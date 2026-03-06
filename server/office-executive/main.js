    // Read config from setup wizard (if available)
    try {
      const setupConfig = JSON.parse(localStorage.getItem('spawnkit-config') || '{}');
      if (setupConfig.userName) {
        document.addEventListener('DOMContentLoaded', () => {
          const ceoNames = document.querySelectorAll('[data-agent="ceo"] .agent-name, .ceo-name');
          ceoNames.forEach(el => el.textContent = setupConfig.userName);
        });
      }
      if (setupConfig.ceoName) {
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
           Configuration & Shared State
           ═══════════════════════════════════════════════ */

        var setupConfig = {};
        try {
            setupConfig = JSON.parse(localStorage.getItem('spawnkit-config') || '{}');
        } catch(e) {}

        var ceoName = setupConfig.userName || 'ApoMac';

        var API = (typeof window.spawnkitAPI !== 'undefined') ? window.spawnkitAPI : null;

        API = {
            async isAvailable() { return true; },
            async getAgentInfo(agentId) {
                return { soul: 'Agent personality and traits would appear here.' };
            },
            async listAvailableSkills() {
                return [
                    { name: '\ud83d\udd0d Web Search', description: 'Search the web for information' },
                    { name: '\ud83d\udcdd Note Taking', description: 'Take and manage notes' },
                    { name: '\ud83c\udfaf Task Planning', description: 'Plan and organize tasks' }
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
                return {};
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
                    var apiUrl = window.OC_API_URL || (window.location.origin);
                    var resp = await fetch(apiUrl + '/api/oc/chat');
                    if (!resp.ok) return [];
                    var data = await resp.json();
                    return Array.isArray(data) ? data : (data.messages || []);
                } catch(e) { console.warn('getTranscript error:', e); return []; }
            }
        };

        var AGENTS = {
            ceo:      { name: setupConfig.userName || 'ApoMac', role: setupConfig.ceoName || 'CEO', color: '#007AFF', status: 'active', task: 'Orchestrating fleet operations' },
            atlas:    { name: 'Atlas',    role: 'COO',           color: '#BF5AF2', status: 'idle', task: '' },
            forge:    { name: 'Forge',    role: 'CTO',           color: '#FF9F0A', status: 'idle', task: '' },
            hunter:   { name: 'Hunter',   role: 'CRO',           color: '#FF453A', status: 'idle', task: '' },
            echo:     { name: 'Echo',     role: 'CMO',           color: '#0A84FF', status: 'idle', task: '' },
            sentinel: { name: 'Sentinel', role: 'QA & Security', color: '#30D158', status: 'idle', task: '' },
        };

        var DEFAULT_SKILLS = {
            ceo:      ['\ud83c\udfaf Orchestration', '\ud83d\udcca Strategy', '\ud83d\udd2e Vision', '\ud83d\udc65 Leadership'],
            atlas:    ['\u2699\ufe0f Operations', '\ud83d\udccb Process', '\ud83d\udcdd Docs', '\ud83d\udd04 Workflows'],
            forge:    ['\ud83d\udee0\ufe0f Engineering', '\ud83d\udd12 Security', '\ud83c\udfd7\ufe0f Architecture', '\u26a1 Perf'],
            hunter:   ['\ud83d\udcb0 Revenue', '\ud83d\udcc8 Growth', '\ud83c\udfaf Sales', '\ud83d\udd0d Research'],
            echo:     ['\ud83c\udfa8 Brand', '\ud83d\udcf1 Content', '\ud83c\udfac Video', '\u270d\ufe0f Copy'],
            sentinel: ['\ud83d\udee1\ufe0f Audit', '\u2705 QA', '\u26a0\ufe0f Risk', '\ud83d\udd0d Review']
        };

        /* Live data caches */
        var liveSessionData = null;
        var liveCronData = null;
        var liveMemoryData = null;

        function initOcStoreSubscription() {
            if (window.OcStore) {
                window.OcStore.subscribe(function(data) {
                    liveCronData = data.crons;
                    liveMemoryData = data.memory;
                    liveSessionData = data.sessions;
                    window.Exec.sessionData = liveSessionData;
                    window.Exec.cronData = liveCronData;
                    window.Exec.memoryData = liveMemoryData;
                });
            } else {
                document.addEventListener('DOMContentLoaded', initOcStoreSubscription);
            }
        }
        initOcStoreSubscription();

        var AVATAR_MAP = {
            'ApoMac': 'avatar-ceo',
            [ceoName]: 'avatar-ceo',
            'Atlas': 'avatar-atlas',
            'Forge': 'avatar-forge',
            'Hunter': 'avatar-hunter',
            'Echo': 'avatar-echo',
            'Sentinel': 'avatar-sentinel'
        };

        var LIVE_MESSAGES = [];

        /* ═══════════════════════════════════════════════
           Utility Functions
           ═══════════════════════════════════════════════ */

        function esc(s) {
            if (typeof s !== 'string') return '';
            return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        }

        function md(s) {
            if (typeof s !== 'string') return '';
            s = s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
            s = s.replace(/```([\s\S]*?)```/g, '<pre style="background:rgba(255,255,255,0.06);padding:8px 12px;border-radius:8px;font-size:12px;overflow-x:auto;margin:6px 0"><code>$1</code></pre>');
            s = s.replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.08);padding:2px 5px;border-radius:4px;font-size:12px">$1</code>');
            s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
            s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
            s = s.replace(/^### (.+)$/gm, '<div style="font-weight:700;font-size:14px;margin:8px 0 4px">$1</div>');
            s = s.replace(/^## (.+)$/gm, '<div style="font-weight:700;font-size:15px;margin:8px 0 4px">$1</div>');
            s = s.replace(/^# (.+)$/gm, '<div style="font-weight:700;font-size:16px;margin:8px 0 4px">$1</div>');
            s = s.replace(/^[-*] (.+)$/gm, '<div style="padding-left:12px">\u2022 $1</div>');
            s = s.replace(/^(\d+)\. (.+)$/gm, '<div style="padding-left:12px">$1. $2</div>');
            s = s.replace(/\n/g, '<br>');
            return s;
        }

        function showToast(msg) {
            var t = document.getElementById('execToast');
            if (!t) return;
            t.textContent = msg;
            t.classList.add('show');
            clearTimeout(t._timer);
            t._timer = setTimeout(function() { t.classList.remove('show'); }, 2500);
        }

        /* ═══════════════════════════════════════════════
           Parse TODO.md & Load Live Agent Data
           ═══════════════════════════════════════════════ */

        function parseTodoMd(raw) {
            var lines = raw.split('\n');
            var todos = [];
            var nextTask = '';
            var inActive = false;
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                if (line.indexOf('>>> NEXT') >= 0) {
                    nextTask = line.replace(/.*>>> NEXT[:\s]*/i, '').trim() || (lines[i+1] || '').replace(/^[\-\*#]+\s*/, '').trim();
                }
                if (/^## .*Active/i.test(line)) { inActive = true; continue; }
                if (/^## /.test(line) && inActive) { inActive = false; }
                if (inActive) {
                    var done = /^\s*[-*]\s*[\u2705\u2714]|^\s*[-*]\s*\[x\]/i.test(line);
                    var open = /^\s*[-*]\s*[\u2B1C\u2610]|^\s*[-*]\s*\[ \]|^\s*[-*]\s*\*\*/.test(line);
                    if (done || open) {
                        var text = line.replace(/^\s*[-*]\s*[\u2705\u2714\u2B1C\u2610\uD83D\uDD04]\s*|^\s*[-*]\s*\[.?\]\s*/u, '').replace(/\*\*/g, '').trim();
                        if (text) {
                            todos.push({
                                icon: done ? '\u2705' : '\u2B1C',
                                text: text.substring(0, 80),
                                status: done ? 'done' : 'pending'
                            });
                        }
                    }
                }
            }
            return { nextTask: nextTask, todos: todos.slice(0, 15) };
        }

        var LIVE_AGENT_DATA = {};

        async function loadLiveAgentData() {
            var agentIds = ['ceo', 'atlas', 'forge', 'hunter', 'echo', 'sentinel'];

            if (!window.spawnkitAPI || !await window.spawnkitAPI.isAvailable()) {
                var todoRaw = window.SpawnKit && window.SpawnKit.data && window.SpawnKit.data.todo;
                if (todoRaw) {
                    console.debug('\ud83c\udfe2 [Executive] Parsing TODO.md from data-bridge');
                    var parsed = parseTodoMd(todoRaw);
                    LIVE_AGENT_DATA = {};
                    agentIds.forEach(function(id) {
                        LIVE_AGENT_DATA[id] = { currentTask: parsed.nextTask || 'See TODO.md', todos: parsed.todos, skills: [] };
                    });
                    window.Exec.LIVE_AGENT_DATA = LIVE_AGENT_DATA;
                    return;
                }
                console.debug('\ud83c\udfe2 [Executive] No live data \u2014 showing empty state');
                LIVE_AGENT_DATA = {};
                agentIds.forEach(function(id) {
                    LIVE_AGENT_DATA[id] = { currentTask: 'Connect to OpenClaw for live data', todos: [], skills: [] };
                });
                window.Exec.LIVE_AGENT_DATA = LIVE_AGENT_DATA;
                return;
            }

            try {
                var todoPromises = agentIds.map(function(id) { return window.spawnkitAPI.getAgentTodos(id); });
                var skillPromises = agentIds.map(function(id) { return window.spawnkitAPI.getAgentSkills(id); });
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
                console.debug('\ud83c\udfe2 [Executive] Loaded REAL per-agent data for', Object.keys(LIVE_AGENT_DATA).length, 'agents');
                window.Exec.LIVE_AGENT_DATA = LIVE_AGENT_DATA;
            } catch (e) {
                console.warn('\ud83c\udfe2 [Executive] Failed to load agent data:', e);
                LIVE_AGENT_DATA = {};
                agentIds.forEach(function(id) {
                    LIVE_AGENT_DATA[id] = { currentTask: 'Error loading data', todos: [], skills: [] };
                });
                window.Exec.LIVE_AGENT_DATA = LIVE_AGENT_DATA;
            }
        }

        /* ═══════════════════════════════════════════════
           Exec Namespace — Shared state for modules
           ═══════════════════════════════════════════════ */

        window.Exec = {
            AGENTS: AGENTS,
            API: API,
            DEFAULT_SKILLS: DEFAULT_SKILLS,
            AVATAR_MAP: AVATAR_MAP,
            LIVE_MESSAGES: LIVE_MESSAGES,
            LIVE_AGENT_DATA: LIVE_AGENT_DATA,
            sessionData: liveSessionData,
            cronData: liveCronData,
            memoryData: liveMemoryData,
            esc: esc,
            md: md,
            showToast: showToast,
            parseTodoMd: parseTodoMd,
            loadLiveAgentData: loadLiveAgentData
        };

        /* ═══════════════════════════════════════════════
           Close All Panels
           ═══════════════════════════════════════════════ */

        window.closeAllPanels = function closeAllPanels() {
            if (typeof window.closeMailbox === 'function') window.closeMailbox();
            if (typeof window.closeTodoPanel === 'function') window.closeTodoPanel();
            if (typeof window.closeMeetingPanel === 'function') window.closeMeetingPanel();
            if (typeof window.closeDetailPanel === 'function') window.closeDetailPanel();
            if (typeof window.closeChatPanel === 'function') window.closeChatPanel();
            if (typeof window.closeCronPanel === 'function') window.closeCronPanel();
            if (typeof window.closeMemoryPanel === 'function') window.closeMemoryPanel();
            var remoteOl = document.getElementById('remoteOverlay');
            if (remoteOl) { remoteOl.classList.remove('open'); document.body.style.overflow = ''; }
            if (typeof window.closeMissionsPanel === 'function') window.closeMissionsPanel();
            if (typeof window.closeSettingsPanel === 'function') window.closeSettingsPanel();
            if (typeof window.closeChatHistory === 'function') window.closeChatHistory();
            if (typeof window.closeMarketplace === 'function') window.closeMarketplace();
            if (typeof window.closeSkills === 'function') window.closeSkills();
            if (typeof window.closeCreatorProfile === 'function') window.closeCreatorProfile();
            var orchOl = document.getElementById('orchestrationOverlay'); if (orchOl) orchOl.classList.remove('open');
            var addOl = document.getElementById('addAgentOverlay'); if (addOl) addOl.classList.remove('open');
            document.body.style.overflow = '';
            if (window.SetupWizard && typeof window.SetupWizard.close === 'function') window.SetupWizard.close();
            if (window.SkillForge && typeof window.SkillForge.close === 'function') window.SkillForge.close();
            if (window.SkillMarketplace && typeof window.SkillMarketplace.close === 'function') window.SkillMarketplace.close();
            var dbOl = document.getElementById('dailyBriefOverlay'); if (dbOl) dbOl.remove();
            document.querySelectorAll('.uce-overlay').forEach(function(el) { el.remove(); });
        };

        /* ═══════════════════════════════════════════════
           Escape Key — Close topmost overlay
           ═══════════════════════════════════════════════ */

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                var checks = [
                    ['chatHistoryOverlay', 'closeChatHistory'],
                    ['remoteOverlay',      'closeRemotePanel'],
                    ['missionsOverlay',    'closeMissionsPanel'],
                    ['settingsOverlay',    'closeSettingsPanel'],
                    ['chatOverlay',        'closeChatPanel'],
                    ['cronOverlay',        'closeCronPanel'],
                    ['memoryOverlay',      'closeMemoryPanel'],
                    ['detailOverlay',      'closeDetailPanel'],
                    ['todoOverlay',        'closeTodoPanel'],
                    ['meetingOverlay',     'closeMeetingPanel'],
                    ['mailboxOverlay',     'closeMailbox']
                ];
                for (var i = 0; i < checks.length; i++) {
                    var el = document.getElementById(checks[i][0]);
                    if (el && el.classList.contains('open')) {
                        var fn = window[checks[i][1]];
                        if (typeof fn === 'function') fn();
                        return;
                    }
                }
            }
        });

        /* ═══════════════════════════════════════════════
           postMessage Bridge
           ═══════════════════════════════════════════════ */

        window.addEventListener('message', function(e) {
            if (!e.data || typeof e.data !== 'object') return;
            var isSameOrigin = (e.origin === window.location.origin || e.origin === 'null');
            if (!isSameOrigin) return;

            switch (e.data.type) {
                case 'spawnkit:data':
                    handleDataUpdate(e.data.payload);
                    break;
                case 'spawnkit:messages':
                    handleMessagesUpdate(e.data.messages);
                    break;
                case 'spawnkit:theme':
                    break;
                case 'spawnkit:ping':
                    if (window.parent !== window) {
                        window.parent.postMessage({ type: 'executive:pong', theme: 'executive', timestamp: Date.now() }, '*');
                    }
                    break;
            }
        });

        function handleDataUpdate(payload) {
            if (!payload) return;
            if (payload.agents) {
                var count = payload.agents.length;
                var el = document.getElementById('statusAgentCount');
                if (el) el.textContent = count + ' Agent' + (count !== 1 ? 's' : '');
            }
        }

        function handleMessagesUpdate(messages) {
            if (!messages || !Array.isArray(messages)) return;
            if (typeof window.renderMessages === 'function') window.renderMessages(messages);
            var badge = document.getElementById('mailboxBadge');
            if (badge) badge.textContent = messages.length;
        }

        /* ═══════════════════════════════════════════════
           Status Bar Clock
           ═══════════════════════════════════════════════ */

        function updateClock() {
            var now = new Date();
            var h = now.getHours().toString().padStart(2, '0');
            var m = now.getMinutes().toString().padStart(2, '0');
            var statusEl = document.getElementById('statusSystem');
            if (statusEl) statusEl.textContent = 'All systems nominal \u2022 ' + h + ':' + m;
        }
        updateClock();
        setInterval(updateClock, 30000);

        /* ═══════════════════════════════════════════════
           Readiness & Exports
           ═══════════════════════════════════════════════ */

        if (window.parent !== window) {
            window.parent.postMessage({ type: 'executive:ready', theme: 'executive', timestamp: Date.now() }, '*');
        }

        window.__EXEC_THEME = 'executive';
        window.showToast = showToast;

        /* ═══════════════════════════════════════════════
           DOMContentLoaded — Init & FleetClient
           ═══════════════════════════════════════════════ */

        document.addEventListener('DOMContentLoaded', function() {
            if (typeof SpawnKitUX !== 'undefined') SpawnKitUX.init({ theme: 'executive' });
            if (typeof OpenClawHelpers !== 'undefined') OpenClawHelpers.init({ theme: 'executive' });
            if (typeof initThemeSwitcher === 'function') initThemeSwitcher();
            if (typeof SpawnKitUX !== 'undefined') SpawnKitUX.ready();

            if (window.FleetClient) {
                FleetClient.on('office:update', function() {
                    var remoteOl = document.getElementById('remoteOverlay');
                    if (remoteOl && remoteOl.classList.contains('open') && typeof window.renderRemote === 'function') {
                        window.renderRemote();
                    }
                });
                FleetClient.on('message:new', function(msg) {
                    var fromName = (msg.message && msg.message.from) || (msg.from) || 'Remote Office';
                    var msgText = (msg.message && msg.message.text) || (msg.text) || 'New fleet message';
                    var msgTime = (msg.message && msg.message.time) || new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
                    showToast('\ud83d\udcec New message from ' + fromName);
                    var msgs = window.Exec.LIVE_MESSAGES;
                    if (msgs) {
                        msgs.unshift({ sender: fromName, color: '#BF5AF2', time: msgTime, text: msgText, read: false, fleet: true, priority: (msg.message && msg.message.priority) || 'medium' });
                        if (typeof window.renderMessages === 'function') window.renderMessages(msgs);
                        if (typeof window.updateMailboxBadge === 'function') window.updateMailboxBadge();
                    }
                    var remoteOl = document.getElementById('remoteOverlay');
                    if (remoteOl && remoteOl.classList.contains('open') && typeof window.renderRemote === 'function') {
                        window.renderRemote();
                    }
                });
                var fleetMailbox = FleetClient.getMailbox ? FleetClient.getMailbox() : [];
                var msgs = window.Exec.LIVE_MESSAGES;
                if (fleetMailbox.length > 0 && msgs) {
                    fleetMailbox.forEach(function(fm) {
                        var exists = msgs.some(function(m) { return m.text === (fm.text || fm.content); });
                        if (!exists) {
                            msgs.unshift({ sender: fm.from || fm.sender || 'Fleet', color: '#BF5AF2', time: fm.time || 'Earlier', text: fm.text || fm.content || 'Fleet message', read: fm.read || false, fleet: true });
                        }
                    });
                    if (typeof window.renderMessages === 'function') window.renderMessages(msgs);
                    if (typeof window.updateMailboxBadge === 'function') window.updateMailboxBadge();
                }
            }
        });

        } catch(e) {
            console.error('SpawnKit Executive initialization error:', e);
            var errorMsg = e.message ? String(e.message).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : 'Unknown error';
            document.body.textContent = 'SpawnKit failed to load. Please refresh the page. Error: ' + (e.message || 'Unknown error');
        }
    })();
