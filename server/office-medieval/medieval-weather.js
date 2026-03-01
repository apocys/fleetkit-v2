import * as THREE from 'three';

window.addEventListener('load', () => {
    setTimeout(() => {
        const app = window.castleApp;
        if (!app) return;
        initWeather(app);
    }, 4000);
});

function initWeather(app) {
    let currentWeather = 'clear';
    let rainSystem = null;
    let snowSystem = null;
    const defaultFogDensity = 0.006;

    // ── Create rain particle system ────────────────────────────
    function createRain() {
        const count = 200;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            positions[i * 3]     = (Math.random() - 0.5) * 60;
            positions[i * 3 + 1] = Math.random() * 30;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
            velocities[i] = 15 + Math.random() * 10;
        }
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({
            color: 0x8899bb,
            size: 0.15,
            transparent: true,
            opacity: 0.6,
            depthWrite: false,
        });
        const points = new THREE.Points(geo, mat);
        points.visible = false;
        points._velocities = velocities;
        app.scene.add(points);
        return points;
    }

    // ── Create snow particle system ────────────────────────────
    function createSnow() {
        const count = 100;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count);
        const drifts = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            positions[i * 3]     = (Math.random() - 0.5) * 60;
            positions[i * 3 + 1] = Math.random() * 30;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
            velocities[i] = 2 + Math.random() * 3;
            drifts[i] = (Math.random() - 0.5) * 2;
        }
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.25,
            transparent: true,
            opacity: 0.8,
            depthWrite: false,
        });
        const points = new THREE.Points(geo, mat);
        points.visible = false;
        points._velocities = velocities;
        points._drifts = drifts;
        app.scene.add(points);
        return points;
    }

    // ── Update rain ────────────────────────────────────────────
    function updateRain(delta) {
        if (!rainSystem || !rainSystem.visible) return;
        const pos = rainSystem.geometry.attributes.position;
        const vel = rainSystem._velocities;
        for (let i = 0; i < vel.length; i++) {
            pos.array[i * 3 + 1] -= vel[i] * delta;
            if (pos.array[i * 3 + 1] < 0) {
                pos.array[i * 3 + 1] = 25 + Math.random() * 5;
                pos.array[i * 3]     = (Math.random() - 0.5) * 60;
                pos.array[i * 3 + 2] = (Math.random() - 0.5) * 60;
            }
        }
        pos.needsUpdate = true;
    }

    // ── Update snow ────────────────────────────────────────────
    function updateSnow(delta) {
        if (!snowSystem || !snowSystem.visible) return;
        const pos = snowSystem.geometry.attributes.position;
        const vel = snowSystem._velocities;
        const dft = snowSystem._drifts;
        for (let i = 0; i < vel.length; i++) {
            pos.array[i * 3 + 1] -= vel[i] * delta;
            pos.array[i * 3]     += dft[i] * delta;
            if (pos.array[i * 3 + 1] < 0) {
                pos.array[i * 3 + 1] = 25 + Math.random() * 5;
                pos.array[i * 3]     = (Math.random() - 0.5) * 60;
                pos.array[i * 3 + 2] = (Math.random() - 0.5) * 60;
            }
        }
        pos.needsUpdate = true;
    }

    // ── Fetch weather from wttr.in ─────────────────────────────
    const RAIN_CODES  = [176, 293, 296, 299, 302, 305, 308, 353, 356, 359];
    const SNOW_CODES  = [227, 230, 323, 326, 329, 332, 335, 338, 368, 371];
    const FOG_CODES   = [143, 248, 260];

    async function fetchWeather() {
        try {
            const resp = await fetch('https://wttr.in/Annecy?format=j1');
            const data = await resp.json();
            const code = parseInt(data.current_condition[0].weatherCode);
            if (RAIN_CODES.includes(code)) currentWeather = 'rain';
            else if (SNOW_CODES.includes(code)) currentWeather = 'snow';
            else if (FOG_CODES.includes(code)) currentWeather = 'fog';
            else currentWeather = 'clear';
        } catch (e) {
            currentWeather = 'clear';
        }
        applyWeather();
        updateBadge();
    }

    // ── Apply weather effects ──────────────────────────────────
    function applyWeather() {
        // Rain
        if (rainSystem) rainSystem.visible = (currentWeather === 'rain');
        // Snow
        if (snowSystem) snowSystem.visible = (currentWeather === 'snow');
        // Fog
        if (app.scene.fog) {
            if (currentWeather === 'fog') {
                app.scene.fog.density = 0.015;
            } else if (currentWeather === 'rain') {
                app.scene.fog.density = 0.009;
            } else {
                app.scene.fog.density = defaultFogDensity;
            }
        }
    }

    // ── Weather badge UI ───────────────────────────────────────
    const WEATHER_ICONS = { clear: '☀️', rain: '🌧️', snow: '❄️', fog: '🌫️', cloudy: '☁️' };
    const badge = document.createElement('div');
    badge.id = 'weather-badge';
    badge.style.cssText = 'position:fixed;top:44px;right:8px;z-index:90;background:rgba(0,0,0,0.6);color:#fff;padding:4px 12px;border-radius:12px;font-size:11px;font-family:Crimson Text,serif;pointer-events:auto;cursor:pointer;backdrop-filter:blur(4px);border:1px solid rgba(201,169,89,0.2);';
    document.body.appendChild(badge);

    // Day/Night label
    function getDayNightLabel() {
        const state = (window.castleApp && window.castleApp._dayNightState);
        if (state) return state.isNight ? '🌙 Night' : '☀️ Day';
        const h = new Date().getHours();
        return (h >= 7 && h < 20) ? '☀️ Day' : '🌙 Night';
    }

    function updateBadge() {
        const icon = WEATHER_ICONS[currentWeather] || '☀️';
        const dayNight = getDayNightLabel();
        badge.textContent = icon + ' ' + currentWeather.charAt(0).toUpperCase() + currentWeather.slice(1) + '  ·  ' + dayNight;
    }

    // Click to cycle weather manually (for testing/preference)
    let weatherOverride = null;
    const weatherCycle = ['clear', 'cloudy', 'rain', 'snow', 'fog'];
    badge.addEventListener('click', () => {
        const idx = weatherCycle.indexOf(currentWeather);
        const next = weatherCycle[(idx + 1) % weatherCycle.length];
        currentWeather = next;
        // Apply weather effects
        if (rainSystem) rainSystem.visible = (next === 'rain');
        if (snowSystem) snowSystem.visible = (next === 'snow');
        if (app.scene.fog) {
            const fogDensities = { fog: 0.015, rain: 0.009, snow: 0.008, cloudy: 0.007, clear: 0.006 };
            app.scene.fog.density = fogDensities[next] || 0.006;
        }
        updateBadge();
    });

    // ── Initialize ─────────────────────────────────────────────
    rainSystem = createRain();
    snowSystem = createSnow();

    // Ensure scene has fog for weather effects
    if (!app.scene.fog) {
        app.scene.fog = new THREE.FogExp2(0x1a1a2e, defaultFogDensity);
    }

    fetchWeather();
    setInterval(fetchWeather, 600000); // 10 minutes

    // ── Animation loop ─────────────────────────────────────────
    let last = performance.now();
    function weatherLoop() {
        requestAnimationFrame(weatherLoop);
        const now = performance.now();
        const delta = Math.min((now - last) / 1000, 0.05);
        last = now;
        if (currentWeather === 'rain') updateRain(delta);
        if (currentWeather === 'snow') updateSnow(delta);
    }
    weatherLoop();

    updateBadge();

    // ── Public API ─────────────────────────────────────────────
    window.MedievalWeather = {
        getCurrentWeather: () => currentWeather,
        refresh: fetchWeather,
    };
}
