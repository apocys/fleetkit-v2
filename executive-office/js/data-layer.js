/**
 * FleetKit Executive Office V4 - Data Layer
 * Central state management and API bridge client
 * Connects to OpenClaw API at http://127.0.0.1:8222
 */

// Event system for inter-component communication
class FleetEventsClass {
    constructor() {
        this.events = new Map();
    }

    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(callback);
    }

    emit(event, data) {
        if (this.events.has(event)) {
            this.events.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    off(event, callback) {
        if (this.events.has(event)) {
            const handlers = this.events.get(event);
            const index = handlers.indexOf(callback);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }
}

// Global event bus — FleetEvents is the singleton instance
const FleetEvents = new FleetEventsClass();
window.FleetEvents = FleetEvents;

// Central state management
class FleetStateClass {
    constructor() {
        this.data = {
            agents: [],
            missions: [],
            skills: {
                installed: [],
                available: [],
                categories: {
                    ai: { name: 'AI & ML', color: '#007AFF' },
                    dev: { name: 'Development', color: '#FF9F0A' },
                    comm: { name: 'Communication', color: '#30D158' },
                    data: { name: 'Data & Analytics', color: '#BF5AF2' },
                    auto: { name: 'Automation', color: '#FF453A' }
                }
            },
            sessions: {
                crons: [],
                active: [],
                history: []
            },
            config: {},
            memory: {
                main: '',
                files: []
            },
            apiStatus: {
                connected: false,
                lastUpdate: null,
                error: null
            }
        };
        
        this.apiUrl = window.OC_RELAY_URL || 'http://127.0.0.1:8222';
        this.refreshInterval = null;
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    // API Request helper
    async makeRequest(endpoint, options = {}) {
        const url = `${this.apiUrl}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(window.OC_RELAY_TOKEN ? { 'Authorization': `Bearer ${window.OC_RELAY_TOKEN}` } : {})
            },
            timeout: 10000,
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            this.retryCount = 0;
            this.updateApiStatus(true, null);
            return await response.json();
        } catch (error) {
            console.error(`API request to ${endpoint} failed:`, error);
            this.updateApiStatus(false, error.message);
            
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`Retrying API request (${this.retryCount}/${this.maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, 2000 * this.retryCount));
                return this.makeRequest(endpoint, options);
            }
            
            throw error;
        }
    }

    updateApiStatus(connected, error = null) {
        const wasConnected = this.data.apiStatus.connected;
        
        this.data.apiStatus = {
            connected,
            lastUpdate: new Date().toISOString(),
            error
        };

        // Emit connection status change
        if (wasConnected !== connected) {
            FleetEvents.emit('connection:changed', {
                connected,
                error,
                timestamp: this.data.apiStatus.lastUpdate
            });
        }
    }

    // Data fetching methods
    async fetchSessions() {
        try {
            const sessions = await this.makeRequest('/api/oc/sessions');
            
            // Map sessions to agents and missions
            this.data.agents = this.mapSessionsToAgents(sessions);
            this.data.missions = this.mapSessionsToMissions(sessions);
            this.data.sessions.active = sessions.filter(s => s.status === 'active');
            
            FleetEvents.emit('data:sessions:updated', sessions);
            FleetEvents.emit('data:agents:updated', this.data.agents);
            FleetEvents.emit('data:missions:updated', this.data.missions);
            
            return sessions;
        } catch (error) {
            console.warn('Failed to fetch sessions, using fallback data');
            return [];
        }
    }

    async fetchCrons() {
        try {
            const cronData = await this.makeRequest('/api/oc/crons');
            this.data.sessions.crons = cronData.jobs || [];
            
            FleetEvents.emit('data:crons:updated', this.data.sessions.crons);
            return this.data.sessions.crons;
        } catch (error) {
            console.warn('Failed to fetch crons');
            return [];
        }
    }

    async fetchAgents() {
        try {
            const agents = await this.makeRequest('/api/oc/agents');
            // This might be different from sessions-based agents
            FleetEvents.emit('data:agents:raw:updated', agents);
            return agents;
        } catch (error) {
            console.warn('Failed to fetch agents');
            return [];
        }
    }

    async fetchConfig() {
        try {
            const config = await this.makeRequest('/api/oc/config');
            this.data.config = config;
            
            // Extract skills from config
            if (config.agents?.defaults?.skills) {
                this.data.skills.installed = config.agents.defaults.skills;
                FleetEvents.emit('data:skills:updated', this.data.skills);
            }
            
            FleetEvents.emit('data:config:updated', config);
            return config;
        } catch (error) {
            console.warn('Failed to fetch config');
            return {};
        }
    }

    async fetchMemory() {
        try {
            const memory = await this.makeRequest('/api/oc/memory');
            this.data.memory = memory;
            
            FleetEvents.emit('data:memory:updated', memory);
            return memory;
        } catch (error) {
            console.warn('Failed to fetch memory');
            return { main: '', files: [] };
        }
    }

    async sendChat(message, target = 'ceo') {
        try {
            const response = await this.makeRequest('/api/oc/chat', {
                method: 'POST',
                body: JSON.stringify({ message, target })
            });
            
            FleetEvents.emit('chat:message:sent', { message, target, response });
            return response;
        } catch (error) {
            console.error('Failed to send chat message:', error);
            throw error;
        }
    }

    // Data mapping functions
    mapSessionsToAgents(sessions) {
        const agents = [];
        
        // CEO (main session)
        const mainSession = sessions.find(s => s.kind === 'main') || sessions[0];
        if (mainSession) {
            agents.push({
                id: 'ceo',
                name: this.getCEOName(),
                role: 'CEO',
                emoji: '🍎',
                type: 'ceo',
                status: this.mapSessionStatus(mainSession.status),
                model: mainSession.model || 'opus-4.6',
                canDecommission: false,
                metrics: {
                    tokens: mainSession.totalTokens || 0,
                    tasks: this.calculateCompletedTasks(mainSession),
                    uptime: this.calculateUptime(mainSession.lastActive)
                },
                currentTask: 'Orchestrating fleet operations',
                sessionKey: mainSession.key,
                subAgents: this.findSubAgents(sessions, mainSession.key),
                skills: this.getAgentSkills('ceo'),
                todoList: this.generateAgentTodos(mainSession)
            });
        }

        // C-Level agents (static for now, could be dynamic)
        const cLevelAgents = [
            { id: 'atlas', name: 'Atlas', role: 'COO', emoji: '⚙️', color: '#BF5AF2' },
            { id: 'forge', name: 'Forge', role: 'CTO', emoji: '🔧', color: '#FF9F0A' },
            { id: 'hunter', name: 'Hunter', role: 'CRO', emoji: '🎯', color: '#FF453A' },
            { id: 'echo', name: 'Echo', role: 'CMO', emoji: '📢', color: '#0A84FF' },
            { id: 'sentinel', name: 'Sentinel', role: 'QA & Security', emoji: '🛡️', color: '#30D158' }
        ];

        cLevelAgents.forEach(agent => {
            const session = sessions.find(s => s.label && s.label.toLowerCase().includes(agent.name.toLowerCase()));
            
            agents.push({
                ...agent,
                type: 'c-level',
                status: session ? this.mapSessionStatus(session.status) : 'idle',
                model: session?.model || 'sonnet-4',
                canDecommission: true,
                metrics: session ? {
                    tokens: session.totalTokens || 0,
                    tasks: this.calculateCompletedTasks(session),
                    uptime: this.calculateUptime(session.lastActive)
                } : { tokens: 0, tasks: 0, uptime: '0m' },
                currentTask: session ? this.extractCurrentTask(session) : '',
                sessionKey: session?.key,
                subAgents: session ? this.findSubAgents(sessions, session.key) : [],
                skills: this.getAgentSkills(agent.id),
                todoList: session ? this.generateAgentTodos(session) : []
            });
        });

        return agents;
    }

    mapSessionsToMissions(sessions) {
        // Map sessions with labels to missions
        return sessions
            .filter(session => session.label && session.label.trim() !== '')
            .map(session => ({
                id: session.key,
                name: session.label,
                status: this.mapSessionStatus(session.status),
                assignedAgents: this.getAssignedAgents(session),
                createdAt: session.createdAt || new Date().toISOString(),
                progress: this.calculateMissionProgress(session),
                todo: this.generateMissionTodos(session),
                sessionData: session
            }));
    }

    // Helper methods
    getCEOName() {
        try {
            const config = JSON.parse(localStorage.getItem('spawnkit-config') || '{}');
            return config.userName || 'ApoMac';
        } catch {
            return 'ApoMac';
        }
    }

    mapSessionStatus(status) {
        const statusMap = {
            'active': 'active',
            'idle': 'idle',
            'busy': 'busy',
            'error': 'error',
            'paused': 'idle'
        };
        return statusMap[status] || 'idle';
    }

    calculateCompletedTasks(session) {
        // Estimate based on token usage (rough heuristic)
        const tokens = session.totalTokens || 0;
        return Math.floor(tokens / 1000); // ~1 task per 1k tokens
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

    findSubAgents(sessions, parentKey) {
        return sessions
            .filter(s => s.kind === 'subagent' && s.parentKey === parentKey)
            .map(s => ({
                id: s.key,
                name: s.label || `Sub-Agent ${s.key.slice(-6)}`,
                status: this.mapSessionStatus(s.status),
                currentTask: this.extractCurrentTask(s)
            }));
    }

    getAgentSkills(agentId) {
        const skillMap = {
            ceo: ['orchestration', 'strategy', 'vision', 'leadership'],
            atlas: ['operations', 'process', 'documentation', 'workflows'],
            forge: ['engineering', 'security', 'architecture', 'performance'],
            hunter: ['revenue', 'growth', 'sales', 'research'],
            echo: ['branding', 'content', 'video', 'copywriting'],
            sentinel: ['audit', 'qa', 'risk', 'review']
        };
        
        return skillMap[agentId] || [];
    }

    generateAgentTodos(session) {
        // Generate realistic TODOs based on session data
        const baseTodos = [
            { id: 1, text: 'Process incoming requests', status: 'progress' },
            { id: 2, text: 'Review session logs', status: 'pending' },
            { id: 3, text: 'Update memory context', status: 'done' }
        ];

        if (session.label) {
            baseTodos.unshift({
                id: 0,
                text: `Complete mission: ${session.label}`,
                status: session.status === 'active' ? 'progress' : 'pending'
            });
        }

        return baseTodos;
    }

    generateMissionTodos(session) {
        return [
            { id: 1, text: 'Initialize mission parameters', status: 'done' },
            { id: 2, text: 'Gather required resources', status: 'progress' },
            { id: 3, text: 'Execute primary objectives', status: 'pending' },
            { id: 4, text: 'Review and finalize', status: 'pending' }
        ];
    }

    extractCurrentTask(session) {
        return session.label || 'Processing requests';
    }

    getAssignedAgents(session) {
        // For now, assign CEO by default, could be expanded
        return ['ceo'];
    }

    calculateMissionProgress(session) {
        // Simple progress calculation based on status
        const statusProgress = {
            'active': 0.6,
            'completed': 1.0,
            'paused': 0.3,
            'idle': 0.1
        };
        return statusProgress[session.status] || 0.1;
    }

    // Public methods for components
    async initialize() {
        console.log('🚀 Fleet Data Layer initializing...');
        
        // Fetch all initial data
        await Promise.allSettled([
            this.fetchSessions(),
            this.fetchCrons(),
            this.fetchConfig(),
            this.fetchMemory()
        ]);

        // Start periodic refresh
        this.startPeriodicRefresh();
        
        FleetEvents.emit('fleet:initialized', {
            agents: this.data.agents.length,
            missions: this.data.missions.length,
            skills: this.data.skills.installed.length
        });
        
        console.log('✅ Fleet Data Layer ready');
    }

    startPeriodicRefresh() {
        // Refresh every 30 seconds
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        this.refreshInterval = setInterval(() => {
            this.refreshData();
        }, 30000);
    }

    async refreshData() {
        try {
            await Promise.allSettled([
                this.fetchSessions(),
                this.fetchCrons()
            ]);
        } catch (error) {
            console.warn('Data refresh failed:', error);
        }
    }

    // Getters for components
    getAgents() {
        return this.data.agents;
    }

    getAgent(id) {
        return this.data.agents.find(agent => agent.id === id);
    }

    getMissions() {
        return this.data.missions;
    }

    getMission(id) {
        return this.data.missions.find(mission => mission.id === id);
    }

    getSkills() {
        return this.data.skills;
    }

    getSessions() {
        return this.data.sessions;
    }

    getConfig() {
        return this.data.config;
    }

    getMemory() {
        return this.data.memory;
    }

    getApiStatus() {
        return this.data.apiStatus;
    }

    // Health check
    async checkHealth() {
        try {
            const health = await this.makeRequest('/api/health');
            return health.ok === true;
        } catch {
            return false;
        }
    }

    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}

// Global instance — accessible as both window.FleetState and FleetState
const FleetState = new FleetStateClass();
window.FleetState = FleetState;

// Initialize when the DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.FleetState.initialize();
    });
} else {
    window.FleetState.initialize();
}