// GameBoy Color Characters - Pokémon-universe AI agents for the virtual office
// Full color edition — each agent has a DISTINCT color!
// Wired to SpawnKitNames for universe-consistent naming

/**
 * Graceful name resolver — falls back to canonical names if SpawnKitNames unavailable
 */
function resolveGB(canonicalId, field) {
    if (window.SpawnKitNames) {
        return SpawnKitNames.resolve('gameboy-color', canonicalId, field);
    }
    // Graceful fallback
    const fallback = { hunter: 'Hunter', forge: 'Forge', echo: 'Echo', atlas: 'Atlas', sentinel: 'Sentinel' };
    if (field === 'title') return String(fallback[canonicalId] || canonicalId || 'AGENT').toUpperCase();
    return fallback[canonicalId] || canonicalId;
}

function resolveGBObject(objectId) {
    if (window.SpawnKitNames) return SpawnKitNames.resolveObject('gameboy', objectId);
    return objectId;
}

function getGBSubAgentName(index) {
    if (window.SpawnKitNames) return SpawnKitNames.getSubAgentName('gameboy', index);
    return `Sub-Agent #${index + 1}`;
}

// ── GBC Color Palette ────────────────────────────────────────────
const GBC_PALETTE = {
    // Base UI colors
    lightest: 0xE2C275,   // Warm gold (text, highlights)
    light:    0x53868B,   // Teal (UI borders)
    dark:     0x16213E,   // Dark blue (panels)
    darkest:  0x1A1A2E,   // Deep navy (background)
    
    // Agent-specific colors
    ceo_gold:     0xD4A853,  // CEO/Hunter — warm gold
    cto_blue:     0x4A90D9,  // CTO/Forge — bright blue
    cro_red:      0xC0392B,  // CRO-like — warm red
    cmo_purple:   0x9B59B6,  // CMO/Echo — rich purple
    coo_teal:     0x53868B,  // COO/Atlas — teal
    cco_silver:   0xA0A0B0,  // CCO/Sentinel — silver
    
    // Accent colors
    green:    0x5CB85C,
    amber:    0xCC7A30,
    cream:    0xF5E6C8,
    navy:     0x0F3460,
};

// CSS versions for DOM elements
const GBC_CSS = {
    lightest: '#E2C275',
    light:    '#53868B',
    dark:     '#16213E',
    darkest:  '#1A1A2E',
    gold:     '#D4A853',
    blue:     '#4A90D9',
    red:      '#C0392B',
    purple:   '#9B59B6',
    teal:     '#53868B',
    silver:   '#A0A0B0',
    green:    '#5CB85C',
};

class GameBoyCharacter {
    constructor(canonicalId, role, emoji, color, homeDesk, officeMap) {
        this.canonicalId = canonicalId;
        // Resolve Pokémon names from SpawnKitNames
        this.name = resolveGB(canonicalId, 'name');
        this.title = resolveGB(canonicalId, 'title');
        this.role = role;
        this.emoji = emoji;
        this.color = color;
        this.homeDesk = homeDesk;
        this.officeMap = officeMap;
        
        // GameBoy Color palette
        this.colors = {
            lightest: GBC_PALETTE.lightest,
            light:    GBC_PALETTE.light,
            dark:     GBC_PALETTE.dark,
            darkest:  GBC_PALETTE.darkest
        };
        
        // Position and movement
        this.gridX = homeDesk.x;
        this.gridY = homeDesk.y;
        this.targetX = homeDesk.x;
        this.targetY = homeDesk.y;
        this.screenX = 0;
        this.screenY = 0;
        this.isMoving = false;
        this.moveSpeed = 0.03;
        
        // Animation states
        this.walkCycle = 0;
        this.isWorking = false;
        this.workingAnimation = 0;
        this.celebrationBounce = 0;
        
        // State machine
        this.state = 'working_at_desk';
        this.stateTimer = 0;
        this.nextStateChange = this.getRandomStateDelay();
        
        // Visual elements
        this.container = new PIXI.Container();
        this.sprite = null;
        this.nameLabel = null;
        this.speechBubble = null;
        this.speechTimer = 0;
        this.progressBar = null;
        
        // Document carrying (for sub-agents)
        this.carryingDocument = false;
        this.documentSprite = null;
        
        this.createVisuals();
    }
    
    createVisuals() {
        this.createGameBoySprite();
        this.createNameLabel();
        this.updateScreenPosition();
    }
    
    createGameBoySprite() {
        if (window.SpawnKitSprites && this.canUsePixelSprites()) {
            this.createPixelSprite();
        } else {
            this.createGraphicsSprite();
        }
    }
    
    canUsePixelSprites() {
        const spriteId = this.getSpriteCharacterId();
        return spriteId && window.SpawnKitSprites.characters[spriteId];
    }
    
    getSpriteCharacterId() {
        // Map canonical IDs to sprite IDs
        const spriteMap = {
            'hunter': 'hunter',
            'forge': 'forge', 
            'echo': 'echo',
            'atlas': 'atlas',
            'sentinel': 'sentinel'
        };
        return spriteMap[this.canonicalId] || null;
    }
    
    createPixelSprite() {
        const canvas = document.createElement('canvas');
        const spriteSize = 16;
        const pixelSize = 2;
        canvas.width = spriteSize * pixelSize;
        canvas.height = spriteSize * pixelSize;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const spriteId = this.getSpriteCharacterId();
        const frameName = this.getFrameNameForState();
        SpawnKitSprites.renderFrame(ctx, spriteId, frameName, 0, 0, pixelSize);
        this.applyGBCTint(ctx, canvas.width, canvas.height);
        const texture = PIXI.Texture.from(canvas);
        this.sprite = new PIXI.Sprite(texture);
        this.sprite.anchor.set(0.5, 0.5);
        this.spriteCanvas = canvas;
        this.spriteContext = ctx;
        this.currentFrame = frameName;
        this.container.addChild(this.sprite);
    }
    
    createGraphicsSprite() {
        const graphics = new PIXI.Graphics();
        // Outline in deep navy
        graphics.lineStyle(2, GBC_PALETTE.darkest, 1);
        // Fill with the character's DISTINCT color
        graphics.beginFill(this.color);
        graphics.drawRect(-10, -10, 20, 20);
        graphics.endFill();
        // Eyes — dark navy
        graphics.beginFill(GBC_PALETTE.darkest);
        graphics.drawRect(-6, -6, 2, 2);
        graphics.drawRect(4, -6, 2, 2);
        // Mouth
        graphics.drawRect(-2, 2, 4, 1);
        graphics.endFill();
        // Highlight pixel (top-left corner, lighter shade)
        graphics.beginFill(GBC_PALETTE.lightest, 0.3);
        graphics.drawRect(-9, -9, 3, 3);
        graphics.endFill();
        this.sprite = graphics;
        this.container.addChild(this.sprite);
    }
    
    getFrameNameForState() {
        switch (this.state) {
            case 'working_at_desk':
                return this.isWorking ? 'working_1' : 'idle_1';
            case 'going_to_meeting':
            case 'getting_coffee':
            case 'searching_files':
                return this.isMoving ? 'walk_right_1' : 'idle_1';
            case 'celebrating':
                return 'celebrating_1';
            case 'thinking':
            default:
                return 'idle_1';
        }
    }
    
    /**
     * GBC tint — maps grayscale values to the character's own color 
     * instead of the old monochrome green. Uses the character's color
     * for midtones, gold for highlights, navy for shadows.
     */
    applyGBCTint(ctx, width, height) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // Decompose the character's color into RGB
        const charR = (this.color >> 16) & 0xFF;
        const charG = (this.color >> 8) & 0xFF;
        const charB = this.color & 0xFF;
        
        for (let i = 0; i < data.length; i += 4) {
            const a = data[i + 3];
            if (a > 0) {
                const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
                if (gray > 200) {
                    // Lightest → warm gold highlight
                    data[i] = 0xE2; data[i+1] = 0xC2; data[i+2] = 0x75;
                } else if (gray > 150) {
                    // Light → character's own color (bright)
                    data[i] = charR; data[i+1] = charG; data[i+2] = charB;
                } else if (gray > 100) {
                    // Dark → character color darkened
                    data[i] = Math.floor(charR * 0.5);
                    data[i+1] = Math.floor(charG * 0.5);
                    data[i+2] = Math.floor(charB * 0.5);
                } else {
                    // Darkest → deep navy
                    data[i] = 0x1A; data[i+1] = 0x1A; data[i+2] = 0x2E;
                }
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }
    
    updateSpriteFrame() {
        if (this.spriteCanvas && this.spriteContext && window.SpawnKitSprites) {
            const newFrame = this.getFrameNameForState();
            if (newFrame !== this.currentFrame) {
                this.spriteContext.clearRect(0, 0, this.spriteCanvas.width, this.spriteCanvas.height);
                const spriteId = this.getSpriteCharacterId();
                SpawnKitSprites.renderFrame(this.spriteContext, spriteId, newFrame, 0, 0, 2);
                this.applyGBCTint(this.spriteContext, this.spriteCanvas.width, this.spriteCanvas.height);
                this.sprite.texture.update();
                this.currentFrame = newFrame;
            }
        }
    }
    
    createNameLabel() {
        // Show Pokémon-style title — gold text on dark background
        this.nameLabel = new PIXI.Text(this.title, {
            fontFamily: 'Press Start 2P, Monaco, monospace',
            fontSize: 5,
            fill: GBC_PALETTE.lightest,
            stroke: GBC_PALETTE.darkest,
            strokeThickness: 1
        });
        this.nameLabel.anchor.set(0.5, 1);
        this.nameLabel.y = -16;
        this.container.addChild(this.nameLabel);
    }
    
    getRandomStateDelay() {
        return 8000 + Math.random() * 12000;
    }
    
    updateScreenPosition() {
        const screenPos = this.officeMap?.gridToScreen(this.gridX, this.gridY);
        if (!screenPos) return;
        this.screenX = screenPos.x;
        this.screenY = screenPos.y;
        
        let walkOffsetY = 0;
        if (this.isMoving) walkOffsetY = Math.sin(this.walkCycle) * 2;
        
        let bounceOffsetY = 0;
        if (this.state === 'celebrating') bounceOffsetY = Math.abs(Math.sin(this.celebrationBounce)) * -6;
        
        let workOffsetY = 0;
        if (this.isWorking) workOffsetY = Math.sin(this.workingAnimation) * 1;
        
        this.container.x = this.screenX;
        this.container.y = this.screenY + walkOffsetY + bounceOffsetY + workOffsetY;
    }
    
    moveTo(targetX, targetY) {
        this.targetX = targetX;
        this.targetY = targetY;
        this.isMoving = true;
        this.hideProgressBar();
    }
    
    update(deltaTime) {
        this.stateTimer += deltaTime;
        
        if (this.isMoving) this.walkCycle += deltaTime * 0.01;
        if (this.isWorking) this.workingAnimation += deltaTime * 0.005;
        if (this.state === 'celebrating') this.celebrationBounce += deltaTime * 0.02;
        
        if (this.isMoving) {
            const dx = this.targetX - this.gridX;
            const dy = this.targetY - this.gridY;
            if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) {
                this.gridX = this.targetX;
                this.gridY = this.targetY;
                this.isMoving = false;
                this.walkCycle = 0;
            } else {
                this.gridX += dx * this.moveSpeed * deltaTime * 0.01;
                this.gridY += dy * this.moveSpeed * deltaTime * 0.01;
            }
            this.updateScreenPosition();
        }
        
        if (this.speechBubble && this.speechTimer > 0) {
            this.speechTimer -= deltaTime;
            if (this.speechTimer <= 0) this.hideSpeechBubble();
        }
        
        if (this.stateTimer >= this.nextStateChange) {
            this.changeState();
            this.stateTimer = 0;
            this.nextStateChange = this.getRandomStateDelay();
        }
        
        this.updateScreenPosition();
        this.updateSpriteFrame();
    }
    
    changeState() {
        let weights = {};
        switch (this.state) {
            case 'working_at_desk':
                weights = { going_to_meeting: 2, getting_coffee: 2, thinking: 2, celebrating: 1, searching_files: 1, working_at_desk: 1 };
                break;
            case 'going_to_meeting':
                weights = { in_meeting: 5, working_at_desk: 1 };
                break;
            case 'in_meeting':
                weights = { working_at_desk: 4, getting_coffee: 1 };
                break;
            case 'getting_coffee':
                weights = { working_at_desk: 3, thinking: 1, celebrating: 1 };
                break;
            case 'searching_files':
                weights = { working_at_desk: 4, thinking: 1 };
                break;
            default:
                weights = { working_at_desk: 5, going_to_meeting: 1, getting_coffee: 1 };
        }
        
        const weightedStates = [];
        Object.keys(weights).forEach(state => {
            for (let i = 0; i < weights[state]; i++) weightedStates.push(state);
        });
        this.setState(weightedStates[Math.floor(Math.random() * weightedStates.length)]);
    }
    
    setState(newState) {
        this.state = newState;
        this.isWorking = false;
        this.hideProgressBar();
        this.updateSpriteFrame();
        
        switch (newState) {
            case 'working_at_desk':
                this.goToDesk();
                this.isWorking = true;
                this.showProgressBar();
                break;
            case 'going_to_meeting':
                this.goToMeeting();
                break;
            case 'in_meeting':
                this.isWorking = true;
                this.showSpeechBubble("MEETING");
                break;
            case 'getting_coffee':
                this.goToCoffee();
                break;
            case 'celebrating':
                this.celebrate();
                break;
            case 'thinking':
                this.showSpeechBubble("...");
                break;
            case 'searching_files':
                this.searchFiles();
                break;
        }
    }
    
    goToDesk() {
        this.moveTo(this.homeDesk.x, this.homeDesk.y);
        this.showSpeechBubble("CODING");
    }
    
    goToMeeting() {
        const meetingPos = this.officeMap?.locations?.meetingRoom;
        if (!meetingPos) return;
        const ox = Math.random() * 2 - 1;
        const oy = Math.random() * 2 - 1;
        this.moveTo(meetingPos.x + ox, meetingPos.y + oy);
        this.showSpeechBubble("GYM BATTLE");
    }
    
    goToCoffee() {
        const coffeePos = this.officeMap?.locations?.coffeeStation;
        if (!coffeePos) return;
        this.moveTo(coffeePos.x, coffeePos.y);
        // Use Pokémon object name
        this.showSpeechBubble(resolveGBObject('coffee'));
    }
    
    searchFiles() {
        const filesPos = this.officeMap?.locations?.fileCabinets;
        if (!filesPos) return;
        this.moveTo(filesPos.x, filesPos.y);
        this.showSpeechBubble(resolveGBObject('cabinet'));
    }
    
    celebrate() {
        this.showSpeechBubble("IT'S SUPER\nEFFECTIVE!");
        this.celebrationBounce = 0;
    }
    
    showSpeechBubble(text) {
        this.hideSpeechBubble();
        
        const bubbleContainer = new PIXI.Container();
        
        // GBC-style dialog box — cream background, dark navy text
        const bubble = new PIXI.Graphics();
        const tw = Math.max(44, text.length * 4 + 12);
        bubble.lineStyle(2, GBC_PALETTE.darkest, 1);
        bubble.beginFill(GBC_PALETTE.cream);
        bubble.drawRect(-tw/2, -14, tw, 22);
        bubble.endFill();
        
        // Pointer
        bubble.beginFill(GBC_PALETTE.cream);
        bubble.drawPolygon([-4, 8, 0, 12, 4, 8]);
        bubble.endFill();
        bubble.lineStyle(2, GBC_PALETTE.darkest, 1);
        bubble.drawPolygon([-4, 8, 0, 12, 4, 8]);
        
        const bubbleText = new PIXI.Text(text, {
            fontFamily: 'Press Start 2P, Monaco, monospace',
            fontSize: 5,
            fill: GBC_PALETTE.darkest,
            align: 'center'
        });
        bubbleText.anchor.set(0.5, 0.5);
        bubbleText.y = -3;
        
        // Pokémon scroll indicator ▼
        const scrollIndicator = new PIXI.Text('▼', {
            fontFamily: 'Press Start 2P, Monaco, monospace',
            fontSize: 4,
            fill: GBC_PALETTE.darkest
        });
        scrollIndicator.anchor.set(0.5, 0.5);
        scrollIndicator.x = tw/2 - 6;
        scrollIndicator.y = 4;
        
        bubbleContainer.addChild(bubble);
        bubbleContainer.addChild(bubbleText);
        bubbleContainer.addChild(scrollIndicator);
        bubbleContainer.y = -30;
        
        this.speechBubble = bubbleContainer;
        this.container.addChild(this.speechBubble);
        this.speechTimer = 4000;
    }
    
    hideSpeechBubble() {
        if (this.speechBubble) {
            this.container.removeChild(this.speechBubble);
            this.speechBubble = null;
        }
    }
    
    showProgressBar() {
        if (this.progressBar) return;
        
        const barContainer = new PIXI.Container();
        
        // HP label in gold
        const hpLabel = new PIXI.Text('HP', {
            fontFamily: 'Press Start 2P, Monaco, monospace',
            fontSize: 4,
            fill: GBC_PALETTE.lightest
        });
        hpLabel.x = -22;
        hpLabel.y = -3;
        
        // Background — dark navy
        const barBg = new PIXI.Graphics();
        barBg.lineStyle(1, GBC_PALETTE.darkest, 1);
        barBg.beginFill(GBC_PALETTE.darkest);
        barBg.drawRect(-15, -2, 30, 4);
        barBg.endFill();
        
        // Progress fill
        const barFill = new PIXI.Graphics();
        
        barContainer.addChild(hpLabel);
        barContainer.addChild(barBg);
        barContainer.addChild(barFill);
        barContainer.y = 16;
        
        this.progressBar = { container: barContainer, fill: barFill, progress: 0 };
        this.container.addChild(barContainer);
        this.animateProgress();
    }
    
    hideProgressBar() {
        if (this.progressBar) {
            this.container.removeChild(this.progressBar.container);
            this.progressBar = null;
        }
    }
    
    animateProgress() {
        if (!this.progressBar || this.state !== 'working_at_desk') return;
        
        const targetProgress = Math.min(this.progressBar.progress + 0.02, 1.0);
        this.progressBar.progress = targetProgress;
        
        // GBC HP bar: green → gold → amber → red
        let fillColor;
        if (targetProgress > 0.5) fillColor = GBC_PALETTE.green;          // green
        else if (targetProgress > 0.25) fillColor = GBC_PALETTE.lightest;  // gold
        else if (targetProgress > 0.1) fillColor = GBC_PALETTE.amber;     // amber
        else fillColor = GBC_PALETTE.cro_red;                              // red
        
        this.progressBar.fill.clear();
        this.progressBar.fill.beginFill(fillColor);
        this.progressBar.fill.drawRect(-15, -2, 30 * targetProgress, 4);
        this.progressBar.fill.endFill();
        
        if (targetProgress < 1.0) {
            setTimeout(() => this.animateProgress(), 100);
        }
    }
    
    carryDocument(documentType = 'FILE') {
        this.carryingDocument = true;
        if (this.documentSprite) this.container.removeChild(this.documentSprite);
        
        const doc = new PIXI.Graphics();
        doc.lineStyle(1, GBC_PALETTE.darkest, 1);
        doc.beginFill(GBC_PALETTE.cream);
        doc.drawRect(-3, -4, 6, 8);
        doc.endFill();
        doc.x = 8;
        doc.y = -8;
        
        this.documentSprite = doc;
        this.container.addChild(doc);
    }
    
    dropDocument() {
        this.carryingDocument = false;
        if (this.documentSprite) {
            this.container.removeChild(this.documentSprite);
            this.documentSprite = null;
        }
    }
}

class GameBoyCharacterManager {
    constructor(officeMap) {
        this.officeMap = officeMap;
        this.characters = [];
        this.subAgents = [];
        this.container = new PIXI.Container();
        this.subAgentCounter = 0;
        
        this.createCharacters();
    }
    
    createCharacters() {
        // GBC Edition: Each agent has a DISTINCT color!
        // CEO=gold, CTO=blue, CMO=purple, COO=teal, CCO=silver
        const characterData = [
            { id: 'hunter',   desk: 'hunterDesk',   color: GBC_PALETTE.ceo_gold },    // CEO — Gold
            { id: 'forge',    desk: 'forgeDesk',     color: GBC_PALETTE.cto_blue },    // CTO — Blue
            { id: 'echo',     desk: 'echoDesk',      color: GBC_PALETTE.cmo_purple },  // CMO — Purple
            { id: 'atlas',    desk: 'atlasDesk',     color: GBC_PALETTE.coo_teal },    // COO — Teal
            { id: 'sentinel', desk: 'sentinelDesk',  color: GBC_PALETTE.cco_silver }   // CCO — Silver
        ];
        
        characterData.forEach(data => {
            const emoji = resolveGB(data.id, 'emoji') || '⚡';
            const role = resolveGB(data.id, 'role') || data.id;
            
            const deskLoc = this.officeMap?.locations?.[data.desk] || { x: 8, y: 6 };
            
            const character = new GameBoyCharacter(
                data.id,
                role,
                emoji,
                data.color,
                deskLoc,
                this.officeMap
            );
            
            this.characters.push(character);
            this.container.addChild(character.container);
        });
    }
    
    spawnSubAgent(taskDescription) {
        const subAgentName = getGBSubAgentName(this.subAgentCounter);
        this.subAgentCounter++;
        
        const subAgent = new GameBoyCharacter(
            'subagent',
            'ROOKIE',
            '🔧',
            GBC_PALETTE.cro_red,  // Sub-agents get red
            { x: 8, y: 10 },
            this.officeMap
        );
        
        // Override name with Pokémon sub-agent name
        subAgent.name = subAgentName;
        subAgent.title = subAgentName;
        if (subAgent.nameLabel) {
            subAgent.nameLabel.text = subAgentName;
        }
        
        subAgent.container.scale.set(0.7);
        subAgent.carryDocument();
        subAgent.showSpeechBubble((taskDescription || 'WORKING').toUpperCase());
        
        this.subAgents.push(subAgent);
        this.container.addChild(subAgent.container);
        
        // Trigger wild encounter notification
        if (window.PokemonUI) {
            window.PokemonUI.wildEncounter(subAgentName);
        }
        
        return subAgent;
    }
    
    removeSubAgent(subAgent) {
        const index = this.subAgents.indexOf(subAgent);
        if (index > -1) {
            this.subAgents.splice(index, 1);
            this.container.removeChild(subAgent.container);
        }
    }
    
    update(deltaTime) {
        this.characters.forEach(c => c.update(deltaTime));
        this.subAgents.forEach(s => s.update(deltaTime));
    }
    
    getCharacterStates() {
        return this.characters.map(c => `${c.title || 'AGENT'}: ${(c.state || 'idle').toUpperCase()}`).join(', ');
    }
    
    triggerMissionSequence(mission) {
        const hunter = this.characters.find(c => c?.canonicalId === 'hunter');
        const missionBoard = this.officeMap?.locations?.missionBoard;
        
        if (hunter && missionBoard) {
            hunter.moveTo(missionBoard.x, missionBoard.y);
            hunter.showSpeechBubble("NEW QUEST!");
            
            setTimeout(() => {
                this.characters.forEach((char, index) => {
                    if (char !== hunter) {
                        setTimeout(() => {
                            char.moveTo(missionBoard.x - 1 + index * 0.5, missionBoard.y + 1);
                            char.showSpeechBubble("ROGER!");
                        }, index * 500);
                    }
                });
                
                setTimeout(() => {
                    this.showTaskBreakdown(mission);
                    setTimeout(() => {
                        this.characters.forEach((char, index) => {
                            setTimeout(() => char.setState('working_at_desk'), index * 300);
                        });
                        this.spawnMissionSubAgents(mission);
                    }, 2000);
                }, 1500);
            }, 1000);
        }
    }
    
    showTaskBreakdown(mission) {
        const missionPanel = document.getElementById('currentMissions');
        if (missionPanel) {
            missionPanel.innerHTML = `
                <div class="mission-item">
                    <div>${String(mission?.title || 'MISSION').toUpperCase()}</div>
                    <div class="hp-bar">
                        <div class="hp-fill hp-green" style="width: 10%"></div>
                    </div>
                </div>
            `;
        }
    }
    
    spawnMissionSubAgents(mission) {
        const numSubAgents = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < numSubAgents; i++) {
            setTimeout(() => {
                const subAgent = this.spawnSubAgent(mission.subtasks?.[i] || 'EXECUTING');
                this.animateSubAgentWork(subAgent, i);
            }, i * 1000);
        }
    }
    
    animateSubAgentWork(subAgent, agentIndex) {
        if (!subAgent) return;
        const mainChars = this.characters;
        let currentTarget = 0;
        
        const moveToNextAgent = () => {
            if (currentTarget < mainChars.length) {
                const targetChar = mainChars[currentTarget];
                if (!targetChar) { currentTarget++; moveToNextAgent(); return; }
                subAgent.moveTo(targetChar.gridX, targetChar.gridY + 1);
                subAgent.showSpeechBubble("DELIVERING");
                setTimeout(() => {
                    currentTarget++;
                    if (currentTarget < mainChars.length) moveToNextAgent();
                    else setTimeout(() => this.removeSubAgent(subAgent), 3000);
                }, 2000);
            }
        };
        setTimeout(() => moveToNextAgent(), 1000);
    }
    
    triggerCelebration() {
        // Pokémon celebration: "It's super effective!"
        if (window.PokemonUI) {
            const ceoName = resolveGB('ceo', 'title') || 'TRAINER RED';
            window.PokemonUI.systemMessage(`${ceoName} used DEPLOY!\nIt's super effective!`);
        }
        
        this.characters.forEach((char, index) => {
            if (!char) return;
            setTimeout(() => char.setState('celebrating'), index * 200);
        });
        this.showGameBoyConfetti();
    }
    
    showGameBoyConfetti() {
        // GBC confetti uses ALL the character colors!
        const confetti = new PIXI.Graphics();
        const confettiColors = [
            GBC_PALETTE.ceo_gold, GBC_PALETTE.cto_blue, GBC_PALETTE.cro_red,
            GBC_PALETTE.cmo_purple, GBC_PALETTE.coo_teal, GBC_PALETTE.cco_silver,
            GBC_PALETTE.lightest, GBC_PALETTE.green
        ];
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * 400 - 200;
            const y = Math.random() * 300 - 150;
            const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
            confetti.beginFill(color);
            confetti.drawRect(x, y, 2, 2);
            confetti.endFill();
        }
        this.container.addChild(confetti);
        setTimeout(() => this.container.removeChild(confetti), 3000);
    }
    
    findCharacterByRole(role) {
        if (!role) return null;
        const roleLower = String(role).toLowerCase();
        return this.characters.find(char => 
            (char?.role || '').toLowerCase() === roleLower ||
            (char?.role || '').toLowerCase().includes(roleLower)
        );
    }
    
    findCharacterByName(name) {
        if (!name) return null;
        const lower = String(name).toLowerCase();
        return this.characters.find(char => 
            (char?.canonicalId || '') === lower ||
            (char?.name || '').toLowerCase() === lower ||
            (char?.name || '').toLowerCase().includes(lower)
        );
    }
    
    hasSubagent(subagentId) {
        return this.subAgents.some(sub => sub?.subagentId === subagentId);
    }
    
    createStagiaire(subagentId, name, position) {
        const pokeName = getGBSubAgentName(this.subAgentCounter);
        this.subAgentCounter++;
        
        const stagiaire = new GameBoyCharacter(
            'subagent',
            'ROOKIE',
            '👨‍💼',
            GBC_PALETTE.cro_red,
            position,
            this.officeMap
        );
        
        stagiaire.subagentId = subagentId;
        stagiaire.name = pokeName;
        stagiaire.title = pokeName;
        if (stagiaire.nameLabel) stagiaire.nameLabel.text = pokeName;
        
        stagiaire.container.scale.set(0.7);
        stagiaire.carryDocument();
        
        this.subAgents.push(stagiaire);
        this.container.addChild(stagiaire.container);
        
        // Wild encounter!
        if (window.PokemonUI) {
            window.PokemonUI.wildEncounter(pokeName);
        }
        
        return stagiaire;
    }
}

window.GameBoyCharacter = GameBoyCharacter;
window.GameBoyCharacterManager = GameBoyCharacterManager;
window.GBC_PALETTE = GBC_PALETTE;
window.GBC_CSS = GBC_CSS;
