/**
 * FleetKit Executive Office V4 - Session Viewer Panel
 * Displays cron jobs with live countdown timers and active sessions
 */

class SessionViewerPanel {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.crons = [];
        this.sessions = [];
        this.countdownIntervals = new Map();
        
        this.init();
        this.bindEvents();
    }

    init() {
        this.render();
    }

    bindEvents() {
        // Listen for navigation to sessions
        FleetEvents.on('navigate', (data) => {
            if (data.panel === 'sessions') {
                this.show();
            } else if (data.panel !== 'sessions') {
                this.hide();
            }
        });

        // Listen for cron data updates
        FleetEvents.on('data:crons:updated', (crons) => {
            this.crons = crons;
            this.updateCronsList();
        });

        // Listen for session data updates
        FleetEvents.on('data:sessions:updated', (sessions) => {
            this.sessions = sessions;
            this.updateSessionsList();
        });

        // Listen for cron toggle events
        FleetEvents.on('cron:toggle', (data) => {
            this.handleCronToggle(data);
        });

        // Listen for session actions
        FleetEvents.on('session:action', (data) => {
            this.handleSessionAction(data);
        });
    }

    render() {
        this.container.innerHTML = `
            <div class="session-viewer-container">
                <div class="session-viewer-header">
                    <h2>Session Control</h2>
                    <div class="session-stats">
                        <div class="session-stat">
                            <div class="session-stat-value" id="cron-count">0</div>
                            <div class="session-stat-label">Scheduled Jobs</div>
                        </div>
                        <div class="session-stat">
                            <div class="session-stat-value" id="active-count">0</div>
                            <div class="session-stat-label">Active Sessions</div>
                        </div>
                    </div>
                </div>
                
                <div class="session-tabs">
                    <button class="session-tab active" data-tab="crons">
                        <span class="tab-icon">⏰</span>
                        Cron Jobs
                    </button>
                    <button class="session-tab" data-tab="active">
                        <span class="tab-icon">🔄</span>
                        Active Sessions
                    </button>
                    <button class="session-tab" data-tab="history">
                        <span class="tab-icon">📜</span>
                        History
                    </button>
                </div>
                
                <div class="session-content">
                    <div class="session-tab-content active" id="crons-content">
                        ${this.renderCronsContent()}
                    </div>
                    <div class="session-tab-content" id="active-content">
                        ${this.renderActiveSessionsContent()}
                    </div>
                    <div class="session-tab-content" id="history-content">
                        ${this.renderHistoryContent()}
                    </div>
                </div>
            </div>
        `;

        this.bindSessionViewerEvents();
        this.updateStats();
    }

    renderCronsContent() {
        if (this.crons.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-icon">⏰</div>
                    <h3>No Scheduled Jobs</h3>
                    <p>Cron jobs will appear here when configured</p>
                </div>
            `;
        }

        const cronItems = this.crons.map(cron => this.renderCronItem(cron)).join('');
        
        return `
            <div class="crons-list">
                ${cronItems}
            </div>
        `;
    }

    renderCronItem(cron) {
        const nextRunTime = cron.nextRunAt ? new Date(cron.nextRunAt) : null;
        const isOverdue = nextRunTime && nextRunTime < new Date() && cron.enabled;
        
        return `
            <div class="cron-item ${!cron.enabled ? 'cron-item--disabled' : ''}" data-cron-id="${cron.id}">
                <div class="cron-item-header">
                    <div class="cron-info">
                        <div class="cron-icon">${this.getCronIcon(cron)}</div>
                        <div class="cron-details">
                            <div class="cron-name">${cron.name}</div>
                            <div class="cron-schedule">${this.formatCronSchedule(cron.schedule)}</div>
                        </div>
                    </div>
                    
                    <div class="cron-actions">
                        ${nextRunTime && cron.enabled ? `
                            <div class="countdown-timer" data-next-run="${cron.nextRunAt}">
                                <span class="countdown-icon">⏱️</span>
                                <span class="countdown-text">Loading...</span>
                            </div>
                        ` : ''}
                        
                        <label class="cron-toggle-wrapper">
                            <input type="checkbox" class="cron-toggle" 
                                   ${cron.enabled ? 'checked' : ''} 
                                   data-cron-id="${cron.id}">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>
                
                ${cron.lastRun ? `
                    <div class="cron-item-footer">
                        <div class="cron-last-run">
                            <span class="last-run-label">Last run:</span>
                            <span class="last-run-time">${this.formatDate(cron.lastRun)}</span>
                            ${cron.lastRunStatus ? `
                                <span class="last-run-status status-pill--${cron.lastRunStatus}">
                                    ${cron.lastRunStatus}
                                </span>
                            ` : ''}
                        </div>
                        <button class="cron-details-btn" data-cron-id="${cron.id}">
                            View Details
                        </button>
                    </div>
                ` : ''}
                
                ${isOverdue ? `
                    <div class="cron-overdue-warning">
                        <span class="warning-icon">⚠️</span>
                        This job is overdue
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderActiveSessionsContent() {
        const activeSessions = this.sessions.filter(session => session.status === 'active');
        
        if (activeSessions.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-icon">🔄</div>
                    <h3>No Active Sessions</h3>
                    <p>Active agent sessions will appear here</p>
                </div>
            `;
        }

        const sessionItems = activeSessions.map(session => this.renderSessionItem(session)).join('');
        
        return `
            <div class="sessions-list">
                ${sessionItems}
            </div>
        `;
    }

    renderSessionItem(session) {
        const agent = this.getAgentForSession(session);
        const uptime = this.calculateUptime(session.lastActive);
        
        return `
            <div class="session-item" data-session-key="${session.key}">
                <div class="session-item-header">
                    <div class="session-info">
                        <div class="session-agent-info">
                            ${agent ? `
                                <div class="session-avatar">
                                    <span class="agent-emoji">${agent.emoji || '🤖'}</span>
                                    <div class="agent-status-dot agent-status-dot--${session.status}"></div>
                                </div>
                            ` : `
                                <div class="session-icon">${this.getSessionIcon(session)}</div>
                            `}
                            <div class="session-details">
                                <div class="session-name">
                                    ${session.label || agent?.name || `Session ${session.key.slice(-6)}`}
                                </div>
                                <div class="session-type">
                                    ${session.kind} • ${session.model || 'default'}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="session-metrics">
                        <div class="session-metric">
                            <div class="metric-value">${this.formatNumber(session.totalTokens || 0)}</div>
                            <div class="metric-label">Tokens</div>
                        </div>
                        <div class="session-metric">
                            <div class="metric-value">${uptime}</div>
                            <div class="metric-label">Uptime</div>
                        </div>
                    </div>
                </div>
                
                <div class="session-item-footer">
                    <div class="session-status-info">
                        <div class="session-status-badge status-pill--${session.status}">
                            ${this.getStatusIcon(session.status)} ${session.status}
                        </div>
                        ${session.lastActive ? `
                            <div class="session-last-active">
                                Last active: ${this.formatDate(session.lastActive)}
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="session-actions">
                        <button class="session-action-btn" data-action="view" data-session-key="${session.key}">
                            View
                        </button>
                        ${session.kind !== 'main' ? `
                            <button class="session-action-btn session-action-btn--danger" 
                                    data-action="terminate" data-session-key="${session.key}">
                                Terminate
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderHistoryContent() {
        // Simple placeholder for now - could be expanded with real session history
        return `
            <div class="empty-state">
                <div class="empty-icon">📜</div>
                <h3>Session History</h3>
                <p>Session history and logs will be available in a future update</p>
            </div>
        `;
    }

    bindSessionViewerEvents() {
        // Tab switching
        this.container.querySelectorAll('.session-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Cron toggles
        this.container.querySelectorAll('.cron-toggle').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const cronId = e.target.dataset.cronId;
                const enabled = e.target.checked;
                this.handleCronToggle({ cronId, enabled });
            });
        });

        // Cron details buttons
        this.container.querySelectorAll('.cron-details-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cronId = e.target.dataset.cronId;
                this.showCronDetails(cronId);
            });
        });

        // Session action buttons
        this.container.querySelectorAll('.session-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const sessionKey = e.target.dataset.sessionKey;
                this.handleSessionAction({ action, sessionKey });
            });
        });

        // Start countdown timers
        this.startCountdownTimers();
    }

    switchTab(tabName) {
        // Update tab buttons
        this.container.querySelectorAll('.session-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update content
        this.container.querySelectorAll('.session-tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-content`);
        });
    }

    updateCronsList() {
        const cronsContent = this.container.querySelector('#crons-content');
        if (cronsContent) {
            cronsContent.innerHTML = this.renderCronsContent();
            
            // Re-bind events for new content
            this.bindCronEvents();
            this.startCountdownTimers();
        }
        
        this.updateStats();
    }

    updateSessionsList() {
        const activeContent = this.container.querySelector('#active-content');
        if (activeContent) {
            activeContent.innerHTML = this.renderActiveSessionsContent();
            
            // Re-bind events for new content
            this.bindSessionEvents();
        }
        
        this.updateStats();
    }

    bindCronEvents() {
        // Cron toggles
        this.container.querySelectorAll('.cron-toggle').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const cronId = e.target.dataset.cronId;
                const enabled = e.target.checked;
                this.handleCronToggle({ cronId, enabled });
            });
        });

        // Cron details buttons
        this.container.querySelectorAll('.cron-details-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cronId = e.target.dataset.cronId;
                this.showCronDetails(cronId);
            });
        });
    }

    bindSessionEvents() {
        // Session action buttons
        this.container.querySelectorAll('.session-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const sessionKey = e.target.dataset.sessionKey;
                this.handleSessionAction({ action, sessionKey });
            });
        });
    }

    startCountdownTimers() {
        // Clear existing intervals
        this.countdownIntervals.forEach(interval => clearInterval(interval));
        this.countdownIntervals.clear();

        // Start new timers
        const timers = this.container.querySelectorAll('.countdown-timer[data-next-run]');
        
        timers.forEach(timer => {
            const nextRunStr = timer.dataset.nextRun;
            if (!nextRunStr) return;

            const updateTimer = () => {
                const now = new Date();
                const nextRun = new Date(nextRunStr);
                const diff = nextRun - now;

                const textElement = timer.querySelector('.countdown-text');
                if (!textElement) return;

                if (diff <= 0) {
                    textElement.textContent = 'Running...';
                    textElement.classList.add('running');
                    return;
                }

                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                let timeText = '';
                if (days > 0) {
                    timeText = `Next in ${days}d ${hours}h`;
                } else if (hours > 0) {
                    timeText = `Next in ${hours}h ${minutes}m`;
                } else if (minutes > 0) {
                    timeText = `Next in ${minutes}m ${seconds}s`;
                } else {
                    timeText = `Next in ${seconds}s`;
                }

                textElement.textContent = timeText;
                textElement.classList.remove('running');
            };

            updateTimer();
            const interval = setInterval(updateTimer, 1000);
            this.countdownIntervals.set(timer, interval);
        });
    }

    handleCronToggle(data) {
        const { cronId, enabled } = data;
        
        // Update local state
        const cron = this.crons.find(c => c.id === cronId);
        if (cron) {
            cron.enabled = enabled;
        }

        // Update UI
        const cronItem = this.container.querySelector(`[data-cron-id="${cronId}"]`);
        if (cronItem) {
            cronItem.classList.toggle('cron-item--disabled', !enabled);
        }

        // Emit API call event (would be handled by a service layer)
        FleetEvents.emit('api:cron:toggle', { cronId, enabled });

        // Show feedback
        this.showToast(`Cron job ${enabled ? 'enabled' : 'disabled'}`);
    }

    handleSessionAction(data) {
        const { action, sessionKey } = data;
        
        switch (action) {
            case 'view':
                this.viewSession(sessionKey);
                break;
            case 'terminate':
                if (confirm('Are you sure you want to terminate this session?')) {
                    this.terminateSession(sessionKey);
                }
                break;
        }
    }

    viewSession(sessionKey) {
        // Navigate to agent detail or session view
        const session = this.sessions.find(s => s.key === sessionKey);
        if (session) {
            const agent = this.getAgentForSession(session);
            if (agent) {
                FleetEvents.emit('navigate', { panel: 'agent', id: agent.id });
            } else {
                // Open session details modal/panel
                FleetEvents.emit('session:details:open', { sessionKey });
            }
        }
    }

    terminateSession(sessionKey) {
        // Remove from UI immediately
        const sessionItem = this.container.querySelector(`[data-session-key="${sessionKey}"]`);
        if (sessionItem) {
            sessionItem.style.transition = 'opacity 0.3s, transform 0.3s';
            sessionItem.style.opacity = '0';
            sessionItem.style.transform = 'translateX(50px)';
            
            setTimeout(() => {
                sessionItem.remove();
                this.updateStats();
            }, 300);
        }

        // Emit API call event
        FleetEvents.emit('api:session:terminate', { sessionKey });
        
        this.showToast('Session terminated');
    }

    showCronDetails(cronId) {
        const cron = this.crons.find(c => c.id === cronId);
        if (!cron) return;

        // Show details modal or navigate to cron detail view
        FleetEvents.emit('cron:details:open', { cron });
    }

    updateStats() {
        const cronCount = this.container.querySelector('#cron-count');
        const activeCount = this.container.querySelector('#active-count');
        
        if (cronCount) {
            cronCount.textContent = this.crons.filter(c => c.enabled).length;
        }
        
        if (activeCount) {
            activeCount.textContent = this.sessions.filter(s => s.status === 'active').length;
        }
    }

    // Helper methods
    getCronIcon(cron) {
        // Simple icon based on cron name or schedule
        if (cron.name.toLowerCase().includes('backup')) return '💾';
        if (cron.name.toLowerCase().includes('report')) return '📊';
        if (cron.name.toLowerCase().includes('clean')) return '🧹';
        if (cron.name.toLowerCase().includes('sync')) return '🔄';
        if (cron.name.toLowerCase().includes('brief')) return '📰';
        return '⏰';
    }

    formatCronSchedule(schedule) {
        // Convert cron expression to human-readable format
        // This is a simplified version - could be enhanced with a proper cron parser
        if (schedule === '0 6 * * *') return 'Daily at 6:00 AM';
        if (schedule === '0 9 * * MON') return 'Weekly on Monday at 9:00 AM';
        if (schedule === '0 0 1 * *') return 'Monthly on the 1st at midnight';
        return schedule; // Fallback to raw cron expression
    }

    getSessionIcon(session) {
        if (session.kind === 'main') return '👑';
        if (session.kind === 'subagent') return '🤖';
        if (session.kind === 'cron') return '⏰';
        return '🔄';
    }

    getStatusIcon(status) {
        const icons = {
            active: '🟢',
            idle: '🟡',
            busy: '🔵',
            error: '🔴',
            paused: '⏸️'
        };
        return icons[status] || '⚪';
    }

    getAgentForSession(session) {
        // Try to find the agent that corresponds to this session
        const agents = FleetState.getAgents();
        return agents.find(agent => agent.sessionKey === session.key);
    }

    calculateUptime(lastActive) {
        if (!lastActive) return '0m';
        
        const now = new Date();
        const last = new Date(lastActive);
        const diff = now - last;
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffMinutes < 1) {
            return 'Just now';
        } else if (diffMinutes < 60) {
            return `${diffMinutes}m ago`;
        } else if (diffHours < 24) {
            return `${diffHours}h ago`;
        } else if (diffDays < 7) {
            return `${diffDays}d ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    showToast(message) {
        FleetEvents.emit('toast:show', { message });
    }

    show() {
        if (this.container) {
            this.container.classList.add('active');
        }
    }

    hide() {
        if (this.container) {
            this.container.classList.remove('active');
        }
    }

    destroy() {
        // Clear countdown intervals
        this.countdownIntervals.forEach(interval => clearInterval(interval));
        this.countdownIntervals.clear();

        // Remove event listeners
        FleetEvents.off('navigate', this.show.bind(this));
        FleetEvents.off('data:crons:updated', this.updateCronsList.bind(this));
        FleetEvents.off('data:sessions:updated', this.updateSessionsList.bind(this));
        FleetEvents.off('cron:toggle', this.handleCronToggle.bind(this));
        FleetEvents.off('session:action', this.handleSessionAction.bind(this));
    }
}

// Auto-initialize if container exists
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('sessions-panel')) {
            window.SessionViewerPanel = new SessionViewerPanel('sessions-panel');
        }
    });
} else {
    if (document.getElementById('sessions-panel')) {
        window.SessionViewerPanel = new SessionViewerPanel('sessions-panel');
    }
}