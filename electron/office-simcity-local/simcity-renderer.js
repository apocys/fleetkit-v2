/**
 * SimCity Renderer - Isometric City Engine
 * 
 * Isometric rendering system with:
 * - 2.5D isometric projection
 * - Tile-based grid system
 * - Building sprite rendering
 * - Agent animation
 * - Performance optimizations
 * 
 * Cathedral Quality: Clean, efficient, extensible
 */

class SimCityRenderer {
    constructor(ctx, width, height) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        
        // Isometric settings
        this.tileSize = 32; // Base tile size in pixels
        this.tileWidth = this.tileSize;
        this.tileHeight = this.tileSize / 2; // Isometric ratio
        
        // Grid settings
        this.gridWidth = 32;  // Grid tiles wide
        this.gridHeight = 24; // Grid tiles tall
        
        // Vibrant miniature diorama palette inspired by visual references
        this.colors = {
            // Background - warm gradient from sky to grass
            sky: '#FFB3DA',          // Soft pink sky
            skyMid: '#87CEEB',       // Transitional blue
            skyLight: '#FFEAA7',     // Warm cream horizon
            
            // Ground - varied greens with warmth
            grass: '#55E6A5',        // Bright mint green
            grassLight: '#81ECEC',   // Aqua-mint
            grassDark: '#00B894',    // Deep emerald
            grassVariant: '#FDCB6E', // Golden grass patches
            
            // Infrastructure - warm oranges and yellows
            road: '#FD79A8',         // Warm coral-pink roads
            roadLines: '#FDCB6E',    // Golden road markings
            shadow: 'rgba(74, 20, 140, 0.15)', // Soft purple shadow
            highlight: 'rgba(255,255,255,0.6)', // Strong highlight for 3D pop
            
            // Building palette - vibrant miniature world colors
            office: {
                base: '#74b9ff',     // Bright blue
                roof: '#0984e3',     // Deep blue
                accent: '#a29bfe',   // Soft purple accent
                windows: '#ffffff'   // Clean white windows
            },
            factory: {
                base: '#fd79a8',     // Coral pink
                roof: '#e84393',     // Deep pink
                accent: '#fdcb6e',   // Golden yellow accent
                windows: '#2d3436'   // Dark windows for industrial feel
            },
            lab: {
                base: '#fd79a8',     // Bright magenta-pink
                roof: '#e84393',     // Deep magenta
                accent: '#00b894',   // Contrasting teal
                windows: '#00cec9'   // Bright cyan windows
            },
            datacenter: {
                base: '#00b894',     // Bright teal
                roof: '#00695c',     // Deep teal
                accent: '#55efc4',   // Light mint accent
                windows: '#74b9ff'   // Blue server lights
            },
            
            // Environmental elements - miniature world details
            tree: {
                trunk: '#8B4513',
                crown: '#00b894',
                flowers: ['#fd79a8', '#fdcb6e', '#a29bfe', '#55efc4']
            },
            lamppost: {
                base: '#b2bec3',
                light: '#fdcb6e',
                glow: 'rgba(253, 203, 110, 0.4)'
            }
        };
        
        // Pre-calculated isometric transformation matrix
        this.isoMatrix = {
            xx: Math.cos(Math.PI / 6),  //  cos(30°) ≈ 0.866
            xy: -Math.sin(Math.PI / 6), // -sin(30°) ≈ -0.5
            yx: Math.sin(Math.PI / 6),  //  sin(30°) ≈ 0.5
            yy: Math.cos(Math.PI / 6)   //  cos(30°) ≈ 0.866
        };
        
        // Sprite cache for buildings and agents
        this.spriteCache = new Map();
        
        // Performance optimizations
        this.lastGridRender = 0;
        this.gridCacheCanvas = null;
        this.needsGridRedraw = true;
        
        console.log('🎨 SimCity Renderer initialized');
        this.initializeSprites();
    }
    
    initializeSprites() {
        // Create procedural sprites for buildings and agents
        // This avoids needing external image files for City Engine
        this.createBuildingSprites();
        this.createAgentSprites();
        console.log('🖼️ Procedural sprites generated');
    }
    
    createBuildingSprites() {
        const buildingTypes = ['office', 'factory', 'lab', 'datacenter'];
        
        buildingTypes.forEach(type => {
            this.spriteCache.set(`building_${type}`, this.generateBuildingSprite(type));
        });
    }
    
    generateBuildingSprite(type) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Larger voxel buildings for miniature diorama detail
        const width = this.tileWidth * 3.5;
        const height = this.tileHeight * 6;
        
        canvas.width = width;
        canvas.height = height;
        
        const scheme = this.colors[type];
        
        // Draw cute miniature isometric voxel building
        this.drawMiniatureDioramaBuilding(ctx, type, width, height, scheme);
        
        return canvas;
    }
    
    drawMiniatureDioramaBuilding(ctx, type, width, height, scheme) {
        // Miniature diorama building specifications - cute and detailed
        const specs = {
            office: { 
                levels: 3, baseWidth: 0.75, roofStyle: 'modern', 
                details: ['windows', 'entrance', 'balconies', 'planters'],
                personality: 'sleek'
            },
            factory: { 
                levels: 2, baseWidth: 0.85, roofStyle: 'industrial', 
                details: ['large-windows', 'loading-dock', 'chimney', 'pipes'],
                personality: 'robust'
            },
            lab: { 
                levels: 2, baseWidth: 0.7, roofStyle: 'dome', 
                details: ['sci-windows', 'antenna', 'observatory', 'greenhouse'],
                personality: 'futuristic'
            },
            datacenter: { 
                levels: 5, baseWidth: 0.9, roofStyle: 'server', 
                details: ['server-lights', 'cooling-towers', 'satellite', 'cables'],
                personality: 'tech'
            }
        };
        
        const spec = specs[type];
        const baseWidth = width * spec.baseWidth;
        const levelHeight = height / (spec.levels + 2); // Extra space for roof details
        
        // Drop shadow first for tilt-shift effect
        this.drawMiniatureDropShadow(ctx, width, height, scheme);
        
        // Draw building levels with cute miniature details
        for (let level = 0; level < spec.levels; level++) {
            const y = height - ((level + 2) * levelHeight);
            const levelWidth = baseWidth - (level * 6); // More dramatic taper
            const x = (width - levelWidth) / 2;
            
            // Bright base color with soft gradients
            this.drawMiniatureVoxelLevel(ctx, x, y, levelWidth, levelHeight, scheme, level, spec.personality);
        }
        
        // Draw detailed roof structure
        const roofY = height - ((spec.levels + 1) * levelHeight);
        this.drawMiniatureRoof(ctx, width/3, roofY, baseWidth*0.7, levelHeight, spec.roofStyle, scheme);
        
        // Add charming miniature details
        this.drawMiniatureBuildingDetails(ctx, type, width, height, spec.details, scheme);
    }
    
    drawMiniatureDropShadow(ctx, width, height, scheme) {
        // Tilt-shift style drop shadow for miniature effect
        const shadowOffset = 8;
        const shadowBlur = 12;
        
        // Create gradient shadow
        const shadowGradient = ctx.createRadialGradient(
            width/2 + shadowOffset, height + shadowOffset/2, 0,
            width/2 + shadowOffset, height + shadowOffset/2, width * 0.7
        );
        shadowGradient.addColorStop(0, 'rgba(74, 20, 140, 0.3)');
        shadowGradient.addColorStop(1, 'rgba(74, 20, 140, 0)');
        
        ctx.fillStyle = shadowGradient;
        ctx.fillRect(shadowOffset, height - 4, width, shadowBlur);
    }

    drawMiniatureVoxelLevel(ctx, x, y, width, height, scheme, level, personality) {
        // Draw miniature voxel building level with 3D isometric projection
        
        // Create soft gradient for the main face
        const faceGradient = ctx.createLinearGradient(x, y, x + width * 0.6, y + height);
        faceGradient.addColorStop(0, this.adjustBrightness(scheme.base, 1.1));
        faceGradient.addColorStop(1, scheme.base);
        
        // Front face with gradient
        ctx.fillStyle = faceGradient;
        ctx.fillRect(x, y, width * 0.6, height);
        
        // Right face (darker for 3D depth)
        const sideGradient = ctx.createLinearGradient(x + width * 0.6, y, x + width, y + height);
        sideGradient.addColorStop(0, this.adjustBrightness(scheme.base, 0.7));
        sideGradient.addColorStop(1, this.adjustBrightness(scheme.base, 0.5));
        
        ctx.fillStyle = sideGradient;
        ctx.beginPath();
        ctx.moveTo(x + width * 0.6, y);
        ctx.lineTo(x + width, y - height * 0.3);
        ctx.lineTo(x + width, y + height - height * 0.3);
        ctx.lineTo(x + width * 0.6, y + height);
        ctx.closePath();
        ctx.fill();
        
        // Top face (brightest for 3D effect)
        const topGradient = ctx.createLinearGradient(x, y, x + width, y - height * 0.3);
        topGradient.addColorStop(0, this.adjustBrightness(scheme.base, 1.3));
        topGradient.addColorStop(1, this.adjustBrightness(scheme.base, 1.1));
        
        ctx.fillStyle = topGradient;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + width * 0.4, y - height * 0.3);
        ctx.lineTo(x + width, y - height * 0.3);
        ctx.lineTo(x + width * 0.6, y);
        ctx.closePath();
        ctx.fill();
        
        // Crisp edge highlighting for clean voxel look
        ctx.strokeStyle = this.colors.highlight;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        // Front edges
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + height);
        ctx.moveTo(x + width * 0.6, y);
        ctx.lineTo(x + width * 0.6, y + height);
        // Top edges
        ctx.moveTo(x, y);
        ctx.lineTo(x + width * 0.4, y - height * 0.3);
        ctx.moveTo(x + width * 0.6, y);
        ctx.lineTo(x + width, y - height * 0.3);
        ctx.stroke();
        
        // Add cute miniature windows
        this.drawMiniatureWindows(ctx, x, y, width * 0.6, height, level, scheme.windows);
    }
    
    drawMiniatureWindows(ctx, x, y, width, height, level, windowColor) {
        // Cute miniature windows for diorama buildings
        const windowSize = Math.max(4, Math.min(8, width / 6));
        const spacing = windowSize * 1.8;
        const cols = Math.floor((width - spacing) / spacing);
        const rows = Math.floor((height - spacing) / spacing);
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const wx = x + spacing + (col * spacing);
                const wy = y + spacing + (row * spacing);
                
                // Draw window with soft glow effect
                const windowGradient = ctx.createRadialGradient(
                    wx + windowSize/2, wy + windowSize/2, 0,
                    wx + windowSize/2, wy + windowSize/2, windowSize
                );
                windowGradient.addColorStop(0, windowColor);
                windowGradient.addColorStop(1, this.adjustBrightness(windowColor, 0.7));
                
                ctx.fillStyle = windowGradient;
                ctx.fillRect(wx, wy, windowSize, windowSize);
                
                // Add window frame for detail
                ctx.strokeStyle = this.adjustBrightness(windowColor, 0.5);
                ctx.lineWidth = 1;
                ctx.strokeRect(wx, wy, windowSize, windowSize);
                
                // Random window "activity" - some windows glow brighter
                if (Math.random() < 0.3) {
                    ctx.fillStyle = this.adjustBrightness(windowColor, 1.5);
                    ctx.fillRect(wx + 1, wy + 1, windowSize - 2, windowSize - 2);
                }
            }
        }
    }
    
    drawMiniatureRoof(ctx, x, y, width, height, roofStyle, scheme) {
        // Miniature diorama roofs with charming details
        switch (roofStyle) {
            case 'modern':
                this.drawMiniatureModernRoof(ctx, x, y, width, height, scheme.roof, scheme.accent);
                break;
            case 'industrial':
                this.drawMiniatureIndustrialRoof(ctx, x, y, width, height, scheme.roof, scheme.accent);
                break;
            case 'dome':
                this.drawMiniatureDomeRoof(ctx, x, y, width, height, scheme.roof, scheme.accent);
                break;
            case 'server':
                this.drawMiniatureServerRoof(ctx, x, y, width, height, scheme.roof, scheme.accent);
                break;
        }
    }
    
    drawMiniatureModernRoof(ctx, x, y, width, height, roofColor, accentColor) {
        // Modern office roof with charming details
        const roofGradient = ctx.createLinearGradient(x, y, x + width, y + height);
        roofGradient.addColorStop(0, this.adjustBrightness(roofColor, 1.2));
        roofGradient.addColorStop(1, roofColor);
        
        // Main roof surface
        ctx.fillStyle = roofGradient;
        ctx.fillRect(x, y, width, height);
        
        // Add cute rooftop details
        ctx.fillStyle = accentColor;
        // AC unit
        ctx.fillRect(x + width * 0.2, y + height * 0.2, width * 0.15, height * 0.2);
        // Garden area
        ctx.fillStyle = this.colors.grass;
        ctx.fillRect(x + width * 0.6, y + height * 0.1, width * 0.25, height * 0.25);
        
        // Add edge highlighting for crisp 3D look
        ctx.strokeStyle = this.colors.highlight;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, width, height);
    }
    
    drawMiniatureIndustrialRoof(ctx, x, y, width, height, roofColor, accentColor) {
        // Industrial roof with cute smokestacks
        this.drawMiniatureModernRoof(ctx, x, y, width, height, roofColor, accentColor);
        
        // Add charming smokestacks
        ctx.fillStyle = this.adjustBrightness(roofColor, 0.8);
        
        // Main smokestack with gradient
        const stackGradient = ctx.createLinearGradient(x + width * 0.15, y - height, x + width * 0.15 + width * 0.1, y);
        stackGradient.addColorStop(0, this.adjustBrightness(roofColor, 1.0));
        stackGradient.addColorStop(1, this.adjustBrightness(roofColor, 0.7));
        
        ctx.fillStyle = stackGradient;
        ctx.fillRect(x + width * 0.15, y - height, width * 0.1, height * 1.5);
        
        // Smaller secondary stack
        ctx.fillStyle = this.adjustBrightness(roofColor, 0.8);
        ctx.fillRect(x + width * 0.7, y - height * 0.6, width * 0.08, height * 1.0);
        
        // Add cute smoke puffs
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(x + width * 0.2, y - height * 1.2, 3, 0, Math.PI * 2);
        ctx.arc(x + width * 0.18, y - height * 1.4, 2, 0, Math.PI * 2);
        ctx.arc(x + width * 0.22, y - height * 1.3, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawMiniatureDomeRoof(ctx, x, y, width, height, roofColor, accentColor) {
        // Cute observatory dome for research labs
        const domeGradient = ctx.createRadialGradient(
            x + width/2, y + height/2, 0,
            x + width/2, y + height/2, width/2
        );
        domeGradient.addColorStop(0, this.adjustBrightness(roofColor, 1.3));
        domeGradient.addColorStop(0.7, roofColor);
        domeGradient.addColorStop(1, this.adjustBrightness(roofColor, 0.8));
        
        // Main dome
        ctx.fillStyle = domeGradient;
        ctx.beginPath();
        ctx.ellipse(x + width/2, y + height/2, width/2, height/2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Bright highlight for glass-like effect
        ctx.fillStyle = this.colors.highlight;
        ctx.beginPath();
        ctx.ellipse(x + width/2 - width*0.15, y + height/2 - height*0.15, width/4, height/4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Add telescope or antenna on top
        ctx.fillStyle = accentColor;
        ctx.fillRect(x + width/2 - 1, y - height/2, 2, height);
        ctx.fillRect(x + width/2 - 3, y - height/3, 6, 3);
    }
    
    drawMiniatureServerRoof(ctx, x, y, width, height, roofColor, accentColor) {
        // Cute server farm roof with blinking lights
        const rackWidth = width / 5;
        
        for (let i = 0; i < 5; i++) {
            const rackX = x + (i * rackWidth);
            
            // Server rack unit with gradient
            const rackGradient = ctx.createLinearGradient(rackX, y, rackX + rackWidth, y + height);
            rackGradient.addColorStop(0, this.adjustBrightness(roofColor, 1.1));
            rackGradient.addColorStop(1, this.adjustBrightness(roofColor, 0.9));
            
            ctx.fillStyle = rackGradient;
            ctx.fillRect(rackX, y, rackWidth - 1, height);
            
            // Server indicator lights (colorful and alive)
            const lightColors = [accentColor, '#00FF88', '#FFD93D', '#FF6B9D'];
            ctx.fillStyle = lightColors[i % lightColors.length];
            ctx.fillRect(rackX + 2, y + 3, 3, 2);
            
            // Add blinking animation effect (using time-based flicker)
            if (Date.now() % (1000 + i * 200) < 100) {
                ctx.fillStyle = this.adjustBrightness(lightColors[i % lightColors.length], 1.5);
                ctx.fillRect(rackX + 2, y + 3, 3, 2);
            }
            
            // Edge highlight
            ctx.strokeStyle = this.colors.highlight;
            ctx.lineWidth = 0.5;
            ctx.strokeRect(rackX, y, rackWidth - 1, height);
        }
    }
    
    drawMiniatureBuildingDetails(ctx, type, width, height, details, scheme) {
        // Add charming miniature details that bring the building to life
        details.forEach(detail => {
            switch (detail) {
                case 'entrance':
                    this.drawMiniatureEntrance(ctx, width/2 - 8, height - 15, scheme.accent);
                    break;
                case 'balconies':
                    this.drawMiniatureBalconies(ctx, width, height, scheme.accent);
                    break;
                case 'planters':
                    this.drawMiniaturePlanters(ctx, width, height);
                    break;
                case 'large-windows':
                    this.drawMiniatureLargeWindows(ctx, width, height, scheme.windows);
                    break;
                case 'loading-dock':
                    this.drawMiniatureLoadingDock(ctx, width, height, scheme.accent);
                    break;
                case 'chimney':
                    this.drawMiniatureChimney(ctx, width, height, scheme.roof);
                    break;
                case 'sci-windows':
                    this.drawMiniatureSciFiWindows(ctx, width, height, scheme.accent);
                    break;
                case 'observatory':
                    this.drawMiniatureObservatory(ctx, width, height, scheme.accent);
                    break;
                case 'greenhouse':
                    this.drawMiniatureGreenhouse(ctx, width, height);
                    break;
                case 'server-lights':
                    this.drawMiniatureServerLights(ctx, width, height, scheme.windows);
                    break;
                case 'cooling-towers':
                    this.drawMiniatureCoolingTowers(ctx, width, height, scheme.accent);
                    break;
                case 'satellite':
                    this.drawMiniatureSatellite(ctx, width, height, scheme.roof);
                    break;
            }
        });
    }
    
    drawMiniatureEntrance(ctx, x, y, color) {
        // Charming building entrance with details
        const entranceGradient = ctx.createLinearGradient(x, y, x + 16, y + 12);
        entranceGradient.addColorStop(0, this.adjustBrightness(color, 1.2));
        entranceGradient.addColorStop(1, color);
        
        ctx.fillStyle = entranceGradient;
        ctx.fillRect(x, y, 16, 12);
        
        // Glass doors with reflection
        ctx.fillStyle = 'rgba(135, 206, 235, 0.8)';
        ctx.fillRect(x + 2, y + 2, 6, 8);
        ctx.fillRect(x + 10, y + 2, 6, 8);
        
        // Door frames
        ctx.strokeStyle = this.adjustBrightness(color, 0.7);
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 2, y + 2, 6, 8);
        ctx.strokeRect(x + 10, y + 2, 6, 8);
        
        // Welcome mat
        ctx.fillStyle = '#2d3436';
        ctx.fillRect(x + 4, y + 10, 8, 3);
    }

    drawMiniatureBalconies(ctx, width, height, color) {
        // Cute little balconies on office buildings
        const balconyWidth = width * 0.3;
        const balconyHeight = 4;
        
        for (let level = 1; level < 3; level++) {
            const y = height - (level * height * 0.35);
            const x = width * 0.1;
            
            // Balcony platform
            ctx.fillStyle = this.adjustBrightness(color, 1.1);
            ctx.fillRect(x, y, balconyWidth, balconyHeight);
            
            // Balcony railing
            ctx.fillStyle = this.adjustBrightness(color, 0.8);
            ctx.fillRect(x, y - 6, balconyWidth, 2);
            
            // Tiny plants on balcony
            ctx.fillStyle = this.colors.tree.crown;
            ctx.fillRect(x + 2, y - 4, 2, 2);
            ctx.fillRect(x + balconyWidth - 4, y - 4, 2, 2);
        }
    }

    drawMiniaturePlanters(ctx, width, height) {
        // Small decorative planters around building base
        const planterPositions = [
            {x: width * 0.1, y: height - 8},
            {x: width * 0.8, y: height - 8},
            {x: width * 0.45, y: height - 5}
        ];
        
        planterPositions.forEach(pos => {
            // Planter box
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(pos.x, pos.y, 6, 4);
            
            // Plant
            ctx.fillStyle = this.colors.tree.flowers[Math.floor(Math.random() * this.colors.tree.flowers.length)];
            ctx.fillRect(pos.x + 1, pos.y - 3, 4, 3);
        });
    }

    drawMiniatureLargeWindows(ctx, width, height, windowColor) {
        // Large industrial windows
        const windowWidth = width * 0.4;
        const windowHeight = height * 0.3;
        
        ctx.fillStyle = this.adjustBrightness(windowColor, 0.9);
        ctx.fillRect(width * 0.1, height * 0.3, windowWidth, windowHeight);
        
        // Window frame
        ctx.strokeStyle = this.adjustBrightness(windowColor, 0.6);
        ctx.lineWidth = 2;
        ctx.strokeRect(width * 0.1, height * 0.3, windowWidth, windowHeight);
        
        // Cross frame
        ctx.beginPath();
        ctx.moveTo(width * 0.1 + windowWidth/2, height * 0.3);
        ctx.lineTo(width * 0.1 + windowWidth/2, height * 0.3 + windowHeight);
        ctx.moveTo(width * 0.1, height * 0.3 + windowHeight/2);
        ctx.lineTo(width * 0.1 + windowWidth, height * 0.3 + windowHeight/2);
        ctx.stroke();
    }

    drawMiniatureLoadingDock(ctx, width, height, color) {
        // Industrial loading dock
        const dockWidth = width * 0.25;
        const dockHeight = height * 0.15;
        const y = height - dockHeight - 5;
        
        ctx.fillStyle = color;
        ctx.fillRect(0, y, dockWidth, dockHeight);
        
        // Dock door (rollup style)
        ctx.strokeStyle = this.adjustBrightness(color, 0.7);
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
            const lineY = y + (i * dockHeight / 4);
            ctx.beginPath();
            ctx.moveTo(2, lineY);
            ctx.lineTo(dockWidth - 2, lineY);
            ctx.stroke();
        }
    }

    drawMiniatureChimney(ctx, width, height, color) {
        // Cute factory chimney
        const chimneyWidth = width * 0.08;
        const chimneyHeight = height * 0.8;
        const x = width * 0.85;
        
        const chimneyGradient = ctx.createLinearGradient(x, height - chimneyHeight, x + chimneyWidth, height);
        chimneyGradient.addColorStop(0, this.adjustBrightness(color, 1.1));
        chimneyGradient.addColorStop(1, this.adjustBrightness(color, 0.8));
        
        ctx.fillStyle = chimneyGradient;
        ctx.fillRect(x, height - chimneyHeight, chimneyWidth, chimneyHeight);
        
        // Chimney cap
        ctx.fillStyle = this.adjustBrightness(color, 1.3);
        ctx.fillRect(x - 1, height - chimneyHeight, chimneyWidth + 2, 3);
    }

    drawMiniatureSciFiWindows(ctx, width, height, accentColor) {
        // Futuristic lab windows with glow
        const windowSizes = [
            {x: width * 0.15, y: height * 0.25, w: width * 0.2, h: height * 0.15},
            {x: width * 0.15, y: height * 0.5, w: width * 0.2, h: height * 0.15},
            {x: width * 0.4, y: height * 0.35, w: width * 0.15, h: width * 0.15}  // Circular
        ];
        
        windowSizes.forEach((window, i) => {
            const glowGradient = ctx.createRadialGradient(
                window.x + window.w/2, window.y + window.h/2, 0,
                window.x + window.w/2, window.y + window.h/2, window.w/2
            );
            glowGradient.addColorStop(0, accentColor);
            glowGradient.addColorStop(1, this.adjustBrightness(accentColor, 0.5));
            
            ctx.fillStyle = glowGradient;
            
            if (i === 2) {
                // Circular window
                ctx.beginPath();
                ctx.arc(window.x + window.w/2, window.y + window.h/2, window.w/2, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Rectangular window
                ctx.fillRect(window.x, window.y, window.w, window.h);
            }
        });
    }

    drawMiniatureObservatory(ctx, width, height, color) {
        // Small observatory tower for research
        const obsWidth = width * 0.2;
        const obsHeight = height * 0.4;
        const x = width * 0.7;
        const y = height * 0.1;
        
        ctx.fillStyle = color;
        ctx.fillRect(x, y, obsWidth, obsHeight);
        
        // Observatory dome
        ctx.fillStyle = this.adjustBrightness(color, 1.2);
        ctx.beginPath();
        ctx.arc(x + obsWidth/2, y, obsWidth/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Telescope opening
        ctx.fillStyle = '#2d3436';
        ctx.fillRect(x + obsWidth/2 - 2, y - 2, 4, 6);
    }

    drawMiniatureGreenhouse(ctx, width, height) {
        // Cute rooftop greenhouse
        const ghWidth = width * 0.3;
        const ghHeight = height * 0.15;
        const x = width * 0.5;
        const y = height * 0.2;
        
        // Glass structure
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(x, y, ghWidth, ghHeight);
        
        // Frame
        ctx.strokeStyle = this.colors.tree.trunk;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, ghWidth, ghHeight);
        
        // Plants inside
        ctx.fillStyle = this.colors.tree.crown;
        for (let i = 0; i < 3; i++) {
            const plantX = x + 3 + (i * ghWidth / 3);
            ctx.fillRect(plantX, y + ghHeight - 6, 3, 4);
        }
    }

    drawMiniatureServerLights(ctx, width, height, lightColor) {
        // Blinking server indicator lights
        for (let level = 0; level < 4; level++) {
            const y = height - (level * height * 0.2) - 10;
            
            for (let col = 0; col < 3; col++) {
                const x = width * 0.1 + (col * width * 0.3);
                
                // Light with glow effect
                const glowGradient = ctx.createRadialGradient(x + 2, y + 2, 0, x + 2, y + 2, 6);
                glowGradient.addColorStop(0, lightColor);
                glowGradient.addColorStop(1, 'rgba(116, 185, 255, 0)');
                
                ctx.fillStyle = glowGradient;
                ctx.fillRect(x, y, 4, 4);
                
                // Blinking animation
                if ((Date.now() + col * 200 + level * 100) % 1500 < 300) {
                    ctx.fillStyle = this.adjustBrightness(lightColor, 1.5);
                    ctx.fillRect(x, y, 4, 4);
                }
            }
        }
    }

    drawMiniatureCoolingTowers(ctx, width, height, color) {
        // Small datacenter cooling towers
        for (let i = 0; i < 2; i++) {
            const towerX = width * (0.2 + i * 0.6);
            const towerY = height * 0.1;
            const towerWidth = width * 0.08;
            const towerHeight = height * 0.3;
            
            // Tower body
            ctx.fillStyle = color;
            ctx.fillRect(towerX, towerY, towerWidth, towerHeight);
            
            // Steam/cooling effect
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            for (let j = 0; j < 3; j++) {
                const steamX = towerX + towerWidth/2 + (Math.random() - 0.5) * 4;
                const steamY = towerY - (j * 4) - 5;
                ctx.fillRect(steamX, steamY, 2, 3);
            }
        }
    }

    drawMiniatureSatellite(ctx, width, height, color) {
        // Small communication satellite dish
        const dishSize = Math.min(width, height) * 0.15;
        const x = width * 0.8;
        const y = height * 0.1;
        
        // Dish base
        ctx.fillStyle = color;
        ctx.fillRect(x, y + dishSize, dishSize * 0.3, dishSize * 0.5);
        
        // Satellite dish
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + dishSize/2, y + dishSize/2, dishSize/2, 0, Math.PI, false);
        ctx.stroke();
        
        // Dish interior
        ctx.fillStyle = this.adjustBrightness(color, 0.8);
        ctx.beginPath();
        ctx.arc(x + dishSize/2, y + dishSize/2, dishSize/3, 0, Math.PI, false);
        ctx.fill();
    }
    
    adjustBrightness(color, factor) {
        // Adjust color brightness for voxel shading
        const rgb = this.hexToRgb(color);
        if (!rgb) return color;
        
        const r = Math.max(0, Math.min(255, Math.floor(rgb.r * factor)));
        const g = Math.max(0, Math.min(255, Math.floor(rgb.g * factor)));
        const b = Math.max(0, Math.min(255, Math.floor(rgb.b * factor)));
        
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    createAgentSprites() {
        // Create voxel-style citizens for different model types
        const models = [
            { name: 'opus', color: '#FF6B6B', size: 12, tier: 'premium' },
            { name: 'sonnet', color: '#4ECDC4', size: 10, tier: 'standard' },
            { name: 'haiku', color: '#45B7D1', size: 8, tier: 'light' }
        ];
        
        models.forEach(model => {
            this.spriteCache.set(`agent_${model.name}`, this.generateVoxelAgent(model));
        });
    }
    
    generateVoxelAgent(model) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = 20;
        canvas.height = 24;
        
        // Voxel citizen design based on model tier
        this.drawVoxelCitizen(ctx, model);
        
        return canvas;
    }
    
    drawVoxelCitizen(ctx, model) {
        const centerX = 10;
        const centerY = 20;
        
        // Cute citizen body (larger and more visible)
        const bodyWidth = Math.max(8, model.size + 2); // Minimum size for visibility
        const bodyHeight = bodyWidth * 1.8;
        
        // Drop shadow for tilt-shift effect
        ctx.fillStyle = this.colors.shadow;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + 2, bodyWidth * 0.7, bodyWidth * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Main body with gradient for 3D effect
        const bodyGradient = ctx.createLinearGradient(
            centerX - bodyWidth/2, centerY - bodyHeight,
            centerX + bodyWidth/2, centerY
        );
        bodyGradient.addColorStop(0, this.adjustBrightness(model.color, 1.2));
        bodyGradient.addColorStop(1, this.adjustBrightness(model.color, 0.8));
        
        ctx.fillStyle = bodyGradient;
        ctx.fillRect(centerX - bodyWidth/2, centerY - bodyHeight, bodyWidth, bodyHeight);
        
        // Add tier-specific charming details
        this.addCitizenPersonality(ctx, centerX, centerY, bodyWidth, bodyHeight, model);
        
        // Cute face with bigger features for visibility
        this.drawCuteFace(ctx, centerX, centerY - bodyHeight + 4, bodyWidth);
        
        // Bright edge highlighting for clean miniature look
        ctx.strokeStyle = this.colors.highlight;
        ctx.lineWidth = 1;
        ctx.strokeRect(centerX - bodyWidth/2, centerY - bodyHeight, bodyWidth, bodyHeight);
    }

    addCitizenPersonality(ctx, centerX, centerY, bodyWidth, bodyHeight, model) {
        // Add tier-specific personality to make each citizen unique
        switch (model.tier) {
            case 'premium':
                // Opus: Executive with suit and briefcase
                ctx.fillStyle = this.adjustBrightness(model.color, 1.3);
                ctx.fillRect(centerX - bodyWidth/2, centerY - bodyHeight - 4, bodyWidth, 4); // Top hat
                
                ctx.fillStyle = '#2d3436';
                ctx.fillRect(centerX - bodyWidth/2 + 1, centerY - bodyHeight + 3, bodyWidth - 2, 3); // Suit jacket
                
                // Golden briefcase
                ctx.fillStyle = '#fdcb6e';
                ctx.fillRect(centerX + bodyWidth/2 + 1, centerY - 6, 3, 4);
                break;
                
            case 'standard':
                // Sonnet: Professional with laptop bag
                ctx.fillStyle = this.adjustBrightness(model.color, 0.7);
                ctx.fillRect(centerX - bodyWidth/2 + 1, centerY - bodyHeight + 2, bodyWidth - 2, 3); // Professional shirt
                
                // Laptop bag
                ctx.fillStyle = '#636e72';
                ctx.fillRect(centerX - bodyWidth/2 - 2, centerY - 8, 3, 6);
                break;
                
            case 'light':
                // Haiku: Casual with backpack
                ctx.fillStyle = this.adjustBrightness(model.color, 1.2);
                ctx.fillRect(centerX - bodyWidth/2, centerY - bodyHeight + bodyHeight/3, bodyWidth, 3); // Casual t-shirt
                
                // Colorful backpack
                ctx.fillStyle = this.colors.tree.flowers[Math.floor(Math.random() * this.colors.tree.flowers.length)];
                ctx.fillRect(centerX - bodyWidth/2 - 2, centerY - bodyHeight + 2, 2, bodyHeight/2);
                break;
        }
    }

    drawCuteFace(ctx, centerX, faceY, bodyWidth) {
        // Cute face with visible features
        const faceSize = Math.max(6, bodyWidth * 0.7);
        
        // Head with gradient
        const headGradient = ctx.createRadialGradient(centerX, faceY, 0, centerX, faceY, faceSize/2);
        headGradient.addColorStop(0, '#ffeaa7');
        headGradient.addColorStop(1, '#fdcb6e');
        
        ctx.fillStyle = headGradient;
        ctx.beginPath();
        ctx.arc(centerX, faceY, faceSize/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Cute eyes
        ctx.fillStyle = '#2d3436';
        ctx.fillRect(centerX - 2, faceY - 1, 1, 2);
        ctx.fillRect(centerX + 1, faceY - 1, 1, 2);
        
        // Happy smile
        ctx.strokeStyle = '#2d3436';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, faceY, 2, 0.2, Math.PI - 0.2);
        ctx.stroke();
        
        // Face highlight for 3D effect
        ctx.fillStyle = this.colors.highlight;
        ctx.beginPath();
        ctx.arc(centerX - 1.5, faceY - 1.5, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawIsoRect(ctx, x, y, width, height, topColor, sideColor) {
        // Draw isometric rectangle with proper shading
        ctx.save();
        
        // Top face
        ctx.fillStyle = topColor;
        ctx.beginPath();
        ctx.moveTo(x + width / 2, y);
        ctx.lineTo(x + width, y + height / 2);
        ctx.lineTo(x + width / 2, y + height);
        ctx.lineTo(x, y + height / 2);
        ctx.closePath();
        ctx.fill();
        
        // Right side (darker)
        if (sideColor) {
            ctx.fillStyle = this.darkenColor(sideColor, 0.3);
            ctx.beginPath();
            ctx.moveTo(x + width / 2, y + height);
            ctx.lineTo(x + width, y + height / 2);
            ctx.lineTo(x + width, y + height / 2 + height);
            ctx.lineTo(x + width / 2, y + height * 2);
            ctx.closePath();
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    darkenColor(color, factor) {
        // Simple color darkening for shading
        const rgb = this.hexToRgb(color);
        if (!rgb) return color;
        
        const r = Math.max(0, Math.floor(rgb.r * (1 - factor)));
        const g = Math.max(0, Math.floor(rgb.g * (1 - factor)));
        const b = Math.max(0, Math.floor(rgb.b * (1 - factor)));
        
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    // ─── Coordinate Conversion ───────────────────────────────
    
    screenToIso(screenX, screenY) {
        // Convert screen coordinates to isometric grid coordinates
        const x = (screenX / this.tileWidth + screenY / this.tileHeight) / 2;
        const y = (screenY / this.tileHeight - screenX / this.tileWidth) / 2;
        return { x, y };
    }
    
    isoToScreen(isoX, isoY) {
        // Convert isometric coordinates to screen coordinates
        const screenX = (isoX - isoY) * this.tileWidth;
        const screenY = (isoX + isoY) * this.tileHeight;
        return { x: screenX, y: screenY };
    }
    
    worldToScreen(worldX, worldY, worldZ = 0) {
        // Convert 3D world coordinates to 2D screen coordinates
        const screenPos = this.isoToScreen(worldX, worldY);
        screenPos.y -= worldZ * this.tileHeight; // Height offset
        return screenPos;
    }
    
    // ─── Rendering Methods ────────────────────────────────────
    
    renderBackground() {
        // Vibrant miniature diorama background - warm and inviting
        const skyGradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        skyGradient.addColorStop(0, this.colors.sky);      // Pink sky at top
        skyGradient.addColorStop(0.3, this.colors.skyMid); // Blue transition
        skyGradient.addColorStop(0.7, this.colors.skyLight); // Cream horizon
        skyGradient.addColorStop(1, this.colors.grassLight); // Mint ground
        
        this.ctx.fillStyle = skyGradient;
        this.ctx.fillRect(-this.width, -this.height, this.width * 3, this.height * 3);
        
        // Add warm sunlight effect (tilt-shift feeling)
        const sunlightGradient = this.ctx.createRadialGradient(
            this.width * 0.3, this.height * 0.2, 0,
            this.width * 0.3, this.height * 0.2, this.width * 0.8
        );
        sunlightGradient.addColorStop(0, 'rgba(255, 234, 167, 0.4)'); // Warm cream light
        sunlightGradient.addColorStop(0.5, 'rgba(255, 234, 167, 0.2)');
        sunlightGradient.addColorStop(1, 'rgba(255, 234, 167, 0)');
        
        this.ctx.fillStyle = sunlightGradient;
        this.ctx.fillRect(-this.width, -this.height, this.width * 3, this.height * 3);
        
        // Tilt-shift depth of field effect - subtle darkening at edges
        const depthGradient = this.ctx.createRadialGradient(
            this.width/2, this.height/2, 0,
            this.width/2, this.height/2, Math.max(this.width, this.height) * 0.6
        );
        depthGradient.addColorStop(0, 'rgba(0,0,0,0)');
        depthGradient.addColorStop(0.8, 'rgba(0,0,0,0)');
        depthGradient.addColorStop(1, 'rgba(74, 20, 140, 0.15)'); // Subtle purple vignette
        
        this.ctx.fillStyle = depthGradient;
        this.ctx.fillRect(-this.width, -this.height, this.width * 3, this.height * 3);
    }
    
    renderGrid(camera = null) {
        // Use cached grid if available and not dirty
        if (this.gridCacheCanvas && !this.needsGridRedraw) {
            this.ctx.drawImage(this.gridCacheCanvas, 0, 0);
            return;
        }
        
        // Create or update grid cache
        if (!this.gridCacheCanvas) {
            this.gridCacheCanvas = document.createElement('canvas');
            this.gridCacheCanvas.width = this.width * 2;
            this.gridCacheCanvas.height = this.height * 2;
        }
        
        const gridCtx = this.gridCacheCanvas.getContext('2d');
        gridCtx.clearRect(0, 0, this.gridCacheCanvas.width, this.gridCacheCanvas.height);
        
        // Fix 4: Add frustum culling - only render visible tiles
        const visibleBounds = camera ? this.getVisibleBounds(camera) : {
            minX: -4, maxX: this.gridWidth + 4,
            minY: -4, maxY: this.gridHeight + 4
        };
        
        // Render miniature diorama landscape (only visible tiles)
        for (let x = visibleBounds.minX; x <= visibleBounds.maxX; x++) {
            for (let y = visibleBounds.minY; y <= visibleBounds.maxY; y++) {
                this.renderGridTile(gridCtx, x, y);
            }
        }
        
        // Add decorative elements to make it feel alive
        this.addDioramaDetails(gridCtx);
        
        this.needsGridRedraw = false;
        
        // Draw cached grid
        this.ctx.drawImage(this.gridCacheCanvas, 0, 0);
    }
    
    addDioramaDetails(ctx) {
        // Add charming miniature details that make the city feel alive and magical
        
        // Colorful voxel trees scattered naturally
        const treePositions = [
            {x: 2, y: 9, type: 'oak'}, {x: 14, y: 7, type: 'maple'}, {x: 7, y: 13, type: 'cherry'}, 
            {x: 11, y: 2, type: 'pine'}, {x: 17, y: 15, type: 'oak'}, {x: 1, y: 5, type: 'maple'},
            {x: 19, y: 10, type: 'cherry'}, {x: 5, y: 1, type: 'pine'}, {x: 16, y: 4, type: 'oak'}
        ];
        
        treePositions.forEach(tree => {
            this.drawMiniatureTree(ctx, tree.x, tree.y, tree.type);
        });
        
        // Whimsical lamp posts with warm light
        for (let x = 3; x < 18; x += 5) {
            for (let y = 3; y < 15; y += 5) {
                // Only place on roads
                if ((x % 6 === 0) || (y % 5 === 0)) {
                    this.drawMiniatureLampPost(ctx, x, y);
                }
            }
        }
        
        // Magical park areas with flowers and details
        const parkPositions = [
            {x: 0, y: 0, size: 'large'}, {x: 18, y: 1, size: 'small'}, 
            {x: 1, y: 17, size: 'medium'}, {x: 20, y: 16, size: 'small'}
        ];
        
        parkPositions.forEach(park => {
            this.drawMiniaturePark(ctx, park.x, park.y, park.size);
        });
        
        // Add floating particles for magical miniature feel
        this.addMagicalParticles(ctx);
    }
    
    drawMiniatureTree(ctx, gridX, gridY, treeType) {
        const screenPos = this.isoToScreen(gridX, gridY);
        const x = screenPos.x + this.tileWidth / 2;
        const y = screenPos.y + this.tileHeight / 2;
        
        // Tree specifications for variety
        const treeSpecs = {
            oak: { crownColor: this.colors.tree.crown, size: 1.0, shape: 'round' },
            maple: { crownColor: '#fd79a8', size: 0.9, shape: 'maple' }, // Pink autumn
            cherry: { crownColor: '#a29bfe', size: 0.8, shape: 'round' }, // Purple blossoms
            pine: { crownColor: '#00695c', size: 1.1, shape: 'pine' }  // Dark green evergreen
        };
        
        const spec = treeSpecs[treeType] || treeSpecs.oak;
        const treeSize = 12 * spec.size;
        
        // Tree trunk with gradient
        const trunkGradient = ctx.createLinearGradient(x - 3, y, x + 3, y + 12);
        trunkGradient.addColorStop(0, this.adjustBrightness(this.colors.tree.trunk, 1.1));
        trunkGradient.addColorStop(1, this.colors.tree.trunk);
        
        ctx.fillStyle = trunkGradient;
        ctx.fillRect(x - 3, y - 4, 6, 12);
        
        // Tree crown based on type
        this.drawMiniatureTreeCrown(ctx, x, y - treeSize/2, treeSize, spec);
        
        // Add shadow under tree
        ctx.fillStyle = this.colors.shadow;
        ctx.beginPath();
        ctx.ellipse(x, y + 8, treeSize * 0.6, treeSize * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    drawMiniatureTreeCrown(ctx, x, y, size, spec) {
        // Create crown gradient for depth
        const crownGradient = ctx.createRadialGradient(x - size*0.2, y - size*0.2, 0, x, y, size);
        crownGradient.addColorStop(0, this.adjustBrightness(spec.crownColor, 1.3));
        crownGradient.addColorStop(0.7, spec.crownColor);
        crownGradient.addColorStop(1, this.adjustBrightness(spec.crownColor, 0.7));
        
        ctx.fillStyle = crownGradient;
        
        switch (spec.shape) {
            case 'round':
                ctx.beginPath();
                ctx.arc(x, y, size/2, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'maple':
                // Maple leaf shape
                ctx.beginPath();
                ctx.moveTo(x, y - size/2);
                ctx.quadraticCurveTo(x - size/3, y - size/4, x - size/2, y);
                ctx.quadraticCurveTo(x - size/4, y + size/4, x, y + size/3);
                ctx.quadraticCurveTo(x + size/4, y + size/4, x + size/2, y);
                ctx.quadraticCurveTo(x + size/3, y - size/4, x, y - size/2);
                ctx.fill();
                break;
                
            case 'pine':
                // Triangular evergreen
                ctx.beginPath();
                ctx.moveTo(x, y - size/2);
                ctx.lineTo(x - size/3, y + size/3);
                ctx.lineTo(x + size/3, y + size/3);
                ctx.closePath();
                ctx.fill();
                break;
        }
        
        // Add bright highlight for miniature toy effect
        ctx.fillStyle = this.colors.highlight;
        ctx.beginPath();
        ctx.arc(x - size*0.3, y - size*0.3, size*0.15, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawMiniatureLampPost(ctx, gridX, gridY) {
        const screenPos = this.isoToScreen(gridX, gridY);
        const x = screenPos.x + this.tileWidth / 2;
        const y = screenPos.y + this.tileHeight / 2;
        
        // Decorative lamp post with charm
        const postGradient = ctx.createLinearGradient(x - 2, y - 12, x + 2, y + 2);
        postGradient.addColorStop(0, this.adjustBrightness(this.colors.lamppost.base, 1.1));
        postGradient.addColorStop(1, this.colors.lamppost.base);
        
        // Post with gradient
        ctx.fillStyle = postGradient;
        ctx.fillRect(x - 2, y - 12, 4, 14);
        
        // Ornate base
        ctx.fillStyle = this.adjustBrightness(this.colors.lamppost.base, 0.8);
        ctx.fillRect(x - 3, y - 2, 6, 4);
        
        // Warm light with magical glow
        const lightGradient = ctx.createRadialGradient(x, y - 10, 0, x, y - 10, 12);
        lightGradient.addColorStop(0, this.colors.lamppost.light);
        lightGradient.addColorStop(0.3, this.adjustBrightness(this.colors.lamppost.light, 0.8));
        lightGradient.addColorStop(1, 'rgba(253, 203, 110, 0)');
        
        // Soft outer glow
        ctx.fillStyle = lightGradient;
        ctx.beginPath();
        ctx.arc(x, y - 10, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // Bright light source
        ctx.fillStyle = this.colors.lamppost.light;
        ctx.beginPath();
        ctx.arc(x, y - 10, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Light reflection on post
        ctx.fillStyle = this.colors.highlight;
        ctx.fillRect(x - 2, y - 12, 1, 14);
    }
    
    drawMiniaturePark(ctx, gridX, gridY, size) {
        const screenPos = this.isoToScreen(gridX, gridY);
        const parkSizes = { small: 1, medium: 2, large: 3 };
        const parkRadius = parkSizes[size] || 1;
        
        // Draw park area covering multiple tiles
        for (let dx = 0; dx < parkRadius; dx++) {
            for (let dy = 0; dy < parkRadius; dy++) {
                const tilePos = this.isoToScreen(gridX + dx, gridY + dy);
                
                // Bright park grass
                const parkColor = this.adjustBrightness(this.colors.grassLight, 1.1);
                this.drawMiniatureTile(ctx, tilePos.x, tilePos.y, parkColor, 'bright');
            }
        }
        
        // Park features based on size
        const centerX = screenPos.x + (parkRadius * this.tileWidth) / 2;
        const centerY = screenPos.y + (parkRadius * this.tileHeight) / 2;
        
        if (size === 'large') {
            // Large park: fountain + flowers + benches
            this.drawMiniatureFountain(ctx, centerX, centerY);
            this.drawParkFlowers(ctx, centerX, centerY, parkRadius * 20);
            this.drawParkBenches(ctx, centerX, centerY, parkRadius * 16);
        } else if (size === 'medium') {
            // Medium park: flower garden
            this.drawParkFlowers(ctx, centerX, centerY, parkRadius * 15);
        } else {
            // Small park: just flowers
            this.drawParkFlowers(ctx, centerX, centerY, parkRadius * 10);
        }
    }

    drawMiniatureFountain(ctx, x, y) {
        // Charming miniature fountain
        const fountainGradient = ctx.createRadialGradient(x, y, 0, x, y, 8);
        fountainGradient.addColorStop(0, this.adjustBrightness(this.colors.sky, 1.2));
        fountainGradient.addColorStop(1, this.colors.sky);
        
        ctx.fillStyle = fountainGradient;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Water sparkles
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for (let i = 0; i < 6; i++) {
            const sparkleX = x + (Math.random() - 0.5) * 12;
            const sparkleY = y + (Math.random() - 0.5) * 12;
            ctx.fillRect(sparkleX, sparkleY, 1, 1);
        }
    }

    drawParkFlowers(ctx, centerX, centerY, radius) {
        // Colorful flower clusters
        const flowerClusters = 8;
        for (let i = 0; i < flowerClusters; i++) {
            const angle = (i / flowerClusters) * Math.PI * 2;
            const distance = radius * 0.6 + Math.random() * radius * 0.3;
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            // Flower cluster
            const flowerColor = this.colors.tree.flowers[i % this.colors.tree.flowers.length];
            ctx.fillStyle = flowerColor;
            
            // Multiple small flowers in cluster
            for (let j = 0; j < 3; j++) {
                const flowerX = x + (Math.random() - 0.5) * 8;
                const flowerY = y + (Math.random() - 0.5) * 8;
                
                ctx.beginPath();
                ctx.arc(flowerX, flowerY, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    drawParkBenches(ctx, centerX, centerY, radius) {
        // Tiny park benches
        const benchPositions = [
            { x: centerX + radius, y: centerY },
            { x: centerX - radius, y: centerY },
            { x: centerX, y: centerY + radius }
        ];
        
        benchPositions.forEach(pos => {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(pos.x - 4, pos.y - 1, 8, 3);
            
            // Bench back
            ctx.fillRect(pos.x - 4, pos.y - 4, 8, 1);
        });
    }

    addMagicalParticles(ctx) {
        // Floating magical particles for miniature wonder
        const particleCount = 12;
        const time = Date.now() * 0.001;
        
        for (let i = 0; i < particleCount; i++) {
            const x = (Math.sin(time * 0.5 + i * 0.8) * this.width * 0.3) + this.width * 0.5;
            const y = (Math.cos(time * 0.3 + i * 1.2) * this.height * 0.2) + this.height * 0.4;
            const opacity = (Math.sin(time * 2 + i) + 1) * 0.3;
            
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.fillRect(x, y, 2, 2);
        }
    }
    
    renderGridTile(ctx, gridX, gridY) {
        const screenPos = this.isoToScreen(gridX, gridY);
        
        // Create vibrant, varied miniature landscape
        let tileColor = this.colors.grass;
        let tileVariant = 'grass';
        
        // Organic noise for natural variation
        const noise1 = Math.sin(gridX * 0.5 + gridY * 0.4) * 0.6;
        const noise2 = Math.cos(gridX * 0.3 - gridY * 0.6) * 0.4;
        const combined = noise1 + noise2;
        
        // Colorful ground variation - miniature world feel
        if (combined > 0.4) {
            tileColor = this.colors.grassLight; // Bright aqua-mint
            tileVariant = 'bright';
        } else if (combined > 0.1) {
            tileColor = this.colors.grass; // Main mint green
            tileVariant = 'normal';
        } else if (combined > -0.2) {
            tileColor = this.colors.grassDark; // Deep emerald
            tileVariant = 'dark';
        } else {
            tileColor = this.colors.grassVariant; // Golden patches
            tileVariant = 'golden';
        }
        
        // Vibrant coral-pink roads forming a charming grid
        const isMainRoad = (gridX % 6 === 0 && gridY > 1 && gridY < 15) || 
                          (gridY % 5 === 0 && gridX > 1 && gridX < 20);
        const isPath = (gridX + gridY) % 7 === 0 && !isMainRoad;
        
        if (isMainRoad) {
            tileColor = this.colors.road; // Bright coral roads
            tileVariant = 'road';
        } else if (isPath) {
            tileColor = this.colors.roadLines; // Golden pathways
            tileVariant = 'path';
        }
        
        // Draw miniature diorama tile
        this.drawMiniatureTile(ctx, screenPos.x, screenPos.y, tileColor, tileVariant);
    }
    
    drawMiniatureTile(ctx, x, y, color, variant) {
        // Miniature diorama tiles with soft 3D effect and charming details
        
        // Create soft gradient for each tile
        const tileGradient = ctx.createLinearGradient(x, y, x + this.tileWidth, y + this.tileHeight);
        tileGradient.addColorStop(0, this.adjustBrightness(color, 1.15));
        tileGradient.addColorStop(1, this.adjustBrightness(color, 0.9));
        
        // Isometric diamond tile (proper diorama perspective)
        ctx.fillStyle = tileGradient;
        ctx.beginPath();
        ctx.moveTo(x + this.tileWidth / 2, y);
        ctx.lineTo(x + this.tileWidth, y + this.tileHeight / 2);
        ctx.lineTo(x + this.tileWidth / 2, y + this.tileHeight);
        ctx.lineTo(x, y + this.tileHeight / 2);
        ctx.closePath();
        ctx.fill();
        
        // Bright edge highlighting for clean miniature look
        ctx.strokeStyle = this.colors.highlight;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        
        // Add variant-specific miniature details
        this.addTileDetails(ctx, x, y, variant);
    }

    addTileDetails(ctx, x, y, variant) {
        // Add charming miniature details to tiles
        const centerX = x + this.tileWidth / 2;
        const centerY = y + this.tileHeight / 2;
        
        switch (variant) {
            case 'bright':
                // Small flowers on bright grass
                if (Math.random() < 0.3) {
                    ctx.fillStyle = this.colors.tree.flowers[Math.floor(Math.random() * this.colors.tree.flowers.length)];
                    ctx.fillRect(centerX - 1, centerY - 1, 2, 2);
                }
                break;
                
            case 'golden':
                // Tiny golden sparkles
                if (Math.random() < 0.4) {
                    ctx.fillStyle = this.adjustBrightness(this.colors.grassVariant, 1.3);
                    ctx.fillRect(centerX + (Math.random() - 0.5) * 8, centerY + (Math.random() - 0.5) * 4, 1, 1);
                }
                break;
                
            case 'road':
                // Road markings
                if ((Math.floor(x / this.tileWidth) + Math.floor(y / this.tileHeight)) % 4 === 0) {
                    ctx.fillStyle = this.colors.roadLines;
                    ctx.fillRect(centerX - 6, centerY, 12, 1);
                }
                break;
                
            case 'path':
                // Stepping stones
                ctx.fillStyle = this.adjustBrightness(this.colors.roadLines, 0.8);
                ctx.beginPath();
                ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
    }
    
    renderBuilding(building) {
        if (!building.position) return;
        
        const screenPos = this.worldToScreen(building.position.x, building.position.y, building.position.z || 0);
        const sprite = this.spriteCache.get(`building_${building.type}`);
        
        if (sprite) {
            // Draw building shadow first
            this.ctx.fillStyle = this.colors.shadow;
            this.ctx.fillRect(screenPos.x + 4, screenPos.y + sprite.height - 8, sprite.width - 4, 8);
            
            // Draw building sprite
            this.ctx.drawImage(sprite, screenPos.x, screenPos.y);
            
            // Draw activity indicator if building has agents
            if (building.agents && building.agents.length > 0) {
                this.renderActivityIndicator(screenPos.x + sprite.width / 2, screenPos.y - 10, building.agents.length);
            }
            
            // Highlight if selected
            if (building.isSelected) {
                this.renderSelectionHighlight(screenPos.x, screenPos.y, sprite.width, sprite.height);
            }
        }
    }
    
    renderAgent(agent) {
        if (!agent.position) return;
        
        const screenPos = this.worldToScreen(agent.position.x, agent.position.y, agent.position.z || 0);
        
        // Determine sprite based on model
        let spriteName = 'agent_sonnet'; // Default
        if (agent.modelIdentity) {
            if (agent.modelIdentity.tier === 'premium') spriteName = 'agent_opus';
            else if (agent.modelIdentity.tier === 'light') spriteName = 'agent_haiku';
        }
        
        const sprite = this.spriteCache.get(spriteName);
        
        if (sprite) {
            // Draw agent shadow
            this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
            this.ctx.fillRect(screenPos.x + 2, screenPos.y + sprite.height - 2, sprite.width - 4, 2);
            
            // Draw agent sprite
            this.ctx.drawImage(sprite, screenPos.x, screenPos.y);
            
            // Draw thought bubble if agent is working
            if (agent.status === 'working' || agent.task) {
                this.renderThoughtBubble(screenPos.x + sprite.width / 2, screenPos.y - 5, agent.task);
            }
            
            // Draw agent name (Agent OS naming)
            if (agent.displayName) {
                this.renderAgentLabel(screenPos.x + sprite.width / 2, screenPos.y + sprite.height + 8, agent.displayName);
            }
        }
    }
    
    renderActivityIndicator(x, y, agentCount) {
        // Draw floating activity indicator above buildings
        const size = Math.min(12, 6 + agentCount * 2);
        
        this.ctx.fillStyle = '#F1C40F';
        this.ctx.beginPath();
        this.ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '8px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(agentCount.toString(), x, y + 2);
    }
    
    renderSelectionHighlight(x, y, width, height) {
        // Draw selection outline
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        
        this.ctx.beginPath();
        this.ctx.moveTo(x + width / 2, y - 5);
        this.ctx.lineTo(x + width + 5, y + height / 2 - 5);
        this.ctx.lineTo(x + width / 2, y + height + 5);
        this.ctx.lineTo(x - 5, y + height / 2 + 5);
        this.ctx.closePath();
        this.ctx.stroke();
        
        this.ctx.setLineDash([]);
    }
    
    renderThoughtBubble(x, y, text) {
        if (!text) return;
        
        // Simple thought bubble with task text
        const bubbleWidth = Math.max(40, text.length * 4);
        const bubbleHeight = 16;
        
        // Bubble background
        this.ctx.fillStyle = 'rgba(255,255,255,0.9)';
        this.ctx.fillRect(x - bubbleWidth / 2, y - bubbleHeight, bubbleWidth, bubbleHeight);
        
        // Bubble border
        this.ctx.strokeStyle = '#CCCCCC';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x - bubbleWidth / 2, y - bubbleHeight, bubbleWidth, bubbleHeight);
        
        // Text
        this.ctx.fillStyle = '#333333';
        this.ctx.font = '8px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(text.substring(0, 10) + '...', x, y - 6);
    }
    
    renderAgentLabel(x, y, name) {
        // Render Agent OS name below agents
        this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'center';
        
        // Background for readability
        const textWidth = this.ctx.measureText(name).width;
        this.ctx.fillRect(x - textWidth / 2 - 2, y - 10, textWidth + 4, 12);
        
        // Text
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillText(name, x, y);
    }
    
    renderFloatingValue(x, y, value, color = '#27AE60') {
        // Render floating economic values (revenue, costs)
        this.ctx.fillStyle = color;
        this.ctx.font = 'bold 12px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(value, x, y);
        
        // Add subtle shadow
        this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
        this.ctx.fillText(value, x + 1, y + 1);
    }
    
    // ─── Utility Methods ──────────────────────────────────────
    
    invalidateGrid() {
        this.needsGridRedraw = true;
    }
    
    getVisibleBounds(camera) {
        // Calculate which tiles are visible given camera position/zoom
        const margin = 2; // Extra margin for smooth scrolling
        
        const topLeft = this.screenToIso(-camera.x / camera.zoom, -camera.y / camera.zoom);
        const bottomRight = this.screenToIso(
            (this.width - camera.x) / camera.zoom,
            (this.height - camera.y) / camera.zoom
        );
        
        return {
            minX: Math.floor(topLeft.x) - margin,
            maxX: Math.ceil(bottomRight.x) + margin,
            minY: Math.floor(topLeft.y) - margin,
            maxY: Math.ceil(bottomRight.y) + margin
        };
    }
    
    resize(width, height) {
        this.width = width;
        this.height = height;
        this.invalidateGrid();
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SimCityRenderer;
}