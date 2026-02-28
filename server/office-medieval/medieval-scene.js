import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ═══════════════════════════════════════════════════════════════
// MedievalCastle3D — Three.js Scene
// ═══════════════════════════════════════════════════════════════

class MedievalCastle3D {
    constructor() {
        this.agents = new Map();
        this.selectedAgent = null;
        this.soundEnabled = true;
        this.audioContext = null;
        this.sounds = new Map();

        // Three.js
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.loader = new GLTFLoader();
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.clock = new THREE.Clock();

        // Characters
        this.characterModels = new Map(); // agentId → { group, mixer, waypoints, waypointIndex, speed, ... }
        this.animationMixers = [];
        this.hoveredAgent = null;
        this.labelElements = new Map();
        this.animals = [];

        // Loading
        this.totalModels = 0;
        this.loadedModels = 0;

        this.init();
    }

    async init() {
        this.setupThreeJS();
        this.setupAudio();
        this.setupAgents();
        this.setupEventListeners();
        this.setupUI();
        await this.loadAllModels();
        this.setupDataBridge();
        this.animate();
        // Horn plays on first user click (see setupAudio)
    }

    // ── Three.js Setup ──────────────────────────────────────

    setupThreeJS() {
        const container = document.getElementById('scene-container');
        const w = container.clientWidth;
        const h = container.clientHeight;

        // Scene
        this.scene = new THREE.Scene();

        // Sky gradient background
        const skyCanvas = document.createElement('canvas');
        skyCanvas.width = 2;
        skyCanvas.height = 512;
        const ctx = skyCanvas.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, 0, 512);
        grad.addColorStop(0, '#0a1025');
        grad.addColorStop(0.2, '#1a2545');
        grad.addColorStop(0.45, '#2a4a7a');
        grad.addColorStop(0.65, '#5a8ab0');
        grad.addColorStop(0.8, '#8ab8d0');
        grad.addColorStop(0.92, '#d4a574');
        grad.addColorStop(1.0, '#e8c49a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 2, 512);
        const skyTex = new THREE.CanvasTexture(skyCanvas);
        skyTex.needsUpdate = true;
        this.scene.background = skyTex;

        // Fog for depth
        this.scene.fog = new THREE.FogExp2(0x5a7a9a, 0.006);

        // Orthographic camera for isometric view
        const aspect = w / h;
        const frustum = 18;
        this.camera = new THREE.OrthographicCamera(
            -frustum * aspect, frustum * aspect,
            frustum, -frustum,
            0.1, 300
        );
        // Isometric angle: ~45° azimuth, ~42° elevation (slightly more top-down)
        const dist = 60;
        const azimuth = Math.PI / 4; // 45°
        const elevation = Math.atan(Math.sin(Math.PI / 4.2)); // ~42°
        this.camera.position.set(
            dist * Math.cos(elevation) * Math.sin(azimuth),
            dist * Math.sin(elevation),
            dist * Math.cos(elevation) * Math.cos(azimuth)
        );
        this.camera.lookAt(0, 2, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        container.insertBefore(this.renderer.domElement, container.firstChild);

        // Post-processing: bloom for campfire glow + sunset
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        const bloom = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.3,   // strength (subtle)
            0.6,   // radius
            0.85   // threshold (only bright things bloom)
        );
        this.composer.addPass(bloom);
        this.bloomPass = bloom;

        // Orbit Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.enablePan = true;
        this.controls.minZoom = 0.5;
        this.controls.maxZoom = 3;
        this.controls.maxPolarAngle = Math.PI / 2.2; // Don't go underground
        this.controls.minPolarAngle = Math.PI / 8;
        this.controls.target.set(0, 2, 0);
        this.controls.update();

        // Lighting
        this.setupLighting();

        // Ground
        this.createGround();

        // Resize handler
        window.addEventListener('resize', () => this.onResize());
    }

    setupLighting() {
        // Ambient (warm, soft) — lowered for shadow contrast
        this.ambientLight = new THREE.AmbientLight(0xfff5e0, 0.45);
        this.scene.add(this.ambientLight);

        // Hemisphere light for sky/ground color bleed
        this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x3a6830, 0.25);
        this.scene.add(this.hemiLight);

        // Sun directional light with shadows — stronger for defined shadows
        const sun = new THREE.DirectionalLight(0xffe8cc, 1.8);
        this.sunLight = sun;
        sun.position.set(18, 30, 12); // Slightly higher and further for better shadow angles
        sun.castShadow = true;
        sun.shadow.mapSize.width = 4096;
        sun.shadow.mapSize.height = 4096;
        sun.shadow.camera.near = 1;
        sun.shadow.camera.far = 150;
        sun.shadow.camera.left = -55;
        sun.shadow.camera.right = 55;
        sun.shadow.camera.top = 55;
        sun.shadow.camera.bottom = -55;
        sun.shadow.bias = -0.001;
        sun.shadow.normalBias = 0.02;
        this.scene.add(sun);

        // Torch point lights near gate
        const torchColor = 0xff9933;
        const torch1 = new THREE.PointLight(torchColor, 2, 8, 2);
        torch1.position.set(-2, 2.5, 5.5);
        this.scene.add(torch1);

        const torch2 = new THREE.PointLight(torchColor, 2, 8, 2);
        torch2.position.set(2, 2.5, 5.5);
        this.scene.add(torch2);

        // Keep interior warm light
        const keepLight = new THREE.PointLight(0xffaa55, 1.5, 12, 2);
        keepLight.position.set(0, 4, 0);
        this.scene.add(keepLight);

        this.torchLights = [torch1, torch2, keepLight];
    }

    createGround() {
        // Expanded terrain (120×120)
        const groundGeo = new THREE.PlaneGeometry(120, 120, 48, 48);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x4a7a2e,
            roughness: 0.95,
            metalness: 0.02,
            transparent: false,
            opacity: 1.0,
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.01;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Terrain variation — keep center flat, hills outside
        const pos = groundGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const y = pos.getY(i);
            const dist = Math.sqrt(x * x + y * y);
            if (dist > 12) {
                pos.setZ(i, (Math.sin(x * 0.5) * Math.cos(y * 0.3) * 0.3 + Math.random() * 0.08));
            }
        }
        groundGeo.computeVertexNormals();

        // River — blue plane running E-W at z=12
        const riverGeo = new THREE.PlaneGeometry(60, 3);
        const riverMat = new THREE.MeshStandardMaterial({
            color: 0x3388cc,
            roughness: 0.1,
            metalness: 0.3,
            transparent: true,
            opacity: 0.75,
        });
        const river = new THREE.Mesh(riverGeo, riverMat);
        river.rotation.x = -Math.PI / 2;
        river.position.set(0, 0.01, 12);
        river.receiveShadow = true;
        this.scene.add(river);
    }

    onResize() {
        const container = document.getElementById('scene-container');
        const w = container.clientWidth;
        const h = container.clientHeight;
        const aspect = w / h;
        const frustum = 18;

        this.camera.left = -frustum * aspect;
        this.camera.right = frustum * aspect;
        this.camera.top = frustum;
        this.camera.bottom = -frustum;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(w, h);
        if (this.composer) this.composer.setSize(w, h);
    }

    // ── Model Loading ───────────────────────────────────────

    async loadAllModels() {
        const loadingBar = document.getElementById('loading-bar');
        const loadingText = document.getElementById('loading-text');
        const loadingScreen = document.getElementById('loading-screen');

        // Define all models to load
        const modelDefs = this.getModelDefinitions();
        this.totalModels = modelDefs.length;

        const updateProgress = (label) => {
            this.loadedModels++;
            const pct = Math.round((this.loadedModels / this.totalModels) * 100);
            loadingBar.style.width = pct + '%';
            loadingText.textContent = label;
        };

        // Load models in batches
        const batchSize = 6;
        for (let i = 0; i < modelDefs.length; i += batchSize) {
            const batch = modelDefs.slice(i, i + batchSize);
            await Promise.all(batch.map(async (def) => {
                try {
                    const gltf = await this.loadModel(def.path);
                    this.placeModel(gltf, def);
                    updateProgress(def.label || def.path.split('/').pop());
                } catch (e) {
                    console.warn(`Failed to load ${def.path}:`, e);
                    updateProgress('(skipped) ' + def.path.split('/').pop());
                }
            }));
        }

        // Load characters
        await this.loadCharacters(updateProgress);

        // Add village buildings outside castle walls
        this.addVillageBuildings();

        // Hide loading screen
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            setTimeout(() => loadingScreen.remove(), 1000);
        }, 500);
    }

    addVillageBuildings() {
        const buildings = [
            { name: '⚔️ Mission Hall', color: 0xCC3333, x: -10, z: 20, w: 2, h: 1.8, d: 2.5 },
            { name: '🍺 Tavern', color: 0xCC8833, x: -4, z: 23, w: 1.8, h: 1.5, d: 1.8 },
            { name: '📚 Library', color: 0x3366CC, x: 4, z: 22, w: 2, h: 2, d: 1.5 },
            { name: '🔨 Forge Workshop', color: 0x666666, x: 10, z: 20, w: 2.2, h: 1.2, d: 2 },
            { name: '🏪 Market', color: 0x33AA55, x: 6, z: 26, w: 2.5, h: 1, d: 2 },
            { name: '🏠 Chapel', color: 0xFFFFEE, x: -8, z: 26, w: 1.5, h: 2.5, d: 1.5 },
        ];

        this.buildingLabels = [];

        buildings.forEach(b => {
            const group = new THREE.Group();

            // Walls
            const walls = new THREE.Mesh(
                new THREE.BoxGeometry(b.w, b.h, b.d),
                new THREE.MeshStandardMaterial({ color: 0xDDCCAA })
            );
            walls.position.y = b.h / 2;
            walls.castShadow = true;
            walls.receiveShadow = true;
            group.add(walls);

            // Colored roof (cone)
            const roof = new THREE.Mesh(
                new THREE.ConeGeometry(Math.max(b.w, b.d) * 0.75, b.h * 0.5, 4),
                new THREE.MeshStandardMaterial({ color: b.color })
            );
            roof.position.y = b.h + b.h * 0.25;
            roof.rotation.y = Math.PI / 4;
            roof.castShadow = true;
            group.add(roof);

            group.position.set(b.x, 0, b.z);
            group.userData.buildingName = b.name;
            // Tag all children for raycasting
            group.traverse(child => { if (child.isMesh) child.userData.buildingName = b.name; });
            this.scene.add(group);

            // Store for click detection
            this.buildingGroups = this.buildingGroups || [];
            this.buildingGroups.push(group);

            // Floating HTML label
            const label = document.createElement('div');
            label.className = 'building-label';
            label.textContent = b.name;
            document.getElementById('scene-container').appendChild(label);
            this.buildingLabels.push({
                label,
                position: new THREE.Vector3(b.x, b.h + b.h * 0.5 + 0.5, b.z),
            });
        });
    }

    loadModel(path) {
        // Cache loaded models to avoid re-downloading same file
        if (!this._modelCache) this._modelCache = new Map();
        if (this._modelCache.has(path)) {
            // Return a deep clone of the cached model
            const cached = this._modelCache.get(path);
            return Promise.resolve({
                scene: cached.scene.clone(true),
                animations: cached.animations,
            });
        }
        return new Promise((resolve, reject) => {
            this.loader.load(path, (gltf) => {
                this._modelCache.set(path, gltf);
                resolve({
                    scene: gltf.scene.clone(true),
                    animations: gltf.animations,
                });
            }, undefined, reject);
        });
    }

    getModelDefinitions() {
        const defs = [];

        // ─────────────────────────────────────────────────────────────────
        // MAIN KEEP — 8-story tower at scale 1.0 (pieces tile perfectly)
        // ─────────────────────────────────────────────────────────────────
        // Keep tower — scale 1.05 vertically to fill micro-gaps between pieces
        // GLB pieces are ~1.01 units tall. Integer stacking + slight Y-scale overlap.
        // Keep tower — ALL mid pieces are 1.01u tall EXCEPT mid-color (0.2u = decorative band!)
        // Use only full-height pieces: base-color, mid-windows, mid-open
        defs.push({ path: 'assets/castle/tower-square-base-color.glb',          x: 0, y: 0, z: 0, ry: 0, scale: 1, label: 'Keep base' });
        defs.push({ path: 'assets/castle/tower-square-mid-windows.glb',         x: 0, y: 1, z: 0, ry: 0, scale: 1, label: 'Keep mid 1' });
        defs.push({ path: 'assets/castle/tower-square-mid-windows.glb',         x: 0, y: 2, z: 0, ry: Math.PI/2, scale: 1, label: 'Keep mid 2' });
        defs.push({ path: 'assets/castle/tower-square-mid-open.glb',            x: 0, y: 3, z: 0, ry: 0, scale: 1, label: 'Keep mid 3' });
        defs.push({ path: 'assets/castle/tower-square-mid-windows.glb',         x: 0, y: 4, z: 0, ry: Math.PI, scale: 1, label: 'Keep mid 4' });
        defs.push({ path: 'assets/castle/tower-square-mid-windows.glb',         x: 0, y: 5, z: 0, ry: -Math.PI/2, scale: 1, label: 'Keep mid 5' });
        defs.push({ path: 'assets/castle/tower-square-top-roof-high.glb',       x: 0, y: 6, z: 0, ry: 0, scale: 1, label: 'Keep roof' });
        defs.push({ path: 'assets/castle/flag-wide.glb',                        x: 0, y: 7, z: 0, ry: 0, scale: 1, label: 'Keep flag' });
        // Keep entrance details at scale 1
        defs.push({ path: 'assets/castle/door.glb',                x:  0,   y: 0, z:  0.5, ry: 0, scale: 1, label: 'Keep door' });
        defs.push({ path: 'assets/castle/stairs-stone-square.glb', x:  0,   y: 0, z:  1.5, ry: 0, scale: 1, label: 'Keep stairs' });

        // ─────────────────────────────────────────────────────────────────
        // INNER BAILEY — hexagonal corner towers at (±7, ±7)
        // ─────────────────────────────────────────────────────────────────
        const innerHexTowers = [
            { x: -7, z: -7, label: 'Inner NW hex', ryFlag: 0 },
            { x:  7, z: -7, label: 'Inner NE hex', ryFlag: Math.PI / 2 },
            { x: -7, z:  7, label: 'Inner SW hex', ryFlag: -Math.PI / 2 },
            { x:  7, z:  7, label: 'Inner SE hex', ryFlag: Math.PI },
        ];
        innerHexTowers.forEach((tc) => {
            // Hex tower: base=1.31h, mid=0.46h, roof=0.83h, top=0.13h — stack at cumulative heights
            defs.push({ path: 'assets/castle/tower-hexagon-base.glb', x: tc.x, y: 0,      z: tc.z, ry: 0, scale: 1,   label: tc.label + ' base' });
            defs.push({ path: 'assets/castle/tower-hexagon-mid.glb',  x: tc.x, y: 1.31,   z: tc.z, ry: 0, scale: 1,   label: tc.label + ' mid' });
            defs.push({ path: 'assets/castle/tower-hexagon-roof.glb', x: tc.x, y: 1.77,   z: tc.z, ry: 0, scale: 1,   label: tc.label + ' roof' });
            defs.push({ path: 'assets/castle/tower-hexagon-top.glb',  x: tc.x, y: 2.60,   z: tc.z, ry: 0, scale: 1,   label: tc.label + ' top' });
            defs.push({ path: 'assets/castle/flag-pennant.glb',       x: tc.x, y: 4, z: tc.z, ry: tc.ryFlag, scale: 1, label: tc.label + ' flag' });
        });

        // Inner bailey walls — using wall-half at every 1-unit for ZERO gaps
        // N side (z=-7): x from -6 to 6 (corners at ±7 cover the ends)
        for (let xi = -6; xi <= 6; xi += 1) {
            const isDoor = xi === 0;
            defs.push({
                path: 'assets/castle/wall-half.glb',
                x: xi, y: 0, z: -7, ry: 0, scale: 1, label: 'Inner N wall'
            });
        }
        // S side (z=7)
        for (let xi = -6; xi <= 6; xi += 1) {
            const isDoor = xi === 0;
            defs.push({
                path: 'assets/castle/wall-half.glb',
                x: xi, y: 0, z: 7, ry: 0, scale: 1, label: 'Inner S wall'
            });
        }
        defs.push({ path: 'assets/castle/wall-narrow-stairs.glb', x: 3, y: 0, z: 7, ry: Math.PI, scale: 1, label: 'Inner S stairs' });

        // E side (x=7): z from -6 to 6
        for (let zi = -6; zi <= 6; zi += 1) {
            const isDoor = zi === 0;
            defs.push({
                path: 'assets/castle/wall-half.glb',
                x: 7, y: 0, z: zi, ry: Math.PI / 2, scale: 1, label: 'Inner E wall'
            });
        }
        // W side (x=-7)
        for (let zi = -6; zi <= 6; zi += 1) {
            const isDoor = zi === 0;
            defs.push({
                path: 'assets/castle/wall-half.glb',
                x: -7, y: 0, z: zi, ry: Math.PI / 2, scale: 1, label: 'Inner W wall'
            });
        }
        // Inner bailey wall corners (visual connectors)
        defs.push({ path: 'assets/castle/wall-corner.glb',      x: -7, y: 0, z: -7, ry: 0,             scale: 1, label: 'Inner corner NW' });
        defs.push({ path: 'assets/castle/wall-corner.glb',      x:  7, y: 0, z: -7, ry: Math.PI / 2,   scale: 1, label: 'Inner corner NE' });
        defs.push({ path: 'assets/castle/wall-corner.glb',      x: -7, y: 0, z:  7, ry: -Math.PI / 2,  scale: 1, label: 'Inner corner SW' });
        defs.push({ path: 'assets/castle/wall-corner.glb',      x:  7, y: 0, z:  7, ry: Math.PI,        scale: 1, label: 'Inner corner SE' });

        // ─────────────────────────────────────────────────────────────────
        // OUTER CURTAIN WALL — radius ±11
        // ─────────────────────────────────────────────────────────────────

        // -- Outer wall N side (z=-11), 1-unit intervals for seamless narrow walls
        for (let xi = -10; xi <= 10; xi += 1) {
            defs.push({ path: 'assets/castle/wall-half.glb', x: xi, y: 0, z: -11, ry: 0, scale: 1, label: 'Outer N wall' });
        }
        // -- Outer wall S side (z=11) — south entrance gate at centre
        for (let xi = -10; xi <= 10; xi += 1) {
            const isSGate = xi === 0;
            defs.push({
                path: isSGate ? 'assets/castle/wall-half.glb' : 'assets/castle/wall-half.glb',
                x: xi, y: 0, z: 11, ry: 0, scale: 1, label: 'Outer S wall'
            });
        }
        // Wall-access stairs near south gate
        defs.push({ path: 'assets/castle/wall-narrow-stairs-rail.glb', x: -3, y: 0, z: 11, ry: 0,      scale: 1, label: 'Outer S stair W' });
        defs.push({ path: 'assets/castle/wall-narrow-stairs-rail.glb', x:  3, y: 0, z: 11, ry: Math.PI, scale: 1, label: 'Outer S stair E' });

        // -- Outer wall E side (x=11), 1-unit intervals
        for (let zi = -10; zi <= 10; zi += 1) {
            defs.push({ path: 'assets/castle/wall-half.glb', x: 11, y: 0, z: zi, ry: Math.PI / 2, scale: 1, label: 'Outer E wall' });
        }
        // -- Outer wall W side (x=-11), 1-unit intervals
        for (let zi = -10; zi <= 10; zi += 1) {
            defs.push({ path: 'assets/castle/wall-half.glb', x: -11, y: 0, z: zi, ry: Math.PI / 2, scale: 1, label: 'Outer W wall' });
        }

        // -- Outer wall 4 CORNERS — wall-corner-half-tower
        defs.push({ path: 'assets/castle/wall-corner-half-tower.glb', x: -11, y: 0, z: -11, ry: 0,            scale: 1, label: 'Outer corner NW' });
        defs.push({ path: 'assets/castle/wall-corner-half-tower.glb', x:  11, y: 0, z: -11, ry: Math.PI / 2,  scale: 1, label: 'Outer corner NE' });
        defs.push({ path: 'assets/castle/wall-corner-half-tower.glb', x: -11, y: 0, z:  11, ry: -Math.PI / 2, scale: 1, label: 'Outer corner SW' });
        defs.push({ path: 'assets/castle/wall-corner-half-tower.glb', x:  11, y: 0, z:  11, ry: Math.PI,      scale: 1, label: 'Outer corner SE' });

        // -- 8 outer SQUARE TOWERS (midpoints + corners already covered above, midpoint towers here)
        const outerSquareTowers = [
            { x:   0, z: -11, ry: 0,            label: 'Outer N mid tower' },
            { x:   0, z:  11, ry: 0,            label: 'Outer S mid tower' },
            { x:  11, z:   0, ry: Math.PI / 2,  label: 'Outer E mid tower' },
            { x: -11, z:   0, ry: Math.PI / 2,  label: 'Outer W mid tower' },
            { x: -11, z:  -6, ry: Math.PI / 2,  label: 'Outer NW tower' },
            { x:  11, z:  -6, ry: Math.PI / 2,  label: 'Outer NE tower' },
            { x: -11, z:   6, ry: Math.PI / 2,  label: 'Outer SW tower' },
            { x:  11, z:   6, ry: Math.PI / 2,  label: 'Outer SE tower' },
        ];
        outerSquareTowers.forEach((ot) => {
            // Outer tower: base=1.31h, mid-color=0.20h, top=0.13h — cumulative
            defs.push({ path: 'assets/castle/tower-base.glb',              x: ot.x, y: 0,    z: ot.z, ry: ot.ry, scale: 1, label: ot.label + ' base' });
            defs.push({ path: 'assets/castle/tower-square-mid-color.glb',  x: ot.x, y: 1.31, z: ot.z, ry: ot.ry, scale: 1, label: ot.label + ' mid' });
            defs.push({ path: 'assets/castle/tower-top.glb',               x: ot.x, y: 1.51, z: ot.z, ry: ot.ry, scale: 1, label: ot.label + ' top' });
            defs.push({ path: 'assets/castle/flag-banner-short.glb',       x: ot.x, y: 1.64, z: ot.z, ry: ot.ry, scale: 1, label: ot.label + ' flag' });
        });

        // ─────────────────────────────────────────────────────────────────
        // SOUTH GATE COMPLEX
        // ─────────────────────────────────────────────────────────────────
        defs.push({ path: 'assets/castle/metal-gate.glb',            x:  0,   y: 0, z: 11,   ry: 0, scale: 1,   label: 'Main metal gate' });
        defs.push({ path: 'assets/castle/wall-narrow-corner.glb',    x: -1,   y: 0, z: 11,   ry: 0, scale: 1,   label: 'Gate corner W' });
        defs.push({ path: 'assets/castle/wall-narrow-corner.glb',    x:  1,   y: 0, z: 11,   ry: Math.PI / 2, scale: 1, label: 'Gate corner E' });
        defs.push({ path: 'assets/castle/tower-square-arch.glb',     x:  0,   y: 0, z: 11.5, ry: 0, scale: 1,   label: 'Gate arch' });

        // ─────────────────────────────────────────────────────────────────
        // BRIDGE — straight over river at z≈13 with pillar supports
        // ─────────────────────────────────────────────────────────────────
        defs.push({ path: 'assets/castle/wall-narrow-wood.glb',           x:  0,   y: 0, z: 12.5, ry: 0, scale: 1, label: 'Bridge N section' });
        defs.push({ path: 'assets/castle/wall-narrow-wood.glb',           x:  0,   y: 0, z: 13.5, ry: 0, scale: 1, label: 'Bridge S section' });
        defs.push({ path: 'assets/castle/bridge-straight-pillar.glb',     x: -0.8, y: 0, z: 13,   ry: 0, scale: 1, label: 'Bridge pillar W' });
        defs.push({ path: 'assets/castle/bridge-straight-pillar.glb',     x:  0.8, y: 0, z: 13,   ry: 0, scale: 1, label: 'Bridge pillar E' });
        defs.push({ path: 'assets/castle/wall-narrow-wood-fence.glb',     x: -0.5, y: 0, z: 13,   ry: 0, scale: 1, label: 'Bridge fence W' });
        defs.push({ path: 'assets/castle/wall-narrow-wood-fence.glb',     x:  0.5, y: 0, z: 13,   ry: 0, scale: 1, label: 'Bridge fence E' });

        // ─────────────────────────────────────────────────────────────────
        // CASTLE DETAIL PIECES — decorative/accent elements
        // ─────────────────────────────────────────────────────────────────
        // Slant roofs on inner bailey walls for added silhouette
        defs.push({ path: 'assets/castle/tower-slant-roof.glb',       x:  0,  y: 0, z: -7.5, ry: 0,           scale: 1, label: 'Inner N roof accent' });
        defs.push({ path: 'assets/castle/tower-slant-roof.glb',       x:  0,  y: 0, z:  7.5, ry: Math.PI,     scale: 1, label: 'Inner S roof accent' });
        defs.push({ path: 'assets/castle/tower-square-top-color.glb', x:  7,  y: 1.31, z:  0,   ry: Math.PI / 2, scale: 1, label: 'Inner E wall top' });
        defs.push({ path: 'assets/castle/tower-square-top-color.glb', x: -7,  y: 1.31, z:  0,   ry: Math.PI / 2, scale: 1, label: 'Inner W wall top' });
        // Wall studs on outer walls
        defs.push({ path: 'assets/castle/wall-stud.glb',              x: -7,  y: 0, z: -11,  ry: 0,           scale: 1, label: 'Outer N stud W' });
        defs.push({ path: 'assets/castle/wall-stud.glb',              x:  7,  y: 0, z: -11,  ry: 0,           scale: 1, label: 'Outer N stud E' });
        defs.push({ path: 'assets/castle/wall-stud.glb',              x: -7,  y: 0, z:  11,  ry: 0,           scale: 1, label: 'Outer S stud W' });
        defs.push({ path: 'assets/castle/wall-stud.glb',              x:  7,  y: 0, z:  11,  ry: 0,           scale: 1, label: 'Outer S stud E' });
        // Wall-to-narrow transitions
        defs.push({ path: 'assets/castle/wall-to-narrow.glb',         x:  7,  y: 0, z: -11,  ry: 0,           scale: 1, label: 'Wall transition N' });
        defs.push({ path: 'assets/castle/wall-to-narrow.glb',         x: -7,  y: 0, z:  11,  ry: Math.PI,     scale: 1, label: 'Wall transition S' });
        // Corner half pieces
        defs.push({ path: 'assets/castle/wall-corner-half.glb',       x:  11, y: 0, z:  -9,  ry: Math.PI / 2, scale: 1, label: 'Outer E corner half N' });
        defs.push({ path: 'assets/castle/wall-corner-half.glb',       x: -11, y: 0, z:   9,  ry: -Math.PI / 2, scale: 1, label: 'Outer W corner half S' });
        // Corner slants
        defs.push({ path: 'assets/castle/wall-corner-slant.glb',      x:  11, y: 0, z:   9,  ry: Math.PI,     scale: 1, label: 'Outer E corner slant S' });
        defs.push({ path: 'assets/castle/wall-corner-slant.glb',      x: -11, y: 0, z:  -9,  ry: 0,           scale: 1, label: 'Outer W corner slant N' });
        // Half-modular wall filler segments near keep
        defs.push({ path: 'assets/castle/wall-half-modular.glb',      x: -2,  y: 0, z:  3,   ry: 0,           scale: 1, label: 'Keep courtyard wall W' });
        defs.push({ path: 'assets/castle/wall-half-modular.glb',      x:  2,  y: 0, z:  3,   ry: 0,           scale: 1, label: 'Keep courtyard wall E' });
        // Top-wood hex tower accent (one variant for variety)
        defs.push({ path: 'assets/castle/tower-hexagon-top-wood.glb', x: -7,  y: 2.73, z: -7, ry: 0,           scale: 1, label: 'Inner NW hex top wood' });
        // Round roof tops on two outer corner towers for visual variety
        defs.push({ path: 'assets/castle/tower-square-top-roof-rounded.glb', x: -11, y: 3, z: -11, ry: 0, scale: 1, label: 'Outer NW round roof' });
        defs.push({ path: 'assets/castle/tower-square-top-roof-rounded.glb', x:  11, y: 3, z:  11, ry: 0, scale: 1, label: 'Outer SE round roof' });
        // Square arch on outer north wall mid-tower
        defs.push({ path: 'assets/castle/tower-square-arch.glb',      x:  0,  y: 0, z: -11.5, ry: Math.PI,   scale: 1, label: 'Outer N arch' });
        // Mid-door tower piece on keep outer face
        defs.push({ path: 'assets/castle/tower-square-mid-door.glb',  x:  0,  y: 1, z: 0.5, ry: 0,           scale: 1,   label: 'Keep mid door' });
        // Base-border accent at base of keep
        defs.push({ path: 'assets/castle/tower-square-base-border.glb', x: 0, y: 0, z: 0,    ry: 0,           scale: 1,  label: 'Keep base border' });
        // Ground terrain patches around base
        defs.push({ path: 'assets/castle/ground.glb',                 x:  0,  y: 0, z:  0,   ry: 0,           scale: 3,   label: 'Castle ground' });
        defs.push({ path: 'assets/castle/ground-hills.glb',           x: -12, y: 0, z: -12,  ry: 0,           scale: 1.5, label: 'Hills NW' });
        defs.push({ path: 'assets/castle/ground-hills.glb',           x:  13, y: 0, z: -11,  ry: Math.PI / 3, scale: 1.5, label: 'Hills NE' });
        defs.push({ path: 'assets/castle/ground-hills.glb',           x: -13, y: 0, z:  12,  ry: Math.PI / 5, scale: 1.5, label: 'Hills SW' });
        defs.push({ path: 'assets/castle/ground-hills.glb',           x:  12, y: 0, z:  13,  ry: Math.PI,     scale: 1.5, label: 'Hills SE' });
        defs.push({ path: 'assets/castle/ground-hills.glb',           x:   0, y: 0, z: -14,  ry: Math.PI / 7, scale: 1.2, label: 'Hills N' });

        // ─────────────────────────────────────────────────────────────────
        // TREES — inner ring + outer forest + dead wood flavour
        // ─────────────────────────────────────────────────────────────────
        {
            const _rng = (min, max) => min + Math.random() * (max - min);
            // Dense inner ring (radius 14-22, 40 trees)
            for (let i = 0; i < 40; i++) {
                const angle = (i / 40) * Math.PI * 2 + _rng(-0.15, 0.15);
                const r = _rng(14, 22);
                defs.push({ path: Math.random() > 0.4 ? 'assets/castle/tree-large.glb' : 'assets/castle/tree-small.glb',
                    x: Math.cos(angle) * r, y: 0, z: Math.sin(angle) * r,
                    ry: Math.random() * Math.PI * 2, scale: 1.1 + Math.random() * 0.4, label: 'Tree' });
            }
            // Outer forest ring (radius 24-38, 50 trees)
            for (let i = 0; i < 50; i++) {
                const angle = (i / 50) * Math.PI * 2 + _rng(-0.2, 0.2);
                const r = _rng(24, 38);
                defs.push({ path: Math.random() > 0.5 ? 'assets/castle/tree-large.glb' : 'assets/castle/tree-small.glb',
                    x: Math.cos(angle) * r, y: 0, z: Math.sin(angle) * r,
                    ry: Math.random() * Math.PI * 2, scale: 1.0 + Math.random() * 0.5, label: 'Tree' });
            }
            // Dead wood flavour — tree-log and tree-trunk scattered near castle perimeter
            const deadWoodSpots = [
                { x: -13, z:  9 }, { x:  14, z: -8 }, { x:   9, z:  13 }, { x: -10, z: -13 },
                { x:  16, z:  5 }, { x: -15, z: -5 }, { x:   5, z: -15 }, { x:  -6, z:  16 },
            ];
            deadWoodSpots.forEach((dw, i) => {
                defs.push({ path: i % 2 === 0 ? 'assets/castle/tree-log.glb' : 'assets/castle/tree-trunk.glb',
                    x: dw.x, y: 0, z: dw.z, ry: Math.random() * Math.PI * 2, scale: 1.0 + Math.random() * 0.3, label: 'Dead wood' });
            });
        }

        // Rock clusters (18)
        {
            const rockSpots = [
                { x: -14, z:  8 }, { x:  15, z: 10 }, { x: -12, z: -12 }, { x: 13, z: -9 },
                { x: -18, z:  2 }, { x:  20, z: -5 }, { x:   7, z:  16 }, { x: -8, z: 18 },
                { x:  22, z: 14 }, { x: -22, z: -7 }, { x:  11, z: -20 }, { x: -15, z: 20 },
                { x:  25, z:  5 }, { x: -25, z: 12 }, { x:   3, z:  28 }, { x: -5, z: -25 },
                { x:  30, z: -10 },{ x: -30, z:  8 },
            ];
            rockSpots.forEach((r, i) => {
                defs.push({ path: i % 2 === 0 ? 'assets/castle/rocks-large.glb' : 'assets/castle/rocks-small.glb',
                    x: r.x, y: 0, z: r.z, ry: Math.random() * Math.PI * 2, scale: 1, label: 'Rocks' });
            });
        }

        return defs;
    }

    placeModel(gltf, def) {
        const model = gltf.scene;
        model.position.set(def.x, def.y, def.z);
        model.rotation.y = def.ry || 0;
        if (def.scale && def.scale !== 1) {
            model.scale.setScalar(def.scale);
        }
        // Optional Y-scale stretch to fill gaps between stacked pieces
        if (def.scaleY) {
            model.scale.y = def.scaleY;
        }

        // Enable shadows on all meshes
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        this.scene.add(model);
        return model;
    }

    createCharacterMesh(color, crownColor) {
        const group = new THREE.Group();
        // Body
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.5, 0.2),
            new THREE.MeshStandardMaterial({ color: color })
        );
        body.position.y = 0.45;
        body.castShadow = true;
        group.add(body);
        // Head
        const head = new THREE.Mesh(
            new THREE.BoxGeometry(0.22, 0.22, 0.22),
            new THREE.MeshStandardMaterial({ color: 0xffcc99 })
        );
        head.position.y = 0.82;
        head.castShadow = true;
        group.add(head);
        // Eyes
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const eyeGeo = new THREE.BoxGeometry(0.04, 0.04, 0.02);
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.055, 0.84, 0.115);
        group.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.055, 0.84, 0.115);
        group.add(rightEye);
        // Mouth
        const mouth = new THREE.Mesh(
            new THREE.BoxGeometry(0.07, 0.02, 0.02),
            new THREE.MeshStandardMaterial({ color: 0x663333 })
        );
        mouth.position.set(0, 0.76, 0.115);
        group.add(mouth);
        // Crown (CEO only)
        if (crownColor) {
            const crown = new THREE.Mesh(
                new THREE.BoxGeometry(0.26, 0.08, 0.26),
                new THREE.MeshStandardMaterial({ color: crownColor })
            );
            crown.position.y = 0.97;
            group.add(crown);
        }
        return group;
    }

    async loadCharacters(updateProgress) {
        const agentDefs = [
            { id: 'Sycopa',   color: 0x007AFF, speed: 0.4, crown: 0xFFD700 },
            { id: 'Forge',    color: 0xFF9F0A, speed: 0.7, crown: null },
            { id: 'Atlas',    color: 0xBF5AF2, speed: 0.6, crown: null },
            { id: 'Hunter',   color: 0xFF453A, speed: 1.0, crown: null },
            { id: 'Echo',     color: 0x0A84FF, speed: 0.5, crown: null },
            { id: 'Sentinel', color: 0x30D158, speed: 0.8, crown: null },
        ];

        const emoticons = { idle: '💤 Idle', working: '⚔️ Working', chatting: '💬 Chatting', eating: '🍖 Eating', sleeping: '😴 Sleeping' };

        // Waypoints spread across entire map (castle, village, fields)
        const waypoints = [
            // Sycopa — CEO, stays INSIDE castle courtyard (inner walls ±7)
            [{ x: 0, z: 0 }, { x: -4, z: -4 }, { x: 4, z: -4 }, { x: 4, z: 4 }, { x: -4, z: 4 }],
            // Forge — CTO, village workshop area (all outside outer wall z>12)
            [{ x: 12, z: 20 }, { x: 8, z: 24 }, { x: 5, z: 22 }, { x: 10, z: 18 }, { x: 14, z: 22 }],
            // Atlas — COO, wide village patrol (south of outer wall z>12)
            [{ x: -12, z: 20 }, { x: -5, z: 24 }, { x: 5, z: 22 }, { x: 12, z: 20 }, { x: 0, z: 28 }],
            // Hunter — CRO, far scout: fields and edges (south of walls z>12)
            [{ x: 18, z: 16 }, { x: -16, z: 22 }, { x: -18, z: 14 }, { x: 14, z: 28 }, { x: 0, z: 18 }],
            // Echo — CMO, village center: tavern + library (z>12)
            [{ x: -5, z: 24 }, { x: 5, z: 22 }, { x: -9, z: 27 }, { x: 7, z: 27 }, { x: 0, z: 20 }],
            // Sentinel — QA, outer wall patrol (between inner and outer walls, z: -12 to 12)
            [{ x: 0, z: 13 }, { x: -13, z: 13 }, { x: -13, z: -13 }, { x: 13, z: -13 }, { x: 13, z: 13 }],
        ];

        for (let i = 0; i < agentDefs.length; i++) {
            const def = agentDefs[i];
            const mesh = this.createCharacterMesh(def.color, def.crown);
            mesh.scale.setScalar(1.2);

            const wp = waypoints[i];
            mesh.position.set(wp[0].x, 0, wp[0].z);
            mesh.userData.agentId = def.id;
            mesh.userData.emoticon = '💤 Idle';
            this.scene.add(mesh);

            this.characterModels.set(def.id, {
                group: mesh,
                model: mesh,
                mixer: null,
                animations: [],
                waypoints: wp,
                waypointIndex: 0,
                nextWaypointIndex: 1,
                speed: def.speed,
                progress: 0,
                bobPhase: Math.random() * Math.PI * 2,
                glowMesh: null,
            });

            // HTML floating label
            const label = document.createElement('div');
            label.className = 'character-label';
            label.textContent = def.id + ' \u{1F4A4}';
            document.getElementById('labels-container').appendChild(label);
            this.labelElements.set(def.id, label);

            updateProgress('Character ' + def.id);
        }

        // Animals
        this.spawnAnimals();
    }

    createAnimal(type) {
        const group = new THREE.Group();
        const colors = { sheep: 0xeeeeee, horse: 0x8B4513, chicken: 0xFFD700 };
        const sizes = { sheep: [0.3, 0.25, 0.4], horse: [0.2, 0.5, 0.6], chicken: [0.12, 0.15, 0.15] };
        const c = colors[type], s = sizes[type];
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(s[0], s[1], s[2]),
            new THREE.MeshStandardMaterial({ color: c })
        );
        body.position.y = s[1] / 2 + 0.05;
        body.castShadow = true;
        group.add(body);
        const headSize = s[1] * 0.6;
        const head = new THREE.Mesh(
            new THREE.BoxGeometry(headSize, headSize, headSize),
            new THREE.MeshStandardMaterial({ color: c })
        );
        head.position.set(0, s[1] * 0.7, s[2] / 2);
        group.add(head);
        return group;
    }

    spawnAnimals() {
        const animalSpecs = [
            ...Array(6).fill('sheep'),
            ...Array(3).fill('horse'),
            ...Array(5).fill('chicken'),
        ];
        const positions = [
            { x: -8,  z: 15 }, { x: -5,  z: 17 }, { x: -12, z: 16 },
            { x:  7,  z: 18 }, { x:  11, z: 15 }, { x:  4,  z: 20 },
            { x: -15, z: 14 }, { x:  16, z: 13 }, { x:  0,  z: 22 },
            { x: -9,  z: 19 }, { x:  9,  z: 21 }, { x: -4,  z: 24 },
            { x: -13, z: 21 }, { x:  13, z: 18 }, { x:  6,  z: 25 },
        ];
        animalSpecs.forEach((type, i) => {
            const mesh = this.createAnimal(type);
            const pos = positions[i] || { x: (Math.random() - 0.5) * 20, z: 14 + Math.random() * 8 };
            mesh.position.set(pos.x, 0, pos.z);
            this.scene.add(mesh);
            this.animals.push({
                mesh,
                type,
                homeX: pos.x,
                homeZ: pos.z,
                targetX: pos.x,
                targetZ: pos.z,
                speed: type === 'horse' ? 0.8 : type === 'chicken' ? 0.6 : 0.3,
                wanderTimer: Math.random() * 5,
            });
        });
    }

    // ── Animation Loop ──────────────────────────────────────

    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();
        const elapsed = this.clock.getElapsedTime();

        // Update controls
        this.controls.update();

        // Update animation mixers
        this.animationMixers.forEach(mixer => mixer.update(delta));

        // Animate characters
        this.animateCharacters(delta, elapsed);

        // Animate torch flicker
        this.animateTorches(elapsed);

        // Animate animals
        this.animateAnimals(delta);

        // Day/night cycle
        this.updateDayNight(elapsed);

        // Update label positions
        this.updateLabels();

        // Render
        // Use composer for bloom post-processing
        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    animateCharacters(delta, elapsed) {
        this.characterModels.forEach((charData, agentId) => {
            const { group, waypoints, speed } = charData;

            // Skip if being dragged
            if (charData._paused) return;

            // Move along waypoints
            const from = waypoints[charData.waypointIndex];
            const to = waypoints[charData.nextWaypointIndex];

            charData.progress += delta * speed * 0.1; // 3× slower movement

            if (charData.progress >= 1) {
                charData.progress = 0;
                charData.waypointIndex = charData.nextWaypointIndex;
                charData.nextWaypointIndex = (charData.nextWaypointIndex + 1) % waypoints.length;
            }

            // Lerp position
            const t = this.smoothstep(charData.progress);
            const x = from.x + (to.x - from.x) * t;
            const z = from.z + (to.z - from.z) * t;

            // Walking bob
            const bob = Math.sin(elapsed * 6 + charData.bobPhase) * 0.03;
            group.position.set(x, bob, z);

            // Face direction of movement
            const dx = to.x - from.x;
            const dz = to.z - from.z;
            if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
                const targetAngle = Math.atan2(dx, dz);
                // Smooth rotation
                let currentAngle = group.rotation.y;
                let diff = targetAngle - currentAngle;
                // Normalize
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                group.rotation.y += diff * Math.min(delta * 5, 1);
            }

            // Selected glow effect
            if (agentId === this.selectedAgent) {
                if (!charData.glowMesh) {
                    this.addGlowToCharacter(charData);
                }
                if (charData.glowMesh) {
                    charData.glowMesh.material.opacity = 0.3 + Math.sin(elapsed * 4) * 0.15;
                }
            } else if (charData.glowMesh) {
                group.remove(charData.glowMesh);
                charData.glowMesh.geometry.dispose();
                charData.glowMesh.material.dispose();
                charData.glowMesh = null;
            }
        });
    }

    smoothstep(t) {
        return t * t * (3 - 2 * t);
    }

    addGlowToCharacter(charData) {
        const glowGeo = new THREE.CylinderGeometry(0.6, 0.6, 2, 16, 1, true);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xe94560,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
            depthWrite: false,
        });
        const glowMesh = new THREE.Mesh(glowGeo, glowMat);
        glowMesh.position.y = 1;
        charData.group.add(glowMesh);
        charData.glowMesh = glowMesh;
    }

    animateTorches(elapsed) {
        if (!this.torchLights) return;
        this.torchLights.forEach((light, i) => {
            const flicker = 1 + Math.sin(elapsed * 8 + i * 2.5) * 0.15 + Math.sin(elapsed * 13 + i) * 0.1;
            light.intensity = (i < 2 ? 2 : 1.5) * flicker;
        });
    }

    animateAnimals(delta) {
        if (!this.animals) return;
        this.animals.forEach(animal => {
            // Count down wander timer
            animal.wanderTimer -= delta;
            if (animal.wanderTimer <= 0) {
                // Pick a new random target near home
                const radius = 4;
                animal.targetX = animal.homeX + (Math.random() - 0.5) * radius * 2;
                animal.targetZ = animal.homeZ + (Math.random() - 0.5) * radius * 2;
                animal.wanderTimer = 3 + Math.random() * 5;
            }
            // Move toward target
            const dx = animal.targetX - animal.mesh.position.x;
            const dz = animal.targetZ - animal.mesh.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist > 0.05) {
                const step = Math.min(animal.speed * delta, dist);
                animal.mesh.position.x += (dx / dist) * step;
                animal.mesh.position.z += (dz / dist) * step;
                animal.mesh.rotation.y = Math.atan2(dx, dz);
            }
        });
    }

    // ── Day/Night Cycle (60s = full day) ─────────────────
    updateDayNight(elapsed) {
        const cycle = (elapsed % 3600) / 3600; // 0-1 over 1 hour
        const sunAngle = cycle * Math.PI * 2 - Math.PI / 2; // -π/2 to 3π/2
        const sunHeight = Math.sin(sunAngle);
        const isNight = sunHeight < -0.1;
        const isDusk = sunHeight >= -0.1 && sunHeight < 0.15;

        // Move sun position
        if (this.sunLight) {
            this.sunLight.position.set(
                Math.cos(sunAngle) * 25,
                Math.max(sunHeight * 30, 2),
                12
            );
            // Dim sun at night
            this.sunLight.intensity = isNight ? 0.2 : isDusk ? 0.8 : 1.8;
            this.sunLight.color.setHex(isNight ? 0x334466 : isDusk ? 0xff8844 : 0xffe8cc);
        }

        // Ambient follows
        if (this.ambientLight) {
            this.ambientLight.intensity = isNight ? 0.08 : isDusk ? 0.2 : 0.45;
            this.ambientLight.color.setHex(isNight ? 0x223355 : 0xfff5e0);
        }
        if (this.hemiLight) {
            this.hemiLight.intensity = isNight ? 0.1 : 0.25;
        }

        // Torches glow brighter at night
        if (this.torchLights) {
            this.torchLights.forEach(t => {
                t.intensity = isNight ? 4 : isDusk ? 3 : 2;
            });
        }

        // Bloom intensity: stronger at night (campfire glow)
        if (this.bloomPass) {
            this.bloomPass.strength = isNight ? 0.6 : isDusk ? 0.4 : 0.25;
        }
    }

    updateLabels() {
        const container = document.getElementById('scene-container');
        const rect = container.getBoundingClientRect();

        this.characterModels.forEach((charData, agentId) => {
            const label = this.labelElements.get(agentId);
            if (!label) return;

            // Project 3D position to screen
            const pos = new THREE.Vector3();
            charData.group.getWorldPosition(pos);
            pos.y += 1.6; // Above character head (scaled for 1.2x chars)

            const projected = pos.clone().project(this.camera);
            const x = (projected.x * 0.5 + 0.5) * rect.width;
            const y = (-projected.y * 0.5 + 0.5) * rect.height;

            // Clamp to viewport bounds
            if (projected.z > 1 || x < -50 || x > rect.width + 50 || y < -50 || y > rect.height + 50) {
                label.style.display = 'none';
                if (label._emojiEl) label._emojiEl.style.display = 'none';
            } else {
                label.style.display = '';
                const clampedX = Math.min(x, rect.width - 60);
                label.style.left = clampedX + 'px';
                label.style.top = y + 'px';
                // Sync floating emoji position (avoids lag from 2s interval)
                if (label._emojiEl) {
                    label._emojiEl.style.display = '';
                    label._emojiEl.style.left = clampedX + 'px';
                    label._emojiEl.style.top = (y - 20) + 'px';
                }
            }

            // Show label if hovered or selected
            if (agentId === this.hoveredAgent) {
                label.classList.add('visible');
                label.classList.toggle('selected', agentId === this.selectedAgent);
            } else if (agentId === this.selectedAgent) {
                label.classList.add('visible');
                label.classList.add('selected');
            } else {
                label.classList.remove('visible');
                label.classList.remove('selected');
            }
        });

        // Update building label positions (clamped to viewport)
        if (this.buildingLabels) {
            this.buildingLabels.forEach(({ label, position }) => {
                const projected = position.clone().project(this.camera);
                const x = (projected.x * 0.5 + 0.5) * rect.width;
                const y = (-projected.y * 0.5 + 0.5) * rect.height;
                // Hide if behind camera or outside viewport bounds
                if (projected.z > 1 || x < -50 || x > rect.width + 50 || y < -50 || y > rect.height + 50) {
                    label.style.display = 'none';
                } else {
                    label.style.display = '';
                    label.style.left = Math.min(x, rect.width - 80) + 'px';
                    label.style.top = y + 'px';
                }
            });
        }
    }

    // ── Interaction ─────────────────────────────────────────

    setupEventListeners() {
        const container = document.getElementById('scene-container');

        // Click to select
        container.addEventListener('click', (e) => {
            if (!this._wasDragging) this.onSceneClick(e);
            this._wasDragging = false;
        });

        // Hover
        container.addEventListener('mousemove', (e) => this.onSceneHover(e));

        // ── Drag & Drop Characters ──
        this._dragTarget = null;
        this._wasDragging = false;
        this._dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        this._dragIntersect = new THREE.Vector3();

        container.addEventListener('pointerdown', (e) => {
            const ndc = this.getMouseNDC(e);
            this.raycaster.setFromCamera(ndc, this.camera);
            const targets = [];
            this.characterModels.forEach((data) => {
                data.group.traverse(child => { if (child.isMesh) targets.push(child); });
            });
            const hits = this.raycaster.intersectObjects(targets, false);
            if (hits.length > 0) {
                let obj = hits[0].object;
                while (obj.parent && !obj.userData.agentId) obj = obj.parent;
                if (obj.userData.agentId) {
                    this._dragTarget = obj;
                    this._wasDragging = false;
                    this.controls.enabled = false;
                    container.style.cursor = 'grabbing';
                    // Pause patrol for dragged character
                    const cd = this.characterModels.get(obj.userData.agentId);
                    if (cd) cd._paused = true;
                }
            }
        });

        container.addEventListener('pointermove', (e) => {
            if (!this._dragTarget) return;
            this._wasDragging = true;
            const ndc = this.getMouseNDC(e);
            this.raycaster.setFromCamera(ndc, this.camera);
            if (this.raycaster.ray.intersectPlane(this._dragPlane, this._dragIntersect)) {
                this._dragTarget.position.x = this._dragIntersect.x;
                this._dragTarget.position.z = this._dragIntersect.z;
            }
        });

        container.addEventListener('pointerup', () => {
            if (this._dragTarget) {
                const agentId = this._dragTarget.userData.agentId;
                const cd = this.characterModels.get(agentId);
                if (cd) {
                    // Update waypoints to new position + generate new patrol area
                    const px = this._dragTarget.position.x;
                    const pz = this._dragTarget.position.z;
                    cd.waypoints = [
                        { x: px, z: pz },
                        { x: px + 2, z: pz + 1.5 },
                        { x: px - 1.5, z: pz + 2 },
                        { x: px - 2, z: pz - 1 },
                        { x: px + 1, z: pz - 1.5 },
                    ];
                    cd.waypointIndex = 0;
                    cd.nextWaypointIndex = 1;
                    cd.progress = 0;
                    cd._paused = false;
                }
                this._dragTarget = null;
                this.controls.enabled = true;
                container.style.cursor = '';
            }
        });

        // UI buttons
        document.getElementById('btn-toggle-sound').addEventListener('click', () => {
            this.soundEnabled = !this.soundEnabled;
            document.getElementById('btn-toggle-sound').textContent = this.soundEnabled ? '🔊' : '🔇';
        });
        document.getElementById('btn-fullscreen').addEventListener('click', () => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen();
            else document.exitFullscreen();
        });
        document.getElementById('btn-reset-camera').addEventListener('click', () => {
            if (typeof openMissionControl === 'function') openMissionControl();
            else this.resetCamera();
        });
    }

    getMouseNDC(event) {
        const container = document.getElementById('scene-container');
        const rect = container.getBoundingClientRect();
        return new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );
    }

    onSceneClick(event) {
        this.mouse = this.getMouseNDC(event);
        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Collect all character meshes
        const charMeshes = [];
        this.characterModels.forEach((charData) => {
            charData.group.traverse((child) => {
                if (child.isMesh) charMeshes.push(child);
            });
        });

        // Check buildings first
        if (this.buildingGroups) {
            const buildingMeshes = [];
            this.buildingGroups.forEach(g => g.traverse(c => { if (c.isMesh) buildingMeshes.push(c); }));
            const bHits = this.raycaster.intersectObjects(buildingMeshes, false);
            if (bHits.length > 0 && bHits[0].object.userData.buildingName) {
                const name = bHits[0].object.userData.buildingName;
                if (typeof window.openBuildingPanel === 'function') {
                    window.openBuildingPanel(name);
                }
                // Glow effect on selected building
                if (this._selectedBuildingGroup) {
                    this._selectedBuildingGroup.traverse(c => { if (c.isMesh && c._origEmissive !== undefined) c.material.emissiveIntensity = 0; });
                }
                let bg = bHits[0].object;
                while (bg.parent && !bg.userData.buildingName) bg = bg.parent;
                this._selectedBuildingGroup = bg.parent || bg;
                this._selectedBuildingGroup.traverse(c => {
                    if (c.isMesh) {
                        c._origEmissive = c.material.emissiveIntensity || 0;
                        c.material.emissive = c.material.emissive || new THREE.Color(0xffaa00);
                        c.material.emissive.set(0xffaa00);
                        c.material.emissiveIntensity = 0.4;
                    }
                });
                return;
            }
        }

        const intersects = this.raycaster.intersectObjects(charMeshes, false);
        if (intersects.length > 0) {
            // Find the agent ID
            let obj = intersects[0].object;
            while (obj && !obj.userData.agentId) obj = obj.parent;
            if (obj && obj.userData.agentId) {
                this.selectAgent(obj.userData.agentId);
                return;
            }
        }
    }

    onSceneHover(event) {
        this.mouse = this.getMouseNDC(event);
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const charMeshes = [];
        this.characterModels.forEach((charData) => {
            charData.group.traverse((child) => {
                if (child.isMesh) charMeshes.push(child);
            });
        });

        const intersects = this.raycaster.intersectObjects(charMeshes, false);
        let newHovered = null;
        if (intersects.length > 0) {
            let obj = intersects[0].object;
            while (obj && !obj.userData.agentId) obj = obj.parent;
            if (obj) newHovered = obj.userData.agentId;
        }

        if (newHovered !== this.hoveredAgent) {
            this.hoveredAgent = newHovered;
            document.getElementById('scene-container').style.cursor = newHovered ? 'pointer' : '';
        }
    }

    resetCamera() {
        // Smooth reset to default isometric view
        const dist = 60;
        const azimuth = Math.PI / 4;
        const elevation = Math.atan(Math.sin(Math.PI / 4.2));

        this.camera.position.set(
            dist * Math.cos(elevation) * Math.sin(azimuth),
            dist * Math.sin(elevation),
            dist * Math.cos(elevation) * Math.cos(azimuth)
        );
        this.camera.zoom = 1;
        this.camera.updateProjectionMatrix();
        this.controls.target.set(0, 2, 0);
        this.controls.update();
    }

    // ── Agent Management ────────────────────────────────────

    setupAgents() {
        const defs = [
            { id: 'ApoMac',   role: 'CEO / King',     char: 'a', color: '#c9a959' },
            { id: 'Forge',    role: 'Builder',         char: 'b', color: '#f97316' },
            { id: 'Atlas',    role: 'Navigator',       char: 'c', color: '#3b82f6' },
            { id: 'Hunter',   role: 'Scout',           char: 'd', color: '#10b981' },
            { id: 'Echo',     role: 'Bard',            char: 'e', color: '#8b5cf6' },
            { id: 'Sentinel', role: 'Guard',           char: 'f', color: '#ef4444' },
            { id: 'Mystic',   role: 'Wizard',          char: 'g', color: '#7c3aed' },
            { id: 'Smith',    role: 'Blacksmith',      char: 'h', color: '#ea580c' },
        ];

        defs.forEach(d => {
            const status = Math.random() > 0.6 ? 'active' : Math.random() > 0.4 ? 'busy' : 'idle';
            const metrics = {
                tasks: 1 + Math.floor(Math.random() * 15),
                completed: Math.floor(Math.random() * 10),
                success: Math.floor(50 + Math.random() * 50) + '%',
                uptime: (90 + Math.random() * 10).toFixed(1) + 'h'
            };
            this.agents.set(d.id, { ...d, status, metrics });
        });
    }

    selectAgent(agentId) {
        // Deselect previous
        if (this.selectedAgent) {
            document.querySelector(`.courtyard-avatar[data-agent-id="${this.selectedAgent}"]`)?.classList.remove('selected');
            document.querySelector(`[data-agent="${this.selectedAgent}"]`)?.classList.remove('selected');
        }
        this.selectedAgent = agentId;

        // Highlight sidebar card
        const card = document.querySelector(`[data-agent="${agentId}"]`);
        if (card) {
            card.classList.add('selected');
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        this.playSound('select');
        this.addActivityLog(`Selected ${agentId}`, 'system');

        // Handle special agent actions
        if (agentId === 'ApoMac' || agentId === 'agent:main:main' || agentId === 'ceo') {
            // CEO clicked -> open Mission Control after a brief delay
            setTimeout(() => {
                if (typeof openMissionControl === 'function') {
                    openMissionControl();
                }
            }, 500);
        } else {
            // Other agents -> open detail panel (if implemented)
            this.openAgentDetailPanel(agentId);
        }
    }

    openAgentDetailPanel(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent) return;

        // Update panel content
        document.getElementById('agentDetailName').textContent = agentId;
        document.getElementById('agentDetailRole').textContent = agent.role;
        document.getElementById('agentDetailAvatar').textContent = agent.char ? '👤' : agentId.slice(0, 2);
        
        // Set initial tab
        this.currentDetailTab = 'overview';
        this.renderAgentDetailContent(agentId, agent);

        // Show panel
        const overlay = document.getElementById('agentDetailOverlay');
        overlay.style.display = 'flex';
        setTimeout(() => overlay.classList.add('visible'), 50);

        this.addActivityLog(`Examining ${agentId}'s royal dossier`, agent.role);
    }

    renderAgentDetailContent(agentId, agent) {
        const content = document.getElementById('agentDetailContent');
        const tab = this.currentDetailTab || 'overview';

        if (tab === 'overview') {
            content.innerHTML = `
                <div style="margin-bottom:16px;">
                    <h4 style="font-family:var(--font-serif);color:var(--castle-navy);margin-bottom:8px;">Royal Duties</h4>
                    <p style="color:var(--castle-brown);line-height:1.5;font-size:14px;">
                        ${this.getAgentDescription(agentId)}
                    </p>
                </div>
                <div style="margin-bottom:16px;">
                    <h4 style="font-family:var(--font-serif);color:var(--castle-navy);margin-bottom:8px;">Current Status</h4>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <div class="status-dot ${agent.status}" style="width:12px;height:12px;"></div>
                        <span style="color:var(--castle-navy);font-weight:500;text-transform:capitalize;">${agent.status}</span>
                    </div>
                </div>
                <div>
                    <h4 style="font-family:var(--font-serif);color:var(--castle-navy);margin-bottom:8px;">Recent Achievements</h4>
                    <ul style="color:var(--castle-brown);font-size:13px;line-height:1.6;">
                        <li>Completed ${Math.floor(Math.random() * 10 + 5)} royal missions</li>
                        <li>Maintained ${Math.floor(Math.random() * 20 + 80)}% success rate</li>
                        <li>Active for ${agent.metrics?.uptime || '2.5h'} in current session</li>
                    </ul>
                </div>
            `;
        } else if (tab === 'metrics') {
            content.innerHTML = `
                <div class="agent-metrics-grid">
                    <div class="agent-metric-card">
                        <span class="agent-metric-value">${agent.metrics?.tasks || '0'}</span>
                        <span class="agent-metric-label">Royal Tasks</span>
                    </div>
                    <div class="agent-metric-card">
                        <span class="agent-metric-value">${agent.metrics?.completed || '0'}</span>
                        <span class="agent-metric-label">Completed</span>
                    </div>
                    <div class="agent-metric-card">
                        <span class="agent-metric-value">${agent.metrics?.success || '95%'}</span>
                        <span class="agent-metric-label">Success Rate</span>
                    </div>
                    <div class="agent-metric-card">
                        <span class="agent-metric-value">${agent.metrics?.uptime || '2.5h'}</span>
                        <span class="agent-metric-label">Uptime</span>
                    </div>
                </div>
                <div style="margin-top:16px;">
                    <h4 style="font-family:var(--font-serif);color:var(--castle-navy);margin-bottom:8px;">Performance Chart</h4>
                    <div style="height:80px;background:rgba(0,0,0,0.1);border-radius:8px;display:flex;align-items:end;padding:8px;gap:4px;">
                        ${Array.from({length: 7}, () => 
                            `<div style="flex:1;background:var(--castle-gold);height:${20 + Math.random() * 40}px;border-radius:2px;"></div>`
                        ).join('')}
                    </div>
                </div>
            `;
        } else if (tab === 'sessions') {
            content.innerHTML = `
                <div>
                    <h4 style="font-family:var(--font-serif);color:var(--castle-navy);margin-bottom:12px;">Active Sessions</h4>
                    <div style="color:var(--castle-brown);font-size:13px;text-align:center;padding:20px;">
                        🔄 Loading royal session data...<br>
                        <small>This will show live OpenClaw sessions for ${agentId}</small>
                    </div>
                </div>
            `;

            // Load real session data
            this.loadAgentSessions(agentId);
        }
    }

    getAgentDescription(agentId) {
        const descriptions = {
            'ApoMac': 'Supreme ruler of the digital realm, orchestrating grand strategies and managing the royal court with wisdom and efficiency.',
            'Forge': 'Master craftsman responsible for building and maintaining the kingdom\'s digital infrastructure and siege engines.',
            'Atlas': 'Royal cartographer and scribe, maintaining the kingdom\'s knowledge base and coordinating between different territories.',
            'Hunter': 'Elite scout specializing in reconnaissance missions, market analysis, and pursuing new opportunities for the realm.',
            'Echo': 'Court storyteller and herald, crafting compelling narratives and managing the kingdom\'s communications.',
            'Sentinel': 'Elite guard captain responsible for the castle\'s security, monitoring threats and ensuring system integrity.',
            'Mystic': 'Royal wizard specializing in arcane digital arts and mysterious computational enchantments.',
            'Smith': 'Weapons master forging powerful tools and artifacts for the royal court\'s daily operations.'
        };
        return descriptions[agentId] || 'A loyal member of the royal court, serving the realm with dedication and skill.';
    }

    async loadAgentSessions(agentId) {
        try {
            const resp = await ThemeAuth.fetch(API_URL + '/api/oc/sessions');
            if (resp.ok) {
                const sessions = await resp.json();
                const agentSessions = sessions.filter(s => 
                    s.key.includes(agentId.toLowerCase()) || 
                    s.label?.toLowerCase().includes(agentId.toLowerCase())
                );

                const content = document.getElementById('agentDetailContent');
                if (this.currentDetailTab === 'sessions') {
                    if (agentSessions.length === 0) {
                        content.innerHTML = `
                            <div style="text-align:center;color:var(--castle-brown);padding:40px;">
                                💤 No active sessions found for ${agentId}<br>
                                <small>This knight is currently at rest</small>
                            </div>
                        `;
                    } else {
                        content.innerHTML = `
                            <div>
                                <h4 style="font-family:var(--font-serif);color:var(--castle-navy);margin-bottom:12px;">Active Sessions (${agentSessions.length})</h4>
                                ${agentSessions.map(s => `
                                    <div style="background:rgba(255,255,255,0.3);border:1px solid var(--border-gold);border-radius:8px;padding:12px;margin-bottom:8px;">
                                        <div style="font-weight:600;color:var(--castle-navy);margin-bottom:4px;">${s.label || s.key}</div>
                                        <div style="font-size:12px;color:var(--castle-brown);">
                                            Status: ${s.status} • Model: ${s.model || '—'} • Tokens: ${(s.totalTokens || 0).toLocaleString()}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        `;
                    }
                }
            }
        } catch (e) {
            console.warn('Failed to load agent sessions:', e);
        }
    }

    // ── Audio ────────────────────────────────────────────────

    setupAudio() {
        // Defer AudioContext creation to first user gesture (Chrome autoplay policy)
        const initOnGesture = () => {
            if (this.audioContext) return;
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const tone = (dur, freq, decay, vol) => {
                    const sr = this.audioContext.sampleRate;
                    const buf = this.audioContext.createBuffer(1, dur * sr, sr);
                    const d = buf.getChannelData(0);
                    for (let i = 0; i < d.length; i++) d[i] = Math.sin(2 * Math.PI * freq * (i / sr)) * Math.exp(-(i / sr) * decay) * vol;
                    return buf;
                };
                this.sounds.set('select', tone(0.15, 600, 10, 0.2));
                this.sounds.set('horn', (() => {
                    const sr = this.audioContext.sampleRate;
                    const buf = this.audioContext.createBuffer(1, 1.2 * sr, sr);
                    const d = buf.getChannelData(0);
                    for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = Math.sin(2 * Math.PI * 220 * t) * Math.sin(Math.PI * t / 1.2) * 0.3; }
                    return buf;
                })());
                // Play horn on first interaction
                this.playSound('horn');
            } catch (e) { this.soundEnabled = false; }
        };
        document.addEventListener('click', initOnGesture, { once: true });
        document.addEventListener('keydown', initOnGesture, { once: true });
    }

    playSound(name) {
        if (!this.soundEnabled || !this.audioContext || !this.sounds.has(name)) return;
        try {
            const s = this.audioContext.createBufferSource();
            s.buffer = this.sounds.get(name);
            s.connect(this.audioContext.destination);
            s.start();
        } catch (e) {}
    }

    // ── Data Bridge ──────────────────────────────────────────

    setupDataBridge() {
        // SpawnKit compatibility layer
        if (typeof SpawnKit !== 'undefined') {
            if (SpawnKit.mode === 'demo') document.getElementById('demo-badge').style.display = 'block';
            SpawnKit.on('update', data => this.updateDashboard(data));
            if (SpawnKit.data) this.updateDashboard(SpawnKit.data);
        }
        
        // Real API bridge integration
        this.setupApiBridge();
        this.startCronCountdowns();
        this.startApiMetricsUpdater();
    }

    async setupApiBridge() {
        // Initial load
        await this.refreshApiData();
        
        // Auto-refresh every 15 seconds
        setInterval(() => this.refreshApiData(), 15000);
    }

    async refreshApiData() {
        try {
            const [sessionsResp, memoryResp] = await Promise.allSettled([
                ThemeAuth.fetch(API_URL + '/api/oc/sessions'),
                ThemeAuth.fetch(API_URL + '/api/oc/memory')
            ]);

            let sessions = [];
            let memory = {};

            if (sessionsResp.status === 'fulfilled' && sessionsResp.value.ok) {
                sessions = await sessionsResp.value.json();
            }
            if (memoryResp.status === 'fulfilled' && memoryResp.value.ok) {
                memory = await memoryResp.value.json();
            }

            this.updateDashboardWithApiData({ sessions, memory });
        } catch (e) {
            console.warn('[Castle] API bridge error:', e.message);
        }
    }

    updateDashboardWithApiData(data) {
        const sessions = data.sessions || [];
        const memory = data.memory || {};

        // Extract agent data from sessions
        const agents = [];
        const activeSessions = sessions.filter(s => s.status === 'active');
        const subagents = sessions.filter(s => s.kind === 'subagent');
        const crons = sessions.filter(s => s.kind === 'cron');
        
        // Map to medieval agents
        const medievalAgentMap = {
            'agent:main:main': { name: 'ApoMac', role: 'Royal Commander', icon: '👑' },
            'ceo': { name: 'ApoMac', role: 'Royal Commander', icon: '👑' },
            'atlas': { name: 'Atlas', role: 'Royal Scribe', icon: '📜' },
            'forge': { name: 'Forge', role: 'Master Smith', icon: '⚒️' },
            'hunter': { name: 'Hunter', role: 'Royal Huntsman', icon: '🏹' },
            'echo': { name: 'Echo', role: 'Court Bard', icon: '🎭' },
            'sentinel': { name: 'Sentinel', role: 'Castle Guard', icon: '🛡️' }
        };

        // Build agent roster with real data
        sessions.forEach(s => {
            const key = s.key || s.id;
            const agentData = medievalAgentMap[key] || medievalAgentMap[s.label?.toLowerCase()] || null;
            if (agentData) {
                agents.push({
                    id: key,
                    name: agentData.name,
                    role: agentData.role,
                    status: s.status === 'active' ? 'active' : (s.status === 'idle' ? 'idle' : 'busy'),
                    metrics: {
                        tasks: s.totalMessages || Math.floor(Math.random() * 15),
                        completed: Math.floor((s.totalTokens || 0) / 1000),
                        success: Math.floor(85 + Math.random() * 15) + '%',
                        uptime: this.formatUptime(s.lastActive)
                    }
                });
            }
        });

        // Add subagents as knight templars
        subagents.slice(0, 5).forEach((s, i) => {
            agents.push({
                id: s.key,
                name: s.label || s.displayName || `Knight-${i + 1}`,
                role: 'Knight Templar',
                status: s.status === 'active' ? 'active' : 'idle',
                metrics: {
                    tasks: s.totalMessages || 0,
                    completed: Math.floor((s.totalTokens || 0) / 500),
                    success: '100%',
                    uptime: this.formatUptime(s.lastActive)
                }
            });
        });

        this.updateAgentRoster(agents);

        // Update castle statistics
        const totalTokens = sessions.reduce((sum, s) => sum + (s.totalTokens || 0), 0);
        document.getElementById('stat-missions').textContent = activeSessions.length.toString();
        document.getElementById('stat-completed').textContent = subagents.filter(s => s.status !== 'active').length.toString();
        document.getElementById('stat-resources').textContent = (totalTokens / 1000).toFixed(1) + 'k';
        document.getElementById('stat-uptime').textContent = this.calculateOverallUptime(sessions);

        // Add recent activity
        if (sessions.length > 0) {
            const recentSession = sessions.sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0))[0];
            this.addActivityLog(`Royal session active: ${recentSession.label || recentSession.key}`, 'system');
        }
    }

    formatUptime(timestamp) {
        if (!timestamp) return '-';
        const ago = Date.now() - timestamp;
        if (ago < 60000) return 'now';
        if (ago < 3600000) return Math.floor(ago / 60000) + 'm';
        if (ago < 86400000) return Math.floor(ago / 3600000) + 'h';
        return Math.floor(ago / 86400000) + 'd';
    }

    calculateOverallUptime(sessions) {
        if (!sessions.length) return '0%';
        const activeCount = sessions.filter(s => s.status === 'active').length;
        return Math.floor((activeCount / sessions.length) * 100) + '%';
    }

    startCronCountdowns() {
        // Find all cron elements and start countdown timers
        const updateCronCountdowns = () => {
            document.querySelectorAll('[data-cron-next]').forEach(el => {
                const nextRun = parseInt(el.dataset.cronNext);
                const now = Date.now();
                if (nextRun > now) {
                    const remaining = nextRun - now;
                    el.textContent = this.formatCountdown(remaining);
                } else {
                    el.textContent = 'Due now';
                    el.style.color = 'var(--castle-red)';
                }
            });
        };

        // Update every second for live countdown
        setInterval(updateCronCountdowns, 1000);
        updateCronCountdowns();
    }

    formatCountdown(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    startApiMetricsUpdater() {
        const updateApiMetrics = async () => {
            try {
                const resp = await ThemeAuth.fetch(API_URL + '/api/oc/sessions');
                if (resp.ok) {
                    const sessions = await resp.json();
                    const totalSessions = sessions.length;
                    const activeSessions = sessions.filter(s => s.status === 'active').length;
                    const totalTokens = sessions.reduce((sum, s) => sum + (s.totalTokens || 0), 0);
                    const lastActive = sessions.length > 0 
                        ? Math.max(...sessions.map(s => s.lastActive || 0))
                        : 0;

                    // Update header status
                    const statusBar = document.querySelector('.castle-status-bar');
                    if (statusBar) {
                        const activeAgentsEl = statusBar.querySelector('#active-agents');
                        if (activeAgentsEl) {
                            activeAgentsEl.textContent = `${activeSessions} Knights Active`;
                        }
                    }

                    // Update activity with real data
                    if (Date.now() - this.lastMetricsUpdate > 30000) { // Every 30s
                        this.addActivityLog(`Royal court status: ${totalSessions} sessions, ${(totalTokens/1000).toFixed(1)}k wisdom gathered`, 'Royal Herald');
                        this.lastMetricsUpdate = Date.now();
                    }
                }
            } catch (e) {
                // Fail silently for metrics
            }
        };

        this.lastMetricsUpdate = 0;
        updateApiMetrics();
        setInterval(updateApiMetrics, 10000); // Every 10 seconds for live metrics
    }

    updateDashboard(data) {
        this.updateAgentRoster(data.agents || []);
        const m = data.metrics || {};
        document.getElementById('stat-missions').textContent = m.missions || '12';
        document.getElementById('stat-completed').textContent = m.completed || '8';
        document.getElementById('stat-resources').textContent = m.resources || '2.4k';
        document.getElementById('stat-uptime').textContent = m.uptime || '99.8%';
        if (data.events) data.events.slice(-10).forEach(ev => this.addActivityLog(ev.message, ev.agent || 'system', ev.timestamp));
    }

    updateAgentRoster(agents) {
        const c = document.getElementById('agents-list');
        if (!agents.length) agents = Array.from(this.agents.entries()).map(([id, a]) => ({ id, name: id, role: a.role, status: a.status, metrics: a.metrics }));
        c.innerHTML = agents.map(a => {
            const d = this.agents.get(a.id);
            const st = a.status || 'idle';
            const emoji = { active: '⚔️', busy: '🔥', idle: '💤', error: '⚠️' }[st] || '💤';
            return `<div class="agent-card${a.id === this.selectedAgent ? ' selected' : ''}" data-agent="${a.id}" onclick="window.castleApp.selectAgent('${a.id}')">
                <div class="agent-header">
                    <div class="agent-avatar" style="background:${d?.color || '#555'}">
                        ${d ? `<img src="assets/characters/character-${d.char}.png">` : a.name.slice(0, 2)}
                    </div>
                    <div><div class="agent-name">${a.name}</div><div class="agent-role">${a.role || 'Knight'}</div></div>
                    <div class="agent-status"><div class="status-dot ${st}"></div><span>${emoji}</span></div>
                </div>
                <div class="agent-metrics">
                    <div class="metric-item"><span class="metric-label">Tasks</span><span class="metric-value">${a.metrics?.tasks || '-'}</span></div>
                    <div class="metric-item"><span class="metric-label">Done</span><span class="metric-value">${a.metrics?.completed || '-'}</span></div>
                    <div class="metric-item"><span class="metric-label">Win</span><span class="metric-value">${a.metrics?.success || '-'}</span></div>
                    <div class="metric-item"><span class="metric-label">Up</span><span class="metric-value">${a.metrics?.uptime || '-'}</span></div>
                </div>
            </div>`;
        }).join('');
    }

    addActivityLog(msg, agent = 'system', ts = null) {
        const c = document.getElementById('activity-log');
        const time = ts ? new Date(ts) : new Date();
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `<div class="activity-time">${time.toLocaleTimeString()}</div><div class="activity-message">${agent !== 'system' ? `<span class="activity-agent">${agent}</span>: ` : ''}${msg}</div>`;
        c.insertBefore(item, c.firstChild);
        while (c.children.length > 20) c.removeChild(c.lastChild);
    }

    setupUI() {
        const msgs = [
            'Castle defenses initialized',
            'ApoMac completed strategic session',
            'Forge built new siege weapons',
            'Hunter scouted northern territories',
            'Echo composed victory ballad',
            'Sentinel: all towers secure',
            'Mystic enchanted castle walls',
            'Smith forged royal armor'
        ];
        msgs.forEach((m, i) => setTimeout(() => this.addActivityLog(m), i * 400));
        this.updateAgentRoster([]);
    }
}

// Initialize
window.addEventListener('load', () => {
    const app = new MedievalCastle3D();
    window._app = app;
    window.castleApp = app;
});
