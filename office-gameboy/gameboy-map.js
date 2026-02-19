// GameBoy Map - Retro-styled isometric layout for FleetKit Virtual Office

class GameBoyOfficeMap {
    constructor() {
        this.gridWidth = 16;
        this.gridHeight = 12;
        this.tileWidth = 32;
        this.tileHeight = 16;
        
        // GameBoy color palette
        this.colors = {
            lightest: 0x9BBB0F,  // Light green
            light: 0x8BAC0F,     // Medium light green
            dark: 0x306230,      // Dark green
            darkest: 0x0F380F    // Darkest green
        };
        
        // Define locations using Pokémon universe names (via FleetKitNames)
        const _obj = (id) => window.FleetKitNames ? FleetKitNames.resolveObject('gameboy', id) : id;
        const _name = (id) => window.FleetKitNames ? FleetKitNames.resolve('gameboy', id, 'title') : id;
        
        this.locations = {
            // Agent desks (Pokémon trainer stations)
            hunterDesk:   { x: 3,  y: 3,  name: _name('hunter') + "'s DESK", type: 'desk' },
            forgeDesk:    { x: 13, y: 2,  name: _name('forge') + "'s DESK",  type: 'desk' },
            echoDesk:     { x: 2,  y: 9,  name: _name('echo') + "'s DESK",   type: 'desk' },
            atlasDesk:    { x: 13, y: 9,  name: _name('atlas') + "'s DESK",  type: 'desk' },
            sentinelDesk: { x: 7,  y: 3,  name: _name('sentinel') + "'s DESK", type: 'desk' },
            
            // Special Pokémon-named locations
            missionBoard:  { x: 4,  y: 6,  name: _obj('whiteboard'), type: 'whiteboard' },
            mailbox:       { x: 1,  y: 1,  name: _obj('mailbox'),    type: 'mailbox' },
            phoneAlarm:    { x: 14, y: 1,  name: _obj('phone'),      type: 'phone' },
            coffeeStation: { x: 2,  y: 10, name: _obj('coffee'),     type: 'coffee' },
            fileCabinets:  { x: 14, y: 10, name: _obj('cabinet'),    type: 'files' },
            
            // Meeting area (center) — TALL GRASS!
            meetingRoom:   { x: 8,  y: 6,  name: _obj('door') || "TALL GRASS", area: true }
        };
        
        // Define areas (larger than single tiles)
        this.areas = {
            meetingRoom: [
                { x: 7, y: 5 }, { x: 8, y: 5 }, { x: 9, y: 5 },
                { x: 7, y: 6 }, { x: 8, y: 6 }, { x: 9, y: 6 },
                { x: 7, y: 7 }, { x: 8, y: 7 }, { x: 9, y: 7 }
            ],
            missionBoardArea: [
                { x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 }
            ]
        };
        
        // Walkable tiles (everything except walls)
        this.walkable = this.generateWalkableMap();
        
        // Animation states for interactive elements
        this.animatedElements = {
            mailbox: { flashing: false, timer: 0 },
            phone: { ringing: false, timer: 0 },
            coffee: { steaming: true, timer: 0 }
        };
    }
    
    generateWalkableMap() {
        const walkable = [];
        for (let y = 0; y < this.gridHeight; y++) {
            walkable[y] = [];
            for (let x = 0; x < this.gridWidth; x++) {
                // GameBoy-style chunky borders
                if (x <= 1 || x >= this.gridWidth - 2 || y <= 1 || y >= this.gridHeight - 2) {
                    walkable[y][x] = false;
                } else {
                    walkable[y][x] = true;
                }
            }
        }
        return walkable;
    }
    
    // Convert grid coordinates to screen coordinates (isometric)
    gridToScreen(gridX, gridY) {
        const screenX = (gridX - gridY) * (this.tileWidth / 2);
        const screenY = (gridX + gridY) * (this.tileHeight / 2);
        return { x: screenX, y: screenY };
    }
    
    // Convert screen coordinates to grid coordinates
    screenToGrid(screenX, screenY) {
        const gridX = (screenX / (this.tileWidth / 2) + screenY / (this.tileHeight / 2)) / 2;
        const gridY = (screenY / (this.tileHeight / 2) - screenX / (this.tileWidth / 2)) / 2;
        return { x: Math.floor(gridX), y: Math.floor(gridY) };
    }
    
    isWalkable(x, y) {
        if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) {
            return false;
        }
        return this.walkable[y][x];
    }
    
    getRandomWalkablePosition() {
        let attempts = 0;
        while (attempts < 100) {
            const x = Math.floor(Math.random() * this.gridWidth);
            const y = Math.floor(Math.random() * this.gridHeight);
            if (this.isWalkable(x, y)) {
                return { x, y };
            }
            attempts++;
        }
        // Fallback to center
        return { x: 8, y: 6 };
    }
    
    getMeetingPositions() {
        return this.areas.meetingRoom || [this.locations.meetingRoom];
    }
    
    getMissionBoardPosition() {
        return this.locations.missionBoard;
    }
    
    // Trigger interactive element animations
    triggerMailboxFlash() {
        this.animatedElements.mailbox.flashing = true;
        this.animatedElements.mailbox.timer = 3000; // 3 seconds
    }
    
    triggerPhoneRing() {
        this.animatedElements.phone.ringing = true;
        this.animatedElements.phone.timer = 2000; // 2 seconds
    }
    
    updateAnimations(deltaTime) {
        // Update mailbox flash
        if (this.animatedElements.mailbox.flashing) {
            this.animatedElements.mailbox.timer -= deltaTime;
            if (this.animatedElements.mailbox.timer <= 0) {
                this.animatedElements.mailbox.flashing = false;
            }
        }
        
        // Update phone ring
        if (this.animatedElements.phone.ringing) {
            this.animatedElements.phone.timer -= deltaTime;
            if (this.animatedElements.phone.timer <= 0) {
                this.animatedElements.phone.ringing = false;
            }
        }
        
        // Coffee always steaming
        this.animatedElements.coffee.timer += deltaTime;
    }
    
    createDitheredTile(graphics, x, y, baseColor) {
        // Create 4-shade dithering pattern
        const patternSize = 2;
        for (let py = 0; py < this.tileHeight; py += patternSize) {
            for (let px = 0; px < this.tileWidth; px += patternSize) {
                const ditherPattern = (px / patternSize + py / patternSize) % 2;
                const color = ditherPattern ? baseColor : this.getDitherColor(baseColor);
                
                graphics.beginFill(color);
                graphics.drawRect(x + px - this.tileWidth/2, y + py - this.tileHeight/2, patternSize, patternSize);
                graphics.endFill();
            }
        }
    }
    
    getDitherColor(baseColor) {
        // Return a slightly darker version for dithering
        if (baseColor === this.colors.lightest) return this.colors.light;
        if (baseColor === this.colors.light) return this.colors.dark;
        if (baseColor === this.colors.dark) return this.colors.darkest;
        return this.colors.darkest;
    }
    
    renderTiles(container, app) {
        // Clear existing tiles
        container.removeChildren();
        
        const graphics = new PIXI.Graphics();
        
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const screenPos = this.gridToScreen(x, y);
                const centerX = app.screen.width / 2 + screenPos.x;
                const centerY = 150 + screenPos.y;
                
                // Determine tile color and type
                let tileColor = this.colors.light; // Default floor
                let specialElement = null;
                
                if (!this.isWalkable(x, y)) {
                    tileColor = this.colors.darkest; // Wall
                }
                
                // Check for special locations
                Object.keys(this.locations).forEach(key => {
                    const loc = this.locations[key];
                    if (loc.x === x && loc.y === y) {
                        specialElement = loc;
                        if (loc.type === 'desk') {
                            tileColor = this.colors.dark;
                        } else if (loc.type === 'whiteboard') {
                            tileColor = this.colors.lightest;
                        } else if (loc.type === 'coffee') {
                            tileColor = this.colors.dark;
                        }
                    }
                });
                
                // Draw GameBoy-style isometric tile with chunky borders
                graphics.lineStyle(3, this.colors.darkest, 1);
                graphics.beginFill(tileColor);
                
                // Diamond shape for isometric tile
                graphics.moveTo(centerX, centerY - this.tileHeight / 2);
                graphics.lineTo(centerX + this.tileWidth / 2, centerY);
                graphics.lineTo(centerX, centerY + this.tileHeight / 2);
                graphics.lineTo(centerX - this.tileWidth / 2, centerY);
                graphics.lineTo(centerX, centerY - this.tileHeight / 2);
                graphics.endFill();
                
                // Add special element graphics
                if (specialElement) {
                    this.renderSpecialElement(graphics, centerX, centerY, specialElement);
                }
            }
        }
        
        container.addChild(graphics);
    }
    
    renderSpecialElement(graphics, centerX, centerY, element) {
        graphics.lineStyle(2, this.colors.darkest, 1);
        
        switch (element.type) {
            case 'whiteboard':
                // Mission board - white rectangle with border
                graphics.beginFill(this.colors.lightest);
                graphics.drawRect(centerX - 12, centerY - 8, 24, 12);
                graphics.endFill();
                break;
                
            case 'mailbox':
                // Mailbox - small box
                const mailColor = this.animatedElements.mailbox.flashing ? 
                    this.colors.lightest : this.colors.dark;
                graphics.beginFill(mailColor);
                graphics.drawRect(centerX - 6, centerY - 6, 12, 12);
                graphics.endFill();
                break;
                
            case 'phone':
                // Phone/Alarm - small circle
                const phoneColor = this.animatedElements.phone.ringing ? 
                    this.colors.lightest : this.colors.dark;
                graphics.beginFill(phoneColor);
                graphics.drawCircle(centerX, centerY, 6);
                graphics.endFill();
                break;
                
            case 'coffee':
                // Coffee machine - rectangle with "steam"
                graphics.beginFill(this.colors.dark);
                graphics.drawRect(centerX - 8, centerY - 6, 16, 12);
                graphics.endFill();
                
                // Steam effect (animated dots)
                if (Math.sin(this.animatedElements.coffee.timer * 0.01) > 0) {
                    graphics.beginFill(this.colors.lightest);
                    graphics.drawCircle(centerX - 4, centerY - 12, 1);
                    graphics.drawCircle(centerX + 4, centerY - 10, 1);
                    graphics.endFill();
                }
                break;
                
            case 'files':
                // File cabinets - stacked rectangles
                graphics.beginFill(this.colors.dark);
                graphics.drawRect(centerX - 10, centerY - 4, 20, 4);
                graphics.drawRect(centerX - 10, centerY, 20, 4);
                graphics.drawRect(centerX - 10, centerY + 4, 20, 4);
                graphics.endFill();
                break;
        }
    }
}

// Export for use in other files
window.GameBoyOfficeMap = GameBoyOfficeMap;