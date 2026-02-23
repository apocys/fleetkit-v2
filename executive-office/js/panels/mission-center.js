/**
 * FleetKit Executive Office V4 - Mission Center Panel
 * Mission management with kanban-style TODO visualization
 */

class MissionCenterPanel {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.missions = [];
        this.currentMissionId = null;
        this.view = 'list'; // 'list' | 'detail'
        
        this.init();
        this.bindEvents();
    }

    init() {
        this.render();
    }

    bindEvents() {
        // Listen for navigation to missions
        FleetEvents.on('navigate', (data) => {
            if (data.panel === 'missions') {
                this.showMissionsList();
            } else if (data.panel === 'mission' && data.id) {
                this.showMissionDetail(data.id);
            } else if (data.panel !== 'missions' && data.panel !== 'mission') {
                this.hide();
            }
        });

        // Listen for mission data updates
        FleetEvents.on('data:missions:updated', (missions) => {
            this.missions = missions;
            this.updateMissionsList();
        });

        // Listen for mission updates
        FleetEvents.on('mission:updated', (data) => {
            this.handleMissionUpdate(data);
        });

        // Listen for TODO updates in missions
        FleetEvents.on('mission:todo:updated', (data) => {
            this.handleMissionTodoUpdate(data);
        });
    }

    render() {
        this.container.innerHTML = `
            <div class="mission-center-container">
                <!-- Content will be populated based on view -->
                <div class="mission-placeholder">
                    <div class="placeholder-icon">🎯</div>
                    <h3>Mission Command</h3>
                    <p>Navigate to missions to see active operations</p>
                </div>
            </div>
        `;
    }

    showMissionsList() {
        this.view = 'list';
        this.currentMissionId = null;
        this.renderMissionsList();
        this.show();
    }

    showMissionDetail(missionId) {
        this.view = 'detail';
        this.currentMissionId = missionId;
        this.renderMissionDetail(missionId);
        this.show();
    }

    renderMissionsList() {
        const missions = FleetState.getMissions();
        
        if (missions.length === 0) {
            this.container.innerHTML = `
                <div class="mission-center-container">
                    <div class="mission-header">
                        <h2>Mission Command</h2>
                        <button class="create-mission-btn btn btn--primary">
                            <span class="btn-icon">🚀</span>
                            Create Mission
                        </button>
                    </div>
                    <div class="empty-state">
                        <div class="empty-icon">🎯</div>
                        <h3>No Active Missions</h3>
                        <p>Create your first mission to orchestrate your fleet</p>
                        <button class="create-mission-btn btn btn--primary">
                            Create Mission
                        </button>
                    </div>
                </div>
            `;
        } else {
            this.container.innerHTML = `
                <div class="mission-center-container">
                    ${this.renderMissionsHeader(missions)}
                    ${this.renderMissionsGrid(missions)}
                </div>
            `;
        }

        this.bindMissionsListEvents();
    }

    renderMissionsHeader(missions) {
        const activeMissions = missions.filter(m => m.status === 'active').length;
        const completedMissions = missions.filter(m => m.status === 'completed').length;
        
        return `
            <div class="mission-header">
                <div class="mission-header-info">
                    <h2>Mission Command</h2>
                    <div class="mission-stats">
                        <div class="mission-stat">
                            <div class="mission-stat-value">${activeMissions}</div>
                            <div class="mission-stat-label">Active</div>
                        </div>
                        <div class="mission-stat">
                            <div class="mission-stat-value">${completedMissions}</div>
                            <div class="mission-stat-label">Completed</div>
                        </div>
                        <div class="mission-stat">
                            <div class="mission-stat-value">${missions.length}</div>
                            <div class="mission-stat-label">Total</div>
                        </div>
                    </div>
                </div>
                <button class="create-mission-btn btn btn--primary">
                    <span class="btn-icon">🚀</span>
                    Create Mission
                </button>
            </div>
        `;
    }

    renderMissionsGrid(missions) {
        const missionCards = missions.map(mission => this.renderMissionCard(mission)).join('');
        
        return `
            <div class="missions-grid">
                ${missionCards}
            </div>
        `;
    }

    renderMissionCard(mission) {
        const statusIcon = this.getMissionStatusIcon(mission.status);
        const progressPercent = Math.round(mission.progress * 100);
        const completedTodos = mission.todo.filter(t => t.status === 'done').length;
        
        return `
            <div class="mission-card" data-mission-id="${mission.id}">
                <div class="mission-card-header">
                    <div class="mission-status-indicator">
                        <div class="mission-status-dot status-pill--${mission.status}"></div>
                        <span class="mission-status-text">${mission.status}</span>
                    </div>
                    <div class="mission-menu">
                        <button class="mission-menu-btn" data-mission-id="${mission.id}">⋯</button>
                    </div>
                </div>
                
                <div class="mission-card-body">
                    <h3 class="mission-name">${mission.name}</h3>
                    <div class="mission-progress-section">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                        <div class="progress-text">${progressPercent}% Complete</div>
                    </div>
                    
                    <div class="mission-meta">
                        <div class="mission-todo-count">
                            <span class="todo-icon">📋</span>
                            ${completedTodos}/${mission.todo.length} tasks
                        </div>
                        <div class="mission-agents">
                            <span class="agents-icon">👥</span>
                            ${mission.assignedAgents.length} agents
                        </div>
                    </div>
                </div>
                
                <div class="mission-card-footer">
                    <div class="mission-date">
                        Created ${this.formatDate(mission.createdAt)}
                    </div>
                    <button class="mission-view-btn" data-mission-id="${mission.id}">
                        View Details →
                    </button>
                </div>
            </div>
        `;
    }

    renderMissionDetail(missionId) {
        const mission = FleetState.getMission(missionId);
        
        if (!mission) {
            this.container.innerHTML = `
                <div class="mission-center-container">
                    <div class="error-state">
                        <div class="error-icon">❌</div>
                        <h3>Mission Not Found</h3>
                        <p>The requested mission could not be found</p>
                        <button class="back-to-missions-btn btn btn--secondary">
                            ← Back to Missions
                        </button>
                    </div>
                </div>
            `;
            this.bindMissionDetailEvents();
            return;
        }

        this.container.innerHTML = `
            <div class="mission-center-container">
                ${this.renderMissionDetailHeader(mission)}
                ${this.renderMissionKanban(mission)}
            </div>
        `;

        this.bindMissionDetailEvents();
    }

    renderMissionDetailHeader(mission) {
        const progressPercent = Math.round(mission.progress * 100);
        
        return `
            <div class="mission-detail-header">
                <div class="mission-detail-nav">
                    <button class="back-to-missions-btn" aria-label="Back to Missions">
                        <span>←</span>
                    </button>
                    <div class="mission-breadcrumb">
                        <span class="breadcrumb-item">Missions</span>
                        <span class="breadcrumb-separator">/</span>
                        <span class="breadcrumb-current">${mission.name}</span>
                    </div>
                </div>
                
                <div class="mission-detail-info">
                    <div class="mission-title-section">
                        <h2 class="mission-title">${mission.name}</h2>
                        <div class="mission-status-badge status-pill status-pill--${mission.status}">
                            ${this.getMissionStatusIcon(mission.status)} ${mission.status}
                        </div>
                    </div>
                    
                    <div class="mission-progress-detail">
                        <div class="progress-bar-large">
                            <div class="progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                        <div class="progress-detail-text">${progressPercent}% Complete</div>
                    </div>
                    
                    <div class="mission-meta-detail">
                        <div class="meta-item">
                            <span class="meta-label">Assigned Agents:</span>
                            <div class="assigned-agents">
                                ${this.renderAssignedAgents(mission.assignedAgents)}
                            </div>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Created:</span>
                            <span class="meta-value">${this.formatDate(mission.createdAt)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderAssignedAgents(agentIds) {
        return agentIds.map(agentId => {
            const agent = FleetState.getAgent(agentId);
            if (!agent) return `<span class="agent-tag">${agentId}</span>`;
            
            return `
                <div class="agent-tag" data-agent-id="${agentId}">
                    <span class="agent-emoji">${agent.emoji || '🤖'}</span>
                    ${agent.name}
                </div>
            `;
        }).join('');
    }

    renderMissionKanban(mission) {
        const todosByStatus = this.groupTodosByStatus(mission.todo);
        
        return `
            <div class="mission-kanban">
                <div class="kanban-column">
                    <div class="kanban-header">
                        <h3 class="kanban-title">
                            <span class="kanban-icon">⬜</span>
                            Pending
                        </h3>
                        <div class="kanban-count">${todosByStatus.pending.length}</div>
                    </div>
                    <div class="kanban-tasks" data-status="pending">
                        ${todosByStatus.pending.map(todo => this.renderKanbanTask(todo, mission.id)).join('')}
                    </div>
                </div>
                
                <div class="kanban-column">
                    <div class="kanban-header">
                        <h3 class="kanban-title">
                            <span class="kanban-icon">🔄</span>
                            In Progress
                        </h3>
                        <div class="kanban-count">${todosByStatus.progress.length}</div>
                    </div>
                    <div class="kanban-tasks" data-status="progress">
                        ${todosByStatus.progress.map(todo => this.renderKanbanTask(todo, mission.id)).join('')}
                    </div>
                </div>
                
                <div class="kanban-column">
                    <div class="kanban-header">
                        <h3 class="kanban-title">
                            <span class="kanban-icon">✅</span>
                            Done
                        </h3>
                        <div class="kanban-count">${todosByStatus.done.length}</div>
                    </div>
                    <div class="kanban-tasks" data-status="done">
                        ${todosByStatus.done.map(todo => this.renderKanbanTask(todo, mission.id)).join('')}
                    </div>
                </div>
                
                ${todosByStatus.blocked.length > 0 ? `
                    <div class="kanban-column kanban-column--blocked">
                        <div class="kanban-header">
                            <h3 class="kanban-title">
                                <span class="kanban-icon">🔴</span>
                                Blocked
                            </h3>
                            <div class="kanban-count">${todosByStatus.blocked.length}</div>
                        </div>
                        <div class="kanban-tasks" data-status="blocked">
                            ${todosByStatus.blocked.map(todo => this.renderKanbanTask(todo, mission.id)).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderKanbanTask(todo, missionId) {
        return `
            <div class="kanban-task" 
                 data-todo-id="${todo.id}" 
                 data-mission-id="${missionId}"
                 draggable="true">
                <div class="task-content">
                    <div class="task-title">${todo.text}</div>
                    ${todo.assignee ? `
                        <div class="task-assignee">
                            <span class="assignee-icon">👤</span>
                            ${todo.assignee}
                        </div>
                    ` : ''}
                </div>
                <div class="task-actions">
                    ${this.renderTaskActions(todo, missionId)}
                </div>
            </div>
        `;
    }

    renderTaskActions(todo, missionId) {
        const actions = [];
        
        switch (todo.status) {
            case 'pending':
                actions.push(`<button class="task-action-btn" data-action="start" data-todo-id="${todo.id}" data-mission-id="${missionId}" title="Start Task">▶️</button>`);
                break;
            case 'progress':
                actions.push(`<button class="task-action-btn" data-action="complete" data-todo-id="${todo.id}" data-mission-id="${missionId}" title="Mark Complete">✅</button>`);
                actions.push(`<button class="task-action-btn" data-action="pause" data-todo-id="${todo.id}" data-mission-id="${missionId}" title="Pause Task">⏸️</button>`);
                break;
            case 'blocked':
                actions.push(`<button class="task-action-btn" data-action="unblock" data-todo-id="${todo.id}" data-mission-id="${missionId}" title="Unblock Task">🔓</button>`);
                break;
            case 'done':
                actions.push(`<button class="task-action-btn" data-action="reopen" data-todo-id="${todo.id}" data-mission-id="${missionId}" title="Reopen Task">↩️</button>`);
                break;
        }
        
        return actions.join('');
    }

    bindMissionsListEvents() {
        // Create mission button
        this.container.querySelectorAll('.create-mission-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                FleetEvents.emit('wizard:open', { type: 'create-mission' });
            });
        });

        // Mission card clicks
        this.container.querySelectorAll('.mission-view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const missionId = e.target.dataset.missionId;
                FleetEvents.emit('navigate', { panel: 'mission', id: missionId });
            });
        });

        // Mission menu buttons
        this.container.querySelectorAll('.mission-menu-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const missionId = e.target.dataset.missionId;
                this.showMissionMenu(e.target, missionId);
            });
        });
    }

    bindMissionDetailEvents() {
        // Back to missions button
        const backBtn = this.container.querySelector('.back-to-missions-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                FleetEvents.emit('navigate', { panel: 'missions' });
            });
        }

        // Task action buttons
        this.container.querySelectorAll('.task-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const todoId = e.target.dataset.todoId;
                const missionId = e.target.dataset.missionId;
                this.handleTaskAction(missionId, parseInt(todoId), action);
            });
        });

        // Agent tag clicks
        this.container.querySelectorAll('.agent-tag[data-agent-id]').forEach(tag => {
            tag.addEventListener('click', () => {
                const agentId = tag.dataset.agentId;
                FleetEvents.emit('navigate', { panel: 'agent', id: agentId });
            });
        });

        // Drag and drop for kanban tasks
        this.initializeDragAndDrop();
    }

    handleTaskAction(missionId, todoId, action) {
        const statusMap = {
            start: 'progress',
            complete: 'done',
            pause: 'pending',
            unblock: 'pending',
            reopen: 'pending'
        };

        const newStatus = statusMap[action];
        if (!newStatus) return;

        // Emit the update event
        FleetEvents.emit('mission:todo:updated', {
            missionId,
            todoId,
            status: newStatus
        });

        // Update the UI immediately
        this.updateTaskStatus(missionId, todoId, newStatus);
    }

    updateTaskStatus(missionId, todoId, newStatus) {
        // Find the task element and move it to the appropriate column
        const taskElement = this.container.querySelector(`[data-todo-id="${todoId}"][data-mission-id="${missionId}"]`);
        if (!taskElement) return;

        // Update the mission data locally
        const mission = FleetState.getMission(missionId);
        if (mission) {
            const todo = mission.todo.find(t => t.id === todoId);
            if (todo) {
                todo.status = newStatus;
                // Update mission progress
                const completedTodos = mission.todo.filter(t => t.status === 'done').length;
                mission.progress = completedTodos / mission.todo.length;
            }
        }

        // Re-render the kanban to reflect the changes
        if (this.view === 'detail' && this.currentMissionId === missionId) {
            const kanbanContainer = this.container.querySelector('.mission-kanban');
            if (kanbanContainer && mission) {
                kanbanContainer.outerHTML = this.renderMissionKanban(mission);
                this.bindMissionDetailEvents();
            }
        }
    }

    handleMissionTodoUpdate(data) {
        this.updateTaskStatus(data.missionId, data.todoId, data.status);
    }

    initializeDragAndDrop() {
        const tasks = this.container.querySelectorAll('.kanban-task');
        const columns = this.container.querySelectorAll('.kanban-tasks');

        tasks.forEach(task => {
            task.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', task.dataset.todoId);
                e.dataTransfer.setData('application/json', JSON.stringify({
                    todoId: task.dataset.todoId,
                    missionId: task.dataset.missionId,
                    currentStatus: task.closest('.kanban-tasks').dataset.status
                }));
                task.classList.add('dragging');
            });

            task.addEventListener('dragend', () => {
                task.classList.remove('dragging');
            });
        });

        columns.forEach(column => {
            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                column.classList.add('drag-over');
            });

            column.addEventListener('dragleave', () => {
                column.classList.remove('drag-over');
            });

            column.addEventListener('drop', (e) => {
                e.preventDefault();
                column.classList.remove('drag-over');

                try {
                    const data = JSON.parse(e.dataTransfer.getData('application/json'));
                    const newStatus = column.dataset.status;
                    
                    if (data.currentStatus !== newStatus) {
                        this.handleTaskAction(data.missionId, parseInt(data.todoId), this.getActionForStatus(newStatus));
                    }
                } catch (error) {
                    console.warn('Drag and drop failed:', error);
                }
            });
        });
    }

    getActionForStatus(status) {
        const actionMap = {
            pending: 'pause',
            progress: 'start',
            done: 'complete',
            blocked: 'block'
        };
        return actionMap[status] || 'pause';
    }

    groupTodosByStatus(todos) {
        return {
            pending: todos.filter(t => t.status === 'pending'),
            progress: todos.filter(t => t.status === 'progress'),
            done: todos.filter(t => t.status === 'done'),
            blocked: todos.filter(t => t.status === 'blocked')
        };
    }

    updateMissionsList() {
        if (this.view === 'list') {
            this.renderMissionsList();
        }
    }

    handleMissionUpdate(data) {
        // Handle mission updates (status changes, etc.)
        if (this.view === 'detail' && this.currentMissionId === data.missionId) {
            this.renderMissionDetail(data.missionId);
        } else if (this.view === 'list') {
            this.updateMissionsList();
        }
    }

    showMissionMenu(button, missionId) {
        // Simple context menu (could be enhanced with a proper dropdown)
        const menu = document.createElement('div');
        menu.className = 'mission-context-menu';
        menu.innerHTML = `
            <button class="menu-item" data-action="edit" data-mission-id="${missionId}">Edit Mission</button>
            <button class="menu-item" data-action="pause" data-mission-id="${missionId}">Pause Mission</button>
            <button class="menu-item menu-item--danger" data-action="delete" data-mission-id="${missionId}">Delete Mission</button>
        `;

        // Position the menu
        const rect = button.getBoundingClientRect();
        menu.style.position = 'absolute';
        menu.style.top = `${rect.bottom + 5}px`;
        menu.style.right = `${window.innerWidth - rect.right}px`;
        menu.style.zIndex = '1000';

        document.body.appendChild(menu);

        // Handle menu clicks
        menu.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const missionId = e.target.dataset.missionId;
                this.handleMissionMenuAction(action, missionId);
                menu.remove();
            });
        });

        // Close menu on outside click
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 100);
    }

    handleMissionMenuAction(action, missionId) {
        switch (action) {
            case 'edit':
                FleetEvents.emit('wizard:open', { type: 'edit-mission', missionId });
                break;
            case 'pause':
                FleetEvents.emit('mission:action', { missionId, action: 'pause' });
                break;
            case 'delete':
                if (confirm('Are you sure you want to delete this mission?')) {
                    FleetEvents.emit('mission:action', { missionId, action: 'delete' });
                }
                break;
        }
    }

    getMissionStatusIcon(status) {
        const icons = {
            active: '🟢',
            paused: '🟡',
            completed: '✅',
            failed: '❌'
        };
        return icons[status] || '⚪';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString();
        }
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
        FleetEvents.off('navigate', this.showMissionsList.bind(this));
        FleetEvents.off('data:missions:updated', this.updateMissionsList.bind(this));
        FleetEvents.off('mission:updated', this.handleMissionUpdate.bind(this));
        FleetEvents.off('mission:todo:updated', this.handleMissionTodoUpdate.bind(this));
    }
}

// Auto-initialize if container exists
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('missions-panel')) {
            window.MissionCenterPanel = new MissionCenterPanel('missions-panel');
        }
    });
} else {
    if (document.getElementById('missions-panel')) {
        window.MissionCenterPanel = new MissionCenterPanel('missions-panel');
    }
}