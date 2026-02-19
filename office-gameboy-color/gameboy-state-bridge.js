// GameBoy Color State Bridge - FleetKit Data Integration (Pokémon Universe Edition)
// Full color palette — uses GBC_CSS and GBC_PALETTE from gameboy-characters.js

class GameBoyStateBridge {
    constructor(characterManager, officeMap) {
        this.characterManager = characterManager;
        this.officeMap = officeMap;
        this.lastUpdate = Date.now();
        this.eventTimer = 0;
        this.nextEvent = this.getRandomEventDelay();
        
        // Data sync state
        this.lastDataSync = 0;
        this.syncInterval = 15000;
        
        // Mission display state
        this.displayedMissions = [];
        this.displayedSubagents = [];
        
        this.initializeDataHooks();
        this.syncWithFleetKitData();
    }
    
    // ── Name helpers (graceful fallback) ──────────────────
    _resolveName(canonicalId, field) {
        if (window.FleetKitNames) return FleetKitNames.resolve('gameboy-color', canonicalId, field);
        return canonicalId;
    }
    _resolveObj(objectId) {
        if (window.FleetKitNames) return FleetKitNames.resolveObject('gameboy', objectId);
        return objectId;
    }
    _subAgentName(index) {
        if (window.FleetKitNames) return FleetKitNames.getSubAgentName('gameboy', index);
        return `Sub-Agent #${index + 1}`;
    }
    
    initializeDataHooks() {
        if (window.FleetKit) {
            FleetKit.on('mission:new', (data) => this.handleNewMission(data));
            FleetKit.on('mission:progress', (data) => this.handleMissionProgress(data));
            FleetKit.on('subagent:spawn', (data) => this.handleSubagentSpawn(data));
            FleetKit.on('agent:status', (data) => this.handleAgentStatus(data));
            FleetKit.on('cron:trigger', (data) => this.handleCronTrigger(data));
            FleetKit.on('data:refresh', () => this.syncWithFleetKitData());
            console.log('🎮 GameBoy Color State Bridge: FleetKit event hooks initialized');
        }
    }
    
    syncWithFleetKitData() {
        if (!window.FleetKit?.data) {
            console.warn('🎮 GameBoy Color State Bridge: FleetKit data not available');
            return;
        }
        
        const data = FleetKit.data;
        this.updateAgentStatuses(data.agents);
        this.updateMissionBoard(data.missions);
        this.updateSubagents(data.subagents);
        this.lastDataSync = Date.now();
        console.log('🎮 GameBoy Color State Bridge: Synced with FleetKit data');
    }
    
    updateAgentStatuses(agents) {
        (agents || []).forEach(agent => {
            const character = this.characterManager?.findCharacterByRole(agent.role) ||
                            this.characterManager?.findCharacterByName(agent.name);
            
            if (character) {
                const newState = this.mapAgentStatusToCharacterState(agent.status, agent.currentTask);
                character.setState(newState);
                
                if (agent.currentTask && Math.random() > 0.7) {
                    const bubbleText = this.formatTaskForSpeechBubble(agent.currentTask);
                    character.showSpeechBubble(bubbleText);
                }
            }
        });
    }
    
    mapAgentStatusToCharacterState(status, task) {
        const taskLower = (task || '').toLowerCase();
        switch (status) {
            case 'active':
            case 'working':
            case 'building':
                if (taskLower.includes('meeting') || taskLower.includes('planning')) return 'going_to_meeting';
                return 'working_at_desk';
            case 'creating':
            case 'monitoring':
                return 'working_at_desk';
            case 'idle':
                return 'thinking';
            default:
                return 'working_at_desk';
        }
    }
    
    updateMissionBoard(missions) {
        this.displayedMissions = (missions || []).slice(0, 3);
        this.updateMissionBoardUI();
        
        missions.forEach(mission => {
            if (mission.status === 'in_progress' && Math.random() > 0.8) {
                this.triggerMissionActivity(mission);
            }
        });
    }
    
    updateSubagents(subagents) {
        this.displayedSubagents = subagents || [];
        (subagents || []).forEach(subagent => {
            if (subagent.status === 'running' && !this.characterManager?.hasSubagent(subagent.id)) {
                this.spawnSubagentCharacter(subagent);
            }
        });
    }
    
    spawnSubagentCharacter(subagent) {
        const parentChar = this.characterManager?.findCharacterByRole(this.getAgentRoleById(subagent.parentAgent));
        if (parentChar) {
            const stagiairePos = {
                x: parentChar.gridX + (Math.random() - 0.5) * 2,
                y: parentChar.gridY + (Math.random() - 0.5) * 2
            };
            this.characterManager?.createStagiaire(subagent.id, subagent.name, stagiairePos);
        }
    }
    
    getAgentRoleById(agentId) {
        if (!window.FleetKit?.data?.agents) return null;
        const agent = FleetKit.data.agents.find(a => a.id === agentId);
        return agent ? agent.role : null;
    }
    
    formatTaskForSpeechBubble(task) {
        const words = (task || 'WORKING').toUpperCase().split(' ');
        if (words.length <= 2) return words.join(' ');
        const keyWords = words.filter(word => 
            word.length > 3 && !['THE', 'AND', 'FOR', 'WITH', 'FROM'].includes(word)
        ).slice(0, 2);
        return keyWords.join(' ') || 'WORKING';
    }
    
    updateMissionBoardUI() {
        const missionPanel = document.getElementById('currentMissions');
        const missionTitle = document.getElementById('missionPanelTitle');
        if (!missionPanel) return;
        
        if (missionTitle) missionTitle.textContent = this._resolveObj('whiteboard');
        
        // Get CSS colors — use GBC_CSS if available, fallback to hardcoded
        const css = window.GBC_CSS || {
            lightest: '#E2C275',
            light: '#53868B',
            dark: '#16213E',
            darkest: '#1A1A2E',
            teal: '#53868B',
        };
        
        let html = '';
        
        if (this.displayedMissions.length === 0) {
            html = `
                <div class="mission-item">
                    <div>STATUS: READY</div>
                    <div class="hp-bar">
                        <div class="hp-fill hp-green" style="width: 0%"></div>
                    </div>
                </div>
            `;
        } else {
            this.displayedMissions.forEach(mission => {
                const progressPercent = Math.round((mission.progress || 0) * 100);
                const hpClass = progressPercent > 50 ? 'hp-green' : progressPercent > 25 ? 'hp-yellow' : progressPercent > 10 ? 'hp-orange' : 'hp-red';
                
                html += `
                    <div class="mission-item">
                        <div>${(mission.title || 'UNKNOWN MISSION').toUpperCase()}</div>
                        <div style="font-size: 5px; margin: 2px 0;">${mission.priority?.toUpperCase() || 'NORMAL'}</div>
                        <div class="hp-bar">
                            <div class="hp-fill ${hpClass}" style="width: ${progressPercent}%"></div>
                        </div>
                    </div>
                `;
            });
        }
        
        // Subagents section
        if (this.displayedSubagents.length > 0) {
            html += `<div style="font-size: 6px; margin-top: 8px; color: ${css.teal};">PARTY:</div>`;
            this.displayedSubagents.forEach((subagent, i) => {
                const pokeName = this._subAgentName(i);
                const progressPercent = Math.round((subagent.progress || 0) * 100);
                const hpClass = progressPercent > 50 ? 'hp-green' : progressPercent > 25 ? 'hp-yellow' : 'hp-orange';
                html += `
                    <div class="mission-item" style="font-size: 5px;">
                        <div>${(pokeName || 'ROOKIE').toUpperCase()}</div>
                        <div class="hp-bar" style="height: 3px;">
                            <div class="hp-fill ${hpClass}" style="width: ${progressPercent}%"></div>
                        </div>
                    </div>
                `;
            });
        }
        
        missionPanel.innerHTML = html;
    }
    
    triggerMissionActivity(mission) {
        if (!mission.assignedTo) return;
        (mission.assignedTo || []).forEach(agentId => {
            const character = this.characterManager?.findCharacterByName(agentId) ||
                            (this.characterManager?.characters || []).find(c => (c.role || '').toLowerCase().includes(agentId));
            if (character) {
                if (Math.random() > 0.5) {
                    character.setState('going_to_meeting');
                    character.showSpeechBubble((mission.title || 'MISSION').split(' ')[0]);
                } else {
                    character.setState('working_at_desk');
                }
            }
        });
    }
    
    getRandomEventDelay() {
        return 15000 + Math.random() * 20000;
    }
    
    update(deltaTime) {
        this.eventTimer += deltaTime;
        this.officeMap?.updateAnimations(deltaTime);
        
        if (Date.now() - this.lastDataSync >= this.syncInterval) {
            this.syncWithFleetKitData();
        }
        
        if (this.eventTimer >= this.nextEvent) {
            this.triggerRandomEvent();
            this.eventTimer = 0;
            this.nextEvent = this.getRandomEventDelay();
        }
    }
    
    triggerRandomEvent() {
        if (!window.FleetKit?.data) return;
        const data = FleetKit.data;
        
        const now = Date.now();
        data.crons?.forEach(cron => {
            if (cron.status === 'active' && cron.nextRun && now >= cron.nextRun) {
                this.triggerCronAlarm(cron);
            }
        });
        
        if (Math.random() > 0.7) {
            const randomAgent = data.agents?.[Math.floor(Math.random() * data.agents.length)];
            if (randomAgent) this.triggerAgentActivity(randomAgent);
        }
    }
    
    triggerCronAlarm(cron) {
        this.officeMap?.triggerPhoneRing();
        
        if (window.PokemonUI) {
            window.PokemonUI.systemMessage(`${this._resolveObj('phone')} is ringing!\n${cron.name}`);
        }
        
        const ownerChar = this.characterManager?.findCharacterByName(cron?.owner);
        if (ownerChar) {
            const phonePos = this.officeMap?.locations?.phoneAlarm;
            if (!phonePos) return;
            ownerChar.moveTo(phonePos.x, phonePos.y);
            ownerChar.showSpeechBubble(this._resolveObj('phone'));
            setTimeout(() => ownerChar.setState('working_at_desk'), 3000);
        }
    }
    
    triggerAgentActivity(agent) {
        const character = this.characterManager?.findCharacterByRole(agent.role) ||
                        this.characterManager?.findCharacterByName(agent.name);
        if (character) {
            const activities = ['thinking', 'working_at_desk', 'searching_files'];
            character.setState(activities[Math.floor(Math.random() * activities.length)]);
            if (agent.currentTask) {
                character.showSpeechBubble(this.formatTaskForSpeechBubble(agent.currentTask));
            }
        }
    }
    
    // ── Event handlers ─────────────────────────────────
    handleNewMission(data) {
        console.log('🎯 New mission:', data);
        this.syncWithFleetKitData();
        
        if (window.PokemonUI) {
            window.PokemonUI.wildEncounterMission(data.title || 'NEW QUEST');
        }
        
        this.triggerWhiteboardSession();
    }
    
    handleMissionProgress(data) {
        this.updateMissionBoardUI();
        if (data.newProgress >= 1.0) {
            this.triggerCelebration();
        }
    }
    
    handleSubagentSpawn(data) {
        this.syncWithFleetKitData();
    }
    
    handleAgentStatus(data) {
        this.updateAgentStatuses([data]);
    }
    
    handleCronTrigger(data) {
        this.triggerCronAlarm(data);
    }
    
    // ── Public API ─────────────────────────────────────
    triggerGroupMeeting() {
        const shuffled = [...(this.characterManager?.characters || [])].sort(() => Math.random() - 0.5);
        const participants = shuffled.slice(0, 2 + Math.floor(Math.random() * 3));
        participants.forEach((char, index) => {
            setTimeout(() => char.setState('going_to_meeting'), index * 300);
        });
        
        if (window.PokemonUI) {
            const names = participants.map(c => c.name).join(', ');
            window.PokemonUI.systemMessage(`${names}\njoined the GYM BATTLE!`);
        }
    }
    
    triggerCelebration() {
        this.characterManager?.triggerCelebration();
    }
    
    triggerWhiteboardSession() {
        const leadChar = (this.characterManager?.characters || []).find(c => c.canonicalId === 'hunter');
        const missionBoard = this.officeMap?.locations?.missionBoard;
        
        if (leadChar && missionBoard) {
            leadChar.moveTo(missionBoard.x, missionBoard.y);
            leadChar.showSpeechBubble(this._resolveObj('whiteboard'));
            
            (this.characterManager?.characters || []).forEach((char, index) => {
                if (char !== leadChar) {
                    setTimeout(() => {
                        char.moveTo(missionBoard.x - 1 + index * 0.5, missionBoard.y + 1);
                        char.showSpeechBubble("YES SIR!");
                    }, (index + 1) * 800);
                }
            });
        }
    }
    
    getMissionStatus() {
        if (!window.FleetKit?.data?.missions) return { active: 0, queued: 0, activeMissions: [] };
        const missions = FleetKit.data.missions;
        const activeMissions = missions.filter(m => m.status === 'in_progress');
        return {
            active: activeMissions.length,
            queued: missions.filter(m => m.status === 'pending').length,
            activeMissions: activeMissions.map(m => ({
                title: m.title,
                progress: Math.round((m.progress || 0) * 100),
                priority: m.priority
            }))
        };
    }
    
    getAgentStatus() {
        if (!window.FleetKit?.data?.agents) return { activeAgents: 0, activities: {}, metrics: {} };
        const agents = FleetKit.data.agents;
        const activities = {};
        agents.forEach(agent => {
            const pokeName = this._resolveName(agent.id || agent.name || 'unknown', 'title');
            activities[pokeName] = {
                status: (agent.status || 'idle').toUpperCase(),
                task: agent.currentTask,
                lastSeen: agent.lastSeen
            };
        });
        return {
            activeAgents: agents.length,
            activities: activities,
            metrics: FleetKit.data.metrics || {}
        };
    }
}

// ═══════════════════════════════════════════════════════════
// ██  Pokémon UI System — Typewriter, Wild Encounters, etc
// ═══════════════════════════════════════════════════════════

window.PokemonUI = {
    _typewriterTimer: null,
    
    systemMessage(text, speed) {
        const el = document.getElementById('pokeText');
        if (!el) return;
        
        if (this._typewriterTimer) clearInterval(this._typewriterTimer);
        el.textContent = '';
        
        let i = 0;
        const chars = String(text);
        const spd = speed || 35;
        
        this._typewriterTimer = setInterval(() => {
            if (i < chars.length) {
                el.textContent += chars[i];
                i++;
            } else {
                clearInterval(this._typewriterTimer);
                this._typewriterTimer = null;
            }
        }, spd);
    },
    
    wildEncounterMission(missionTitle) {
        const el = document.getElementById('wildEncounter');
        if (!el) return;
        
        el.textContent = '';
        el.classList.add('show');
        
        setTimeout(() => {
            el.innerHTML = `Wild MISSION appeared!<br><br>${(missionTitle || 'QUEST').toUpperCase()}`;
        }, 400);
        
        setTimeout(() => {
            el.classList.remove('show');
            this.systemMessage(`Wild MISSION appeared!\n${(missionTitle || 'QUEST').toUpperCase()}`);
        }, 2500);
    },
    
    wildEncounter(name) {
        const el = document.getElementById('wildEncounter');
        if (!el) return;
        
        el.textContent = '';
        el.classList.add('show');
        
        setTimeout(() => {
            el.innerHTML = `A wild ${(name || 'ROOKIE').toUpperCase()}<br>appeared!`;
        }, 400);
        
        setTimeout(() => {
            el.classList.remove('show');
            this.systemMessage(`A wild ${(name || 'ROOKIE').toUpperCase()} appeared!`);
        }, 2000);
    },
    
    superEffective(trainerName, moveName) {
        const msg = `${trainerName} used ${moveName}!\nIt's super effective!`;
        this.systemMessage(msg);
    }
};

// Pokémon-style phrases for speech bubbles
const GAMEBOY_PHRASES = {
    meeting: [
        "GYM BATTLE!", "LET'S GO!", "READY!", "TACTICS!", 
        "USE FOCUS!", "STRATEGIZE!", "PLAN!", "ATTACK!"
    ],
    working: [
        "CODING...", "LVL UP!", "EVOLVING!", "TRAINING!", 
        "GRINDING!", "DEBUGGING!", "RARE CANDY!", "EXP SHARE!"
    ],
    coffee: [
        "POTION!", "FULL RESTORE", "ELIXIR!", "HEAL!", 
        "ETHER!", "REVIVE!", "MAX POTION!", "LEMONADE!"
    ],
    celebrating: [
        "CRITICAL HIT!", "SUPER EFFECTIVE!", "KO!", "VICTORY!", 
        "LVL UP!", "EVOLVED!", "EXCELLENT!", "CHAMPION!"
    ],
    files: [
        "PC STORAGE...", "WITHDRAW!", "DEPOSIT!", "POKÉDEX!",
        "ARCHIVE!", "ORGANIZE!", "BACKUP!", "PC BOX!"
    ],
    mission: [
        "QUEST START!", "COPY THAT!", "ROGER!", "MISSION GO!",
        "BATTLE BEGIN!", "CHALLENGE!", "QUEST LOG!", "VICTORY!"
    ]
};

window.GameBoyStateBridge = GameBoyStateBridge;
window.GAMEBOY_PHRASES = GAMEBOY_PHRASES;
