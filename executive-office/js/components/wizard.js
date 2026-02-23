/**
 * FleetKit Executive Office V4 - Unified Wizard Component
 * Handles agent spawning, skill addition, and mission creation
 */

class UnifiedWizard {
    constructor() {
        this.isOpen = false;
        this.currentWizard = null;
        this.currentStep = 0;
        this.wizardData = {};
        
        this.init();
        this.bindEvents();
    }

    init() {
        this.createWizardContainer();
    }

    bindEvents() {
        // Listen for wizard open requests
        FleetEvents.on('wizard:open', (data) => {
            this.openWizard(data);
        });

        // Listen for wizard close requests
        FleetEvents.on('wizard:close', () => {
            this.close();
        });
    }

    createWizardContainer() {
        const wizardContainer = document.createElement('div');
        wizardContainer.id = 'unified-wizard';
        wizardContainer.innerHTML = `
            <div class="wizard-overlay" id="wizard-overlay">
                <div class="wizard-modal">
                    <div class="wizard-header">
                        <h2 class="wizard-title" id="wizard-title">Fleet Wizard</h2>
                        <button class="wizard-close" id="wizard-close" aria-label="Close Wizard">×</button>
                    </div>
                    <div class="wizard-body" id="wizard-body">
                        <!-- Content will be populated based on wizard type -->
                    </div>
                    <div class="wizard-footer" id="wizard-footer">
                        <!-- Footer buttons will be populated based on wizard type -->
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(wizardContainer);
        this.container = wizardContainer;
        
        this.bindWizardEvents();
    }

    bindWizardEvents() {
        const overlay = this.container.querySelector('#wizard-overlay');
        const closeBtn = this.container.querySelector('#wizard-close');

        // Close events
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.close();
            }
        });

        closeBtn?.addEventListener('click', () => {
            this.close();
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    openWizard(config) {
        this.currentWizard = config.type;
        this.currentStep = 0;
        this.wizardData = { ...config };
        this.isOpen = true;

        this.renderWizard();
        this.show();

        FleetEvents.emit('wizard:opened', { type: this.currentWizard });
    }

    renderWizard() {
        switch (this.currentWizard) {
            case 'spawn-agent':
                this.renderSpawnAgentWizard();
                break;
            case 'add-skill':
                this.renderAddSkillWizard();
                break;
            case 'create-mission':
                this.renderCreateMissionWizard();
                break;
            case 'edit-mission':
                this.renderEditMissionWizard();
                break;
            default:
                console.warn('Unknown wizard type:', this.currentWizard);
                this.close();
        }
    }

    renderSpawnAgentWizard() {
        const parentAgent = FleetState.getAgent(this.wizardData.parentAgent);
        
        this.setTitle('Spawn Sub-Agent');
        this.setBody(`
            <div class="wizard-form">
                <div class="wizard-intro">
                    <div class="wizard-icon">⚡</div>
                    <h3>Spawn New Sub-Agent</h3>
                    <p>Create a specialized sub-agent under ${parentAgent?.name || 'the selected agent'}</p>
                </div>

                ${this.renderSpawnAgentStep()}
            </div>
        `);
        
        this.setFooter(`
            <button class="btn btn--secondary" id="wizard-cancel">Cancel</button>
            <button class="btn btn--primary" id="wizard-next">Spawn Agent</button>
        `);

        this.bindSpawnAgentEvents();
    }

    renderSpawnAgentStep() {
        const agentTypes = [
            { id: 'specialist', name: 'Specialist Agent', desc: 'Focused on a specific task or domain', icon: '🎯' },
            { id: 'assistant', name: 'Assistant Agent', desc: 'General-purpose helper for various tasks', icon: '🤖' },
            { id: 'researcher', name: 'Research Agent', desc: 'Data gathering and analysis specialist', icon: '🔍' },
            { id: 'communicator', name: 'Communication Agent', desc: 'External communications and outreach', icon: '📢' }
        ];

        return `
            <div class="form-section">
                <div class="form-group">
                    <label class="form-label">Agent Type</label>
                    <div class="agent-type-grid">
                        ${agentTypes.map(type => `
                            <div class="agent-type-card" data-type="${type.id}">
                                <div class="agent-type-icon">${type.icon}</div>
                                <div class="agent-type-name">${type.name}</div>
                                <div class="agent-type-desc">${type.desc}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="agent-name">Agent Name</label>
                    <input type="text" 
                           class="form-input" 
                           id="agent-name" 
                           placeholder="e.g., Frontend Specialist"
                           maxlength="50">
                </div>

                <div class="form-group">
                    <label class="form-label" for="agent-purpose">Purpose / Task</label>
                    <textarea class="form-input" 
                              id="agent-purpose" 
                              placeholder="Describe what this agent will do..."
                              rows="3"
                              maxlength="300"></textarea>
                </div>

                <div class="form-group">
                    <label class="form-label" for="agent-model">AI Model</label>
                    <select class="form-input" id="agent-model">
                        <option value="sonnet-4">Claude Sonnet 4 (Balanced)</option>
                        <option value="haiku-4">Claude Haiku 4 (Fast)</option>
                        <option value="opus-4.6">Claude Opus 4.6 (Powerful)</option>
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Initial Skills</label>
                    <div class="skills-selector">
                        ${this.renderSkillsCheckboxes()}
                    </div>
                </div>
            </div>
        `;
    }

    renderAddSkillWizard() {
        const agent = FleetState.getAgent(this.wizardData.agentId);
        
        this.setTitle('Add Skills');
        this.setBody(`
            <div class="wizard-form">
                <div class="wizard-intro">
                    <div class="wizard-icon">🎯</div>
                    <h3>Add Skills to ${agent?.name || 'Agent'}</h3>
                    <p>Enhance agent capabilities with new skills</p>
                </div>

                ${this.renderAddSkillStep()}
            </div>
        `);
        
        this.setFooter(`
            <button class="btn btn--secondary" id="wizard-cancel">Cancel</button>
            <button class="btn btn--primary" id="wizard-next">Add Skills</button>
        `);

        this.bindAddSkillEvents();
    }

    renderAddSkillStep() {
        const skills = FleetState.getSkills();
        const categories = skills.categories || {};
        
        return `
            <div class="form-section">
                <div class="skill-search-bar">
                    <input type="text" 
                           class="form-input" 
                           id="skill-search" 
                           placeholder="Search skills..."
                           autocomplete="off">
                </div>

                <div class="skill-categories">
                    ${Object.entries(categories).map(([key, category]) => `
                        <div class="skill-category" data-category="${key}">
                            <div class="skill-category-header">
                                <h4>${category.name}</h4>
                                <div class="skill-category-color" style="background: ${category.color}"></div>
                            </div>
                            <div class="skill-category-skills">
                                ${this.renderSkillsInCategory(key)}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="selected-skills">
                    <h4>Selected Skills</h4>
                    <div class="selected-skills-list" id="selected-skills-list">
                        <!-- Selected skills will appear here -->
                    </div>
                </div>
            </div>
        `;
    }

    renderCreateMissionWizard() {
        this.setTitle('Create Mission');
        this.setBody(`
            <div class="wizard-form">
                <div class="wizard-intro">
                    <div class="wizard-icon">🚀</div>
                    <h3>Create New Mission</h3>
                    <p>Define objectives and assign agents to execute strategic initiatives</p>
                </div>

                ${this.renderCreateMissionStep()}
            </div>
        `);
        
        this.setFooter(`
            <button class="btn btn--secondary" id="wizard-cancel">Cancel</button>
            <button class="btn btn--primary" id="wizard-next">Create Mission</button>
        `);

        this.bindCreateMissionEvents();
    }

    renderCreateMissionStep() {
        const agents = FleetState.getAgents();
        
        return `
            <div class="form-section">
                <div class="form-group">
                    <label class="form-label" for="mission-name">Mission Name</label>
                    <input type="text" 
                           class="form-input" 
                           id="mission-name" 
                           placeholder="e.g., Launch Product V2"
                           maxlength="100">
                </div>

                <div class="form-group">
                    <label class="form-label" for="mission-description">Description</label>
                    <textarea class="form-input" 
                              id="mission-description" 
                              placeholder="Describe the mission objectives and expected outcomes..."
                              rows="4"
                              maxlength="500"></textarea>
                </div>

                <div class="form-group">
                    <label class="form-label">Priority</label>
                    <div class="priority-selector">
                        <label class="priority-option">
                            <input type="radio" name="mission-priority" value="low" checked>
                            <span class="priority-indicator priority-low">🟢</span>
                            <span>Low</span>
                        </label>
                        <label class="priority-option">
                            <input type="radio" name="mission-priority" value="medium">
                            <span class="priority-indicator priority-medium">🟡</span>
                            <span>Medium</span>
                        </label>
                        <label class="priority-option">
                            <input type="radio" name="mission-priority" value="high">
                            <span class="priority-indicator priority-high">🔴</span>
                            <span>High</span>
                        </label>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Assign Agents</label>
                    <div class="agents-selector">
                        ${agents.map(agent => `
                            <label class="agent-checkbox">
                                <input type="checkbox" 
                                       name="mission-agents" 
                                       value="${agent.id}"
                                       ${agent.id === 'ceo' ? 'checked' : ''}>
                                <span class="agent-checkbox-card">
                                    <span class="agent-emoji">${agent.emoji || '🤖'}</span>
                                    <span class="agent-info">
                                        <span class="agent-checkbox-name">${agent.name}</span>
                                        <span class="agent-checkbox-role">${agent.role}</span>
                                    </span>
                                </span>
                            </label>
                        `).join('')}
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Initial TODO Items</label>
                    <div class="todo-builder">
                        <div class="todo-items" id="todo-items">
                            <div class="todo-item-builder">
                                <input type="text" 
                                       class="form-input todo-input" 
                                       placeholder="Enter task description..."
                                       maxlength="200">
                                <button class="btn btn--secondary add-todo-btn">Add</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    bindSpawnAgentEvents() {
        // Agent type selection
        this.container.querySelectorAll('.agent-type-card').forEach(card => {
            card.addEventListener('click', () => {
                this.container.querySelectorAll('.agent-type-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.wizardData.agentType = card.dataset.type;
            });
        });

        // Form submission
        const nextBtn = this.container.querySelector('#wizard-next');
        const cancelBtn = this.container.querySelector('#wizard-cancel');

        nextBtn?.addEventListener('click', () => this.handleSpawnAgent());
        cancelBtn?.addEventListener('click', () => this.close());
    }

    bindAddSkillEvents() {
        // Skill search
        const searchInput = this.container.querySelector('#skill-search');
        searchInput?.addEventListener('input', (e) => {
            this.filterSkills(e.target.value);
        });

        // Skill selection
        this.container.querySelectorAll('.skill-option').forEach(option => {
            option.addEventListener('change', () => {
                this.updateSelectedSkills();
            });
        });

        // Form submission
        const nextBtn = this.container.querySelector('#wizard-next');
        const cancelBtn = this.container.querySelector('#wizard-cancel');

        nextBtn?.addEventListener('click', () => this.handleAddSkills());
        cancelBtn?.addEventListener('click', () => this.close());
    }

    bindCreateMissionEvents() {
        // TODO item builder
        const addTodoBtn = this.container.querySelector('.add-todo-btn');
        const todoInput = this.container.querySelector('.todo-input');

        addTodoBtn?.addEventListener('click', () => {
            this.addTodoItem();
        });

        todoInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addTodoItem();
            }
        });

        // Form submission
        const nextBtn = this.container.querySelector('#wizard-next');
        const cancelBtn = this.container.querySelector('#wizard-cancel');

        nextBtn?.addEventListener('click', () => this.handleCreateMission());
        cancelBtn?.addEventListener('click', () => this.close());
    }

    handleSpawnAgent() {
        const formData = this.collectSpawnAgentData();
        
        if (!this.validateSpawnAgentData(formData)) {
            return;
        }

        // Emit spawn event
        FleetEvents.emit('agent:spawn', {
            parentAgent: this.wizardData.parentAgent,
            ...formData
        });

        this.showSuccess('Sub-agent spawned successfully!');
        this.close();
    }

    handleAddSkills() {
        const selectedSkills = this.getSelectedSkills();
        
        if (selectedSkills.length === 0) {
            this.showError('Please select at least one skill');
            return;
        }

        // Emit skills update event
        FleetEvents.emit('skills:agent:add', {
            agentId: this.wizardData.agentId,
            skills: selectedSkills
        });

        this.showSuccess(`${selectedSkills.length} skills added successfully!`);
        this.close();
    }

    handleCreateMission() {
        const formData = this.collectMissionData();
        
        if (!this.validateMissionData(formData)) {
            return;
        }

        // Emit mission creation event
        FleetEvents.emit('mission:create', formData);

        this.showSuccess('Mission created successfully!');
        this.close();
    }

    collectSpawnAgentData() {
        return {
            type: this.wizardData.agentType,
            name: this.container.querySelector('#agent-name')?.value.trim(),
            purpose: this.container.querySelector('#agent-purpose')?.value.trim(),
            model: this.container.querySelector('#agent-model')?.value,
            skills: this.getSelectedSkills()
        };
    }

    collectMissionData() {
        const assignedAgents = Array.from(this.container.querySelectorAll('input[name="mission-agents"]:checked'))
            .map(input => input.value);
        
        const priority = this.container.querySelector('input[name="mission-priority"]:checked')?.value;
        
        const todoItems = Array.from(this.container.querySelectorAll('.todo-added-item'))
            .map((item, index) => ({
                id: index + 1,
                text: item.textContent,
                status: 'pending'
            }));

        return {
            name: this.container.querySelector('#mission-name')?.value.trim(),
            description: this.container.querySelector('#mission-description')?.value.trim(),
            priority,
            assignedAgents,
            todoItems
        };
    }

    validateSpawnAgentData(data) {
        if (!data.type) {
            this.showError('Please select an agent type');
            return false;
        }
        
        if (!data.name) {
            this.showError('Please enter an agent name');
            return false;
        }
        
        if (!data.purpose) {
            this.showError('Please describe the agent\'s purpose');
            return false;
        }

        return true;
    }

    validateMissionData(data) {
        if (!data.name) {
            this.showError('Please enter a mission name');
            return false;
        }
        
        if (!data.description) {
            this.showError('Please enter a mission description');
            return false;
        }
        
        if (!data.assignedAgents || data.assignedAgents.length === 0) {
            this.showError('Please assign at least one agent');
            return false;
        }

        return true;
    }

    getSelectedSkills() {
        return Array.from(this.container.querySelectorAll('.skill-option:checked'))
            .map(checkbox => checkbox.value);
    }

    addTodoItem() {
        const todoInput = this.container.querySelector('.todo-input');
        const text = todoInput?.value.trim();
        
        if (!text) return;

        const todoItems = this.container.querySelector('#todo-items');
        const todoItem = document.createElement('div');
        todoItem.className = 'todo-added-item';
        todoItem.innerHTML = `
            <span class="todo-text">${text}</span>
            <button class="remove-todo-btn">×</button>
        `;
        
        // Insert before the input
        const inputContainer = todoItems?.querySelector('.todo-item-builder');
        todoItems?.insertBefore(todoItem, inputContainer);
        
        // Bind remove event
        todoItem.querySelector('.remove-todo-btn')?.addEventListener('click', () => {
            todoItem.remove();
        });

        // Clear input
        if (todoInput) todoInput.value = '';
    }

    renderSkillsCheckboxes() {
        const availableSkills = [
            'web_search', 'coding', 'documentation', 'testing', 
            'communication', 'analysis', 'planning', 'execution'
        ];
        
        return availableSkills.map(skill => `
            <label class="skill-checkbox">
                <input type="checkbox" class="skill-option" value="${skill}">
                <span class="skill-name">${this.formatSkillName(skill)}</span>
            </label>
        `).join('');
    }

    renderSkillsInCategory(categoryKey) {
        // This would be populated from FleetState.getSkills()
        const sampleSkills = {
            ai: ['machine-learning', 'nlp', 'computer-vision'],
            dev: ['frontend', 'backend', 'devops', 'testing'],
            comm: ['writing', 'social-media', 'presentations'],
            data: ['analysis', 'visualization', 'databases'],
            auto: ['workflows', 'scripting', 'monitoring']
        };

        const skills = sampleSkills[categoryKey] || [];
        
        return skills.map(skill => `
            <label class="skill-checkbox">
                <input type="checkbox" class="skill-option" value="${skill}">
                <span class="skill-name">${this.formatSkillName(skill)}</span>
            </label>
        `).join('');
    }

    filterSkills(searchTerm) {
        const skills = this.container.querySelectorAll('.skill-checkbox');
        const term = searchTerm.toLowerCase();

        skills.forEach(skill => {
            const name = skill.querySelector('.skill-name')?.textContent.toLowerCase();
            const matches = !term || (name && name.includes(term));
            skill.style.display = matches ? 'flex' : 'none';
        });
    }

    updateSelectedSkills() {
        const selectedList = this.container.querySelector('#selected-skills-list');
        const selectedSkills = this.getSelectedSkills();
        
        if (!selectedList) return;

        if (selectedSkills.length === 0) {
            selectedList.innerHTML = '<p class="no-skills">No skills selected</p>';
            return;
        }

        selectedList.innerHTML = selectedSkills.map(skill => `
            <span class="selected-skill-chip">
                ${this.formatSkillName(skill)}
                <button class="remove-skill-btn" data-skill="${skill}">×</button>
            </span>
        `).join('');

        // Bind remove events
        selectedList.querySelectorAll('.remove-skill-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const skill = btn.dataset.skill;
                const checkbox = this.container.querySelector(`input[value="${skill}"]`);
                if (checkbox) {
                    checkbox.checked = false;
                    this.updateSelectedSkills();
                }
            });
        });
    }

    formatSkillName(skill) {
        return skill.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    setTitle(title) {
        const titleEl = this.container.querySelector('#wizard-title');
        if (titleEl) titleEl.textContent = title;
    }

    setBody(html) {
        const bodyEl = this.container.querySelector('#wizard-body');
        if (bodyEl) bodyEl.innerHTML = html;
    }

    setFooter(html) {
        const footerEl = this.container.querySelector('#wizard-footer');
        if (footerEl) footerEl.innerHTML = html;
    }

    show() {
        const overlay = this.container.querySelector('#wizard-overlay');
        if (overlay) {
            overlay.classList.add('open');
        }
    }

    close() {
        this.isOpen = false;
        
        const overlay = this.container.querySelector('#wizard-overlay');
        if (overlay) {
            overlay.classList.remove('open');
        }

        // Reset wizard state
        this.currentWizard = null;
        this.currentStep = 0;
        this.wizardData = {};

        FleetEvents.emit('wizard:closed');
    }

    showSuccess(message) {
        FleetEvents.emit('toast:show', { 
            message, 
            type: 'success',
            duration: 3000
        });
    }

    showError(message) {
        FleetEvents.emit('toast:show', { 
            message, 
            type: 'error',
            duration: 5000
        });
    }

    destroy() {
        FleetEvents.off('wizard:open', this.openWizard.bind(this));
        FleetEvents.off('wizard:close', this.close.bind(this));
        
        if (this.container) {
            this.container.remove();
        }
    }
}

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.UnifiedWizard = new UnifiedWizard();
    });
} else {
    window.UnifiedWizard = new UnifiedWizard();
}