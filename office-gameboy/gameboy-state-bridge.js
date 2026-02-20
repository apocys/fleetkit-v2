// GameBoy State Bridge - SpawnKit Data Integration (Pokémon Universe Edition)
// Uses SpawnKitNames for universe-consistent naming

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
        if (window.SpawnKitNames) return SpawnKitNames.resolve('gameboy', canonicalId, field);
        return canonicalId;
    }
    _resolveObj(objectId) {
        if (window.SpawnKitNames) return SpawnKitNames.resolveObject('gameboy', objectId);
        return objectId;
    }
    _subAgentName(index) {
        if (window.SpawnKitNames) return SpawnKitNames.getSubAgentName('gameboy', index);
        return `ROOKIE #${index + 1}`;
    }
    
    initializeDataHooks() {
        if (window.SpawnKit) {
            SpawnKit.on('mission:new', (data) => this.handleNewMission(data));
            SpawnKit.on('mission:progress', (data) => this.handleMissionProgress(data));
            SpawnKit.on('subagent:spawn', (data) => this.handleSubagentSpawn(data));
            SpawnKit.on('agent:status', (data) => this.handleAgentStatus(data));
            SpawnKit.on('cron:trigger', (data) => this.handleCronTrigger(data));
            SpawnKit.on('data:refresh', () => this.syncWithSpawnKitData());
            console.log('🎮 GameBoy State Bridge: SpawnKit event hooks initialized');
        }
    }
    
    syncWithSpawnKitData() {
        if (!window.SpawnKit?.data) {
            console.warn('🎮 GameBoy State Bridge: SpawnKit data not available');
            return;
        }
        
        const data = SpawnKit.data;
        this.updateAgentStatuses(data.agents || []);
        this.updateMissionBoard(data.missions || []);
        this.updateSubagents(data.subagents || []);
        
        // Update Agent OS names and model identities in character manager
        if (this.characterManager && typeof this.characterManager.updateAgentOSNames === 'function') {
            this.characterManager.updateAgentOSNames(data);
        }
        
        this.lastDataSync = Date.now();
        console.log('🎮 GameBoy State Bridge: Synced with SpawnKit data (Agent OS + Model Identity integrated)');
    }
    
    updateAgentStatuses(agents) {
        if (!agents || !this.characterManager) return;
        
        agents.forEach(agent => {
            if (!agent || !agent.role) return; // Skip malformed agents
            
            const character = this.characterManager.findCharacterByRole(agent.role) ||
                            this.characterManager.findCharacterByName(agent.name);
            
            if (character && typeof character.setState === 'function') {
                try {
                    const newState = this.mapAgentStatusToCharacterState(agent.status, agent.currentTask, agent);
                    character.setState(newState);
                    
                    // Show speech bubble with higher frequency for real tasks
                    if (agent.currentTask && Math.random() > 0.6) {
                        const bubbleText = this.formatTaskForSpeechBubble(agent.currentTask);
                        if (typeof character.showSpeechBubble === 'function') {
                            character.showSpeechBubble(bubbleText);
                        }
                    }
                    
                    // Highlight active agent with glow effect
                    if (agent.status === 'active' && character.sprite && typeof character.addActiveGlow === 'function') {
                        character.addActiveGlow();
                    }
                } catch (err) {
                    console.warn('🎮 Error updating agent status:', err);
                }
            }
        });
    }
    
    mapAgentStatusToCharacterState(status, task, agent) {
        const taskLower = (task || '').toLowerCase();
        const now = Date.now();
        
        // Check if agent has sub-agents running
        if (agent?.subagents && agent.subagents.length > 0) {
            return 'delegating';
        }
        
        // Check metrics for high activity
        if (agent?.metrics?.tokens > 1000) {
            return Math.random() > 0.5 ? 'grinding' : 'leveling_up';
        }
        
        // Check if agent has been idle for >5min
        if (agent?.lastSeen && (now - agent.lastSeen) > 300000) {
            return Math.random() > 0.5 ? 'getting_coffee' : 'wandering';
        }
        
        // Check for recent message activity (walking between rooms)
        if (agent?.recentMessages && agent.recentMessages.length > 5) {
            return 'going_to_meeting';
        }
        
        switch (status) {
            case 'active':
            case 'working':
            case 'building':
                if (taskLower.includes('meeting') || taskLower.includes('planning')) return 'going_to_meeting';
                if (taskLower.includes('audit') || taskLower.includes('review')) return 'searching_files';
                return 'working_at_desk';
            case 'creating':
            case 'monitoring':
                return 'working_at_desk';
            case 'idle':
                return agent?.lastSeen && (now - agent.lastSeen) > 180000 ? 'thinking' : 'working_at_desk';
            default:
                return 'working_at_desk';
        }
    }
    
    updateMissionBoard(missions) {
        this.displayedMissions = (missions || []).slice(0, 3);
        this.updateMissionBoardUI();
        
        (missions || []).forEach(mission => {
            if (mission.status === 'in_progress' && Math.random() > 0.8) {
                this.triggerMissionActivity(mission);
            }
        });
    }
    
    updateSubagents(subagents) {
        this.displayedSubagents = subagents;
        subagents.forEach(subagent => {
            if (subagent.status === 'running' && !this.characterManager.hasSubagent(subagent.id)) {
                this.spawnSubagentCharacter(subagent);
            }
        });
    }
    
    spawnSubagentCharacter(subagent) {
        const parentChar = this.characterManager.findCharacterByRole(this.getAgentRoleById(subagent.parentAgent));
        if (parentChar) {
            const stagiairePos = {
                x: parentChar.gridX + (Math.random() - 0.5) * 2,
                y: parentChar.gridY + (Math.random() - 0.5) * 2
            };
            this.characterManager.createStagiaire(subagent.id, subagent.name, stagiairePos);
        }
    }
    
    getAgentRoleById(agentId) {
        if (!window.SpawnKit?.data?.agents) return null;
        const agent = SpawnKit.data.agents.find(a => a.id === agentId);
        return agent ? agent.role : null;
    }
    
    formatTaskForSpeechBubble(task) {
        if (!task) return 'WORKING!';
        
        const taskLower = task.toLowerCase();
        
        // Specific task keyword mapping
        if (taskLower.includes('audit')) return 'AUDIT!';
        if (taskLower.includes('sentinel')) return 'AUDIT!';
        if (taskLower.includes('rebrand')) return 'DESIGN!';
        if (taskLower.includes('echo') || taskLower.includes('landing') || taskLower.includes('ios')) return 'DESIGN!';
        if (taskLower.includes('forge') || taskLower.includes('data') || taskLower.includes('bridge')) return 'CODING!';
        if (taskLower.includes('deploy') || taskLower.includes('release')) return 'DEPLOY!';
        if (taskLower.includes('test') || taskLower.includes('debug')) return 'DEBUG!';
        if (taskLower.includes('meeting') || taskLower.includes('discuss')) return 'MEETING!';
        if (taskLower.includes('research') || taskLower.includes('analyze')) return 'RESEARCH!';
        if (taskLower.includes('monitor') || taskLower.includes('watch')) return 'MONITOR!';
        
        // Extract first meaningful word and capitalize
        const words = task.toUpperCase().split(/[-_\s]+/).filter(word => 
            word.length > 2 && 
            !['THE', 'AND', 'FOR', 'WITH', 'FROM', 'TO', 'OF', 'IN', 'ON', 'AT', 'BY'].includes(word)
        );
        
        if (words.length > 0) {
            return words[0] + '!';
        }
        
        return 'WORKING!';
    }
    
    updateMissionBoardUI() {
        const missionPanel = document.getElementById('currentMissions');
        const missionTitle = document.getElementById('missionPanelTitle');
        if (!missionPanel) return;
        
        // Use Pokémon name for the quest board
        if (missionTitle) missionTitle.textContent = this._resolveObj('whiteboard');
        
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
            this.displayedMissions.filter(m => m != null).forEach(mission => {
                const progressPercent = Math.round((mission?.progress || 0) * 100);
                const hpClass = progressPercent > 50 ? 'hp-green' : progressPercent > 25 ? 'hp-yellow' : progressPercent > 10 ? 'hp-orange' : 'hp-red';
                
                html += `
                    <div class="mission-item">
                        <div>${(String(mission?.title || 'UNKNOWN MISSION')).toUpperCase()}</div>
                        <div style="font-size: 5px; margin: 2px 0;">${(String(mission?.priority || 'NORMAL')).toUpperCase()}</div>
                        <div class="hp-bar">
                            <div class="hp-fill ${hpClass}" style="width: ${progressPercent}%"></div>
                        </div>
                    </div>
                `;
            });
        }
        
        // Subagents section with Pokémon names
        if (this.displayedSubagents.length > 0) {
            html += '<div style="font-size: 6px; margin-top: 8px; color: #8BAC0F;">PARTY:</div>';
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
        mission.assignedTo.forEach(agentId => {
            const character = this.characterManager.findCharacterByName(agentId) ||
                            this.characterManager.characters.find(c => c.role.toLowerCase().includes(agentId));
            if (character) {
                if (Math.random() > 0.5) {
                    character.setState('going_to_meeting');
                    character.showSpeechBubble(mission.title.split(' ')[0]);
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
        this.officeMap.updateAnimations(deltaTime);
        
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
        const data = SpawnKit.data;
        
        const now = Date.now();
        
        // Check for cron events
        data.crons?.forEach(cron => {
            if (cron.status === 'active' && cron.nextRun && now >= cron.nextRun) {
                this.triggerCronAlarm(cron);
            }
        });
        
        // Dynamic agent room rotation based on real activity
        if (data.agents && Math.random() > 0.6) {
            const activeAgent = data.agents.find(a => a.status === 'active') || 
                              data.agents[Math.floor(Math.random() * data.agents.length)];
            
            if (activeAgent) {
                this.triggerAgentRoomRotation(activeAgent);
            }
        }
        
        // Check for sub-agent spawns/completions
        if (data.subagents && Math.random() > 0.8) {
            data.subagents.forEach(sub => {
                if (sub.status === 'spawning' && !this.characterManager.hasSubagent(sub.id)) {
                    this.handleWildRookieAppeared(sub);
                } else if (sub.status === 'completed') {
                    this.handleSubagentEvolution(sub);
                }
            });
        }
        
        // Show real task progress in speech bubbles
        if (data.missions && Math.random() > 0.7) {
            const activeMission = data.missions.find(m => m.status === 'in_progress');
            if (activeMission) {
                this.showMissionProgress(activeMission);
            }
        }
    }
    
    triggerCronAlarm(cron) {
        this.officeMap.triggerPhoneRing();
        
        // Use Pokémon object name for the phone
        if (window.PokemonUI) {
            window.PokemonUI.systemMessage(`${this._resolveObj('phone')} is ringing!\n${cron.name}`);
        }
        
        const ownerChar = this.characterManager.findCharacterByName(cron.owner);
        if (ownerChar) {
            const phonePos = this.officeMap.locations.phoneAlarm;
            ownerChar.moveTo(phonePos.x, phonePos.y);
            ownerChar.showSpeechBubble(this._resolveObj('phone'));
            setTimeout(() => ownerChar.setState('working_at_desk'), 3000);
        }
    }
    
    triggerAgentActivity(agent) {
        const character = this.characterManager.findCharacterByRole(agent.role) ||
                        this.characterManager.findCharacterByName(agent.name);
        if (character) {
            const activities = ['thinking', 'working_at_desk', 'searching_files'];
            character.setState(activities[Math.floor(Math.random() * activities.length)]);
            if (agent.currentTask) {
                character.showSpeechBubble(this.formatTaskForSpeechBubble(agent.currentTask));
            }
        }
    }
    
    triggerAgentRoomRotation(agent) {
        const character = this.characterManager.findCharacterByRole(agent.role) ||
                        this.characterManager.findCharacterByName(agent.name);
        
        if (character) {
            const rooms = ['desk', 'meeting', 'coffee', 'files'];
            const currentRoom = this.getCurrentRoom(character);
            const nextRoom = rooms[(rooms.indexOf(currentRoom) + 1) % rooms.length];
            
            switch (nextRoom) {
                case 'meeting':
                    character.setState('going_to_meeting');
                    character.showSpeechBubble('GYM BATTLE!');
                    break;
                case 'coffee':
                    character.setState('getting_coffee');
                    character.showSpeechBubble('POTION!');
                    break;
                case 'files':
                    character.setState('searching_files');
                    character.showSpeechBubble('PC STORAGE!');
                    break;
                default:
                    character.setState('working_at_desk');
                    if (agent.currentTask) {
                        character.showSpeechBubble(this.formatTaskForSpeechBubble(agent.currentTask));
                    }
            }
        }
    }
    
    getCurrentRoom(character) {
        const pos = { x: character.gridX, y: character.gridY };
        const locations = this.officeMap.locations;
        
        // Find closest location
        let closest = 'desk';
        let minDist = Infinity;
        
        Object.keys(locations).forEach(key => {
            const loc = locations[key];
            const dist = Math.sqrt((pos.x - loc.x) ** 2 + (pos.y - loc.y) ** 2);
            if (dist < minDist) {
                minDist = dist;
                if (key.includes('meeting')) closest = 'meeting';
                else if (key.includes('coffee')) closest = 'coffee';
                else if (key.includes('file')) closest = 'files';
                else closest = 'desk';
            }
        });
        
        return closest;
    }
    
    handleWildRookieAppeared(subagent) {
        if (window.PokemonUI) {
            const pokeName = this._subAgentName(this.characterManager?.subAgentCounter || 0);
            window.PokemonUI.wildEncounter(pokeName);
        }
        this.spawnSubagentCharacter(subagent);
        
        // Parent agent shows delegating bubble
        const parentChar = this.characterManager.findCharacterByRole(this.getAgentRoleById(subagent.parentAgent));
        if (parentChar) {
            parentChar.showSpeechBubble('DELEGATING!');
        }
    }
    
    handleSubagentEvolution(subagent) {
        const subChar = this.characterManager.subAgents.find(s => s.subagentId === subagent.id);
        if (subChar) {
            subChar.showSpeechBubble('EVOLVED!');
            
            // Celebration effect
            setTimeout(() => {
                this.characterManager.removeSubAgent(subChar);
                if (window.PokemonUI) {
                    window.PokemonUI.systemMessage(`${subChar.name} EVOLVED!\nTask completed!`);
                }
            }, 2000);
        }
    }
    
    showMissionProgress(mission) {
        const assignedAgents = mission.assignedTo || [];
        assignedAgents.forEach(agentId => {
            const character = this.characterManager.findCharacterByName(agentId) ||
                            this.characterManager.characters.find(c => c.role.toLowerCase().includes(agentId));
            
            if (character) {
                const progressPercent = Math.round((mission.progress || 0) * 100);
                if (progressPercent > 75) {
                    character.showSpeechBubble('LVL UP!');
                } else if (progressPercent > 50) {
                    character.showSpeechBubble('GRINDING!');
                } else {
                    character.showSpeechBubble(this.formatTaskForSpeechBubble(mission.title));
                }
            }
        });
    }
    
    // ── Event handlers ─────────────────────────────────
    handleNewMission(data) {
        console.log('🎯 New mission:', data);
        this.syncWithSpawnKitData();
        
        // Wild MISSION appeared!
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
        const shuffled = [...this.characterManager.characters].sort(() => Math.random() - 0.5);
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
        this.characterManager.triggerCelebration();
    }
    
    triggerWhiteboardSession() {
        const leadChar = this.characterManager.characters.find(c => c.canonicalId === 'hunter');
        const missionBoard = this.officeMap.locations.missionBoard;
        
        if (leadChar && missionBoard) {
            leadChar.moveTo(missionBoard.x, missionBoard.y);
            leadChar.showSpeechBubble(this._resolveObj('whiteboard'));
            
            this.characterManager.characters.forEach((char, index) => {
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
        if (!window.SpawnKit?.data?.missions) return { active: 0, queued: 0, activeMissions: [] };
        const missions = SpawnKit.data.missions;
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
        if (!window.SpawnKit?.data?.agents) return { activeAgents: 0, activities: {}, metrics: {} };
        const agents = SpawnKit.data.agents;
        const activities = {};
        agents.forEach(agent => {
            // Use Pokémon name in status
            const pokeName = this._resolveName(agent.id || agent.name, 'title');
            activities[pokeName] = {
                status: (agent.status || 'idle').toUpperCase(),
                task: agent.currentTask,
                lastSeen: agent.lastSeen
            };
        });
        return {
            activeAgents: agents.length,
            activities: activities,
            metrics: SpawnKit.data.metrics || {}
        };
    }
}

// ═══════════════════════════════════════════════════════════
// ██  Pokémon UI System — Typewriter, Wild Encounters, etc
// ═══════════════════════════════════════════════════════════

window.PokemonUI = {
    _typewriterTimer: null,
    
    /**
     * Pokémon-style typewriter system message (bottom text box)
     */
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
    
    /**
     * Wild MISSION appeared! — full screen flash
     */
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
    
    /**
     * A wild ROOKIE appeared! — sub-agent spawn
     */
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
    
    /**
     * "TRAINER used DEPLOY! It's super effective!"
     */
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
    ],
    delegating: [
        "DELEGATING!", "SUMMON!", "GO ROOKIE!", "DEPLOY!",
        "USE MINION!", "SEND OUT!", "ASSIST!", "BACKUP!"
    ],
    grinding: [
        "GRINDING!", "TRAINING!", "LVL UP!", "EXP BOOST!",
        "POWER UP!", "FOCUS!", "HUSTLE!", "OVERDRIVE!"
    ],
    wandering: [
        "EXPLORING!", "SEARCHING!", "PATROL!", "SCOUTING!",
        "ROAMING!", "QUEST!", "ADVENTURE!", "JOURNEY!"
    ],
    subagent: [
        "ROOKIE READY!", "REPORTING!", "YES SIR!", "ROGER!",
        "COPY THAT!", "EXECUTING!", "ON IT!", "WORKING!"
    ]
};

// Utility function to get random phrase for state
function getGameBoyPhrase(category) {
    const phrases = GAMEBOY_PHRASES[category] || GAMEBOY_PHRASES.working;
    return phrases[Math.floor(Math.random() * phrases.length)];
}

window.GameBoyStateBridge = GameBoyStateBridge;
window.GAMEBOY_PHRASES = GAMEBOY_PHRASES;
window.getGameBoyPhrase = getGameBoyPhrase;
