// GameBoy Color State Bridge - SpawnKit Data Integration (Pokémon Universe Edition)
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
        this.syncWithSpawnKitData();
    }
    
    // ── Name helpers (graceful fallback) ──────────────────
    _resolveName(canonicalId, field) {
        if (window.SpawnKitNames) return SpawnKitNames.resolve('gameboy-color', canonicalId, field);
        return canonicalId;
    }
    _resolveObj(objectId) {
        if (window.SpawnKitNames) return SpawnKitNames.resolveObject('gameboy', objectId);
        return objectId;
    }
    _subAgentName(index) {
        if (window.SpawnKitNames) return SpawnKitNames.getSubAgentName('gameboy', index);
        return `Sub-Agent #${index + 1}`;
    }
    
    initializeDataHooks() {
        if (window.SpawnKit) {
            SpawnKit.on('mission:new', (data) => this.handleNewMission(data));
            SpawnKit.on('mission:progress', (data) => this.handleMissionProgress(data));
            SpawnKit.on('subagent:spawn', (data) => this.handleSubagentSpawn(data));
            SpawnKit.on('agent:status', (data) => this.handleAgentStatus(data));
            SpawnKit.on('cron:trigger', (data) => this.handleCronTrigger(data));
            SpawnKit.on('data:refresh', () => this.syncWithSpawnKitData());
            console.log('🎮 GameBoy Color State Bridge: SpawnKit event hooks initialized');
        }
    }
    
    syncWithSpawnKitData() {
        if (!window.SpawnKit?.data) {
            console.warn('🎮 GameBoy Color State Bridge: SpawnKit data not available');
            return;
        }
        
        const data = SpawnKit.data;
        this.updateAgentStatuses(data.agents);
        this.updateMissionBoard(data.missions);
        this.updateSubagents(data.subagents);
        this.lastDataSync = Date.now();
        console.log('🎮 GameBoy Color State Bridge: Synced with SpawnKit data');
    }
    
    updateAgentStatuses(agents) {
        (agents || []).forEach(agent => {
            if (!agent) return;
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
        
        (missions || []).forEach(mission => {
            if (mission?.status === 'in_progress' && Math.random() > 0.8) {
                this.triggerMissionActivity(mission);
            }
        });
    }
    
    updateSubagents(subagents) {
        this.displayedSubagents = subagents || [];
        (subagents || []).forEach(subagent => {
            if (subagent?.status === 'running' && !this.characterManager?.hasSubagent(subagent.id)) {
                this.spawnSubagentCharacter(subagent);
            }
        });
    }
    
    spawnSubagentCharacter(subagent) {
        if (!subagent) return;
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
        if (!window.SpawnKit?.data?.agents) return null;
        const agent = window.SpawnKit.data.agents.find(a => a?.id === agentId);
        return agent?.role || null;
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
                if (!mission) return;
                const progressPercent = Math.round((mission.progress || 0) * 100);
                const hpClass = progressPercent > 50 ? 'hp-green' : progressPercent > 25 ? 'hp-yellow' : progressPercent > 10 ? 'hp-orange' : 'hp-red';
                
                html += `
                    <div class="mission-item">
                        <div>${String(mission.title || 'UNKNOWN MISSION').toUpperCase()}</div>
                        <div style="font-size: 5px; margin: 2px 0;">${String(mission.priority || 'NORMAL').toUpperCase()}</div>
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
                if (!subagent) return;
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
        if (!mission?.assignedTo?.length) return;
        mission.assignedTo.forEach(agentId => {
            if (!agentId) return;
            const character = this.characterManager?.findCharacterByName(agentId) ||
                            (this.characterManager?.characters || []).find(c => (c?.role || '').toLowerCase().includes(String(agentId).toLowerCase()));
            if (character) {
                if (Math.random() > 0.5) {
                    character.setState('going_to_meeting');
                    character.showSpeechBubble(String(mission.title || 'MISSION').split(' ')[0] || 'MISSION');
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
            this.syncWithSpawnKitData();
        }
        
        if (this.eventTimer >= this.nextEvent) {
            this.triggerRandomEvent();
            this.eventTimer = 0;
            this.nextEvent = this.getRandomEventDelay();
        }
    }
    
    triggerRandomEvent() {
        if (!window.SpawnKit?.data) return;
        const data = window.SpawnKit.data;
        
        const now = Date.now();
        (data?.crons || []).forEach(cron => {
            if (cron?.status === 'active' && cron.nextRun && now >= cron.nextRun) {
                this.triggerCronAlarm(cron);
            }
        });
        
        if (Math.random() > 0.7) {
            const agents = data?.agents;
            if (!agents?.length) return;
            const randomAgent = agents[Math.floor(Math.random() * agents.length)];
            if (randomAgent) this.triggerAgentActivity(randomAgent);
        }
    }
    
    triggerCronAlarm(cron) {
        this.officeMap?.triggerPhoneRing();
        
        if (window.PokemonUI) {
            window.PokemonUI.systemMessage(`${this._resolveObj('phone')} is ringing!\n${cron?.name || 'ALARM'}`);
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
        if (!agent) return;
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
        this.syncWithSpawnKitData();
        
        if (window.PokemonUI) {
            window.PokemonUI.wildEncounterMission(data?.title || 'NEW QUEST');
        }
        
        this.triggerWhiteboardSession();
    }
    
    handleMissionProgress(data) {
        this.updateMissionBoardUI();
        if (data?.newProgress >= 1.0) {
            this.triggerCelebration();
        }
    }
    
    handleSubagentSpawn(data) {
        this.syncWithSpawnKitData();
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
        const missions = window.SpawnKit?.data?.missions || [];
        if (!missions.length) return { active: 0, queued: 0, activeMissions: [] };
        const activeMissions = missions.filter(m => m?.status === 'in_progress');
        return {
            active: activeMissions.length,
            queued: missions.filter(m => m?.status === 'pending').length,
            activeMissions: activeMissions.map(m => ({
                title: m?.title || 'UNKNOWN',
                progress: Math.round((m?.progress || 0) * 100),
                priority: m?.priority
            }))
        };
    }
    
    getAgentStatus() {
        const agents = window.SpawnKit?.data?.agents || [];
        if (!agents.length) return { activeAgents: 0, activities: {}, metrics: {} };
        const activities = {};
        agents.forEach(agent => {
            if (!agent) return;
            const pokeName = this._resolveName(agent.id || agent.name || 'unknown', 'title');
            activities[pokeName] = {
                status: String(agent.status || 'idle').toUpperCase(),
                task: agent.currentTask,
                lastSeen: agent.lastSeen
            };
        });
        return {
            activeAgents: agents.length,
            activities: activities,
            metrics: window.SpawnKit?.data?.metrics || {}
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
