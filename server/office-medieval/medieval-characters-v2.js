import * as THREE from 'three';
// medieval-characters-v2.js — Character behavior enhancements v2
// Zones, speech bubbles, animal scale fix, cinematic intro

const ZONES = [
    { name: 'tavern',    x: -5,  z: 24,  r: 4, emoji: '🍺', phrase: 'A flagon of mead!' },
    { name: 'library',   x: 5,   z: 22,  r: 4, emoji: '📖', phrase: 'Knowledge is power...' },
    { name: 'forge',     x: 12,  z: 20,  r: 4, emoji: '🔨', phrase: 'The steel sings!' },
    { name: 'market',    x: 7,   z: 27,  r: 4, emoji: '💰', phrase: 'Fresh wares!' },
    { name: 'chapel',    x: -9,  z: 27,  r: 4, emoji: '🙏', phrase: 'May the light guide us.' },
    { name: 'castle',    x: 0,   z: 0,   r: 8, emoji: '🏰', phrase: 'For the realm!' },
    { name: 'mission',   x: -12, z: 20,  r: 4, emoji: '⚔️', phrase: 'To battle, knights!' },
    { name: 'graveyard', x: -15, z: -10, r: 5, emoji: '💀', phrase: '...silence...' },
    { name: 'farm',      x: -16, z: 10,  r: 5, emoji: '🌾', phrase: 'Good harvest today!' },
    { name: 'river',     x: 0,   z: 14,  r: 3, emoji: '🎣', phrase: 'The fish are biting!' },
];

const ANIMAL_SCALES = { sheep: 1.5, horse: 1.8, chicken: 1.0 };
const ANIMAL_SOUNDS  = { sheep: 'Baa!', horse: 'Neigh!', chicken: '*cluck cluck*' };

// Track which zone each character is in
const charZoneMap = new Map();

function getZone(x, z) {
    for (const zone of ZONES) {
        const dx = x - zone.x, dz = z - zone.z;
        if (Math.sqrt(dx * dx + dz * dz) <= zone.r) return zone;
    }
    return null;
}

function showSpeechBubble(labelEl, phrase) {
    const existing = labelEl.parentElement?.querySelector('.speech-bubble[data-for="' + labelEl.dataset.id + '"]');
    if (existing) existing.remove();

    const bubble = document.createElement('div');
    bubble.className = 'speech-bubble';
    bubble.dataset.for = labelEl.dataset.id || '';
    bubble.textContent = phrase;

    // Position near the label
    bubble.style.left = labelEl.style.left;
    bubble.style.top = (parseFloat(labelEl.style.top || 0) - 24) + 'px';

    const container = document.getElementById('labels-container') || document.body;
    container.appendChild(bubble);

    setTimeout(() => bubble.remove(), 3200);
}

function updateCharacterZones(app) {
    const agents = app.agents;
    const characterModels = app.characterModels;
    const labelElements = app.labelElements;

    if (!agents || !characterModels) return;

    for (const [id, model] of characterModels) {
        const pos = model.group?.position;
        if (!pos) continue;

        const zone = getZone(pos.x, pos.z);
        const prevZone = charZoneMap.get(id);
        const zoneName = zone ? zone.name : null;

        const labelEl = labelElements?.get(id);
        if (!labelEl) continue;

        // Determine emoji
        let emoji;
        if (zone) {
            emoji = zone.emoji;
        } else {
            const agentData = agents.get(id);
            const hasSession = agentData && agentData.sessions && agentData.sessions.length > 0;
            emoji = hasSession ? '⚔️' : '💤';
        }

        const agentData = agents.get(id);
        const agentName = agentData ? (agentData.name || id) : id;

        labelEl.innerHTML = `${agentName}`;

        // Separate always-visible emoji/image bubble above character
        let emojiEl = labelEl._emojiEl;
        if (!emojiEl) {
            emojiEl = document.createElement('div');
            emojiEl.className = 'char-emoji-float';
            emojiEl.style.cssText = 'position:absolute;pointer-events:none;z-index:40;text-align:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.7));transition:opacity 0.3s;';
            (document.getElementById('labels-container') || document.body).appendChild(emojiEl);
            labelEl._emojiEl = emojiEl;
        }
        emojiEl.textContent = emoji;
        // Position above the label
        emojiEl.style.left = labelEl.style.left;
        emojiEl.style.top = (parseFloat(labelEl.style.top || 0) - 20) + 'px';

        // Speech bubble on zone change
        if (zoneName !== prevZone) {
            charZoneMap.set(id, zoneName);
            if (zone) showSpeechBubble(labelEl, zone.phrase);
        }
    }
}

// ── Animal Scale Fix ─────────────────────────────────────────────

let animalTooltip = null;

function fixAnimalScales(app) {
    const animals = app.animals;
    if (!animals || !animals.length) return;

    animals.forEach(animal => {
        const type = (animal.type || '').toLowerCase();
        const scale = ANIMAL_SCALES[type] || 1.0;
        if (animal.group) {
            animal.group.scale.setScalar(scale);
            animal.group.userData.animalType = type;
            animal.group.userData.animalSound = ANIMAL_SOUNDS[type] || '...';
        }
    });
}

function createAnimalTooltip() {
    if (animalTooltip) return;
    animalTooltip = document.createElement('div');
    animalTooltip.style.cssText = `
        position: absolute; pointer-events: none; display: none;
        background: rgba(20,15,10,0.88); color: #f4e4bc;
        font-family: 'Cinzel', serif; font-size: 12px;
        padding: 4px 10px; border-radius: 8px; z-index: 50;
        border: 1px solid rgba(201,169,89,0.5); white-space: nowrap;
    `;
    (document.getElementById('labels-container') || document.body).appendChild(animalTooltip);
}

function updateAnimalHover(app, mouseX, mouseY) {
    if (!app.animals || !app.camera || !app.renderer) return;
    createAnimalTooltip();

    const rect = app.renderer.domElement.getBoundingClientRect();
    const nx = ((mouseX - rect.left) / rect.width) * 2 - 1;
    const ny = -((mouseY - rect.top) / rect.height) * 2 + 1;

    const ray = new THREE.Raycaster();
    if (!ray) return;
    ray.setFromCamera({ x: nx, y: ny }, app.camera);

    const meshes = [];
    app.animals.forEach(a => {
        if (a.group) a.group.traverse(c => { if (c.isMesh) meshes.push(c); });
    });

    const hits = ray.intersectObjects(meshes, false);
    if (hits.length > 0) {
        let obj = hits[0].object;
        while (obj && !obj.userData.animalType) obj = obj.parent;
        if (obj && obj.userData.animalType) {
            animalTooltip.textContent = `${obj.userData.animalType} — ${obj.userData.animalSound}`;
            animalTooltip.style.display = 'block';
            animalTooltip.style.left = (mouseX - rect.left + 14) + 'px';
            animalTooltip.style.top  = (mouseY - rect.top  - 10) + 'px';
            return;
        }
    }
    animalTooltip.style.display = 'none';
}

// ── Cinematic Camera Intro ───────────────────────────────────────

function lerp(a, b, t) { return a + (b - a) * t; }
function lerpV3(v, tx, ty, tz, t) {
    v.x = lerp(v.x, tx, t);
    v.y = lerp(v.y, ty, t);
    v.z = lerp(v.z, tz, t);
}

function runCinematicIntro(app) {
    if (localStorage.getItem('medieval-intro-done')) return;
    if (!app.camera || !app.controls) return;

    app.controls.enabled = false;
    app.camera.position.set(40, 50, 40);
    app.controls.target.set(0, 0, 0);
    app.controls.update();

    const phases = [
        { dur: 3000, camTo: [15, 20, 25], tgtTo: [0, 5, 15] },
        { dur: 3000, camTo: [20, 18, 30], tgtTo: [0, 2, 0] },
    ];

    let phase = 0;
    let start = performance.now();

    function tick(now) {
        if (phase >= phases.length) {
            app.controls.enabled = true;
            localStorage.setItem('medieval-intro-done', '1');
            return;
        }
        const p = phases[phase];
        const elapsed = now - start;
        const t = Math.min(elapsed / p.dur, 1);
        const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;

        lerpV3(app.camera.position, p.camTo[0], p.camTo[1], p.camTo[2], ease * 0.05 + 0.01);
        lerpV3(app.controls.target, p.tgtTo[0], p.tgtTo[1], p.tgtTo[2], ease * 0.05 + 0.01);
        app.controls.update();

        if (t >= 1) { phase++; start = performance.now(); }
        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

// ── Bootstrap ────────────────────────────────────────────────────

function bootstrap() {
    const app = window.castleApp;
    if (!app || !app.scene) {
        setTimeout(bootstrap, 500);
        return;
    }

    // Import THREE from scene context if needed
    // THREE imported as ES module

    fixAnimalScales(app);
    runCinematicIntro(app);

    // Zone update every 2s
    setInterval(() => updateCharacterZones(app), 2000);

    // Mouse hover for animals
    const canvas = app.renderer?.domElement;
    if (canvas) {
        canvas.addEventListener('mousemove', e => updateAnimalHover(app, e.clientX, e.clientY));
    }
}

bootstrap();
