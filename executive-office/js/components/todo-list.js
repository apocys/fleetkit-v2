/**
 * FleetKit Executive Office V4 - TODO List Component
 * Reusable TODO list with status pills and interactive actions
 */

class TodoListComponent {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.options = {
            editable: options.editable !== false,
            showStatus: options.showStatus !== false,
            showActions: options.showActions !== false,
            statusTypes: options.statusTypes || ['pending', 'progress', 'done', 'blocked'],
            onItemUpdate: options.onItemUpdate,
            onItemAdd: options.onItemAdd,
            onItemDelete: options.onItemDelete,
            className: options.className || 'todo-list-component',
            ...options
        };
        
        this.items = options.items || [];
        this.nextId = Math.max(...this.items.map(item => item.id || 0), 0) + 1;
        
        this.init();
        this.bindEvents();
    }

    init() {
        if (!this.container) {
            console.error('TodoListComponent: Container not found');
            return;
        }
        
        this.container.classList.add(this.options.className);
        this.render();
    }

    bindEvents() {
        // Delegate events to handle dynamically created elements
        this.container.addEventListener('click', (e) => this.handleClick(e));
        this.container.addEventListener('change', (e) => this.handleChange(e));
        this.container.addEventListener('keydown', (e) => this.handleKeydown(e));
        this.container.addEventListener('blur', (e) => this.handleBlur(e), true);
    }

    render() {
        this.container.innerHTML = `
            <div class="todo-list-wrapper">
                ${this.renderHeader()}
                ${this.renderList()}
                ${this.renderAddForm()}
            </div>
        `;
    }

    renderHeader() {
        if (!this.options.showHeader) return '';
        
        const totalItems = this.items.length;
        const completedItems = this.items.filter(item => item.status === 'done').length;
        const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
        
        return `
            <div class="todo-header">
                <div class="todo-title">
                    <h3>${this.options.title || 'TODO List'}</h3>
                    <div class="todo-stats">
                        <span class="todo-count">${completedItems}/${totalItems} completed</span>
                    </div>
                </div>
                <div class="todo-progress-bar">
                    <div class="todo-progress-fill" style="width: ${progressPercent}%"></div>
                </div>
            </div>
        `;
    }

    renderList() {
        if (this.items.length === 0) {
            return `
                <div class="todo-empty">
                    <div class="todo-empty-icon">📝</div>
                    <p>No tasks yet</p>
                    ${this.options.editable ? '<p class="todo-empty-hint">Add your first task below</p>' : ''}
                </div>
            `;
        }

        const itemsHtml = this.items
            .sort(this.getSortFunction())
            .map(item => this.renderItem(item))
            .join('');

        return `
            <div class="todo-items">
                ${itemsHtml}
            </div>
        `;
    }

    renderItem(item) {
        const statusIcon = this.getStatusIcon(item.status);
        const statusClass = `todo-item--${item.status}`;
        
        return `
            <div class="todo-item ${statusClass}" data-item-id="${item.id}">
                <div class="todo-item-main">
                    ${this.options.showStatus ? `
                        <div class="todo-status">
                            <span class="todo-status-icon">${statusIcon}</span>
                        </div>
                    ` : ''}
                    
                    <div class="todo-content" ${this.options.editable ? 'contenteditable="true"' : ''}>
                        ${this.escapeHtml(item.text || '')}
                    </div>
                    
                    ${this.renderItemMeta(item)}
                </div>
                
                ${this.options.showActions ? this.renderItemActions(item) : ''}
            </div>
        `;
    }

    renderItemMeta(item) {
        const meta = [];
        
        if (item.assignee) {
            meta.push(`<span class="todo-assignee" title="Assigned to ${item.assignee}">👤 ${item.assignee}</span>`);
        }
        
        if (item.dueDate) {
            const dueDate = new Date(item.dueDate);
            const isOverdue = dueDate < new Date() && item.status !== 'done';
            meta.push(`<span class="todo-due-date ${isOverdue ? 'overdue' : ''}" title="Due date">📅 ${this.formatDate(dueDate)}</span>`);
        }
        
        if (item.priority && item.priority !== 'normal') {
            const priorityIcon = this.getPriorityIcon(item.priority);
            meta.push(`<span class="todo-priority todo-priority--${item.priority}" title="${item.priority} priority">${priorityIcon}</span>`);
        }
        
        if (meta.length === 0) return '';
        
        return `<div class="todo-meta">${meta.join('')}</div>`;
    }

    renderItemActions(item) {
        const actions = this.getAvailableActions(item);
        
        if (actions.length === 0) return '';
        
        return `
            <div class="todo-actions">
                ${actions.map(action => `
                    <button class="todo-action-btn todo-action-btn--${action.type}" 
                            data-action="${action.type}" 
                            data-item-id="${item.id}"
                            title="${action.title}">
                        ${action.icon}
                    </button>
                `).join('')}
            </div>
        `;
    }

    renderAddForm() {
        if (!this.options.editable || !this.options.showAddForm) return '';
        
        return `
            <div class="todo-add-form">
                <div class="todo-add-input-wrapper">
                    <input type="text" 
                           class="todo-add-input" 
                           placeholder="${this.options.addPlaceholder || 'Add new task...'}"
                           maxlength="500">
                    <button class="todo-add-btn" type="button">
                        <span class="todo-add-icon">+</span>
                    </button>
                </div>
                ${this.options.showAdvancedAdd ? this.renderAdvancedAddForm() : ''}
            </div>
        `;
    }

    renderAdvancedAddForm() {
        return `
            <div class="todo-add-advanced" style="display: none;">
                <div class="todo-add-row">
                    <label class="todo-add-label">
                        Priority:
                        <select class="todo-add-priority">
                            <option value="low">Low</option>
                            <option value="normal" selected>Normal</option>
                            <option value="high">High</option>
                        </select>
                    </label>
                    
                    <label class="todo-add-label">
                        Due Date:
                        <input type="date" class="todo-add-due-date">
                    </label>
                </div>
                
                <div class="todo-add-row">
                    <label class="todo-add-label">
                        Assignee:
                        <input type="text" class="todo-add-assignee" placeholder="Assign to...">
                    </label>
                    
                    <label class="todo-add-label">
                        Status:
                        <select class="todo-add-status">
                            <option value="pending" selected>Pending</option>
                            <option value="progress">In Progress</option>
                            <option value="done">Done</option>
                            <option value="blocked">Blocked</option>
                        </select>
                    </label>
                </div>
            </div>
        `;
    }

    handleClick(e) {
        const button = e.target.closest('button');
        if (!button) return;
        
        if (button.classList.contains('todo-action-btn')) {
            e.preventDefault();
            this.handleActionClick(button);
        } else if (button.classList.contains('todo-add-btn')) {
            e.preventDefault();
            this.handleAddItem();
        } else if (button.classList.contains('todo-advanced-toggle')) {
            e.preventDefault();
            this.toggleAdvancedForm();
        }
    }

    handleChange(e) {
        if (e.target.classList.contains('todo-status-select')) {
            const itemId = parseInt(e.target.dataset.itemId);
            const newStatus = e.target.value;
            this.updateItemStatus(itemId, newStatus);
        }
    }

    handleKeydown(e) {
        if (e.target.classList.contains('todo-add-input') && e.key === 'Enter') {
            e.preventDefault();
            this.handleAddItem();
        } else if (e.target.classList.contains('todo-content') && e.key === 'Enter') {
            e.preventDefault();
            e.target.blur(); // Save changes
        }
    }

    handleBlur(e) {
        if (e.target.classList.contains('todo-content') && this.options.editable) {
            const itemId = parseInt(e.target.closest('.todo-item').dataset.itemId);
            const newText = e.target.textContent.trim();
            this.updateItemText(itemId, newText);
        }
    }

    handleActionClick(button) {
        const action = button.dataset.action;
        const itemId = parseInt(button.dataset.itemId);
        const item = this.findItem(itemId);
        
        if (!item) return;
        
        switch (action) {
            case 'start':
                this.updateItemStatus(itemId, 'progress');
                break;
            case 'complete':
                this.updateItemStatus(itemId, 'done');
                break;
            case 'pause':
                this.updateItemStatus(itemId, 'pending');
                break;
            case 'unblock':
                this.updateItemStatus(itemId, 'pending');
                break;
            case 'reopen':
                this.updateItemStatus(itemId, 'pending');
                break;
            case 'delete':
                if (confirm('Are you sure you want to delete this task?')) {
                    this.deleteItem(itemId);
                }
                break;
            case 'edit':
                this.editItem(itemId);
                break;
        }
    }

    handleAddItem() {
        const input = this.container.querySelector('.todo-add-input');
        const text = input?.value.trim();
        
        if (!text) return;
        
        const newItem = {
            id: this.nextId++,
            text,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        // Add advanced properties if form is visible
        const advancedForm = this.container.querySelector('.todo-add-advanced');
        if (advancedForm && advancedForm.style.display !== 'none') {
            const priority = advancedForm.querySelector('.todo-add-priority')?.value;
            const dueDate = advancedForm.querySelector('.todo-add-due-date')?.value;
            const assignee = advancedForm.querySelector('.todo-add-assignee')?.value.trim();
            const status = advancedForm.querySelector('.todo-add-status')?.value;
            
            if (priority && priority !== 'normal') newItem.priority = priority;
            if (dueDate) newItem.dueDate = dueDate;
            if (assignee) newItem.assignee = assignee;
            if (status) newItem.status = status;
        }
        
        this.addItem(newItem);
        
        // Clear form
        input.value = '';
        if (advancedForm) {
            advancedForm.querySelectorAll('input, select').forEach(field => {
                if (field.type === 'date' || field.type === 'text') {
                    field.value = '';
                } else if (field.tagName === 'SELECT') {
                    field.selectedIndex = field.querySelector('[selected]') ? 
                        Array.from(field.options).findIndex(opt => opt.hasAttribute('selected')) : 0;
                }
            });
        }
    }

    // Public API methods
    addItem(item) {
        const newItem = {
            id: item.id || this.nextId++,
            text: item.text || '',
            status: item.status || 'pending',
            createdAt: item.createdAt || new Date().toISOString(),
            ...item
        };
        
        this.items.push(newItem);
        this.refresh();
        
        if (this.options.onItemAdd) {
            this.options.onItemAdd(newItem);
        }
        
        this.emitEvent('item:added', newItem);
        return newItem;
    }

    updateItem(itemId, updates) {
        const item = this.findItem(itemId);
        if (!item) return false;
        
        const oldItem = { ...item };
        Object.assign(item, updates, { updatedAt: new Date().toISOString() });
        
        this.refresh();
        
        if (this.options.onItemUpdate) {
            this.options.onItemUpdate(item, oldItem);
        }
        
        this.emitEvent('item:updated', { item, oldItem, updates });
        return true;
    }

    updateItemStatus(itemId, newStatus) {
        return this.updateItem(itemId, { status: newStatus });
    }

    updateItemText(itemId, newText) {
        return this.updateItem(itemId, { text: newText });
    }

    deleteItem(itemId) {
        const index = this.items.findIndex(item => item.id === itemId);
        if (index === -1) return false;
        
        const deletedItem = this.items.splice(index, 1)[0];
        this.refresh();
        
        if (this.options.onItemDelete) {
            this.options.onItemDelete(deletedItem);
        }
        
        this.emitEvent('item:deleted', deletedItem);
        return true;
    }

    findItem(itemId) {
        return this.items.find(item => item.id === itemId);
    }

    getItems() {
        return [...this.items];
    }

    setItems(items) {
        this.items = items || [];
        this.nextId = Math.max(...this.items.map(item => item.id || 0), 0) + 1;
        this.refresh();
    }

    clear() {
        this.items = [];
        this.refresh();
        this.emitEvent('items:cleared');
    }

    refresh() {
        if (this.container) {
            this.render();
        }
    }

    // Helper methods
    getStatusIcon(status) {
        const icons = {
            pending: '⬜',
            progress: '🔄',
            done: '✅',
            blocked: '🔴',
            paused: '⏸️'
        };
        return icons[status] || '⬜';
    }

    getPriorityIcon(priority) {
        const icons = {
            low: '🟢',
            normal: '🟡',
            high: '🔴',
            urgent: '🔥'
        };
        return icons[priority] || '🟡';
    }

    getAvailableActions(item) {
        const actions = [];
        
        switch (item.status) {
            case 'pending':
                actions.push({ type: 'start', icon: '▶️', title: 'Start Task' });
                break;
            case 'progress':
                actions.push({ type: 'complete', icon: '✅', title: 'Mark Complete' });
                actions.push({ type: 'pause', icon: '⏸️', title: 'Pause Task' });
                break;
            case 'blocked':
                actions.push({ type: 'unblock', icon: '🔓', title: 'Unblock Task' });
                break;
            case 'done':
                actions.push({ type: 'reopen', icon: '↩️', title: 'Reopen Task' });
                break;
        }
        
        if (this.options.showEditAction) {
            actions.push({ type: 'edit', icon: '✏️', title: 'Edit Task' });
        }
        
        if (this.options.showDeleteAction) {
            actions.push({ type: 'delete', icon: '🗑️', title: 'Delete Task' });
        }
        
        return actions;
    }

    getSortFunction() {
        return (a, b) => {
            // Sort by status first (pending/progress first, done last)
            const statusOrder = { pending: 0, progress: 1, blocked: 2, done: 3 };
            const statusDiff = (statusOrder[a.status] || 2) - (statusOrder[b.status] || 2);
            if (statusDiff !== 0) return statusDiff;
            
            // Then by priority
            const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
            const priorityDiff = (priorityOrder[a.priority || 'normal']) - (priorityOrder[b.priority || 'normal']);
            if (priorityDiff !== 0) return priorityDiff;
            
            // Finally by creation date (newest first)
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        };
    }

    formatDate(date) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return 'Tomorrow';
        } else {
            return date.toLocaleDateString();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    emitEvent(eventName, data) {
        if (this.container) {
            this.container.dispatchEvent(new CustomEvent(`todo:${eventName}`, {
                detail: data
            }));
        }
    }

    toggleAdvancedForm() {
        const advancedForm = this.container.querySelector('.todo-add-advanced');
        if (advancedForm) {
            const isVisible = advancedForm.style.display !== 'none';
            advancedForm.style.display = isVisible ? 'none' : 'block';
        }
    }

    editItem(itemId) {
        const itemElement = this.container.querySelector(`[data-item-id="${itemId}"] .todo-content`);
        if (itemElement) {
            itemElement.focus();
            
            // Select all text
            const range = document.createRange();
            range.selectNodeContents(itemElement);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }

    // Static factory method
    static create(container, options = {}) {
        return new TodoListComponent(container, options);
    }

    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
            this.container.classList.remove(this.options.className);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TodoListComponent;
} else if (typeof window !== 'undefined') {
    window.TodoListComponent = TodoListComponent;
}