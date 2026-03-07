import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ═══════════════════════════════════════════════════════════════
// MedievalWorld — World design layer for MedievalCastle3D scene
// Adds: dirt paths, town square, well, farms, curved river,
//       graveyard, village lights, lantern glow, siege grounds
// ═══════════════════════════════════════════════════════════════

window.addEventListener('load', () => {
    // Wait for castleApp init + model loading
    const waitForApp = (attempts = 0) => {
        const app = window.castleApp;
        if (app && app.scene && app.clock) {
            initWorld(app);
        } else if (attempts < 20) {
            setTimeout(() => waitForApp(attempts + 1), 300);
        }
    };
    setTimeout(() => waitForApp(), 1800);
});

function makePath(scene, pathMat, from, to, width) {
    const dx = to[0] - from[0];
    const dz = to[1] - from[1];
    const len = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dx, dz);
    const geo = new THREE.PlaneGeometry(width, len, 1, Math.ceil(len * 2));
    // Slight vertex randomization for organic dirt look
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const edgeFactor = Math.abs(pos.getX(i)) / (width / 2);
        if (edgeFactor > 0.6) {
            pos.setX(i, pos.getX(i) + (Math.random() - 0.5) * 0.12 * edgeFactor);
            pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * 0.06);
        }
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, pathMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = -angle;
    mesh.position.set((from[0] + to[0]) / 2, 0.022, (from[1] + to[1]) / 2);
    mesh.receiveShadow = true;
    scene.add(mesh);
}

function loadGLB(loader, scene, path, x, y, z, ry, scale) {
    loader.load(path, (gltf) => {
        const m = gltf.scene;
        m.position.set(x, y, z);
        if (ry) m.rotation.y = ry;
        if (scale !== 1) m.scale.setScalar(scale);
        m.traverse(c => {
            if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
        });
        scene.add(m);
    }, undefined, () => {}); // silence 404s for optional assets
}

function initWorld(app) {
    const scene = app.scene;
    const loader = new GLTFLoader();

    // Remove original flat river: PlaneGeometry(60, 3) at y=0.01, z=12
    const toRemove = [];
    scene.children.forEach(child => {
        if (child.isMesh && child.geometry?.parameters?.width === 60
            && child.geometry?.parameters?.height === 3) {
            toRemove.push(child);
        }
    });
    toRemove.forEach(m => scene.remove(m));

    // ── CURVED RIVER ────────────────────────────────────────────
    const riverShape = new THREE.Shape();
    riverShape.moveTo(-56, -1.8);
    riverShape.bezierCurveTo(-38, -3.2, -22, 0.4, -8, -0.8);
    riverShape.bezierCurveTo(0, -1.4, 8, -2.4, 20, -1.2);
    riverShape.bezierCurveTo(36, 0.2, 46, -3.2, 56, -1.6);
    riverShape.lineTo(56, 2.2);
    riverShape.bezierCurveTo(46, -0.2, 36, 3.0, 20, 1.6);
    riverShape.bezierCurveTo(8, 0.4, 0, 2.4, -8, 1.6);
    riverShape.bezierCurveTo(-22, 3.2, -38, 0.0, -56, 1.6);
    riverShape.closePath();

    const riverGeo = new THREE.ShapeGeometry(riverShape, 32);
    const riverMat = new THREE.MeshStandardMaterial({
        color: 0x1e6fa0,
        roughness: 0.08,
        metalness: 0.35,
        transparent: true,
        opacity: 0.78,
    });
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.rotation.x = -Math.PI / 2;
    river.position.set(0, 0.032, 12);
    river.receiveShadow = true;
    scene.add(river);

    // River banks — muddy edges
    const bankMat = new THREE.MeshStandardMaterial({ color: 0x4e5e2e, roughness: 0.92 });
    [-2.8, 2.8].forEach(side => {
        const bank = new THREE.Mesh(new THREE.PlaneGeometry(62, 1.2), bankMat);
        bank.rotation.x = -Math.PI / 2;
        bank.position.set(0, 0.014, 12 + side);
        bank.receiveShadow = true;
        scene.add(bank);
    });

    // ── DIRT PATHS ──────────────────────────────────────────────
    const pathMat = new THREE.MeshStandardMaterial({
        color: 0x8b7250,
        roughness: 0.97,
        metalness: 0.0,
    });

    const pathDefs = [
        // Main road south from castle gate
        { from: [0, 10.2], to: [0, 13.8], width: 1.3 },  // bridge/gate to river crossing
        { from: [0, 14.2], to: [0, 16.2], width: 1.3 },  // river crossing to village center
        // Town square approaches
        { from: [0, 16.2], to: [-3.2, 18.2], width: 0.9 },  // west branch → tavern
        { from: [0, 16.2], to: [7.8, 16.2], width: 0.85 },  // east branch → forge
        { from: [0, 16.2], to: [3.2, 17.6], width: 0.8 },   // northeast → library
        { from: [3.2, 17.6], to: [5.4, 20.4], width: 0.8 }, // → market
        { from: [-3.2, 18.2], to: [-6.2, 20.6], width: 0.8 }, // west → chapel
        { from: [0, 16.2], to: [-8.0, 16.2], width: 0.8 },   // west → mission hall
        // North approach paths alongside castle
        { from: [-8, 5], to: [-5, 9], width: 0.7 },
        { from: [8, 5], to: [5, 9], width: 0.7 },
    ];

    pathDefs.forEach(p => makePath(scene, pathMat, p.from, p.to, p.width));

    // ── TOWN SQUARE ─────────────────────────────────────────────
    const ringGeo = new THREE.RingGeometry(2.0, 3.0, 20);
    const cobbleMat = new THREE.MeshStandardMaterial({ color: 0x7a7060, roughness: 0.88 });
    const ring = new THREE.Mesh(ringGeo, cobbleMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.024, 16);
    ring.receiveShadow = true;
    scene.add(ring);

    // Inner stone plaza
    const plazaGeo = new THREE.CircleGeometry(2.1, 20);
    const plazaMat = new THREE.MeshStandardMaterial({ color: 0x918878, roughness: 0.82 });
    const plaza = new THREE.Mesh(plazaGeo, plazaMat);
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.set(0, 0.026, 16);
    plaza.receiveShadow = true;
    scene.add(plaza);

    // ── WELL ────────────────────────────────────────────────────
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6e6860, roughness: 0.85 });
    const woodMat  = new THREE.MeshStandardMaterial({ color: 0x7a4820, roughness: 0.9 });

    // Base cylinder
    const wellBase = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.45, 0.55, 10), stoneMat);
    wellBase.position.set(0, 0.275, 16);
    wellBase.castShadow = true;
    scene.add(wellBase);

    // Inner water surface
    const waterDisc = new THREE.Mesh(
        new THREE.CircleGeometry(0.3, 10),
        new THREE.MeshStandardMaterial({ color: 0x2277aa, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.8 })
    );
    waterDisc.rotation.x = -Math.PI / 2;
    waterDisc.position.set(0, 0.56, 16);
    scene.add(waterDisc);

    // Wooden support posts
    [[-0.35, 0, 16 - 0.35], [0.35, 0, 16 + 0.35], [-0.35, 0, 16 + 0.35], [0.35, 0, 16 - 0.35]].forEach(([x, , z]) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.9, 6), woodMat);
        post.position.set(x, 0.72, z);
        post.castShadow = true;
        scene.add(post);
    });

    // Roof beam + cone
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.06, 0.06), woodMat);
    beam.position.set(0, 1.16, 16);
    beam.castShadow = true;
    scene.add(beam);
    const wellRoof = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.42, 4), woodMat);
    wellRoof.position.set(0, 1.42, 16);
    wellRoof.rotation.y = Math.PI / 4;
    wellRoof.castShadow = true;
    scene.add(wellRoof);

    // ── FARM PLOTS ───────────────────────────────────────────────
    const farmMat = new THREE.MeshStandardMaterial({ color: 0x543d2a, roughness: 0.97 });
    const cropMat = new THREE.MeshStandardMaterial({ color: 0x68b820, roughness: 0.8 });
    const dryMat  = new THREE.MeshStandardMaterial({ color: 0xb8a040, roughness: 0.9 });

    const farms = [
        { x: -18, z: 10,  w: 4.0, d: 3.0, dry: false },
        { x: -14, z: 11,  w: 3.0, d: 2.5, dry: true },
        { x:  17, z: 10,  w: 3.5, d: 3.0, dry: false },
        { x:  21, z: 11,  w: 3.0, d: 2.0, dry: true },
    ];

    farms.forEach(f => {
        const soil = new THREE.Mesh(new THREE.PlaneGeometry(f.w, f.d), farmMat);
        soil.rotation.x = -Math.PI / 2;
        soil.position.set(f.x, 0.016, f.z);
        soil.receiveShadow = true;
        scene.add(soil);

        const mat = f.dry ? dryMat : cropMat;
        const rows = 4;
        for (let r = 0; r < rows; r++) {
            const rowZ = f.z - f.d / 2 + (f.d / rows) * (r + 0.5);
            const row = new THREE.Mesh(new THREE.BoxGeometry(f.w * 0.82, 0.14, 0.1), mat);
            row.position.set(f.x, 0.09, rowZ);
            row.castShadow = true;
            scene.add(row);
        }
    });

    // ── GRAVEYARD (northwest, atmospheric) ──────────────────────
    const graveyardGnd = new THREE.Mesh(
        new THREE.CircleGeometry(5.5, 16),
        new THREE.MeshStandardMaterial({ color: 0x2a3522, roughness: 0.98 })
    );
    graveyardGnd.rotation.x = -Math.PI / 2;
    graveyardGnd.position.set(-15, 0.013, -10);
    graveyardGnd.receiveShadow = true;
    scene.add(graveyardGnd);

    for (let i = -2; i <= 2; i++) {
        loadGLB(loader, scene, 'assets/graveyard/iron-fence.glb', -15 + i * 2, 0, -7, 0, 1);
    }
    loadGLB(loader, scene, 'assets/graveyard/iron-fence-border-gate.glb', -15, 0, -6.5, 0, 1);

    const gravestones = [
        ['gravestone-round',      -15.2, 0, -10.5,  0.15, 0.85],
        ['gravestone-cross',      -16.6, 0, -10.8,  0.00, 0.80],
        ['gravestone-wide',       -13.6, 0, -10.4, -0.12, 0.78],
        ['gravestone-decorative', -15.0, 0, -12.0,  0.05, 0.82],
        ['gravestone-round',      -14.0, 0, -11.8, -0.20, 0.75],
        ['gravestone-cross',      -16.2, 0, -12.4,  0.30, 0.80],
        ['cross',                 -16.0, 0, -10.0,  0.28, 0.82],
        ['cross',                 -14.1, 0, -10.2, -0.18, 0.78],
    ];
    gravestones.forEach(([name, x, y, z, ry, s]) => {
        loadGLB(loader, scene, `assets/graveyard/${name}.glb`, x, y, z, ry, s);
    });

    loadGLB(loader, scene, 'assets/graveyard/pine.glb',         -18.5, 0, -10, 0.1, 1.3);
    loadGLB(loader, scene, 'assets/graveyard/pine-crooked.glb', -11.5, 0, -12, 0.5, 1.0);
    loadGLB(loader, scene, 'assets/graveyard/pine.glb',         -17.0, 0, -13, 0.3, 0.9);

    // Graveyard ambient light (eerie green-tinted)
    const graveyardLight = new THREE.PointLight(0x44ff88, 0.4, 10, 2);
    graveyardLight.position.set(-15, 1.5, -10);
    scene.add(graveyardLight);

    // ── GRAVEYARD EXPANSION ──────────────────────────────────────
    // Crypts
    loadGLB(loader, scene, 'assets/graveyard/crypt-large.glb',      -18, 0,   -14,   0,            1.0);
    loadGLB(loader, scene, 'assets/graveyard/crypt-large-door.glb', -18, 0,   -13.5, 0,            1.0);
    loadGLB(loader, scene, 'assets/graveyard/crypt-large-roof.glb', -18, 1.5, -14,   0,            1.0);
    loadGLB(loader, scene, 'assets/graveyard/crypt-small.glb',      -13, 0,   -13,   0,            1.0);

    // Coffins
    loadGLB(loader, scene, 'assets/graveyard/coffin.glb',     -15.5, 0, -12.5, 0.35,  1.0);
    loadGLB(loader, scene, 'assets/graveyard/coffin-old.glb', -14.5, 0, -12,  -0.2,   1.0);

    // Altar with candles
    loadGLB(loader, scene, 'assets/graveyard/altar-stone.glb',    -16,   0,   -9,    0, 1.0);
    loadGLB(loader, scene, 'assets/graveyard/candle-multiple.glb', -16,   0.5, -9,    0, 1.0);
    loadGLB(loader, scene, 'assets/graveyard/candle.glb',         -18.5, 0,   -13,   0, 1.0);
    loadGLB(loader, scene, 'assets/graveyard/candle.glb',         -17.5, 0,   -14.5, 0, 1.0);

    // Columns flanking graveyard entrance
    loadGLB(loader, scene, 'assets/graveyard/column-large.glb', -19, 0, -11, 0, 1.0);
    loadGLB(loader, scene, 'assets/graveyard/column-large.glb', -12, 0, -11, 0, 1.0);

    // Crosses
    loadGLB(loader, scene, 'assets/graveyard/cross-column.glb', -15, 0, -13,   0,    1.0);
    loadGLB(loader, scene, 'assets/graveyard/cross-wood.glb',   -14, 0, -14,   0.12, 1.0);
    loadGLB(loader, scene, 'assets/graveyard/cross-wood.glb',   -16, 0, -14,  -0.08, 1.0);

    // Extra gravestones scattered
    loadGLB(loader, scene, 'assets/graveyard/gravestone-bevel.glb',  -17.5, 0, -11,   0.18,  0.85);
    loadGLB(loader, scene, 'assets/graveyard/gravestone-bevel.glb',  -13.2, 0, -11.5, -0.22, 0.80);
    loadGLB(loader, scene, 'assets/graveyard/gravestone-broken.glb', -18.0, 0, -12.5,  0.10, 0.78);
    loadGLB(loader, scene, 'assets/graveyard/gravestone-broken.glb', -12.5, 0, -14,   -0.15, 0.82);

    // Border pillars at fence corners
    loadGLB(loader, scene, 'assets/graveyard/border-pillar.glb', -20, 0, -8,  0, 1.0);
    loadGLB(loader, scene, 'assets/graveyard/border-pillar.glb', -10, 0, -8,  0, 1.0);
    loadGLB(loader, scene, 'assets/graveyard/border-pillar.glb', -20, 0, -16, 0, 1.0);
    loadGLB(loader, scene, 'assets/graveyard/border-pillar.glb', -10, 0, -16, 0, 1.0);

    // Fallen tree for atmosphere
    loadGLB(loader, scene, 'assets/graveyard/pine-fall.glb', -20, 0, -12, 0.5, 1.0);

    // Additional iron-fence segments to complete rectangular enclosure
    // North wall (z = -16)
    for (let i = 0; i < 5; i++) {
        loadGLB(loader, scene, 'assets/graveyard/iron-fence.glb', -20 + i * 2, 0, -16, 0, 1);
    }
    // South wall already exists (original z = -7), extend west
    loadGLB(loader, scene, 'assets/graveyard/iron-fence.glb', -19, 0, -7, 0, 1);
    loadGLB(loader, scene, 'assets/graveyard/iron-fence.glb', -17, 0, -7, 0, 1);
    // West wall (x = -20)
    for (let i = 0; i < 4; i++) {
        loadGLB(loader, scene, 'assets/graveyard/iron-fence.glb', -20, 0, -8 - i * 2, Math.PI / 2, 1);
    }
    // East wall (x = -10)
    for (let i = 0; i < 4; i++) {
        loadGLB(loader, scene, 'assets/graveyard/iron-fence.glb', -10, 0, -8 - i * 2, Math.PI / 2, 1);
    }

    // Crypt interior eerie glow
    const cryptLight = new THREE.PointLight(0x33ff66, 1.5, 5, 2);
    cryptLight.position.set(-18, 1, -14);
    scene.add(cryptLight);

    // Candle warm glow on altar
    const altarLight = new THREE.PointLight(0xffaa44, 1.0, 4, 2);
    altarLight.position.set(-16, 1, -9);
    scene.add(altarLight);

    // ── GRAVEYARD NPCs ───────────────────────────────────────────
    app.graveyardNPCs = [];

    const graveyardNPCDefs = [
        { file: 'character-ghost.glb',    x: -16, z: -11, speed: 0.4, radius: 4, ghost: true  },
        { file: 'character-skeleton.glb', x: -14, z: -13, speed: 0.5, radius: 3, ghost: false },
        { file: 'character-keeper.glb',   x: -12, z: -10, speed: 0.6, radius: 5, ghost: false },
    ];

    graveyardNPCDefs.forEach(def => {
        loader.load(`assets/graveyard/${def.file}`, (gltf) => {
            const m = gltf.scene;
            m.position.set(def.x, 0, def.z);
            m.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
            scene.add(m);
            app.graveyardNPCs.push({
                mesh: m,
                homeX: def.x, homeZ: def.z,
                targetX: def.x, targetZ: def.z,
                speed: def.speed, radius: def.radius,
                ghost: def.ghost,
                wanderTimer: Math.random() * 5,
            });
        }, undefined, () => {});
    });

    // ── VILLAGE PROPS ────────────────────────────────────────────
    // Lantern posts along main road
    loadGLB(loader, scene, 'assets/graveyard/lightpost-single.glb', -1.2, 0, 14.0, 0.0, 0.85);
    loadGLB(loader, scene, 'assets/graveyard/lightpost-single.glb',  1.2, 0, 14.0, Math.PI, 0.85);
    loadGLB(loader, scene, 'assets/graveyard/lightpost-single.glb', -4.2, 0, 17.2, 0.0, 0.82);
    loadGLB(loader, scene, 'assets/graveyard/lightpost-single.glb',  6.2, 0, 18.0, 0.0, 0.82);
    loadGLB(loader, scene, 'assets/graveyard/lightpost-double.glb',  0.0, 0, 16.5, 0.0, 0.72); // town center

    // Benches around town square
    loadGLB(loader, scene, 'assets/graveyard/bench.glb', -2.0, 0, 14.8,  Math.PI * 0.3,  0.72);
    loadGLB(loader, scene, 'assets/graveyard/bench.glb',  2.0, 0, 14.8, -Math.PI * 0.3,  0.72);
    loadGLB(loader, scene, 'assets/graveyard/bench.glb', -2.8, 0, 16.8,  Math.PI * 0.75, 0.72);
    loadGLB(loader, scene, 'assets/graveyard/bench.glb',  2.8, 0, 16.8, -Math.PI * 0.75, 0.72);

    // Fire baskets flanking paths
    loadGLB(loader, scene, 'assets/graveyard/fire-basket.glb', -1.4, 0, 16.8, 0, 0.82);
    loadGLB(loader, scene, 'assets/graveyard/fire-basket.glb',  1.4, 0, 16.8, 0, 0.82);
    loadGLB(loader, scene, 'assets/graveyard/fire-basket.glb', -0.8, 0, 10.8, 0, 0.75); // castle gate
    loadGLB(loader, scene, 'assets/graveyard/fire-basket.glb',  0.8, 0, 10.8, 0, 0.75);

    // Farm fences
    loadGLB(loader, scene, 'assets/graveyard/fence.glb', -19.0, 0, 8.5, 0, 1);
    loadGLB(loader, scene, 'assets/graveyard/fence.glb', -17.0, 0, 8.5, 0, 1);
    loadGLB(loader, scene, 'assets/graveyard/fence.glb', -15.0, 0, 8.5, 0, 1);
    loadGLB(loader, scene, 'assets/graveyard/fence.glb',  16.0, 0, 8.5, 0, 1);
    loadGLB(loader, scene, 'assets/graveyard/fence.glb',  18.0, 0, 8.5, 0, 1);
    loadGLB(loader, scene, 'assets/graveyard/fence.glb',  20.0, 0, 8.5, 0, 1);

    // Road cobble segments (bridge area over river)
    loadGLB(loader, scene, 'assets/graveyard/road.glb', 0, 0.02, 11.0, 0, 1);
    loadGLB(loader, scene, 'assets/graveyard/road.glb', 0, 0.02, 13.2, 0, 1);

    // ── SIEGE / TRAINING GROUNDS ────────────────────────────────
    loadGLB(loader, scene, 'assets/castle/siege-catapult.glb',  19, 0, -5, Math.PI / 6,  0.82);
    loadGLB(loader, scene, 'assets/castle/siege-ballista.glb',  21, 0, -3, Math.PI / 4,  0.80);
    loadGLB(loader, scene, 'assets/castle/siege-trebuchet.glb', 17, 0, -7, 0,            0.72);

    // ── LANTERN POINT LIGHTS (day/night animated) ────────────────
    const lanternPositions = [
        [-1.2, 1.3, 14.0], [1.2, 1.3, 14.0],
        [-4.2, 1.3, 17.2], [6.2, 1.3, 18.0],
        [0.0,  1.5, 16.5], // double post
        [-1.4, 0.9, 16.8], [1.4, 0.9, 16.8], // fire baskets
        [-0.8, 0.9, 10.8], [0.8, 0.9, 10.8], // gate baskets
    ];
    app.villageLights = [];
    lanternPositions.forEach(([x, y, z]) => {
        const light = new THREE.PointLight(0xffaa44, 0, 6, 2);
        light.position.set(x, y, z);
        scene.add(light);
        app.villageLights.push(light);
    });

    app._riverMesh = river;
    app._riverOrigPos = river.geometry.attributes.position.array.slice();

    // Patch animate loop to inject world-layer updates
    const _origPrototypeAnimate = app.constructor.prototype.animate;
    app.animate = function () {
        requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();
        const elapsed = this.clock.getElapsedTime();

        this.controls.update();
        this.animationMixers.forEach(mx => mx.update(delta));
        this.animateCharacters(delta, elapsed);
        this.animateTorches(elapsed);
        this.animateAnimals(delta);
        this.updateDayNight(elapsed);

        // River surface ripple
        if (this._riverMesh) {
            const pos = this._riverMesh.geometry.attributes.position;
            const orig = this._riverOrigPos;
            for (let i = 0; i < pos.count; i++) {
                const ox = orig[i * 3];
                const oy = orig[i * 3 + 1];
                pos.array[i * 3]     = ox + Math.sin(elapsed * 1.4 + oy * 0.8) * 0.06;
                pos.array[i * 3 + 1] = oy + Math.sin(elapsed * 1.8 + ox * 0.4) * 0.12;
            }
            pos.needsUpdate = true;
        }

        // Village lights: fade on at night, off by day
        if (this.villageLights) {
            const cycle = (elapsed % 3600) / 3600;
            const sunAngle = cycle * Math.PI * 2 - Math.PI / 2;
            const targetIntensity = Math.sin(sunAngle) < -0.15 ? 2.8 : 0;
            this.villageLights.forEach(l => {
                l.intensity += (targetIntensity - l.intensity) * 0.04;
            });
        }

        // Graveyard NPC wandering + ghost bob
        if (this.graveyardNPCs && this.graveyardNPCs.length > 0) {
            this.graveyardNPCs.forEach(npc => {
                npc.wanderTimer -= delta;
                if (npc.wanderTimer <= 0) {
                    npc.targetX = npc.homeX + (Math.random() - 0.5) * npc.radius * 2;
                    npc.targetZ = npc.homeZ + (Math.random() - 0.5) * npc.radius * 2;
                    npc.wanderTimer = 5 + Math.random() * 5;
                }
                const dx = npc.targetX - npc.mesh.position.x;
                const dz = npc.targetZ - npc.mesh.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist > 0.05) {
                    const step = Math.min(npc.speed * delta, dist);
                    npc.mesh.position.x += (dx / dist) * step;
                    npc.mesh.position.z += (dz / dist) * step;
                    npc.mesh.rotation.y = Math.atan2(dx, dz);
                }
                // Ghost float bob
                if (npc.ghost) {
                    npc.mesh.position.y = 0.3 + Math.sin(elapsed * 1.8 + npc.homeX) * 0.35 + 0.35;
                }
            });
        }

        this.updateLabels();
        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    };

    console.log('[MedievalWorld] ✅ World design loaded — paths, town square, well, farms, graveyard, river, lanterns');
}
