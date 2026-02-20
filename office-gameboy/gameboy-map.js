// GameBoy Map - Retro-styled isometric layout for SpawnKit Virtual Office

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
        
        // Define locations using Pokémon universe names (via SpawnKitNames)
        const _obj = (id) => window.SpawnKitNames ? SpawnKitNames.resolveObject('gameboy', id) : id;
        const _name = (id) => window.SpawnKitNames ? SpawnKitNames.resolve('gameboy', id, 'title') : id;
        
        this.locations = {
            // Agent desks (positioned by office areas)
            hunterDesk:   { x: 3,  y: 2,  name: _name('hunter') + "'s DESK", type: 'desk', room: 'entrance' },
            forgeDesk:    { x: 13, y: 3,  name: _name('forge') + "'s DESK",  type: 'desk', room: 'server' },
            echoDesk:     { x: 2,  y: 9,  name: _name('echo') + "'s DESK",   type: 'desk', room: 'marketing' },
            atlasDesk:    { x: 13, y: 9,  name: _name('atlas') + "'s DESK",  type: 'desk', room: 'archives' },
            sentinelDesk: { x: 11, y: 2,  name: _name('sentinel') + "'s DESK", type: 'desk', room: 'audit' },
            
            // Named locations for state bridge
            missionBoard:  { x: 7,  y: 6,  name: _obj('whiteboard'), type: 'whiteboard', room: 'meeting' },
            phoneAlarm:    { x: 2,  y: 2,  name: _obj('phone'),      type: 'phone', room: 'ceo' },
            coffeeMachine: { x: 3,  y: 9,  name: _obj('coffee'),     type: 'coffee', room: 'lounge' },
            coffeeStation: { x: 3,  y: 9,  name: _obj('coffee'),     type: 'coffee', room: 'lounge' }, // Alias for backwards compatibility
            
            // Additional interactive elements
            mailbox:       { x: 2,  y: 1,  name: _obj('mailbox'),    type: 'mailbox', room: 'ceo' },
            fileCabinets:  { x: 12, y: 9,  name: _obj('cabinet'),    type: 'files', room: 'archives' },
            
            // Meeting area (center) — TALL GRASS!
            meetingRoom:   { x: 7,  y: 6,  name: _obj('door') || "TALL GRASS", area: true, room: 'meeting' }
        };
        
        // Define room areas and labels
        this.rooms = {
            ceo: {
                tiles: [{ x: 2, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 1 }, { x: 3, y: 2 }],
                label: "CEO OFFICE",
                labelPos: { x: 2.5, y: 1.5 }
            },
            server: {
                tiles: [{ x: 12, y: 2 }, { x: 13, y: 2 }, { x: 14, y: 2 }, { x: 12, y: 3 }, { x: 13, y: 3 }, { x: 14, y: 3 }],
                label: "SERVER ROOM",
                labelPos: { x: 13, y: 2.5 }
            },
            meeting: {
                tiles: [
                    { x: 6, y: 5 }, { x: 7, y: 5 }, { x: 8, y: 5 }, { x: 9, y: 5 },
                    { x: 6, y: 6 }, { x: 7, y: 6 }, { x: 8, y: 6 }, { x: 9, y: 6 },
                    { x: 6, y: 7 }, { x: 7, y: 7 }, { x: 8, y: 7 }, { x: 9, y: 7 }
                ],
                label: "MEETING ROOM",
                labelPos: { x: 7.5, y: 5.5 }
            },
            marketing: {
                tiles: [{ x: 2, y: 8 }, { x: 2, y: 9 }, { x: 3, y: 8 }, { x: 3, y: 9 }],
                label: "MARKETING",
                labelPos: { x: 2.5, y: 8.5 }
            },
            lounge: {
                tiles: [{ x: 2, y: 10 }, { x: 3, y: 10 }, { x: 4, y: 9 }, { x: 4, y: 10 }],
                label: "LOUNGE",
                labelPos: { x: 3, y: 10 }
            },
            archives: {
                tiles: [{ x: 12, y: 8 }, { x: 13, y: 8 }, { x: 12, y: 9 }, { x: 13, y: 9 }, { x: 14, y: 9 }],
                label: "ARCHIVES",
                labelPos: { x: 13, y: 8.5 }
            },
            audit: {
                tiles: [{ x: 11, y: 2 }, { x: 11, y: 3 }],
                label: "AUDIT",
                labelPos: { x: 11, y: 2.5 }
            }
        };

        // Define areas (larger than single tiles) - for backwards compatibility
        this.areas = {
            meetingRoom: this.rooms.meeting.tiles,
            missionBoardArea: [
                { x: 6, y: 6 }, { x: 7, y: 6 }, { x: 8, y: 6 }
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
                // GameBoy-style chunky borders and internal walls for room separation
                if (x === 0 || x === this.gridWidth - 1 || y === 0 || y === this.gridHeight - 1) {
                    walkable[y][x] = false; // Outer walls
                } else if (x === 1 || x === this.gridWidth - 2 || y === 1 || y === this.gridHeight - 2) {
                    walkable[y][x] = false; // Inner wall layer
                } else if (
                    // Internal walls for room separation
                    (x === 4 && y >= 3 && y <= 7) || // Vertical wall separating entrance from meeting
                    (x === 10 && y >= 3 && y <= 7) || // Vertical wall separating meeting from server/audit
                    (y === 4 && x >= 4 && x <= 6) || // Horizontal wall above meeting room
                    (y === 8 && x >= 4 && x <= 6) // Horizontal wall below meeting room  
                ) {
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
                let roomType = null;
                
                if (!this.isWalkable(x, y)) {
                    tileColor = this.colors.darkest; // Wall
                } else {
                    // Check which room this tile belongs to
                    Object.keys(this.rooms).forEach(roomName => {
                        const room = this.rooms[roomName];
                        if (room.tiles.some(tile => tile.x === x && tile.y === y)) {
                            roomType = roomName;
                            // Color rooms slightly differently
                            switch (roomName) {
                                case 'ceo': tileColor = this.colors.light; break;
                                case 'server': tileColor = this.colors.dark; break;
                                case 'meeting': tileColor = this.colors.lightest; break;
                                case 'marketing': tileColor = this.colors.light; break;
                                case 'lounge': tileColor = this.colors.light; break;
                                case 'archives': tileColor = this.colors.dark; break;
                                case 'audit': tileColor = this.colors.dark; break;
                            }
                        }
                    });
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
        
        // Add room labels
        this.renderRoomLabels(container, app);
    }
    
    renderSpecialElement(graphics, centerX, centerY, element) {
        graphics.lineStyle(2, this.colors.darkest, 1);
        
        switch (element.type) {
            case 'desk':
                // Computer desk with terminal
                graphics.beginFill(this.colors.dark);
                graphics.drawRect(centerX - 10, centerY - 6, 20, 12);
                graphics.endFill();
                // Computer screen
                graphics.beginFill(this.colors.darkest);
                graphics.drawRect(centerX - 6, centerY - 4, 12, 8);
                graphics.endFill();
                // Screen glow
                graphics.beginFill(this.colors.lightest);
                graphics.drawRect(centerX - 4, centerY - 2, 8, 4);
                graphics.endFill();
                break;
                
            case 'whiteboard':
                // Mission board - white rectangle with border and content
                graphics.beginFill(this.colors.lightest);
                graphics.drawRect(centerX - 14, centerY - 10, 28, 16);
                graphics.endFill();
                // Frame
                graphics.lineStyle(2, this.colors.darkest);
                graphics.drawRect(centerX - 14, centerY - 10, 28, 16);
                // Mission lines (fake content)
                graphics.lineStyle(1, this.colors.dark);
                graphics.moveTo(centerX - 10, centerY - 6);
                graphics.lineTo(centerX + 10, centerY - 6);
                graphics.moveTo(centerX - 10, centerY - 2);
                graphics.lineTo(centerX + 8, centerY - 2);
                graphics.moveTo(centerX - 10, centerY + 2);
                graphics.lineTo(centerX + 6, centerY + 2);
                break;
                
            case 'mailbox':
                // Mailbox - small box with slot
                const mailColor = this.animatedElements.mailbox?.flashing ? 
                    this.colors.lightest : this.colors.dark;
                graphics.beginFill(mailColor);
                graphics.drawRect(centerX - 6, centerY - 8, 12, 16);
                graphics.endFill();
                // Mail slot
                graphics.beginFill(this.colors.darkest);
                graphics.drawRect(centerX - 4, centerY - 2, 8, 2);
                graphics.endFill();
                break;
                
            case 'phone':
                // Phone/Alarm - detailed phone
                const phoneColor = this.animatedElements.phone?.ringing ? 
                    this.colors.lightest : this.colors.dark;
                graphics.beginFill(phoneColor);
                // Base
                graphics.drawRect(centerX - 8, centerY - 4, 16, 8);
                graphics.endFill();
                // Handset
                graphics.beginFill(phoneColor);
                graphics.drawRect(centerX - 6, centerY - 6, 12, 4);
                graphics.endFill();
                // Cord
                graphics.lineStyle(1, this.colors.darkest);
                graphics.moveTo(centerX, centerY - 2);
                graphics.bezierCurveTo(centerX + 2, centerY, centerX + 4, centerY + 2, centerX + 6, centerY + 4);
                break;
                
            case 'coffee':
                // Coffee machine - detailed machine
                graphics.beginFill(this.colors.dark);
                graphics.drawRect(centerX - 10, centerY - 8, 20, 16);
                graphics.endFill();
                // Window
                graphics.beginFill(this.colors.darkest);
                graphics.drawRect(centerX - 6, centerY - 4, 12, 6);
                graphics.endFill();
                // Control panel
                graphics.beginFill(this.colors.lightest);
                graphics.drawCircle(centerX - 4, centerY + 4, 2);
                graphics.drawCircle(centerX, centerY + 4, 2);
                graphics.drawCircle(centerX + 4, centerY + 4, 2);
                graphics.endFill();
                
                // Steam effect (animated dots)
                if (Math.sin(this.animatedElements.coffee?.timer * 0.01 || 0) > 0) {
                    graphics.beginFill(this.colors.lightest);
                    graphics.drawCircle(centerX - 4, centerY - 12, 1);
                    graphics.drawCircle(centerX, centerY - 14, 1);
                    graphics.drawCircle(centerX + 4, centerY - 12, 1);
                    graphics.endFill();
                }
                break;
                
            case 'files':
                // File cabinets - detailed filing system
                graphics.beginFill(this.colors.dark);
                // Main cabinet body
                graphics.drawRect(centerX - 12, centerY - 8, 24, 16);
                graphics.endFill();
                // Drawers with handles
                graphics.lineStyle(1, this.colors.darkest);
                graphics.drawRect(centerX - 10, centerY - 6, 20, 4);
                graphics.drawRect(centerX - 10, centerY - 2, 20, 4);
                graphics.drawRect(centerX - 10, centerY + 2, 20, 4);
                // Handles
                graphics.beginFill(this.colors.lightest);
                graphics.drawCircle(centerX + 6, centerY - 4, 1);
                graphics.drawCircle(centerX + 6, centerY, 1);
                graphics.drawCircle(centerX + 6, centerY + 4, 1);
                graphics.endFill();
                break;
        }
    }
    
    renderRoomLabels(container, app) {
        Object.keys(this.rooms).forEach(roomName => {
            const room = this.rooms[roomName];
            const screenPos = this.gridToScreen(room.labelPos.x, room.labelPos.y);
            const centerX = app.screen.width / 2 + screenPos.x;
            const centerY = 120 + screenPos.y; // Slightly higher than tiles
            
            // Create text sprite for room label
            const labelText = new PIXI.Text(room.label, {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: 6,
                fill: this.colors.darkest,
                align: 'center'
            });
            
            labelText.anchor.set(0.5);
            labelText.x = centerX;
            labelText.y = centerY;
            
            container.addChild(labelText);
        });
    }
}

// Export for use in other files
window.GameBoyOfficeMap = GameBoyOfficeMap;