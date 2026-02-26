/**
 * SimCity Core - Isometric City Engine
 * 
 * Main city simulation loop that orchestrates:
 * - Canvas rendering system
 * - Building management
 * - Agent movement
 * - Data bridge integration
 * - Economic calculations
 * 
 * Cathedral Quality: Solid, extensible foundation for Phase 3B/3C
 */

class SimCityCore {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Core systems
        this.renderer = null;
        this.buildingManager = null;
        this.agentManager = null;
        
        // City state
        this.camera = {
            x: 0,
            y: 0,
            zoom: 1.0,
            targetX: 0,
            targetY: 0,
            targetZoom: 1.0
        };
        
        // Simulation state
        this.isRunning = false;
        this.lastFrame = 0;
        this.frameCount = 0;
        this.fps = 0;
        
        // Interaction state
        this.mouseState = {
            x: 0,
            y: 0,
            isDown: false,
            dragStart: null,
            lastClick: 0
        };
        
        // City metrics
        this.metrics = {
            buildings: 0,
            agents: 0,
            revenue: 0,
            costs: 0,
            tokens: 0,
            activityLevel: 'Quiet'
        };
        
        // Selected building for inspector
        this.selectedBuilding = null;
        
        // Performance settings
        this.targetFPS = 60;
        this.frameTime = 1000 / this.targetFPS;
        
        console.log('🏗️ SimCity Core initialized');
    }
    
    async initialize() {
        console.log('🏗️ Initializing SimCity Core systems...');
        
        try {
            // Verify dependencies first - graceful fallback if missing
            await this.verifyDependencies();
            
            // Initialize canvas size and high-DPI support
            this.setupCanvas();
            
            // Initialize core systems with error boundaries
            await this.initializeSystems();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize with demo data or live data
            await this.loadInitialData();
            
            console.log('✅ SimCity Core systems initialized');
            
        } catch (error) {
            console.error('❌ SimCity Core initialization failed:', error);
            throw error;
        }
    }

    async verifyDependencies() {
        // Fix 1: Add dependency verification for model-identity.js and data-bridge.js
        const requiredDependencies = [
            { name: 'ModelIdentity', fallback: () => this.createModelIdentityFallback() },
            { name: 'SpawnKit', fallback: () => this.createSpawnKitFallback() }
        ];

        for (const dep of requiredDependencies) {
            if (typeof window[dep.name] === 'undefined') {
                console.warn(`⚠️ ${dep.name} not found, using graceful fallback`);
                dep.fallback();
            }
        }
    }

    createModelIdentityFallback() {
        // Graceful fallback for ModelIdentity
        window.ModelIdentity = {
            getIdentity: (modelId) => ({
                tier: 'standard',
                color: '#4ECDC4',
                symbol: '●',
                level: 'PRO',
                name: 'Agent'
            })
        };
    }

    createSpawnKitFallback() {
        // Graceful fallback for SpawnKit
        window.SpawnKit = {
            data: { agents: [], subagents: [], metrics: {} },
            mode: 'demo',
            on: () => {},
            emit: () => {},
            init: () => Promise.resolve()
        };
    }

    async initializeSystems() {
        // Fix 2: Add error boundaries between systems
        const systemErrors = [];

        try {
            this.renderer = new SimCityRenderer(this.ctx, this.canvas.width, this.canvas.height);
        } catch (error) {
            console.error('❌ Renderer initialization failed:', error);
            systemErrors.push('renderer');
            this.renderer = this.createFallbackRenderer();
        }

        try {
            this.buildingManager = new BuildingManager();
        } catch (error) {
            console.error('❌ Building Manager initialization failed:', error);
            systemErrors.push('buildings');
            this.buildingManager = this.createFallbackBuildingManager();
        }

        try {
            this.agentManager = new AgentManager();
        } catch (error) {
            console.error('❌ Agent Manager initialization failed:', error);
            systemErrors.push('agents');
            this.agentManager = this.createFallbackAgentManager();
        }

        if (systemErrors.length > 0) {
            console.warn(`⚠️ Systems running in fallback mode: ${systemErrors.join(', ')}`);
        }
    }

    createFallbackRenderer() {
        // Minimal fallback renderer that won't crash
        return {
            renderBackground: () => {
                this.ctx.fillStyle = '#87CEEB';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            },
            renderGrid: () => {},
            renderBuilding: () => {},
            renderAgent: () => {},
            invalidateGrid: () => {},
            resize: () => {}
        };
    }

    createFallbackBuildingManager() {
        return {
            buildings: [],
            updateFromData: () => {},
            getBuildingAt: () => null,
            update: () => {},
            render: () => {},
            assignAgentToBuilding: () => {}
        };
    }

    createFallbackAgentManager() {
        return {
            agents: [],
            updateFromData: () => {},
            update: () => {},
            render: () => {}
        };
    }
    
    setupCanvas() {
        // Handle high-DPI displays
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        
        // Set CSS size
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        // Center camera on city
        this.camera.x = -this.canvas.width / 4;
        this.camera.y = -this.canvas.height / 4;
        this.camera.targetX = this.camera.x;
        this.camera.targetY = this.camera.y;
        
        console.log(`📐 Canvas setup: ${this.canvas.width}x${this.canvas.height} (DPR: ${dpr})`);
    }
    
    setupEventListeners() {
        // Mouse/touch controls for pan and zoom
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        
        // Touch controls for mobile
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        
        // Control buttons
        document.getElementById('zoom-in')?.addEventListener('click', () => this.zoomIn());
        document.getElementById('zoom-out')?.addEventListener('click', () => this.zoomOut());
        document.getElementById('reset-view')?.addEventListener('click', () => this.resetView());
        
        // Window resize
        window.addEventListener('resize', () => this.handleResize());
        
        // SpawnKit data updates
        SpawnKit.on('data:refresh', (data) => this.handleDataUpdate(data));
        
        console.log('🎮 Event listeners setup complete');
    }
    
    async loadInitialData() {
        console.log('📊 Loading initial city data...');
        
        try {
            // Get current SpawnKit data
            const data = SpawnKit.data;
            
            if (data) {
                // Fix 3: Add data structure validation for SpawnKit.data
                const validatedData = this.validateSpawnKitData(data);
                
                // Convert agents to buildings
                this.buildingManager.updateFromData(validatedData.agents);
                
                // Convert subagents to citizens
                this.agentManager.updateFromData(validatedData.subagents, validatedData.agents);
                
                // Integrate agents into buildings
                this.integrateAgentsAndBuildings(validatedData);
                
                // Update city metrics
                this.updateMetrics(validatedData);
                
                console.log(`🏙️ City loaded: ${this.buildingManager.buildings.length} buildings, ${this.agentManager.agents.length} citizens`);
            } else {
                console.warn('⚠️ No SpawnKit data available, using empty city');
            }
            
        } catch (error) {
            console.error('❌ Failed to load city data:', error);
            // Continue with empty city
        }
    }

    validateSpawnKitData(data) {
        // Fix 3: Data structure validation for SpawnKit.data
        if (!data || typeof data !== 'object') {
            console.warn('⚠️ SpawnKit.data is not an object, using empty fallback');
            return { agents: [], subagents: [], metrics: {} };
        }

        const validated = {
            agents: Array.isArray(data.agents) ? data.agents.filter(a => a && typeof a === 'object' && a.id) : [],
            subagents: Array.isArray(data.subagents) ? data.subagents.filter(sa => sa && typeof sa === 'object' && sa.id) : [],
            metrics: data.metrics && typeof data.metrics === 'object' ? data.metrics : {},
            missions: Array.isArray(data.missions) ? data.missions : [],
            crons: Array.isArray(data.crons) ? data.crons : [],
            events: Array.isArray(data.events) ? data.events : [],
            memory: data.memory && typeof data.memory === 'object' ? data.memory : {}
        };

        // Log validation issues
        const originalAgents = data.agents?.length || 0;
        const originalSubagents = data.subagents?.length || 0;
        
        if (validated.agents.length !== originalAgents) {
            console.warn(`⚠️ Filtered invalid agents: ${originalAgents} → ${validated.agents.length}`);
        }
        if (validated.subagents.length !== originalSubagents) {
            console.warn(`⚠️ Filtered invalid subagents: ${originalSubagents} → ${validated.subagents.length}`);
        }

        return validated;
    }
    
    start() {
        if (this.isRunning) {
            console.warn('⚠️ SimCity Core already running');
            return;
        }
        
        this.isRunning = true;
        this.lastFrame = performance.now();
        
        console.log('🚀 Starting SimCity simulation loop');
        this.gameLoop();
    }
    
    stop() {
        this.isRunning = false;
        console.log('⏹️ SimCity simulation stopped');
    }
    
    gameLoop() {
        if (!this.isRunning) return;
        
        const now = performance.now();
        const deltaTime = now - this.lastFrame;
        
        // Cap delta time to prevent huge jumps
        const cappedDelta = Math.min(deltaTime, 33.33); // Max 30 FPS minimum
        
        // Update simulation
        this.update(cappedDelta / 1000); // Convert to seconds
        
        // Render frame
        this.render();
        
        // Update performance metrics
        this.frameCount++;
        if (now - this.lastFrame > 1000) {
            this.fps = Math.round(this.frameCount * 1000 / (now - this.lastFrame));
            this.frameCount = 0;
        }
        
        this.lastFrame = now;
        
        // Schedule next frame
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update(deltaTime) {
        // Update camera (smooth interpolation)
        this.updateCamera(deltaTime);
        
        // Update building manager
        this.buildingManager.update(deltaTime);
        
        // Update agent manager
        this.agentManager.update(deltaTime);
        
        // Update UI periodically (not every frame)
        if (this.frameCount % 60 === 0) {
            this.updateUI();
        }
    }
    
    updateCamera(deltaTime) {
        const lerpSpeed = 8.0;
        const lerpFactor = 1 - Math.exp(-lerpSpeed * deltaTime);
        
        // Smooth camera movement
        this.camera.x += (this.camera.targetX - this.camera.x) * lerpFactor;
        this.camera.y += (this.camera.targetY - this.camera.y) * lerpFactor;
        this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * lerpFactor;
        
        // Clamp zoom
        this.camera.zoom = Math.max(0.3, Math.min(2.0, this.camera.zoom));
        this.camera.targetZoom = Math.max(0.3, Math.min(2.0, this.camera.targetZoom));
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply camera transform
        this.ctx.save();
        this.ctx.translate(this.camera.x, this.camera.y);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        
        // Render city layers with frustum culling
        this.renderer.renderBackground();
        this.renderer.renderGrid(this.camera);
        this.buildingManager.render(this.renderer, this.camera);
        this.agentManager.render(this.renderer, this.camera);
        
        // Restore transform
        this.ctx.restore();
        
        // Render UI overlay (not affected by camera)
        this.renderDebugInfo();
    }
    
    renderDebugInfo() {
        if (this.fps > 0) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
            this.ctx.fillRect(10, 10, 120, 60);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '12px monospace';
            this.ctx.fillText(`FPS: ${this.fps}`, 15, 25);
            this.ctx.fillText(`Buildings: ${this.metrics.buildings}`, 15, 40);
            this.ctx.fillText(`Citizens: ${this.metrics.agents}`, 15, 55);
        }
    }
    
    updateMetrics(data) {
        if (!data) return;
        
        this.metrics.buildings = this.buildingManager.buildings.length;
        this.metrics.agents = this.agentManager.agents.length;
        this.metrics.tokens = data.metrics?.tokensToday || 0;
        this.metrics.revenue = this.calculateRevenue(data);
        this.metrics.costs = this.calculateCosts(data);
        
        // Activity level based on active agents
        const activeAgents = (data.subagents || []).filter(sa => sa.status === 'running').length;
        if (activeAgents === 0) {
            this.metrics.activityLevel = 'Quiet';
        } else if (activeAgents <= 2) {
            this.metrics.activityLevel = 'Low';
        } else if (activeAgents <= 5) {
            this.metrics.activityLevel = 'Moderate';
        } else {
            this.metrics.activityLevel = 'High';
        }
    }
    
    calculateRevenue(data) {
        // Estimate revenue from completed tasks and token efficiency
        const tokens = data.metrics?.tokensToday || 0;
        const completedTasks = (data.subagents || []).filter(sa => sa.status === 'completed').length;
        
        // Rough revenue calculation: $0.10 per 1000 tokens + $50 per completed task
        return Math.round((tokens * 0.0001) + (completedTasks * 50));
    }
    
    calculateCosts(data) {
        // Estimate costs from token usage (Claude pricing)
        const tokens = data.metrics?.tokensToday || 0;
        
        // Rough cost: $0.045 per 1000 tokens (mixed model usage)
        return Math.round(tokens * 0.000045);
    }
    
    updateUI() {
        // Update status bar
        document.getElementById('building-count').textContent = this.metrics.buildings;
        document.getElementById('agent-count').textContent = this.metrics.agents;
        document.getElementById('activity-level').textContent = this.metrics.activityLevel;
        
        // Update economic panel
        document.getElementById('revenue-today').textContent = `$${this.metrics.revenue}`;
        document.getElementById('costs-today').textContent = `$${this.metrics.costs}`;
        document.getElementById('tokens-today').textContent = this.metrics.tokens.toLocaleString();
        document.getElementById('active-agents').textContent = this.metrics.agents;
    }
    
    // ─── Event Handlers ───────────────────────────────────────
    
    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseState.x = e.clientX - rect.left;
        this.mouseState.y = e.clientY - rect.top;
        this.mouseState.isDown = true;
        this.mouseState.dragStart = { x: this.mouseState.x, y: this.mouseState.y };
    }
    
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const newX = e.clientX - rect.left;
        const newY = e.clientY - rect.top;
        
        if (this.mouseState.isDown && this.mouseState.dragStart) {
            // Pan camera
            const dx = newX - this.mouseState.x;
            const dy = newY - this.mouseState.y;
            
            this.camera.targetX += dx;
            this.camera.targetY += dy;
        }
        
        this.mouseState.x = newX;
        this.mouseState.y = newY;
    }
    
    handleMouseUp(e) {
        if (this.mouseState.isDown && this.mouseState.dragStart) {
            const dx = Math.abs(this.mouseState.x - this.mouseState.dragStart.x);
            const dy = Math.abs(this.mouseState.y - this.mouseState.dragStart.y);
            
            // If it was a click (not a drag), check for building selection
            if (dx < 5 && dy < 5) {
                this.handleClick(this.mouseState.x, this.mouseState.y);
            }
        }
        
        this.mouseState.isDown = false;
        this.mouseState.dragStart = null;
    }
    
    handleWheel(e) {
        e.preventDefault();
        
        const zoomSpeed = 0.1;
        const zoomDelta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
        
        this.camera.targetZoom += zoomDelta;
    }
    
    handleClick(x, y) {
        // Convert screen coordinates to world coordinates
        const worldX = (x - this.camera.x) / this.camera.zoom;
        const worldY = (y - this.camera.y) / this.camera.zoom;
        
        // Check for building selection
        const clickedBuilding = this.buildingManager.getBuildingAt(worldX, worldY);
        
        if (clickedBuilding) {
            this.selectBuilding(clickedBuilding);
        } else {
            this.deselectBuilding();
        }
    }
    
    selectBuilding(building) {
        this.selectedBuilding = building;
        
        // Update building inspector UI
        const inspector = document.getElementById('building-inspector');
        const title = document.getElementById('inspector-title');
        const type = document.getElementById('inspector-type');
        const agentsList = document.getElementById('inspector-agents');
        
        title.textContent = building.name || 'Unknown Building';
        type.textContent = building.type.toUpperCase();
        
        // Show agents working in this building
        agentsList.innerHTML = '';
        building.agents.forEach(agent => {
            const agentDiv = document.createElement('div');
            agentDiv.className = 'agent-item';
            
            const avatar = document.createElement('div');
            avatar.className = 'agent-avatar';
            if (agent.modelIdentity) {
                avatar.style.background = agent.modelIdentity.color;
            }
            
            const name = document.createElement('div');
            name.className = 'agent-name';
            name.textContent = agent.displayName || agent.name;
            
            const task = document.createElement('div');
            task.className = 'agent-task';
            task.textContent = agent.task || 'Working...';
            
            agentDiv.appendChild(avatar);
            agentDiv.appendChild(name);
            agentDiv.appendChild(task);
            agentsList.appendChild(agentDiv);
        });
        
        inspector.classList.add('active');
    }
    
    deselectBuilding() {
        this.selectedBuilding = null;
        document.getElementById('building-inspector').classList.remove('active');
    }
    
    // Touch handlers (for mobile)
    handleTouchStart(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            this.handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
        }
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            this.handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
        }
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        this.handleMouseUp({});
    }
    
    handleResize() {
        this.setupCanvas();
    }
    
    // Control methods
    zoomIn() {
        this.camera.targetZoom = Math.min(2.0, this.camera.targetZoom + 0.2);
    }
    
    zoomOut() {
        this.camera.targetZoom = Math.max(0.3, this.camera.targetZoom - 0.2);
    }
    
    resetView() {
        this.camera.targetX = -this.canvas.width / 4;
        this.camera.targetY = -this.canvas.height / 4;
        this.camera.targetZoom = 1.0;
    }
    
    handleDataUpdate(data) {
        console.log('🔄 SimCity: Data update received');
        
        try {
            // Validate incoming data
            const validatedData = this.validateSpawnKitData(data);
            
            // Update systems with error boundaries - one failing shouldn't crash others
            try {
                this.buildingManager.updateFromData(validatedData.agents);
            } catch (error) {
                console.error('❌ Building Manager update failed:', error);
                // System continues with old building data
            }
            
            try {
                this.agentManager.updateFromData(validatedData.subagents, validatedData.agents);
            } catch (error) {
                console.error('❌ Agent Manager update failed:', error);
                // System continues with old agent data
            }
            
            try {
                this.integrateAgentsAndBuildings(validatedData);
            } catch (error) {
                console.error('❌ Agent-Building integration failed:', error);
                // Systems continue independently
            }
            
            try {
                this.updateMetrics(validatedData);
            } catch (error) {
                console.error('❌ Metrics update failed:', error);
                // UI continues with old metrics
            }
            
        } catch (error) {
            console.error('❌ Data update failed, continuing with existing state:', error);
        }
    }
    
    integrateAgentsAndBuildings(data) {
        // Assign subagents to their parent agent's buildings
        (data.subagents || []).forEach(subagent => {
            if (subagent.parentAgent) {
                this.buildingManager.assignAgentToBuilding(subagent, subagent.parentAgent);
            }
        });
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SimCityCore;
}