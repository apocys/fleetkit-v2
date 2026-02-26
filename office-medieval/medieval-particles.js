import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════
// Medieval Particles — Campfires, Smoke, Fireflies, Dust
// ═══════════════════════════════════════════════════════════

class CampfireEmitter {
    constructor(scene, pos, camera) {
        this.camera = camera;
        this.particles = [];
        for (let i = 0; i < 35; i++) {
            const geo = new THREE.PlaneGeometry(0.07, 0.07);
            const mat = new THREE.MeshBasicMaterial({
                color: 0xff6600, transparent: true, opacity: 0.8,
                side: THREE.DoubleSide, depthWrite: false,
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(
                pos.x + (Math.random() - 0.5) * 0.3,
                pos.y + Math.random() * 0.3,
                pos.z + (Math.random() - 0.5) * 0.3
            );
            mesh.userData = {
                vel: { x: (Math.random()-0.5)*0.2, y: 0.6+Math.random()*0.6, z: (Math.random()-0.5)*0.2 },
                life: Math.random() * 2, maxLife: 1.2 + Math.random() * 0.8,
                ox: pos.x, oy: pos.y, oz: pos.z,
            };
            scene.add(mesh);
            this.particles.push(mesh);
        }
    }
    update(delta) {
        this.particles.forEach(p => {
            const d = p.userData;
            d.life += delta;
            if (d.life > d.maxLife) {
                p.position.set(d.ox + (Math.random()-0.5)*0.3, d.oy, d.oz + (Math.random()-0.5)*0.3);
                d.life = 0; d.maxLife = 1.2 + Math.random() * 0.8;
                p.material.opacity = 0.9; p.scale.setScalar(1);
            }
            const t = d.life / d.maxLife;
            p.position.x += d.vel.x * delta * (1 - t * 0.5);
            p.position.y += d.vel.y * delta;
            p.position.z += d.vel.z * delta * (1 - t * 0.5);
            p.material.opacity = Math.max(0, 0.9 * (1 - t));
            p.scale.setScalar(1 - t * 0.6);
            p.material.color.setRGB(1, 0.4 * (1-t), 0);
            if (this.camera) p.lookAt(this.camera.position);
        });
    }
}

class SmokeEmitter {
    constructor(scene, pos, camera, size) {
        this.camera = camera;
        this.particles = [];
        const count = size === 'large' ? 25 : 15;
        const baseSize = size === 'large' ? 0.35 : 0.2;
        for (let i = 0; i < count; i++) {
            const geo = new THREE.PlaneGeometry(baseSize, baseSize);
            const mat = new THREE.MeshBasicMaterial({
                color: 0xaaaaaa, transparent: true, opacity: 0,
                side: THREE.DoubleSide, depthWrite: false,
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(pos.x, pos.y, pos.z);
            mesh.userData = {
                vel: { x: 0.08 + Math.random()*0.05, y: 0.25+Math.random()*0.3, z: (Math.random()-0.5)*0.06 },
                life: Math.random() * 3, maxLife: 2.5 + Math.random() * 1.5,
                ox: pos.x, oy: pos.y, oz: pos.z,
            };
            scene.add(mesh);
            this.particles.push(mesh);
        }
    }
    update(delta) {
        this.particles.forEach(p => {
            const d = p.userData;
            d.life += delta;
            if (d.life > d.maxLife) {
                p.position.set(d.ox + (Math.random()-0.5)*0.1, d.oy, d.oz + (Math.random()-0.5)*0.1);
                d.life = 0; d.maxLife = 2.5 + Math.random() * 1.5;
                p.scale.setScalar(1);
            }
            const t = d.life / d.maxLife;
            p.position.x += d.vel.x * delta;
            p.position.y += d.vel.y * delta;
            p.position.z += d.vel.z * delta;
            // Fade in → hold → fade out
            if (t < 0.1) p.material.opacity = t * 2;
            else if (t < 0.6) p.material.opacity = 0.2;
            else p.material.opacity = 0.2 * (1 - (t - 0.6) / 0.4);
            p.scale.setScalar(1 + t * 0.8);
            p.material.color.setRGB(0.65 + t*0.1, 0.65 + t*0.1, 0.65 + t*0.1);
            if (this.camera) p.lookAt(this.camera.position);
        });
    }
}

class FireflySystem {
    constructor(scene, camera) {
        this.camera = camera;
        this.fireflies = [];
        for (let i = 0; i < 60; i++) {
            const geo = new THREE.PlaneGeometry(0.04, 0.04);
            const mat = new THREE.MeshBasicMaterial({
                color: 0xffee88, transparent: true, opacity: 0,
                side: THREE.DoubleSide, depthWrite: false,
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(
                (Math.random() - 0.5) * 40,
                0.5 + Math.random() * 1.8,
                12 + Math.random() * 16
            );
            mesh.userData = {
                phase: Math.random() * Math.PI * 2,
                blinkPhase: Math.random() * Math.PI * 2,
                driftX: (Math.random() - 0.5) * 0.3,
                driftZ: (Math.random() - 0.5) * 0.3,
                baseY: mesh.position.y,
            };
            scene.add(mesh);
            this.fireflies.push(mesh);
        }
    }
    update(delta, elapsed, isNight) {
        this.fireflies.forEach(f => {
            const d = f.userData;
            // Only show at night
            const targetOpacity = isNight
                ? Math.max(0, Math.sin(elapsed * 2 + d.blinkPhase) * 0.7 + 0.1)
                : 0;
            f.material.opacity += (targetOpacity - f.material.opacity) * 0.1;
            // Gentle float
            f.position.x += d.driftX * delta;
            f.position.z += d.driftZ * delta;
            f.position.y = d.baseY + Math.sin(elapsed * 1.5 + d.phase) * 0.3;
            // Wrap around
            if (f.position.x > 25) f.position.x = -25;
            if (f.position.x < -25) f.position.x = 25;
            if (f.position.z > 30) f.position.z = 10;
            if (f.position.z < 10) f.position.z = 30;
            if (this.camera) f.lookAt(this.camera.position);
        });
    }
}

class DustSystem {
    constructor(scene, camera) {
        this.camera = camera;
        this.motes = [];
        for (let i = 0; i < 25; i++) {
            const geo = new THREE.PlaneGeometry(0.03, 0.03);
            const mat = new THREE.MeshBasicMaterial({
                color: 0x998866, transparent: true, opacity: 0.2,
                side: THREE.DoubleSide, depthWrite: false,
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(
                (Math.random() - 0.5) * 20,
                Math.random() * 0.4,
                10 + Math.random() * 12
            );
            mesh.userData = {
                driftX: (Math.random() - 0.5) * 0.15,
                driftZ: (Math.random() - 0.5) * 0.1,
                phase: Math.random() * Math.PI * 2,
                baseY: mesh.position.y,
            };
            scene.add(mesh);
            this.motes.push(mesh);
        }
    }
    update(delta, elapsed) {
        this.motes.forEach(m => {
            const d = m.userData;
            m.position.x += d.driftX * delta;
            m.position.z += d.driftZ * delta;
            m.position.y = d.baseY + Math.sin(elapsed + d.phase) * 0.1;
            m.material.opacity = 0.15 + Math.sin(elapsed * 0.8 + d.phase) * 0.08;
            if (m.position.x > 15) m.position.x = -15;
            if (m.position.x < -15) m.position.x = 15;
            if (this.camera) m.lookAt(this.camera.position);
        });
    }
}

// ── Tree Sway ──
function initTreeSway(app) {
    app._swayTrees = [];
    app.scene.traverse(obj => {
        if (obj.userData && (obj.name || '').toLowerCase().includes('tree')) {
            app._swayTrees.push({ obj, phase: Math.random() * Math.PI * 2, baseRY: obj.rotation.y });
        }
    });
    // Also find trees by checking loaded models with 'Tree' label
    // The castle generates trees with label 'Tree' — they're direct scene children
    app.scene.children.forEach(child => {
        if (child.isGroup || child.isMesh) {
            child.traverse(c => {
                if (c.name && c.name.toLowerCase().includes('tree')) {
                    if (!app._swayTrees.find(t => t.obj === child)) {
                        app._swayTrees.push({ obj: child, phase: Math.random() * Math.PI * 2, baseRY: child.rotation.y });
                    }
                }
            });
        }
    });
}

// ── Initialize ──
window.addEventListener('load', () => {
    setTimeout(() => {
        const app = window.castleApp;
        if (!app || !app.scene) { console.warn('[Particles] No castleApp'); return; }

        const scene = app.scene;
        const cam = app.camera;

        // Campfires (at fire basket positions + training ground + graveyard)
        const campfires = [
            new CampfireEmitter(scene, { x: -1.5, y: 0.3, z: 16.5 }, cam),
            new CampfireEmitter(scene, { x: 1.5, y: 0.3, z: 16.5 }, cam),
            new CampfireEmitter(scene, { x: 18, y: 0.2, z: -5 }, cam),
            new CampfireEmitter(scene, { x: -15, y: 0.2, z: -10 }, cam),
        ];

        // Chimney smoke
        const smokeEmitters = [
            new SmokeEmitter(scene, { x: -8, y: 2.5, z: 16 }, cam, 'small'),   // Mission Hall
            new SmokeEmitter(scene, { x: -3, y: 2.2, z: 18 }, cam, 'small'),   // Tavern
            new SmokeEmitter(scene, { x: 3, y: 2.8, z: 17 }, cam, 'small'),    // Library
            new SmokeEmitter(scene, { x: 8, y: 1.8, z: 16 }, cam, 'small'),    // Forge
            new SmokeEmitter(scene, { x: -6, y: 3.2, z: 20 }, cam, 'small'),   // Chapel
            new SmokeEmitter(scene, { x: 0, y: 10, z: 0 }, cam, 'large'),      // Castle keep
        ];

        const fireflies = new FireflySystem(scene, cam);
        const dust = new DustSystem(scene, cam);

        initTreeSway(app);

        // Store on app for debug access
        app._particleSystems = { campfires, smokeEmitters, fireflies, dust };

        // Separate animation loop (own timing)
        let lastTime = performance.now();
        function particleLoop() {
            requestAnimationFrame(particleLoop);
            const now = performance.now();
            const delta = Math.min((now - lastTime) / 1000, 0.05);
            lastTime = now;
            const elapsed = now / 1000;

            // Day/night state for fireflies
            const cycle = (elapsed % 3600) / 3600;
            const sunAngle = cycle * Math.PI * 2 - Math.PI / 2;
            const isNight = Math.sin(sunAngle) < -0.1;

            campfires.forEach(c => c.update(delta));
            smokeEmitters.forEach(s => s.update(delta));
            fireflies.update(delta, elapsed, isNight);
            dust.update(delta, elapsed);

            // Tree sway
            if (app._swayTrees) {
                app._swayTrees.forEach(t => {
                    t.obj.rotation.y = t.baseRY + Math.sin(elapsed * 0.8 + t.phase) * 0.02;
                });
            }
        }
        particleLoop();

        console.log('[Particles] Systems active: ' +
            campfires.length + ' campfires, ' +
            smokeEmitters.length + ' smoke, ' +
            '60 fireflies, 25 dust motes');
    }, 3500); // Wait for world + models to load
});
