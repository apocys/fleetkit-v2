/**
 * Sims Characters — Isometric pixel characters with PLUMBOB
 * ═══════════════════════════════════════════════════════════
 * Each agent is a small isometric pixel character (≈20px) with
 * the iconic green rotating plumbob diamond floating above.
 *
 * Plumbob colors: green = active, yellow = idle, red = error/offline
 * Characters walk between furniture, sit at desks, chat, drink coffee.
 *
 * @author Echo (CMO) 💎
 */

// ── Name resolvers (graceful fallback) ─────────────────

function resolveSims(canonicalId, field) {
    if (window.SpawnKitNames) return SpawnKitNames.resolve('sims', canonicalId, field);
    const fb = { hunter: 'Hunter', forge: 'Forge', echo: 'Echo', atlas: 'Atlas', sentinel: 'Sentinel' };
    if (field === 'title') return (fb[canonicalId] || canonicalId);
    return fb[canonicalId] || canonicalId;
}

function resolveSimsObject(objectId) {
    if (window.SpawnKitNames) return SpawnKitNames.resolveObject('sims', objectId);
    return objectId;
}

function getSimsSubAgentName(index) {
    if (window.SpawnKitNames) return SpawnKitNames.getSubAgentName('sims', index);
    return `Intern #${index + 1}`;
}

// ── Plumbob helper ─────────────────────────────────────

class Plumbob {
    constructor() {
        this.container = new PIXI.Container();
        this.rotation = 0;
        this.bobOffset = 0;
        this.color = 0x00ff00; // iconic green
        this.targetColor = 0x00ff00;
        this.glow = null;
        this.diamond = null;
        this._build();
    }

    _build() {
        // Glow effect
        this.glow = new PIXI.Graphics();
        this.container.addChild(this.glow);

        // Diamond shape
        this.diamond = new PIXI.Graphics();
        this.container.addChild(this.diamond);

        this._redraw();
    }

    _redraw() {
        const d = this.diamond;
        d.clear();

        // Main diamond — two triangles (top & bottom half)
        const w = 5, h = 10;
        // Upper half (lighter shade)
        d.beginFill(this.color, 0.95);
        d.moveTo(0, -h);
        d.lineTo(w, 0);
        d.lineTo(0, 0);
        d.lineTo(-w, 0);
        d.closePath();
        d.endFill();

        // Lower half (slightly darker)
        const darkerColor = this._darken(this.color, 0.7);
        d.beginFill(darkerColor, 0.95);
        d.moveTo(0, 0);
        d.lineTo(w, 0);
        d.lineTo(0, h);
        d.lineTo(-w, 0);
        d.closePath();
        d.endFill();

        // Edge highlight
        d.lineStyle(1, 0xffffff, 0.3);
        d.moveTo(0, -h);
        d.lineTo(-w, 0);
        d.moveTo(0, -h);
        d.lineTo(w, 0);
        d.lineStyle(0);

        // Glow
        const g = this.glow;
        g.clear();
        g.beginFill(this.color, 0.15);
        g.drawCircle(0, 0, 12);
        g.endFill();
    }

    _darken(color, factor) {
        const r = ((color >> 16) & 0xff) * factor;
        const g = ((color >> 8) & 0xff) * factor;
        const b = (color & 0xff) * factor;
        return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
    }

    setColor(newColor) {
        if (this.color !== newColor) {
            this.color = newColor;
            this._redraw();
        }
    }

    update(dt) {
        this.rotation += dt * 0.002;
        this.bobOffset = Math.sin(this.rotation * 1.5) * 3;

        this.container.y = -32 + this.bobOffset;
        // Simulate 3D rotation by horizontal scaling
        this.diamond.scale.x = 0.6 + Math.abs(Math.sin(this.rotation)) * 0.4;

        // Glow pulsing
        this.glow.alpha = 0.1 + Math.abs(Math.sin(this.rotation * 0.8)) * 0.15;
    }
}

// ── Character class ────────────────────────────────────

class SimsCharacter {
    constructor(canonicalId, role, suitColor, homeDesk, officeMap, app) {
        this.canonicalId = canonicalId;
        this.name = resolveSims(canonicalId, 'name');
        this.title = resolveSims(canonicalId, 'title');
        this.role = role;
        this.suitColor = suitColor;
        this.homeDesk = homeDesk;
        this.officeMap = officeMap;
        this.app = app;

        // Position
        this.gridX = homeDesk.x;
        this.gridY = homeDesk.y;
        this.targetX = homeDesk.x;
        this.targetY = homeDesk.y;
        this.screenX = 0;
        this.screenY = 0;
        this.isMoving = false;
        this.moveSpeed = 0.025;

        // Animation
        this.walkCycle = 0;
        this.isWorking = false;
        this.workAnim = 0;
        this.celebBounce = 0;
        this.direction = 1; // 1 = right, -1 = left

        // State machine
        this.state = 'working_at_desk';
        this.stateTimer = 0;
        this.nextStateChange = 8000 + Math.random() * 12000;

        // Mood (maps to plumbob color)
        this.mood = 1.0; // 0 = terrible, 1 = great

        // Visual
        this.container = new PIXI.Container();
        this.sprite = null;
        this.nameLabel = null;
        this.plumbob = null;
        this.speechBubble = null;
        this.speechTimer = 0;

        this._buildVisuals();
    }

    _buildVisuals() {
        this._createCharacterSprite();
        this._createNameLabel();
        this._createPlumbob();
        this._updateScreenPos();
    }

    _createCharacterSprite() {
        const g = new PIXI.Graphics();

        // Skin color
        const skin = 0xffdbb5;
        const hair = 0x4a3520;

        // Shadow on ground
        g.beginFill(0x000000, 0.1);
        g.drawEllipse(0, 6, 8, 3);
        g.endFill();

        // Body (suit/outfit)
        g.beginFill(this.suitColor);
        g.drawRect(-6, -4, 12, 12);
        g.endFill();

        // Arms
        g.beginFill(this.suitColor);
        g.drawRect(-8, -2, 3, 8);
        g.drawRect(5, -2, 3, 8);
        g.endFill();

        // Legs
        g.beginFill(0x333344);
        g.drawRect(-4, 8, 3, 6);
        g.drawRect(1, 8, 3, 6);
        g.endFill();

        // Shoes
        g.beginFill(0x222222);
        g.drawRect(-5, 13, 4, 2);
        g.drawRect(1, 13, 4, 2);
        g.endFill();

        // Head
        g.beginFill(skin);
        g.drawRect(-5, -12, 10, 9);
        g.endFill();

        // Hair
        g.beginFill(hair);
        g.drawRect(-5, -14, 10, 4);
        g.drawRect(-6, -13, 2, 4);
        g.endFill();

        // Eyes
        g.beginFill(0x222222);
        g.drawRect(-3, -9, 2, 2);
        g.drawRect(1, -9, 2, 2);
        g.endFill();

        // Mouth
        g.beginFill(0xcc7755);
        g.drawRect(-1, -5, 3, 1);
        g.endFill();

        this.sprite = g;
        this.container.addChild(g);
    }

    _createNameLabel() {
        // Use Agent OS naming if available, fallback to title
        let displayName = this.title;
        
        // Check if this character has an associated subagent with Agent OS name
        if (this.agentOSName && window.AgentOSNaming) {
            displayName = window.AgentOSNaming.displayName(this.agentOSName, 'full');
        } else if (this.role && this.canonicalId) {
            // Try to construct full name for main agents (Parent.Role-01 format)
            const parentMap = { hunter: 'Hunter', forge: 'Forge', echo: 'Echo', atlas: 'Atlas', sentinel: 'Sentinel', main: 'Main' };
            const parent = parentMap[this.canonicalId] || this.canonicalId;
            const roleAbbrev = this.role === 'CTO' ? 'CodeBuilder' : this.role === 'CRO' ? 'Researcher' : this.role === 'CMO' ? 'ContentCreator' : this.role === 'COO' ? 'OpsRunner' : this.role === 'CEO' ? 'Coordinator' : 'TaskRunner';
            displayName = `${parent}.${roleAbbrev}-01`;
        }
        
        this.nameLabel = new PIXI.Text(displayName, {
            fontFamily: '"Trebuchet MS", "Lucida Sans", sans-serif',
            fontSize: 8,
            fill: 0x2a2a2a,
            stroke: 0xf0e0c0,
            strokeThickness: 2,
            align: 'center',
        });
        this.nameLabel.anchor.set(0.5, 1);
        this.nameLabel.y = -38;
        this.container.addChild(this.nameLabel);
    }

    _createPlumbob() {
        this.plumbob = new Plumbob();
        
        // Set plumbob color based on model identity
        if (this.model && window.ModelIdentity) {
            const modelIdentity = window.ModelIdentity.getIdentity(this.model);
            if (modelIdentity.color) {
                this.plumbob.setColor(parseInt(modelIdentity.color.replace('#', '0x'), 16));
            }
        }
        
        this.plumbob.container.y = -32;
        this.container.addChild(this.plumbob.container);
    }

    // ── State machine ──────────────────────────────────

    setState(newState) {
        this.state = newState;
        this.isWorking = false;

        switch (newState) {
            case 'working_at_desk':
                this.moveTo(this.homeDesk.x, this.homeDesk.y);
                this.isWorking = true;
                break;
            case 'going_to_meeting':
                const mp = this.officeMap?.getMeetingPositions() || [{ x: 6, y: 5 }];
                const spot = mp[Math.floor(Math.random() * mp.length)];
                this.moveTo(spot.x, spot.y);
                break;
            case 'getting_coffee':
                const cp = this.officeMap?.locations?.coffeeStation;
                if (cp) this.moveTo(cp.x, cp.y);
                break;
            case 'searching_files':
                const fp = this.officeMap?.locations?.fileCabinets;
                if (fp) this.moveTo(fp.x, fp.y);
                break;
            case 'checking_inbox':
                const mb = this.officeMap?.locations?.mailbox;
                if (mb) this.moveTo(mb.x, mb.y);
                break;
            case 'at_whiteboard':
                const wb = this.officeMap?.locations?.missionBoard;
                if (wb) this.moveTo(wb.x + (Math.random() - 0.5), wb.y + 1);
                break;
            case 'thinking':
                this.showSpeechBubble('...');
                break;
            case 'celebrating':
                this.celebBounce = 0;
                break;
            case 'chatting':
                // Pick a random spot near center
                this.moveTo(5 + Math.random() * 2, 4 + Math.random() * 2);
                break;
        }
    }

    changeState() {
        const weights = {
            working_at_desk: { going_to_meeting: 2, getting_coffee: 2, thinking: 2, chatting: 1, searching_files: 1, checking_inbox: 1, working_at_desk: 1 },
            going_to_meeting: { working_at_desk: 4, getting_coffee: 1 },
            getting_coffee:  { working_at_desk: 3, chatting: 2, thinking: 1 },
            searching_files: { working_at_desk: 4, thinking: 1 },
            checking_inbox:  { working_at_desk: 4, chatting: 1 },
            thinking:        { working_at_desk: 4, going_to_meeting: 1, getting_coffee: 1 },
            chatting:        { working_at_desk: 3, getting_coffee: 1 },
            celebrating:     { working_at_desk: 5 },
            at_whiteboard:   { working_at_desk: 3, going_to_meeting: 1 },
        };

        const w = weights[this.state] || { working_at_desk: 5, going_to_meeting: 1 };
        const pool = [];
        Object.keys(w).forEach(s => { for (let i = 0; i < w[s]; i++) pool.push(s); });
        this.setState(pool[Math.floor(Math.random() * pool.length)]);
    }

    // ── Movement ───────────────────────────────────────

    moveTo(tx, ty) {
        this.targetX = tx;
        this.targetY = ty;
        this.isMoving = true;
    }

    _updateScreenPos() {
        const sp = this.officeMap?.gridToScreen(this.gridX, this.gridY) || { x: 0, y: 0 };
        this.screenX = sp.x;
        this.screenY = sp.y;

        let walkBob = 0;
        if (this.isMoving) walkBob = Math.sin(this.walkCycle) * 2;

        let celebBob = 0;
        if (this.state === 'celebrating') celebBob = Math.abs(Math.sin(this.celebBounce)) * -8;

        let workBob = 0;
        if (this.isWorking) workBob = Math.sin(this.workAnim) * 0.8;

        this.container.x = this.screenX;
        this.container.y = this.screenY + walkBob + celebBob + workBob;

        // Depth sort (higher y = lower on screen = in front)
        this.container.zIndex = Math.round((this.gridX + this.gridY) * 100);
    }

    // ── Speech bubbles ────────────────────────────────

    showSpeechBubble(text) {
        this.hideSpeechBubble();

        const bc = new PIXI.Container();
        const tw = Math.max(50, text.length * 5 + 16);

        // Bubble background
        const bg = new PIXI.Graphics();
        bg.beginFill(0xffffff);
        bg.lineStyle(1, 0x888888);
        bg.drawRoundedRect(-tw / 2, -16, tw, 20, 6);
        bg.endFill();
        // Pointer triangle
        bg.beginFill(0xffffff);
        bg.lineStyle(1, 0x888888);
        bg.moveTo(-4, 4);
        bg.lineTo(0, 10);
        bg.lineTo(4, 4);
        bg.endFill();

        const label = new PIXI.Text(text, {
            fontFamily: '"Trebuchet MS", sans-serif',
            fontSize: 7,
            fill: 0x333333,
            align: 'center',
        });
        label.anchor.set(0.5, 0.5);
        label.y = -6;

        bc.addChild(bg);
        bc.addChild(label);
        bc.y = -44;

        this.speechBubble = bc;
        this.container.addChild(bc);
        this.speechTimer = 4000;
    }

    hideSpeechBubble() {
        if (this.speechBubble) {
            this.container.removeChild(this.speechBubble);
            this.speechBubble = null;
        }
    }

    // ── Update ─────────────────────────────────────────

    update(dt) {
        this.stateTimer += dt;

        // Animation timers
        if (this.isMoving) this.walkCycle += dt * 0.012;
        if (this.isWorking) this.workAnim += dt * 0.005;
        if (this.state === 'celebrating') this.celebBounce += dt * 0.015;

        // Movement
        if (this.isMoving) {
            const dx = this.targetX - this.gridX;
            const dy = this.targetY - this.gridY;

            if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) {
                this.gridX = this.targetX;
                this.gridY = this.targetY;
                this.isMoving = false;
                this.walkCycle = 0;
            } else {
                const speed = this.moveSpeed * dt * 0.01;
                this.gridX += dx * speed;
                this.gridY += dy * speed;
                // Direction for sprite flipping
                if (Math.abs(dx) > 0.01) this.direction = dx > 0 ? 1 : -1;
            }
        }

        // Speech bubble timeout
        if (this.speechBubble && this.speechTimer > 0) {
            this.speechTimer -= dt;
            if (this.speechTimer <= 0) this.hideSpeechBubble();
        }

        // State changes
        if (this.stateTimer >= this.nextStateChange) {
            this.changeState();
            this.stateTimer = 0;
            this.nextStateChange = 8000 + Math.random() * 14000;
        }

        // Plumbob update
        this._updatePlumbobColor();
        this.plumbob?.update(dt);

        // Sprite direction
        if (this.sprite) this.sprite.scale.x = this.direction;

        this._updateScreenPos();
    }

    _updatePlumbobColor() {
        // Map mood to color: 1.0 = green, 0.5 = yellow, 0.0 = red
        let color;
        if (this.mood > 0.6) color = 0x00ff00;
        else if (this.mood > 0.3) color = 0xcccc00;
        else color = 0xcc0000;

        // State-based override
        switch (this.state) {
            case 'working_at_desk':
            case 'at_whiteboard':
                color = 0x00ff00; break;
            case 'thinking':
            case 'chatting':
                color = 0x88ff00; break;
            case 'getting_coffee':
                color = 0xcccc00; break;
            case 'searching_files':
            case 'checking_inbox':
                color = 0x44ff44; break;
            case 'celebrating':
                color = 0x00ff88; break;
        }

        this.plumbob?.setColor(color);
    }
}

// ── Character Manager ──────────────────────────────────

class SimsCharacterManager {
    constructor(officeMap, app) {
        this.officeMap = officeMap;
        this.app = app;
        this.characters = [];
        this.subAgents = [];
        this.container = new PIXI.Container();
        this.container.sortableChildren = true;
        this.subAgentCounter = 0;

        this._createCharacters();
    }

    _createCharacters() {
        const defs = [
            { id: 'hunter',   role: 'CRO', color: 0xcc3333, desk: 'hunterDesk' },   // red tie
            { id: 'forge',    role: 'CTO', color: 0x222222, desk: 'forgeDesk' },     // black hoodie
            { id: 'echo',     role: 'CMO', color: 0x8833aa, desk: 'echoDesk' },      // purple
            { id: 'atlas',    role: 'COO', color: 0x338844, desk: 'atlasDesk' },     // green vest
            { id: 'sentinel', role: 'CCO', color: 0x777788, desk: 'sentinelDesk' },  // grey suit
        ];

        defs.forEach(d => {
            const deskLoc = this.officeMap?.locations?.[d.desk] || { x: 6, y: 5 };
            const char = new SimsCharacter(
                d.id, d.role, d.color,
                deskLoc,
                this.officeMap, this.app
            );
            this.characters.push(char);
            this.container.addChild(char.container);
        });
    }

    update(dt) {
        this.characters.forEach(c => c.update(dt));
        this.subAgents.forEach(s => s.update(dt));
    }

    spawnSubAgent(task) {
        const name = getSimsSubAgentName(this.subAgentCounter++);
        const sub = new SimsCharacter(
            'subagent', 'Intern', 0xaaaa88,
            { x: 6, y: 8 },
            this.officeMap, this.app
        );
        sub.name = name;
        sub.title = name;
        if (sub.nameLabel) sub.nameLabel.text = name;
        sub.container.scale.set(0.7);
        sub.showSpeechBubble(String(task || 'WORKING').toUpperCase());

        this.subAgents.push(sub);
        this.container.addChild(sub.container);
        return sub;
    }

    removeSubAgent(sub) {
        if (!sub) return;
        const i = this.subAgents.indexOf(sub);
        if (i > -1) {
            this.subAgents.splice(i, 1);
            if (sub.container) this.container.removeChild(sub.container);
        }
    }

    findCharacterByRole(role) {
        if (!role) return null;
        const roleStr = String(role).toLowerCase();
        return this.characters.find(c => {
            const charRole = (c?.role || '').toLowerCase();
            return charRole === roleStr || charRole.includes(roleStr);
        });
    }

    findCharacterByName(name) {
        if (!name) return null;
        const lower = String(name).toLowerCase();
        return this.characters.find(c => {
            const charName = (c?.name || '').toLowerCase();
            const charId = (c?.canonicalId || '').toLowerCase();
            return charId === lower || charName === lower || charName.includes(lower);
        });
    }

    hasSubagent(id) {
        return this.subAgents.some(s => s?.subagentId === id);
    }

    getCharacterStates() {
        return this.characters.map(c => `${c?.title || c?.canonicalId || 'UNKNOWN'}: ${c?.state || 'unknown'}`).join(', ');
    }

    triggerCelebration() {
        this.characters.forEach((c, i) => {
            setTimeout(() => c.setState('celebrating'), i * 200);
        });
    }

    createStagiaire(subagentId, name, position) {
        const pokeName = getSimsSubAgentName(this.subAgentCounter++);
        const stagiaire = new SimsCharacter(
            'subagent', 'Intern', 0xaaaa88,
            position, this.officeMap, this.app
        );
        stagiaire.subagentId = subagentId;
        stagiaire.name = pokeName;
        stagiaire.title = pokeName;
        if (stagiaire.nameLabel) stagiaire.nameLabel.text = pokeName;
        stagiaire.container.scale.set(0.7);
        this.subAgents.push(stagiaire);
        this.container.addChild(stagiaire.container);
        return stagiaire;
    }
    
    // ── Agent OS Integration Methods ───────────────────────────
    updateAgentOSNames(spawnKitData) {
        if (!spawnKitData || !window.AgentOSNaming) return;
        
        // Update subagents with Agent OS names
        if (spawnKitData.subagents) {
            spawnKitData.subagents.forEach(subagent => {
                const character = this.findCharacterByName(subagent.name) || 
                                this.findCharacterById(subagent.id);
                
                if (character && subagent.agentOSName) {
                    character.agentOSName = subagent.agentOSName;
                    character.model = subagent.model;
                    // Recreate name label with new Agent OS name
                    if (character.nameLabel) {
                        character.container.removeChild(character.nameLabel);
                        character._createNameLabel();
                    }
                    // Update plumbob color based on model identity
                    if (subagent.model && character.plumbob) {
                        const modelIdentity = window.ModelIdentity.getIdentity(subagent.model);
                        if (modelIdentity.color) {
                            character.plumbob.setColor(parseInt(modelIdentity.color.replace('#', '0x'), 16));
                        }
                    }
                }
            });
        }
        
        // Update main agents with model identities
        if (spawnKitData.agents) {
            spawnKitData.agents.forEach(agent => {
                const character = this.findCharacterByRole(agent.role) || 
                                this.findCharacterByName(agent.name);
                
                if (character && agent.model) {
                    character.model = agent.model;
                    // Recreate name label with Agent OS format
                    if (character.nameLabel) {
                        character.container.removeChild(character.nameLabel);
                        character._createNameLabel();
                    }
                    // Update plumbob color based on model identity
                    if (character.plumbob) {
                        const modelIdentity = window.ModelIdentity.getIdentity(agent.model);
                        if (modelIdentity.color) {
                            character.plumbob.setColor(parseInt(modelIdentity.color.replace('#', '0x'), 16));
                        }
                    }
                }
            });
        }
    }
    
    findCharacterById(id) {
        return this.characters.find(char => char.id === id) || 
               this.subAgents.find(sub => sub.subagentId === id);
    }
}

window.SimsCharacter = SimsCharacter;
window.SimsCharacterManager = SimsCharacterManager;
window.Plumbob = Plumbob;
