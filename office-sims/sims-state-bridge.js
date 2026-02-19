/**
 * Sims State Bridge — FleetKit Data → Sims Character Behaviors
 * ═══════════════════════════════════════════════════════════════
 * Connects FleetKit.data events to character actions, missions
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
        this._syncFleetKitData();
    }

    // ── Name helpers ────────────────────────────────────
    _rn(id, field) {
        if (window.FleetKitNames) return FleetKitNames.resolve('sims', id, field);
        return id;
    }
    _ro(objId) {
        if (window.FleetKitNames) return FleetKitNames.resolveObject('sims', objId);
        return objId;
    }
    _sub(i) {
        if (window.FleetKitNames) return FleetKitNames.getSubAgentName('sims', i);
        return `Intern #${i + 1}`;
    }

    // ── Event hooks ─────────────────────────────────────

    _initDataHooks() {
        if (!window.FleetKit) return;
        FleetKit.on('mission:new',      d => this._handleNewMission(d));
        FleetKit.on('mission:progress',  d => this._handleMissionProgress(d));
        FleetKit.on('subagent:spawn',    d => this._handleSubagentSpawn(d));
        FleetKit.on('agent:status',      d => this._handleAgentStatus(d));
        FleetKit.on('cron:trigger',      d => this._handleCronTrigger(d));
        FleetKit.on('data:refresh',      () => this._syncFleetKitData());
        console.log('🏠 Sims State Bridge: FleetKit hooks wired');
    }

    _syncFleetKitData() {
        if (!window.FleetKit?.data) return;
        const data = FleetKit.data;
        this._updateAgentStatuses(data.agents);
        this._updateMissions(data.missions);
        this._updateSubagents(data.subagents);
        this.lastDataSync = Date.now();
    }

    // ── Agent status mapping ────────────────────────────

    _updateAgentStatuses(agents) {
        if (!agents) return;
        agents.forEach(agent => {
            const char = this.characterManager?.findCharacterByRole(agent?.role) ||
                         this.characterManager?.findCharacterByName(agent?.name);
            if (!char) return;

            const newState = this._mapStatus(agent?.status, agent?.currentTask);
            char.setState(newState);

            // Mood mapping: more active = happier
            if (agent?.status === 'active' || agent?.status === 'working') char.mood = 0.9;
            else if (agent?.status === 'idle') char.mood = 0.5;
            else if (agent?.status === 'error') char.mood = 0.1;
            else char.mood = 0.7;

            if (agent?.currentTask && Math.random() > 0.6) {
                char.showSpeechBubble(this._taskBubble(agent.currentTask));
            }
        });
    }

    _mapStatus(status, task) {
        const t = (task || '').toLowerCase();
        switch (status) {
            case 'active':
            case 'working':
            case 'building':
                if (t.includes('meeting') || t.includes('planning')) return 'going_to_meeting';
                if (t.includes('whiteboard') || t.includes('design'))  return 'at_whiteboard';
                return 'working_at_desk';
            case 'creating':
            case 'monitoring':
                return 'working_at_desk';
            case 'idle':
                return Math.random() > 0.5 ? 'thinking' : 'getting_coffee';
            default:
                return 'working_at_desk';
        }
    }

    _taskBubble(task) {
        const words = (task || 'Working').split(' ').filter(w => w.length > 3).slice(0, 2);
        return words.join(' ') || 'Working...';
    }

    // ── Mission mapping ─────────────────────────────────

    _updateMissions(missions) {
        if (!missions) return;
        this.displayedMissions = missions.slice(0, 4);
        this._updateMissionUI();
        missions.forEach(m => {
            if (m?.status === 'in_progress' && Math.random() > 0.8) {
                this._triggerMissionActivity(m);
            }
        });
    }

    _updateMissionUI() {
        // The HTML UI panel reads from displayedMissions directly via SimsUI
        // Fire a custom event for the UI
        if (window.simsOffice?.simsUI) {
            window.simsOffice.simsUI.setMissions(this.displayedMissions);
        }
    }

    _triggerMissionActivity(mission) {
        if (!mission?.assignedAgents) return;
        mission.assignedAgents.forEach(agentId => {
            const char = this.characterManager?.findCharacterByName(agentId);
            if (char) {
                char.setState(Math.random() > 0.5 ? 'at_whiteboard' : 'working_at_desk');
            }
        });
    }

    // ── Subagent mapping ────────────────────────────────

    _updateSubagents(subagents) {
        if (!subagents) return;
        this.displayedSubagents = subagents;
        subagents.forEach(sa => {
            if (sa?.status === 'running' && !this.characterManager?.hasSubagent(sa?.id)) {
                this._spawnSubagentCharacter(sa);
            }
        });
    }

    _spawnSubagentCharacter(sa) {
        const parent = this.characterManager?.findCharacterByRole(this._getAgentRoleById(sa?.parentAgent));
        if (parent) {
            this.characterManager.createStagiaire(
                sa.id, sa.name,
                { x: parent.gridX + (Math.random() - 0.5) * 2, y: parent.gridY + (Math.random() - 0.5) * 2 }
            );
        }
    }

    _getAgentRoleById(agentId) {
        if (!window.FleetKit?.data?.agents) return null;
        const a = window.FleetKit.data.agents.find(a => a?.id === agentId);
        return a?.role || null;
    }

    // ── Event handlers ──────────────────────────────────

    _handleNewMission(data) {
        this._syncFleetKitData();
        this.triggerWhiteboardSession();
        // Thought bubble: new mission!
        if (window.simsOffice?.simsEffects && this.characterManager?.characters?.[0]) {
            window.simsOffice.simsEffects.showThoughtBubble(
                this.characterManager.characters[0], '📋'
            );
        }
    }

    _handleMissionProgress(data) {
        this._updateMissionUI();
        if (data?.newProgress >= 1.0) this.triggerCelebration();
    }

    _handleSubagentSpawn(data) { this._syncFleetKitData(); }
    _handleAgentStatus(data)   { this._updateAgentStatuses([data]); }

    _handleCronTrigger(data) {
        this.officeMap?.triggerPhoneRing();
        const owner = this.characterManager?.findCharacterByName(data?.owner);
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
            window.simsOffice.simsEffects.showFloatingText(450, 250, '+Friendship!', 0x00cc00);
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
            this._syncFleetKitData();
        }

        if (this.eventTimer >= this.nextEvent) {
            this._triggerRandomEvent();
            this.eventTimer = 0;
            this.nextEvent = 15000 + Math.random() * 20000;
        }
    }

    _triggerRandomEvent() {
        if (!window.FleetKit?.data) return;

        const roll = Math.random();
        if (roll > 0.7) {
            // Random agent activity
            const agents = FleetKit.data?.agents;
            if (agents?.length) {
                const agent = agents[Math.floor(Math.random() * agents.length)];
                const char = this.characterManager?.findCharacterByRole(agent?.role) ||
                             this.characterManager?.findCharacterByName(agent?.name);
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
                    window.simsOffice.simsEffects.showSimlishChat(a, b);
                }
            }
        }
    }

    // ── Status API ──────────────────────────────────────

    getMissionStatus() {
        if (!window.FleetKit?.data?.missions) return { active: 0, queued: 0 };
        const m = window.FleetKit.data.missions;
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
