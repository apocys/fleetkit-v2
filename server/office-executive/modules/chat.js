/* ═══════════════════════════════════════════════
   SpawnKit Executive — Communications & Chat
   (Mailbox, Chat Tab, Messages, Activity)
   ═══════════════════════════════════════════════ */
(function() {
    'use strict';
    var E = window.Exec;
    var AGENTS = E.AGENTS;
    var API = E.API;
    var AVATAR_MAP = E.AVATAR_MAP;
    var esc = E.esc;
    var showToast = E.showToast;

    // DOM refs
    var mailboxBtn      = document.getElementById('mailboxBtn');
    var mailboxOverlay  = document.getElementById('mailboxOverlay');
    var mailboxBackdrop = document.getElementById('mailboxBackdrop');
    var mailboxClose    = document.getElementById('mailboxClose');
    var mailboxMessages = document.getElementById('mailboxMessages');

    // Local chat history (persisted to localStorage)
    var chatHistory = JSON.parse(localStorage.getItem('spawnkit-chat-history') || '[]');

    // Tiny markdown renderer (self-contained)
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

    // Authenticated fetch helper (set on window by auth.js)
    var skFetch = window.skFetch || fetch;

    // CEO name from config
    var ceoName = (function() {
        try {
            var cfg = JSON.parse(localStorage.getItem('spawnkit-config') || '{}');
            return cfg.userName || 'ApoMac';
        } catch(e) { return 'ApoMac'; }
    })();

    /* ═══════════════════════════════════════════════
       CEO Communications Hub — Open / Close / Tabs
       ═══════════════════════════════════════════════ */

    function openMailbox(tab) {
        if (typeof tab === 'object') tab = undefined; // Handle event object
        window.closeAllPanels();
        mailboxOverlay.classList.add('open');

        // Always populate targets eagerly so "Loading targets..." is replaced
        loadChatTargets();

        // Switch to specified tab or default to Messages when opened via mailbox button
        if (tab === 'chat') {
            switchCommTab('chat');
            var chatInput = document.getElementById('chatTabInput');
            if (chatInput) chatInput.focus();
        } else {
            switchCommTab('messages'); // Default to Messages tab when opened via CEO mailbox button
            if (mailboxClose) mailboxClose.focus();
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
        document.querySelectorAll('.comm-tab').forEach(function(tab) {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            }
        });

        // Update tab content
        document.querySelectorAll('.comm-tab-content').forEach(function(content) {
            content.classList.remove('active');
        });

        var targetContent = document.getElementById(tabName + 'TabContent');
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
    document.getElementById('chatTab').addEventListener('click', function() { switchCommTab('chat'); });
    document.getElementById('messagesTab').addEventListener('click', function() { switchCommTab('messages'); });
    document.getElementById('activityTab').addEventListener('click', function() { switchCommTab('activity'); });

    if (mailboxBtn) mailboxBtn.addEventListener('click', function() { openMailbox('messages'); });
    if (mailboxBackdrop) mailboxBackdrop.addEventListener('click', closeMailbox);
    if (mailboxClose) mailboxClose.addEventListener('click', closeMailbox);

    /* Chat/Cron/Memory panels — see unified implementation below (Forge v3) */

    /* ── Update Mailbox Badge ───────────────────── */
    function updateMailboxBadge() {
        var messagesUnread = E.LIVE_MESSAGES.filter(function(msg) { return !msg.read; }).length;

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
            var apiUrl = window.OC_API_URL || (window.location.origin);
            var resp = await (window.skFetch || fetch)(apiUrl + '/api/remote/offices');
            if (resp.ok) {
                var data = await resp.json();
                var recentMessages = data.recentMessages || [];
                if (recentMessages.length > 0) {
                    E.LIVE_MESSAGES = recentMessages.map(function(msg, idx) {
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
                    renderMessages(E.LIVE_MESSAGES);
                    return;
                }
            }
        } catch(e) {
            console.warn('🏢 [Executive] Failed to load fleet relay messages:', e);
        }
        E.LIVE_MESSAGES = [{ sender: 'Fleet Relay', color: '#636366', time: 'Now', text: 'No inter-office messages yet', read: true }];
        renderMessages(E.LIVE_MESSAGES);
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
    E.loadLiveAgentData();

    // Re-load agent data when SpawnKit data bridge refreshes (fixes timing issue)
    if (window.SpawnKit && window.SpawnKit.on) {
        window.SpawnKit.on('data:refresh', function() {
            E.loadLiveAgentData();
        });
    }

    /* ═══════════════════════════════════════════════
       Chat Tab Functionality (integrated into Communications Hub)
       ═══════════════════════════════════════════════ */
    var chatTabMsgsEl = document.getElementById('chatTabMessages');
    var chatTabInput = document.getElementById('chatTabInput');
    var chatTabSendBtn = document.getElementById('chatTabSend');
    var chatTabEmptyEl = document.getElementById('chatTabEmpty');

    // Update chat button to open mailbox with chat tab
    document.getElementById('chatBtn').addEventListener('click', function() { openMailbox('chat'); });

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
    var currentChatTarget = 'ceo'; // Default target: CEO (ApoMac)
    var availableChatTargets = [
        { id: 'ceo', name: 'CEO (' + ceoName + ')', emoji: '🎭' },
        { id: 'apomac', name: 'ApoMac (Remote)', emoji: '🍎' }
    ];

    function loadChatTargets() {
        // Try to enrich targets from relay/data-bridge
        try {
            var agents = (window.SpawnKit && window.SpawnKit.data && window.SpawnKit.data.agents) || [];
            if (agents.length > 0) {
                availableChatTargets = agents.map(function(a) {
                    return { id: a.id, name: a.name + ' (' + (a.role || '') + ')', emoji: a.id === 'ceo' ? '\uD83C\uDFAD' : '\uD83E\uDD16' };
                });
            }
        } catch(e) {}
        updateChatTargetSelector();
    }

    function updateChatTargetSelector() {
        var select = document.getElementById('chatTargetSelect');
        var currentTargetEl = document.getElementById('chatCurrentTarget');

        if (!select) return;

        select.innerHTML = '';
        availableChatTargets.forEach(function(target) {
            var option = document.createElement('option');
            option.value = target.id;
            option.textContent = target.emoji + ' ' + target.name;
            if (target.id === currentChatTarget) {
                option.selected = true;
            }
            select.appendChild(option);
        });

        // Update current target display
        var target = availableChatTargets.find(function(t) { return t.id === currentChatTarget; });
        if (target && currentTargetEl) {
            var iconEl = currentTargetEl.querySelector('.target-icon');
            var nameEl = currentTargetEl.querySelector('.target-name');
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
                bodyHtml = '<div>' + md(preview) + '</div>';
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
        localStorage.setItem('spawnkit-chat-history', JSON.stringify(chatHistory.filter(function(m) { return !m.typing; }).slice(-50)));
        renderChatTabMessages();

        // Show typing indicator
        chatHistory.push({ role: 'ai', text: '⌛ Thinking...', time: timeStr, typing: true });
        renderChatTabMessages();

        try {
            // Send to local API bridge (primary) or fleet relay (fallback)
            var apiUrl = (window.OC_API_URL || (window.location.origin)) + '/api/oc/chat';
            var response = await (window.skFetch || fetch)(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    target: currentChatTarget
                })
            });

            // Remove typing indicator
            chatHistory = chatHistory.filter(function(msg) { return !msg.typing; });

            if (!response.ok) {
                var error = await response.text();
                chatHistory.push({ role: 'ai', text: '⚠️ Request failed: ' + error, time: timeStr });
                localStorage.setItem('spawnkit-chat-history', JSON.stringify(chatHistory.filter(function(m) { return !m.typing; }).slice(-50)));
                renderChatTabMessages();
                return;
            }

            var data = await response.json();
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
            localStorage.setItem('spawnkit-chat-history', JSON.stringify(chatHistory.filter(function(m) { return !m.typing; }).slice(-50)));
            renderChatTabMessages();

        } catch (err) {
            // Remove typing indicator
            chatHistory = chatHistory.filter(function(msg) { return !msg.typing; });
            chatHistory.push({ role: 'ai', text: '⚠️ Network error: ' + esc(err.message), time: timeStr });
            localStorage.setItem('spawnkit-chat-history', JSON.stringify(chatHistory.filter(function(m) { return !m.typing; }).slice(-50)));
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
        var targetSelect = document.getElementById('chatTargetSelect');
        if (targetSelect) {
            targetSelect.addEventListener('change', function() {
                currentChatTarget = this.value;
                updateChatTargetSelector();
                var targetObj = availableChatTargets.find(function(t) { return t.id === currentChatTarget; });
                showToast('Target changed to ' + (targetObj ? targetObj.name : currentChatTarget));
            });
        }
        // Populate default targets immediately so "Loading targets..." is replaced
        updateChatTargetSelector();
    });

    /* ── Chat History Functions ─────────────────── */
    async function openChatHistory() {
        var overlay = document.getElementById('chatHistoryOverlay');
        var body = document.getElementById('chatHistoryBody');

        if (!overlay || !body) return;

        window.closeAllPanels();
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
            var apiUrl = (window.OC_API_URL || (window.location.origin));

            // Try the dedicated chat history endpoint first
            var response = await (window.skFetch || fetch)(apiUrl + '/api/oc/chat/history');
            if (response.ok) {
                var data = await response.json();
                if (data.ok && data.history) {
                    combinedHistory = combinedHistory.concat(data.history);
                }
            }

            // 3. Use OcStore sessions for additional context (no extra fetch)
            var sessions = (window.OcStore && window.OcStore.sessions) || [];
            sessions.filter(function(s) { return s.status === 'active'; }).slice(0, 10).forEach(function(s) {
                combinedHistory.push({
                    role: 'assistant',
                    content: '📋 Session: ' + (s.label || s.displayName || s.key) + ' (' + s.model + ')',
                    timestamp: s.lastActive || Date.now(),
                    target: s.channel || 'system'
                });
            });
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
        var body = document.getElementById('chatHistoryBody');
        if (!body || !history.length) {
            if (body) body.innerHTML = '<div class="history-loading">No chat history found.</div>';
            return;
        }

        var html = '';
        history.forEach(function(msg) {
            var roleClass = msg.role === 'user' ? 'user' : 'assistant';
            var roleText = msg.role === 'user' ? 'User' : 'Assistant';
            var time = msg.timestamp ? new Date(msg.timestamp).toLocaleString() : 'Unknown';

            html += '<div class="history-message ' + roleClass + '">';
            html += '<div class="history-message-meta">';
            html += '<div class="history-message-role">' + roleText + '</div>';
            html += '<div class="history-message-time">' + esc(time) + '</div>';
            if (msg.target) {
                var target = availableChatTargets.find(function(t) { return t.id === msg.target; });
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
        var overlay = document.getElementById('chatHistoryOverlay');
        if (overlay) {
            overlay.classList.remove('open');
            document.body.style.overflow = '';
        }
    }

    // Wire up chat history events
    document.addEventListener('DOMContentLoaded', function() {
        var historyBtn = document.getElementById('chatHistoryBtn');
        var historyClose = document.getElementById('chatHistoryClose');
        var historyBackdrop = document.getElementById('chatHistoryBackdrop');

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
        var apiUrl = window.OC_API_URL || (window.location.origin);

        // Use OcStore sessions (no extra fetch)
        try {
            var sessData = (window.OcStore && window.OcStore.sessions) || [];
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
        } catch(e) { console.warn('[Activity] OcStore read:', e); }

        // Use OcStore crons (no extra fetch)
        try {
            var cronData = (window.OcStore && window.OcStore.crons) || {};
            var cronList = Array.isArray(cronData) ? cronData : (cronData.jobs || cronData.crons || []);
            cronList.forEach(function(c) {
                if (c.state && c.state.lastRunAtMs) {
                    activities.push({ time: new Date(c.state.lastRunAtMs), icon: '⏰', text: (c.name || 'Cron') + ' triggered' });
                }
            });
        } catch(e) { console.warn('[Activity] OcStore crons read:', e); }

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

    // Chat auto-refresh via OcStore (replaces dedicated 10s setInterval)
    function initChatRefresh() {
        if (window.OcStore) {
            window.OcStore.subscribe(function() {
                if (mailboxOverlay.classList.contains('open') && document.getElementById('chatTab').classList.contains('active')) {
                    loadChatTabTranscript();
                }
            });
        } else {
            document.addEventListener('DOMContentLoaded', initChatRefresh);
        }
    }
    initChatRefresh();

    // Keep legacy openChatPanel as alias for openMailbox('chat')
    function openChatPanel() {
        openMailbox('chat');
    }

    // Exports
    window.openMailbox = openMailbox;
    window.closeMailbox = closeMailbox;
    window.openChatPanel = openChatPanel;
    window.closeChatPanel = closeChatPanel;
    window.openChatHistory = openChatHistory;
    window.closeChatHistory = closeChatHistory;
    window.updateMailboxBadge = updateMailboxBadge;
    window.renderMessages = renderMessages;
    window.loadLiveMessages = loadLiveMessages;
})();
