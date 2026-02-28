import * as THREE from 'three';

window.addEventListener('load', () => {
    setTimeout(() => {
        const app = window.castleApp;
        if (!app) return;
        initSky(app);
    }, 2500);
});

function initSky(app) {
    // === CLOUDS ===
    const clouds = [];
    for (let i = 0; i < 18; i++) {
        const w = 4 + Math.random() * 6;
        const h = 1.5 + Math.random() * 2;
        const cloudMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.3 + Math.random() * 0.2,
            side: THREE.DoubleSide,
            depthWrite: false,
        });
        const cloud = new THREE.Mesh(new THREE.PlaneGeometry(w, h), cloudMat);
        cloud.position.set(
            (Math.random() - 0.5) * 100,
            32 + Math.random() * 15,
            (Math.random() - 0.5) * 60
        );
        cloud.rotation.x = -Math.PI / 2;
        cloud.userData.speed = 0.3 + Math.random() * 0.8;
        cloud.userData.baseOpacity = cloudMat.opacity;
        app.scene.add(cloud);
        clouds.push(cloud);
    }

    // === MOON ===
    const moonGeo = new THREE.SphereGeometry(2, 16, 16);
    const moonMat = new THREE.MeshBasicMaterial({
        color: 0xeeeeff,
        transparent: true,
        opacity: 0,
    });
    const moon = new THREE.Mesh(moonGeo, moonMat);
    moon.visible = false;
    app.scene.add(moon);

    // === STARS ===
    const starCount = 200;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
        starPositions[i * 3]     = (Math.random() - 0.5) * 150;
        starPositions[i * 3 + 1] = 45 + Math.random() * 30;
        starPositions[i * 3 + 2] = (Math.random() - 0.5) * 150;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.15,
        transparent: true,
        opacity: 0,
    });
    const stars = new THREE.Points(starGeo, starMat);
    app.scene.add(stars);

    // === ANIMATION LOOP ===
    let lastTime = performance.now();
    let twinkleTime = 0;

    function skyLoop() {
        requestAnimationFrame(skyLoop);

        const now = performance.now();
        const delta = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        const elapsed = now / 1000;
        twinkleTime += delta;

        const cycle = (elapsed % 3600) / 3600;
        const sunAngle = cycle * Math.PI * 2 - Math.PI / 2;
        const sunHeight = Math.sin(sunAngle);
        const isNight = sunHeight < -0.1;

        // Clouds: drift + dim at night
        clouds.forEach(c => {
            c.position.x += c.userData.speed * delta;
            if (c.position.x > 55) c.position.x = -55;
            const targetOpacity = isNight ? 0.08 : c.userData.baseOpacity;
            c.material.opacity += (targetOpacity - c.material.opacity) * 0.02;
        });

        // Moon: follows arc opposite sun, fades in/out
        const moonX = -Math.cos(sunAngle) * 35;
        const moonY = Math.max(-Math.sin(sunAngle) * 40, 3);
        moon.position.set(moonX, moonY, -15);
        const moonTarget = isNight ? 1 : 0;
        moonMat.opacity += (moonTarget - moonMat.opacity) * 0.04;
        moon.visible = moonMat.opacity > 0.01;

        // Stars: fade in at night with gentle twinkle
        const starTarget = isNight ? 0.8 : 0;
        starMat.opacity += (starTarget - starMat.opacity) * 0.05;
        if (isNight) {
            // Gentle size twinkle
            starMat.size = 0.12 + Math.sin(twinkleTime * 3.7) * 0.03 + Math.sin(twinkleTime * 5.3) * 0.02;
        }
    }

    skyLoop();
    console.log('[MedievalSky] ✅ Sky system loaded — clouds, moon, stars');
}
