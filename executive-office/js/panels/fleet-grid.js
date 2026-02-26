/**
 * FleetKit Executive Office V4 - Fleet Grid Panel
 * Displays the main grid of agent tiles with CEO prominence
 */

class FleetGridPanel {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.agents = [];
        this.svgAvatars = this.initializeSVGAvatars();
        
        this.init();
        this.bindEvents();
    }

    init() {
        this.render();
    }

    bindEvents() {
        // Listen for agent data updates
        FleetEvents.on('data:agents:updated', (agents) => {
            this.agents = agents;
            this.updateAgentTiles();
        });

        // Listen for navigation events
        FleetEvents.on('navigate', (data) => {
            if (data.panel === 'fleet') {
                this.show();
            }
        });

        // Listen for agent status changes
        FleetEvents.on('agent:status:changed', (data) => {
            this.updateAgentStatus(data.id, data.status);
        });

        // Listen for spawn actions
        FleetEvents.on('agent:spawn:requested', (data) => {
            this.handleSpawnRequest(data);
        });
    }

    render() {
        this.container.innerHTML = `
            <div class="fleet-grid" id="fleet-grid">
                <!-- Agent tiles will be rendered here -->
                ${this.renderConnectionStatus()}
            </div>
        `;

        this.gridContainer = this.container.querySelector('#fleet-grid');
        this.updateAgentTiles();
    }

    renderConnectionStatus() {
        return `
            <div class="connection-status" id="connection-status">
                <div class="connection-dot"></div>
                <span class="connection-text">Connecting...</span>
            </div>
        `;
    }

    updateAgentTiles() {
        if (!this.gridContainer) return;

        const agents = FleetState.getAgents();
        
        if (agents.length === 0) {
            this.gridContainer.innerHTML = `
                <div class="connecting-message">
                    <div class="loading-spinner"></div>
                    <p>Connecting to Fleet Command...</p>
                </div>
            `;
            return;
        }

        // Render agent tiles
        this.gridContainer.innerHTML = agents.map(agent => this.renderAgentTile(agent)).join('');
        
        // Bind click events
        this.bindTileEvents();
    }

    renderAgentTile(agent) {
        const isCEO = agent.type === 'ceo';
        const avatarId = this.getAvatarId(agent.id);
        
        return `
            <div class="agent-tile agent-tile--${agent.id}" 
                 data-agent-id="${agent.id}" 
                 tabindex="0"
                 role="button"
                 aria-label="${agent.name} - ${agent.role}">
                
                ${isCEO ? this.renderCEOTile(agent, avatarId) : this.renderRegularTile(agent, avatarId)}
            </div>
        `;
    }

    renderCEOTile(agent, avatarId) {
        return `
            <div class="ceo-content">
                <div class="agent-avatar agent-avatar--lg">
                    <svg><use href="#${avatarId}"></use></svg>
                    <div class="agent-status-dot agent-status-dot--${agent.status}"></div>
                </div>
                <div class="ceo-info">
                    <div class="agent-name">${agent.name}</div>
                    <div class="agent-role">${agent.role}</div>
                    <div class="ceo-task">${agent.currentTask}</div>
                </div>
            </div>
            <div class="ceo-stats">
                <div class="ceo-stat">
                    <div class="ceo-stat-value">${this.formatNumber(agent.metrics.tokens)}</div>
                    <div class="ceo-stat-label">Tokens</div>
                </div>
                <div class="ceo-stat">
                    <div class="ceo-stat-value">${agent.subAgents.length}</div>
                    <div class="ceo-stat-label">Sub-Agents</div>
                </div>
                <div class="ceo-stat">
                    <div class="ceo-stat-value">${agent.metrics.uptime}</div>
                    <div class="ceo-stat-label">Uptime</div>
                </div>
            </div>
        `;
    }

    renderRegularTile(agent, avatarId) {
        const isSessionsTile = agent.id === 'sessions';
        
        if (isSessionsTile) {
            return this.renderSessionsTile();
        }

        return `
            <div class="agent-room-label">${agent.role}</div>
            <div class="agent-avatar">
                <svg><use href="#${avatarId}"></use></svg>
                <div class="agent-status-dot agent-status-dot--${agent.status}"></div>
            </div>
            <div class="agent-name">${agent.name}</div>
            <div class="agent-role">${agent.role}</div>
            
            ${agent.currentTask ? `<div class="agent-task">${agent.currentTask}</div>` : ''}
            
            ${agent.type === 'c-level' ? `
                <button class="spawn-btn" 
                        data-agent-id="${agent.id}"
                        aria-label="Spawn sub-agent for ${agent.name}"
                        title="Spawn Sub-Agent">
                    <span>⚡</span>
                </button>
            ` : ''}
            
            ${agent.status === 'idle' ? '<div class="agent-idle-pulse"></div>' : ''}
        `;
    }

    renderSessionsTile() {
        const sessions = FleetState.getSessions();
        const cronCount = sessions.crons.length;
        const activeCount = sessions.active.length;

        return `
            <div class="agent-room-label">Sessions</div>
            <div class="sessions-icon">⚙️</div>
            <div class="sessions-stats">
                <div class="session-stat">
                    <div class="session-stat-value">${cronCount}</div>
                    <div class="session-stat-label">Crons</div>
                </div>
                <div class="session-stat">
                    <div class="session-stat-value">${activeCount}</div>
                    <div class="session-stat-label">Active</div>
                </div>
            </div>
            ${this.renderNextCronCountdown()}
        `;
    }

    renderNextCronCountdown() {
        const sessions = FleetState.getSessions();
        const nextCron = this.getNextCron(sessions.crons);
        
        if (!nextCron) return '';

        return `
            <div class="countdown-timer" data-next-run="${nextCron.nextRunAt}">
                <span class="countdown-icon">⏰</span>
                <span class="countdown-text">Loading...</span>
            </div>
        `;
    }

    getNextCron(crons) {
        if (!crons || crons.length === 0) return null;
        
        const now = new Date();
        const upcomingCrons = crons
            .filter(cron => cron.enabled && cron.nextRunAt)
            .map(cron => ({
                ...cron,
                nextRun: new Date(cron.nextRunAt)
            }))
            .filter(cron => cron.nextRun > now)
            .sort((a, b) => a.nextRun - b.nextRun);

        return upcomingCrons[0] || null;
    }

    bindTileEvents() {
        // Agent tile clicks
        this.gridContainer.querySelectorAll('.agent-tile').forEach(tile => {
            tile.addEventListener('click', (e) => {
                // Don't trigger tile click if spawn button was clicked
                if (e.target.closest('.spawn-btn')) return;
                
                const agentId = tile.dataset.agentId;
                this.handleTileClick(agentId);
            });

            // Keyboard navigation
            tile.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const agentId = tile.dataset.agentId;
                    this.handleTileClick(agentId);
                }
            });
        });

        // Spawn button clicks
        this.gridContainer.querySelectorAll('.spawn-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const agentId = btn.dataset.agentId;
                this.handleSpawnClick(agentId);
            });
        });

        // Start countdown timers
        this.startCountdownTimers();
    }

    handleTileClick(agentId) {
        if (agentId === 'sessions') {
            FleetEvents.emit('navigate', { panel: 'sessions' });
        } else {
            FleetEvents.emit('navigate', { panel: 'agent', id: agentId });
        }
    }

    handleSpawnClick(agentId) {
        FleetEvents.emit('wizard:open', { 
            type: 'spawn-agent', 
            parentAgent: agentId 
        });
    }

    handleSpawnRequest(data) {
        // Show spawn animation on the parent agent tile
        const tile = this.gridContainer.querySelector(`[data-agent-id="${data.parentAgent}"]`);
        if (tile) {
            this.showSpawnAnimation(tile);
        }
    }

    showSpawnAnimation(tile) {
        const ripple = document.createElement('div');
        ripple.className = 'spawn-ripple';
        tile.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    updateAgentStatus(agentId, status) {
        const tile = this.gridContainer.querySelector(`[data-agent-id="${agentId}"]`);
        if (!tile) return;

        const statusDot = tile.querySelector('.agent-status-dot');
        if (statusDot) {
            // Remove old status classes
            statusDot.className = statusDot.className.replace(/agent-status-dot--\w+/g, '');
            // Add new status class
            statusDot.classList.add(`agent-status-dot--${status}`);
        }
    }

    startCountdownTimers() {
        const timers = this.gridContainer.querySelectorAll('.countdown-timer');
        
        timers.forEach(timer => {
            const nextRunStr = timer.dataset.nextRun;
            if (!nextRunStr) return;

            const updateTimer = () => {
                const now = new Date();
                const nextRun = new Date(nextRunStr);
                const diff = nextRun - now;

                if (diff <= 0) {
                    timer.querySelector('.countdown-text').textContent = 'Running...';
                    return;
                }

                const minutes = Math.floor(diff / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                if (minutes > 0) {
                    timer.querySelector('.countdown-text').textContent = `Next in ${minutes}m ${seconds}s`;
                } else {
                    timer.querySelector('.countdown-text').textContent = `Next in ${seconds}s`;
                }
            };

            updateTimer();
            const interval = setInterval(updateTimer, 1000);

            // Store interval for cleanup
            timer._countdownInterval = interval;
        });
    }

    getAvatarId(agentId) {
        const avatarMap = {
            ceo: 'avatar-ceo',
            atlas: 'avatar-atlas',
            forge: 'avatar-forge',
            hunter: 'avatar-hunter',
            echo: 'avatar-echo',
            sentinel: 'avatar-sentinel'
        };
        
        return avatarMap[agentId] || 'avatar-ceo';
    }

    initializeSVGAvatars() {
        // This would normally be loaded from the HTML, but for modularity
        // we can define the avatars here or load them dynamically
        return {
            'avatar-ceo': '<!-- CEO Avatar SVG -->',
            'avatar-atlas': '<!-- Atlas Avatar SVG -->',
            // ... other avatars
        };
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    // Panel visibility methods
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

    // Cleanup
    destroy() {
        // Clear countdown intervals
        if (this.gridContainer) {
            const timers = this.gridContainer.querySelectorAll('.countdown-timer');
            timers.forEach(timer => {
                if (timer._countdownInterval) {
                    clearInterval(timer._countdownInterval);
                }
            });
        }

        // Remove event listeners
        FleetEvents.off('data:agents:updated', this.updateAgentTiles.bind(this));
        FleetEvents.off('navigate', this.show.bind(this));
        FleetEvents.off('agent:status:changed', this.updateAgentStatus.bind(this));
        FleetEvents.off('agent:spawn:requested', this.handleSpawnRequest.bind(this));
    }
}

// Auto-initialize if container exists
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('fleet-panel')) {
            window.FleetGridPanel = new FleetGridPanel('fleet-panel');
        }
    });
} else {
    if (document.getElementById('fleet-panel')) {
        window.FleetGridPanel = new FleetGridPanel('fleet-panel');
    }
}