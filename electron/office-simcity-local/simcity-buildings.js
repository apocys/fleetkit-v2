/**
 * SimCity Buildings - Isometric City Engine
 * 
 * Building management system that:
 * - Maps SpawnKit agents to city buildings
 * - Handles building placement and types
 * - Manages building-agent relationships
 * - Provides building interaction logic
 * 
 * Building Types:
 * - Office: General business projects
 * - Factory: Code building, production work  
 * - Lab: Research, experimentation
 * - Datacenter: Data processing, heavy compute
 */

class BuildingManager {
    constructor() {
        this.buildings = [];
        this.buildingIdCounter = 1;
        
        // Building type mapping based on agent roles and tasks
        this.typeMappings = {
            // Role-based mappings
            'CTO': 'factory',      // Forge -> Factory (builds things)
            'COO': 'office',       // Atlas -> Office (operations)
            'CMO': 'lab',          // Echo -> Lab (creative experiments)
            'CRO': 'office',       // Hunter -> Office (business)
            'CEO': 'office',       // Main -> Office (executive)
            'Auditor': 'datacenter', // Sentinel -> Datacenter (processing)
            
            // Task-based keywords (override role if present)
            'build': 'factory',
            'code': 'factory',
            'deploy': 'factory',
            'data': 'datacenter',
            'process': 'datacenter',
            'compute': 'datacenter',
            'research': 'lab',
            'experiment': 'lab',
            'analyze': 'lab',
            'creative': 'lab',
            'content': 'lab'
        };
        
        // Building placement grid (isometric coordinates)
        this.placementGrid = {
            width: 20,
            height: 15,
            occupied: new Set()
        };
        
        // Next placement position
        this.nextPlacement = { x: 5, y: 5 };
        
        console.log('🏗️ Building Manager initialized');
    }
    
    updateFromData(agentData) {
        console.log('🏗️ Updating buildings from agent data:', agentData.length);
        
        // Clear existing buildings but preserve positions if agents still exist
        const existingBuildings = new Map();
        this.buildings.forEach(building => {
            if (building.sourceAgentId) {
                existingBuildings.set(building.sourceAgentId, building);
            }
        });
        
        this.buildings = [];
        
        // Create buildings from active agents
        agentData.forEach(agent => {
            if (agent && agent.id) {
                let building = existingBuildings.get(agent.id);
                
                if (building) {
                    // Update existing building
                    this.updateBuildingFromAgent(building, agent);
                } else {
                    // Create new building
                    building = this.createBuildingFromAgent(agent);
                }
                
                this.buildings.push(building);
            }
        });
        
        console.log(`🏗️ Buildings updated: ${this.buildings.length} total`);
    }
    
    createBuildingFromAgent(agent) {
        const building = {
            id: this.buildingIdCounter++,
            sourceAgentId: agent.id,
            name: this.generateBuildingName(agent),
            type: this.determineBuildingType(agent),
            position: this.findBuildingPlacement(),
            agents: [],
            activity: 'idle',
            lastActivity: Date.now(),
            metrics: {
                productivity: 0,
                efficiency: 0,
                uptime: 0
            }
        };
        
        // Mark grid position as occupied
        this.markPositionOccupied(building.position);
        
        console.log(`🏢 Created ${building.type} building for ${agent.name} at (${building.position.x}, ${building.position.y})`);
        
        return building;
    }
    
    updateBuildingFromAgent(building, agent) {
        // Update building properties based on agent changes
        building.name = this.generateBuildingName(agent);
        building.lastActivity = Date.now();
        
        // Update activity level based on agent status
        if (agent.status === 'active' && agent.currentTask && agent.currentTask !== 'Standby') {
            building.activity = 'working';
        } else {
            building.activity = 'idle';
        }
        
        // Calculate building metrics from agent data
        building.metrics.productivity = this.calculateProductivity(agent);
        building.metrics.efficiency = this.calculateEfficiency(agent);
        building.metrics.uptime = this.calculateUptime(agent);
    }
    
    generateBuildingName(agent) {
        // Generate descriptive building names based on agent role and function
        const roleNames = {
            'CTO': 'Engineering Complex',
            'COO': 'Operations Center',
            'CMO': 'Creative Studios',
            'CRO': 'Revenue Tower',
            'CEO': 'Executive Plaza',
            'Auditor': 'Quality Control'
        };
        
        const baseName = roleNames[agent.role] || 'Office Complex';
        
        // Add specificity if agent has a clear current task
        if (agent.currentTask && agent.currentTask !== 'Standby' && agent.currentTask.length > 5) {
            const task = agent.currentTask.toLowerCase();
            
            if (task.includes('build') || task.includes('deploy')) {
                return 'Production Facility';
            } else if (task.includes('data') || task.includes('process')) {
                return 'Data Processing Center';
            } else if (task.includes('research') || task.includes('analyze')) {
                return 'Research Laboratory';
            } else if (task.includes('content') || task.includes('creative')) {
                return 'Creative Workshop';
            }
        }
        
        return baseName;
    }
    
    determineBuildingType(agent) {
        // Determine building type based on agent role and current task
        let type = 'office'; // Default
        
        // Check task-based keywords first (more specific)
        if (agent.currentTask) {
            const task = agent.currentTask.toLowerCase();
            
            for (const [keyword, buildingType] of Object.entries(this.typeMappings)) {
                if (keyword !== keyword.toUpperCase() && task.includes(keyword)) {
                    type = buildingType;
                    break;
                }
            }
        }
        
        // Fall back to role-based mapping
        if (type === 'office' && agent.role && this.typeMappings[agent.role]) {
            type = this.typeMappings[agent.role];
        }
        
        return type;
    }
    
    findBuildingPlacement() {
        // Find next available position on the grid
        const maxAttempts = 100;
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            const position = {
                x: this.nextPlacement.x,
                y: this.nextPlacement.y,
                z: 0
            };
            
            const posKey = `${position.x},${position.y}`;
            
            if (!this.placementGrid.occupied.has(posKey)) {
                // Found available spot
                this.advanceNextPlacement();
                return position;
            }
            
            // Try next position
            this.advanceNextPlacement();
            attempts++;
        }
        
        // Fallback: place at next position anyway (buildings can overlap in demo)
        console.warn('⚠️ Could not find empty building placement, using fallback');
        return {
            x: this.nextPlacement.x,
            y: this.nextPlacement.y,
            z: 0
        };
    }
    
    advanceNextPlacement() {
        // Move to next grid position in a neat grid pattern
        this.nextPlacement.x += 4; // Space buildings apart nicely
        
        if (this.nextPlacement.x >= this.placementGrid.width) {
            this.nextPlacement.x = 5;
            this.nextPlacement.y += 4; // Space rows apart
            
            if (this.nextPlacement.y >= this.placementGrid.height) {
                // Start next district/layer
                this.nextPlacement.x = 2;
                this.nextPlacement.y = 2;
            }
        }
    }
    
    markPositionOccupied(position) {
        const posKey = `${position.x},${position.y}`;
        this.placementGrid.occupied.add(posKey);
        
        // Also mark adjacent positions to prevent overlap
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const adjKey = `${position.x + dx},${position.y + dy}`;
                this.placementGrid.occupied.add(adjKey);
            }
        }
    }
    
    calculateProductivity(agent) {
        // Calculate productivity based on agent activity
        const tokensUsed = agent.tokensUsed || 0;
        const apiCalls = agent.apiCalls || 0;
        
        // Simple productivity metric: tokens per hour
        if (tokensUsed > 0) {
            const hoursActive = this.getHoursActive(agent);
            return Math.round(tokensUsed / Math.max(hoursActive, 0.1));
        }
        
        return 0;
    }
    
    calculateEfficiency(agent) {
        // Calculate efficiency ratio (output vs input)
        const tokensUsed = agent.tokensUsed || 0;
        const apiCalls = agent.apiCalls || 0;
        
        if (apiCalls > 0) {
            // Tokens per API call (efficiency measure)
            return Math.round(tokensUsed / apiCalls);
        }
        
        return 0;
    }
    
    calculateUptime(agent) {
        // Calculate uptime percentage
        if (agent.lastSeenMs) {
            const nowMs = Date.now();
            const timeSinceLastSeen = nowMs - agent.lastSeenMs;
            const dayMs = 24 * 60 * 60 * 1000;
            
            // If seen within last hour, consider 100% uptime
            if (timeSinceLastSeen < 60 * 60 * 1000) {
                return 100;
            }
            
            // Otherwise, scale down based on time since last seen
            const uptimeRatio = Math.max(0, 1 - (timeSinceLastSeen / dayMs));
            return Math.round(uptimeRatio * 100);
        }
        
        return 0;
    }
    
    getHoursActive(agent) {
        // Estimate hours active based on last seen time
        if (agent.lastSeenMs) {
            const nowMs = Date.now();
            const msActive = Math.min(nowMs - (agent.lastSeenMs || nowMs), 24 * 60 * 60 * 1000);
            return msActive / (60 * 60 * 1000);
        }
        
        return 1; // Default to 1 hour
    }
    
    assignAgentToBuilding(agent, parentAgentId) {
        // Find the building for the parent agent
        const building = this.buildings.find(b => b.sourceAgentId === parentAgentId);
        
        if (building) {
            // Add agent to building if not already there
            const existingAgent = building.agents.find(a => a.id === agent.id);
            
            if (!existingAgent) {
                building.agents.push({
                    id: agent.id,
                    name: agent.name,
                    displayName: agent.agentOSName || agent.name,
                    task: agent.task || agent.name,
                    status: agent.status,
                    modelIdentity: agent.modelIdentity
                });
                
                console.log(`👤 Assigned agent ${agent.name} to ${building.name}`);
            } else {
                // Update existing agent
                existingAgent.task = agent.task || agent.name;
                existingAgent.status = agent.status;
                existingAgent.displayName = agent.agentOSName || agent.name;
            }
            
            // Update building activity
            if (agent.status === 'running') {
                building.activity = 'working';
            }
        }
    }
    
    removeAgentFromBuilding(agentId) {
        // Remove agent from all buildings
        this.buildings.forEach(building => {
            building.agents = building.agents.filter(a => a.id !== agentId);
            
            // Update building activity if no agents left
            if (building.agents.length === 0) {
                building.activity = 'idle';
            }
        });
    }
    
    getBuildingAt(x, y) {
        // Find building at screen coordinates (for click detection)
        const tolerance = 32; // Click tolerance in pixels
        
        return this.buildings.find(building => {
            if (!building.position) return false;
            
            const buildingX = building.position.x * 32; // Convert to screen space
            const buildingY = building.position.y * 16; // Isometric ratio
            
            return Math.abs(x - buildingX) <= tolerance && 
                   Math.abs(y - buildingY) <= tolerance;
        });
    }
    
    update(deltaTime) {
        // Update building states
        this.buildings.forEach(building => {
            this.updateBuilding(building, deltaTime);
        });
    }
    
    updateBuilding(building, deltaTime) {
        // Update building animation and state
        const now = Date.now();
        const timeSinceActivity = now - building.lastActivity;
        
        // Auto-idle buildings after period of inactivity
        if (timeSinceActivity > 60000 && building.activity !== 'idle') {
            building.activity = 'idle';
        }
        
        // Update building metrics gradually
        if (building.agents.length > 0) {
            building.metrics.productivity = Math.max(0, building.metrics.productivity - deltaTime * 0.1);
        }
    }
    
    render(renderer, camera = null) {
        // Render all buildings with frustum culling
        this.buildings.forEach(building => {
            // Skip rendering if outside camera view (frustum culling)
            if (camera && !this.isBuildingVisible(building, camera, renderer)) {
                return;
            }
            
            renderer.renderBuilding(building);
        });
    }

    isBuildingVisible(building, camera, renderer) {
        // Check if building is within visible bounds for frustum culling
        if (!building.position) return false;

        const visibleBounds = renderer.getVisibleBounds(camera);
        
        return building.position.x >= visibleBounds.minX - 2 &&
               building.position.x <= visibleBounds.maxX + 2 &&
               building.position.y >= visibleBounds.minY - 2 &&
               building.position.y <= visibleBounds.maxY + 2;
    }
    
    getBuildingStats() {
        return {
            total: this.buildings.length,
            byType: this.getBuildingTypeCount(),
            totalAgents: this.buildings.reduce((sum, b) => sum + b.agents.length, 0),
            activeBuildings: this.buildings.filter(b => b.activity === 'working').length
        };
    }
    
    getBuildingTypeCount() {
        const counts = {};
        this.buildings.forEach(building => {
            counts[building.type] = (counts[building.type] || 0) + 1;
        });
        return counts;
    }
    
    // Debug methods for development
    getDebugInfo() {
        return {
            buildings: this.buildings.length,
            placement: this.nextPlacement,
            occupied: this.placementGrid.occupied.size,
            types: this.getBuildingTypeCount()
        };
    }
    
    clearAllBuildings() {
        // Clear all buildings (for reset)
        this.buildings = [];
        this.placementGrid.occupied.clear();
        this.nextPlacement = { x: 5, y: 5 };
        console.log('🗑️ All buildings cleared');
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BuildingManager;
}