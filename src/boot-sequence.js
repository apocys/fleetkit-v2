/**
 * SpawnKit v2 — Boot Sequences
 * Three unique loading experiences: GameBoy, Cyberpunk, Executive
 * 
 * Pure Canvas2D + DOM rendering, no external dependencies.
 * Uses theme-names.js for agent display names.
 * 
 * API:
 *   window.SpawnKitBoot.play(theme, container, options) → Promise
 *   window.SpawnKitBoot.skip()
 * 
 * @author Atlas (COO)
 */

window.SpawnKitBoot = (() => {
  // ── Internal state ──────────────────────────────────────────────
  let _resolve = null;
  let _skipRequested = false;
  let _animFrame = null;
  let _container = null;
  let _canvas = null;
  let _ctx = null;
  let _overlay = null;
  let _timeouts = [];
  let _intervals = [];

  // ── Helpers ─────────────────────────────────────────────────────
  function sleep(ms) {
    return new Promise(r => {
      const id = setTimeout(r, ms);
      _timeouts.push(id);
    });
  }

  function skipped() { return _skipRequested; }

  function cleanup() {
    _timeouts.forEach(clearTimeout);
    _intervals.forEach(clearInterval);
    _timeouts = [];
    _intervals = [];
    if (_animFrame) cancelAnimationFrame(_animFrame);
    _animFrame = null;
    if (_overlay && _overlay.parentNode) _overlay.parentNode.removeChild(_overlay);
    if (_canvas && _canvas.parentNode) _canvas.parentNode.removeChild(_canvas);
    _overlay = null;
    _canvas = null;
    _ctx = null;
  }

  function setup(container) {
    _container = container;
    _skipRequested = false;

    // Create fullscreen overlay
    _overlay = document.createElement('div');
    Object.assign(_overlay.style, {
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      zIndex: 99999, background: '#000', display: 'flex',
      alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
      overflow: 'hidden', fontFamily: 'monospace'
    });
    document.body.appendChild(_overlay);

    // Create canvas filling overlay
    _canvas = document.createElement('canvas');
    _canvas.width = window.innerWidth;
    _canvas.height = window.innerHeight;
    Object.assign(_canvas.style, {
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'
    });
    _overlay.appendChild(_canvas);
    _ctx = _canvas.getContext('2d');

    // Resize handler
    const onResize = () => {
      if (!_canvas) return;
      _canvas.width = window.innerWidth;
      _canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);
    _timeouts.push({ clear: () => window.removeEventListener('resize', onResize) });

    // Skip listener (ESC or click)
    const onSkip = (e) => {
      if (e.type === 'keydown' && e.key !== 'Escape') return;
      _skipRequested = true;
    };
    window.addEventListener('keydown', onSkip);
    _overlay.addEventListener('click', onSkip);
    _timeouts.push({
      clear: () => {
        window.removeEventListener('keydown', onSkip);
        _overlay?.removeEventListener('click', onSkip);
      }
    });
  }

  function finish() {
    // Fade out overlay
    if (_overlay) {
      _overlay.style.transition = 'opacity 0.4s ease';
      _overlay.style.opacity = '0';
      setTimeout(() => {
        cleanup();
        if (_resolve) { _resolve(); _resolve = null; }
      }, 450);
    } else {
      cleanup();
      if (_resolve) { _resolve(); _resolve = null; }
    }
  }

  function isReturningUser() {
    return localStorage.getItem('spawnkit-boot-seen') === 'true';
  }

  function markSeen() {
    localStorage.setItem('spawnkit-boot-seen', 'true');
  }

  // ── Pixel font (5×7 bitmap) ─────────────────────────────────────
  const PIXEL_FONT = {
    'A': [0x7C,0x12,0x11,0x12,0x7C], 'B': [0x7F,0x49,0x49,0x49,0x36],
    'C': [0x3E,0x41,0x41,0x41,0x22], 'D': [0x7F,0x41,0x41,0x41,0x3E],
    'E': [0x7F,0x49,0x49,0x49,0x41], 'F': [0x7F,0x09,0x09,0x09,0x01],
    'G': [0x3E,0x41,0x49,0x49,0x7A], 'H': [0x7F,0x08,0x08,0x08,0x7F],
    'I': [0x00,0x41,0x7F,0x41,0x00], 'J': [0x20,0x40,0x41,0x3F,0x01],
    'K': [0x7F,0x08,0x14,0x22,0x41], 'L': [0x7F,0x40,0x40,0x40,0x40],
    'M': [0x7F,0x02,0x0C,0x02,0x7F], 'N': [0x7F,0x04,0x08,0x10,0x7F],
    'O': [0x3E,0x41,0x41,0x41,0x3E], 'P': [0x7F,0x09,0x09,0x09,0x06],
    'Q': [0x3E,0x41,0x51,0x21,0x5E], 'R': [0x7F,0x09,0x19,0x29,0x46],
    'S': [0x46,0x49,0x49,0x49,0x31], 'T': [0x01,0x01,0x7F,0x01,0x01],
    'U': [0x3F,0x40,0x40,0x40,0x3F], 'V': [0x1F,0x20,0x40,0x20,0x1F],
    'W': [0x3F,0x40,0x30,0x40,0x3F], 'X': [0x63,0x14,0x08,0x14,0x63],
    'Y': [0x07,0x08,0x70,0x08,0x07], 'Z': [0x61,0x51,0x49,0x45,0x43],
    '0': [0x3E,0x51,0x49,0x45,0x3E], '1': [0x00,0x42,0x7F,0x40,0x00],
    '2': [0x42,0x61,0x51,0x49,0x46], '3': [0x21,0x41,0x45,0x4B,0x31],
    '4': [0x18,0x14,0x12,0x7F,0x10], '5': [0x27,0x45,0x45,0x45,0x39],
    '6': [0x3C,0x4A,0x49,0x49,0x30], '7': [0x01,0x71,0x09,0x05,0x03],
    '8': [0x36,0x49,0x49,0x49,0x36], '9': [0x06,0x49,0x49,0x29,0x1E],
    ' ': [0x00,0x00,0x00,0x00,0x00], '.': [0x00,0x60,0x60,0x00,0x00],
    ':': [0x00,0x36,0x36,0x00,0x00], '-': [0x08,0x08,0x08,0x08,0x08],
    '_': [0x40,0x40,0x40,0x40,0x40], '>': [0x41,0x22,0x14,0x08,0x00],
    '[': [0x00,0x7F,0x41,0x41,0x00], ']': [0x00,0x41,0x41,0x7F,0x00],
    '!': [0x00,0x00,0x5F,0x00,0x00], ',': [0x00,0x80,0x60,0x00,0x00],
    '/': [0x20,0x10,0x08,0x04,0x02], '@': [0x3E,0x41,0x5D,0x55,0x4E],
    '#': [0x14,0x7F,0x14,0x7F,0x14], '(': [0x00,0x1C,0x22,0x41,0x00],
    ')': [0x00,0x41,0x22,0x1C,0x00], '+': [0x08,0x08,0x3E,0x08,0x08],
    '=': [0x14,0x14,0x14,0x14,0x14], '"': [0x00,0x07,0x00,0x07,0x00],
    '\'': [0x00,0x00,0x07,0x00,0x00], '?': [0x02,0x01,0x51,0x09,0x06],
    '■': [0x7F,0x7F,0x7F,0x7F,0x7F], '*': [0x14,0x08,0x3E,0x08,0x14],
    'v': [0x18,0x20,0x40,0x20,0x18]
  };

  function drawPixelChar(ctx, char, x, y, scale, color) {
    const data = PIXEL_FONT[char?.toUpperCase?.()] || PIXEL_FONT[char];
    if (!data) return scale * 6;
    ctx.fillStyle = color;
    for (let col = 0; col < 5; col++) {
      for (let row = 0; row < 7; row++) {
        if (data[col] & (1 << row)) {
          ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
        }
      }
    }
    return scale * 6;
  }

  function drawPixelText(ctx, text, x, y, scale, color) {
    let cx = x;
    for (const ch of text) {
      cx += drawPixelChar(ctx, ch, cx, y, scale, color);
    }
    return cx - x; // total width
  }

  function measurePixelText(text, scale) {
    return text.length * scale * 6;
  }

  // Centre-draw helper
  function drawPixelTextCentered(ctx, text, cy, scale, color) {
    const w = measurePixelText(text, scale);
    drawPixelText(ctx, text, (_canvas.width - w) / 2, cy, scale, color);
  }

  // ── Audio helpers ───────────────────────────────────────────────
  function playDing() {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1046.5, ac.currentTime); // C6
      gain.gain.setValueAtTime(0.15, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3);
      osc.connect(gain); gain.connect(ac.destination);
      osc.start(); osc.stop(ac.currentTime + 0.3);
    } catch (_) { /* audio not available */ }
  }

  function playBootBeep() {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, ac.currentTime);
      osc.frequency.linearRampToValueAtTime(800, ac.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
      osc.connect(gain); gain.connect(ac.destination);
      osc.start(); osc.stop(ac.currentTime + 0.15);
    } catch (_) {}
  }

  function playCyberpunkBeep() {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, ac.currentTime);
      osc.frequency.setValueAtTime(520, ac.currentTime + 0.05);
      gain.gain.setValueAtTime(0.06, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.1);
      osc.connect(gain); gain.connect(ac.destination);
      osc.start(); osc.stop(ac.currentTime + 0.1);
    } catch (_) {}
  }

  function playExecChime() {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      // Three-note ascending chord
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ac.currentTime + i * 0.15);
        gain.gain.setValueAtTime(0, ac.currentTime);
        gain.gain.linearRampToValueAtTime(0.1, ac.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + i * 0.15 + 0.8);
        osc.connect(gain); gain.connect(ac.destination);
        osc.start(ac.currentTime + i * 0.15);
        osc.stop(ac.currentTime + i * 0.15 + 0.8);
      });
    } catch (_) {}
  }

  // ── Scanline / CRT effect (GameBoy) ─────────────────────────────
  function drawScanlines(ctx, w, h, alpha) {
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    for (let y = 0; y < h; y += 3) {
      ctx.fillRect(0, y, w, 1);
    }
  }

  // ── Agent Silhouettes (GameBoy title) ───────────────────────────
  function drawAgentSilhouette(ctx, x, y, scale, variant) {
    const color = '#0F380F';
    const s = scale;
    // Head
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y - 12 * s, 5 * s, 0, Math.PI * 2);
    ctx.fill();
    // Body
    ctx.fillRect(x - 4 * s, y - 6 * s, 8 * s, 14 * s);
    // Legs
    ctx.fillRect(x - 4 * s, y + 8 * s, 3 * s, 8 * s);
    ctx.fillRect(x + 1 * s, y + 8 * s, 3 * s, 8 * s);
    // Arms (varied pose)
    if (variant === 0) { // arms down
      ctx.fillRect(x - 7 * s, y - 4 * s, 3 * s, 10 * s);
      ctx.fillRect(x + 4 * s, y - 4 * s, 3 * s, 10 * s);
    } else if (variant === 1) { // one arm up
      ctx.fillRect(x - 7 * s, y - 8 * s, 3 * s, 10 * s);
      ctx.fillRect(x + 4 * s, y - 4 * s, 3 * s, 10 * s);
    } else if (variant === 2) { // arms crossed
      ctx.fillRect(x - 6 * s, y - 2 * s, 12 * s, 3 * s);
    } else if (variant === 3) { // pointing
      ctx.fillRect(x - 7 * s, y - 4 * s, 3 * s, 10 * s);
      ctx.fillRect(x + 4 * s, y - 6 * s, 10 * s, 3 * s);
    } else { // hands on hips
      ctx.fillRect(x - 8 * s, y - 2 * s, 4 * s, 6 * s);
      ctx.fillRect(x + 4 * s, y - 2 * s, 4 * s, 6 * s);
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  GAMEBOY BOOT SEQUENCE
  // ════════════════════════════════════════════════════════════════
  async function gameboyBoot(options) {
    const W = _canvas.width;
    const H = _canvas.height;
    const ctx = _ctx;
    const abbreviated = isReturningUser();
    const soundEnabled = options.soundEnabled;

    const GB_BG   = '#9BBB0F';
    const GB_DARK = '#0F380F';
    const GB_MID  = '#306230';
    const GB_LITE = '#8BAC0F';

    // Helper to check skip between steps
    async function step(ms) {
      if (skipped()) return;
      await sleep(ms);
    }

    // ── Step 1: Black screen ──
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    await step(abbreviated ? 200 : 500);
    if (skipped()) return;

    // ── Step 2: Logo scrolls down ──
    if (!abbreviated) {
      const logoText = 'SPAWNKIT';
      const logoScale = Math.max(3, Math.floor(W / 180));
      const logoW = measurePixelText(logoText, logoScale);
      const logoX = (W - logoW) / 2;
      const targetY = H * 0.4;
      const startY = -50;
      const scrollDuration = 1000;
      const startTime = performance.now();

      await new Promise((resolve) => {
        function frame(now) {
          if (skipped()) { resolve(); return; }
          const elapsed = now - startTime;
          const t = Math.min(elapsed / scrollDuration, 1);
          // Ease out cubic
          const ease = 1 - Math.pow(1 - t, 3);
          const y = startY + (targetY - startY) * ease;

          ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

          // Draw trademark-style box around logo
          const pad = logoScale * 3;
          ctx.strokeStyle = '#8a8a8a';
          ctx.lineWidth = 2;
          ctx.strokeRect(logoX - pad, y - pad, logoW + pad * 2, logoScale * 7 + pad * 2);

          // Logo text
          drawPixelText(ctx, logoText, logoX, y, logoScale, '#8a8a8a');

          // Scanlines for CRT feel
          drawScanlines(ctx, W, H, 0.08);

          if (t < 1) {
            _animFrame = requestAnimationFrame(frame);
          } else {
            resolve();
          }
        }
        _animFrame = requestAnimationFrame(frame);
      });
      if (skipped()) return;

      // ── Step 3: "Ding!" sound ──
      if (soundEnabled) playDing();
      await step(300);
      if (skipped()) return;
    }

    // ── Step 4: Fade to green ──
    {
      const fadeDuration = abbreviated ? 150 : 300;
      const startTime = performance.now();
      await new Promise((resolve) => {
        function frame(now) {
          if (skipped()) { resolve(); return; }
          const t = Math.min((now - startTime) / fadeDuration, 1);
          // Lerp black → GameBoy green
          const r = Math.floor(0 + (0x9B) * t);
          const g = Math.floor(0 + (0xBB) * t);
          const b = Math.floor(0 + (0x0F) * t);
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(0, 0, W, H);
          drawScanlines(ctx, W, H, 0.06);
          if (t < 1) _animFrame = requestAnimationFrame(frame);
          else resolve();
        }
        _animFrame = requestAnimationFrame(frame);
      });
    }
    if (skipped()) return;

    // ── Step 5: "SPAWNKIT Version 2.0" ──
    {
      ctx.fillStyle = GB_BG; ctx.fillRect(0, 0, W, H);
      const vScale = Math.max(2, Math.floor(W / 300));
      drawPixelTextCentered(ctx, 'SPAWNKIT VERSION 2.0', H * 0.45, vScale, GB_DARK);
      drawScanlines(ctx, W, H, 0.06);
      await step(abbreviated ? 400 : 1000);
    }
    if (skipped()) return;

    // ── Step 6: "Press START" blinking ──
    if (!abbreviated) {
      const startScale = Math.max(2, Math.floor(W / 350));
      let waiting = true;
      const onClick = () => { waiting = false; };
      const onKey = (e) => { waiting = false; };
      window.addEventListener('keydown', onKey);
      _overlay.addEventListener('click', onClick);

      const blinkStart = performance.now();
      await new Promise((resolve) => {
        function frame(now) {
          if (skipped() || !waiting) {
            window.removeEventListener('keydown', onKey);
            resolve();
            return;
          }
          ctx.fillStyle = GB_BG; ctx.fillRect(0, 0, W, H);
          const vScale = Math.max(2, Math.floor(W / 300));
          drawPixelTextCentered(ctx, 'SPAWNKIT VERSION 2.0', H * 0.35, vScale, GB_DARK);

          // Blink every 500ms
          if (Math.floor((now - blinkStart) / 500) % 2 === 0) {
            drawPixelTextCentered(ctx, 'PRESS START', H * 0.55, startScale, GB_MID);
          }
          drawScanlines(ctx, W, H, 0.06);
          _animFrame = requestAnimationFrame(frame);
        }
        _animFrame = requestAnimationFrame(frame);
      });
      if (skipped()) return;
      if (soundEnabled) playBootBeep();
      await step(200);
    }
    if (skipped()) return;

    // ── Step 7: Title screen ──
    {
      const titleDuration = abbreviated ? 800 : 2500;
      const startTime = performance.now();

      // Get agent names from theme-names
      const names = window.SpawnKitNames;
      const agentIds = ['hunter', 'forge', 'echo', 'atlas', 'sentinel'];
      const agentLabels = agentIds.map(id => names?.resolve ? names.resolve('gameboy', id) : (id || '').toUpperCase());

      await new Promise((resolve) => {
        function frame(now) {
          if (skipped()) { resolve(); return; }
          const elapsed = now - startTime;
          const t = Math.min(elapsed / titleDuration, 1);

          ctx.fillStyle = GB_BG; ctx.fillRect(0, 0, W, H);

          // Large SPAWNKIT title
          const titleScale = Math.max(4, Math.floor(W / 120));
          drawPixelTextCentered(ctx, 'SPAWNKIT', H * 0.15, titleScale, GB_DARK);

          // Subtitle
          const subScale = Math.max(1, Math.floor(titleScale / 3));
          drawPixelTextCentered(ctx, 'POCKET OFFICE EDITION', H * 0.15 + titleScale * 10, subScale, GB_MID);

          // 5 agent silhouettes
          const silY = H * 0.55;
          const silSpacing = W / 6;
          const silScale = Math.max(1.5, W / 400);
          for (let i = 0; i < 5; i++) {
            const sx = silSpacing * (i + 1);
            // Fade in sequentially
            const delay = i * 0.15;
            const alpha = Math.min(1, Math.max(0, (t - delay) / 0.2));
            ctx.globalAlpha = alpha;
            drawAgentSilhouette(ctx, sx, silY, silScale, i);
            ctx.globalAlpha = 1;

            // Name below silhouette
            if (alpha > 0.5) {
              const nameScale = Math.max(1, Math.floor(silScale));
              const label = agentLabels[i] || '';
              const nameW = measurePixelText(label, nameScale);
              drawPixelText(ctx, label, sx - nameW / 2, silY + 20 * silScale, nameScale, GB_MID);
            }
          }

          // ── Step 8: "A TRAINER RED production" ──
          if (t > 0.6) {
            const prodAlpha = Math.min(1, (t - 0.6) / 0.3);
            ctx.globalAlpha = prodAlpha;
            const prodScale = Math.max(1, Math.floor(W / 500));
            drawPixelTextCentered(ctx, 'A TRAINER RED PRODUCTION', H * 0.88, prodScale, GB_MID);
            ctx.globalAlpha = 1;
          }

          drawScanlines(ctx, W, H, 0.05);

          if (t < 1) _animFrame = requestAnimationFrame(frame);
          else resolve();
        }
        _animFrame = requestAnimationFrame(frame);
      });
    }
    if (skipped()) return;

    // Hold the title screen a moment
    await step(abbreviated ? 200 : 800);

    markSeen();
  }

  // ════════════════════════════════════════════════════════════════
  //  CYBERPUNK BOOT SEQUENCE
  // ════════════════════════════════════════════════════════════════
  async function cyberpunkBoot(options) {
    const W = _canvas.width;
    const H = _canvas.height;
    const ctx = _ctx;
    const abbreviated = isReturningUser();
    const soundEnabled = options.soundEnabled;

    const CP_GREEN  = '#00FF41';
    const CP_CYAN   = '#00FFFF';
    const CP_RED    = '#FF003C';
    const CP_AMBER  = '#FFBF00';
    const CP_DIM    = '#0a3a0a';
    const CP_BG     = '#0a0a0a';

    // Terminal state
    let lines = [];
    let cursorVisible = true;
    let cursorBlinkId = null;

    const fontSize = Math.max(14, Math.floor(W / 60));
    const lineHeight = fontSize * 1.5;
    const marginLeft = W * 0.08;
    const marginTop = H * 0.1;

    function renderTerminal(extraCursorLine) {
      ctx.fillStyle = CP_BG; ctx.fillRect(0, 0, W, H);

      // Subtle grid background
      ctx.strokeStyle = 'rgba(0,255,65,0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 20) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += 20) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // Render lines
      ctx.font = `${fontSize}px "Courier New", "Lucida Console", monospace`;
      lines.forEach((line, i) => {
        const y = marginTop + i * lineHeight;
        if (line.color) ctx.fillStyle = line.color;
        else ctx.fillStyle = CP_GREEN;
        ctx.fillText(line.text, marginLeft, y);
        // Suffix (like [OK])
        if (line.suffix) {
          const textW = ctx.measureText(line.text).width;
          ctx.fillStyle = line.suffixColor || CP_GREEN;
          ctx.fillText(line.suffix, marginLeft + textW + 10, y);
        }
      });

      // Blinking cursor
      if (cursorVisible && extraCursorLine !== false) {
        const cursorY = marginTop + lines.length * lineHeight;
        ctx.fillStyle = CP_GREEN;
        ctx.fillRect(marginLeft, cursorY - fontSize + 2, fontSize * 0.6, fontSize);
      }

      // CRT vignette
      const grad = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.8);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Scanlines
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      for (let y = 0; y < H; y += 2) {
        ctx.fillRect(0, y, W, 1);
      }
    }

    async function typeLine(text, color, delayPerChar, suffix, suffixColor) {
      if (skipped()) return;
      const lineIdx = lines.length;
      lines.push({ text: '', color: color || CP_GREEN });
      const charDelay = delayPerChar || 30;

      for (let i = 0; i < text.length; i++) {
        if (skipped()) {
          lines[lineIdx].text = text;
          break;
        }
        lines[lineIdx].text = text.substring(0, i + 1);
        renderTerminal();
        if (soundEnabled && i % 3 === 0) playCyberpunkBeep();
        await sleep(charDelay);
      }
      lines[lineIdx].text = text;
      if (suffix) {
        lines[lineIdx].suffix = suffix;
        lines[lineIdx].suffixColor = suffixColor || CP_GREEN;
      }
      renderTerminal();
    }

    async function addLine(text, color, suffix, suffixColor) {
      lines.push({ text, color: color || CP_GREEN, suffix, suffixColor: suffixColor || CP_GREEN });
      renderTerminal();
    }

    async function step(ms) {
      if (skipped()) return;
      await sleep(ms);
    }

    // Start cursor blink
    cursorBlinkId = setInterval(() => { cursorVisible = !cursorVisible; }, 500);
    _intervals.push(cursorBlinkId);

    // ── Step 1: Black screen with cursor ──
    renderTerminal();
    await step(abbreviated ? 200 : 500);
    if (skipped()) { markSeen(); return; }

    // ── Step 2: INITIALIZING ──
    await typeLine('> INITIALIZING SPAWNKIT v2.0...', CP_GREEN, abbreviated ? 10 : 25);
    await step(abbreviated ? 100 : 400);
    if (skipped()) { markSeen(); return; }

    // ── Step 3: CONNECTING ──
    await typeLine('> CONNECTING TO NEURAL NETWORK...', CP_GREEN, abbreviated ? 10 : 20);
    await step(abbreviated ? 100 : 300);
    if (skipped()) { markSeen(); return; }
    lines[lines.length - 1].suffix = ' [OK]';
    lines[lines.length - 1].suffixColor = CP_GREEN;
    renderTerminal();
    if (soundEnabled) playCyberpunkBeep();
    await step(200);
    if (skipped()) { markSeen(); return; }

    // ── Step 4: LOADING AGENT CORES ──
    await typeLine('> LOADING AGENT CORES...', CP_CYAN, abbreviated ? 10 : 20);
    await step(abbreviated ? 100 : 300);
    if (skipped()) { markSeen(); return; }

    // ── Step 5: Agent loading lines ──
    const names = window.SpawnKitNames;
    const agentIds = ['hunter', 'forge', 'echo', 'atlas', 'sentinel'];
    const agentTitles = agentIds.map(id => {
      if (names?.resolve) return names.resolve('cyberpunk', id, 'title');
      return (id || '').toUpperCase();
    });

    for (let i = 0; i < agentTitles.length; i++) {
      if (skipped()) break;
      const title = agentTitles[i].padEnd(16);

      // Progressive bar fill
      const barStages = ['[■    ]', '[■■   ]', '[■■■  ]', '[■■■■ ]', '[■■■■■]'];
      const lineIdx = lines.length;
      lines.push({ text: '', color: CP_AMBER });

      if (!abbreviated) {
        for (let b = 0; b < barStages.length; b++) {
          if (skipped()) break;
          lines[lineIdx].text = `  ${barStages[b]} ${title}`;
          renderTerminal();
          await sleep(60);
        }
      }

      lines[lineIdx].text = `  [■■■■■] ${title}`;
      lines[lineIdx].suffix = '...ONLINE';
      lines[lineIdx].suffixColor = CP_GREEN;
      renderTerminal();
      if (soundEnabled) playCyberpunkBeep();
      await step(abbreviated ? 80 : 200);
    }
    if (skipped()) { markSeen(); return; }

    // ── Step 6: ALL SYSTEMS OPERATIONAL ──
    await step(300);
    // Flash green
    addLine('', CP_GREEN);
    await typeLine('> ALL SYSTEMS OPERATIONAL', CP_GREEN, abbreviated ? 5 : 15);
    if (skipped()) { markSeen(); return; }

    // Green flash effect
    if (!abbreviated) {
      ctx.fillStyle = 'rgba(0,255,65,0.15)'; ctx.fillRect(0, 0, W, H);
      await step(100);
      renderTerminal();
      await step(200);
    }

    // ── Step 7: WELCOME BACK ──
    addLine('', CP_GREEN);
    const userName = options.userName || 'OPERATOR';
    await typeLine(`> ROOT@FLEET: WELCOME BACK, ${(userName || 'OPERATOR').toUpperCase()}.`, CP_CYAN, abbreviated ? 10 : 20);
    if (skipped()) { markSeen(); return; }
    await step(abbreviated ? 300 : 1000);
    if (skipped()) { markSeen(); return; }

    // ── Step 8: Glitch transition ──
    if (!abbreviated) {
      const glitchDuration = 400;
      const startTime = performance.now();
      const imageData = ctx.getImageData(0, 0, W, H);

      await new Promise((resolve) => {
        function frame(now) {
          if (skipped()) { resolve(); return; }
          const elapsed = now - startTime;
          const t = Math.min(elapsed / glitchDuration, 1);

          // Restore base
          ctx.putImageData(imageData, 0, 0);

          // Glitch slices
          const numSlices = Math.floor(8 + t * 20);
          for (let i = 0; i < numSlices; i++) {
            const sliceY = Math.random() * H;
            const sliceH = Math.random() * 20 + 2;
            const offset = (Math.random() - 0.5) * 60 * t;
            const sliceData = ctx.getImageData(0, sliceY, W, sliceH);
            ctx.putImageData(sliceData, offset, sliceY);
          }

          // RGB split
          ctx.globalCompositeOperation = 'screen';
          ctx.globalAlpha = 0.3 * t;
          ctx.drawImage(_canvas, -3 * t, 0);
          ctx.drawImage(_canvas, 3 * t, 0);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';

          // Fade to black
          ctx.fillStyle = `rgba(0,0,0,${t * t})`;
          ctx.fillRect(0, 0, W, H);

          if (t < 1) _animFrame = requestAnimationFrame(frame);
          else resolve();
        }
        _animFrame = requestAnimationFrame(frame);
      });
    }

    clearInterval(cursorBlinkId);
    markSeen();
  }

  // ════════════════════════════════════════════════════════════════
  //  EXECUTIVE BOOT SEQUENCE
  // ════════════════════════════════════════════════════════════════
  async function executiveBoot(options) {
    const W = _canvas.width;
    const H = _canvas.height;
    const ctx = _ctx;
    const abbreviated = isReturningUser();
    const soundEnabled = options.soundEnabled;

    const EX_NAVY = '#1c2833';
    const EX_GOLD = '#c9a84c';
    const EX_GOLD_LIGHT = '#e8d491';
    const EX_WHITE = '#f8f8f8';
    const EX_SUBTLE = '#2c3e50';

    async function step(ms) {
      if (skipped()) return;
      await sleep(ms);
    }

    // ── Step 1: Dark screen with particles ──
    let particles = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3 - 0.2,
        r: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.3 + 0.1
      });
    }

    function drawParticles(alpha) {
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.y < -10) p.y = H + 10;
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201,168,76,${p.alpha * alpha})`;
        ctx.fill();
      });
    }

    // Particles only phase
    {
      const dur = abbreviated ? 300 : 800;
      const startTime = performance.now();
      await new Promise((resolve) => {
        function frame(now) {
          if (skipped()) { resolve(); return; }
          const t = Math.min((now - startTime) / dur, 1);
          ctx.fillStyle = EX_NAVY; ctx.fillRect(0, 0, W, H);
          drawParticles(t);
          if (t < 1) _animFrame = requestAnimationFrame(frame);
          else resolve();
        }
        _animFrame = requestAnimationFrame(frame);
      });
    }
    if (skipped()) { markSeen(); return; }

    // ── Step 2: Logo fades in ──
    {
      const dur = abbreviated ? 400 : 1500;
      const startTime = performance.now();
      if (soundEnabled && !abbreviated) playExecChime();

      await new Promise((resolve) => {
        function frame(now) {
          if (skipped()) { resolve(); return; }
          const t = Math.min((now - startTime) / dur, 1);
          // Ease in
          const alpha = t * t;

          ctx.fillStyle = EX_NAVY; ctx.fillRect(0, 0, W, H);
          drawParticles(1);

          ctx.globalAlpha = alpha;

          // Logo — elegant "FK" monogram + SPAWNKIT text
          const logoSize = Math.max(32, Math.floor(W / 15));
          const cx = W / 2;
          const cy = H * 0.35;

          // Gold circle
          ctx.beginPath();
          ctx.arc(cx, cy, logoSize, 0, Math.PI * 2);
          ctx.strokeStyle = EX_GOLD;
          ctx.lineWidth = 3;
          ctx.stroke();

          // Inner ring
          ctx.beginPath();
          ctx.arc(cx, cy, logoSize * 0.85, 0, Math.PI * 2);
          ctx.strokeStyle = EX_GOLD_LIGHT;
          ctx.lineWidth = 1;
          ctx.stroke();

          // "FK" monogram
          ctx.font = `bold ${logoSize}px "Georgia", "Times New Roman", serif`;
          ctx.fillStyle = EX_GOLD;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('FK', cx, cy + 2);

          // SPAWNKIT text below logo
          ctx.font = `${Math.floor(logoSize * 0.45)}px "Georgia", "Times New Roman", serif`;
          ctx.fillStyle = EX_GOLD;
          ctx.letterSpacing = '8px';
          ctx.fillText('F L E E T K I T', cx, cy + logoSize + 30);

          // Subtle line divider
          const lineW = W * 0.2;
          ctx.strokeStyle = EX_GOLD;
          ctx.lineWidth = 1;
          ctx.globalAlpha = alpha * 0.5;
          ctx.beginPath();
          ctx.moveTo(cx - lineW, cy + logoSize + 50);
          ctx.lineTo(cx + lineW, cy + logoSize + 50);
          ctx.stroke();

          ctx.globalAlpha = 1;
          ctx.textAlign = 'start';

          if (t < 1) _animFrame = requestAnimationFrame(frame);
          else resolve();
        }
        _animFrame = requestAnimationFrame(frame);
      });
    }
    if (skipped()) { markSeen(); return; }

    // ── Step 3: Tagline ──
    {
      const dur = abbreviated ? 200 : 500;
      const startTime = performance.now();
      await new Promise((resolve) => {
        function frame(now) {
          if (skipped()) { resolve(); return; }
          const t = Math.min((now - startTime) / dur, 1);

          ctx.fillStyle = EX_NAVY; ctx.fillRect(0, 0, W, H);
          drawParticles(1);

          const logoSize = Math.max(32, Math.floor(W / 15));
          const cx = W / 2;
          const cy = H * 0.35;

          // Re-draw logo
          ctx.beginPath();
          ctx.arc(cx, cy, logoSize, 0, Math.PI * 2);
          ctx.strokeStyle = EX_GOLD; ctx.lineWidth = 3; ctx.stroke();
          ctx.beginPath();
          ctx.arc(cx, cy, logoSize * 0.85, 0, Math.PI * 2);
          ctx.strokeStyle = EX_GOLD_LIGHT; ctx.lineWidth = 1; ctx.stroke();
          ctx.font = `bold ${logoSize}px "Georgia", "Times New Roman", serif`;
          ctx.fillStyle = EX_GOLD; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('FK', cx, cy + 2);
          ctx.font = `${Math.floor(logoSize * 0.45)}px "Georgia", "Times New Roman", serif`;
          ctx.fillText('F L E E T K I T', cx, cy + logoSize + 30);

          // Tagline fade in
          ctx.globalAlpha = t;
          ctx.font = `italic ${Math.floor(logoSize * 0.3)}px "Georgia", "Times New Roman", serif`;
          ctx.fillStyle = EX_GOLD_LIGHT;
          ctx.fillText('Your Executive AI Team', cx, cy + logoSize + 65);
          ctx.globalAlpha = 1;
          ctx.textAlign = 'start';

          if (t < 1) _animFrame = requestAnimationFrame(frame);
          else resolve();
        }
        _animFrame = requestAnimationFrame(frame);
      });
    }
    if (skipped()) { markSeen(); return; }
    await step(abbreviated ? 200 : 500);
    if (skipped()) { markSeen(); return; }

    // ── Step 4: Portrait cards slide in ──
    const names = window.SpawnKitNames;
    const agentIds = ['hunter', 'forge', 'echo', 'atlas', 'sentinel'];
    const agentInfo = agentIds.map(id => {
      if (names?.resolve) {
        return {
          name: names.resolve('executive', id) || id,
          title: names.resolve('executive', id, 'title') || id,
          role: names.resolve('executive', id, 'role') || '',
          emoji: names.resolve('executive', id, 'emoji') || ''
        };
      }
      return { name: id || '', title: id || '', role: '', emoji: '' };
    });

    {
      const dur = abbreviated ? 500 : 1500;
      const startTime = performance.now();

      await new Promise((resolve) => {
        function frame(now) {
          if (skipped()) { resolve(); return; }
          const elapsed = now - startTime;
          const t = Math.min(elapsed / dur, 1);

          ctx.fillStyle = EX_NAVY; ctx.fillRect(0, 0, W, H);
          drawParticles(1);

          // Cards
          const cardW = Math.min(W * 0.15, 140);
          const cardH = cardW * 1.3;
          const totalW = cardW * 5 + 20 * 4;
          const startX = (W - totalW) / 2;
          const cardY = H * 0.32;

          agentInfo.forEach((agent, i) => {
            // Stagger entrance
            const delay = i * 0.12;
            const cardT = Math.min(1, Math.max(0, (t - delay) / 0.3));
            // Ease out
            const ease = 1 - Math.pow(1 - cardT, 3);

            // Slide from alternating sides
            const fromLeft = i % 2 === 0;
            const slideOffset = fromLeft ? -W * 0.5 : W * 0.5;
            const cx = startX + i * (cardW + 20) + slideOffset * (1 - ease);

            ctx.globalAlpha = ease;

            // Card background
            ctx.fillStyle = EX_SUBTLE;
            ctx.fillRect(cx, cardY, cardW, cardH);

            // Gold border
            ctx.strokeStyle = EX_GOLD;
            ctx.lineWidth = 2;
            ctx.strokeRect(cx, cardY, cardW, cardH);

            // Avatar circle placeholder
            const avatarR = cardW * 0.22;
            const avatarCx = cx + cardW / 2;
            const avatarCy = cardY + cardH * 0.3;
            ctx.beginPath();
            ctx.arc(avatarCx, avatarCy, avatarR, 0, Math.PI * 2);
            ctx.fillStyle = EX_GOLD;
            ctx.fill();

            // Initials in avatar
            ctx.font = `bold ${Math.floor(avatarR)}px "Georgia", serif`;
            ctx.fillStyle = EX_NAVY;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const initials = ((agent?.name) || 'A').charAt(0).toUpperCase();
            ctx.fillText(initials, avatarCx, avatarCy + 1);

            // Name
            ctx.font = `bold ${Math.max(10, Math.floor(cardW / 10))}px "Georgia", serif`;
            ctx.fillStyle = EX_WHITE;
            ctx.fillText(agent?.name || '', cx + cardW / 2, cardY + cardH * 0.6);

            // Role
            ctx.font = `${Math.max(8, Math.floor(cardW / 14))}px "Georgia", serif`;
            ctx.fillStyle = EX_GOLD_LIGHT;
            // Wrap role if too long
            const roleText = agent?.role || '';
            const roleLines = [];
            const maxRoleW = cardW - 10;
            const words = (roleText || '').split(' ');
            let currentLine = '';
            words.forEach(word => {
              const test = currentLine ? currentLine + ' ' + word : word;
              if (ctx.measureText(test).width > maxRoleW) {
                if (currentLine) roleLines.push(currentLine);
                currentLine = word;
              } else {
                currentLine = test;
              }
            });
            if (currentLine) roleLines.push(currentLine);

            roleLines.forEach((line, li) => {
              ctx.fillText(line, cx + cardW / 2, cardY + cardH * 0.72 + li * (Math.floor(cardW / 12)));
            });

            ctx.globalAlpha = 1;
            ctx.textAlign = 'start';
          });

          if (t < 1) _animFrame = requestAnimationFrame(frame);
          else resolve();
        }
        _animFrame = requestAnimationFrame(frame);
      });
    }
    if (skipped()) { markSeen(); return; }
    await step(abbreviated ? 200 : 600);
    if (skipped()) { markSeen(); return; }

    // ── Step 5: Personalized greeting ──
    {
      const hour = new Date().getHours();
      let greeting;
      if (hour < 12) greeting = 'Good morning';
      else if (hour < 17) greeting = 'Good afternoon';
      else greeting = 'Good evening';

      const userName = options?.userName || 'there';
      const fullGreeting = `${greeting}, ${userName}.`;

      const dur = abbreviated ? 400 : 1000;
      const startTime = performance.now();

      await new Promise((resolve) => {
        function frame(now) {
          if (skipped()) { resolve(); return; }
          const t = Math.min((now - startTime) / dur, 1);
          const alpha = Math.min(1, t * 2); // fade in first half

          ctx.fillStyle = EX_NAVY; ctx.fillRect(0, 0, W, H);
          drawParticles(1);

          ctx.globalAlpha = alpha;
          const greetSize = Math.max(18, Math.floor(W / 30));
          ctx.font = `italic ${greetSize}px "Georgia", "Times New Roman", serif`;
          ctx.fillStyle = EX_GOLD_LIGHT;
          ctx.textAlign = 'center';
          ctx.fillText(fullGreeting, W / 2, H * 0.5);
          ctx.globalAlpha = 1;
          ctx.textAlign = 'start';

          if (t < 1) _animFrame = requestAnimationFrame(frame);
          else resolve();
        }
        _animFrame = requestAnimationFrame(frame);
      });
    }
    if (skipped()) { markSeen(); return; }
    await step(abbreviated ? 300 : 800);

    // ── Step 6: Smooth dissolve ──
    if (!abbreviated) {
      const dur = 600;
      const startTime = performance.now();
      await new Promise((resolve) => {
        function frame(now) {
          if (skipped()) { resolve(); return; }
          const t = Math.min((now - startTime) / dur, 1);
          ctx.fillStyle = `rgba(28,40,51,${t})`;
          ctx.fillRect(0, 0, W, H);
          if (t < 1) _animFrame = requestAnimationFrame(frame);
          else resolve();
        }
        _animFrame = requestAnimationFrame(frame);
      });
    }

    markSeen();
  }

  // ════════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ════════════════════════════════════════════════════════════════
  return {
    /**
     * Play a boot sequence.
     * @param {'gameboy'|'cyberpunk'|'executive'} theme
     * @param {HTMLElement} container - DOM element (used for context, overlay is fullscreen)
     * @param {Object} [options]
     * @param {boolean} [options.skipable=true] - Allow ESC/click to skip
     * @param {boolean} [options.soundEnabled=false] - Play sound effects
     * @param {string}  [options.userName='Kira'] - User name for greeting
     * @returns {Promise<void>} Resolves when boot is complete
     */
    async play(theme, container, options = {}) {
      const opts = {
        skipable: options.skipable !== false,
        soundEnabled: options.soundEnabled || false,
        userName: options.userName || 'Kira'
      };

      setup(container || document.body);

      return new Promise(async (resolve) => {
        _resolve = resolve;

        try {
          switch (theme) {
            case 'gameboy':
              await gameboyBoot(opts);
              break;
            case 'cyberpunk':
              await cyberpunkBoot(opts);
              break;
            case 'executive':
              await executiveBoot(opts);
              break;
            default:
              console.warn(`SpawnKitBoot: Unknown theme "${theme}", skipping.`);
          }
        } catch (e) {
          console.error('SpawnKitBoot error:', e);
        }

        finish();
      });
    },

    /**
     * Immediately skip and resolve.
     */
    skip() {
      _skipRequested = true;
    },

    /**
     * Reset the "returning user" flag (forces full boot next time).
     */
    resetSeen() {
      localStorage.removeItem('spawnkit-boot-seen');
    }
  };
})();
