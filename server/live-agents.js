(function() {
    // ═══════════════════════════════════════════════════════════════
    //   LIVE AGENT BEHAVIORS — Real-time API Integration
    // ═══════════════════════════════════════════════════════════════

    // Global state for agent polling
    var lastAgentState = {};
    var lastChatMessageCount = 0;
    var pollTimer = null;
    var animationQueue = [];

    // API URL helper
    function getApiUrl() {
        return window.OC_API_URL || (window.location.hostname.includes('spawnkit.ai') ? window.location.origin : 'http://127.0.0.1:8222');
    }

    // Agent polling function - fetches all necessary data
    async function pollAgentState() {
        try {
            const [sessionsResp, memoryResp, chatResp, cronsResp] = await Promise.allSettled([
                fetch(getApiUrl() + '/api/oc/sessions'),
                fetch(getApiUrl() + '/api/oc/memory'),
                fetch(getApiUrl() + '/api/oc/chat'),
                fetch(getApiUrl() + '/api/oc/crons')
            ]);

            const sessions = sessionsResp.status === 'fulfilled' && sessionsResp.value.ok ? await sessionsResp.value.json() : [];
            const memory = memoryResp.status === 'fulfilled' && memoryResp.value.ok ? await memoryResp.value.json() : {};
            const chat = chatResp.status === 'fulfilled' && chatResp.value.ok ? await chatResp.value.json() : [];
            const crons = cronsResp.status === 'fulfilled' && cronsResp.value.ok ? await cronsResp.value.json() : {};

            processAgentStateChanges(sessions, memory, chat, crons);
        } catch (error) {
            console.warn('[LiveAgentBehaviors] Poll failed:', error.message || error);
        }
    }

    // Process state changes and trigger animations
    function processAgentStateChanges(sessions, memory, chat, crons) {
        const currentState = {};

        // Build current state from sessions
        (sessions || []).forEach(session => {
            const key = session.key;
            currentState[key] = {
                status: session.status,
                model: session.model,
                totalTokens: session.totalTokens,
                lastActive: session.lastActive,
                label: session.label || session.displayName,
                kind: session.kind || 'unknown'
            };
        });

        // Detect changes and queue animations
        detectSessionChanges(currentState);

        // Check for new chat messages
        const currentMessageCount = Array.isArray(chat) ? chat.length : (chat.messages ? chat.messages.length : 0);
        if (currentMessageCount > lastChatMessageCount && lastChatMessageCount > 0) {
            queueAnimation('new-message', { count: currentMessageCount - lastChatMessageCount });
        }
        lastChatMessageCount = currentMessageCount;

        // Update status displays with real data
        updateStatusDisplays(sessions, memory, crons);

        // Update agent tiles with real data
        updateAgentTiles(sessions, memory);

        // Store current state
        lastAgentState = currentState;
    }

    // Detect session changes and queue appropriate animations
    function detectSessionChanges(currentState) {
        Object.keys(currentState).forEach(key => {
            const current = currentState[key];
            const previous = lastAgentState[key];

            if (!previous) {
                // New session spawned
                queueAnimation('agent-spawned', { key, session: current });
            } else {
                // Check for status changes
                if (previous.status !== current.status) {
                    if (current.status === 'active') {
                        queueAnimation('agent-active', { key, session: current });
                    } else if (current.status === 'idle') {
                        queueAnimation('agent-idle', { key, session: current });
                    }
                }
            }
        });

        // Check for decommissioned agents
        Object.keys(lastAgentState).forEach(key => {
            if (!currentState[key]) {
                queueAnimation('agent-decommissioned', { key, session: lastAgentState[key] });
            }
        });
    }

    // Animation queue system
    function queueAnimation(type, data) {
        animationQueue.push({ type, data, timestamp: Date.now() });
        processAnimationQueue();
    }

    function processAnimationQueue() {
        if (animationQueue.length === 0) return;

        const animation = animationQueue.shift();
        executeAnimation(animation);

        // Process next animation after delay
        if (animationQueue.length > 0) {
            setTimeout(processAnimationQueue, 300);
        }
    }

    // Execute specific animations
    function executeAnimation(animation) {
        const { type, data } = animation;

        switch (type) {
            case 'agent-spawned':
                animateAgentSpawned(data);
                break;
            case 'agent-active':
                animateAgentActive(data);
                break;
            case 'agent-idle':
                animateAgentIdle(data);
                break;
            case 'agent-decommissioned':
                animateAgentDecommissioned(data);
                break;
            case 'new-message':
                animateNewMessage(data);
                break;
        }
    }

    // Animation implementations
    function animateAgentSpawned(data) {
        // Find agent tile and animate spawn
        const agentTile = findAgentTile(data.key);
        if (agentTile) {
            agentTile.style.transform = 'scale(0.9)';
            agentTile.style.boxShadow = '0 0 20px rgba(0, 122, 255, 0.6)';

            requestAnimationFrame(() => {
                agentTile.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
                agentTile.style.transform = 'scale(1)';
                agentTile.style.boxShadow = '0 0 10px rgba(0, 122, 255, 0.3)';

                setTimeout(() => {
                    agentTile.style.boxShadow = '';
                    agentTile.style.transition = '';
                }, 500);
            });

            // Add notification badge
            addNotificationBadge(agentTile, '✨');
        }
    }

    function animateAgentActive(data) {
        const agentTile = findAgentTile(data.key);
        if (agentTile) {
            const statusDot = agentTile.querySelector('.status-dot, .agent-status-dot');
            if (statusDot) {
                statusDot.style.background = '#30D158';
                statusDot.style.animation = 'statusPulse 2s infinite';
            }

            // Subtle glow effect
            agentTile.style.boxShadow = '0 0 15px rgba(48, 209, 88, 0.3)';
            setTimeout(() => {
                agentTile.style.boxShadow = '';
            }, 1000);
        }
    }

    function animateAgentIdle(data) {
        const agentTile = findAgentTile(data.key);
        if (agentTile) {
            const statusDot = agentTile.querySelector('.status-dot, .agent-status-dot');
            if (statusDot) {
                statusDot.style.background = '#8E8E93';
                statusDot.style.animation = '';
            }
        }
    }

    function animateAgentDecommissioned(data) {
        const agentTile = findAgentTile(data.key);
        if (agentTile) {
            agentTile.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            agentTile.style.opacity = '0';
            agentTile.style.transform = 'scale(0.8)';

            setTimeout(() => {
                agentTile.style.display = 'none';
            }, 800);
        }
    }

    function animateNewMessage(data) {
        // Find mailbox or message indicators and animate them
        const indicators = document.querySelectorAll('.message-indicator, .mail-icon, [data-role="messages"]');
        indicators.forEach(indicator => {
            // Add bounce animation
            indicator.style.animation = 'messageBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)';

            // Add badge with count if not present
            addNotificationBadge(indicator.parentElement || indicator, data.count.toString());

            // Clear animation
            setTimeout(() => {
                indicator.style.animation = '';
            }, 600);
        });
    }

    // Helper functions
    function findAgentTile(sessionKey) {
        // Look for agent tiles by various selectors
        const selectors = [
            `[data-session-key="${sessionKey}"]`,
            `[data-agent-key="${sessionKey}"]`,
            '.room-tile[data-agent]',
            '.agent-card',
            '.fleet-agent'
        ];

        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
                if (element.dataset.sessionKey === sessionKey || 
                    element.dataset.agentKey === sessionKey ||
                    sessionKey.includes(element.dataset.agent)) {
                    return element;
                }
            }
        }

        // Fallback: try to match by agent name
        if (sessionKey.includes('subagent')) {
            return document.querySelector('.room-tile[data-agent="atlas"]') || 
                   document.querySelector('.room-tile[data-agent="forge"]');
        } else if (sessionKey === 'agent:main:main') {
            return document.querySelector('.room-tile[data-agent="ceo"]');
        }

        return null;
    }

    function addNotificationBadge(element, text) {
        if (!element) return;

        // Remove existing badge
        const existing = element.querySelector('.notification-badge');
        if (existing) existing.remove();

        // Create new badge
        const badge = document.createElement('div');
        badge.className = 'notification-badge';
        badge.textContent = text;
        badge.style.cssText = `
            position: absolute;
            top: -5px;
            right: -5px;
            background: #FF453A;
            color: white;
            border-radius: 50%;
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 700;
            z-index: 10;
            animation: badgePop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        `;

        element.style.position = 'relative';
        element.appendChild(badge);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (badge.parentElement) {
                badge.style.animation = 'badgeFadeOut 0.3s ease-out forwards';
                setTimeout(() => badge.remove(), 300);
            }
        }, 5000);
    }

    // Update status bar with real data
    function updateStatusDisplays(sessions, memory, crons) {
        const statusBar = document.querySelector('.exec-status-bar');
        if (!statusBar) return;

        const activeSessions = (sessions || []).filter(s => s.status === 'active').length;
        const totalTokens = (sessions || []).reduce((sum, s) => sum + (s.totalTokens || 0), 0);
        const mainSession = (sessions || []).find(s => s.key === 'agent:main:main');
        const model = mainSession ? mainSession.model : 'Unknown';

        // Update active count
        const activeCountEl = statusBar.querySelector('.active-count, [data-metric="active"]');
        if (activeCountEl) {
            activeCountEl.textContent = activeSessions.toString();
        }

        // Update token count
        const tokenCountEl = statusBar.querySelector('.token-count, [data-metric="tokens"]');
        if (tokenCountEl) {
            tokenCountEl.textContent = totalTokens.toLocaleString();
        }

        // Update model name
        const modelEl = statusBar.querySelector('.model-name, [data-metric="model"]');
        if (modelEl) {
            modelEl.textContent = model;
        }
    }

    // Update agent tiles with real activity text
    function updateAgentTiles(sessions, memory) {
        const tiles = document.querySelectorAll('.room-tile[data-agent]');

        tiles.forEach(tile => {
            const agentId = tile.dataset.agent;
            const speechEl = tile.querySelector('.agent-speech, .room-subtitle, .room-status');

            if (!speechEl) return;

            // Find corresponding session
            let session = null;
            if (agentId === 'ceo') {
                session = (sessions || []).find(s => s.key === 'agent:main:main');
            } else {
                // For sub-agents, find by label containing agent name
                session = (sessions || []).find(s => 
                    s.kind === 'subagent' && 
                    s.label && 
                    s.label.toLowerCase().includes(agentId.toLowerCase())
                );
            }

            let statusText = '';
            let statusColor = 'var(--text-tertiary)';

            if (session) {
                if (session.status === 'active') {
                    const taskName = session.label || session.displayName || 'Unknown task';
                    statusText = `Running: ${taskName}`;
                    statusColor = '#30D158';

                    // Update status dot
                    const dot = tile.querySelector('.status-dot, .agent-status-dot');
                    if (dot) {
                        dot.style.background = '#30D158';
                        dot.style.animation = 'statusPulse 2s infinite';
                    }
                } else {
                    const lastActive = new Date(session.lastActive || Date.now());
                    const agoMs = Date.now() - lastActive.getTime();
                    const agoStr = formatTimeAgo(agoMs);
                    statusText = `Idle since ${agoStr}`;
                    statusColor = 'var(--text-secondary)';

                    const dot = tile.querySelector('.status-dot, .agent-status-dot');
                    if (dot) {
                        dot.style.background = '#8E8E93';
                        dot.style.animation = '';
                    }
                }
            } else if (agentId === 'ceo' && memory && memory.todo) {
                // CEO shows current TODO.md >>> NEXT task
                const nextTask = extractNextTask(memory.todo);
                statusText = nextTask ? `Next: ${nextTask}` : 'Reviewing backlog...';
                statusColor = '#FFD60A';
            } else {
                statusText = 'Ready for deployment';
                statusColor = 'var(--text-tertiary)';
            }

            // Update speech text
            speechEl.textContent = statusText;
            speechEl.style.color = statusColor;
        });
    }

    // Helper to extract >>> NEXT task from TODO.md
    function extractNextTask(todoMd) {
        if (!todoMd) return null;

        const lines = todoMd.split('\n');
        for (const line of lines) {
            if (line.includes('>>> NEXT')) {
                return line.replace(/.*>>> NEXT:?\s*/, '').trim().substring(0, 50);
            }
        }
        return null;
    }

    // Format time ago helper
    function formatTimeAgo(ms) {
        const minutes = Math.floor(ms / 60000);
        const hours = Math.floor(ms / 3600000);
        const days = Math.floor(ms / 86400000);

        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    }

    // CSS animations for live behaviors
    const liveAnimationStyles = document.createElement('style');
    liveAnimationStyles.textContent = `
        @keyframes statusPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.1); }
        }

        @keyframes messageBounce {
            0%, 100% { transform: scale(1); }
            25% { transform: scale(1.1) rotate(-5deg); }
            75% { transform: scale(1.05) rotate(3deg); }
        }

        @keyframes badgePop {
            0% { transform: scale(0) rotate(180deg); opacity: 0; }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }

        @keyframes badgeFadeOut {
            0% { transform: scale(1); opacity: 1; }
            100% { transform: scale(0.7); opacity: 0; }
        }

        .notification-badge {
            animation: badgePop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
    `;
    document.head.appendChild(liveAnimationStyles);

    // Initialize live agent behaviors
    function initLiveAgentBehaviors() {
        console.log('[LiveAgentBehaviors] Initializing...');

        // Initial poll
        pollAgentState();

        // Set up polling interval (15 seconds)
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = setInterval(pollAgentState, 15000);

        console.log('[LiveAgentBehaviors] Active - polling every 15s');
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLiveAgentBehaviors);
    } else {
        initLiveAgentBehaviors();
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
    });

    // ═══════════════════════════════════════════════════════════════
    //   THEME PICKER (Original functionality preserved)
    // ═══════════════════════════════════════════════════════════════

    // Theme picker logic
    var overlay = document.getElementById('themePickerOverlay');
    var themesBtn = document.getElementById('themesBtn');
    var closeBtn = document.getElementById('themePickerClose');

    if (themesBtn) {
        themesBtn.addEventListener('click', function() {
            overlay.classList.add('open');
        });
    }
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            overlay.classList.remove('open');
        });
    }
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) overlay.classList.remove('open');
    });

    // Theme navigation
    var isProduction = window.location.hostname.includes('spawnkit.ai');
    var themeUrls = {
        executive: isProduction ? 'https://app.spawnkit.ai' : '/office-executive/index.html',
        medieval: isProduction ? 'https://app.spawnkit.ai/office-medieval/' : '/office-medieval/index.html',
        simcity: isProduction ? 'https://app.spawnkit.ai/office-simcity/' : '/office-simcity/index.html'
    };

    document.querySelectorAll('.theme-card').forEach(function(card) {
        card.addEventListener('click', function() {
            var theme = card.dataset.theme;
            if (theme === 'executive') {
                overlay.classList.remove('open');
                return; // Already on executive
            }
            window.location.href = themeUrls[theme];
        });
    });

    // ═══════════════════════════════════════════════════════════════
    //   AUTO-UPDATE CHECK — Checks for new version every 5 min
    // ═══════════════════════════════════════════════════════════════
    (function initUpdateChecker() {
        var banner = document.getElementById('updateBanner');
        var textEl = document.getElementById('updateText');
        var btnEl = document.getElementById('updateBtn');
        if (!banner || !textEl || !btnEl) return;

        var apiToken = localStorage.getItem('sk_api_token') || '';

        function checkForUpdates() {
            fetch('/api/oc/version')
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.updateAvailable) {
                        var latest = data.latest ? data.latest.version : '?';
                        var current = data.current ? data.current.version : '?';
                        var behind = data.commitsBehind || 0;
                        textEl.textContent = 'v' + current + ' → v' + latest + (behind > 0 ? ' (' + behind + ' commits)' : '');
                        banner.style.display = 'flex';
                    } else {
                        banner.style.display = 'none';
                    }
                })
                .catch(function() { /* silent */ });
        }

        btnEl.addEventListener('click', function() {
            if (btnEl.disabled) return;
            btnEl.disabled = true;
            btnEl.textContent = 'Updating...';
            banner.className = 'statusbar-update updating';
            textEl.textContent = 'Pulling latest version...';

            fetch('/api/oc/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + apiToken
                }
            })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data.ok) {
                    banner.className = 'statusbar-update success';
                    textEl.textContent = 'Updated! Reloading...';
                    btnEl.textContent = '✓';
                    setTimeout(function() { window.location.reload(); }, 3000);
                } else {
                    banner.className = 'statusbar-update';
                    textEl.textContent = 'Update failed: ' + (data.error || 'unknown');
                    btnEl.disabled = false;
                    btnEl.textContent = 'Retry';
                }
            })
            .catch(function(err) {
                banner.className = 'statusbar-update';
                textEl.textContent = 'Update error: ' + err.message;
                btnEl.disabled = false;
                btnEl.textContent = 'Retry';
            });
        });

        // Check on load + every 5 minutes
        checkForUpdates();
        setInterval(checkForUpdates, 5 * 60 * 1000);
    })();
})();
