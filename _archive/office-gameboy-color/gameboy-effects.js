/**
 * GameBoy Color Pokémon Sound & Visual Effects System
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Full-color GBC edition! Same chiptune sounds + Canvas2D visual effects +
 * particle systems + Pokémon-style dialog boxes. Now with a warm, vibrant
 * color palette instead of 4-shade green.
 * 
 * Think Pokémon Crystal, Link's Awakening DX — colorful but authentically retro.
 * 
 * @author Echo (CMO) 🎵
 * @version 2.0.0 — GameBoy Color Edition
 */

(function (global) {
  'use strict';

  // ─── GBC Color Palette ───────────────────────────────────────────
  const PAL = {
    lightest: '#E2C275',  // Warm gold
    light:    '#53868B',  // Teal
    dark:     '#16213E',  // Dark blue
    darkest:  '#1A1A2E',  // Deep navy
    // Extended GBC colors
    gold:     '#D4A853',
    blue:     '#4A90D9',
    red:      '#C0392B',
    purple:   '#9B59B6',
    teal:     '#53868B',
    silver:   '#A0A0B0',
    green:    '#5CB85C',
    amber:    '#CC7A30',
    cream:    '#F5E6C8',
    navy:     '#0F3460',
    // For particle variety
    all: ['#E2C275', '#53868B', '#4A90D9', '#D4A853', '#9B59B6', '#5CB85C', '#C0392B', '#A0A0B0'],
  };

  // ─── Audio Context (lazy init to respect autoplay) ───────────────
  let _audioCtx = null;
  let _masterGain = null;

  function getAudioCtx() {
    if (!_audioCtx) {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      _masterGain = _audioCtx.createGain();
      _masterGain.gain.value = GameBoyFX.volume;
      _masterGain.connect(_audioCtx.destination);
    }
    if (_audioCtx.state === 'suspended') {
      _audioCtx.resume();
    }
    return _audioCtx;
  }

  function getMasterGain() {
    getAudioCtx();
    return _masterGain;
  }

  // ─── Oscillator Helpers ──────────────────────────────────────────

  /** Create a simple oscillator note */
  function playNote(freq, type, startTime, duration, gainVal, detune) {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, startTime);
    if (detune) osc.detune.setValueAtTime(detune, startTime);

    gain.gain.setValueAtTime(gainVal || 0.3, startTime);
    gain.gain.linearRampToValueAtTime(gainVal || 0.3, startTime + 0.005);
    gain.gain.setValueAtTime(gainVal || 0.3, startTime + duration - 0.01);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.connect(gain);
    gain.connect(getMasterGain());

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  /** Play noise burst (for percussion/effects) */
  function playNoise(startTime, duration, gainVal) {
    const ctx = getAudioCtx();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainVal || 0.15, startTime);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    source.connect(gain);
    gain.connect(getMasterGain());
    source.start(startTime);
    source.stop(startTime + duration);
  }

  /** Play a frequency sweep */
  function playSweep(startFreq, endFreq, type, startTime, duration, gainVal) {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type || 'square';
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.linearRampToValueAtTime(endFreq, startTime + duration);

    gain.gain.setValueAtTime(gainVal || 0.25, startTime);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.connect(gain);
    gain.connect(getMasterGain());
    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  // ─── Overlay Canvas (for visual effects & particles) ─────────────

  let _overlayCanvas = null;
  let _overlayCtx = null;
  let _animationCallbacks = [];
  let _animLoopRunning = false;

  function getOverlay() {
    if (_overlayCanvas && _overlayCanvas.parentElement) return { canvas: _overlayCanvas, ctx: _overlayCtx };

    const container = document.getElementById('gameContainer');
    if (!container) return null;

    const pixiCanvas = container.querySelector('canvas');
    const w = pixiCanvas ? pixiCanvas.width : 800;
    const h = pixiCanvas ? pixiCanvas.height : 600;

    _overlayCanvas = document.createElement('canvas');
    _overlayCanvas.id = 'gbfx-overlay';
    _overlayCanvas.width = w;
    _overlayCanvas.height = h;
    _overlayCanvas.style.cssText = `
      position: absolute; top: 0; left: 0;
      width: ${w}px; height: ${h}px;
      pointer-events: none;
      image-rendering: pixelated;
      image-rendering: -moz-crisp-edges;
      image-rendering: crisp-edges;
      z-index: 1000;
    `;
    container.style.position = 'relative';
    container.appendChild(_overlayCanvas);

    _overlayCtx = _overlayCanvas.getContext('2d');
    _overlayCtx.imageSmoothingEnabled = false;

    startAnimLoop();
    return { canvas: _overlayCanvas, ctx: _overlayCtx };
  }

  /** Register a per-frame callback; return a cancel function */
  function onFrame(callback) {
    _animationCallbacks.push(callback);
    startAnimLoop();
    return () => {
      const idx = _animationCallbacks.indexOf(callback);
      if (idx >= 0) _animationCallbacks.splice(idx, 1);
    };
  }

  function startAnimLoop() {
    if (_animLoopRunning) return;
    _animLoopRunning = true;
    let lastTime = performance.now();

    function loop(now) {
      if (_animationCallbacks.length === 0) {
        _animLoopRunning = false;
        if (_overlayCtx && _overlayCanvas) {
          _overlayCtx.clearRect(0, 0, _overlayCanvas.width, _overlayCanvas.height);
        }
        return;
      }

      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const overlay = getOverlay();
      if (overlay) {
        overlay.ctx.clearRect(0, 0, overlay.canvas.width, overlay.canvas.height);

        for (let i = _animationCallbacks.length - 1; i >= 0; i--) {
          const done = _animationCallbacks[i](overlay.ctx, dt, now);
          if (done === true) {
            _animationCallbacks.splice(i, 1);
          }
        }
      }

      requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
  }


  // ═══════════════════════════════════════════════════════════════════
  //  1. CHIPTUNE SOUND EFFECTS (identical to original — sounds don't change)
  // ═══════════════════════════════════════════════════════════════════

  const sounds = {

    mailNotification() {
      const ctx = getAudioCtx();
      const t = ctx.currentTime;
      playNote(523.25, 'square', t,       0.12, 0.25);
      playNote(659.25, 'square', t + 0.13, 0.12, 0.25);
      playNote(783.99, 'square', t + 0.26, 0.20, 0.30);
      playNote(783.99 * 2, 'square', t + 0.26, 0.10, 0.08);
    },

    questAccepted() {
      const ctx = getAudioCtx();
      const t = ctx.currentTime;
      playNote(392.00, 'square', t,       0.10, 0.30);
      playNote(392.00, 'square', t + 0.12, 0.10, 0.30);
      playNote(392.00, 'square', t + 0.24, 0.10, 0.30);
      playNote(622.25, 'square', t + 0.36, 0.40, 0.35);
      playNote(196.00, 'triangle', t + 0.36, 0.40, 0.20);
    },

    phoneRing() {
      const ctx = getAudioCtx();
      const t = ctx.currentTime;
      for (let i = 0; i < 4; i++) {
        const offset = i * 0.18;
        playNote(1046.50, 'square', t + offset,       0.07, 0.20);
        playNote(783.99,  'square', t + offset + 0.08, 0.07, 0.20);
      }
    },

    doorOpen() {
      const ctx = getAudioCtx();
      const t = ctx.currentTime;
      playSweep(800, 200, 'sawtooth', t, 0.15, 0.15);
      playNoise(t, 0.08, 0.08);
    },

    typewriter() {
      const ctx = getAudioCtx();
      const t = ctx.currentTime;
      playNote(1200, 'square', t, 0.02, 0.12);
    },

    progressTick() {
      const ctx = getAudioCtx();
      const t = ctx.currentTime;
      playNote(880, 'square', t, 0.015, 0.08);
    },

    levelUp() {
      const ctx = getAudioCtx();
      const t = ctx.currentTime;
      playNote(523.25, 'square', t,       0.10, 0.30);
      playNote(659.25, 'square', t + 0.10, 0.10, 0.30);
      playNote(783.99, 'square', t + 0.20, 0.10, 0.30);
      playNote(1046.50, 'square', t + 0.40, 0.15, 0.35);
      playNote(783.99,  'square', t + 0.56, 0.10, 0.28);
      playNote(1046.50, 'square', t + 0.67, 0.35, 0.35);
      playNote(523.25,  'triangle', t + 0.40, 0.62, 0.18);
      playNote(659.25,  'triangle', t + 0.56, 0.46, 0.15);
      playNote(261.63, 'triangle', t + 0.40, 0.62, 0.15);
    },

    battleStart() {
      const ctx = getAudioCtx();
      const t = ctx.currentTime;
      playSweep(2000, 150, 'square', t, 0.35, 0.25);
      playNote(220, 'square', t + 0.40, 0.05, 0.30);
      playNote(220, 'square', t + 0.48, 0.05, 0.30);
      playNote(220, 'square', t + 0.56, 0.05, 0.30);
      playNote(277.18, 'square', t + 0.64, 0.15, 0.35);
      playNoise(t + 0.38, 0.06, 0.20);
    },

    healing() {
      const ctx = getAudioCtx();
      const t = ctx.currentTime;
      const notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50];
      const step = 0.08;
      notes.forEach((freq, i) => {
        playNote(freq, 'square', t + i * step, step * 0.9, 0.22);
      });
      playNote(1046.50, 'triangle', t + notes.length * step, 0.30, 0.25);
      playNote(1046.50 * 2, 'square', t + notes.length * step, 0.15, 0.08);
    },

    menuSelect() {
      const ctx = getAudioCtx();
      const t = ctx.currentTime;
      playNote(660, 'square', t, 0.04, 0.18);
      playNote(880, 'square', t + 0.04, 0.04, 0.15);
    },

    menuConfirm() {
      const ctx = getAudioCtx();
      const t = ctx.currentTime;
      playNote(880, 'square', t, 0.06, 0.20);
      playNote(1174.66, 'square', t + 0.06, 0.10, 0.22);
    },

    error() {
      const ctx = getAudioCtx();
      const t = ctx.currentTime;
      playNote(150, 'sawtooth', t, 0.12, 0.25, 50);
      playNote(120, 'sawtooth', t + 0.14, 0.15, 0.25, -50);
      playNoise(t, 0.10, 0.10);
    },
  };


  // ═══════════════════════════════════════════════════════════════════
  //  2. SCREEN VISUAL EFFECTS (GBC colors)
  // ═══════════════════════════════════════════════════════════════════

  const visual = {

    screenShake(intensity, duration) {
      intensity = intensity || 4;
      duration = duration || 0.4;
      const container = document.getElementById('gameContainer');
      if (!container) return;

      const startTime = performance.now();
      const origTransform = container.style.transform;

      function shake(now) {
        const elapsed = (now - startTime) / 1000;
        if (elapsed >= duration) {
          container.style.transform = origTransform || '';
          return;
        }
        const decay = 1 - elapsed / duration;
        const dx = (Math.random() - 0.5) * 2 * intensity * decay;
        const dy = (Math.random() - 0.5) * 2 * intensity * decay;
        container.style.transform = `translate(${dx}px, ${dy}px)`;
        requestAnimationFrame(shake);
      }

      requestAnimationFrame(shake);
    },

    screenFlash(color, duration) {
      color = color || PAL.gold;
      duration = duration || 0.3;
      const overlay = getOverlay();
      if (!overlay) return;

      const startTime = performance.now();
      const cancel = onFrame((ctx, dt, now) => {
        const elapsed = (now - startTime) / 1000;
        if (elapsed >= duration) return true;

        const alpha = 1 - elapsed / duration;
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha * 0.7;
        ctx.fillRect(0, 0, overlay.canvas.width, overlay.canvas.height);
        ctx.globalAlpha = 1;
        return false;
      });
    },

    fadeToBlack(duration) {
      duration = duration || 0.6;
      return new Promise(resolve => {
        const overlay = getOverlay();
        if (!overlay) { resolve(); return; }

        const startTime = performance.now();
        onFrame((ctx, dt, now) => {
          const elapsed = (now - startTime) / 1000;
          const t = Math.min(1, elapsed / duration);

          ctx.fillStyle = PAL.darkest;
          ctx.globalAlpha = t;
          ctx.fillRect(0, 0, overlay.canvas.width, overlay.canvas.height);
          ctx.globalAlpha = 1;

          if (t >= 1) {
            resolve();
            return true;
          }
          return false;
        });
      });
    },

    fadeFromBlack(duration) {
      duration = duration || 0.6;
      return new Promise(resolve => {
        const overlay = getOverlay();
        if (!overlay) { resolve(); return; }

        const startTime = performance.now();
        onFrame((ctx, dt, now) => {
          const elapsed = (now - startTime) / 1000;
          const t = Math.min(1, elapsed / duration);

          ctx.fillStyle = PAL.darkest;
          ctx.globalAlpha = 1 - t;
          ctx.fillRect(0, 0, overlay.canvas.width, overlay.canvas.height);
          ctx.globalAlpha = 1;

          if (t >= 1) {
            resolve();
            return true;
          }
          return false;
        });
      });
    },

    _scanlinesActive: false,
    _scanlinesCancel: null,

    scanlines(enable) {
      if (enable && !this._scanlinesActive) {
        this._scanlinesActive = true;
        const overlay = getOverlay();
        if (!overlay) return;

        this._scanlinesCancel = onFrame((ctx) => {
          if (!visual._scanlinesActive) return true;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
          for (let y = 0; y < overlay.canvas.height; y += 3) {
            ctx.fillRect(0, y, overlay.canvas.width, 1);
          }
          return false;
        });
      } else if (!enable && this._scanlinesActive) {
        this._scanlinesActive = false;
      }
    },

    _vignetteActive: false,
    _vignetteCancel: null,

    vignette(enable) {
      if (enable && !this._vignetteActive) {
        this._vignetteActive = true;
        const overlay = getOverlay();
        if (!overlay) return;

        this._vignetteCancel = onFrame((ctx) => {
          if (!visual._vignetteActive) return true;
          const w = overlay.canvas.width;
          const h = overlay.canvas.height;
          const gradient = ctx.createRadialGradient(w/2, h/2, w * 0.25, w/2, h/2, w * 0.7);
          gradient.addColorStop(0, 'rgba(0,0,0,0)');
          gradient.addColorStop(1, 'rgba(26,26,46,0.5)');  // Deep navy vignette
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, w, h);
          return false;
        });
      } else if (!enable && this._vignetteActive) {
        this._vignetteActive = false;
      }
    },

    pixelDissolve(duration) {
      duration = duration || 1.0;
      return new Promise(resolve => {
        const overlay = getOverlay();
        if (!overlay) { resolve(); return; }

        const pixelSize = 8;
        const cols = Math.ceil(overlay.canvas.width / pixelSize);
        const rows = Math.ceil(overlay.canvas.height / pixelSize);
        const totalPixels = cols * rows;

        const order = [];
        for (let i = 0; i < totalPixels; i++) order.push(i);
        for (let i = order.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [order[i], order[j]] = [order[j], order[i]];
        }

        const startTime = performance.now();
        let revealed = 0;

        onFrame((ctx, dt, now) => {
          const elapsed = (now - startTime) / 1000;
          const t = Math.min(1, elapsed / duration);
          const targetRevealed = Math.floor(t * totalPixels);

          ctx.fillStyle = PAL.darkest;
          while (revealed < targetRevealed && revealed < totalPixels) {
            const idx = order[revealed];
            const px = (idx % cols) * pixelSize;
            const py = Math.floor(idx / cols) * pixelSize;
            ctx.fillRect(px, py, pixelSize, pixelSize);
            revealed++;
          }

          if (t >= 1) {
            resolve();
            return true;
          }
          return false;
        });
      });
    },

    battleTransition() {
      return new Promise(resolve => {
        const overlay = getOverlay();
        if (!overlay) { resolve(); return; }

        const startTime = performance.now();
        const duration = 1.2;
        const cx = overlay.canvas.width / 2;
        const cy = overlay.canvas.height / 2;
        const maxRadius = Math.sqrt(cx * cx + cy * cy);

        onFrame((ctx, dt, now) => {
          const elapsed = (now - startTime) / 1000;
          const t = Math.min(1, elapsed / duration);

          const numSlices = 8;
          const rotation = t * Math.PI * 3;
          const radius = maxRadius * (1 - t);

          ctx.fillStyle = PAL.darkest;

          for (let i = 0; i < numSlices; i++) {
            const angle = (i / numSlices) * Math.PI * 2 + rotation;
            const sliceAngle = (1 / numSlices) * Math.PI * 2;
            const openAngle = sliceAngle * (1 - t);

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, maxRadius * 1.5, angle, angle + sliceAngle - openAngle);
            ctx.closePath();
            ctx.fill();
          }

          if (t > 0.3) {
            const circleT = (t - 0.3) / 0.7;
            const holeRadius = maxRadius * (1 - circleT);
            ctx.beginPath();
            ctx.rect(0, 0, overlay.canvas.width, overlay.canvas.height);
            ctx.arc(cx, cy, Math.max(0, holeRadius), 0, Math.PI * 2, true);
            ctx.fill();
          }

          if (t >= 1) {
            resolve();
            return true;
          }
          return false;
        });
      });
    },

    _rainActive: false,
    _rainDrops: [],

    rainEffect(enable) {
      if (enable && !this._rainActive) {
        this._rainActive = true;
        const overlay = getOverlay();
        if (!overlay) return;

        this._rainDrops = [];
        for (let i = 0; i < 80; i++) {
          this._rainDrops.push({
            x: Math.random() * overlay.canvas.width,
            y: Math.random() * overlay.canvas.height,
            len: 4 + Math.random() * 8,
            speed: 200 + Math.random() * 200,
            opacity: 0.15 + Math.random() * 0.2,
          });
        }

        onFrame((ctx, dt) => {
          if (!visual._rainActive) return true;
          const overlay = getOverlay();
          if (!overlay) return true;

          // Rain in cool blue-silver
          ctx.strokeStyle = PAL.silver;
          ctx.lineWidth = 1;

          visual._rainDrops.forEach(drop => {
            ctx.globalAlpha = drop.opacity;
            ctx.beginPath();
            ctx.moveTo(drop.x, drop.y);
            ctx.lineTo(drop.x - 1, drop.y + drop.len);
            ctx.stroke();

            drop.y += drop.speed * dt;
            drop.x -= drop.speed * dt * 0.15;

            if (drop.y > overlay.canvas.height) {
              drop.y = -drop.len;
              drop.x = Math.random() * overlay.canvas.width;
            }
            if (drop.x < -10) {
              drop.x = overlay.canvas.width + 5;
            }
          });

          ctx.globalAlpha = 1;
          return false;
        });
      } else if (!enable) {
        this._rainActive = false;
      }
    },
  };


  // ═══════════════════════════════════════════════════════════════════
  //  3. PARTICLE SYSTEMS (GBC colorful!)
  // ═══════════════════════════════════════════════════════════════════

  function createParticle(x, y, opts) {
    return {
      x,
      y,
      vx: opts.vx || 0,
      vy: opts.vy || 0,
      life: opts.life || 1,
      maxLife: opts.life || 1,
      size: opts.size || 3,
      color: opts.color || PAL.lightest,
      gravity: opts.gravity || 0,
      friction: opts.friction || 1,
      shape: opts.shape || 'square',
      text: opts.text || '',
      rotation: opts.rotation || 0,
      rotationSpeed: opts.rotationSpeed || 0,
    };
  }

  function runParticles(particleList, drawFn) {
    onFrame((ctx, dt) => {
      let alive = false;
      particleList.forEach(p => {
        if (p.life <= 0) return;
        alive = true;

        p.life -= dt;
        p.vy += p.gravity * dt;
        p.vx *= p.friction;
        p.vy *= p.friction;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.rotationSpeed * dt;

        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;

        if (drawFn) {
          drawFn(ctx, p, alpha);
        } else if (p.shape === 'text') {
          ctx.fillStyle = p.color;
          ctx.font = `${Math.round(p.size)}px "Press Start 2P", monospace`;
          ctx.textAlign = 'center';
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillText(p.text, 0, 0);
          ctx.restore();
        } else if (p.shape === 'circle') {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = p.color;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
          ctx.restore();
        }

        ctx.globalAlpha = 1;
      });
      return !alive;
    });
  }

  const particles = {

    /** Confetti — Now uses the FULL GBC color palette! */
    confetti(x, y, count) {
      count = count || 30;
      const list = [];
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 80 + Math.random() * 180;
        list.push(createParticle(x, y, {
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 100,
          life: 1.0 + Math.random() * 1.0,
          size: 3 + Math.random() * 4,
          color: PAL.all[Math.floor(Math.random() * PAL.all.length)],
          gravity: 200,
          friction: 0.99,
          rotationSpeed: (Math.random() - 0.5) * 8,
        }));
      }
      runParticles(list);
    },

    /** Sparkle — Gold and teal 4-pointed stars */
    sparkle(x, y) {
      const list = [];
      const sparkleColors = [PAL.gold, PAL.lightest, PAL.teal, PAL.cream];
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const speed = 20 + Math.random() * 40;
        list.push(createParticle(x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 20, {
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.4 + Math.random() * 0.4,
          size: 2 + Math.random() * 3,
          color: sparkleColors[i % sparkleColors.length],
          shape: 'circle',
        }));
      }
      runParticles(list, (ctx, p, alpha) => {
        ctx.fillStyle = p.color;
        const s = p.size * (0.5 + alpha * 0.5);
        ctx.fillRect(p.x - 1, p.y - s, 2, s * 2);
        ctx.fillRect(p.x - s, p.y - 1, s * 2, 2);
      });
    },

    /** Dust — Walking dust clouds in warm brown */
    dust(x, y) {
      const list = [];
      for (let i = 0; i < 5; i++) {
        list.push(createParticle(x + (Math.random() - 0.5) * 10, y, {
          vx: (Math.random() - 0.5) * 30,
          vy: -10 - Math.random() * 20,
          life: 0.3 + Math.random() * 0.3,
          size: 2 + Math.random() * 3,
          color: PAL.amber,
          shape: 'circle',
        }));
      }
      runParticles(list);
    },

    /** Steam — Coffee steam in warm silver */
    steam(x, y) {
      const list = [];
      for (let i = 0; i < 6; i++) {
        list.push(createParticle(x + (Math.random() - 0.5) * 8, y, {
          vx: (Math.random() - 0.5) * 15 + Math.sin(i) * 10,
          vy: -30 - Math.random() * 40,
          life: 0.8 + Math.random() * 0.6,
          size: 2 + Math.random() * 2,
          color: PAL.silver,
          shape: 'circle',
          friction: 0.98,
        }));
      }
      runParticles(list);
    },

    /** Exclamation — "!" alert in gold */
    exclamation(x, y) {
      const list = [
        createParticle(x, y - 20, {
          vy: -40,
          life: 1.0,
          size: 10,
          color: PAL.gold,
          shape: 'text',
          text: '!',
          gravity: 30,
        })
      ];
      for (let i = 0; i < 4; i++) {
        list.push(createParticle(x + (Math.random() - 0.5) * 6, y - 20, {
          vx: (Math.random() - 0.5) * 60,
          vy: -20 - Math.random() * 30,
          life: 0.3,
          size: 2,
          color: PAL.gold,
        }));
      }

      if (!GameBoyFX.muted) {
        const ctx = getAudioCtx();
        const t = ctx.currentTime;
        playNote(880, 'square', t, 0.08, 0.25);
        playNote(1318.51, 'square', t + 0.08, 0.15, 0.30);
      }

      runParticles(list);
    },

    /** Hearts — Red hearts */
    hearts(x, y) {
      const list = [];
      for (let i = 0; i < 5; i++) {
        list.push(createParticle(x + (Math.random() - 0.5) * 20, y, {
          vx: (Math.random() - 0.5) * 30,
          vy: -40 - Math.random() * 50,
          life: 1.0 + Math.random() * 0.5,
          size: 8 + Math.random() * 4,
          color: PAL.red,
          shape: 'text',
          text: '♥',
        }));
      }
      runParticles(list);
    },

    /** Music Notes — Purple notes for Echo/Bard */
    musicNotes(x, y) {
      const notes = ['♪', '♫', '♪'];
      const noteColors = [PAL.purple, PAL.blue, PAL.lightest];
      const list = [];
      notes.forEach((note, i) => {
        list.push(createParticle(x + (i - 1) * 12, y, {
          vx: (Math.random() - 0.5) * 20 + Math.sin(i) * 15,
          vy: -30 - Math.random() * 30,
          life: 1.2 + Math.random() * 0.5,
          size: 8 + Math.random() * 3,
          color: noteColors[i % noteColors.length],
          shape: 'text',
          text: note,
          rotationSpeed: (Math.random() - 0.5) * 1,
        }));
      });
      runParticles(list);
    },

    /** Code Rain — Blue code for Forge/Hacker */
    codeRain(x, y) {
      const chars = '01{}[]<>=/;:()'.split('');
      const codeColors = [PAL.blue, PAL.teal, PAL.lightest];
      const list = [];
      for (let i = 0; i < 10; i++) {
        list.push(createParticle(x + (Math.random() - 0.5) * 40, y - 10, {
          vx: (Math.random() - 0.5) * 10,
          vy: 30 + Math.random() * 60,
          life: 0.8 + Math.random() * 0.5,
          size: 6 + Math.random() * 2,
          color: codeColors[i % codeColors.length],
          shape: 'text',
          text: chars[Math.floor(Math.random() * chars.length)],
        }));
      }
      runParticles(list);
    },

    /** Coins — Gold coins for Hunter/Trader */
    coins(x, y) {
      const list = [];
      for (let i = 0; i < 6; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 40 + Math.random() * 60;
        list.push(createParticle(x, y, {
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 60,
          life: 1.0 + Math.random() * 0.5,
          size: 8,
          color: PAL.gold,
          shape: 'text',
          text: '●',
          gravity: 150,
        }));
      }
      runParticles(list, (ctx, p, alpha) => {
        ctx.fillStyle = p.color;
        ctx.font = `${p.size}px "Press Start 2P", monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('$', p.x, p.y);
      });
    },

    /** Scrolls — Teal scrolls for Atlas/Scribe */
    scrolls(x, y) {
      const list = [];
      for (let i = 0; i < 4; i++) {
        list.push(createParticle(x + (Math.random() - 0.5) * 20, y, {
          vx: (Math.random() - 0.5) * 25,
          vy: -20 - Math.random() * 35,
          life: 1.0 + Math.random() * 0.5,
          size: 8,
          color: PAL.teal,
          shape: 'text',
          text: '📜',
          rotationSpeed: (Math.random() - 0.5) * 2,
        }));
      }
      runParticles(list, (ctx, p, alpha) => {
        ctx.fillStyle = p.color;
        const s = p.size * 0.6;
        ctx.fillRect(p.x - s * 0.4, p.y - s, s * 0.8, s * 2);
        ctx.fillRect(p.x - s * 0.6, p.y - s - 1, s * 1.2, 3);
        ctx.fillRect(p.x - s * 0.6, p.y + s - 2, s * 1.2, 3);
        ctx.fillStyle = PAL.dark;
        for (let ln = 0; ln < 3; ln++) {
          ctx.fillRect(p.x - s * 0.2, p.y - s * 0.5 + ln * 4, s * 0.4, 1);
        }
      });
    },

    /** Magnifying Glass — Silver for Sentinel/Watcher */
    magnifyingGlass(x, y) {
      const list = [];
      for (let i = 0; i < 3; i++) {
        list.push(createParticle(x + (Math.random() - 0.5) * 20, y, {
          vx: (Math.random() - 0.5) * 20,
          vy: -15 - Math.random() * 25,
          life: 1.2 + Math.random() * 0.3,
          size: 6 + Math.random() * 2,
          color: PAL.silver,
          shape: 'custom',
        }));
      }
      runParticles(list, (ctx, p, alpha) => {
        const s = p.size;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p.x + s * 0.7, p.y + s * 0.7);
        ctx.lineTo(p.x + s * 1.4, p.y + s * 1.4);
        ctx.stroke();
        ctx.fillStyle = PAL.lightest;
        ctx.fillRect(p.x - s * 0.3, p.y - s * 0.3, 2, 2);
      });
    },
  };


  // ═══════════════════════════════════════════════════════════════════
  //  4. POKÉMON-STYLE TEXT BOX SYSTEM (GBC colors)
  // ═══════════════════════════════════════════════════════════════════

  const textBox = {
    _active: false,
    _element: null,
    _textElement: null,
    _speakerElement: null,
    _indicatorElement: null,
    _currentText: '',
    _displayedChars: 0,
    _pages: [],
    _currentPage: 0,
    _typing: false,
    _typingInterval: null,
    _callback: null,
    _resolve: null,
    _advanceHandler: null,

    _speeds: {
      slow: 60,
      normal: 35,
      fast: 15,
    },

    _ensureElement() {
      if (this._element && this._element.parentElement) return;

      const container = document.getElementById('gameContainer');
      if (!container) return;

      this._element = document.createElement('div');
      this._element.id = 'gbfx-textbox';
      this._element.style.cssText = `
        position: absolute;
        bottom: 8px;
        left: 8px;
        right: 8px;
        background: ${PAL.darkest};
        border: 3px solid ${PAL.teal};
        border-radius: 0;
        padding: 12px 14px 10px;
        font-family: 'Press Start 2P', monospace;
        font-size: 10px;
        line-height: 1.8;
        color: ${PAL.lightest};
        z-index: 2000;
        pointer-events: auto;
        display: none;
        box-shadow: inset -2px -2px 0px ${PAL.dark}, inset 2px 2px 0px ${PAL.dark};
        min-height: 48px;
        max-height: 80px;
        image-rendering: pixelated;
        cursor: pointer;
      `;

      this._speakerElement = document.createElement('div');
      this._speakerElement.style.cssText = `
        position: absolute;
        top: -12px;
        left: 12px;
        background: ${PAL.darkest};
        border: 2px solid ${PAL.teal};
        padding: 2px 8px;
        font-family: 'Press Start 2P', monospace;
        font-size: 8px;
        color: ${PAL.gold};
        display: none;
      `;
      this._element.appendChild(this._speakerElement);

      this._textElement = document.createElement('div');
      this._textElement.style.cssText = `
        overflow: hidden;
        white-space: pre-wrap;
        word-break: break-word;
      `;
      this._element.appendChild(this._textElement);

      this._indicatorElement = document.createElement('div');
      this._indicatorElement.style.cssText = `
        position: absolute;
        bottom: 4px;
        right: 10px;
        font-size: 8px;
        color: ${PAL.lightest};
        display: none;
        animation: gbfx-blink 0.6s infinite;
      `;
      this._indicatorElement.textContent = '▼';
      this._element.appendChild(this._indicatorElement);

      if (!document.getElementById('gbfx-styles')) {
        const style = document.createElement('style');
        style.id = 'gbfx-styles';
        style.textContent = `
          @keyframes gbfx-blink {
            0%, 49% { opacity: 1; }
            50%, 100% { opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }

      container.appendChild(this._element);
    },

    show(text, options) {
      options = options || {};
      this._ensureElement();
      if (!this._element) return Promise.resolve();

      return new Promise(resolve => {
        this._resolve = resolve;
        this._callback = options.callback || null;

        const maxCharsPerPage = 90;
        this._pages = [];
        const words = text.split(' ');
        let page = '';
        words.forEach(word => {
          if ((page + ' ' + word).trim().length > maxCharsPerPage && page.length > 0) {
            this._pages.push(page.trim());
            page = word;
          } else {
            page = page ? page + ' ' + word : word;
          }
        });
        if (page.trim()) this._pages.push(page.trim());

        this._currentPage = 0;

        if (options.speaker) {
          this._speakerElement.textContent = options.speaker;
          this._speakerElement.style.display = 'block';
        } else {
          this._speakerElement.style.display = 'none';
        }

        this._element.style.display = 'block';
        this._typePage(this._pages[0], options.speed || 'normal');

        if (this._advanceHandler) {
          document.removeEventListener('keydown', this._advanceHandler);
          this._element.removeEventListener('click', this._advanceHandler);
        }

        this._advanceHandler = (e) => {
          if (e.type === 'keydown' && e.key !== ' ' && e.key !== 'Enter') return;
          if (e.type === 'keydown') e.preventDefault();

          if (this._typing) {
            this._skipTyping();
          } else if (this._currentPage < this._pages.length - 1) {
            this._currentPage++;
            this._typePage(this._pages[this._currentPage], options.speed || 'normal');
          } else {
            this.hide();
          }
        };

        document.addEventListener('keydown', this._advanceHandler);
        this._element.addEventListener('click', this._advanceHandler);
      });
    },

    _typePage(text, speed) {
      this._currentText = text;
      this._displayedChars = 0;
      this._typing = true;
      this._textElement.textContent = '';
      this._indicatorElement.style.display = 'none';

      const interval = this._speeds[speed] || this._speeds.normal;

      if (this._typingInterval) clearInterval(this._typingInterval);

      this._typingInterval = setInterval(() => {
        if (this._displayedChars >= this._currentText.length) {
          clearInterval(this._typingInterval);
          this._typingInterval = null;
          this._typing = false;
          this._indicatorElement.style.display = 'block';
          return;
        }

        this._displayedChars++;
        this._textElement.textContent = this._currentText.substring(0, this._displayedChars);

        if (!GameBoyFX.muted && this._displayedChars % 2 === 0) {
          try { sounds.typewriter(); } catch (e) { }
        }
      }, interval);
    },

    _skipTyping() {
      if (this._typingInterval) clearInterval(this._typingInterval);
      this._typingInterval = null;
      this._typing = false;
      this._displayedChars = this._currentText.length;
      this._textElement.textContent = this._currentText;
      this._indicatorElement.style.display = 'block';
    },

    hide() {
      if (this._typingInterval) clearInterval(this._typingInterval);
      this._typingInterval = null;
      this._typing = false;
      this._active = false;

      if (this._element) {
        this._element.style.display = 'none';
      }

      if (this._advanceHandler) {
        document.removeEventListener('keydown', this._advanceHandler);
        if (this._element) this._element.removeEventListener('click', this._advanceHandler);
        this._advanceHandler = null;
      }

      if (this._callback) this._callback();
      if (this._resolve) {
        this._resolve();
        this._resolve = null;
      }
    },

    choice(question, options) {
      options = options || ['YES', 'NO'];
      this._ensureElement();
      if (!this._element) return Promise.resolve(options[0]);

      return new Promise(resolve => {
        this.show(question, { speed: 'fast' }).then(() => {
          this._element.style.display = 'block';
          this._textElement.textContent = question;
          this._indicatorElement.style.display = 'none';

          const choicePanel = document.createElement('div');
          choicePanel.style.cssText = `
            position: absolute;
            top: -${options.length * 22 + 14}px;
            right: 10px;
            background: ${PAL.darkest};
            border: 3px solid ${PAL.teal};
            padding: 8px 14px;
            font-family: 'Press Start 2P', monospace;
            font-size: 10px;
            color: ${PAL.lightest};
            box-shadow: inset -2px -2px 0px ${PAL.dark}, inset 2px 2px 0px ${PAL.dark};
          `;

          let selectedIndex = 0;

          function renderChoices() {
            choicePanel.innerHTML = '';
            options.forEach((opt, i) => {
              const row = document.createElement('div');
              row.style.cssText = `
                padding: 4px 8px;
                cursor: pointer;
                color: ${i === selectedIndex ? PAL.gold : PAL.dark};
              `;
              row.textContent = (i === selectedIndex ? '▶ ' : '  ') + opt;

              row.addEventListener('click', () => {
                if (!GameBoyFX.muted) sounds.menuConfirm();
                cleanup();
                resolve(opt);
              });

              row.addEventListener('mouseenter', () => {
                if (selectedIndex !== i) {
                  selectedIndex = i;
                  if (!GameBoyFX.muted) sounds.menuSelect();
                  renderChoices();
                }
              });

              choicePanel.appendChild(row);
            });
          }

          const keyHandler = (e) => {
            if (e.key === 'ArrowUp' || e.key === 'w') {
              selectedIndex = (selectedIndex - 1 + options.length) % options.length;
              if (!GameBoyFX.muted) sounds.menuSelect();
              renderChoices();
              e.preventDefault();
            } else if (e.key === 'ArrowDown' || e.key === 's') {
              selectedIndex = (selectedIndex + 1) % options.length;
              if (!GameBoyFX.muted) sounds.menuSelect();
              renderChoices();
              e.preventDefault();
            } else if (e.key === 'Enter' || e.key === ' ') {
              if (!GameBoyFX.muted) sounds.menuConfirm();
              cleanup();
              resolve(options[selectedIndex]);
              e.preventDefault();
            } else if (e.key === 'Escape') {
              if (!GameBoyFX.muted) sounds.error();
              cleanup();
              resolve(options[options.length - 1]);
              e.preventDefault();
            }
          };

          const cleanup = () => {
            document.removeEventListener('keydown', keyHandler);
            if (choicePanel.parentElement) choicePanel.parentElement.removeChild(choicePanel);
            textBox.hide();
          };

          renderChoices();
          this._element.appendChild(choicePanel);
          document.addEventListener('keydown', keyHandler);
        });
      });
    },
  };


  // ═══════════════════════════════════════════════════════════════════
  //  5. KEYBOARD BINDING & MASTER OBJECT
  // ═══════════════════════════════════════════════════════════════════

  const GameBoyFX = {
    sounds,
    visual,
    particles,
    textBox,

    muted: true,
    volume: 0.3,

    play(soundName) {
      if (this.muted) return;
      try {
        if (this.sounds[soundName]) {
          this.sounds[soundName]();
        } else {
          console.warn('[GameBoyFX] Unknown sound:', soundName);
        }
      } catch (e) { }
    },

    toggleMute() {
      this.muted = !this.muted;
      if (!this.muted) {
        getAudioCtx();
      }
      if (_masterGain) {
        _masterGain.gain.value = this.muted ? 0 : this.volume;
      }
      console.log('[GameBoyFX] Sound', this.muted ? 'OFF' : 'ON');
      this._showMuteIndicator();
    },

    setVolume(v) {
      this.volume = Math.max(0, Math.min(1, v));
      if (_masterGain) {
        _masterGain.gain.value = this.muted ? 0 : this.volume;
      }
    },

    _showMuteIndicator() {
      const overlay = getOverlay();
      if (!overlay) return;

      const startTime = performance.now();
      const text = this.muted ? '♪ MUTE' : '♪ SOUND ON';

      onFrame((ctx, dt, now) => {
        const elapsed = (now - startTime) / 1000;
        if (elapsed > 1.2) return true;

        const alpha = elapsed < 0.8 ? 1 : 1 - (elapsed - 0.8) / 0.4;
        ctx.globalAlpha = alpha;

        // Navy background pill with teal border
        ctx.fillStyle = PAL.darkest;
        const tx = overlay.canvas.width / 2 - 60;
        const ty = 10;
        ctx.fillRect(tx, ty, 120, 24);

        ctx.strokeStyle = PAL.teal;
        ctx.lineWidth = 2;
        ctx.strokeRect(tx, ty, 120, 24);

        ctx.fillStyle = PAL.lightest;
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(text, overlay.canvas.width / 2, ty + 16);

        ctx.globalAlpha = 1;
        return false;
      });
    },

    init() {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'm' || e.key === 'M') {
          if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
          GameBoyFX.toggleMute();
        }
      });

      getOverlay();

      console.log('[GameBoyFX] 🎮 GBC Color Effects system ready. Press M to toggle sound.');
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => GameBoyFX.init());
  } else {
    setTimeout(() => GameBoyFX.init(), 100);
  }

  global.GameBoyFX = GameBoyFX;

})(typeof window !== 'undefined' ? window : this);
