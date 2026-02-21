/**
 * SpawnKit v2 — Click Affordances & Visual Buttons Layer
 * ═══════════════════════════════════════════════════════
 *
 * The #1 UX fix: makes SpawnKit usable for non-keyboard users.
 * Zero click affordances → full mouse-driven experience.
 *
 * Features:
 *   1. Floating Action Button (FAB) — expandable speed-dial
 *   2. Clickable Agents — hover glow, click → agent detail card
 *   3. Visible Mission Input — search-bar-style prompt at top
 *   4. "Press ? for help" Toast — first-visit hint
 *   5. GameBoy HUD — replaces debug bar with Pokémon-style stats
 *   6. Demo Mode Button — watch team in action
 *
 * Integrates with: OpenClawHelpers, SpawnKitUX, SpawnKitAchievements,
 *                  MissionController, GameBoyCharacterManager
 *
 * Pure JS, file:// compatible, zero dependencies.
 *
 * @author Forge (CTO) ⚒️
 * @version 1.0.0
 */

window.ClickAffordances = (() => {
  'use strict';

  // ── State ────────────────────────────────────────────────────
  let _theme = 'gameboy';
  let _initialized = false;
  let _fabExpanded = false;
  let _styleEl = null;

  // ── Theme Detection ──────────────────────────────────────────
  function detectTheme() {
    // From URL path
    const path = window.location.pathname.toLowerCase();
    if (path.includes('cyberpunk')) return 'cyberpunk';
    if (path.includes('executive')) return 'executive';
    if (path.includes('gameboy')) return 'gameboy';

    // From DOM hints
    if (document.querySelector('.crt-screen') || document.querySelector('.scanlines')) return 'cyberpunk';
    if (document.querySelector('.executive-office') || document.querySelector('.executive-suit')) return 'executive';
    if (document.getElementById('gameContainer')) return 'gameboy';

    // From OpenClawHelpers or SpawnKitUX
    if (window.OpenClawHelpers?.theme) return OpenClawHelpers.theme;
    if (window.SpawnKitUX?.theme) return SpawnKitUX.theme;

    return 'gameboy';
  }

  // ── Theme Palettes ──────────────────────────────────────────
  const PALETTES = {
    gameboy: {
      bg:       '#0F380F',
      bgAlt:    '#306230',
      fg:       '#9BBB0F',
      fgDim:    '#8BAC0F',
      accent:   '#9BBB0F',
      border:   '#8BAC0F',
      danger:   '#FF6B6B',
      font:     "'Press Start 2P', 'Monaco', monospace",
      fontSize: '10px',
      radius:   '0px',
      glow:     'none',
      fabBg:    '#306230',
      fabFg:    '#9BBB0F',
      fabBorder:'#8BAC0F',
      fabShadow:'2px 2px 0px #0F380F',
      hoverGlow:'0 0 8px rgba(155, 187, 15, 0.6)',
    },
    cyberpunk: {
      bg:       '#0a0a0f',
      bgAlt:    '#121225',
      fg:       '#00FF41',
      fgDim:    '#00cc33',
      accent:   '#00FFFF',
      border:   '#00FFFF',
      danger:   '#FF0040',
      font:     "'JetBrains Mono', 'Courier New', monospace",
      fontSize: '12px',
      radius:   '2px',
      glow:     '0 0 8px rgba(0, 255, 255, 0.4)',
      fabBg:    '#0a0a0f',
      fabFg:    '#00FFFF',
      fabBorder:'#00FFFF',
      fabShadow:'0 0 15px rgba(0, 255, 255, 0.5), 0 0 30px rgba(0, 255, 255, 0.2)',
      hoverGlow:'0 0 15px rgba(0, 255, 255, 0.5), 0 0 30px rgba(0, 255, 255, 0.15)',
    },
    executive: {
      bg:       '#1c2833',
      bgAlt:    '#2c3e50',
      fg:       '#f5f5dc',
      fgDim:    '#c9a84c',
      accent:   '#c9a84c',
      border:   '#c9a84c',
      danger:   '#e74c3c',
      font:     "'Georgia', 'Times New Roman', serif",
      fontSize: '13px',
      radius:   '8px',
      glow:     '0 0 12px rgba(201, 168, 76, 0.25)',
      fabBg:    '#1c2833',
      fabFg:    '#c9a84c',
      fabBorder:'#c9a84c',
      fabShadow:'0 4px 16px rgba(201, 168, 76, 0.3)',
      hoverGlow:'0 0 12px rgba(201, 168, 76, 0.4)',
    },
  };

  function P() { return PALETTES[_theme] || PALETTES.gameboy; }

  // ══════════════════════════════════════════════════════════════
  //  STYLES INJECTION
  // ══════════════════════════════════════════════════════════════

  function injectStyles() {
    if (_styleEl) _styleEl.remove();
    _styleEl = document.createElement('style');
    _styleEl.id = 'click-affordances-styles';

    const p = P();

    _styleEl.textContent = `
      /* ═══ Click Affordances Styles ═══ */

      /* ── FAB (Floating Action Button) ── */
      #ca-fab {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 90000;
        display: flex;
        flex-direction: column-reverse;
        align-items: flex-end;
        gap: 8px;
        pointer-events: none;
      }
      #ca-fab * {
        pointer-events: auto;
      }

      .ca-fab-main {
        width: 52px;
        height: 52px;
        border-radius: ${_theme === 'gameboy' ? '0' : '50%'};
        background: ${p.fabBg};
        border: 2px solid ${p.fabBorder};
        color: ${p.fabFg};
        font-size: 24px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.25s ease;
        box-shadow: ${p.fabShadow};
        font-family: ${p.font};
        padding: 0;
        line-height: 1;
        outline: none;
        position: relative;
      }
      .ca-fab-main:hover, .ca-fab-main:focus {
        transform: scale(1.1);
        box-shadow: ${p.hoverGlow};
        outline: 2px solid ${p.accent};
        outline-offset: 2px;
      }
      .ca-fab-main:active {
        transform: scale(0.95);
      }
      .ca-fab-main.ca-expanded {
        transform: rotate(45deg);
      }
      .ca-fab-main.ca-expanded:hover {
        transform: rotate(45deg) scale(1.1);
      }

      /* FAB Speed-dial items */
      .ca-fab-item {
        display: flex;
        align-items: center;
        gap: 10px;
        opacity: 0;
        transform: translateY(10px) scale(0.8);
        transition: all 0.2s ease;
        pointer-events: none;
        flex-direction: row-reverse;
      }
      .ca-fab-item.ca-visible {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }
      .ca-fab-item-btn {
        width: 42px;
        height: 42px;
        border-radius: ${_theme === 'gameboy' ? '0' : '50%'};
        background: ${p.fabBg};
        border: 2px solid ${p.fabBorder};
        color: ${p.fabFg};
        font-size: 18px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        box-shadow: ${p.fabShadow};
        padding: 0;
        line-height: 1;
        outline: none;
      }
      .ca-fab-item-btn:hover, .ca-fab-item-btn:focus {
        transform: scale(1.15);
        box-shadow: ${p.hoverGlow};
        outline: 2px solid ${p.accent};
        outline-offset: 2px;
      }
      .ca-fab-item-btn:active {
        transform: scale(0.9);
      }
      .ca-fab-label {
        background: ${p.bg};
        border: 1px solid ${p.border};
        border-radius: ${p.radius};
        color: ${p.fg};
        font-family: ${p.font};
        font-size: ${_theme === 'gameboy' ? '8px' : p.fontSize};
        padding: 4px 10px;
        white-space: nowrap;
        box-shadow: ${p.glow};
        opacity: 0.9;
      }

      /* FAB GameBoy pixel animation */
      ${_theme === 'gameboy' ? `
      .ca-fab-main {
        image-rendering: pixelated;
        box-shadow: 3px 3px 0px #0F380F, inset -1px -1px 0px #0F380F, inset 1px 1px 0px #8BAC0F;
      }
      .ca-fab-item-btn {
        box-shadow: 2px 2px 0px #0F380F, inset -1px -1px 0px #0F380F, inset 1px 1px 0px #8BAC0F;
      }
      ` : ''}

      /* FAB Cyberpunk glitch animation */
      ${_theme === 'cyberpunk' ? `
      @keyframes ca-glitch {
        0% { text-shadow: 2px 0 #FF0040, -2px 0 #00FFFF; }
        25% { text-shadow: -2px 0 #FF0040, 2px 0 #00FFFF; }
        50% { text-shadow: 1px 1px #FF0040, -1px -1px #00FFFF; }
        75% { text-shadow: -1px 1px #FF0040, 1px -1px #00FFFF; }
        100% { text-shadow: 0 0 #FF0040, 0 0 #00FFFF; }
      }
      .ca-fab-main.ca-expanded {
        animation: ca-glitch 0.3s ease;
      }
      .ca-fab-main {
        box-shadow: ${p.fabShadow}, inset 0 0 10px rgba(0, 255, 255, 0.1);
      }
      .ca-fab-main::before {
        content: '';
        position: absolute;
        inset: -2px;
        border-radius: 50%;
        background: conic-gradient(from 0deg, transparent, rgba(0, 255, 255, 0.3), transparent);
        animation: ca-cyber-spin 4s linear infinite;
        z-index: -1;
      }
      @keyframes ca-cyber-spin {
        to { transform: rotate(360deg); }
      }
      ` : ''}

      /* FAB Executive smooth slide-up */
      ${_theme === 'executive' ? `
      .ca-fab-main {
        background: linear-gradient(135deg, #2c3e50, #1c2833);
        border: 2px solid ${p.accent};
        box-shadow: 0 4px 20px rgba(201, 168, 76, 0.35);
      }
      .ca-fab-item-btn {
        background: linear-gradient(135deg, #2c3e50, #1c2833);
      }
      ` : ''}

      /* ── Visible Mission Input Bar ── */
      #ca-mission-prompt {
        position: fixed;
        top: 12px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10000;
        max-width: 480px;
        width: 80vw;
        cursor: pointer;
        transition: all 0.3s ease;
        opacity: 0.35;
      }
      #ca-mission-prompt:hover, #ca-mission-prompt:focus-within {
        opacity: 1;
        transform: translateX(-50%) translateY(1px);
      }
      .ca-prompt-bar {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 16px;
        background: ${p.bg};
        border: 1px solid ${p.border};
        border-radius: ${_theme === 'executive' ? '24px' : p.radius};
        font-family: ${p.font};
        font-size: ${_theme === 'gameboy' ? '8px' : '12px'};
        color: ${p.fgDim};
        box-shadow: ${p.glow};
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ca-prompt-bar:hover {
        border-color: ${p.accent};
        box-shadow: ${p.hoverGlow};
      }
      .ca-prompt-icon {
        font-size: 14px;
        flex-shrink: 0;
      }
      .ca-prompt-text {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ca-prompt-shortcut {
        opacity: 0.5;
        font-size: ${_theme === 'gameboy' ? '7px' : '10px'};
        flex-shrink: 0;
      }

      /* ── Help Toast ── */
      #ca-help-toast {
        position: fixed;
        bottom: 24px;
        left: 24px;
        z-index: 89999;
        background: ${p.bg};
        border: 1px solid ${p.border};
        border-radius: ${p.radius};
        padding: 10px 18px;
        font-family: ${p.font};
        font-size: ${_theme === 'gameboy' ? '8px' : '11px'};
        color: ${p.fg};
        box-shadow: ${p.glow};
        opacity: 0;
        transform: translateY(10px);
        transition: opacity 0.4s ease, transform 0.4s ease;
        cursor: pointer;
        max-width: 280px;
      }
      #ca-help-toast.ca-toast-visible {
        opacity: 1;
        transform: translateY(0);
      }
      #ca-help-toast.ca-toast-hiding {
        opacity: 0;
        transform: translateY(10px);
      }

      /* ── GameBoy HUD (replaces debug bar) ── */
      #ca-gameboy-hud {
        margin-top: 20px;
        max-width: 800px;
        width: 100%;
        background: #306230;
        border: 3px solid #8BAC0F;
        padding: 8px 16px;
        font-family: 'Press Start 2P', 'Monaco', monospace;
        font-size: 9px;
        color: #9BBB0F;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        box-shadow:
          inset -2px -2px 0px #0F380F,
          inset 2px 2px 0px #8BAC0F;
      }
      .ca-hud-item {
        display: flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
      }
      .ca-hud-item .ca-hud-icon {
        font-size: 11px;
      }
      .ca-hud-value {
        color: #9BBB0F;
      }
      .ca-hud-separator {
        color: #8BAC0F;
        opacity: 0.5;
      }

      /* ── Demo Button ── */
      .ca-demo-btn {
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
      .ca-demo-btn:hover, .ca-demo-btn:focus {
        background: ${p.bgAlt};
        transform: scale(1.1);
        outline: 2px solid ${p.accent};
        outline-offset: 1px;
      }
      .ca-demo-btn:active {
        transform: scale(0.95);
      }
      .ca-demo-btn[aria-label]::after {
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
      .ca-demo-btn:hover::after, .ca-demo-btn:focus::after {
        opacity: 1;
      }

      /* ── Clickable Agents (DOM themes) ── */
      .agent-card, .agent-avatar, .cyber-agent,
      .workstation, .agent.executive-suit,
      [data-agent], [data-role] {
        cursor: pointer !important;
        transition: box-shadow 0.2s ease, transform 0.2s ease !important;
      }
      .workstation:hover, .agent.executive-suit:hover,
      .agent-card:hover, .cyber-agent:hover,
      [data-agent]:hover, [data-role]:hover {
        box-shadow: ${p.hoverGlow} !important;
        transform: translateY(-2px);
      }
      .workstation:hover .agent-avatar,
      .agent.executive-suit:hover .agent-avatar {
        box-shadow: ${p.hoverGlow} !important;
      }

      /* ── Canvas Tooltip (GameBoy) ── */
      #ca-canvas-tooltip {
        position: absolute;
        z-index: 90001;
        background: #0F380F;
        border: 2px solid #8BAC0F;
        padding: 4px 8px;
        font-family: 'Press Start 2P', 'Monaco', monospace;
        font-size: 7px;
        color: #9BBB0F;
        pointer-events: none;
        white-space: nowrap;
        display: none;
        box-shadow: 2px 2px 0px rgba(0,0,0,0.3);
      }
      #ca-canvas-tooltip.ca-tt-visible {
        display: block;
      }

      /* ── Scoped focus outlines ── */
      .ca-fab-main:focus-visible,
      .ca-fab-item-btn:focus-visible,
      #ca-mission-prompt:focus-visible,
      .ca-demo-btn:focus-visible {
        outline: 2px solid ${p.accent};
        outline-offset: 2px;
      }
    `;

    document.head.appendChild(_styleEl);
  }

  // ══════════════════════════════════════════════════════════════
  //  1. FLOATING ACTION BUTTON (FAB)
  // ══════════════════════════════════════════════════════════════

  let _fabEl = null;
  let _fabItems = [];

  const FAB_ACTIONS = [
    { icon: '📝', label: 'New Mission', shortcut: 'X', action: () => triggerKey('x') },
    { icon: '🔍', label: 'Search',      shortcut: 'Q', action: () => triggerKey('q') },
    { icon: '📊', label: 'Stats',       shortcut: 'TAB', action: () => triggerKey('Tab') },
    { icon: '❓', label: 'Help',        shortcut: '?', action: () => triggerKey('?') },
  ];

  function buildFAB() {
    if (_fabEl) _fabEl.remove();

    _fabEl = document.createElement('div');
    _fabEl.id = 'ca-fab';
    _fabEl.setAttribute('role', 'toolbar');
    _fabEl.setAttribute('aria-label', 'Quick actions');

    // Main button
    const main = document.createElement('button');
    main.className = 'ca-fab-main';
    main.textContent = '+';
    main.setAttribute('aria-label', 'Open quick actions menu');
    main.setAttribute('aria-expanded', 'false');
    main.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFAB();
    });
    _fabEl.appendChild(main);

    // Speed-dial items
    _fabItems = [];
    FAB_ACTIONS.forEach((action, index) => {
      const item = document.createElement('div');
      item.className = 'ca-fab-item';
      item.style.transitionDelay = `${index * 0.04}s`;

      const btn = document.createElement('button');
      btn.className = 'ca-fab-item-btn';
      btn.textContent = action.icon;
      btn.setAttribute('aria-label', `${action.label} (${action.shortcut})`);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeFAB();
        action.action();
      });

      const label = document.createElement('span');
      label.className = 'ca-fab-label';
      label.textContent = `${action.label} (${action.shortcut})`;

      item.appendChild(btn);
      item.appendChild(label);
      _fabEl.appendChild(item);
      _fabItems.push(item);
    });

    document.body.appendChild(_fabEl);

    // Close FAB when clicking outside
    document.addEventListener('click', (e) => {
      if (_fabExpanded && _fabEl && !_fabEl.contains(e.target)) {
        closeFAB();
      }
    });
  }

  function toggleFAB() {
    _fabExpanded ? closeFAB() : openFAB();
  }

  function openFAB() {
    _fabExpanded = true;
    const main = _fabEl.querySelector('.ca-fab-main');
    main.classList.add('ca-expanded');
    main.setAttribute('aria-expanded', 'true');

    _fabItems.forEach((item, index) => {
      setTimeout(() => {
        item.classList.add('ca-visible');
      }, index * 50);
    });
  }

  function closeFAB() {
    _fabExpanded = false;
    const main = _fabEl.querySelector('.ca-fab-main');
    main.classList.remove('ca-expanded');
    main.setAttribute('aria-expanded', 'false');

    _fabItems.forEach(item => {
      item.classList.remove('ca-visible');
    });
  }

  /**
   * Simulate a keyboard shortcut by dispatching a KeyboardEvent.
   */
  function triggerKey(key) {
    // Use the existing handlers directly when available
    if (key === 'q' && window.OpenClawHelpers) {
      OpenClawHelpers.showQuickActions();
      return;
    }
    if (key === 'x' && window.OpenClawHelpers) {
      OpenClawHelpers.showMissionForm();
      return;
    }
    if (key === '?' && window.SpawnKitUX) {
      SpawnKitUX.showHelp();
      return;
    }
    if (key === 'Tab' && window.SpawnKitAchievements) {
      // TAB typically opens stats dashboard
      if (typeof SpawnKitAchievements.showStatsOverlay === 'function') {
        SpawnKitAchievements.showStatsOverlay();
        return;
      }
    }

    // Fallback: dispatch keyboard event
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: key,
      code: 'Key' + (key || '').toUpperCase(),
      bubbles: true,
      cancelable: true,
    }));
  }

  // ══════════════════════════════════════════════════════════════
  //  2. CLICKABLE AGENTS
  // ══════════════════════════════════════════════════════════════

  let _canvasTooltip = null;

  /**
   * Setup clickable agents for DOM-based themes (Cyberpunk, Executive).
   */
  function setupDOMAgentClicks() {
    if (_theme === 'gameboy') return; // GameBoy uses canvas

    // Target all agent-related elements
    const selectors = [
      '.workstation[data-agent]',
      '.agent.executive-suit[data-role]',
      '.agent.executive-suit[data-canonical]',
      '.agent-card[data-agent]',
      '.cyber-agent[data-agent]',
    ];

    const elements = document.querySelectorAll(selectors.join(', '));

    elements.forEach(el => {
      // Extract agent ID
      const agentId = el.dataset.agent || el.dataset.role || el.dataset.canonical;
      if (!agentId) return;

      el.style.cursor = 'pointer';

      // Click handler
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        openAgentDetail(agentId);
      });
    });

    // Also hook sub-agents
    const subSelectors = ['.sub-agent[data-role]', '.process-list .process-item'];
    document.querySelectorAll(subSelectors.join(', ')).forEach(el => {
      const role = el.dataset.role;
      if (role) {
        el.style.cursor = 'pointer';
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          openAgentDetail(role);
        });
      }
    });
  }

  /**
   * Setup clickable agents for GameBoy canvas.
   * Tracks mouse over the PixiJS canvas and maps to character positions.
   */
  function setupCanvasAgentClicks() {
    if (_theme !== 'gameboy') return;

    const container = document.getElementById('gameContainer');
    if (!container) return;

    // Wait for canvas to be available
    const canvas = container.querySelector('canvas');
    if (!canvas) {
      setTimeout(setupCanvasAgentClicks, 500);
      return;
    }

    // Create tooltip element
    if (!_canvasTooltip) {
      _canvasTooltip = document.createElement('div');
      _canvasTooltip.id = 'ca-canvas-tooltip';
      container.style.position = 'relative';
      container.appendChild(_canvasTooltip);
    }

    canvas.style.cursor = 'default';

    // Hover detection
    canvas.addEventListener('mousemove', (e) => {
      const char = findCharAtCanvasPos(e, canvas);
      if (char) {
        canvas.style.cursor = 'pointer';
        _canvasTooltip.textContent = `Click to see ${char.title || char.name}'s details`;
        _canvasTooltip.classList.add('ca-tt-visible');

        // Position tooltip near cursor
        const rect = container.getBoundingClientRect();
        _canvasTooltip.style.left = (e.clientX - rect.left + 12) + 'px';
        _canvasTooltip.style.top = (e.clientY - rect.top - 24) + 'px';
      } else {
        canvas.style.cursor = 'default';
        _canvasTooltip.classList.remove('ca-tt-visible');
      }
    });

    canvas.addEventListener('mouseleave', () => {
      if (_canvasTooltip) _canvasTooltip.classList.remove('ca-tt-visible');
      canvas.style.cursor = 'default';
    });

    // Click detection
    canvas.addEventListener('click', (e) => {
      const char = findCharAtCanvasPos(e, canvas);
      if (char) {
        openAgentDetail(char.canonicalId || char.name);
      }
    });
  }

  /**
   * Find a character near the given canvas coordinates.
   * Maps pixel position to the GameBoy character manager.
   */
  function findCharAtCanvasPos(event, canvas) {
    const office = window.gameboyOffice;
    if (!office?.characterManager) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const canvasX = (event.clientX - rect.left) * scaleX;
    const canvasY = (event.clientY - rect.top) * scaleY;

    // The character container is offset: centered horizontally, y=180
    const charContainerX = office?.characterContainer?.x ?? (canvas.width / 2);
    const charContainerY = office?.characterContainer?.y ?? 180;

    // Characters' screenX/Y are relative to the character container
    const chars = office?.characterManager?.characters || [];
    const hitRadius = 20; // Pixel hit radius around each character

    let closest = null;
    let closestDist = Infinity;

    for (const char of chars) {
      const charScreenX = charContainerX + (char?.screenX || 0);
      const charScreenY = charContainerY + (char?.screenY || 0);

      const dx = canvasX - charScreenX;
      const dy = canvasY - charScreenY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < hitRadius && dist < closestDist) {
        closest = char;
        closestDist = dist;
      }
    }

    // Also check sub-agents
    const subs = office?.characterManager?.subAgents || [];
    for (const sub of subs) {
      const subScreenX = charContainerX + (sub?.screenX || 0);
      const subScreenY = charContainerY + (sub?.screenY || 0);

      const dx = canvasX - subScreenX;
      const dy = canvasY - subScreenY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < hitRadius && dist < closestDist) {
        closest = sub;
        closestDist = dist;
      }
    }

    return closest;
  }

  /**
   * Open agent detail card using OpenClawHelpers.
   */
  function openAgentDetail(agentId) {
    if (window.OpenClawHelpers?.showAgentDetail && typeof OpenClawHelpers.showAgentDetail === 'function') {
      // Try to find the full agent object from SpawnKit data
      let agentObj = null;
      if (typeof SpawnKit !== 'undefined' && SpawnKit?.data?.agents) {
        agentObj = (SpawnKit.data.agents || []).find(a =>
          a?.id === agentId ||
          a?.name?.toLowerCase() === (agentId || '').toLowerCase() ||
          a?.canonical === agentId
        );
      }
      OpenClawHelpers.showAgentDetail(agentObj || agentId);
    } else {
      console.log('[ClickAffordances] Agent detail:', agentId);
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  3. VISIBLE MISSION INPUT
  // ══════════════════════════════════════════════════════════════

  let _promptEl = null;

  function buildMissionPrompt() {
    if (_promptEl) _promptEl.remove();

    _promptEl = document.createElement('div');
    _promptEl.id = 'ca-mission-prompt';
    _promptEl.setAttribute('role', 'button');
    _promptEl.setAttribute('aria-label', 'Open mission input — press Q or click here');
    _promptEl.tabIndex = 0;

    const bar = document.createElement('div');
    bar.className = 'ca-prompt-bar';

    const icon = document.createElement('span');
    icon.className = 'ca-prompt-icon';
    icon.textContent = '💬';

    const text = document.createElement('span');
    text.className = 'ca-prompt-text';
    text.textContent = 'What should your team work on?';

    const shortcut = document.createElement('span');
    shortcut.className = 'ca-prompt-shortcut';
    shortcut.textContent = 'Q';

    bar.appendChild(icon);
    bar.appendChild(text);
    bar.appendChild(shortcut);
    _promptEl.appendChild(bar);

    _promptEl.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerKey('q');
    });

    _promptEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        triggerKey('q');
      }
    });

    document.body.appendChild(_promptEl);
  }

  // ══════════════════════════════════════════════════════════════
  //  4. HELP TOAST (first visit)
  // ══════════════════════════════════════════════════════════════

  const HELP_TOAST_KEY = 'spawnkit-help-toast-shown';

  function showHelpToast() {
    if (localStorage.getItem(HELP_TOAST_KEY)) return;

    // Wait for boot/onboarding to finish
    const delay = localStorage.getItem('spawnkit-onboarded') ? 2000 : 8000;

    setTimeout(() => {
      // Double-check no modal is open
      if (window.OpenClawHelpers && OpenClawHelpers.isAnyPanelOpen && OpenClawHelpers.isAnyPanelOpen()) {
        // Retry in 3s
        setTimeout(showHelpToast, 3000);
        return;
      }

      const toast = document.createElement('div');
      toast.id = 'ca-help-toast';
      toast.textContent = '💡 Press ? for keyboard shortcuts';
      toast.setAttribute('role', 'alert');

      toast.addEventListener('click', () => {
        dismissHelpToast(toast);
        triggerKey('?');
      });

      document.body.appendChild(toast);

      // Animate in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          toast.classList.add('ca-toast-visible');
        });
      });

      // Auto-dismiss after 8 seconds
      setTimeout(() => {
        dismissHelpToast(toast);
      }, 8000);
    }, delay);
  }

  function dismissHelpToast(toast) {
    if (!toast || !toast.parentNode) return;
    localStorage.setItem(HELP_TOAST_KEY, 'true');
    toast.classList.remove('ca-toast-visible');
    toast.classList.add('ca-toast-hiding');
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 400);
  }

  // ══════════════════════════════════════════════════════════════
  //  5. GAMEBOY HUD (replaces debug bar)
  // ══════════════════════════════════════════════════════════════

  let _hudEl = null;
  let _hudInterval = null;

  function replaceDebugBar() {
    if (_theme !== 'gameboy') return;

    const debugInfo = document.getElementById('debugInfo');
    if (!debugInfo) return;

    // Hide the debug bar
    debugInfo.style.display = 'none';

    // Create HUD
    _hudEl = document.createElement('div');
    _hudEl.id = 'ca-gameboy-hud';
    _hudEl.setAttribute('role', 'status');
    _hudEl.setAttribute('aria-label', 'Game status');

    // Insert after debugInfo's parent position
    debugInfo.parentNode.insertBefore(_hudEl, debugInfo.nextSibling);

    // Initial render
    updateHUD();

    // Update every 2 seconds
    _hudInterval = setInterval(updateHUD, 2000);
  }

  function updateHUD() {
    if (!_hudEl) return;

    // Gather data
    const level = getPlayerLevel();
    const quests = getActiveQuestCount();
    const points = getTotalPoints();
    const streak = getCurrentStreak();

    _hudEl.innerHTML = `
      <div class="ca-hud-item">
        <span class="ca-hud-icon">🎮</span>
        <span class="ca-hud-value">LV.${level}</span>
      </div>
      <span class="ca-hud-separator">│</span>
      <div class="ca-hud-item">
        <span class="ca-hud-icon">⚡</span>
        <span class="ca-hud-value">${quests} QUEST${quests !== 1 ? 'S' : ''}</span>
      </div>
      <span class="ca-hud-separator">│</span>
      <div class="ca-hud-item">
        <span class="ca-hud-icon">🏆</span>
        <span class="ca-hud-value">${points}pts</span>
      </div>
      <span class="ca-hud-separator">│</span>
      <div class="ca-hud-item">
        <span class="ca-hud-icon">🔥</span>
        <span class="ca-hud-value">${streak} streak</span>
      </div>
    `;
  }

  function getPlayerLevel() {
    const points = getTotalPoints();
    // Level formula: every 50 points = 1 level, minimum 1
    return Math.max(1, Math.floor(points / 50) + 1);
  }

  function getActiveQuestCount() {
    // From SpawnKit data
    if (typeof SpawnKit !== 'undefined' && SpawnKit?.data?.missions) {
      return (SpawnKit.data.missions || []).filter(m =>
        m?.status === 'running' || m?.status === 'active' || m?.status === 'pending'
      ).length;
    }
    // From MissionController
    if (typeof MissionController !== 'undefined' && MissionController?.missions) {
      return (MissionController.missions || []).filter(m => m?.status !== 'completed').length;
    }
    // From GameBoy state bridge
    if (window.gameboyOffice?.stateBridge) {
      const status = window.gameboyOffice?.stateBridge?.getMissionStatus?.();
      if (status) {
        return (status?.active || 0) + (status?.queued || 0);
      }
    }
    return 0;
  }

  function getTotalPoints() {
    if (typeof SpawnKitAchievements !== 'undefined' && SpawnKitAchievements?.getStats) {
      const stats = SpawnKitAchievements.getStats();
      if (stats && typeof stats?.totalPoints === 'number') return stats.totalPoints;
      if (stats && typeof stats?.points === 'number') return stats.points;
    }
    // Fallback: count from localStorage
    try {
      const unlocked = JSON.parse(localStorage.getItem('spawnkit-achievements-unlocked') || '[]');
      return unlocked.length * 20; // Rough estimate
    } catch { return 0; }
  }

  function getCurrentStreak() {
    if (typeof SpawnKitAchievements !== 'undefined' && SpawnKitAchievements?.getStats) {
      const stats = SpawnKitAchievements.getStats();
      if (stats && typeof stats?.streak === 'number') return stats.streak;
      if (stats && typeof stats?.currentStreak === 'number') return stats.currentStreak;
    }
    try {
      const stats = JSON.parse(localStorage.getItem('spawnkit-achievements-stats') || '{}');
      return stats?.streak || stats?.currentStreak || 0;
    } catch { return 0; }
  }

  // ══════════════════════════════════════════════════════════════
  //  6. DEMO MODE BUTTON
  // ══════════════════════════════════════════════════════════════

  let _demoBtn = null;

  function addDemoButton() {
    // Find the nav bar from ux-layer.js
    const nav = document.getElementById('fk-nav');
    if (!nav) {
      // Retry after nav is built
      setTimeout(addDemoButton, 1000);
      return;
    }

    // Don't add duplicate
    if (document.getElementById('ca-demo-btn')) return;

    _demoBtn = document.createElement('button');
    _demoBtn.id = 'ca-demo-btn';
    _demoBtn.className = 'ca-demo-btn';
    _demoBtn.textContent = '▶';
    _demoBtn.setAttribute('aria-label', 'Watch Demo');
    _demoBtn.title = 'Watch your team in action';

    _demoBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      startDemo();
    });

    // Insert before the first child (leftmost position)
    nav.insertBefore(_demoBtn, nav.firstChild);

    // Check visibility periodically
    checkDemoVisibility();
    setInterval(checkDemoVisibility, 5000);
  }

  function startDemo() {
    if (typeof MissionController !== 'undefined' && typeof MissionController?.demo === 'function') {
      MissionController.demo();
      if (_demoBtn) _demoBtn.textContent = '⏸';
    } else if (window.gameboyOffice?.triggerMeeting) {
      // Fallback: trigger some GameBoy activity
      window.gameboyOffice?.triggerMeeting?.();
      setTimeout(() => window.gameboyOffice?.triggerCelebration?.(), 4000);
    } else {
      // Show a toast about demo
      if (window.OpenClawHelpers?.showToast) {
        OpenClawHelpers.showToast('🎬 Demo mode not available yet');
      }
    }
  }

  function checkDemoVisibility() {
    if (!_demoBtn) return;

    // Show only when idle (no active missions)
    const quests = getActiveQuestCount();
    const isRunning = typeof MissionController !== 'undefined' &&
                      MissionController?._demoRunning;

    if (quests > 0 || isRunning) {
      _demoBtn.style.display = 'none';
    } else {
      _demoBtn.style.display = '';
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  INIT
  // ══════════════════════════════════════════════════════════════

  function init(opts = {}) {
    if (_initialized) return;
    _initialized = true;

    _theme = opts.theme || detectTheme();

    // 1. Inject styles
    injectStyles();

    // 2. Build FAB
    buildFAB();

    // 3. Build mission prompt bar
    buildMissionPrompt();

    // 4. Setup clickable agents (DOM)
    // Slight delay to ensure DOM is ready
    setTimeout(() => {
      setupDOMAgentClicks();
      setupCanvasAgentClicks();
    }, 500);

    // 5. Replace GameBoy debug bar with HUD
    replaceDebugBar();

    // 6. Add demo button to nav
    addDemoButton();

    // 7. Help toast (first visit)
    showHelpToast();

    // 8. Re-setup agent clicks when new agents appear (mutation observer)
    observeNewAgents();

    console.log(`[ClickAffordances] Initialized (theme: ${_theme})`);
  }

  /**
   * Watch for dynamically added agent elements and make them clickable.
   */
  function observeNewAgents() {
    if (_theme === 'gameboy') return; // Canvas doesn't need this

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.dataset && (node.dataset.agent || node.dataset.role)) {
            const agentId = node.dataset.agent || node.dataset.role;
            node.style.cursor = 'pointer';
            node.addEventListener('click', (e) => {
              e.stopPropagation();
              openAgentDetail(agentId);
            });
          }
          // Check children
          if (node.querySelectorAll) {
            node.querySelectorAll('[data-agent], [data-role]').forEach(el => {
              const aid = el.dataset.agent || el.dataset.role;
              if (aid) {
                el.style.cursor = 'pointer';
                el.addEventListener('click', (e) => {
                  e.stopPropagation();
                  openAgentDetail(aid);
                });
              }
            });
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ══════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ══════════════════════════════════════════════════════════════

  return {
    init,

    /** Refresh theme (e.g. after theme switch). */
    refreshTheme(newTheme) {
      if (newTheme) _theme = newTheme;
      injectStyles();
      if (_hudEl) updateHUD();
    },

    /** Manually toggle FAB. */
    toggleFAB,
    openFAB,
    closeFAB,

    /** Manually trigger HUD update. */
    updateHUD,

    /** Get current theme. */
    get theme() { return _theme; },
    get initialized() { return _initialized; },
  };
})();

// ══════════════════════════════════════════════════════════════
//  AUTO-INIT
// ══════════════════════════════════════════════════════════════
// Self-initializes when DOM is ready (or immediately if already ready).
// Themes don't need to explicitly call init() — it Just Works™.

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Small delay to let other modules init first
    setTimeout(() => ClickAffordances.init(), 300);
  });
} else {
  setTimeout(() => ClickAffordances.init(), 300);
}
