/**
 * Sims State Bridge — SpawnKit Data → Sims Character Behaviors
 * ═══════════════════════════════════════════════════════════════
 * Connects SpawnKit.data events to character actions, missions
 * to room activities, and agent statuses to Sims-style behaviors.
 *
 * @author Echo (CMO) 🔌
 */

class SimsStateBridge {
    constructor(characterManager, officeMap) {
        this.characterManager = characterManager;
        this.officeMap = officeMap;
        this.lastUpdate = Date.now();
        this.eventTimer = 0;
        this.nextEvent = 15000 + Math.random() * 20000;

        this.lastDataSync = 0;
        this.syncInterval = 15000;

        this.displayedMissions = [];
        this.displayedSubagents = [];

        this._initDataHooks();
        this._syncSpawnKitData();
    }

    // ── Name helpers ────────────────────────────────────
    _rn(id, field) {
        if (window.SpawnKitNames) return SpawnKitNames.resolve('sims', id, field);
        return id;
    }
    _ro(objId) {
        if (window.SpawnKitNames) return SpawnKitNames.resolveObject('sims', objId);
        return objId;
    }
    _sub(i) {
        if (window.SpawnKitNames) return SpawnKitNames.getSubAgentName('sims', i);
        return `Intern #${i + 1}`;
    }

    // ── Event hooks ─────────────────────────────────────

    _initDataHooks() {
        if (!window.SpawnKit) return;
        SpawnKit.on('mission:new',      d => this._handleNewMission(d));
        SpawnKit.on('mission:progress',  d => this._handleMissionProgress(d));
        SpawnKit.on('subagent:spawn',    d => this._handleSubagentSpawn(d));
        SpawnKit.on('agent:status',      d => this._handleAgentStatus(d));
        SpawnKit.on('cron:trigger',      d => this._handleCronTrigger(d));
        SpawnKit.on('data:refresh',      () => this._syncSpawnKitData());
        console.log('🏠 Sims State Bridge: SpawnKit hooks wired');
    }

    _syncSpawnKitData() {
        if (!window.SpawnKit?.data) return;
        const data = SpawnKit.data;
        this._updateAgentStatuses(data.agents);
        this._updateMissions(data.missions);
        this._updateSubagents(data.subagents);
        
        // Update Agent OS names and model identities in character manager
        if (this.characterManager && typeof this.characterManager.updateAgentOSNames === 'function') {
            this.characterManager.updateAgentOSNames(data);
        }
        
        this.lastDataSync = Date.now();
        console.log('🏠 Sims State Bridge: Synced with SpawnKit data (Agent OS + Model Identity integrated)');
    }

    // ── Agent status mapping ────────────────────────────

    _updateAgentStatuses(agents) {
        if (!agents?.length) return;
        agents.forEach(agent => {
            if (!agent) return;
            const char = this.characterManager?.findCharacterByRole(agent.role) ||
                         this.characterManager?.findCharacterByName(agent.name);
            if (!char) return;

            const newState = this._mapStatus(agent.status, agent.currentTask);
            char.setState(newState);

            // Enhanced mood mapping based on multiple factors
            const uptime = this._parseUptime(agent.lastSeenRelative);
            const tokenActivity = Math.min((agent.tokensUsed || 0) / 10000, 1); // normalized
            const apiActivity = Math.min((agent.apiCalls || 0) / 50, 1); // normalized
            
            if (agent.status === 'active' || agent.status === 'working') {
                char.mood = 0.8 + (tokenActivity * 0.2); // active + productive = happier
            } else if (agent.status === 'idle') {
                char.mood = Math.max(0.3, 0.6 - (uptime * 0.1)); // idle too long = less happy
            } else if (agent.status === 'error') {
                char.mood = 0.1;
            } else {
                char.mood = 0.5 + (apiActivity * 0.3);
            }

            // Show speech bubbles more frequently with real tasks
            if (agent.currentTask && agent.currentTask !== 'Standby') {
                if (Math.random() > 0.3) { // Higher chance for real tasks
                    const bubble = this._taskBubble(agent.currentTask);
                    char.showSpeechBubble(bubble);
                }
            } else if (agent.status === 'active' && Math.random() > 0.8) {
                // Show progress updates for active agents
                const progressBubbles = ['Making progress...', 'Almost there!', 'Working hard!', 'Sul sul!', 'Getting it done!'];
                const bubble = progressBubbles[Math.floor(Math.random() * progressBubbles.length)];
                char.showSpeechBubble(bubble);
            }

            // Update character metrics for needs calculation
            char.agentMetrics = {
                tokensUsed: agent.tokensUsed || 0,
                apiCalls: agent.apiCalls || 0,
                lastSeen: agent.lastSeen,
                status: agent.status,
                uptime: uptime
            };
        });
    }

    _mapStatus(status, task) {
        const t = (task || '').toLowerCase();
        
        // Enhanced mapping based on task content
        switch (status) {
            case 'active':
            case 'working':
            case 'building':
                // Smart room navigation based on task type
                if (t.includes('meeting') || t.includes('planning') || t.includes('discuss')) {
                    return 'going_to_meeting';
                }
                if (t.includes('whiteboard') || t.includes('design') || t.includes('architect') || t.includes('brainstorm')) {
                    return 'at_whiteboard';
                }
                if (t.includes('file') || t.includes('document') || t.includes('search') || t.includes('research')) {
                    return 'searching_files';
                }
                if (t.includes('email') || t.includes('message') || t.includes('communication')) {
                    return 'checking_inbox';
                }
                if (t.includes('deploy') || t.includes('build') || t.includes('code') || t.includes('develop')) {
                    return 'working_at_desk';
                }
                return 'working_at_desk';
                
            case 'creating':
            case 'monitoring':
                if (t.includes('content') || t.includes('writing') || t.includes('story')) {
                    return 'at_whiteboard';
                }
                return 'working_at_desk';
                
            case 'idle':
                // More varied idle activities based on time patterns
                const hour = new Date().getHours();
                if (hour >= 14 && hour <= 16) return 'getting_coffee'; // Afternoon coffee
                return Math.random() > 0.6 ? 'thinking' : (Math.random() > 0.5 ? 'chatting' : 'getting_coffee');
                
            case 'error':
                return 'thinking'; // Debugging/problem-solving
                
            default:
                return 'working_at_desk';
        }
    }

    _taskBubble(task) {
        if (!task || task === 'Standby') return 'Working...';
        
        // Extract key action words and make them more Sims-like
        const simsTranslations = {
            'build': '🔨 Building',
            'deploy': '🚀 Deploy',
            'fix': '🔧 Fixing',
            'review': '👀 Review',
            'write': '✍️ Writing',
            'plan': '📋 Planning',
            'meet': '🤝 Meeting',
            'design': '🎨 Design',
            'test': '🧪 Testing',
            'debug': '🐛 Debug',
            'research': '📚 Research',
            'analyze': '📊 Analyze',
            'create': '✨ Create',
            'update': '🔄 Update',
            'monitor': '👁️ Watch'
        };
        
        const taskLower = task.toLowerCase();
        
        // Check for key words
        for (const [key, sims] of Object.entries(simsTranslations)) {
            if (taskLower.includes(key)) {
                return sims;
            }
        }
        
        // Fallback: take first few meaningful words
        const words = task.split(' ')
            .filter(w => w.length > 2 && !['the', 'and', 'for', 'with'].includes(w.toLowerCase()))
            .slice(0, 2);
            
        if (words.length === 0) return 'Working...';
        return words.join(' ') + '...';
    }

    // ── Mission mapping ─────────────────────────────────

    _updateMissions(missions) {
        if (!missions?.length) return;
        this.displayedMissions = missions.slice(0, 4);
        this._updateMissionUI();
        (missions || []).forEach(m => {
            if (m?.status === 'in_progress' && Math.random() > 0.8) {
                this._triggerMissionActivity(m);
            }
        });
    }

    _updateMissionUI() {
        // The HTML UI panel reads from displayedMissions directly via SimsUI
        // Fire a custom event for the UI
        if (window.simsOffice?.simsUI) {
            window.simsOffice?.simsUI?.setMissions(this.displayedMissions);
        }
    }

    _triggerMissionActivity(mission) {
        if (!mission?.assignedAgents?.length) return;
        (mission.assignedAgents || []).forEach(agentId => {
            const char = this.characterManager?.findCharacterByName(agentId);
            if (char) {
                char.setState(Math.random() > 0.5 ? 'at_whiteboard' : 'working_at_desk');
            }
        });
    }

    // ── Subagent mapping ────────────────────────────────

    _updateSubagents(subagents) {
        if (!subagents?.length) return;
        this.displayedSubagents = subagents;
        subagents.forEach(sa => {
            if (!sa) return;
            if (sa.status === 'running' && !this.characterManager?.hasSubagent(sa.id)) {
                this._spawnSubagentCharacter(sa);
            }
        });
    }

    _spawnSubagentCharacter(sa) {
        if (!sa) return;
        const parent = this.characterManager?.findCharacterByRole(this._getAgentRoleById(sa.parentAgent));
        if (parent) {
            const stagiaire = this.characterManager?.createStagiaire(
                sa.id, sa.name,
                { x: parent.gridX + (Math.random() - 0.5) * 2, y: parent.gridY + (Math.random() - 0.5) * 2 }
            );
            
            // Show what they're working on
            if (stagiaire && sa.task) {
                const taskBubble = this._taskBubble(sa.task);
                stagiaire.showSpeechBubble(taskBubble);
            }
        }
    }

    _getAgentRoleById(agentId) {
        if (!window.SpawnKit?.data?.agents) return null;
        const a = window.SpawnKit.data.agents.find(a => a?.id === agentId);
        return a?.role || null;
    }

    // ── Event handlers ──────────────────────────────────

    _handleNewMission(data) {
        this._syncSpawnKitData();
        this.triggerWhiteboardSession();
        
        // Visual feedback for new mission
        this.officeMap?.triggerMailboxFlash(); // Flash inbox for new work
        
        // Thought bubble: new mission!
        if (window.simsOffice?.simsEffects && this.characterManager?.characters?.[0]) {
            window.simsOffice?.simsEffects?.showThoughtBubble(
                this.characterManager.characters[0], '📋 New Mission!'
            );
        }
        
        // Show speech bubble on relevant character
        if (data?.assignedAgents?.length) {
            const assignee = this.characterManager?.findCharacterByName(data.assignedAgents[0]);
            if (assignee) {
                assignee.showSpeechBubble('New task! 💪');
            }
        }
    }

    _handleMissionProgress(data) {
        this._updateMissionUI();
        if ((data?.newProgress ?? 0) >= 1.0) this.triggerCelebration();
    }

    _handleSubagentSpawn(data) { this._syncSpawnKitData(); }
    _handleAgentStatus(data)   { this._updateAgentStatuses([data]); }

    _handleCronTrigger(data) {
        this.officeMap?.triggerPhoneRing();
        if (!data) return;
        const owner = this.characterManager?.findCharacterByName(data.owner);
        if (owner) {
            const pp = this.officeMap?.locations?.phoneAlarm;
            if (pp) {
                owner.moveTo(pp.x, pp.y);
                owner.showSpeechBubble('Phone!');
                setTimeout(() => owner.setState('working_at_desk'), 3000);
            }
        }
    }

    // ── Public triggers ─────────────────────────────────

    triggerGroupMeeting() {
        const chars = this.characterManager?.characters;
        if (!chars?.length) return;
        const shuffled = [...chars].sort(() => Math.random() - 0.5);
        const participants = shuffled.slice(0, 2 + Math.floor(Math.random() * 3));
        participants.forEach((c, i) => {
            setTimeout(() => {
                c.setState('going_to_meeting');
                c.showSpeechBubble('Meeting!');
            }, i * 400);
        });
    }

    triggerCelebration() {
        this.characterManager?.triggerCelebration();
        (this.characterManager?.characters || []).forEach((c, i) => {
            setTimeout(() => c.showSpeechBubble('🎉'), i * 200);
        });
        // Show floating text
        if (window.simsOffice?.simsEffects) {
            window.simsOffice?.simsEffects?.showFloatingText(450, 250, '+Friendship!', 0x00cc00);
        }
    }

    triggerWhiteboardSession() {
        const chars = this.characterManager?.characters;
        if (!chars?.length) return;
        const lead = chars.find(c => c.canonicalId === 'hunter') || chars[0];
        const wb = this.officeMap?.locations?.missionBoard;

        if (lead && wb) {
            lead.moveTo(wb.x, wb.y + 1);
            lead.showSpeechBubble('Whiteboard!');

            chars.forEach((c, i) => {
                if (c !== lead) {
                    setTimeout(() => {
                        c.moveTo(wb.x - 1 + i * 0.5, wb.y + 2);
                        c.showSpeechBubble('Got it!');
                    }, (i + 1) * 600);
                }
            });
        }
    }

    triggerCoffeeBreak() {
        const chars = this.characterManager?.characters;
        if (!chars?.length) return;
        const char = chars[Math.floor(Math.random() * chars.length)];
        if (!char) return;
        char.setState('getting_coffee');
        char.showSpeechBubble('Coffee time!');
    }

    // ── Update loop ─────────────────────────────────────

    update(dt) {
        this.eventTimer += dt;

        if (Date.now() - this.lastDataSync >= this.syncInterval) {
            this._syncSpawnKitData();
        }

        if (this.eventTimer >= this.nextEvent) {
            this._triggerRandomEvent();
            this.eventTimer = 0;
            this.nextEvent = 15000 + Math.random() * 20000;
        }
    }

    _triggerRandomEvent() {
        if (!window.SpawnKit?.data) return;

        const roll = Math.random();
        if (roll > 0.7) {
            // Random agent activity
            const agents = window.SpawnKit?.data?.agents;
            if (agents?.length) {
                const agent = agents[Math.floor(Math.random() * agents.length)];
                if (!agent) return;
                const char = this.characterManager?.findCharacterByRole(agent.role) ||
                             this.characterManager?.findCharacterByName(agent.name);
                if (char) {
                    const states = ['thinking', 'working_at_desk', 'chatting', 'getting_coffee'];
                    char.setState(states[Math.floor(Math.random() * states.length)]);
                }
            }
        } else if (roll > 0.5) {
            // Simlish chat between two agents
            if (window.simsOffice?.simsEffects) {
                const chars = this.characterManager?.characters || [];
                if (chars.length >= 2) {
                    const a = chars[Math.floor(Math.random() * chars.length)];
                    let b = chars[Math.floor(Math.random() * chars.length)];
                    if (b === a) b = chars[(chars.indexOf(a) + 1) % chars.length];
                    if (a && b) window.simsOffice?.simsEffects?.showSimlishChat(a, b);
                }
            }
        }
    }

    // ── Helper Methods ──────────────────────────────────

    _parseUptime(lastSeenRelative) {
        if (!lastSeenRelative) return 0;
        const str = lastSeenRelative.toLowerCase();
        if (str.includes('s')) return parseFloat(str) / 60; // seconds to minutes
        if (str.includes('m')) return parseFloat(str); // already minutes
        if (str.includes('h')) return parseFloat(str) * 60; // hours to minutes
        if (str.includes('d')) return parseFloat(str) * 1440; // days to minutes
        return 0;
    }

    // ── Status API ──────────────────────────────────────

    getMissionStatus() {
        const m = window.SpawnKit?.data?.missions;
        if (!m?.length) return { active: 0, queued: 0 };
        return {
            active: m.filter(x => x?.status === 'in_progress' || x?.status === 'active').length,
            queued: m.filter(x => x?.status === 'pending').length,
        };
    }
}

// ── Simlish phrases for random chat ─────────────────────

const SIMS_PHRASES = {
    greeting: ['Sul sul!', 'Dag dag!', 'Nooboo!', 'Benwa!', 'Flurby!'],
    working:  ['Veena fredishay!', 'Firby nurbs!', 'Gerbit!', 'Za woka genava!'],
    happy:    ['Ooh, be gah!', 'Woo hoo!', 'Bloo bagoo!', 'Mik-a-poo!'],
    angry:    ['Sno sno!', 'Narf narf!', 'Flern!', 'Shapoopi!'],
    coffee:   ['Lawnda cup!', 'Gerba derba!', 'Ah, caba!'],
    meeting:  ['Blarbst!', 'Nobo nobo!', 'Freka chaka!'],
};

window.SimsStateBridge = SimsStateBridge;
window.SIMS_PHRASES = SIMS_PHRASES;
