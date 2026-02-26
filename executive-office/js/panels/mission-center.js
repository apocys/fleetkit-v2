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
        // Store bound handlers so destroy() can actually remove them
        this._onNavigate = (data) => {
            if (data.panel === 'missions') {
                this.showMissionsList();
            } else if (data.panel === 'mission' && data.id) {
                this.showMissionDetail(data.id);
            } else if (data.panel !== 'missions' && data.panel !== 'mission') {
                this.hide();
            }
        };
        this._onMissionsUpdated = (missions) => {
            this.missions = missions;
            this.updateMissionsList();
        };
        this._onMissionUpdated = (data) => this.handleMissionUpdate(data);
        this._onTodoUpdated = (data) => this.handleMissionTodoUpdate(data);
        this._onMissionAction = (data) => this.handleMissionAction(data);

        FleetEvents.on('navigate', this._onNavigate);
        FleetEvents.on('data:missions:updated', this._onMissionsUpdated);
        FleetEvents.on('mission:updated', this._onMissionUpdated);
        FleetEvents.on('mission:todo:updated', this._onTodoUpdated);
        FleetEvents.on('mission:action', this._onMissionAction);
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
                        <div class="quick-mission-form">
                            <input type="text" class="quick-mission-input" placeholder="Mission name...">
                            <button class="quick-mission-submit-btn">Create</button>
                        </div>
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
        const progressPercent = Math.round((mission.progress || 0) * 100);
        const completedTodos = (mission.todo || []).filter(t => t.status === 'done').length;
        const totalTodos = (mission.todo || []).length;
        
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
                            ${completedTodos}/${totalTodos} tasks
                        </div>
                        <div class="mission-agents">
                            <span class="agents-icon">👥</span>
                            ${(mission.assignedAgents || []).length} agents
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
        const progressPercent = Math.round((mission.progress || 0) * 100);
        
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
                                ${this.renderAssignedAgents(mission.assignedAgents || [])}
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

    // ─── Safe kanban refresh (avoids outerHTML detached-node bug) ────────────

    _refreshKanban(mission) {
        if (!mission || this.view !== 'detail' || this.currentMissionId !== mission.id) return;
        const kanbanContainer = this.container.querySelector('.mission-kanban');
        if (!kanbanContainer) return;
        // Replace inner content, keeping the wrapper node in the DOM
        const tmpDiv = document.createElement('div');
        tmpDiv.innerHTML = this.renderMissionKanban(mission);
        const newKanban = tmpDiv.firstElementChild;
        kanbanContainer.replaceWith(newKanban);
        // Re-bind only kanban-specific events (tasks, inputs, drag-and-drop)
        this._bindKanbanEvents();
    }

    _bindKanbanEvents() {
        // Task action buttons
        this.container.querySelectorAll('.task-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action    = e.currentTarget.dataset.action;
                const todoId    = parseInt(e.currentTarget.dataset.todoId, 10);
                const missionId = e.currentTarget.dataset.missionId;
                this.handleTaskAction(missionId, todoId, action);
            });
        });

        // Add Task buttons
        this.container.querySelectorAll('.kanban-add-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const missionId = btn.dataset.missionId;
                const status    = btn.dataset.status;
                const input = this.container.querySelector(
                    `.kanban-add-input[data-status="${status}"][data-mission-id="${missionId}"]`
                );
                if (input) {
                    this.addTaskToMission(missionId, input.value, status);
                    input.value = '';
                }
            });
        });

        // Add Task Enter key
        this.container.querySelectorAll('.kanban-add-input').forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const missionId = input.dataset.missionId;
                    const status    = input.dataset.status;
                    this.addTaskToMission(missionId, input.value, status);
                    input.value = '';
                }
            });
        });

        // Drag and drop
        this.initializeDragAndDrop();
    }

    renderMissionKanban(mission) {
        const todosByStatus = this.groupTodosByStatus(mission.todo || []);
        
        const columns = [
            { key: 'pending',  icon: '⬜', label: 'Pending',     todos: todosByStatus.pending,  alwaysShow: true  },
            { key: 'progress', icon: '🔄', label: 'In Progress', todos: todosByStatus.progress, alwaysShow: true  },
            { key: 'done',     icon: '✅', label: 'Done',        todos: todosByStatus.done,     alwaysShow: true  },
            { key: 'blocked',  icon: '🔴', label: 'Blocked',     todos: todosByStatus.blocked,  alwaysShow: false }
        ];

        const columnsHtml = columns
            .filter(col => col.alwaysShow || col.todos.length > 0)
            .map(col => `
                <div class="kanban-column${col.key === 'blocked' ? ' kanban-column--blocked' : ''}">
                    <div class="kanban-header">
                        <h3 class="kanban-title">
                            <span class="kanban-icon">${col.icon}</span>
                            ${col.label}
                        </h3>
                        <div class="kanban-count">${col.todos.length}</div>
                    </div>
                    <div class="kanban-tasks" data-status="${col.key}">
                        ${col.todos.map(todo => this.renderKanbanTask(todo, mission.id)).join('')}
                    </div>
                    <div class="kanban-add-task">
                        <input type="text"
                               placeholder="Add task..."
                               class="kanban-add-input"
                               data-status="${col.key}"
                               data-mission-id="${mission.id}">
                        <button class="kanban-add-btn"
                                data-status="${col.key}"
                                data-mission-id="${mission.id}">+</button>
                    </div>
                </div>
            `).join('');

        return `<div class="mission-kanban">${columnsHtml}</div>`;
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
        
        // Delete button for all statuses
        actions.push(`<button class="task-action-btn" data-action="delete" data-todo-id="${todo.id}" data-mission-id="${missionId}" title="Delete Task">🗑️</button>`);

        return actions.join('');
    }

    // ─── "Create Mission" logic ──────────────────────────────────────────────

    createMission(name) {
        name = (name || '').trim();
        if (!name) return;

        const newMission = {
            id: 'mission-' + Date.now(),
            name,
            status: 'active',
            progress: 0,
            assignedAgents: [],
            todo: [],
            createdAt: new Date().toISOString()
        };

        FleetState.addMission(newMission);
        // addMission already emits data:missions:updated, which triggers updateMissionsList
    }

    // ─── "Add Task" logic ─────────────────────────────────────────────────────

    addTaskToMission(missionId, text, status) {
        text = (text || '').trim();
        if (!text) return;

        const mission = FleetState.getMission(missionId);
        if (!mission) return;

        const existingIds = (mission.todo || []).map(t => t.id).filter(id => typeof id === 'number');
        const newId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : Date.now();

        const newTodo = {
            id: newId,
            text,
            status: status || 'pending'
        };

        FleetState.addTodo(missionId, newTodo);

        // Re-render kanban inline
        const updatedMission = FleetState.getMission(missionId);
        this._refreshKanban(updatedMission);
    }

    // ─── Event binding ────────────────────────────────────────────────────────

    bindMissionsListEvents() {
        // Header "Create Mission" button → open modal
        this.container.querySelectorAll('.create-mission-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.showCreateMissionModal();
            });
        });

        // Quick create form in empty state
        const quickInput = this.container.querySelector('.quick-mission-input');
        const quickBtn   = this.container.querySelector('.quick-mission-submit-btn');

        if (quickBtn && quickInput) {
            const submit = () => {
                this.createMission(quickInput.value);
                quickInput.value = '';
            };
            quickBtn.addEventListener('click', submit);
            quickInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') submit();
            });
        }

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
                const action    = e.currentTarget.dataset.action;
                const todoId    = parseInt(e.currentTarget.dataset.todoId, 10);
                const missionId = e.currentTarget.dataset.missionId;
                this.handleTaskAction(missionId, todoId, action);
            });
        });

        // Agent tag clicks
        this.container.querySelectorAll('.agent-tag[data-agent-id]').forEach(tag => {
            tag.addEventListener('click', () => {
                const agentId = tag.dataset.agentId;
                FleetEvents.emit('navigate', { panel: 'agent', id: agentId });
            });
        });

        // ── Add Task inputs ──────────────────────────────────────────────────
        this.container.querySelectorAll('.kanban-add-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const missionId = btn.dataset.missionId;
                const status    = btn.dataset.status;
                const input = this.container.querySelector(
                    `.kanban-add-input[data-status="${status}"][data-mission-id="${missionId}"]`
                );
                if (input) {
                    this.addTaskToMission(missionId, input.value, status);
                    input.value = '';
                }
            });
        });

        this.container.querySelectorAll('.kanban-add-input').forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const missionId = input.dataset.missionId;
                    const status    = input.dataset.status;
                    this.addTaskToMission(missionId, input.value, status);
                    input.value = '';
                }
            });
        });

        // Drag and drop for kanban tasks
        this.initializeDragAndDrop();
    }

    handleTaskAction(missionId, todoId, action) {
        if (action === 'delete') {
            // Remove the todo from the mission directly
            const mission = FleetState.getMission(missionId);
            if (!mission) return;
            mission.todo = (mission.todo || []).filter(t => t.id !== todoId);
            FleetState._recalcProgress(mission);
            FleetState._saveToStorage();
            FleetEvents.emit('data:missions:updated', FleetState.getMissions());
            // Re-render kanban
            this._refreshKanban(mission);
            return;
        }

        const statusMap = {
            start:   'progress',
            complete: 'done',
            pause:   'pending',
            unblock: 'pending',
            reopen:  'pending'
        };

        const newStatus = statusMap[action];
        if (!newStatus) return;

        FleetState.updateTodo(missionId, todoId, { status: newStatus });

        // Re-render kanban
        const mission = FleetState.getMission(missionId);
        this._refreshKanban(mission);
    }

    handleMissionTodoUpdate(data) {
        // Legacy path kept for external callers
        this.handleTaskAction(data.missionId, data.todoId, 
            { pending: 'pause', progress: 'start', done: 'complete' }[data.status] || 'pause'
        );
    }

    handleMissionAction(data) {
        const { missionId, action } = data;
        switch (action) {
            case 'delete':
                FleetState.deleteMission(missionId);
                if (this.view === 'detail' && this.currentMissionId === missionId) {
                    FleetEvents.emit('navigate', { panel: 'missions' });
                }
                break;
            case 'pause': {
                const mission = FleetState.getMission(missionId);
                if (mission) {
                    FleetState.updateMission(missionId, { status: 'paused' });
                }
                break;
            }
        }
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
                    const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
                    const newStatus = column.dataset.status;
                    
                    if (dragData.currentStatus !== newStatus) {
                        FleetState.updateTodo(dragData.missionId, parseInt(dragData.todoId, 10), { status: newStatus });
                        const mission = FleetState.getMission(dragData.missionId);
                        this._refreshKanban(mission);
                    }
                } catch (error) {
                    console.warn('Drag and drop failed:', error);
                }
            });
        });
    }

    // ─── Create Mission Modal ─────────────────────────────────────────────────

    showCreateMissionModal() {
        // Remove any existing modal
        const existing = document.getElementById('create-mission-modal');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'create-mission-modal';
        overlay.style.cssText = `
            position: fixed; inset: 0; background: rgba(0,0,0,0.4);
            display: flex; align-items: center; justify-content: center;
            z-index: 9999;
        `;
        overlay.innerHTML = `
            <div style="
                background: var(--bg-primary, #fff);
                border-radius: 16px;
                padding: 32px;
                width: 440px;
                max-width: 90vw;
                box-shadow: 0 20px 60px rgba(0,0,0,0.2);
            ">
                <h2 style="font-size:18px;font-weight:700;margin-bottom:8px;">🚀 New Mission</h2>
                <p style="font-size:13px;color:var(--text-tertiary,#888);margin-bottom:20px;">
                    Give your mission a name to get started.
                </p>
                <div class="quick-mission-form" style="margin-top:0;">
                    <input type="text" id="modal-mission-name" class="quick-mission-form input"
                           placeholder="Mission name..." autofocus
                           style="flex:1;padding:10px 14px;border:1px solid var(--border-medium,#ddd);
                                  border-radius:10px;font-size:14px;outline:none;font-family:inherit;">
                    <button id="modal-mission-create"
                            style="padding:10px 20px;background:var(--exec-blue,#007AFF);color:#fff;
                                   border:none;border-radius:10px;font-weight:600;cursor:pointer;
                                   font-size:14px;white-space:nowrap;">
                        Create
                    </button>
                </div>
                <div style="display:flex;justify-content:flex-end;margin-top:16px;">
                    <button id="modal-mission-cancel"
                            style="background:none;border:none;color:var(--text-secondary,#666);
                                   cursor:pointer;font-size:13px;padding:6px 12px;">
                        Cancel
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const nameInput = overlay.querySelector('#modal-mission-name');
        const createBtn = overlay.querySelector('#modal-mission-create');
        const cancelBtn = overlay.querySelector('#modal-mission-cancel');

        const submit = () => {
            const name = nameInput.value.trim();
            if (!name) {
                nameInput.style.borderColor = '#FF453A';
                nameInput.focus();
                return;
            }
            this.createMission(name);
            overlay.remove();
        };

        createBtn.addEventListener('click', submit);
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') overlay.remove();
        });
        cancelBtn.addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        // focus after insertion
        setTimeout(() => nameInput.focus(), 50);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    getActionForStatus(status) {
        const actionMap = {
            pending:  'pause',
            progress: 'start',
            done:     'complete',
            blocked:  'block'
        };
        return actionMap[status] || 'pause';
    }

    groupTodosByStatus(todos) {
        return {
            pending:  todos.filter(t => t.status === 'pending'),
            progress: todos.filter(t => t.status === 'progress'),
            done:     todos.filter(t => t.status === 'done'),
            blocked:  todos.filter(t => t.status === 'blocked')
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
            const mission = FleetState.getMission(data.missionId);
            this._refreshKanban(mission);
        } else if (this.view === 'list') {
            this.updateMissionsList();
        }
    }

    showMissionMenu(button, missionId) {
        // Remove any existing context menus
        document.querySelectorAll('.mission-context-menu').forEach(m => m.remove());

        const menu = document.createElement('div');
        menu.className = 'mission-context-menu';
        menu.innerHTML = `
            <button class="menu-item" data-action="view"   data-mission-id="${missionId}">View Details</button>
            <button class="menu-item" data-action="pause"  data-mission-id="${missionId}">Pause Mission</button>
            <button class="menu-item menu-item--danger" data-action="delete" data-mission-id="${missionId}">Delete Mission</button>
        `;

        // Position the menu
        const rect = button.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = `${rect.bottom + 5}px`;
        menu.style.right = `${window.innerWidth - rect.right}px`;
        menu.style.zIndex = '1000';

        document.body.appendChild(menu);

        // Handle menu clicks
        menu.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const id     = e.target.dataset.missionId;
                this.handleMissionMenuAction(action, id);
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
            case 'view':
                FleetEvents.emit('navigate', { panel: 'mission', id: missionId });
                break;
            case 'pause':
                FleetState.updateMission(missionId, { status: 'paused' });
                break;
            case 'delete':
                if (confirm('Are you sure you want to delete this mission?')) {
                    FleetState.deleteMission(missionId);
                }
                break;
        }
    }

    getMissionStatusIcon(status) {
        const icons = {
            active:    '🟢',
            paused:    '🟡',
            completed: '✅',
            failed:    '❌'
        };
        return icons[status] || '⚪';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now  = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0)      return 'Today';
        if (diffDays === 1)      return 'Yesterday';
        if (diffDays < 7)        return `${diffDays} days ago`;
        return date.toLocaleDateString();
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
        // Remove event listeners using stored references
        if (this._onNavigate) FleetEvents.off('navigate', this._onNavigate);
        if (this._onMissionsUpdated) FleetEvents.off('data:missions:updated', this._onMissionsUpdated);
        if (this._onMissionUpdated) FleetEvents.off('mission:updated', this._onMissionUpdated);
        if (this._onTodoUpdated) FleetEvents.off('mission:todo:updated', this._onTodoUpdated);
        if (this._onMissionAction) FleetEvents.off('mission:action', this._onMissionAction);
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
