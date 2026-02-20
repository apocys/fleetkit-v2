// GameBoy Characters - Pokémon-universe AI agents for the virtual office
// Wired to SpawnKitNames for universe-consistent naming

/**
 * Graceful name resolver — falls back to canonical names if SpawnKitNames unavailable
 */
function resolveGB(canonicalId, field) {
    if (window.SpawnKitNames) {
        return SpawnKitNames.resolve('gameboy', canonicalId, field);
    }
    // Graceful fallback
    const fallback = { hunter: 'Hunter', forge: 'Forge', echo: 'Echo', atlas: 'Atlas', sentinel: 'Sentinel' };
    if (field === 'title') return (fallback[canonicalId] || canonicalId).toUpperCase();
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
        
        // GameBoy color palette
        this.colors = {
            lightest: 0x9BBB0F,
            light: 0x8BAC0F,
            dark: 0x306230,
            darkest: 0x0F380F
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
        this.applyGameBoyTint(ctx, canvas.width, canvas.height);
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
        graphics.lineStyle(2, this.colors.darkest, 1);
        graphics.beginFill(this.color);
        graphics.drawRect(-10, -10, 20, 20);
        graphics.endFill();
        graphics.beginFill(this.colors.darkest);
        graphics.drawRect(-6, -6, 2, 2);
        graphics.drawRect(4, -6, 2, 2);
        graphics.drawRect(-2, 2, 4, 1);
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
            case 'wandering':
                return this.isMoving ? 'walk_right_1' : 'idle_1';
            case 'celebrating':
                return 'celebrating_1';
            case 'delegating':
                return 'working_1'; // Special animation for delegating
            case 'grinding':
            case 'leveling_up':
                return 'working_1'; // Intense working animation
            case 'thinking':
            default:
                return 'idle_1';
        }
    }
    
    applyGameBoyTint(ctx, width, height) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const a = data[i + 3];
            if (a > 0) {
                const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
                if (gray > 200)      { data[i] = 0x9B; data[i+1] = 0xBB; data[i+2] = 0x0F; }
                else if (gray > 150) { data[i] = 0x8B; data[i+1] = 0xAC; data[i+2] = 0x0F; }
                else if (gray > 100) { data[i] = 0x30; data[i+1] = 0x62; data[i+2] = 0x30; }
                else                 { data[i] = 0x0F; data[i+1] = 0x38; data[i+2] = 0x0F; }
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
                this.applyGameBoyTint(this.spriteContext, this.spriteCanvas.width, this.spriteCanvas.height);
                this.sprite.texture.update();
                this.currentFrame = newFrame;
            }
        }
    }
    
    createNameLabel() {
        // Use Agent OS naming if available, fallback to Pokémon-style title
        let displayName = this.title;
        
        // Check if this character has an associated subagent with Agent OS name
        if (this.agentOSName && window.AgentOSNaming) {
            displayName = window.AgentOSNaming.displayName(this.agentOSName, 'abbreviated');
        } else if (this.role && this.canonicalId) {
            // Try to construct abbreviated name for main agents (F.TR-01 format)
            const parentMap = { hunter: 'H', forge: 'F', echo: 'E', atlas: 'A', sentinel: 'S', main: 'M' };
            const parent = parentMap[this.canonicalId] || this.canonicalId[0].toUpperCase();
            const roleAbbrev = this.role === 'CTO' ? 'CT' : this.role === 'CRO' ? 'CR' : this.role === 'CMO' ? 'CM' : this.role === 'COO' ? 'CO' : this.role === 'CEO' ? 'CE' : 'AG';
            displayName = `${parent}.${roleAbbrev}-01`;
        }
        
        // Apply model identity color if available
        let textColor = this.colors.lightest;
        if (this.model && window.ModelIdentity) {
            const modelId = window.ModelIdentity.getIdentity(this.model);
            textColor = modelId.color ? parseInt(modelId.color.replace('#', '0x'), 16) : this.colors.lightest;
        }
        
        this.nameLabel = new PIXI.Text(displayName, {
            fontFamily: 'Press Start 2P, Monaco, monospace',
            fontSize: 5,
            fill: textColor,
            stroke: this.colors.darkest,
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
        const screenPos = this.officeMap.gridToScreen(this.gridX, this.gridY);
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
                weights = { going_to_meeting: 2, getting_coffee: 2, thinking: 2, celebrating: 1, searching_files: 1, working_at_desk: 1, wandering: 1 };
                break;
            case 'going_to_meeting':
                weights = { in_meeting: 5, working_at_desk: 1 };
                break;
            case 'in_meeting':
                weights = { working_at_desk: 4, getting_coffee: 1 };
                break;
            case 'getting_coffee':
                weights = { working_at_desk: 3, thinking: 1, celebrating: 1, wandering: 1 };
                break;
            case 'searching_files':
                weights = { working_at_desk: 4, thinking: 1 };
                break;
            case 'wandering':
                weights = { working_at_desk: 3, getting_coffee: 1, searching_files: 1 };
                break;
            case 'delegating':
                weights = { working_at_desk: 4, going_to_meeting: 1 };
                break;
            case 'grinding':
            case 'leveling_up':
                weights = { working_at_desk: 5, celebrating: 2 };
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
                this.showSpeechBubble("MEETING", 4000);
                break;
            case 'getting_coffee':
                this.goToCoffee();
                break;
            case 'celebrating':
                this.celebrate();
                break;
            case 'thinking':
                this.showSpeechBubble("...", 3000);
                break;
            case 'searching_files':
                this.searchFiles();
                break;
            case 'wandering':
                this.wander();
                break;
            case 'delegating':
                this.delegate();
                break;
            case 'grinding':
                this.grind();
                break;
            case 'leveling_up':
                this.levelUp();
                break;
        }
    }
    
    goToDesk() {
        this.moveTo(this.homeDesk.x, this.homeDesk.y);
        this.showSpeechBubble("CODING");
    }
    
    goToMeeting() {
        const meetingPos = this.officeMap.locations.meetingRoom;
        const ox = Math.random() * 2 - 1;
        const oy = Math.random() * 2 - 1;
        this.moveTo(meetingPos.x + ox, meetingPos.y + oy);
        this.showSpeechBubble("GYM BATTLE");
    }
    
    goToCoffee() {
        const coffeePos = this.officeMap.locations.coffeeStation;
        this.moveTo(coffeePos.x, coffeePos.y);
        // Use Pokémon object name
        this.showSpeechBubble(resolveGBObject('coffee'));
    }
    
    searchFiles() {
        const filesPos = this.officeMap.locations.fileCabinets;
        this.moveTo(filesPos.x, filesPos.y);
        this.showSpeechBubble(resolveGBObject('cabinet'));
    }
    
    celebrate() {
        this.showSpeechBubble("IT'S SUPER\nEFFECTIVE!");
        this.celebrationBounce = 0;
    }
    
    wander() {
        // Random movement around the office
        const locations = Object.values(this.officeMap.locations);
        const randomLoc = locations[Math.floor(Math.random() * locations.length)];
        const offset = { x: Math.random() - 0.5, y: Math.random() - 0.5 };
        this.moveTo(randomLoc.x + offset.x, randomLoc.y + offset.y);
        const phrase = window.getGameBoyPhrase ? window.getGameBoyPhrase('wandering') : "EXPLORING!";
        this.showSpeechBubble(phrase, 3000);
    }
    
    delegate() {
        // Stay at desk but show delegating animation
        this.goToDesk();
        this.isWorking = true;
        const phrase = window.getGameBoyPhrase ? window.getGameBoyPhrase('delegating') : "DELEGATING!";
        this.showSpeechBubble(phrase, 4000);
        this.addActiveGlow();
    }
    
    grind() {
        this.goToDesk();
        this.isWorking = true;
        this.showProgressBar();
        const phrase = window.getGameBoyPhrase ? window.getGameBoyPhrase('grinding') : "GRINDING!";
        this.showSpeechBubble(phrase, 4000);
        // Faster working animation
        this.workingAnimation += 0.02;
    }
    
    levelUp() {
        this.goToDesk();
        this.isWorking = true;
        const phrase = window.getGameBoyPhrase ? window.getGameBoyPhrase('celebrating') : "LVL UP!";
        this.showSpeechBubble(phrase, 5000);
        this.celebrationBounce = 0;
        this.addActiveGlow();
    }
    
    showSpeechBubble(text, duration) {
        this.hideSpeechBubble();
        
        const bubbleContainer = new PIXI.Container();
        
        // Determine bubble duration - longer for real task text
        const isRealTask = text && (text.includes('!') || text.length > 8);
        const bubbleDuration = duration || (isRealTask ? 5000 : 3000);
        
        // Pokémon-style dialog box with thicker borders
        const bubble = new PIXI.Graphics();
        const tw = Math.max(44, text.length * 4 + 12);
        bubble.lineStyle(2, this.colors.darkest, 1);
        bubble.beginFill(this.colors.lightest);
        bubble.drawRect(-tw/2, -14, tw, 22);
        bubble.endFill();
        
        // Pointer
        bubble.beginFill(this.colors.lightest);
        bubble.drawPolygon([-4, 8, 0, 12, 4, 8]);
        bubble.endFill();
        bubble.lineStyle(2, this.colors.darkest, 1);
        bubble.drawPolygon([-4, 8, 0, 12, 4, 8]);
        
        const bubbleText = new PIXI.Text(text, {
            fontFamily: 'Press Start 2P, Monaco, monospace',
            fontSize: 5,
            fill: this.colors.darkest,
            align: 'center'
        });
        bubbleText.anchor.set(0.5, 0.5);
        bubbleText.y = -3;
        
        // Pokémon scroll indicator ▼
        const scrollIndicator = new PIXI.Text('▼', {
            fontFamily: 'Press Start 2P, Monaco, monospace',
            fontSize: 4,
            fill: this.colors.darkest
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
        this.speechTimer = bubbleDuration;
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
        
        // HP label
        const hpLabel = new PIXI.Text('HP', {
            fontFamily: 'Press Start 2P, Monaco, monospace',
            fontSize: 4,
            fill: this.colors.lightest
        });
        hpLabel.x = -22;
        hpLabel.y = -3;
        
        // Background
        const barBg = new PIXI.Graphics();
        barBg.lineStyle(1, this.colors.darkest, 1);
        barBg.beginFill(this.colors.darkest);
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
        
        // Pokémon HP bar color logic: green → yellow → orange → red
        let fillColor;
        if (targetProgress > 0.5) fillColor = this.colors.lightest;       // green
        else if (targetProgress > 0.25) fillColor = 0xCCBB00;             // yellow
        else if (targetProgress > 0.1) fillColor = 0xCC8800;              // orange
        else fillColor = 0xCC2200;                                         // red
        
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
        doc.lineStyle(1, this.colors.darkest, 1);
        doc.beginFill(this.colors.lightest);
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
    
    addActiveGlow() {
        this.removeActiveGlow(); // Remove existing glow
        
        try {
            // Try to use GlowFilter if available
            if (PIXI.filters && PIXI.filters.GlowFilter) {
                const glowFilter = new PIXI.filters.GlowFilter({
                    distance: 8,
                    outerStrength: 2,
                    innerStrength: 1,
                    color: this.colors.lightest,
                    quality: 0.3
                });
                
                this.sprite.filters = [glowFilter];
            } else {
                // Fallback: subtle tint change
                this.sprite.tint = 0xFFFFAA; // Slight yellow tint
            }
        } catch (err) {
            console.warn('🎮 Glow effect not available, using tint fallback');
            this.sprite.tint = 0xFFFFAA;
        }
        
        // Remove glow after 3 seconds
        setTimeout(() => {
            this.removeActiveGlow();
        }, 3000);
    }
    
    removeActiveGlow() {
        if (this.sprite) {
            if (this.sprite.filters) {
                this.sprite.filters = [];
            }
            // Reset tint
            this.sprite.tint = 0xFFFFFF;
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
        // Map canonical agent IDs to Pokémon names via SpawnKitNames
        const characterData = [
            { id: 'hunter',   desk: 'hunterDesk',   color: 0x8BAC0F },
            { id: 'forge',    desk: 'forgeDesk',     color: 0x9BBB0F },
            { id: 'echo',     desk: 'echoDesk',      color: 0x306230 },
            { id: 'atlas',    desk: 'atlasDesk',     color: 0x8BAC0F },
            { id: 'sentinel', desk: 'sentinelDesk',  color: 0x306230 }
        ];
        
        characterData.forEach(data => {
            const emoji = resolveGB(data.id, 'emoji') || '⚡';
            const role = resolveGB(data.id, 'role') || data.id;
            
            const character = new GameBoyCharacter(
                data.id,
                role,
                emoji,
                data.color,
                this.officeMap.locations[data.desk],
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
            0x306230,
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
        const hunter = this.characters.find(c => c.canonicalId === 'hunter');
        const missionBoard = this.officeMap.locations.missionBoard;
        
        if (hunter) {
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
                    <div>${(mission.title || 'MISSION').toUpperCase()}</div>
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
        const mainChars = this.characters;
        let currentTarget = 0;
        
        const moveToNextAgent = () => {
            if (currentTarget < mainChars.length) {
                const targetChar = mainChars[currentTarget];
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
            setTimeout(() => char.setState('celebrating'), index * 200);
        });
        this.showGameBoyConfetti();
    }
    
    showGameBoyConfetti() {
        const confetti = new PIXI.Graphics();
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * 400 - 200;
            const y = Math.random() * 300 - 150;
            const color = Math.random() > 0.5 ? 0x9BBB0F : 0x8BAC0F;
            confetti.beginFill(color);
            confetti.drawRect(x, y, 2, 2);
            confetti.endFill();
        }
        this.container.addChild(confetti);
        setTimeout(() => this.container.removeChild(confetti), 3000);
    }
    
    // ── Agent OS Integration Methods ───────────────────────────
    updateAgentOSNames(spawnKitData) {
        if (!spawnKitData?.subagents || !window.AgentOSNaming) return;
        
        spawnKitData.subagents.forEach(subagent => {
            const character = this.findCharacterByName(subagent.name) || 
                            this.findCharacterById(subagent.id);
            
            if (character && subagent.agentOSName) {
                character.agentOSName = subagent.agentOSName;
                character.model = subagent.model;
                // Recreate name label with new Agent OS name
                if (character.nameLabel) {
                    character.container.removeChild(character.nameLabel);
                    character.createNameLabel();
                }
            }
        });
        
        // Update main agents with model identities
        if (spawnKitData.agents) {
            spawnKitData.agents.forEach(agent => {
                const character = this.findCharacterByRole(agent.role) || 
                                this.findCharacterByName(agent.name);
                
                if (character && agent.model) {
                    character.model = agent.model;
                    // Recreate name label with model-based colors
                    if (character.nameLabel) {
                        character.container.removeChild(character.nameLabel);
                        character.createNameLabel();
                    }
                }
            });
        }
    }
    
    findCharacterById(id) {
        return this.characters.find(char => char.id === id) || 
               this.subAgents.find(sub => sub.subagentId === id);
    }

    findCharacterByRole(role) {
        if (!role) return null;
        
        const roleLower = role.toLowerCase();
        
        // Direct role matches
        let character = this.characters.find(char => 
            char.role.toLowerCase() === roleLower ||
            char.role.toLowerCase().includes(roleLower)
        );
        
        if (character) return character;
        
        // Map specific role names to canonical IDs
        const roleMapping = {
            'cro': 'hunter',    // Chief Revenue Officer
            'cto': 'forge',     // Chief Technology Officer  
            'cmo': 'echo',      // Chief Marketing Officer
            'coo': 'atlas',     // Chief Operating Officer
            'auditor': 'sentinel', // Security/Audit role
            'ceo': 'hunter',    // CEO maps to Hunter for now
            'revenue': 'hunter',
            'technology': 'forge',
            'tech': 'forge',
            'marketing': 'echo',
            'operations': 'atlas',
            'security': 'sentinel',
            'audit': 'sentinel'
        };
        
        const canonicalId = roleMapping[roleLower];
        if (canonicalId) {
            character = this.characters.find(char => char.canonicalId === canonicalId);
        }
        
        return character;
    }
    
    findCharacterByName(name) {
        if (!name) return null;
        const lower = name.toLowerCase();
        return this.characters.find(char => 
            char.canonicalId === lower ||
            char.name.toLowerCase() === lower ||
            char.name.toLowerCase().includes(lower)
        );
    }
    
    hasSubagent(subagentId) {
        return this.subAgents.some(sub => sub.subagentId === subagentId);
    }
    
    createStagiaire(subagentId, name, position) {
        const pokeName = getGBSubAgentName(this.subAgentCounter);
        this.subAgentCounter++;
        
        const stagiaire = new GameBoyCharacter(
            'subagent',
            'ROOKIE',
            '👨‍💼',
            0x306230,
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
