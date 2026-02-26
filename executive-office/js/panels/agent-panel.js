/**
 * FleetKit Executive Office V4 - Agent Detail Panel
 * Shows detailed view of individual agents with metrics, tasks, skills, and sub-agents
 */

class AgentPanel {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentAgentId = null;
        this.currentAgent = null;
        
        this.init();
        this.bindEvents();
    }

    init() {
        this.render();
    }

    bindEvents() {
        // Listen for navigation to agent panel
        FleetEvents.on('navigate', (data) => {
            if (data.panel === 'agent' && data.id) {
                this.showAgent(data.id);
            } else if (data.panel !== 'agent') {
                this.hide();
            }
        });

        // Listen for agent data updates
        FleetEvents.on('data:agents:updated', (agents) => {
            if (this.currentAgentId) {
                const updatedAgent = agents.find(a => a.id === this.currentAgentId);
                if (updatedAgent) {
                    this.currentAgent = updatedAgent;
                    this.updateAgentData();
                }
            }
        });

        // Listen for TODO item updates
        FleetEvents.on('todo:item:updated', (data) => {
            this.handleTodoUpdate(data);
        });

        // Listen for skill updates
        FleetEvents.on('skills:agent:updated', (data) => {
            if (data.agentId === this.currentAgentId) {
                this.updateSkillsSection();
            }
        });
    }

    render() {
        this.container.innerHTML = `
            <div class="agent-detail-container">
                <!-- Content will be populated when an agent is selected -->
                <div class="agent-placeholder">
                    <div class="placeholder-icon">🤖</div>
                    <h3>Select an Agent</h3>
                    <p>Click on an agent tile to view their details</p>
                </div>
            </div>
        `;
    }

    showAgent(agentId) {
        this.currentAgentId = agentId;
        this.currentAgent = FleetState.getAgent(agentId);
        
        if (!this.currentAgent) {
            console.warn(`Agent ${agentId} not found`);
            return;
        }

        this.renderAgentDetail();
        this.show();
    }

    renderAgentDetail() {
        if (!this.currentAgent) return;

        const isCEO = this.currentAgent.type === 'ceo';
        
        this.container.innerHTML = `
            <div class="agent-detail-container">
                ${this.renderAgentHeader()}
                ${this.renderAgentMetrics()}
                ${this.renderCurrentTask()}
                ${this.renderTodoList()}
                ${this.renderSkillsSection()}
                ${this.renderSubAgentsSection()}
                ${isCEO ? this.renderMissionsOverview() : ''}
            </div>
        `;

        this.bindDetailEvents();
    }

    renderAgentHeader() {
        const agent = this.currentAgent;
        const avatarId = this.getAvatarId(agent.id);
        
        return `
            <div class="agent-header">
                <button class="agent-header-back" aria-label="Back to Fleet">
                    <span>←</span>
                </button>
                <div class="agent-header-info">
                    <div class="agent-header-avatar agent-avatar agent-avatar--lg">
                        <svg><use href="#${avatarId}"></use></svg>
                        <div class="agent-status-dot agent-status-dot--${agent.status}"></div>
                    </div>
                    <div class="agent-header-details">
                        <h2>${agent.name} ${agent.type === 'ceo' ? '👑' : ''}</h2>
                        <div class="agent-header-role">${agent.role}</div>
                        <div class="agent-status-badge status-pill status-pill--${agent.status}">
                            ${this.getStatusText(agent.status)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderAgentMetrics() {
        const agent = this.currentAgent;
        
        return `
            <div class="agent-metrics">
                <div class="metric-card">
                    <div class="metric-value">${this.formatNumber(agent.metrics.tokens)}</div>
                    <div class="metric-label">Tokens Used</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${agent.metrics.tasks}</div>
                    <div class="metric-label">Tasks Done</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${agent.metrics.uptime}</div>
                    <div class="metric-label">Uptime</div>
                </div>
            </div>
        `;
    }

    renderCurrentTask() {
        const agent = this.currentAgent;
        
        if (!agent.currentTask) return '';

        return `
            <div class="todo-section">
                <div class="todo-section-title">Current Task</div>
                <div class="current-task-card">
                    <div class="task-title">${agent.currentTask}</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${this.calculateTaskProgress()}%"></div>
                    </div>
                    <div class="task-meta">
                        <span class="task-model">${agent.model}</span>
                        <span class="task-time">Running for ${agent.metrics.uptime}</span>
                    </div>
                </div>
            </div>
        `;
    }

    renderTodoList() {
        const agent = this.currentAgent;
        
        if (!agent.todoList || agent.todoList.length === 0) {
            return `
                <div class="todo-section">
                    <div class="todo-section-title">TODO List</div>
                    <div class="empty-state">
                        <span class="empty-icon">📝</span>
                        <p>No pending tasks</p>
                    </div>
                </div>
            `;
        }

        const todoItems = agent.todoList.map(item => `
            <div class="todo-item todo-item--${item.status}" data-todo-id="${item.id}">
                <div class="todo-status todo-status--${item.status}">
                    ${this.getTodoIcon(item.status)}
                </div>
                <div class="todo-text">${item.text}</div>
                <div class="todo-actions">
                    ${this.renderTodoActions(item)}
                </div>
            </div>
        `).join('');

        return `
            <div class="todo-section">
                <div class="todo-section-title">TODO List</div>
                <div class="todo-list">
                    ${todoItems}
                </div>
            </div>
        `;
    }

    renderTodoActions(item) {
        if (item.status === 'done') return '';
        
        const actions = [];
        
        if (item.status === 'pending') {
            actions.push('<button class="todo-action" data-action="start" title="Start Task">▶️</button>');
        }
        
        if (item.status === 'progress') {
            actions.push('<button class="todo-action" data-action="complete" title="Mark Complete">✅</button>');
            actions.push('<button class="todo-action" data-action="pause" title="Pause Task">⏸️</button>');
        }
        
        if (item.status === 'blocked') {
            actions.push('<button class="todo-action" data-action="unblock" title="Unblock Task">🔓</button>');
        }

        return actions.join('');
    }

    renderSkillsSection() {
        const agent = this.currentAgent;
        
        if (!agent.skills || agent.skills.length === 0) {
            return `
                <div class="skills-section">
                    <div class="todo-section-title">Skills</div>
                    <div class="empty-state">
                        <span class="empty-icon">🎯</span>
                        <p>No skills configured</p>
                        <button class="add-skill-btn">+ Add Skills</button>
                    </div>
                </div>
            `;
        }

        const skillChips = agent.skills.map(skill => {
            const category = this.getSkillCategory(skill);
            return `
                <div class="skill-chip skill-chip--${category}" data-skill="${skill}">
                    ${this.getSkillIcon(skill)} ${this.formatSkillName(skill)}
                </div>
            `;
        }).join('');

        return `
            <div class="skills-section">
                <div class="todo-section-title">
                    Skills
                    <button class="add-skill-btn">+ Add Skill</button>
                </div>
                <div class="skills-grid">
                    ${skillChips}
                </div>
            </div>
        `;
    }

    renderSubAgentsSection() {
        const agent = this.currentAgent;
        
        if (!agent.subAgents || agent.subAgents.length === 0) {
            return agent.type === 'c-level' ? `
                <div class="todo-section">
                    <div class="todo-section-title">Sub-Agents</div>
                    <div class="empty-state">
                        <span class="empty-icon">🤖</span>
                        <p>No sub-agents spawned</p>
                        <button class="spawn-subagent-btn" data-parent="${agent.id}">
                            ⚡ Spawn Sub-Agent
                        </button>
                    </div>
                </div>
            ` : '';
        }

        const subAgentItems = agent.subAgents.map(subAgent => `
            <div class="subagent-item" data-subagent-id="${subAgent.id}">
                <div class="subagent-avatar">
                    <div class="subagent-icon">🤖</div>
                    <div class="agent-status-dot agent-status-dot--${subAgent.status}"></div>
                </div>
                <div class="subagent-info">
                    <div class="subagent-name">${subAgent.name}</div>
                    <div class="subagent-task">${subAgent.currentTask || 'Idle'}</div>
                </div>
                <button class="subagent-view-btn" data-subagent-id="${subAgent.id}">
                    View →
                </button>
            </div>
        `).join('');

        return `
            <div class="todo-section">
                <div class="todo-section-title">
                    Sub-Agents (${agent.subAgents.length})
                    ${agent.type === 'c-level' ? '<button class="spawn-subagent-btn" data-parent="' + agent.id + '">+ Spawn</button>' : ''}
                </div>
                <div class="subagent-list">
                    ${subAgentItems}
                </div>
            </div>
        `;
    }

    renderMissionsOverview() {
        const missions = FleetState.getMissions();
        
        if (missions.length === 0) {
            return `
                <div class="todo-section">
                    <div class="todo-section-title">Active Missions</div>
                    <div class="empty-state">
                        <span class="empty-icon">🎯</span>
                        <p>No active missions</p>
                        <button class="create-mission-btn">+ Create Mission</button>
                    </div>
                </div>
            `;
        }

        const missionItems = missions.slice(0, 3).map(mission => `
            <div class="mission-item" data-mission-id="${mission.id}">
                <div class="mission-status-dot status-pill--${mission.status}"></div>
                <div class="mission-info">
                    <div class="mission-name">${mission.name}</div>
                    <div class="mission-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${mission.progress * 100}%"></div>
                        </div>
                        <span class="progress-text">${Math.round(mission.progress * 100)}%</span>
                    </div>
                </div>
                <button class="mission-view-btn" data-mission-id="${mission.id}">View</button>
            </div>
        `).join('');

        return `
            <div class="todo-section">
                <div class="todo-section-title">
                    Active Missions
                    <button class="view-all-missions-btn">View All →</button>
                </div>
                <div class="mission-list">
                    ${missionItems}
                </div>
            </div>
        `;
    }

    bindDetailEvents() {
        // Back button
        const backBtn = this.container.querySelector('.agent-header-back');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                FleetEvents.emit('navigate', { panel: 'fleet' });
            });
        }

        // TODO actions
        this.container.querySelectorAll('.todo-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const todoItem = e.target.closest('.todo-item');
                const todoId = todoItem.dataset.todoId;
                const action = e.target.dataset.action;
                this.handleTodoAction(todoId, action);
            });
        });

        // Sub-agent view buttons
        this.container.querySelectorAll('.subagent-view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const subagentId = e.target.dataset.subagentId;
                FleetEvents.emit('navigate', { panel: 'agent', id: subagentId });
            });
        });

        // Spawn sub-agent buttons
        this.container.querySelectorAll('.spawn-subagent-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const parentId = e.target.dataset.parent;
                FleetEvents.emit('wizard:open', { 
                    type: 'spawn-agent', 
                    parentAgent: parentId 
                });
            });
        });

        // Mission view buttons
        this.container.querySelectorAll('.mission-view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const missionId = e.target.dataset.missionId;
                FleetEvents.emit('navigate', { panel: 'mission', id: missionId });
            });
        });

        // Add skill button
        const addSkillBtn = this.container.querySelector('.add-skill-btn');
        if (addSkillBtn) {
            addSkillBtn.addEventListener('click', () => {
                FleetEvents.emit('wizard:open', { 
                    type: 'add-skill', 
                    agentId: this.currentAgentId 
                });
            });
        }

        // Create mission button
        const createMissionBtn = this.container.querySelector('.create-mission-btn');
        if (createMissionBtn) {
            createMissionBtn.addEventListener('click', () => {
                FleetEvents.emit('wizard:open', { type: 'create-mission' });
            });
        }

        // View all missions button
        const viewAllBtn = this.container.querySelector('.view-all-missions-btn');
        if (viewAllBtn) {
            viewAllBtn.addEventListener('click', () => {
                FleetEvents.emit('navigate', { panel: 'missions' });
            });
        }
    }

    handleTodoAction(todoId, action) {
        const statusMap = {
            start: 'progress',
            complete: 'done',
            pause: 'pending',
            unblock: 'pending'
        };

        const newStatus = statusMap[action];
        if (!newStatus) return;

        // Update the TODO item locally
        const todoItem = this.container.querySelector(`[data-todo-id="${todoId}"]`);
        if (todoItem) {
            todoItem.className = todoItem.className.replace(/todo-item--\w+/, `todo-item--${newStatus}`);
            
            const statusIcon = todoItem.querySelector('.todo-status');
            if (statusIcon) {
                statusIcon.className = statusIcon.className.replace(/todo-status--\w+/, `todo-status--${newStatus}`);
                statusIcon.innerHTML = this.getTodoIcon(newStatus);
            }

            // Update actions
            const actionsContainer = todoItem.querySelector('.todo-actions');
            if (actionsContainer) {
                const item = { id: todoId, status: newStatus };
                actionsContainer.innerHTML = this.renderTodoActions(item);
                
                // Re-bind action events for this item
                actionsContainer.querySelectorAll('.todo-action').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const action = e.target.dataset.action;
                        this.handleTodoAction(todoId, action);
                    });
                });
            }
        }

        // Emit update event
        FleetEvents.emit('todo:item:updated', {
            agentId: this.currentAgentId,
            todoId: parseInt(todoId),
            status: newStatus
        });
    }

    handleTodoUpdate(data) {
        if (data.agentId !== this.currentAgentId) return;
        
        // Update the current agent's TODO list
        if (this.currentAgent && this.currentAgent.todoList) {
            const todo = this.currentAgent.todoList.find(item => item.id === data.todoId);
            if (todo) {
                todo.status = data.status;
            }
        }
    }

    updateAgentData() {
        if (!this.currentAgent) return;
        
        // Update metrics
        const metricCards = this.container.querySelectorAll('.metric-card .metric-value');
        if (metricCards.length >= 3) {
            metricCards[0].textContent = this.formatNumber(this.currentAgent.metrics.tokens);
            metricCards[1].textContent = this.currentAgent.metrics.tasks;
            metricCards[2].textContent = this.currentAgent.metrics.uptime;
        }

        // Update status
        const statusElements = this.container.querySelectorAll('.agent-status-dot, .agent-status-badge');
        statusElements.forEach(el => {
            if (el.classList.contains('agent-status-dot')) {
                el.className = el.className.replace(/agent-status-dot--\w+/g, '');
                el.classList.add(`agent-status-dot--${this.currentAgent.status}`);
            } else if (el.classList.contains('status-pill')) {
                el.className = el.className.replace(/status-pill--\w+/g, '');
                el.classList.add(`status-pill--${this.currentAgent.status}`);
                el.textContent = this.getStatusText(this.currentAgent.status);
            }
        });
    }

    updateSkillsSection() {
        // Re-render skills section
        const skillsSection = this.container.querySelector('.skills-section');
        if (skillsSection && this.currentAgent) {
            skillsSection.outerHTML = this.renderSkillsSection();
            // Re-bind events for the new section
            this.bindDetailEvents();
        }
    }

    // Helper methods
    calculateTaskProgress() {
        const agent = this.currentAgent;
        if (!agent) return 0;
        
        // Simple progress calculation based on status and uptime
        const statusProgress = {
            active: 65,
            busy: 80,
            idle: 10,
            error: 25
        };
        
        return statusProgress[agent.status] || 0;
    }

    getTodoIcon(status) {
        const icons = {
            pending: '⬜',
            progress: '🔄',
            done: '✅',
            blocked: '🔴'
        };
        return icons[status] || '⬜';
    }

    getStatusText(status) {
        const statusText = {
            active: 'Active',
            busy: 'Busy',
            idle: 'Idle',
            error: 'Error'
        };
        return statusText[status] || 'Unknown';
    }

    getSkillCategory(skill) {
        // Simple categorization based on skill name
        const skillKeywords = {
            ai: ['orchestration', 'vision', 'strategy'],
            dev: ['engineering', 'architecture', 'security'],
            comm: ['branding', 'content', 'copywriting'],
            data: ['research', 'analytics'],
            auto: ['operations', 'workflows', 'process']
        };

        for (const [category, keywords] of Object.entries(skillKeywords)) {
            if (keywords.some(keyword => skill.toLowerCase().includes(keyword))) {
                return category;
            }
        }
        
        return 'ai'; // default
    }

    getSkillIcon(skill) {
        const skillIcons = {
            orchestration: '🎯',
            strategy: '📊',
            vision: '🔮',
            leadership: '👥',
            operations: '⚙️',
            process: '📋',
            documentation: '📝',
            workflows: '🔄',
            engineering: '🛠️',
            security: '🔒',
            architecture: '🏗️',
            performance: '⚡',
            revenue: '💰',
            growth: '📈',
            sales: '🎯',
            research: '🔍',
            branding: '🎨',
            content: '📱',
            video: '🎬',
            copywriting: '✍️',
            audit: '🛡️',
            qa: '✅',
            risk: '⚠️',
            review: '🔍'
        };
        
        return skillIcons[skill] || '🎯';
    }

    formatSkillName(skill) {
        return skill.charAt(0).toUpperCase() + skill.slice(1);
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

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
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
        // Remove event listeners
        FleetEvents.off('navigate', this.showAgent.bind(this));
        FleetEvents.off('data:agents:updated', this.updateAgentData.bind(this));
        FleetEvents.off('todo:item:updated', this.handleTodoUpdate.bind(this));
        FleetEvents.off('skills:agent:updated', this.updateSkillsSection.bind(this));
    }
}

// Auto-initialize if container exists
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('agent-panel')) {
            window.AgentPanel = new AgentPanel('agent-panel');
        }
    });
} else {
    if (document.getElementById('agent-panel')) {
        window.AgentPanel = new AgentPanel('agent-panel');
    }
}