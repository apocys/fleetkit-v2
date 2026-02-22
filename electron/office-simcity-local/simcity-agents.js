/**
 * SimCity Agents - Isometric City Engine
 * 
 * Agent movement system that:
 * - Maps SpawnKit subagents to city citizens
 * - Handles pathfinding between buildings
 * - Manages agent animations and states
 * - Shows Agent OS naming system in action
 * 
 * Citizens represent subagents working on specific tasks,
 * moving between buildings based on their work assignments.
 */

class AgentManager {
    constructor() {
        this.agents = [];
        this.agentIdCounter = 1;
        
        // Movement and animation settings
        this.movementSpeed = 30; // pixels per second
        this.pathfindingGrid = null;
        
        // Agent states
        this.agentStates = {
            IDLE: 'idle',
            WALKING: 'walking',
            WORKING: 'working',
            WAITING: 'waiting'
        };
        
        // Animation timers
        this.animationFrames = {
            walk: 0,
            work: 0
        };
        
        console.log('👥 Agent Manager initialized');
    }
    
    updateFromData(subagentData, parentAgents) {
        console.log('👥 Updating agents from subagent data:', subagentData.length);
        
        // Create lookup for parent agents (buildings)
        const parentLookup = new Map();
        (parentAgents || []).forEach(agent => {
            parentLookup.set(agent.id, agent);
        });
        
        // Keep existing agents that are still active
        const existingAgents = new Map();
        this.agents.forEach(agent => {
            if (agent.sourceSubagentId) {
                existingAgents.set(agent.sourceSubagentId, agent);
            }
        });
        
        this.agents = [];
        
        // Create/update agents from active subagents
        subagentData.forEach(subagent => {
            if (subagent && subagent.id) {
                const parentAgent = parentLookup.get(subagent.parentAgent);
                
                let agent = existingAgents.get(subagent.id);
                
                if (agent) {
                    // Update existing agent
                    this.updateAgentFromSubagent(agent, subagent, parentAgent);
                } else {
                    // Create new agent
                    agent = this.createAgentFromSubagent(subagent, parentAgent);
                }
                
                this.agents.push(agent);
            }
        });
        
        console.log(`👥 Agents updated: ${this.agents.length} total`);
    }
    
    createAgentFromSubagent(subagent, parentAgent) {
        const agent = {
            id: this.agentIdCounter++,
            sourceSubagentId: subagent.id,
            
            // Agent OS naming integration
            name: subagent.name || subagent.label,
            agentOSName: subagent.agentOSName,
            displayName: this.getDisplayName(subagent),
            role: subagent.role,
            parentAgent: subagent.parentAgent,
            
            // Model identity integration
            model: subagent.model,
            modelIdentity: subagent.modelIdentity,
            
            // Task information
            task: this.extractTask(subagent),
            status: this.mapStatus(subagent.status),
            progress: subagent.progress || 0,
            
            // Position and movement
            position: this.getRandomStartPosition(),
            targetPosition: null,
            path: [],
            
            // Animation state
            state: this.agentStates.IDLE,
            animationFrame: 0,
            lastStateChange: Date.now(),
            
            // Work assignment
            assignedBuilding: null,
            workStartTime: null,
            
            // Visual properties
            color: this.getAgentColor(subagent),
            size: this.getAgentSize(subagent)
        };
        
        // Assign to parent building if available
        this.assignAgentToBuilding(agent, parentAgent);
        
        console.log(`👤 Created citizen: ${agent.displayName} (${agent.task})`);
        
        return agent;
    }
    
    updateAgentFromSubagent(agent, subagent, parentAgent) {
        // Update agent properties from subagent changes
        agent.task = this.extractTask(subagent);
        agent.status = this.mapStatus(subagent.status);
        agent.progress = subagent.progress || 0;
        agent.displayName = this.getDisplayName(subagent);
        
        // Update work assignment if parent changed
        if (agent.parentAgent !== subagent.parentAgent) {
            agent.parentAgent = subagent.parentAgent;
            this.assignAgentToBuilding(agent, parentAgent);
        }
        
        // Update state based on status
        if (subagent.status === 'running' && agent.state === this.agentStates.IDLE) {
            this.startWorking(agent);
        } else if (subagent.status === 'completed' && agent.state === this.agentStates.WORKING) {
            this.stopWorking(agent);
        }
    }
    
    getDisplayName(subagent) {
        // Use Agent OS name if available, fall back to abbreviated form
        if (subagent.agentOSName) {
            return subagent.displayNames?.abbreviated || subagent.agentOSName;
        }
        
        return subagent.name || subagent.label || 'Citizen';
    }
    
    extractTask(subagent) {
        // Extract meaningful task name from subagent
        if (subagent.task && subagent.task.length > 3) {
            // Truncate long task names
            return subagent.task.length > 25 ? 
                   subagent.task.substring(0, 25) + '...' : 
                   subagent.task;
        }
        
        if (subagent.label && subagent.label.length > 3) {
            return subagent.label.length > 25 ?
                   subagent.label.substring(0, 25) + '...' :
                   subagent.label;
        }
        
        return 'Working...';
    }
    
    mapStatus(subagentStatus) {
        // Map subagent status to agent state
        switch (subagentStatus) {
            case 'running': return this.agentStates.WORKING;
            case 'completed': return this.agentStates.IDLE;
            case 'failed': return this.agentStates.IDLE;
            default: return this.agentStates.IDLE;
        }
    }
    
    getAgentColor(subagent) {
        // Get color based on model identity
        if (subagent.modelIdentity) {
            return subagent.modelIdentity.color;
        }
        
        // Fallback colors based on model name
        if (subagent.model) {
            if (subagent.model.includes('opus')) return '#FF6B6B';
            if (subagent.model.includes('sonnet')) return '#4ECDC4';
            if (subagent.model.includes('haiku')) return '#45B7D1';
        }
        
        return '#4ECDC4'; // Default Sonnet color
    }
    
    getAgentSize(subagent) {
        // Get size based on model tier
        if (subagent.modelIdentity) {
            switch (subagent.modelIdentity.tier) {
                case 'premium': return 12; // Opus - larger
                case 'standard': return 10; // Sonnet - medium
                case 'light': return 8;   // Haiku - smaller
                default: return 10;
            }
        }
        
        return 10; // Default size
    }
    
    getRandomStartPosition() {
        // Start agents at random positions around the city edges
        const edge = Math.floor(Math.random() * 4); // 0-3 for four edges
        
        switch (edge) {
            case 0: // Top edge
                return { x: Math.random() * 400 + 100, y: 50, z: 0 };
            case 1: // Right edge
                return { x: 450, y: Math.random() * 200 + 100, z: 0 };
            case 2: // Bottom edge
                return { x: Math.random() * 400 + 100, y: 300, z: 0 };
            case 3: // Left edge
            default:
                return { x: 50, y: Math.random() * 200 + 100, z: 0 };
        }
    }
    
    assignAgentToBuilding(agent, parentAgent) {
        // This would typically be handled by the BuildingManager
        // Here we just mark the agent as assigned
        if (parentAgent) {
            agent.assignedBuilding = parentAgent.id;
            
            // Set target position near the building
            const buildingPos = this.getBuildingPosition(parentAgent.id);
            if (buildingPos) {
                agent.targetPosition = {
                    x: buildingPos.x + (Math.random() - 0.5) * 40,
                    y: buildingPos.y + (Math.random() - 0.5) * 40,
                    z: 0
                };
                
                this.startMoving(agent, agent.targetPosition);
            }
        }
    }
    
    getBuildingPosition(buildingId) {
        // Get position from building manager if available
        // For now, place buildings along the road grid for better movement
        const hash = this.hashString(buildingId);
        const roadGridX = 5 + ((hash % 4) * 4);  // Buildings on road intersections
        const roadGridY = 5 + (((hash >> 2) % 3) * 4);
        
        return {
            x: roadGridX * 32,  // Convert grid to screen coordinates
            y: roadGridY * 16,  // Isometric ratio
            z: 0
        };
    }
    
    hashString(str) {
        // Simple hash function for consistent positioning
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }
    
    startMoving(agent, targetPos) {
        agent.targetPosition = targetPos;
        agent.state = this.agentStates.WALKING;
        agent.lastStateChange = Date.now();
        
        // Calculate simple path (direct line for City Engine)
        agent.path = [agent.position, targetPos];
    }
    
    startWorking(agent) {
        agent.state = this.agentStates.WORKING;
        agent.workStartTime = Date.now();
        agent.lastStateChange = Date.now();
    }
    
    stopWorking(agent) {
        agent.state = this.agentStates.IDLE;
        agent.workStartTime = null;
        agent.lastStateChange = Date.now();
    }
    
    update(deltaTime) {
        // Update all agents
        this.agents.forEach(agent => {
            this.updateAgent(agent, deltaTime);
        });
        
        // Update animation frames
        this.animationFrames.walk += deltaTime * 8; // 8 FPS walk animation
        this.animationFrames.work += deltaTime * 2; // 2 FPS work animation
    }
    
    updateAgent(agent, deltaTime) {
        switch (agent.state) {
            case this.agentStates.WALKING:
                this.updateWalking(agent, deltaTime);
                break;
                
            case this.agentStates.WORKING:
                this.updateWorking(agent, deltaTime);
                break;
                
            case this.agentStates.IDLE:
                this.updateIdle(agent, deltaTime);
                break;
        }
        
        // Update animation frame
        agent.animationFrame = Math.floor(this.animationFrames[agent.state] || 0) % 4;
    }
    
    updateWalking(agent, deltaTime) {
        if (!agent.targetPosition) {
            agent.state = this.agentStates.IDLE;
            return;
        }
        
        // Move towards target
        const dx = agent.targetPosition.x - agent.position.x;
        const dy = agent.targetPosition.y - agent.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 5) {
            // Reached target
            agent.position = { ...agent.targetPosition };
            agent.targetPosition = null;
            agent.path = [];
            
            // Start working if assigned to building
            if (agent.assignedBuilding && agent.status === this.agentStates.WORKING) {
                this.startWorking(agent);
            } else {
                agent.state = this.agentStates.IDLE;
            }
        } else {
            // Move towards target
            const moveDistance = this.movementSpeed * deltaTime;
            const moveRatio = Math.min(moveDistance / distance, 1);
            
            agent.position.x += dx * moveRatio;
            agent.position.y += dy * moveRatio;
        }
    }
    
    updateWorking(agent, deltaTime) {
        // Add small random movement to simulate working
        const wobbleAmount = 2;
        agent.position.x += (Math.random() - 0.5) * wobbleAmount * deltaTime;
        agent.position.y += (Math.random() - 0.5) * wobbleAmount * deltaTime;
        
        // Occasionally move to different spots around the building
        const timeSinceWork = Date.now() - (agent.workStartTime || 0);
        if (timeSinceWork > 10000 && Math.random() < deltaTime * 0.1) {
            // Move to new position around building
            const buildingPos = this.getBuildingPosition(agent.assignedBuilding);
            if (buildingPos) {
                const newTarget = {
                    x: buildingPos.x + (Math.random() - 0.5) * 60,
                    y: buildingPos.y + (Math.random() - 0.5) * 60,
                    z: 0
                };
                this.startMoving(agent, newTarget);
            }
        }
    }
    
    updateIdle(agent, deltaTime) {
        // Random idle movement
        if (Math.random() < deltaTime * 0.05) {
            const randomTarget = {
                x: agent.position.x + (Math.random() - 0.5) * 100,
                y: agent.position.y + (Math.random() - 0.5) * 100,
                z: 0
            };
            
            // Keep within city bounds
            randomTarget.x = Math.max(50, Math.min(450, randomTarget.x));
            randomTarget.y = Math.max(50, Math.min(350, randomTarget.y));
            
            this.startMoving(agent, randomTarget);
        }
    }
    
    render(renderer, camera = null) {
        // Render all agents with frustum culling
        this.agents.forEach(agent => {
            // Skip rendering if outside camera view (frustum culling)
            if (camera && !this.isAgentVisible(agent, camera, renderer)) {
                return;
            }
            
            renderer.renderAgent(agent);
        });
    }

    isAgentVisible(agent, camera, renderer) {
        // Check if agent is within visible bounds for frustum culling
        if (!agent.position) return false;

        const visibleBounds = renderer.getVisibleBounds(camera);
        const agentGridX = agent.position.x / 32; // Convert to grid coordinates
        const agentGridY = agent.position.y / 16;
        
        return agentGridX >= visibleBounds.minX - 1 &&
               agentGridX <= visibleBounds.maxX + 1 &&
               agentGridY >= visibleBounds.minY - 1 &&
               agentGridY <= visibleBounds.maxY + 1;
    }
    
    getAgentAt(x, y, tolerance = 16) {
        // Find agent at screen coordinates (for click detection)
        return this.agents.find(agent => {
            if (!agent.position) return false;
            
            return Math.abs(x - agent.position.x) <= tolerance && 
                   Math.abs(y - agent.position.y) <= tolerance;
        });
    }
    
    getAgentStats() {
        return {
            total: this.agents.length,
            byState: this.getAgentStateCount(),
            byModel: this.getAgentModelCount(),
            working: this.agents.filter(a => a.state === this.agentStates.WORKING).length,
            idle: this.agents.filter(a => a.state === this.agentStates.IDLE).length
        };
    }
    
    getAgentStateCount() {
        const counts = {};
        this.agents.forEach(agent => {
            counts[agent.state] = (counts[agent.state] || 0) + 1;
        });
        return counts;
    }
    
    getAgentModelCount() {
        const counts = {};
        this.agents.forEach(agent => {
            const model = agent.modelIdentity?.name || 'Unknown';
            counts[model] = (counts[model] || 0) + 1;
        });
        return counts;
    }
    
    // Agent OS naming integration methods
    getAgentOSNames() {
        return this.agents
            .filter(agent => agent.agentOSName)
            .map(agent => ({
                id: agent.id,
                agentOSName: agent.agentOSName,
                displayName: agent.displayName,
                role: agent.role,
                parentAgent: agent.parentAgent
            }));
    }
    
    findAgentByOSName(agentOSName) {
        return this.agents.find(agent => agent.agentOSName === agentOSName);
    }
    
    // Debug methods
    getDebugInfo() {
        return {
            agents: this.agents.length,
            states: this.getAgentStateCount(),
            models: this.getAgentModelCount(),
            movementSpeed: this.movementSpeed
        };
    }
    
    clearAllAgents() {
        // Clear all agents (for reset)
        this.agents = [];
        console.log('🗑️ All agents cleared');
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AgentManager;
}