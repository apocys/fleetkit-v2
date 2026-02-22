// GameBoy Color Office - Main retro virtual office engine (Full Color Edition)

class GameBoyVirtualOffice {
    constructor() {
        this.app = null;
        this.officeMap = null;
        this.characterManager = null;
        this.stateBridge = null;
        
        // Containers for different layers
        this.mapContainer = null;
        this.characterContainer = null;
        this.effectsContainer = null;
        
        // GameBoy COLOR palette — warm, vibrant, retro
        this.colors = {
            lightest: 0xE2C275,  // Warm gold (text, highlights)
            light: 0x53868B,     // Teal (UI elements, borders)
            dark: 0x16213E,      // Dark blue (panels, shadows)
            darkest: 0x1A1A2E    // Deep navy (background)
        };
        
        // Extended GBC palette
        this.extColors = {
            gold: 0xD4A853,
            teal: 0x53868B,
            blue: 0x4A90D9,
            red: 0xC0392B,
            purple: 0x9B59B6,
            green: 0x5CB85C,
            silver: 0xA0A0B0,
            amber: 0xCC7A30,
            cream: 0xF5E6C8,
            navy: 0x0F3460
        };
        
        // Performance tracking
        this.lastTime = performance.now();
        this.frameCount = 0;
        this.fps = 0;
        
        // GameBoy-style screen effects
        this.screenTimer = 0;
        this.dotMatrixEffect = null;
        
        this.init();
    }
    
    async init() {
        // Create PixiJS application with GameBoy resolution feel
        try {
            this.app = new PIXI.Application({
                width: 800,
                height: 600,
                backgroundColor: this.colors.darkest,
                antialias: false, // Crisp pixels
                resolution: 1, // No upscaling for authentic feel
                autoDensity: false
            });
            
            // Force nearest neighbor scaling for authentic pixel art
            PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;
            
            // Add canvas to DOM
            const container = document.getElementById('gameContainer');
            if (!container) { console.warn('🎮 GBC: #gameContainer not found'); return; }
        container.appendChild(this.app.view);
        
        // Apply GameBoy screen styling
        this.app.view.style.imageRendering = 'pixelated';
        this.app.view.style.imageRendering = '-moz-crisp-edges';
        this.app.view.style.imageRendering = 'crisp-edges';
        
        // Initialize game systems
        this.setupContainers();
        this.createSystems();
        this.addGameBoyEffects();
        
        // Start game loop
        this.app.ticker.add(this.gameLoop.bind(this));
        
            console.log('🎮 GameBoy Color Virtual Office initialized!');
            
            // Wire Mission Controller into the GameBoy Color theme
            this.initMissionController();
            
            // Start with a welcome message
            this.showStartupMessage();
            
        } catch (error) {
            console.warn('🎮 GameBoy Color: PixiJS renderer failed, showing fallback', error);
            this.showWebGLFallback();
        }
    }
    
    showWebGLFallback() {
        const container = document.getElementById('gameContainer');
        if (!container) return;
        
        container.innerHTML = `
            <div style="
                width: 800px; height: 600px; 
                background: linear-gradient(135deg, #1a472a, #064e3b);
                border: 4px solid #374151;
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                font-family: 'Courier New', monospace; color: #9ca3af; text-align: center; gap: 16px;
            ">
                <div style="font-size: 24px; color: #d1d5db;">🎮</div>
                <div style="font-size: 16px; font-weight: bold; color: #e5e7eb;">GameBoy Office</div>
                <div style="font-size: 14px; max-width: 300px; line-height: 1.5;">
                    This theme requires WebGL support.<br>
                    Try the <a href="../office-executive/" style="color: #60a5fa; text-decoration: none;">Executive</a> 
                    or <a href="../office-simcity/" style="color: #60a5fa; text-decoration: none;">SimCity</a> themes instead.
                </div>
            </div>
        `;
    }
    
    setupContainers() {
        // Create layered containers
        this.mapContainer = new PIXI.Container();
        this.characterContainer = new PIXI.Container();
        this.effectsContainer = new PIXI.Container();
        
        // Add to stage in order (back to front)
        this.app.stage.addChild(this.mapContainer);
        this.app.stage.addChild(this.characterContainer);
        this.app.stage.addChild(this.effectsContainer);
    }
    
    addGameBoyEffects() {
        // Subtle dot matrix background pattern
        this.createDotMatrixBackground();
        
        // Screen border (chunky GameBoy style)
        this.createScreenBorder();
    }
    
    createDotMatrixBackground() {
        const dotMatrix = new PIXI.Graphics();
        
        // Very subtle grid pattern in dark blue
        for (let x = 0; x < this.app.screen.width; x += 4) {
            for (let y = 0; y < this.app.screen.height; y += 4) {
                if ((x + y) % 8 === 0) {
                    dotMatrix.beginFill(this.colors.dark, 0.15);
                    dotMatrix.drawRect(x, y, 1, 1);
                    dotMatrix.endFill();
                }
            }
        }
        
        this.dotMatrixEffect = dotMatrix;
        this.effectsContainer.addChild(dotMatrix);
    }
    
    createScreenBorder() {
        const border = new PIXI.Graphics();
        
        // Chunky border around the screen — teal
        border.lineStyle(4, this.colors.light, 1);
        border.drawRect(2, 2, this.app.screen.width - 4, this.app.screen.height - 4);
        
        // Inner shadow effect — darker navy
        border.lineStyle(2, this.extColors.navy, 0.3);
        border.drawRect(6, 6, this.app.screen.width - 12, this.app.screen.height - 12);
        
        this.effectsContainer.addChild(border);
    }
    
    createSystems() {
        // Create GameBoy Color office map
        this.officeMap = new GameBoyOfficeMap();
        
        // Render the office tiles
        this.officeMap.renderTiles(this.mapContainer, this.app);
        
        // Create character manager
        this.characterManager = new GameBoyCharacterManager(this.officeMap);
        
        // Position character container at screen center
        this.characterContainer.x = this.app.screen.width / 2;
        this.characterContainer.y = 180;
        
        // Add characters to the character container
        this.characterContainer.addChild(this.characterManager.container);
        
        // Create state bridge for mission simulation
        this.stateBridge = new GameBoyStateBridge(this.characterManager, this.officeMap);
        
        // Add some initial activity after startup
        setTimeout(() => {
            this.stateBridge?.triggerWhiteboardSession();
        }, 5000);
    }
    
    initMissionController() {
        // Gracefully handle missing MissionController or adapter
        if (typeof initMissionAdapter !== 'function') {
            console.warn('🎮 Mission adapter not loaded — skipping MissionController integration');
            return;
        }
        if (typeof MissionController === 'undefined') {
            console.warn('🎮 MissionController not loaded — skipping integration');
            return;
        }
        
        try {
            initMissionAdapter(
                this.app,
                this.characterManager,
                this.officeMap,
                this.effectsContainer
            );
            console.log('🎮 MissionController ↔ GameBoy Color theme wired up!');
        } catch (err) {
            console.error('🎮 Failed to init MissionController adapter:', err);
        }
    }
    
    showStartupMessage() {
        // GameBoy Color-style startup text — warm gold on navy
        const startupText = new PIXI.Text('SPAWNKIT GAMEBOY COLOR\n\nSYSTEM INITIALIZED\nLOADING AGENTS...', {
            fontFamily: 'Press Start 2P, Monaco, monospace',
            fontSize: 12,
            fill: this.colors.lightest,
            align: 'center',
            stroke: this.colors.darkest,
            strokeThickness: 1
        });
        
        startupText.anchor.set(0.5);
        startupText.x = this.app.screen.width / 2;
        startupText.y = this.app.screen.height / 2;
        
        this.effectsContainer.addChild(startupText);
        
        // Fade out after 3 seconds
        setTimeout(() => {
            const fadeOut = setInterval(() => {
                startupText.alpha -= 0.1;
                if (startupText.alpha <= 0) {
                    this.effectsContainer.removeChild(startupText);
                    clearInterval(fadeOut);
                }
            }, 100);
        }, 3000);
    }
    
    gameLoop(delta) {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.screenTimer += deltaTime;
        
        // Update systems
        this.characterManager?.update(deltaTime);
        this.stateBridge?.update(deltaTime);
        
        // Update GameBoy effects
        this.updateGameBoyEffects(deltaTime);
        
        // Update debug info
        this.updateDebugInfo(deltaTime);
    }
    
    updateGameBoyEffects(deltaTime) {
        // Subtle screen "flicker" effect (very subtle)
        if (this.screenTimer > 16.67 * 120) { // Every 2 seconds at 60fps
            this.app.stage.alpha = 0.98;
            setTimeout(() => {
                this.app.stage.alpha = 1.0;
            }, 50);
            this.screenTimer = 0;
        }
        
        // Animate dot matrix very subtly
        if (this.dotMatrixEffect) {
            this.dotMatrixEffect.alpha = 0.05 + Math.sin(this.screenTimer * 0.001) * 0.02;
        }
    }
    
    updateDebugInfo(deltaTime) {
        this.frameCount++;
        
        // Update FPS every second
        if (this.frameCount % 60 === 0) {
            this.fps = Math.round(1000 / (deltaTime || 1));
            
            const fpsElement = document.getElementById('fps');
            const activeElement = document.getElementById('activeCharacters');
            const activitiesElement = document.getElementById('currentActivities');
            
            if (fpsElement) {
                fpsElement.textContent = `FPS: ${this.fps}`;
            }
            
            if (activeElement && this.characterManager) {
                activeElement.textContent = `AGENTS: ${this.characterManager.characters?.length || 0}`;
            }
            
            if (activitiesElement && this.characterManager) {
                activitiesElement.textContent = `STATUS: ${this.getShortStatus()}`;
            }
        }
    }
    
    getShortStatus() {
        if (!this.characterManager?.characters?.length) return 'LOADING';
        
        const states = this.characterManager.characters.map(c => c?.state || 'idle');
        const working = states.filter(s => s.includes('working')).length;
        const meeting = states.filter(s => s.includes('meeting')).length;
        const coffee = states.filter(s => s.includes('coffee')).length;
        
        return `W:${working} M:${meeting} C:${coffee}`;
    }
    
    // Enhanced interactivity with GameBoy feel
    addInteractivity() {
        this.app.stage.interactive = true;
        this.app.stage.on('pointerdown', (event) => {
            const globalPos = event?.data?.global ?? event?.global;
            if (!globalPos) return;
            const localPos = this.characterContainer?.toLocal(globalPos);
            if (!localPos) return;
            const gridPos = this.officeMap?.screenToGrid(localPos.x, localPos.y);
            if (!gridPos) return;
            
            const gridX = Math.floor(gridPos.x);
            const gridY = Math.floor(gridPos.y);
            
            console.log(`🎮 Clicked grid: ${gridX}, ${gridY}`);
            
            // Check if clicking on special elements
            const locations = this.officeMap?.locations || {};
            Object.keys(locations).forEach(key => {
                const loc = locations[key];
                if (loc.x === gridX && loc.y === gridY) {
                    this.handleLocationClick(key, loc);
                    return;
                }
            });
            
            // Move random character to clicked location
            if (this.officeMap?.isWalkable(gridX, gridY)) {
                const chars = this.characterManager?.characters || [];
                if (chars.length === 0) return;
                const randomChar = chars[
                    Math.floor(Math.random() * chars.length)
                ];
                randomChar?.moveTo(gridX, gridY);
                randomChar?.showSpeechBubble("MOVING");
            }
        });
        
        console.log('🎮 Interactivity enabled! Click on office elements.');
    }
    
    handleLocationClick(locationKey, location) {
        console.log(`🎮 Clicked on: ${location.name}`);
        
        switch (location.type) {
            case 'whiteboard':
                this.stateBridge?.triggerWhiteboardSession();
                break;
            case 'mailbox':
                this.stateBridge?.triggerHeartbeatNotification();
                break;
            case 'phone':
                this.stateBridge?.triggerCronAlarm();
                break;
            case 'coffee':
                this.stateBridge?.triggerCoffeeBreak();
                break;
            case 'files':
                this.stateBridge?.triggerFileSearch();
                break;
        }
    }
    
    // Public API for external control
    triggerMeeting() {
        this.stateBridge?.triggerGroupMeeting();
        console.log('🎮 Group meeting triggered');
    }
    
    triggerCelebration() {
        this.stateBridge?.triggerCelebration();
    }
    
    triggerWhiteboard() {
        this.stateBridge?.triggerWhiteboardSession();
    }
    
    addMission(title, description, subtasks = []) {
        this.stateBridge?.addCustomMission(title, description, subtasks);
    }
    
    getOfficeStatus() {
        return {
            characters: this.characterManager?.characters?.length || 0,
            fps: this.fps,
            activities: this.characterManager?.getCharacterStates() || '',
            missions: this.stateBridge?.getMissionStatus() || { active: 0, queued: 0, activeMissions: [] },
            systemInfo: {
                mode: 'GameBoy Color Retro',
                palette: 'Full Color GBC',
                resolution: '800x600',
                uptime: Math.floor((performance.now()) / 1000) + 's'
            }
        };
    }
    
    // Developer cheat codes (GameBoy style)
    triggerCheatCode(code) {
        switch (String(code || '').toLowerCase()) {
            case 'konami':
                // Spawn extra sub-agents
                for (let i = 0; i < 5; i++) {
                    setTimeout(() => {
                        this.characterManager?.spawnSubAgent('CHEAT MODE');
                    }, i * 500);
                }
                console.log('🎮 KONAMI CODE: Extra agents spawned!');
                break;
                
            case 'matrix':
                // Make everyone move in formation
                (this.characterManager?.characters || []).forEach((char, index) => {
                    setTimeout(() => {
                        const x = 8 + (index - 2);
                        char.moveTo(x, 6);
                        char.showSpeechBubble('FORMATION');
                    }, index * 200);
                });
                console.log('🎮 MATRIX CODE: Formation mode!');
                break;
                
            case 'speed':
                // Increase all animation speeds
                (this.characterManager?.characters || []).forEach(char => {
                    if (char) char.moveSpeed *= 2;
                });
                console.log('🎮 SPEED CODE: Double speed mode!');
                break;
                
            case 'rainbow':
                // Cycle through GBC colors
                const gbcColors = [0xD4A853, 0x4A90D9, 0xC0392B, 0x9B59B6, 0x53868B, 0x5CB85C];
                (this.characterManager?.characters || []).forEach((char, index) => {
                    if (!char) return;
                    setTimeout(() => {
                        char.color = gbcColors[index % gbcColors.length];
                        char.createGameBoySprite?.();
                    }, index * 300);
                });
                console.log('🎮 RAINBOW CODE: Color cycle mode!');
                break;
        }
    }
    
    // Save/Load state (future feature)
    saveOfficeState() {
        const state = {
            characters: (this.characterManager?.characters || []).map(c => ({
                name: c?.name || 'UNKNOWN',
                x: c?.gridX ?? 0,
                y: c?.gridY ?? 0,
                state: c?.state || 'idle'
            })),
            missions: this.stateBridge?.getMissionStatus?.()?.activeMissions || [],
            timestamp: Date.now()
        };
        
        localStorage.setItem('gameboyColorOfficeState', JSON.stringify(state));
        console.log('💾 Office state saved');
    }
    
    loadOfficeState() {
        const saved = localStorage.getItem('gameboyColorOfficeState');
        if (saved) {
            const state = JSON.parse(saved);
            // Would restore character positions and missions
            console.log('💾 Office state loaded');
            return true;
        }
        return false;
    }
}

// Initialize the GameBoy Color office when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.gameboyOffice = new GameBoyVirtualOffice();
    
    // Add GameBoy-style keyboard controls
    document.addEventListener('keydown', (event) => {
        if (!window.gameboyOffice) return;
        
        switch (event.key.toLowerCase()) {
            case 'm':
                window.gameboyOffice.triggerMeeting();
                break;
            case 'c':
                window.gameboyOffice.triggerCelebration();
                break;
            case 'w':
                window.gameboyOffice.triggerWhiteboard();
                break;
            case 'i':
                window.gameboyOffice.addInteractivity();
                break;
            case 's':
                console.log('🎮 Office Status:', window.gameboyOffice.getOfficeStatus());
                break;
            case 'x':
                // Add custom mission
                window.gameboyOffice.addMission(
                    'URGENT HOTFIX',
                    'FIX CRITICAL BUG IN PROD',
                    ['IDENTIFY ISSUE', 'WRITE PATCH', 'DEPLOY FIX']
                );
                break;
            case 'z':
                // Save state
                window.gameboyOffice.saveOfficeState();
                break;
        }
        
        // Cheat codes (multiple key combinations)
        if (event.ctrlKey || event.metaKey) {
            switch (event.key.toLowerCase()) {
                case 'k':
                    event.preventDefault();
                    window.gameboyOffice.triggerCheatCode('konami');
                    break;
                case 'm':
                    event.preventDefault();
                    window.gameboyOffice.triggerCheatCode('matrix');
                    break;
                case 'r':
                    event.preventDefault();
                    window.gameboyOffice.triggerCheatCode('rainbow');
                    break;
            }
        }
    });
    
    // Auto-save every 30 seconds
    setInterval(() => {
        if (window.gameboyOffice) {
            window.gameboyOffice.saveOfficeState();
        }
    }, 30000);
});

// Make office available globally for debugging
window.GameBoyVirtualOffice = GameBoyVirtualOffice;
