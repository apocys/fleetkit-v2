// GameBoy Color Map - Retro-styled isometric layout for SpawnKit Virtual Office
// Full color edition — warm navy/teal/gold palette

class GameBoyOfficeMap {
    constructor() {
        this.gridWidth = 16;
        this.gridHeight = 12;
        this.tileWidth = 32;
        this.tileHeight = 16;
        
        // GBC color palette
        this.colors = {
            lightest: 0xE2C275,  // Warm gold
            light: 0x53868B,     // Teal
            dark: 0x16213E,      // Dark blue
            darkest: 0x1A1A2E    // Deep navy
        };
        
        // Extended colors for map elements
        this.mapColors = {
            floorMain:    0x1E2A4A,  // Floor — slightly lighter navy
            floorAlt:     0x1A2340,  // Floor alternate (dither)
            wall:         0x0F1A30,  // Walls — darkest navy
            wallBorder:   0x53868B,  // Wall border — teal
            deskSurface:  0x3D2B1F,  // Desk — warm dark brown
            deskHighlight:0x5C4033,  // Desk highlight — lighter brown
            whiteboard:   0xF5E6C8,  // Whiteboard — cream
            coffee:       0x5C4033,  // Coffee machine — brown
            meetingGrass: 0x2D5A3D,  // Meeting area — dark forest green
            meetingGrassLight: 0x3A7D52,  // Meeting area lighter — green
            mailbox:      0xC0392B,  // Mailbox — red
            phone:        0x4A90D9,  // Phone — blue
            files:        0xA0A0B0,  // File cabinets — silver
        };
        
        // Define locations using Pokémon universe names (via SpawnKitNames)
        const _obj = (id) => window.SpawnKitNames ? SpawnKitNames.resolveObject('gameboy', id) : id;
        const _name = (id) => window.SpawnKitNames ? SpawnKitNames.resolve('gameboy-color', id, 'title') : id;
        
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
                if (x <= 1 || x >= this.gridWidth - 2 || y <= 1 || y >= this.gridHeight - 2) {
                    walkable[y][x] = false;
                } else {
                    walkable[y][x] = true;
                }
            }
        }
        return walkable;
    }
    
    gridToScreen(gridX, gridY) {
        const screenX = (gridX - gridY) * (this.tileWidth / 2);
        const screenY = (gridX + gridY) * (this.tileHeight / 2);
        return { x: screenX, y: screenY };
    }
    
    screenToGrid(screenX, screenY) {
        const gridX = (screenX / (this.tileWidth / 2) + screenY / (this.tileHeight / 2)) / 2;
        const gridY = (screenY / (this.tileHeight / 2) - screenX / (this.tileWidth / 2)) / 2;
        return { x: Math.floor(gridX), y: Math.floor(gridY) };
    }
    
    isWalkable(x, y) {
        if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) {
            return false;
        }
        return this.walkable[y]?.[x] ?? false;
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
        return { x: 8, y: 6 };
    }
    
    getMeetingPositions() {
        return this.areas?.meetingRoom || [this.locations?.meetingRoom || { x: 8, y: 6 }];
    }
    
    getMissionBoardPosition() {
        return this.locations?.missionBoard || { x: 4, y: 6 };
    }
    
    triggerMailboxFlash() {
        this.animatedElements.mailbox.flashing = true;
        this.animatedElements.mailbox.timer = 3000;
    }
    
    triggerPhoneRing() {
        this.animatedElements.phone.ringing = true;
        this.animatedElements.phone.timer = 2000;
    }
    
    updateAnimations(deltaTime) {
        if (this.animatedElements.mailbox.flashing) {
            this.animatedElements.mailbox.timer -= deltaTime;
            if (this.animatedElements.mailbox.timer <= 0) {
                this.animatedElements.mailbox.flashing = false;
            }
        }
        
        if (this.animatedElements.phone.ringing) {
            this.animatedElements.phone.timer -= deltaTime;
            if (this.animatedElements.phone.timer <= 0) {
                this.animatedElements.phone.ringing = false;
            }
        }
        
        this.animatedElements.coffee.timer += deltaTime;
    }
    
    /**
     * Check if a position is in the meeting area (tall grass)
     */
    isInMeetingArea(x, y) {
        return (this.areas?.meetingRoom || []).some(pos => pos.x === x && pos.y === y);
    }
    
    createDitheredTile(graphics, x, y, baseColor) {
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
        // Return a slightly different shade for dithering
        if (baseColor === this.mapColors.floorMain) return this.mapColors.floorAlt;
        if (baseColor === this.mapColors.meetingGrass) return this.mapColors.meetingGrassLight;
        if (baseColor === this.colors.lightest) return this.colors.light;
        if (baseColor === this.colors.light) return this.colors.dark;
        return this.colors.darkest;
    }
    
    renderTiles(container, app) {
        container.removeChildren();
        
        const graphics = new PIXI.Graphics();
        
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const screenPos = this.gridToScreen(x, y);
                const centerX = app.screen.width / 2 + screenPos.x;
                const centerY = 150 + screenPos.y;
                
                let tileColor = this.mapColors.floorMain; // Default floor — dark navy
                let borderColor = this.colors.dark;        // Subtle borders
                let specialElement = null;
                
                if (!this.isWalkable(x, y)) {
                    tileColor = this.mapColors.wall;     // Wall — darkest
                    borderColor = this.mapColors.wallBorder; // Teal wall borders
                }
                
                // Meeting area — tall grass green
                if (this.isInMeetingArea(x, y)) {
                    tileColor = this.mapColors.meetingGrass;
                    borderColor = this.mapColors.meetingGrassLight;
                }
                
                // Check for special locations
                Object.keys(this.locations).forEach(key => {
                    const loc = this.locations[key];
                    if (loc.x === x && loc.y === y) {
                        specialElement = loc;
                        if (loc.type === 'desk') {
                            tileColor = this.mapColors.deskSurface;
                            borderColor = this.mapColors.deskHighlight;
                        } else if (loc.type === 'whiteboard') {
                            tileColor = this.mapColors.whiteboard;
                            borderColor = this.colors.light;
                        } else if (loc.type === 'coffee') {
                            tileColor = this.mapColors.coffee;
                            borderColor = this.mapColors.deskHighlight;
                        }
                    }
                });
                
                // Draw GBC-style isometric tile
                graphics.lineStyle(2, borderColor, 0.7);
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
                // Mission board — cream rectangle with teal border
                graphics.lineStyle(2, this.colors.light, 1);
                graphics.beginFill(this.mapColors.whiteboard);
                graphics.drawRect(centerX - 12, centerY - 8, 24, 12);
                graphics.endFill();
                // Text lines on whiteboard
                graphics.lineStyle(1, this.colors.light, 0.5);
                graphics.moveTo(centerX - 8, centerY - 4);
                graphics.lineTo(centerX + 8, centerY - 4);
                graphics.moveTo(centerX - 8, centerY - 1);
                graphics.lineTo(centerX + 6, centerY - 1);
                break;
                
            case 'mailbox':
                // Mailbox — red
                const mailColor = this.animatedElements.mailbox.flashing ? 
                    this.colors.lightest : this.mapColors.mailbox;
                graphics.lineStyle(2, this.colors.darkest, 1);
                graphics.beginFill(mailColor);
                graphics.drawRect(centerX - 6, centerY - 6, 12, 12);
                graphics.endFill();
                // Flag
                if (this.animatedElements.mailbox.flashing) {
                    graphics.beginFill(this.colors.lightest);
                    graphics.drawRect(centerX + 5, centerY - 10, 2, 6);
                    graphics.endFill();
                }
                break;
                
            case 'phone':
                // Phone — blue circle
                const phoneColor = this.animatedElements.phone.ringing ? 
                    this.colors.lightest : this.mapColors.phone;
                graphics.lineStyle(2, this.colors.darkest, 1);
                graphics.beginFill(phoneColor);
                graphics.drawCircle(centerX, centerY, 6);
                graphics.endFill();
                // Ring waves when ringing
                if (this.animatedElements.phone.ringing) {
                    graphics.lineStyle(1, this.colors.lightest, 0.5);
                    graphics.drawCircle(centerX, centerY, 9);
                    graphics.drawCircle(centerX, centerY, 12);
                }
                break;
                
            case 'coffee':
                // Coffee machine — brown rectangle with steam
                graphics.lineStyle(2, this.colors.darkest, 1);
                graphics.beginFill(this.mapColors.coffee);
                graphics.drawRect(centerX - 8, centerY - 6, 16, 12);
                graphics.endFill();
                
                // Cup (small lighter shape)
                graphics.beginFill(this.mapColors.whiteboard);
                graphics.drawRect(centerX - 3, centerY - 2, 6, 5);
                graphics.endFill();
                
                // Steam effect (warm gold dots)
                if (Math.sin(this.animatedElements.coffee.timer * 0.01) > 0) {
                    graphics.beginFill(this.colors.lightest, 0.6);
                    graphics.drawCircle(centerX - 4, centerY - 12, 1);
                    graphics.drawCircle(centerX + 4, centerY - 10, 1);
                    graphics.drawCircle(centerX, centerY - 14, 1);
                    graphics.endFill();
                }
                break;
                
            case 'files':
                // File cabinets — silver stacked rectangles
                graphics.lineStyle(1, this.colors.darkest, 1);
                graphics.beginFill(this.mapColors.files);
                graphics.drawRect(centerX - 10, centerY - 4, 20, 4);
                graphics.drawRect(centerX - 10, centerY, 20, 4);
                graphics.drawRect(centerX - 10, centerY + 4, 20, 4);
                graphics.endFill();
                // Handles
                graphics.beginFill(this.colors.lightest);
                graphics.drawRect(centerX - 2, centerY - 3, 4, 2);
                graphics.drawRect(centerX - 2, centerY + 1, 4, 2);
                graphics.drawRect(centerX - 2, centerY + 5, 4, 2);
                graphics.endFill();
                break;
        }
    }
}

// Export for use in other files
window.GameBoyOfficeMap = GameBoyOfficeMap;
