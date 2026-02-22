/**
 * Sims Office — Main PixiJS Isometric Engine
 * ═══════════════════════════════════════════════════════
 * Renders a cozy isometric office room inspired by The Sims 1 (2000).
 * Diamond-shaped tile grid, beige walls, warm wood floors, colorful
 * furniture — all drawn procedurally with PixiJS Graphics.
 *
 * @author Echo (CMO) 🎨
 */

class SimsOfficeMap {
    constructor() {
        this.gridWidth = 12;
        this.gridHeight = 10;
        this.tileWidth = 64;
        this.tileHeight = 32;

        // Sims 1 color palette
        this.colors = {
            floorLight:  0xc09860,
            floorDark:   0xa08050,
            wallFront:   0xdcc8a0,
            wallSide:    0xc4b088,
            wallTop:     0xe8d8b8,
            shadow:      0x806040,
            desk:        0x8b6914,
            deskTop:     0xb8860b,
            computer:    0x333333,
            screen:      0x66ccff,
            screenOff:   0x444466,
            coffee:      0x554433,
            coffeeAccent:0x887766,
            cabinet:     0x666666,
            cabinetFront:0x777777,
            cooler:      0xaaddee,
            coolerBody:  0xccddee,
            plant:       0x228833,
            plantDark:   0x116622,
            pot:         0xbb6633,
            whiteboard:  0xf0f0f0,
            whiteboardBorder: 0x888888,
            chair:       0x2255aa,
            carpet:      0x445566,
            rug:         0x884422,
        };

        // Key locations (grid coordinates)
        this.locations = {
            hunterDesk:    { x: 2, y: 2, name: 'Hunter Desk', type: 'desk' },
            forgeDesk:     { x: 9, y: 2, name: 'Forge Desk',  type: 'desk' },
            echoDesk:      { x: 2, y: 7, name: 'Echo Desk',   type: 'desk' },
            atlasDesk:     { x: 9, y: 7, name: 'Atlas Desk',  type: 'desk' },
            sentinelDesk:  { x: 6, y: 2, name: 'Sentinel Desk', type: 'desk' },

            meetingRoom:   { x: 6, y: 5, name: 'Meeting Area',  type: 'meeting', area: true },
            missionBoard:  { x: 5, y: 1, name: 'Whiteboard',    type: 'whiteboard' },
            coffeeStation: { x: 1, y: 5, name: 'Coffee Machine',type: 'coffee' },
            fileCabinets:  { x: 10, y: 5, name: 'Filing Cabinet',type: 'files' },
            waterCooler:   { x: 10, y: 8, name: 'Water Cooler', type: 'cooler' },
            plant1:        { x: 0, y: 0, name: 'Plant',         type: 'plant' },
            plant2:        { x: 11, y: 0, name: 'Plant',        type: 'plant' },
            plant3:        { x: 0, y: 9, name: 'Plant',         type: 'plant' },
            plant4:        { x: 11, y: 9, name: 'Plant',        type: 'plant' },

            mailbox:       { x: 1, y: 1, name: 'Inbox',   type: 'mailbox' },
            phoneAlarm:    { x: 10, y: 1, name: 'Phone',  type: 'phone' },
        };

        // Walkable grid
        this.walkable = [];
        for (let y = 0; y < this.gridHeight; y++) {
            this.walkable[y] = [];
            for (let x = 0; x < this.gridWidth; x++) {
                this.walkable[y][x] = true;
            }
        }

        // Animation state
        this.animTime = 0;
        this.animatedElements = {
            mailbox: { flashing: false, timer: 0 },
            phone:   { ringing: false, timer: 0 },
            coffee:  { steaming: true, timer: 0 },
        };
    }

    gridToScreen(gx, gy) {
        const sx = (gx - gy) * (this.tileWidth / 2);
        const sy = (gx + gy) * (this.tileHeight / 2);
        return { x: sx, y: sy };
    }

    screenToGrid(sx, sy) {
        const gx = (sx / (this.tileWidth / 2) + sy / (this.tileHeight / 2)) / 2;
        const gy = (sy / (this.tileHeight / 2) - sx / (this.tileWidth / 2)) / 2;
        return { x: Math.floor(gx), y: Math.floor(gy) };
    }

    isWalkable(x, y) {
        if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) return false;
        return this.walkable[y][x];
    }

    getRandomWalkablePosition() {
        let tries = 0;
        while (tries < 100) {
            const x = 1 + Math.floor(Math.random() * (this.gridWidth - 2));
            const y = 1 + Math.floor(Math.random() * (this.gridHeight - 2));
            if (this.isWalkable(x, y)) return { x, y };
            tries++;
        }
        return { x: 6, y: 5 };
    }

    getMeetingPositions() {
        return [
            { x: 5, y: 4 }, { x: 6, y: 4 }, { x: 7, y: 4 },
            { x: 5, y: 5 }, { x: 6, y: 5 }, { x: 7, y: 5 },
            { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 7, y: 6 },
        ];
    }

    // ── Animation updates ─────────────────────────────
    triggerMailboxFlash() { this.animatedElements.mailbox.flashing = true; this.animatedElements.mailbox.timer = 3000; }
    triggerPhoneRing()    { this.animatedElements.phone.ringing = true; this.animatedElements.phone.timer = 2000; }

    updateAnimations(dt) {
        this.animTime += dt;
        if (this.animatedElements.mailbox.flashing) {
            this.animatedElements.mailbox.timer -= dt;
            if (this.animatedElements.mailbox.timer <= 0) this.animatedElements.mailbox.flashing = false;
        }
        if (this.animatedElements.phone.ringing) {
            this.animatedElements.phone.timer -= dt;
            if (this.animatedElements.phone.timer <= 0) this.animatedElements.phone.ringing = false;
        }
        this.animatedElements.coffee.timer += dt;
    }

    // ── Render the full room ──────────────────────────
    renderTiles(container, app) {
        container.removeChildren();
        const gfx = new PIXI.Graphics();
        const hw = this.tileWidth / 2;
        const hh = this.tileHeight / 2;
        const ox = app.screen.width / 2;
        const oy = 80;

        // ── Floor tiles ──
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const sp = this.gridToScreen(x, y);
                const cx = ox + sp.x;
                const cy = oy + sp.y;
                const color = (x + y) % 2 === 0 ? this.colors.floorLight : this.colors.floorDark;

                gfx.beginFill(color);
                gfx.moveTo(cx, cy - hh);
                gfx.lineTo(cx + hw, cy);
                gfx.lineTo(cx, cy + hh);
                gfx.lineTo(cx - hw, cy);
                gfx.closePath();
                gfx.endFill();

                // Subtle tile edge
                gfx.lineStyle(1, this.colors.shadow, 0.15);
                gfx.moveTo(cx, cy - hh);
                gfx.lineTo(cx + hw, cy);
                gfx.lineTo(cx, cy + hh);
                gfx.lineTo(cx - hw, cy);
                gfx.closePath();
                gfx.lineStyle(0);
            }
        }

        // ── Walls (back-left & back-right) ──
        this._drawWalls(gfx, ox, oy);

        // ── Furniture (ordered back-to-front for depth) ──
        const furnitureList = [];
        Object.keys(this.locations).forEach(key => {
            const loc = this.locations[key];
            furnitureList.push({ key, ...loc, depth: loc.x + loc.y });
        });
        furnitureList.sort((a, b) => a.depth - b.depth);

        furnitureList.forEach(item => {
            const sp = this.gridToScreen(item.x, item.y);
            const cx = ox + sp.x;
            const cy = oy + sp.y;
            this._drawFurniture(gfx, cx, cy, item.type, item.key);
        });

        container.addChild(gfx);
    }

    _drawWalls(gfx, ox, oy) {
        const wallHeight = 60;
        const hw = this.tileWidth / 2;
        const hh = this.tileHeight / 2;

        // Back-left wall (y = 0 edge)
        for (let x = 0; x < this.gridWidth; x++) {
            const sp = this.gridToScreen(x, 0);
            const cx = ox + sp.x;
            const cy = oy + sp.y;

            // Wall face
            gfx.beginFill(this.colors.wallFront);
            gfx.moveTo(cx - hw, cy);
            gfx.lineTo(cx - hw, cy - wallHeight);
            gfx.lineTo(cx, cy - hh - wallHeight);
            gfx.lineTo(cx, cy - hh);
            gfx.closePath();
            gfx.endFill();

            // Wall top
            gfx.beginFill(this.colors.wallTop);
            gfx.moveTo(cx - hw, cy - wallHeight);
            gfx.lineTo(cx, cy - hh - wallHeight);
            gfx.lineTo(cx + hw, cy - wallHeight);
            gfx.lineTo(cx, cy + hh - wallHeight);
            gfx.closePath();
            gfx.endFill();
        }

        // Back-right wall (x = 0 edge)
        for (let y = 0; y < this.gridHeight; y++) {
            const sp = this.gridToScreen(0, y);
            const cx = ox + sp.x;
            const cy = oy + sp.y;

            gfx.beginFill(this.colors.wallSide);
            gfx.moveTo(cx - hw, cy);
            gfx.lineTo(cx - hw, cy - wallHeight);
            gfx.lineTo(cx, cy + hh - wallHeight);
            gfx.lineTo(cx, cy + hh);
            gfx.closePath();
            gfx.endFill();

            gfx.beginFill(this.colors.wallTop);
            gfx.moveTo(cx - hw, cy - wallHeight);
            gfx.lineTo(cx, cy - hh - wallHeight);
            gfx.lineTo(cx + hw, cy - wallHeight);
            gfx.lineTo(cx, cy + hh - wallHeight);
            gfx.closePath();
            gfx.endFill();
        }
    }

    _drawFurniture(gfx, cx, cy, type, key) {
        switch (type) {
            case 'desk':     this._drawDesk(gfx, cx, cy); break;
            case 'whiteboard': this._drawWhiteboard(gfx, cx, cy); break;
            case 'coffee':   this._drawCoffeeMachine(gfx, cx, cy); break;
            case 'files':    this._drawFilingCabinet(gfx, cx, cy); break;
            case 'cooler':   this._drawWaterCooler(gfx, cx, cy); break;
            case 'plant':    this._drawPlant(gfx, cx, cy); break;
            case 'mailbox':  this._drawMailbox(gfx, cx, cy); break;
            case 'phone':    this._drawPhone(gfx, cx, cy); break;
            case 'meeting':  this._drawMeetingTable(gfx, cx, cy); break;
        }
    }

    _drawDesk(gfx, cx, cy) {
        // Desk surface (isometric box)
        const w = 26, h = 4, d = 18;
        gfx.beginFill(this.colors.deskTop);
        gfx.moveTo(cx, cy - h - d/2);
        gfx.lineTo(cx + w, cy - h);
        gfx.lineTo(cx, cy - h + d/2);
        gfx.lineTo(cx - w, cy - h);
        gfx.closePath();
        gfx.endFill();

        // Front face
        gfx.beginFill(this.colors.desk);
        gfx.moveTo(cx - w, cy - h);
        gfx.lineTo(cx, cy - h + d/2);
        gfx.lineTo(cx, cy + d/2);
        gfx.lineTo(cx - w, cy);
        gfx.closePath();
        gfx.endFill();

        // Side face
        gfx.beginFill(0x7a5c12);
        gfx.moveTo(cx, cy - h + d/2);
        gfx.lineTo(cx + w, cy - h);
        gfx.lineTo(cx + w, cy);
        gfx.lineTo(cx, cy + d/2);
        gfx.closePath();
        gfx.endFill();

        // Monitor
        gfx.beginFill(this.colors.computer);
        gfx.drawRect(cx - 8, cy - h - 18, 14, 12);
        gfx.endFill();

        // Screen glow
        gfx.beginFill(this.colors.screen);
        gfx.drawRect(cx - 6, cy - h - 16, 10, 8);
        gfx.endFill();

        // Monitor stand
        gfx.beginFill(this.colors.computer);
        gfx.drawRect(cx - 2, cy - h - 6, 3, 3);
        gfx.endFill();
    }

    _drawWhiteboard(gfx, cx, cy) {
        gfx.beginFill(this.colors.whiteboard);
        gfx.drawRect(cx - 20, cy - 36, 40, 28);
        gfx.endFill();
        gfx.lineStyle(2, this.colors.whiteboardBorder);
        gfx.drawRect(cx - 20, cy - 36, 40, 28);
        gfx.lineStyle(0);

        // Scribbles
        gfx.lineStyle(1, 0x3366cc, 0.6);
        gfx.moveTo(cx - 14, cy - 30); gfx.lineTo(cx + 10, cy - 30);
        gfx.moveTo(cx - 14, cy - 25); gfx.lineTo(cx + 6, cy - 25);
        gfx.moveTo(cx - 14, cy - 20); gfx.lineTo(cx + 14, cy - 20);
        gfx.lineStyle(1, 0xcc3333, 0.5);
        gfx.moveTo(cx - 14, cy - 15); gfx.lineTo(cx + 4, cy - 15);
        gfx.lineStyle(0);
    }

    _drawCoffeeMachine(gfx, cx, cy) {
        // Body
        gfx.beginFill(this.colors.coffee);
        gfx.drawRect(cx - 10, cy - 20, 20, 20);
        gfx.endFill();
        // Accent
        gfx.beginFill(this.colors.coffeeAccent);
        gfx.drawRect(cx - 8, cy - 16, 16, 4);
        gfx.endFill();
        // Mug
        gfx.beginFill(0xffffff);
        gfx.drawRect(cx - 3, cy - 4, 8, 6);
        gfx.endFill();
        // Steam
        gfx.beginFill(0xffffff, 0.4);
        gfx.drawCircle(cx, cy - 8, 2);
        gfx.drawCircle(cx + 3, cy - 11, 1.5);
        gfx.endFill();
    }

    _drawFilingCabinet(gfx, cx, cy) {
        gfx.beginFill(this.colors.cabinet);
        gfx.drawRect(cx - 12, cy - 24, 24, 24);
        gfx.endFill();
        // Drawers
        gfx.beginFill(this.colors.cabinetFront);
        gfx.drawRect(cx - 10, cy - 22, 20, 6);
        gfx.drawRect(cx - 10, cy - 14, 20, 6);
        gfx.drawRect(cx - 10, cy - 6, 20, 6);
        gfx.endFill();
        // Handles
        gfx.beginFill(0xaaaaaa);
        gfx.drawRect(cx - 2, cy - 20, 4, 2);
        gfx.drawRect(cx - 2, cy - 12, 4, 2);
        gfx.drawRect(cx - 2, cy - 4, 4, 2);
        gfx.endFill();
    }

    _drawWaterCooler(gfx, cx, cy) {
        // Bottle
        gfx.beginFill(this.colors.cooler, 0.7);
        gfx.drawRect(cx - 5, cy - 28, 10, 14);
        gfx.endFill();
        // Body
        gfx.beginFill(this.colors.coolerBody);
        gfx.drawRect(cx - 8, cy - 14, 16, 14);
        gfx.endFill();
        // Tap
        gfx.beginFill(0xff4444);
        gfx.drawRect(cx + 6, cy - 10, 4, 3);
        gfx.endFill();
    }

    _drawPlant(gfx, cx, cy) {
        // Pot
        gfx.beginFill(this.colors.pot);
        gfx.moveTo(cx - 8, cy - 8);
        gfx.lineTo(cx + 8, cy - 8);
        gfx.lineTo(cx + 6, cy);
        gfx.lineTo(cx - 6, cy);
        gfx.closePath();
        gfx.endFill();
        // Leaves
        gfx.beginFill(this.colors.plant);
        gfx.drawCircle(cx, cy - 14, 8);
        gfx.drawCircle(cx - 5, cy - 18, 6);
        gfx.drawCircle(cx + 5, cy - 18, 6);
        gfx.drawCircle(cx, cy - 22, 5);
        gfx.endFill();
        gfx.beginFill(this.colors.plantDark);
        gfx.drawCircle(cx - 3, cy - 16, 3);
        gfx.drawCircle(cx + 4, cy - 20, 2);
        gfx.endFill();
    }

    _drawMailbox(gfx, cx, cy) {
        const flash = this.animatedElements.mailbox.flashing;
        gfx.beginFill(flash ? 0xffcc00 : 0x6688bb);
        gfx.drawRect(cx - 8, cy - 14, 16, 14);
        gfx.endFill();
        gfx.beginFill(0xffffff);
        gfx.drawRect(cx - 5, cy - 10, 10, 3);
        gfx.endFill();
    }

    _drawPhone(gfx, cx, cy) {
        const ring = this.animatedElements.phone.ringing;
        gfx.beginFill(ring ? 0xff4444 : 0x333333);
        gfx.drawRect(cx - 6, cy - 10, 12, 10);
        gfx.endFill();
        gfx.beginFill(0x888888);
        gfx.drawRect(cx - 4, cy - 8, 8, 4);
        gfx.endFill();
    }

    _drawMeetingTable(gfx, cx, cy) {
        // Round-ish meeting table (isometric ellipse)
        gfx.beginFill(this.colors.deskTop);
        gfx.drawEllipse(cx, cy - 4, 22, 11);
        gfx.endFill();
        // Table edge
        gfx.beginFill(this.colors.desk);
        gfx.drawEllipse(cx, cy, 22, 11);
        gfx.endFill();
        gfx.beginFill(this.colors.deskTop);
        gfx.drawEllipse(cx, cy - 3, 22, 11);
        gfx.endFill();
    }
}

// ── Main Office Engine ────────────────────────────────

class SimsVirtualOffice {
    constructor() {
        this.app = null;
        this.officeMap = null;
        this.characterManager = null;
        this.stateBridge = null;
        this.simsUI = null;
        this.simsEffects = null;

        this.mapContainer = null;
        this.characterContainer = null;
        this.effectsContainer = null;

        this.lastTime = performance.now();
        this.frameCount = 0;
        this.fps = 0;

        this.init();
    }

    async init() {
        try {
            this.app = new PIXI.Application({
                width: 900,
                height: 560,
                backgroundColor: 0xf0e0c0,
                antialias: false,
                resolution: 1,
                autoDensity: false,
            });

            PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;

            const container = document.getElementById('gameContainer');
            if (!container) { console.warn('🏠 Sims: #gameContainer not found'); return; }
            container.appendChild(this.app.view);
            this.app.view.style.imageRendering = 'pixelated';

            this.setupContainers();
            this.createSystems();
            this.app.ticker.add(this.gameLoop.bind(this));

            console.log('🏠 Sims Virtual Office initialized!');
            
        } catch (error) {
            console.warn('🏠 Sims: PixiJS renderer failed, showing fallback', error);
            this.showWebGLFallback();
        }
    }
    
    showWebGLFallback() {
        const container = document.getElementById('gameContainer');
        if (!container) return;
        
        container.innerHTML = `
            <div style="
                width: 900px; height: 560px; 
                background: linear-gradient(135deg, #f0e0c0, #e8d4a0);
                border: 4px solid #8b4513;
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                font-family: 'Georgia', serif; color: #654321; text-align: center; gap: 16px;
            ">
                <div style="font-size: 24px; color: #8b4513;">🏠</div>
                <div style="font-size: 16px; font-weight: bold; color: #654321;">Sims Office</div>
                <div style="font-size: 14px; max-width: 300px; line-height: 1.5;">
                    This theme requires WebGL support.<br>
                    Try the <a href="../office-executive/" style="color: #cd853f; text-decoration: none;">Executive</a> 
                    or <a href="../office-simcity/" style="color: #cd853f; text-decoration: none;">SimCity</a> themes instead.
                </div>
            </div>
        `;
    }

    setupContainers() {
        this.mapContainer = new PIXI.Container();
        this.characterContainer = new PIXI.Container();
        this.effectsContainer = new PIXI.Container();

        this.app.stage.addChild(this.mapContainer);
        this.app.stage.addChild(this.characterContainer);
        this.app.stage.addChild(this.effectsContainer);
    }

    createSystems() {
        this.officeMap = new SimsOfficeMap();
        this.officeMap.renderTiles(this.mapContainer, this.app);

        this.characterManager = new SimsCharacterManager(this.officeMap, this.app);
        this.characterContainer.x = this.app.screen.width / 2;
        this.characterContainer.y = 80;
        this.characterContainer.addChild(this.characterManager.container);

        this.stateBridge = new SimsStateBridge(this.characterManager, this.officeMap);

        if (typeof SimsEffects !== 'undefined') {
            this.simsEffects = new SimsEffects(this.effectsContainer, this.officeMap, this.app);
        }

        // Set up the HTML UI
        if (typeof SimsUI !== 'undefined') {
            this.simsUI = new SimsUI(this.characterManager, this.officeMap);
        }

        setTimeout(() => {
            this.stateBridge?.triggerWhiteboardSession();
        }, 4000);
    }

    gameLoop(delta) {
        const now = performance.now();
        const dt = now - this.lastTime;
        this.lastTime = now;

        this.characterManager?.update(dt);
        this.stateBridge?.update(dt);
        this.officeMap?.updateAnimations(dt);

        if (this.simsEffects) this.simsEffects.update(dt);
        if (this.simsUI) this.simsUI.update(dt);

        this.frameCount++;
        if (this.frameCount % 60 === 0) {
            this.fps = Math.round(1000 / (dt || 1));
        }
    }

    // Public API
    triggerMeeting()    { this.stateBridge?.triggerGroupMeeting(); }
    triggerCelebration(){ this.stateBridge?.triggerCelebration(); }
    triggerWhiteboard() { this.stateBridge?.triggerWhiteboardSession(); }

    getOfficeStatus() {
        return {
            characters: this.characterManager?.characters?.length || 0,
            fps: this.fps,
            theme: 'sims',
        };
    }
}

// ── Bootstrap ─────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    window.simsOffice = new SimsVirtualOffice();
});

window.SimsOfficeMap = SimsOfficeMap;
window.SimsVirtualOffice = SimsVirtualOffice;
