/**
 * SpawnKit v2 — Universal UX Layer (SS+ Grade)
 * ═══════════════════════════════════════════════════════════════════════════
 * Loaded by ALL themes. Provides:
 *   1. Keyboard Shortcut Overlay (? key)
 *   2. First-Time Onboarding (3-step tooltip sequence)
 *   3. Universal Navigation Bar (top-right, theme-aware)
 *   4. Error Recovery Screen (window.onerror handler)
 *   5. Loading Skeleton (themed, auto-hides when ready)
 *
 * API:
 *   SpawnKitUX.init({ theme: 'gameboy'|'cyberpunk'|'executive' })
 *   SpawnKitUX.showHelp()
 *   SpawnKitUX.hideHelp()
 *   SpawnKitUX.ready()          — call when office is fully loaded
 *   SpawnKitUX.isReady()
 *
 * Pure JS + CSS, no dependencies. File:// compatible.
 *
 * @author Forge (CTO) ⚒️
 * @version 1.0.0
 */

window.SpawnKitUX = (() => {
  'use strict';

  // ── State ────────────────────────────────────────────────────────
  let _theme = 'gameboy';
  let _initialized = false;
  let _officeReady = false;
  let _helpVisible = false;
  let _onboardingActive = false;
  let _skeletonEl = null;
  let _helpEl = null;
  let _navEl = null;
  let _styleEl = null;

  // ── Theme Palettes ──────────────────────────────────────────────
  const PALETTES = {
    gameboy: {
      bg:        '#0F380F',
      bgAlt:     '#306230',
      fg:        '#9BBB0F',
      fgDim:     '#8BAC0F',
      accent:    '#9BBB0F',
      border:    '#8BAC0F',
      overlay:   'rgba(15, 56, 15, 0.96)',
      font:      "'Press Start 2P', 'Monaco', monospace",
      fontSize:  '10px',
      titleSize: '12px',
      radius:    '0px',
      glow:      'none',
      skeletonPulse: 'ux-pulse-gameboy',
    },
    cyberpunk: {
      bg:        '#0a0a0f',
      bgAlt:     '#121225',
      fg:        '#00FF41',
      fgDim:     '#00cc33',
      accent:    '#00FFFF',
      border:    '#00FFFF',
      overlay:   'rgba(10, 10, 15, 0.97)',
      font:      "'JetBrains Mono', 'Courier New', monospace",
      fontSize:  '12px',
      titleSize: '14px',
      radius:    '2px',
      glow:      '0 0 8px rgba(0, 255, 255, 0.4)',
      skeletonPulse: 'ux-pulse-cyberpunk',
    },
    executive: {
      bg:        '#1c2833',
      bgAlt:     '#2c3e50',
      fg:        '#f5f5dc',
      fgDim:     '#c9a84c',
      accent:    '#c9a84c',
      border:    '#c9a84c',
      overlay:   'rgba(28, 40, 51, 0.97)',
      font:      "'Georgia', 'Times New Roman', serif",
      fontSize:  '13px',
      titleSize: '15px',
      radius:    '8px',
      glow:      '0 0 12px rgba(201, 168, 76, 0.25)',
      skeletonPulse: 'ux-pulse-executive',
    }
  };

  function P() { return PALETTES[_theme] || PALETTES.gameboy; }

  // ── Inject Global Styles ────────────────────────────────────────
  function injectStyles() {
    if (_styleEl) _styleEl.remove();
    _styleEl = document.createElement('style');
    _styleEl.id = 'spawnkit-ux-styles';

    const p = P();

    _styleEl.textContent = `
      /* ═══ SpawnKit UX Layer Styles ═══ */

      /* ── Keyboard Shortcut Overlay ── */
      #fk-help-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: ${p.overlay};
        z-index: 100000;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.25s ease, visibility 0.25s ease;
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
      }
      #fk-help-overlay.fk-visible {
        opacity: 1;
        visibility: visible;
      }
      #fk-help-overlay:focus {
        outline: 2px solid ${p.accent};
        outline-offset: -2px;
      }
      #fk-help-box {
        background: ${p.bg};
        border: 2px solid ${p.border};
        border-radius: ${p.radius};
        box-shadow: ${p.glow};
        padding: 28px 36px;
        max-width: 480px;
        width: 90vw;
        max-height: 85vh;
        overflow-y: auto;
        font-family: ${p.font};
        font-size: ${p.fontSize};
        color: ${p.fg};
        line-height: 1.8;
      }
      #fk-help-box h2 {
        font-size: ${p.titleSize};
        color: ${p.accent};
        margin: 0 0 16px 0;
        text-align: center;
        letter-spacing: 2px;
      }
      #fk-help-box h3 {
        font-size: ${p.fontSize};
        color: ${p.accent};
        margin: 16px 0 8px 0;
        opacity: 0.85;
      }
      .fk-shortcut-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 3px 0;
      }
      .fk-shortcut-row:hover {
        background: ${p.bgAlt};
        border-radius: 3px;
        padding-left: 4px; padding-right: 4px;
      }
      .fk-key {
        display: inline-block;
        background: ${p.bgAlt};
        border: 1px solid ${p.border};
        border-radius: 3px;
        padding: 1px 7px;
        font-family: ${p.font};
        font-size: ${p.fontSize};
        color: ${p.accent};
        min-width: 28px;
        text-align: center;
        box-shadow: ${p.glow};
      }
      .fk-shortcut-desc {
        color: ${p.fgDim};
        flex: 1;
        margin-left: 16px;
        text-align: right;
      }
      .fk-help-footer {
        margin-top: 20px;
        text-align: center;
        color: ${p.fgDim};
        font-size: calc(${p.fontSize} - 1px);
        opacity: 0.6;
      }

      /* ── Navigation Bar ── */
      #fk-nav {
        position: fixed;
        top: 12px;
        right: 64px; /* offset from theme-switcher */
        z-index: 10001;
        display: flex;
        align-items: center;
        gap: 4px;
        opacity: 0.3;
        transition: opacity 0.3s ease;
      }
      #fk-nav:hover, #fk-nav:focus-within {
        opacity: 1;
      }
      .fk-nav-btn {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${p.bg};
        border: 1px solid ${p.border};
        border-radius: ${p.radius};
        color: ${p.fg};
        font-size: 16px;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: ${p.glow};
        position: relative;
        padding: 0;
        font-family: inherit;
      }
      .fk-nav-btn:hover, .fk-nav-btn:focus {
        background: ${p.bgAlt};
        transform: scale(1.1);
        outline: 2px solid ${p.accent};
        outline-offset: 1px;
      }
      .fk-nav-btn:active {
        transform: scale(0.95);
      }
      .fk-nav-btn[aria-label]::after {
        content: attr(aria-label);
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: ${p.bg};
        border: 1px solid ${p.border};
        border-radius: 3px;
        color: ${p.fg};
        font-family: ${p.font};
        font-size: 9px;
        padding: 3px 6px;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.15s ease;
        margin-top: 4px;
      }
      .fk-nav-btn:hover::after, .fk-nav-btn:focus::after {
        opacity: 1;
      }

      /* ── Onboarding Tooltips ── */
      .fk-onboarding-tip {
        position: fixed;
        z-index: 100002;
        background: ${p.bg};
        border: 2px solid ${p.accent};
        border-radius: ${p.radius === '0px' ? '0' : '10'}px;
        padding: 14px 20px;
        max-width: 300px;
        font-family: ${p.font};
        font-size: ${p.fontSize};
        color: ${p.fg};
        box-shadow: ${p.glow}, 0 4px 20px rgba(0,0,0,0.5);
        cursor: pointer;
        animation: fk-tip-enter 0.35s ease-out;
        user-select: none;
        -webkit-user-select: none;
      }
      .fk-onboarding-tip::after {
        content: 'Click to continue →';
        display: block;
        margin-top: 8px;
        font-size: calc(${p.fontSize} - 2px);
        color: ${p.fgDim};
        opacity: 0.5;
      }
      .fk-onboarding-tip .fk-tip-step {
        position: absolute;
        top: -8px;
        right: -8px;
        background: ${p.accent};
        color: ${p.bg};
        width: 22px;
        height: 22px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        font-family: monospace;
      }
      @keyframes fk-tip-enter {
        0% { opacity: 0; transform: translateY(10px) scale(0.95); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }

      /* ── Error Recovery ── */
      #fk-error-screen {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: ${p.bg};
        z-index: 200000;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        font-family: ${p.font};
        color: ${p.fg};
        text-align: center;
        padding: 40px;
        animation: fk-error-fade-in 0.4s ease;
      }
      #fk-error-screen .fk-error-emoji {
        font-size: 48px;
        margin-bottom: 16px;
      }
      #fk-error-screen h2 {
        font-size: calc(${p.titleSize} + 4px);
        color: ${p.accent};
        margin-bottom: 12px;
      }
      #fk-error-screen p {
        font-size: ${p.fontSize};
        color: ${p.fgDim};
        max-width: 400px;
        line-height: 2;
        margin-bottom: 24px;
      }
      #fk-error-screen a, #fk-error-screen button {
        display: inline-block;
        background: ${p.bgAlt};
        border: 2px solid ${p.accent};
        border-radius: ${p.radius};
        color: ${p.accent};
        font-family: ${p.font};
        font-size: ${p.fontSize};
        padding: 10px 24px;
        text-decoration: none;
        cursor: pointer;
        transition: all 0.2s ease;
        margin: 4px;
      }
      #fk-error-screen a:hover, #fk-error-screen button:hover,
      #fk-error-screen a:focus, #fk-error-screen button:focus {
        background: ${p.accent};
        color: ${p.bg};
        outline: none;
      }
      @keyframes fk-error-fade-in {
        0% { opacity: 0; }
        100% { opacity: 1; }
      }

      /* ── Loading Skeleton ── */
      #fk-skeleton {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: ${p.bg};
        z-index: 99998;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        font-family: ${p.font};
        color: ${p.fg};
        transition: opacity 0.5s ease;
        overflow: hidden;
      }
      #fk-skeleton.fk-hiding {
        opacity: 0;
        pointer-events: none;
      }

      /* GameBoy skeleton: green pulsing rectangles */
      .fk-skel-gameboy {
        display: flex;
        flex-direction: column;
        gap: 12px;
        align-items: center;
      }
      .fk-skel-gameboy .fk-skel-bar {
        background: #306230;
        border: 2px solid #8BAC0F;
        height: 16px;
        animation: ux-pulse-gameboy 1.2s ease-in-out infinite;
      }
      .fk-skel-gameboy .fk-skel-bar:nth-child(1) { width: 240px; animation-delay: 0s; }
      .fk-skel-gameboy .fk-skel-bar:nth-child(2) { width: 320px; animation-delay: 0.15s; }
      .fk-skel-gameboy .fk-skel-bar:nth-child(3) { width: 280px; animation-delay: 0.3s; }
      .fk-skel-gameboy .fk-skel-bar:nth-child(4) { width: 200px; animation-delay: 0.45s; }
      .fk-skel-gameboy .fk-skel-bar:nth-child(5) { width: 350px; animation-delay: 0.6s; }
      .fk-skel-gameboy .fk-skel-label {
        margin-top: 16px;
        font-family: 'Press Start 2P', monospace;
        font-size: 10px;
        color: #8BAC0F;
        letter-spacing: 2px;
      }
      @keyframes ux-pulse-gameboy {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 1; }
      }

      /* Cyberpunk skeleton: matrix text */
      .fk-skel-cyberpunk {
        text-align: center;
      }
      .fk-skel-cyberpunk .fk-skel-matrix {
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        font-size: 12px;
        color: #00FF41;
        white-space: pre;
        line-height: 1.6;
        opacity: 0.7;
        animation: ux-pulse-cyberpunk 0.8s ease-in-out infinite;
      }
      .fk-skel-cyberpunk .fk-skel-label {
        margin-top: 16px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        color: #00FFFF;
        letter-spacing: 4px;
      }
      @keyframes ux-pulse-cyberpunk {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 1; }
      }

      /* Executive skeleton: professional spinner */
      .fk-skel-executive {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
      }
      .fk-skel-executive .fk-skel-spinner {
        width: 48px;
        height: 48px;
        border: 3px solid rgba(201, 168, 76, 0.2);
        border-top: 3px solid #c9a84c;
        border-radius: 50%;
        animation: ux-pulse-executive 0.8s linear infinite;
      }
      .fk-skel-executive .fk-skel-label {
        font-family: 'Georgia', serif;
        font-size: 14px;
        color: #c9a84c;
        letter-spacing: 3px;
      }
      @keyframes ux-pulse-executive {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      /* ── Shared animations ── */
      @keyframes fk-fade-out {
        0% { opacity: 1; }
        100% { opacity: 0; }
      }
    `;

    document.head.appendChild(_styleEl);
  }

  // ══════════════════════════════════════════════════════════════════
  //  1. KEYBOARD SHORTCUT OVERLAY
  // ══════════════════════════════════════════════════════════════════

  const SHORTCUTS = [
    { key: '?', desc: 'Show this help' },
    { key: 'M', desc: 'Trigger meeting' },
    { key: 'C', desc: 'Celebrate!' },
    { key: 'W', desc: 'Whiteboard session' },
    { key: 'X', desc: 'Add urgent mission' },
    { key: 'S', desc: 'System status' },
    { key: 'I', desc: 'Toggle click mode' },
    { key: 'N', desc: 'Toggle sound' },
    { key: 'ESC', desc: 'Close overlays / Skip boot' },
  ];

  const CHEAT_CODES = [
    { key: 'Ctrl+K', desc: 'Konami code' },
    { key: 'Ctrl+M', desc: 'Matrix mode' },
  ];

  function buildHelpOverlay() {
    if (_helpEl) return;

    _helpEl = document.createElement('div');
    _helpEl.id = 'fk-help-overlay';
    _helpEl.tabIndex = -1;
    _helpEl.setAttribute('role', 'dialog');
    _helpEl.setAttribute('aria-modal', 'true');
    _helpEl.setAttribute('aria-label', 'Keyboard Shortcuts');

    const box = document.createElement('div');
    box.id = 'fk-help-box';

    // Title
    const title = document.createElement('h2');
    title.textContent = '⌨️  KEYBOARD SHORTCUTS';
    box.appendChild(title);

    // Shortcuts
    SHORTCUTS.forEach(s => {
      box.appendChild(makeShortcutRow(s.key, s.desc));
    });

    // Cheat codes section
    const cheatTitle = document.createElement('h3');
    cheatTitle.textContent = '🎮 CHEAT CODES';
    box.appendChild(cheatTitle);

    CHEAT_CODES.forEach(s => {
      box.appendChild(makeShortcutRow(s.key, s.desc));
    });

    // Footer
    const footer = document.createElement('div');
    footer.className = 'fk-help-footer';
    footer.textContent = 'Press ? or ESC to close';
    box.appendChild(footer);

    _helpEl.appendChild(box);

    // Click outside to close
    _helpEl.addEventListener('click', (e) => {
      if (e.target === _helpEl) hideHelp();
    });

    document.body.appendChild(_helpEl);
  }

  function makeShortcutRow(key, desc) {
    const row = document.createElement('div');
    row.className = 'fk-shortcut-row';

    const keyEl = document.createElement('span');
    keyEl.className = 'fk-key';
    keyEl.textContent = key;
    row.appendChild(keyEl);

    const descEl = document.createElement('span');
    descEl.className = 'fk-shortcut-desc';
    descEl.textContent = desc;
    row.appendChild(descEl);

    return row;
  }

  function showHelp() {
    if (!_helpEl) buildHelpOverlay();
    // Re-inject styles in case theme changed
    injectStyles();
    _helpEl.classList.add('fk-visible');
    _helpVisible = true;
    _helpEl.focus();
  }

  function hideHelp() {
    if (_helpEl) _helpEl.classList.remove('fk-visible');
    _helpVisible = false;
  }

  function toggleHelp() {
    _helpVisible ? hideHelp() : showHelp();
  }

  // ══════════════════════════════════════════════════════════════════
  //  2. FIRST-TIME ONBOARDING
  // ══════════════════════════════════════════════════════════════════

  const ONBOARDING_STEPS = [
    {
      text: '👋 Welcome to your AI office! Watch your team work.',
      position: { top: '40%', left: '50%', transform: 'translate(-50%, -50%)' },
    },
    {
      text: '⌨️ Press ? anytime for keyboard shortcuts',
      position: { top: '20px', right: '80px' },
    },
    {
      text: '🎮 Press X to send a mission, M for a meeting!',
      position: { bottom: '80px', left: '50%', transform: 'translateX(-50%)' },
    }
  ];

  function shouldOnboard() {
    return !localStorage.getItem('spawnkit-onboarded');
  }

  function markOnboarded() {
    localStorage.setItem('spawnkit-onboarded', 'true');
  }

  function startOnboarding() {
    if (!shouldOnboard() || _onboardingActive) return;
    _onboardingActive = true;

    // Wait a bit after boot for everything to settle
    setTimeout(() => showOnboardingStep(0), 1200);
  }

  function showOnboardingStep(index) {
    if (index >= ONBOARDING_STEPS.length) {
      markOnboarded();
      _onboardingActive = false;
      return;
    }

    const step = ONBOARDING_STEPS[index];
    const tip = document.createElement('div');
    tip.className = 'fk-onboarding-tip';

    // Step indicator
    const stepBadge = document.createElement('span');
    stepBadge.className = 'fk-tip-step';
    stepBadge.textContent = (index + 1).toString();
    tip.appendChild(stepBadge);

    // Message
    const msg = document.createElement('div');
    msg.textContent = step.text;
    tip.appendChild(msg);

    // Position
    Object.entries(step.position).forEach(([prop, val]) => {
      tip.style[prop] = val;
    });

    // Click to dismiss → next
    tip.addEventListener('click', () => {
      tip.style.animation = 'fk-fade-out 0.2s ease forwards';
      setTimeout(() => {
        tip.remove();
        showOnboardingStep(index + 1);
      }, 200);
    });

    document.body.appendChild(tip);
  }

  // ══════════════════════════════════════════════════════════════════
  //  3. UNIVERSAL NAVIGATION BAR
  // ══════════════════════════════════════════════════════════════════

  function buildNavBar() {
    if (_navEl) return;

    _navEl = document.createElement('nav');
    _navEl.id = 'fk-nav';
    _navEl.setAttribute('role', 'navigation');
    _navEl.setAttribute('aria-label', 'SpawnKit navigation');

    // Home button
    _navEl.appendChild(makeNavBtn('🏠', 'Home', () => {
      window.location.href = '../src/theme-selector.html';
    }));

    // Help button
    _navEl.appendChild(makeNavBtn('❓', 'Shortcuts (?)', () => {
      toggleHelp();
    }));

    // Sound toggle
    const soundBtn = makeNavBtn('🔊', 'Sound (N)', () => {
      toggleSoundFromNav(soundBtn);
    });
    soundBtn.id = 'fk-nav-sound';
    updateSoundBtnLabel(soundBtn);
    _navEl.appendChild(soundBtn);

    document.body.appendChild(_navEl);
  }

  function makeNavBtn(emoji, label, onClick) {
    const btn = document.createElement('button');
    btn.className = 'fk-nav-btn';
    btn.setAttribute('aria-label', label);
    btn.textContent = emoji;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    return btn;
  }

  function toggleSoundFromNav(btn) {
    // Try GameBoy sound system first
    if (typeof GameBoyFX !== 'undefined' && GameBoyFX?.toggleSound) {
      GameBoyFX.toggleSound();
    }
    // Update the button visual
    updateSoundBtnLabel(btn);
  }

  function updateSoundBtnLabel(btn) {
    if (!btn) return;
    // Check GameBoyFX mute state
    const isMuted = (typeof GameBoyFX !== 'undefined' && GameBoyFX?.muted);
    btn.textContent = isMuted ? '🔇' : '🔊';
    btn.setAttribute('aria-label', isMuted ? 'Sound OFF (N)' : 'Sound ON (N)');
  }

  // ══════════════════════════════════════════════════════════════════
  //  4. ERROR RECOVERY SCREEN
  // ══════════════════════════════════════════════════════════════════

  let _errorCount = 0;
  const MAX_ERRORS_BEFORE_SCREEN = 3;

  function installErrorHandler() {
    window.addEventListener('error', (event) => {
      _errorCount++;
      console.error('[SpawnKitUX] Error caught:', event?.message);

      // Only show recovery screen after multiple critical errors
      // or a single fatal error that prevents rendering
      if (_errorCount >= MAX_ERRORS_BEFORE_SCREEN || isCriticalError(event)) {
        showErrorScreen(event?.message || 'Unknown error');
      }
    });

    window.addEventListener('unhandledrejection', (event) => {
      _errorCount++;
      console.error('[SpawnKitUX] Unhandled rejection:', event?.reason);

      if (_errorCount >= MAX_ERRORS_BEFORE_SCREEN) {
        showErrorScreen(String(event.reason));
      }
    });
  }

  function isCriticalError(event) {
    // PixiJS or core engine failure
    const msg = (event?.message || '').toLowerCase();
    return (
      msg.includes('pixi') ||
      msg.includes('cannot read prop') ||
      msg.includes('is not defined') ||
      msg.includes('syntax error') ||
      msg.includes('unexpected token')
    );
  }

  function showErrorScreen(errorMsg) {
    // Don't show twice
    if (document.getElementById('fk-error-screen')) return;

    const p = P();
    const screen = document.createElement('div');
    screen.id = 'fk-error-screen';

    screen.innerHTML = `
      <div class="fk-error-emoji">😵</div>
      <h2>Something went wrong</h2>
      <p>
        SpawnKit couldn't initialize properly.<br>Try:
      </p>
      <p style="text-align: left; line-height: 2.2;">
        • Refresh the page<br>
        • Clear cache (Ctrl+Shift+R)<br>
        • Check your internet connection
      </p>
      <div>
        <button onclick="location.reload()" tabindex="0">↻ Refresh</button>
        <a href="../src/theme-selector.html" tabindex="0">🏠 Theme Selector</a>
      </div>
      <p style="margin-top: 20px; font-size: 9px; opacity: 0.4; max-width: 500px; word-break: break-all;">
        ${escapeHTML(errorMsg || 'Unknown error')}
      </p>
    `;

    document.body.appendChild(screen);

    // Hide skeleton if showing
    hideSkeleton();
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ══════════════════════════════════════════════════════════════════
  //  5. LOADING SKELETON
  // ══════════════════════════════════════════════════════════════════

  function showSkeleton() {
    if (_skeletonEl) return;

    _skeletonEl = document.createElement('div');
    _skeletonEl.id = 'fk-skeleton';

    let inner = '';

    if (_theme === 'gameboy') {
      inner = `
        <div class="fk-skel-gameboy">
          <div class="fk-skel-bar"></div>
          <div class="fk-skel-bar"></div>
          <div class="fk-skel-bar"></div>
          <div class="fk-skel-bar"></div>
          <div class="fk-skel-bar"></div>
          <div class="fk-skel-label">LOADING OFFICE...</div>
        </div>
      `;
    } else if (_theme === 'cyberpunk') {
      // Generate random matrix characters
      const matrixChars = '01アイウエオカキクケコ';
      let matrixLines = '';
      for (let row = 0; row < 6; row++) {
        let line = '';
        for (let col = 0; col < 32; col++) {
          line += matrixChars.charAt(Math.floor(Math.random() * matrixChars.length));
        }
        matrixLines += line + '\n';
      }
      inner = `
        <div class="fk-skel-cyberpunk">
          <div class="fk-skel-matrix">${matrixLines}</div>
          <div class="fk-skel-label">INITIALIZING...</div>
        </div>
      `;
    } else if (_theme === 'executive') {
      inner = `
        <div class="fk-skel-executive">
          <div class="fk-skel-spinner"></div>
          <div class="fk-skel-label">PREPARING BOARDROOM</div>
        </div>
      `;
    }

    _skeletonEl.innerHTML = inner;
    document.body.appendChild(_skeletonEl);

    // Animate cyberpunk matrix text
    if (_theme === 'cyberpunk') {
      _skeletonMatrixInterval = setInterval(() => {
        const matrixEl = _skeletonEl && _skeletonEl.querySelector('.fk-skel-matrix');
        if (!matrixEl) return;
        const matrixChars = '01アイウエオカキクケコサシスセソ';
        let matrixLines = '';
        for (let row = 0; row < 6; row++) {
          let line = '';
          for (let col = 0; col < 32; col++) {
            line += matrixChars.charAt(Math.floor(Math.random() * matrixChars.length));
          }
          matrixLines += line + '\n';
        }
        matrixEl.textContent = matrixLines;
      }, 120);
    }
  }

  let _skeletonMatrixInterval = null;

  function hideSkeleton() {
    if (_skeletonMatrixInterval) {
      clearInterval(_skeletonMatrixInterval);
      _skeletonMatrixInterval = null;
    }
    if (_skeletonEl) {
      _skeletonEl.classList.add('fk-hiding');
      setTimeout(() => {
        if (_skeletonEl && _skeletonEl.parentNode) {
          _skeletonEl.remove();
        }
        _skeletonEl = null;
      }, 500);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  //  KEYBOARD HANDLER (unified)
  // ══════════════════════════════════════════════════════════════════

  function setupKeyboardHandler() {
    document.addEventListener('keydown', (e) => {
      // Don't capture when typing in inputs
      const tag = (e?.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e?.target?.isContentEditable) {
        // Only allow ESC in inputs
        if (e.key === 'Escape' && _helpVisible) {
          hideHelp();
          e.preventDefault();
        }
        return;
      }

      // ? key — toggle help overlay
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        toggleHelp();
        return;
      }

      // ESC — close help if open
      if (e.key === 'Escape' && _helpVisible) {
        e.preventDefault();
        hideHelp();
        return;
      }

      // N — toggle sound (synced with nav bar)
      if (e.key === 'n' || e.key === 'N') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          const soundBtn = document.getElementById('fk-nav-sound');
          toggleSoundFromNav(soundBtn);
          // Don't preventDefault — let theme handlers also catch N if they want
        }
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ══════════════════════════════════════════════════════════════════

  return {
    /**
     * Initialize the UX layer.
     * @param {Object} opts
     * @param {'gameboy'|'cyberpunk'|'executive'} opts.theme
     */
    init(opts = {}) {
      if (_initialized) return;
      _initialized = true;

      _theme = opts.theme || 'gameboy';

      // 1. Inject styles
      injectStyles();

      // 2. Install error handler FIRST (catches everything)
      installErrorHandler();

      // 3. Show loading skeleton
      showSkeleton();

      // 4. Build help overlay (pre-built, hidden)
      buildHelpOverlay();

      // 5. Build nav bar
      buildNavBar();

      // 6. Setup keyboard handler
      setupKeyboardHandler();

      // 7. Start onboarding after boot completes (waits for ready())
      // We'll trigger onboarding after a delay to let boot play
      // If boot sequence is present, we wait for ready(); otherwise auto-trigger
      setTimeout(() => {
        if (!_officeReady) {
          // Auto-hide skeleton after 15s max (failsafe)
          hideSkeleton();
        }
      }, 15000);

      console.log(`[SpawnKitUX] Initialized (theme: ${_theme})`);
    },

    /**
     * Call when the office is fully loaded and interactive.
     * Hides skeleton, starts onboarding if first visit.
     */
    ready() {
      if (_officeReady) return;
      _officeReady = true;

      hideSkeleton();

      // Start onboarding if first time
      if (shouldOnboard()) {
        startOnboarding();
      }

      console.log('[SpawnKitUX] Office ready ✓');
    },

    /**
     * @returns {boolean}
     */
    isReady() {
      return _officeReady;
    },

    /** Show the keyboard shortcut overlay. */
    showHelp,

    /** Hide the keyboard shortcut overlay. */
    hideHelp,

    /** Toggle the shortcut overlay. */
    toggleHelp,

    /** Re-apply styles (e.g. after theme change). */
    refreshTheme(newTheme) {
      if (newTheme) _theme = newTheme;
      injectStyles();
      // Rebuild help to pick up new theme colors
      if (_helpEl) {
        _helpEl.remove();
        _helpEl = null;
        buildHelpOverlay();
      }
      console.log(`[SpawnKitUX] Theme refreshed: ${_theme}`);
    },

    /** Manually trigger onboarding (resets onboard flag). */
    resetOnboarding() {
      localStorage.removeItem('spawnkit-onboarded');
      _onboardingActive = false;
      startOnboarding();
    },

    /** Get current theme. */
    get theme() { return _theme; },
  };
})();
