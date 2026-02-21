/**
 * SpawnKit v2 — OpenClaw Integration Layer (Helpers)
 * ════════════════════════════════════════════════════
 *
 * Makes SpawnKit feel like the BEST OpenClaw frontend ever.
 * Surfaces all OpenClaw power through beautiful, intuitive UX.
 *
 * Features:
 *   1. Quick Actions Panel (Q key) — Spotlight/Raycast-style command palette
 *   2. Enhanced Mission Input (X key) — Beautiful mission creation form
 *   3. Agent Detail Cards — Click on any agent for full details
 *   4. Status Bar — Always-visible bottom bar with live stats
 *   5. Contextual Tooltips — Hover help for all interactive elements
 *   6. Welcome Messages — Time-based greetings on load
 *
 * Dependencies: SpawnKit (data-bridge.js), SpawnKitNames (theme-names.js)
 * Optional: MissionController (mission-controller.js)
 *
 * Pure JS, file:// compatible, no external dependencies.
 *
 * @author Forge (CTO) ⚒️
 * @version 1.0.0
 */

window.OpenClawHelpers = (() => {
  'use strict';

  // ══════════════════════════════════════════════════════════════
  //  STATE
  // ══════════════════════════════════════════════════════════════

  let _theme = 'gameboy';
  let _initialized = false;
  let _styleEl = null;

  // Panel states
  let _quickActionsVisible = false;
  let _missionFormVisible = false;
  let _agentDetailVisible = false;
  let _selectedActionIndex = 0;
  let _filteredActions = [];

  // DOM refs
  let _quickActionsEl = null;
  let _missionFormEl = null;
  let _agentDetailEl = null;
  let _statusBarEl = null;
  let _welcomeEl = null;
  let _tooltipEl = null;

  // Timers
  let _statusBarInterval = null;
  let _welcomeTimeout = null;

  // ══════════════════════════════════════════════════════════════
  //  THEME PALETTES (mirrored from ux-layer for consistency)
  // ══════════════════════════════════════════════════════════════

  const PALETTES = {
    gameboy: {
      bg:        '#0F380F',
      bgAlt:     '#306230',
      bgPanel:   '#1a4a1a',
      fg:        '#9BBB0F',
      fgDim:     '#8BAC0F',
      fgMuted:   '#5a7a0a',
      accent:    '#9BBB0F',
      accentAlt: '#c5d63a',
      border:    '#8BAC0F',
      danger:    '#FF6B6B',
      warning:   '#FFD93D',
      success:   '#9BBB0F',
      overlay:   'rgba(15, 56, 15, 0.96)',
      font:      "'Press Start 2P', 'Monaco', monospace",
      fontSize:  '10px',
      titleSize: '12px',
      radius:    '0px',
      glow:      'none',
      inputBg:   '#0a2a0a',
    },
    cyberpunk: {
      bg:        '#0a0a0f',
      bgAlt:     '#121225',
      bgPanel:   '#0f0f1f',
      fg:        '#00FF41',
      fgDim:     '#00cc33',
      fgMuted:   '#007722',
      accent:    '#00FFFF',
      accentAlt: '#FF00FF',
      border:    '#00FFFF',
      danger:    '#FF0055',
      warning:   '#FFD700',
      success:   '#00FF41',
      overlay:   'rgba(10, 10, 15, 0.97)',
      font:      "'JetBrains Mono', 'Courier New', monospace",
      fontSize:  '12px',
      titleSize: '14px',
      radius:    '2px',
      glow:      '0 0 8px rgba(0, 255, 255, 0.4)',
      inputBg:   '#050510',
    },
    executive: {
      bg:        '#1c2833',
      bgAlt:     '#2c3e50',
      bgPanel:   '#243342',
      fg:        '#f5f5dc',
      fgDim:     '#c9a84c',
      fgMuted:   '#8a7a4a',
      accent:    '#c9a84c',
      accentAlt: '#e8c84c',
      border:    '#c9a84c',
      danger:    '#e74c3c',
      warning:   '#f39c12',
      success:   '#2ecc71',
      overlay:   'rgba(28, 40, 51, 0.97)',
      font:      "'Georgia', 'Times New Roman', serif",
      fontSize:  '13px',
      titleSize: '15px',
      radius:    '8px',
      glow:      '0 0 12px rgba(201, 168, 76, 0.25)',
      inputBg:   '#162029',
    }
  };

  function P() { return PALETTES[_theme] || PALETTES.gameboy; }

  // ══════════════════════════════════════════════════════════════
  //  QUICK ACTIONS DEFINITIONS
  // ══════════════════════════════════════════════════════════════

  const QUICK_ACTIONS = [
    {
      id: 'mission',
      icon: '🚀',
      label: 'Send a mission to the team',
      keywords: ['mission', 'task', 'send', 'do', 'build', 'create', 'make', 'fix', 'deploy'],
      action: () => { closeQuickActions(); showMissionForm(); }
    },
    {
      id: 'schedule',
      icon: '⏰',
      label: 'Schedule a reminder or task',
      keywords: ['schedule', 'remind', 'reminder', 'cron', 'timer', 'alarm', 'every', 'daily', 'weekly'],
      action: () => { closeQuickActions(); handleScheduleAction(); }
    },
    {
      id: 'status',
      icon: '📊',
      label: 'Check team status',
      keywords: ['status', 'check', 'agents', 'team', 'who', 'online', 'active'],
      action: () => { closeQuickActions(); showTeamStatusPanel(); }
    },
    {
      id: 'memory',
      icon: '🧠',
      label: 'View team knowledge base',
      keywords: ['memory', 'knowledge', 'remember', 'yesterday', 'history', 'discuss', 'context', 'what'],
      action: () => { closeQuickActions(); handleMemoryAction(); }
    },
    {
      id: 'search',
      icon: '🔍',
      label: 'Search the web',
      keywords: ['search', 'google', 'find', 'look', 'web', 'browse', 'research'],
      action: () => { closeQuickActions(); handleSearchAction(); }
    },
    {
      id: 'email',
      icon: '📧',
      label: 'Check email & calendar',
      keywords: ['email', 'mail', 'calendar', 'inbox', 'meeting', 'event', 'urgent'],
      action: () => { closeQuickActions(); handleEmailAction(); }
    },
    {
      id: 'subagent',
      icon: '👥',
      label: 'Spawn a helper for a task',
      keywords: ['spawn', 'helper', 'assistant', 'subagent', 'sub-agent', 'new', 'hire'],
      action: () => { closeQuickActions(); handleSubagentAction(); }
    }
  ];

  // ══════════════════════════════════════════════════════════════
  //  CONTEXTUAL EXAMPLES (time-based)
  // ══════════════════════════════════════════════════════════════

  function getTimeOfDay() {
    const h = new Date().getHours();
    if (h >= 6 && h < 12) return 'morning';
    if (h >= 12 && h < 18) return 'afternoon';
    if (h >= 18 && h < 24) return 'evening';
    return 'night';
  }

  const EXAMPLES = {
    morning: [
      'Build a landing page for our product',
      'Check if there are urgent emails',
      'What\'s on the calendar today?',
      'Review yesterday\'s progress',
      'Run the morning security scan',
    ],
    afternoon: [
      'Remind me at 5pm to review PRs',
      'Search for AI agent competitors',
      'Deploy the latest changes to staging',
      'Summarize today\'s team activity',
      'Create a status report',
    ],
    evening: [
      'What did we accomplish today?',
      'Schedule a backup for tonight',
      'Research market trends for tomorrow',
      'Optimize the database queries',
      'Write documentation for the API',
    ],
    night: [
      'Run the full test suite',
      'Analyze server performance logs',
      'Prepare the morning briefing',
      'Scan for security vulnerabilities',
      'Clean up old deployments',
    ]
  };

  // ══════════════════════════════════════════════════════════════
  //  AGENT KEYWORD MATCHING (for auto-suggest)
  // ══════════════════════════════════════════════════════════════

  const AGENT_KEYWORDS = {
    hunter: ['revenue', 'sales', 'pipeline', 'deal', 'money', 'price', 'pricing', 'payment', 'stripe', 'subscription', 'business', 'market', 'growth', 'analytics'],
    forge:  ['code', 'build', 'fix', 'bug', 'deploy', 'api', 'database', 'server', 'frontend', 'backend', 'performance', 'architecture', 'landing page', 'website', 'app', 'feature', 'tech'],
    echo:   ['content', 'blog', 'social', 'tweet', 'post', 'marketing', 'brand', 'copy', 'write', 'story', 'campaign', 'design', 'landing page', 'email campaign', 'launch'],
    atlas:  ['organize', 'document', 'process', 'system', 'plan', 'schedule', 'report', 'summary', 'status', 'ops', 'workflow', 'project'],
    sentinel: ['security', 'audit', 'scan', 'vulnerability', 'backup', 'encrypt', 'protect', 'monitor', 'compliance', 'check'],
  };

  function suggestAgents(text) {
    if (!text) return [];
    const lower = text.toLowerCase();
    const scores = {};

    for (const [agentId, keywords] of Object.entries(AGENT_KEYWORDS)) {
      let score = 0;
      for (const kw of keywords) {
        if (lower.includes(kw)) score += kw.length; // longer matches = better
      }
      if (score > 0) scores[agentId] = score;
    }

    // Sort by score descending, return agent IDs
    return Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);
  }

  // ══════════════════════════════════════════════════════════════
  //  FUZZY SEARCH
  // ══════════════════════════════════════════════════════════════

  function fuzzyMatch(query, text) {
    if (!query) return true;
    if (!text) return false;
    const q = query.toLowerCase();
    const t = text.toLowerCase();

    // Direct substring match
    if (t.includes(q)) return true;

    // Fuzzy: all chars in order
    let qi = 0;
    for (let i = 0; i < t.length && qi < q.length; i++) {
      if (t[i] === q[qi]) qi++;
    }
    return qi === q.length;
  }

  function filterActions(query) {
    if (!query || !query.trim()) return QUICK_ACTIONS;

    return QUICK_ACTIONS.filter(action => {
      if (fuzzyMatch(query, action.label)) return true;
      return action.keywords.some(kw => fuzzyMatch(query, kw));
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  STYLES INJECTION
  // ══════════════════════════════════════════════════════════════

  function injectStyles() {
    if (_styleEl) _styleEl.remove();
    _styleEl = document.createElement('style');
    _styleEl.id = 'openclaw-helpers-styles';

    const p = P();
    const isGameboy = _theme === 'gameboy';
    const isCyber = _theme === 'cyberpunk';

    _styleEl.textContent = `
      /* ═══ OpenClaw Helpers Styles ═══ */

      /* ── Overlay base ── */
      .oc-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: ${p.overlay};
        z-index: 110000;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: min(15vh, 120px);
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s ease, visibility 0.2s ease;
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
      }
      .oc-overlay.oc-visible {
        opacity: 1;
        visibility: visible;
      }

      /* ── Panel base ── */
      .oc-panel {
        background: ${p.bg};
        border: 2px solid ${p.border};
        border-radius: ${p.radius};
        box-shadow: ${p.glow}, 0 8px 32px rgba(0,0,0,0.5);
        padding: 0;
        max-width: 520px;
        width: 92vw;
        max-height: 75vh;
        overflow: hidden;
        font-family: ${p.font};
        font-size: ${p.fontSize};
        color: ${p.fg};
        animation: oc-panel-enter 0.2s ease-out;
        display: flex;
        flex-direction: column;
      }
      @keyframes oc-panel-enter {
        0% { opacity: 0; transform: translateY(-12px) scale(0.97); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }

      .oc-panel-header {
        padding: 16px 20px 12px;
        border-bottom: 1px solid ${p.border}40;
      }
      .oc-panel-title {
        font-size: ${p.titleSize};
        color: ${p.accent};
        margin: 0 0 10px 0;
        letter-spacing: ${isGameboy ? '2px' : '1px'};
        ${isCyber ? 'text-shadow: 0 0 10px ' + p.accent + '60;' : ''}
      }
      .oc-panel-body {
        padding: 8px 20px 16px;
        overflow-y: auto;
        flex: 1;
        min-height: 0;
      }

      /* ── Search input ── */
      .oc-search-wrap {
        position: relative;
      }
      .oc-search-icon {
        position: absolute;
        left: 10px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 14px;
        opacity: 0.5;
        pointer-events: none;
      }
      .oc-search-input {
        width: 100%;
        padding: 10px 12px 10px 34px;
        background: ${p.inputBg};
        border: 1px solid ${p.border}80;
        border-radius: ${p.radius};
        color: ${p.fg};
        font-family: ${p.font};
        font-size: ${p.fontSize};
        outline: none;
        box-sizing: border-box;
        transition: border-color 0.2s;
      }
      .oc-search-input:focus {
        border-color: ${p.accent};
        ${isCyber ? 'box-shadow: 0 0 12px ' + p.accent + '40;' : ''}
      }
      .oc-search-input::placeholder {
        color: ${p.fgMuted};
        opacity: 0.7;
      }

      /* ── Action list ── */
      .oc-section-label {
        font-size: calc(${p.fontSize} - 1px);
        color: ${p.fgMuted};
        letter-spacing: ${isGameboy ? '2px' : '1px'};
        text-transform: uppercase;
        margin: 12px 0 6px;
        padding: 0 4px;
      }
      .oc-action-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        border-radius: ${p.radius === '0px' ? '0' : '6'}px;
        cursor: pointer;
        transition: background 0.12s, transform 0.12s;
        user-select: none;
        -webkit-user-select: none;
      }
      .oc-action-item:hover,
      .oc-action-item.oc-selected {
        background: ${p.bgAlt};
        ${isCyber ? 'box-shadow: inset 2px 0 0 ' + p.accent + ';' : ''}
      }
      .oc-action-item.oc-selected {
        background: ${p.bgAlt};
        outline: 1px solid ${p.border}60;
      }
      .oc-action-icon {
        font-size: 16px;
        width: 24px;
        text-align: center;
        flex-shrink: 0;
      }
      .oc-action-label {
        flex: 1;
        color: ${p.fg};
      }
      .oc-action-hint {
        font-size: calc(${p.fontSize} - 2px);
        color: ${p.fgMuted};
        opacity: 0.6;
      }

      /* ── Examples ── */
      .oc-example-item {
        padding: 5px 10px;
        color: ${p.fgDim};
        font-size: calc(${p.fontSize} - 1px);
        opacity: 0.7;
        cursor: pointer;
        border-radius: ${p.radius === '0px' ? '0' : '4'}px;
        transition: opacity 0.15s, background 0.15s;
      }
      .oc-example-item:hover {
        opacity: 1;
        background: ${p.bgAlt}60;
      }
      .oc-example-item::before {
        content: '"';
        color: ${p.fgMuted};
      }
      .oc-example-item::after {
        content: '"';
        color: ${p.fgMuted};
      }

      /* ── Shortcuts footer ── */
      .oc-shortcuts-bar {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
        padding: 10px 20px;
        border-top: 1px solid ${p.border}30;
        background: ${p.bgAlt}40;
      }
      .oc-shortcut-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: calc(${p.fontSize} - 2px);
        color: ${p.fgMuted};
      }
      .oc-key-badge {
        display: inline-block;
        background: ${p.bgAlt};
        border: 1px solid ${p.border}60;
        border-radius: 3px;
        padding: 1px 5px;
        font-family: ${p.font};
        font-size: calc(${p.fontSize} - 2px);
        color: ${p.accent};
        min-width: 20px;
        text-align: center;
      }

      /* ── Mission form ── */
      .oc-textarea {
        width: 100%;
        min-height: 80px;
        padding: 10px 12px;
        background: ${p.inputBg};
        border: 1px solid ${p.border}80;
        border-radius: ${p.radius};
        color: ${p.fg};
        font-family: ${p.font};
        font-size: ${p.fontSize};
        line-height: 1.6;
        outline: none;
        resize: vertical;
        box-sizing: border-box;
        transition: border-color 0.2s;
      }
      .oc-textarea:focus {
        border-color: ${p.accent};
        ${isCyber ? 'box-shadow: 0 0 12px ' + p.accent + '40;' : ''}
      }
      .oc-textarea::placeholder {
        color: ${p.fgMuted};
        opacity: 0.6;
      }

      .oc-form-label {
        font-size: calc(${p.fontSize} - 1px);
        color: ${p.fgDim};
        margin: 14px 0 6px;
        display: block;
      }

      /* Priority selector */
      .oc-priority-row {
        display: flex;
        gap: 8px;
        margin: 6px 0;
      }
      .oc-priority-btn {
        flex: 1;
        padding: 8px 4px;
        border: 1px solid ${p.border}60;
        border-radius: ${p.radius === '0px' ? '0' : '6'}px;
        background: ${p.bgAlt}40;
        color: ${p.fgDim};
        font-family: ${p.font};
        font-size: calc(${p.fontSize} - 1px);
        cursor: pointer;
        text-align: center;
        transition: all 0.15s;
      }
      .oc-priority-btn:hover {
        background: ${p.bgAlt};
      }
      .oc-priority-btn.oc-active {
        border-color: currentColor;
        font-weight: bold;
      }
      .oc-priority-btn[data-priority="normal"].oc-active {
        color: ${p.success};
        border-color: ${p.success};
        background: ${p.success}18;
      }
      .oc-priority-btn[data-priority="high"].oc-active {
        color: ${p.warning};
        border-color: ${p.warning};
        background: ${p.warning}18;
      }
      .oc-priority-btn[data-priority="urgent"].oc-active {
        color: ${p.danger};
        border-color: ${p.danger};
        background: ${p.danger}18;
      }

      /* Agent checkboxes */
      .oc-agents-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin: 6px 0;
      }
      .oc-agent-chip {
        padding: 6px 10px;
        border: 1px solid ${p.border}50;
        border-radius: ${p.radius === '0px' ? '0' : '20'}px;
        background: ${p.bgAlt}30;
        color: ${p.fgDim};
        font-family: ${p.font};
        font-size: calc(${p.fontSize} - 1px);
        cursor: pointer;
        transition: all 0.15s;
        user-select: none;
        -webkit-user-select: none;
      }
      .oc-agent-chip:hover {
        background: ${p.bgAlt};
      }
      .oc-agent-chip.oc-selected {
        background: ${p.accent}25;
        border-color: ${p.accent};
        color: ${p.accent};
      }
      .oc-agent-chip.oc-suggested {
        border-color: ${p.accentAlt}80;
        box-shadow: 0 0 4px ${p.accentAlt}30;
      }

      /* Buttons */
      .oc-btn-row {
        display: flex;
        gap: 10px;
        margin-top: 16px;
        justify-content: flex-end;
      }
      .oc-btn {
        padding: 10px 20px;
        border: 1px solid ${p.border};
        border-radius: ${p.radius};
        font-family: ${p.font};
        font-size: ${p.fontSize};
        cursor: pointer;
        transition: all 0.15s;
      }
      .oc-btn-primary {
        background: ${p.accent};
        color: ${p.bg};
        border-color: ${p.accent};
        font-weight: bold;
      }
      .oc-btn-primary:hover {
        opacity: 0.9;
        transform: translateY(-1px);
        ${isCyber ? 'box-shadow: 0 0 16px ' + p.accent + '50;' : ''}
      }
      .oc-btn-secondary {
        background: transparent;
        color: ${p.fgDim};
        border-color: ${p.border}60;
      }
      .oc-btn-secondary:hover {
        background: ${p.bgAlt};
        color: ${p.fg};
      }

      /* ── Agent detail card ── */
      .oc-agent-detail {
        max-width: 440px;
      }
      .oc-agent-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
      }
      .oc-agent-avatar {
        font-size: 28px;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${p.bgAlt};
        border-radius: ${p.radius === '0px' ? '0' : '50%'};
        border: 2px solid ${p.border}60;
      }
      .oc-agent-info h3 {
        margin: 0;
        color: ${p.accent};
        font-size: ${p.titleSize};
        ${isCyber ? 'text-shadow: 0 0 8px ' + p.accent + '50;' : ''}
      }
      .oc-agent-info .oc-agent-role {
        color: ${p.fgDim};
        font-size: calc(${p.fontSize} - 1px);
        margin-top: 2px;
      }
      .oc-status-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: calc(${p.fontSize} - 2px);
        background: ${p.success}20;
        color: ${p.success};
        border: 1px solid ${p.success}40;
      }
      .oc-status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
        animation: oc-pulse 2s ease-in-out infinite;
      }
      @keyframes oc-pulse {
        0%, 100% { opacity: 0.5; }
        50% { opacity: 1; }
      }

      .oc-stat-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px 16px;
        margin: 10px 0;
      }
      .oc-stat-item {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        font-size: calc(${p.fontSize} - 1px);
      }
      .oc-stat-label {
        color: ${p.fgMuted};
      }
      .oc-stat-value {
        color: ${p.fg};
        font-weight: bold;
      }

      .oc-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin: 8px 0;
      }
      .oc-tag {
        padding: 2px 8px;
        border-radius: ${p.radius === '0px' ? '0' : '12'}px;
        background: ${p.bgAlt};
        color: ${p.accent};
        font-size: calc(${p.fontSize} - 2px);
        border: 1px solid ${p.border}30;
      }

      .oc-task-display {
        padding: 8px 12px;
        background: ${p.inputBg};
        border-left: 3px solid ${p.accent};
        border-radius: 0 ${p.radius} ${p.radius} 0;
        color: ${p.fgDim};
        font-style: italic;
        margin: 8px 0;
        font-size: calc(${p.fontSize} - 1px);
        line-height: 1.5;
      }

      .oc-last-msg {
        padding: 8px 12px;
        background: ${p.bgAlt}40;
        border-radius: ${p.radius};
        color: ${p.fgDim};
        font-size: calc(${p.fontSize} - 1px);
        line-height: 1.5;
        margin: 8px 0;
      }

      .oc-divider {
        height: 1px;
        background: ${p.border}30;
        margin: 12px 0;
      }

      /* ── Status bar ── */
      #oc-status-bar {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 100001;
        background: ${p.bg}F0;
        border-top: 1px solid ${p.border}40;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 5px 16px;
        font-family: ${p.font};
        font-size: calc(${p.fontSize} - 2px);
        color: ${p.fgDim};
        opacity: 0.6;
        transition: opacity 0.3s;
        ${isCyber ? 'text-shadow: 0 0 4px ' + p.fgDim + '40;' : ''}
      }
      #oc-status-bar:hover {
        opacity: 1;
      }
      .oc-status-segment {
        cursor: pointer;
        padding: 2px 8px;
        border-radius: 4px;
        transition: background 0.15s;
        white-space: nowrap;
      }
      .oc-status-segment:hover {
        background: ${p.bgAlt}80;
        color: ${p.fg};
      }
      .oc-status-sep {
        color: ${p.border}50;
        user-select: none;
      }

      /* ── Welcome message ── */
      .oc-welcome {
        position: fixed;
        bottom: 32px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 100002;
        background: ${p.bg};
        border: 1px solid ${p.border}60;
        border-radius: ${p.radius === '0px' ? '0' : '12'}px;
        padding: 10px 20px;
        font-family: ${p.font};
        font-size: ${p.fontSize};
        color: ${p.fgDim};
        box-shadow: ${p.glow}, 0 4px 16px rgba(0,0,0,0.3);
        animation: oc-welcome-enter 0.5s ease-out;
        pointer-events: none;
        white-space: nowrap;
        ${isCyber ? 'text-shadow: 0 0 6px ' + p.fgDim + '30;' : ''}
      }
      @keyframes oc-welcome-enter {
        0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
        100% { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
      .oc-welcome.oc-fading {
        animation: oc-welcome-exit 0.4s ease-in forwards;
      }
      @keyframes oc-welcome-exit {
        0% { opacity: 1; transform: translateX(-50%) translateY(0); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-8px); }
      }

      /* ── Tooltip ── */
      .oc-tooltip {
        position: fixed;
        z-index: 120000;
        background: ${p.bg};
        border: 1px solid ${p.border}80;
        border-radius: ${p.radius === '0px' ? '0' : '6'}px;
        padding: 5px 10px;
        font-family: ${p.font};
        font-size: calc(${p.fontSize} - 2px);
        color: ${p.fgDim};
        pointer-events: none;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        animation: oc-tooltip-in 0.15s ease-out;
      }
      @keyframes oc-tooltip-in {
        0% { opacity: 0; transform: translateY(4px); }
        100% { opacity: 1; transform: translateY(0); }
      }

      /* ── Team status panel ── */
      .oc-team-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .oc-team-member {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        border-radius: ${p.radius === '0px' ? '0' : '6'}px;
        cursor: pointer;
        transition: background 0.12s;
      }
      .oc-team-member:hover {
        background: ${p.bgAlt};
      }
      .oc-team-emoji {
        font-size: 18px;
        width: 28px;
        text-align: center;
      }
      .oc-team-name {
        flex: 1;
        color: ${p.fg};
      }
      .oc-team-task {
        color: ${p.fgMuted};
        font-size: calc(${p.fontSize} - 2px);
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* ── Toast notifications ── */
      .oc-toast {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 130000;
        background: ${p.bg};
        border: 1px solid ${p.accent};
        border-radius: ${p.radius === '0px' ? '0' : '8'}px;
        padding: 10px 20px;
        font-family: ${p.font};
        font-size: ${p.fontSize};
        color: ${p.fg};
        box-shadow: ${p.glow}, 0 4px 16px rgba(0,0,0,0.4);
        animation: oc-toast-in 0.3s ease-out;
      }
      .oc-toast.oc-toast-out {
        animation: oc-toast-out 0.3s ease-in forwards;
      }
      @keyframes oc-toast-in {
        0% { opacity: 0; transform: translateX(-50%) translateY(-12px); }
        100% { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
      @keyframes oc-toast-out {
        0% { opacity: 1; transform: translateX(-50%) translateY(0); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-12px); }
      }

      /* ── Responsive ── */
      @media (max-width: 600px) {
        .oc-panel {
          max-width: 100vw;
          width: 100vw;
          max-height: 90vh;
          border-radius: 0;
        }
        .oc-stat-grid {
          grid-template-columns: 1fr;
        }
        #oc-status-bar {
          font-size: 9px;
          gap: 2px;
          padding: 4px 8px;
        }
        .oc-shortcuts-bar {
          display: none;
        }
      }
    `;

    document.head.appendChild(_styleEl);
  }

  // ══════════════════════════════════════════════════════════════
  //  1. QUICK ACTIONS PANEL (Q key)
  // ══════════════════════════════════════════════════════════════

  function buildQuickActions() {
    if (_quickActionsEl) _quickActionsEl.remove();

    _quickActionsEl = document.createElement('div');
    _quickActionsEl.className = 'oc-overlay';
    _quickActionsEl.id = 'oc-quick-actions';
    _quickActionsEl.setAttribute('role', 'dialog');
    _quickActionsEl.setAttribute('aria-modal', 'true');
    _quickActionsEl.setAttribute('aria-label', 'Quick Actions');

    const panel = document.createElement('div');
    panel.className = 'oc-panel';

    // Header with search
    const header = document.createElement('div');
    header.className = 'oc-panel-header';

    const title = document.createElement('div');
    title.className = 'oc-panel-title';
    title.textContent = '🔍 What do you want to do?';
    header.appendChild(title);

    const searchWrap = document.createElement('div');
    searchWrap.className = 'oc-search-wrap';

    const searchIcon = document.createElement('span');
    searchIcon.className = 'oc-search-icon';
    searchIcon.textContent = '⌕';
    searchWrap.appendChild(searchIcon);

    const searchInput = document.createElement('input');
    searchInput.className = 'oc-search-input';
    searchInput.type = 'text';
    searchInput.placeholder = 'Type a command or search...';
    searchInput.setAttribute('aria-label', 'Search commands');
    searchInput.id = 'oc-search-input';
    searchWrap.appendChild(searchInput);

    header.appendChild(searchWrap);
    panel.appendChild(header);

    // Body (scrollable)
    const body = document.createElement('div');
    body.className = 'oc-panel-body';
    body.id = 'oc-quick-body';
    panel.appendChild(body);

    // Shortcuts footer
    const footer = document.createElement('div');
    footer.className = 'oc-shortcuts-bar';
    footer.innerHTML = `
      <span class="oc-shortcut-item"><span class="oc-key-badge">↑↓</span> Navigate</span>
      <span class="oc-shortcut-item"><span class="oc-key-badge">↵</span> Select</span>
      <span class="oc-shortcut-item"><span class="oc-key-badge">X</span> Quick mission</span>
      <span class="oc-shortcut-item"><span class="oc-key-badge">TAB</span> Stats</span>
      <span class="oc-shortcut-item"><span class="oc-key-badge">ESC</span> Close</span>
    `;
    panel.appendChild(footer);

    _quickActionsEl.appendChild(panel);

    // Event: click outside to close
    _quickActionsEl.addEventListener('click', (e) => {
      if (e.target === _quickActionsEl) closeQuickActions();
    });

    // Event: search input
    searchInput.addEventListener('input', () => {
      const q = searchInput.value;
      _selectedActionIndex = 0;
      renderQuickBody(q);
    });

    // Event: keyboard nav in search
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        _selectedActionIndex = Math.min(_selectedActionIndex + 1, _filteredActions.length - 1);
        highlightAction();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        _selectedActionIndex = Math.max(_selectedActionIndex - 1, 0);
        highlightAction();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (_filteredActions[_selectedActionIndex]) {
          _filteredActions[_selectedActionIndex].action();
        } else if (searchInput.value.trim()) {
          // Free-form text → create mission
          closeQuickActions();
          showMissionForm(searchInput.value.trim());
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeQuickActions();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        closeQuickActions();
        // Trigger achievements/stats panel if available
        if (typeof SpawnKitAchievements !== 'undefined' && SpawnKitAchievements.showStatsOverlay) {
          SpawnKitAchievements.showStatsOverlay();
        }
      }
    });

    document.body.appendChild(_quickActionsEl);
  }

  function renderQuickBody(query) {
    const body = document.getElementById('oc-quick-body');
    if (!body) return;
    body.innerHTML = '';

    // Filter actions
    _filteredActions = filterActions(query);

    if (_filteredActions.length > 0) {
      const label = document.createElement('div');
      label.className = 'oc-section-label';
      label.textContent = query ? '🎯 Matching Actions' : '📋 Quick Actions';
      body.appendChild(label);

      _filteredActions.forEach((action, i) => {
        const item = document.createElement('div');
        item.className = 'oc-action-item' + (i === _selectedActionIndex ? ' oc-selected' : '');
        item.dataset.index = i;
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', i === _selectedActionIndex ? 'true' : 'false');

        item.innerHTML = `
          <span class="oc-action-icon">${action.icon}</span>
          <span class="oc-action-label">${action.label}</span>
        `;

        item.addEventListener('click', () => action.action());
        item.addEventListener('mouseenter', () => {
          _selectedActionIndex = i;
          highlightAction();
        });

        body.appendChild(item);
      });
    }

    // If no match and user typed something
    if (_filteredActions.length === 0 && query && query.trim()) {
      const noMatch = document.createElement('div');
      noMatch.className = 'oc-section-label';
      noMatch.style.textAlign = 'center';
      noMatch.style.padding = '16px 0';
      noMatch.textContent = '💡 Press Enter to create a mission with this text';
      body.appendChild(noMatch);
    }

    // Examples (only when no query)
    if (!query || !query.trim()) {
      const exLabel = document.createElement('div');
      exLabel.className = 'oc-section-label';
      exLabel.textContent = '💡 Examples';
      body.appendChild(exLabel);

      const timeOfDay = getTimeOfDay();
      const examples = EXAMPLES[timeOfDay] || EXAMPLES.morning;

      examples.slice(0, 4).forEach(ex => {
        const item = document.createElement('div');
        item.className = 'oc-example-item';
        item.textContent = ex;
        item.addEventListener('click', () => {
          closeQuickActions();
          showMissionForm(ex);
        });
        body.appendChild(item);
      });
    }
  }

  function highlightAction() {
    const body = document.getElementById('oc-quick-body');
    if (!body) return;

    body.querySelectorAll('.oc-action-item').forEach((el, i) => {
      const isSelected = parseInt(el.dataset.index) === _selectedActionIndex;
      el.classList.toggle('oc-selected', isSelected);
      el.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      if (isSelected) el.scrollIntoView({ block: 'nearest' });
    });
  }

  function showQuickActions() {
    if (_quickActionsVisible) return;
    closeAllPanels();
    injectStyles();

    if (!_quickActionsEl) buildQuickActions();

    _selectedActionIndex = 0;
    renderQuickBody('');

    _quickActionsEl.classList.add('oc-visible');
    _quickActionsVisible = true;

    // Focus input
    requestAnimationFrame(() => {
      const input = document.getElementById('oc-search-input');
      if (input) {
        input.value = '';
        input.focus();
      }
    });
  }

  function closeQuickActions() {
    if (_quickActionsEl) _quickActionsEl.classList.remove('oc-visible');
    _quickActionsVisible = false;
  }

  // ══════════════════════════════════════════════════════════════
  //  2. MISSION FORM (X key enhanced)
  // ══════════════════════════════════════════════════════════════

  let _missionPriority = 'normal';
  let _missionAgents = new Set();
  let _missionSuggested = new Set();

  function buildMissionForm(prefill) {
    if (_missionFormEl) _missionFormEl.remove();

    _missionPriority = 'normal';
    _missionAgents = new Set();
    _missionSuggested = new Set();

    _missionFormEl = document.createElement('div');
    _missionFormEl.className = 'oc-overlay';
    _missionFormEl.id = 'oc-mission-form';
    _missionFormEl.setAttribute('role', 'dialog');
    _missionFormEl.setAttribute('aria-modal', 'true');
    _missionFormEl.setAttribute('aria-label', 'New Mission');

    const panel = document.createElement('div');
    panel.className = 'oc-panel';

    // Header
    const header = document.createElement('div');
    header.className = 'oc-panel-header';
    const title = document.createElement('div');
    title.className = 'oc-panel-title';
    title.textContent = '⚡ New Mission';
    header.appendChild(title);
    panel.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.className = 'oc-panel-body';

    // Task description
    const taskLabel = document.createElement('label');
    taskLabel.className = 'oc-form-label';
    taskLabel.textContent = 'What needs to be done?';
    taskLabel.setAttribute('for', 'oc-mission-text');
    body.appendChild(taskLabel);

    const textarea = document.createElement('textarea');
    textarea.className = 'oc-textarea';
    textarea.id = 'oc-mission-text';
    textarea.placeholder = 'e.g., Build a responsive landing page\nfor FeedCast with pricing table';
    textarea.value = prefill || '';
    textarea.setAttribute('aria-label', 'Mission description');
    body.appendChild(textarea);

    // Auto-suggest agents on input
    textarea.addEventListener('input', () => {
      updateAgentSuggestions(textarea.value);
    });

    // Priority selector
    const priLabel = document.createElement('label');
    priLabel.className = 'oc-form-label';
    priLabel.textContent = 'Priority';
    body.appendChild(priLabel);

    const priRow = document.createElement('div');
    priRow.className = 'oc-priority-row';
    priRow.id = 'oc-priority-row';

    const priorities = [
      { value: 'normal', label: '🟢 Normal' },
      { value: 'high', label: '🟡 High' },
      { value: 'urgent', label: '🔴 Urgent' },
    ];

    priorities.forEach(pri => {
      const btn = document.createElement('button');
      btn.className = 'oc-priority-btn' + (pri.value === 'normal' ? ' oc-active' : '');
      btn.dataset.priority = pri.value;
      btn.textContent = pri.label;
      btn.setAttribute('aria-pressed', pri.value === 'normal' ? 'true' : 'false');

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        _missionPriority = pri.value;
        priRow.querySelectorAll('.oc-priority-btn').forEach(b => {
          const isActive = b.dataset.priority === pri.value;
          b.classList.toggle('oc-active', isActive);
          b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
      });

      priRow.appendChild(btn);
    });

    body.appendChild(priRow);

    // Agent assignment
    const agentLabel = document.createElement('label');
    agentLabel.className = 'oc-form-label';
    agentLabel.textContent = 'Assign to';
    body.appendChild(agentLabel);

    const agentGrid = document.createElement('div');
    agentGrid.className = 'oc-agents-grid';
    agentGrid.id = 'oc-agents-grid';

    const agents = getAgentsForTheme();
    agents.forEach(agent => {
      const chip = document.createElement('button');
      chip.className = 'oc-agent-chip';
      chip.dataset.agentId = agent.id;
      chip.textContent = agent.displayName;
      chip.setAttribute('aria-pressed', 'false');

      chip.addEventListener('click', (e) => {
        e.preventDefault();
        if (_missionAgents.has(agent.id)) {
          _missionAgents.delete(agent.id);
          chip.classList.remove('oc-selected');
          chip.setAttribute('aria-pressed', 'false');
        } else {
          _missionAgents.add(agent.id);
          chip.classList.add('oc-selected');
          chip.setAttribute('aria-pressed', 'true');
        }
      });

      agentGrid.appendChild(chip);
    });

    body.appendChild(agentGrid);

    // Buttons
    const btnRow = document.createElement('div');
    btnRow.className = 'oc-btn-row';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'oc-btn oc-btn-secondary';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', closeMissionForm);

    const submitBtn = document.createElement('button');
    submitBtn.className = 'oc-btn oc-btn-primary';
    submitBtn.textContent = '🚀 Launch Mission';
    submitBtn.addEventListener('click', submitMission);

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(submitBtn);
    body.appendChild(btnRow);

    panel.appendChild(body);
    _missionFormEl.appendChild(panel);

    // Click outside
    _missionFormEl.addEventListener('click', (e) => {
      if (e.target === _missionFormEl) closeMissionForm();
    });

    // Keyboard
    _missionFormEl.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMissionForm();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        submitMission();
      }
    });

    document.body.appendChild(_missionFormEl);

    // Pre-fill suggestion
    if (prefill) {
      updateAgentSuggestions(prefill);
    }
  }

  function getAgentsForTheme() {
    const agentIds = ['hunter', 'forge', 'echo', 'atlas', 'sentinel'];
    const names = window.SpawnKitNames;

    return agentIds.map(id => {
      const displayName = names?.resolve ? names.resolve(_theme, id) : id;
      return { id, displayName };
    });
  }

  function updateAgentSuggestions(text) {
    const suggested = suggestAgents(text);
    _missionSuggested = new Set(suggested);

    const grid = document.getElementById('oc-agents-grid');
    if (!grid) return;

    grid.querySelectorAll('.oc-agent-chip').forEach(chip => {
      const agentId = chip.dataset.agentId;
      const isSuggested = _missionSuggested.has(agentId);
      chip.classList.toggle('oc-suggested', isSuggested);

      // Auto-select suggested agents (but don't deselect manually selected ones)
      if (isSuggested && !_missionAgents.has(agentId)) {
        _missionAgents.add(agentId);
        chip.classList.add('oc-selected');
        chip.setAttribute('aria-pressed', 'true');
      }
    });
  }

  function showMissionForm(prefill) {
    if (_missionFormVisible) return;
    closeAllPanels();
    injectStyles();

    buildMissionForm(prefill || '');
    _missionFormEl.classList.add('oc-visible');
    _missionFormVisible = true;

    requestAnimationFrame(() => {
      const ta = document.getElementById('oc-mission-text');
      if (ta) ta.focus();
    });
  }

  function closeMissionForm() {
    if (_missionFormEl) _missionFormEl.classList.remove('oc-visible');
    _missionFormVisible = false;
  }

  function submitMission() {
    const textarea = document.getElementById('oc-mission-text');
    const text = textarea ? textarea.value.trim() : '';

    if (!text) {
      // Shake the textarea
      if (textarea) {
        textarea.style.borderColor = P().danger;
        textarea.focus();
        setTimeout(() => { textarea.style.borderColor = ''; }, 1500);
      }
      return;
    }

    const assignedTo = _missionAgents.size > 0 ? Array.from(_missionAgents) : undefined;

    // Close form
    closeMissionForm();

    // Fire mission via SpawnKit event bus
    if (typeof SpawnKit !== 'undefined' && SpawnKit?.emit) {
      SpawnKit.emit('mission:new', {
        text: text,
        assignedTo: assignedTo,
        priority: _missionPriority === 'urgent' ? 'critical' : _missionPriority,
      });
    }

    // Also try MissionController directly
    if (typeof MissionController !== 'undefined' && MissionController?.executeMission) {
      MissionController.executeMission({
        text: text,
        assignedTo: assignedTo,
        priority: _missionPriority === 'urgent' ? 'critical' : _missionPriority,
      });
    }

    showToast(`🚀 Mission launched: "${text.substring(0, 40)}${text.length > 40 ? '...' : ''}"`);
  }

  // ══════════════════════════════════════════════════════════════
  //  3. AGENT DETAIL CARDS
  // ══════════════════════════════════════════════════════════════

  function buildAgentDetail(agent) {
    if (_agentDetailEl) _agentDetailEl.remove();

    const names = window.SpawnKitNames;
    const themeInfo = names?.[_theme]?.[agent?.id] || null;
    const displayName = themeInfo?.name || agent?.name || 'Unknown';
    const roleTitle = themeInfo?.title || `${agent?.name || 'Unknown'}, ${agent?.role || 'Agent'}`;
    const emoji = themeInfo?.emoji || agent?.emoji || '🤖';

    // Agent specialties based on ID
    const specialties = {
      hunter: ['#revenue', '#sales', '#analytics', '#growth'],
      forge: ['#coding', '#architecture', '#performance', '#devops'],
      echo: ['#content', '#marketing', '#branding', '#social'],
      atlas: ['#operations', '#planning', '#documentation', '#systems'],
      sentinel: ['#security', '#compliance', '#monitoring', '#auditing'],
    };

    // Time since last seen
    const lastSeen = agent?.lastSeen ? timeSince(new Date(agent.lastSeen)) : 'Unknown';

    _agentDetailEl = document.createElement('div');
    _agentDetailEl.className = 'oc-overlay';
    _agentDetailEl.id = 'oc-agent-detail';
    _agentDetailEl.setAttribute('role', 'dialog');
    _agentDetailEl.setAttribute('aria-modal', 'true');
    _agentDetailEl.setAttribute('aria-label', `${displayName} details`);

    const panel = document.createElement('div');
    panel.className = 'oc-panel oc-agent-detail';

    // Header
    const header = document.createElement('div');
    header.className = 'oc-panel-header';

    const agentHeader = document.createElement('div');
    agentHeader.className = 'oc-agent-header';

    agentHeader.innerHTML = `
      <div class="oc-agent-avatar">${emoji}</div>
      <div class="oc-agent-info">
        <h3>${escapeHtml(roleTitle)}</h3>
        <div class="oc-agent-role">${escapeHtml(themeInfo?.role || agent?.role || '')}</div>
      </div>
      <div class="oc-status-badge">
        <span class="oc-status-dot"></span>
        ${escapeHtml(formatStatus(agent?.status))}
      </div>
    `;
    header.appendChild(agentHeader);
    panel.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.className = 'oc-panel-body';

    // Current task
    if (agent?.currentTask) {
      const taskSection = document.createElement('div');
      const taskLabel = document.createElement('div');
      taskLabel.className = 'oc-form-label';
      taskLabel.textContent = 'Current Task';
      taskSection.appendChild(taskLabel);

      const taskDisplay = document.createElement('div');
      taskDisplay.className = 'oc-task-display';
      taskDisplay.textContent = agent.currentTask;
      taskSection.appendChild(taskDisplay);

      body.appendChild(taskSection);
    }

    // Stats
    body.innerHTML += `
      <div class="oc-divider"></div>
      <div class="oc-section-label">📊 Stats</div>
      <div class="oc-stat-grid">
        <div class="oc-stat-item">
          <span class="oc-stat-label">Energy used</span>
          <span class="oc-stat-value">${formatNumber(agent?.tokensUsed || 0)}</span>
        </div>
        <div class="oc-stat-item">
          <span class="oc-stat-label">API calls</span>
          <span class="oc-stat-value">${agent?.apiCalls || 0}</span>
        </div>
        <div class="oc-stat-item">
          <span class="oc-stat-label">Last active</span>
          <span class="oc-stat-value">${escapeHtml(lastSeen)}</span>
        </div>
        <div class="oc-stat-item">
          <span class="oc-stat-label">Missions</span>
          <span class="oc-stat-value">${countAgentMissions(agent?.id)}</span>
        </div>
      </div>
    `;

    // Specialties
    const tags = specialties[agent?.id] || ['#general'];
    const tagsDiv = document.createElement('div');
    tagsDiv.innerHTML = `<div class="oc-divider"></div><div class="oc-section-label">🏆 Specialties</div>`;
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'oc-tags';
    tags.forEach(tag => {
      const tagEl = document.createElement('span');
      tagEl.className = 'oc-tag';
      tagEl.textContent = tag;
      tagsContainer.appendChild(tagEl);
    });
    tagsDiv.appendChild(tagsContainer);
    body.appendChild(tagsDiv);

    // Buttons
    const btnRow = document.createElement('div');
    btnRow.className = 'oc-btn-row';
    btnRow.style.marginTop = '12px';

    const sendBtn = document.createElement('button');
    sendBtn.className = 'oc-btn oc-btn-primary';
    sendBtn.textContent = '📤 Send Task';
    sendBtn.addEventListener('click', () => {
      closeAgentDetail();
      showMissionForm('');
      // Pre-select this agent
      requestAnimationFrame(() => {
        _missionAgents.add(agent.id);
        const chip = document.querySelector(`.oc-agent-chip[data-agent-id="${agent.id}"]`);
        if (chip) {
          chip.classList.add('oc-selected');
          chip.setAttribute('aria-pressed', 'true');
        }
      });
    });

    const closeBtn = document.createElement('button');
    closeBtn.className = 'oc-btn oc-btn-secondary';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closeAgentDetail);

    btnRow.appendChild(closeBtn);
    btnRow.appendChild(sendBtn);
    body.appendChild(btnRow);

    panel.appendChild(body);
    _agentDetailEl.appendChild(panel);

    // Click outside
    _agentDetailEl.addEventListener('click', (e) => {
      if (e.target === _agentDetailEl) closeAgentDetail();
    });

    _agentDetailEl.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAgentDetail();
    });

    document.body.appendChild(_agentDetailEl);
  }

  function showAgentDetail(agentIdOrObj) {
    closeAllPanels();
    injectStyles();

    let agent = agentIdOrObj;

    // If given an ID string, look up in SpawnKit.data
    if (typeof agentIdOrObj === 'string') {
      if (typeof SpawnKit !== 'undefined' && SpawnKit?.data?.agents) {
        agent = (SpawnKit.data?.agents || []).find(a => a?.id === agentIdOrObj);
      }
      if (!agent) {
        agent = { id: agentIdOrObj, name: agentIdOrObj, role: 'Unknown', status: 'offline' };
      }
    }

    buildAgentDetail(agent);
    _agentDetailEl.classList.add('oc-visible');
    _agentDetailVisible = true;
    _agentDetailEl.focus();
  }

  function closeAgentDetail() {
    if (_agentDetailEl) _agentDetailEl.classList.remove('oc-visible');
    _agentDetailVisible = false;
  }

  // ══════════════════════════════════════════════════════════════
  //  4. STATUS BAR
  // ══════════════════════════════════════════════════════════════

  function buildStatusBar() {
    if (_statusBarEl) _statusBarEl.remove();

    _statusBarEl = document.createElement('div');
    _statusBarEl.id = 'oc-status-bar';
    _statusBarEl.setAttribute('role', 'status');
    _statusBarEl.setAttribute('aria-label', 'Team status bar');

    updateStatusBar();
    document.body.appendChild(_statusBarEl);

    // Update every 30 seconds
    if (_statusBarInterval) clearInterval(_statusBarInterval);
    _statusBarInterval = setInterval(updateStatusBar, 30000);
  }

  function updateStatusBar() {
    if (!_statusBarEl) return;

    const data = (typeof SpawnKit !== 'undefined' && SpawnKit?.data) ? SpawnKit.data : null;
    if (!data) {
      _statusBarEl.innerHTML = '<span class="oc-status-segment">⏳ Loading team data...</span>';
      return;
    }

    const activeAgents = data?.agents ? data.agents.filter(a => a?.status !== 'offline').length : 0;
    const totalAgents = data?.agents?.length || 0;
    const activeMissions = data?.missions ? data.missions.filter(m => m?.status === 'in_progress').length : 0;
    const apiCalls = data?.metrics?.apiCallsToday || 0;

    // Get streak & rank from achievements
    let streakText = '';
    let rankText = '';
    if (typeof SpawnKitAchievements !== 'undefined') {
      const stats = SpawnKitAchievements?.getStats ? SpawnKitAchievements.getStats() : null;
      if (stats) {
        if (stats?.streak > 0) streakText = `🔥 ${stats.streak}-day streak`;
        if (stats?.rank) rankText = `${stats.rank?.icon || '💎'} ${stats.rank?.name || 'Diamond'}`;
      }
    }

    const segments = [];

    segments.push(makeStatusSegment(
      `🟢 ${activeAgents} team members online`,
      () => showTeamStatusPanel()
    ));

    segments.push(makeStatusSep());

    segments.push(makeStatusSegment(
      `⚡ ${activeMissions} active mission${activeMissions !== 1 ? 's' : ''}`,
      () => showMissionsPanel()
    ));

    segments.push(makeStatusSep());

    segments.push(makeStatusSegment(
      `📊 ${formatNumber(apiCalls)} API calls today`,
      null
    ));

    if (streakText) {
      segments.push(makeStatusSep());
      segments.push(makeStatusSegment(streakText, null));
    }

    if (rankText) {
      segments.push(makeStatusSep());
      segments.push(makeStatusSegment(rankText, () => {
        if (typeof SpawnKitAchievements !== 'undefined' && SpawnKitAchievements.showStatsOverlay) {
          SpawnKitAchievements.showStatsOverlay();
        }
      }));
    }

    _statusBarEl.innerHTML = '';
    segments.forEach(s => _statusBarEl.appendChild(s));
  }

  function makeStatusSegment(text, onClick) {
    const span = document.createElement('span');
    span.className = 'oc-status-segment';
    span.textContent = text;
    if (onClick) {
      span.style.cursor = 'pointer';
      span.addEventListener('click', onClick);
    }
    return span;
  }

  function makeStatusSep() {
    const sep = document.createElement('span');
    sep.className = 'oc-status-sep';
    sep.textContent = '|';
    return sep;
  }

  // ══════════════════════════════════════════════════════════════
  //  5. CONTEXTUAL TOOLTIPS
  // ══════════════════════════════════════════════════════════════

  const TOOLTIP_HINTS = {
    // CSS selectors → tooltip text (will be attempted in order)
    agent: 'Click to see details',
    whiteboard: 'Press X to add a new mission',
    mailbox: 'Incoming messages appear here',
    phone: 'Scheduled tasks trigger the phone',
    coffee: 'Even AI needs a break sometimes ☕',
    door: 'New team members arrive here',
    cabinet: 'Team knowledge base stored here',
  };

  function setupTooltips() {
    // Create tooltip element
    if (_tooltipEl) _tooltipEl.remove();
    _tooltipEl = document.createElement('div');
    _tooltipEl.className = 'oc-tooltip';
    _tooltipEl.style.display = 'none';
    document.body.appendChild(_tooltipEl);

    // We'll expose a function that themes can call to register tooltip areas
    // This is more reliable than trying to guess DOM selectors
  }

  function showTooltip(text, x, y) {
    if (!_tooltipEl) return;
    _tooltipEl.textContent = text;
    _tooltipEl.style.display = 'block';

    // Position above cursor
    const rect = _tooltipEl.getBoundingClientRect();
    const left = Math.min(x, window.innerWidth - rect.width - 8);
    const top = Math.max(4, y - rect.height - 10);

    _tooltipEl.style.left = left + 'px';
    _tooltipEl.style.top = top + 'px';
  }

  function hideTooltip() {
    if (_tooltipEl) _tooltipEl.style.display = 'none';
  }

  // ══════════════════════════════════════════════════════════════
  //  6. WELCOME MESSAGES
  // ══════════════════════════════════════════════════════════════

  const WELCOME_MESSAGES = {
    morning: [
      '☀️ Good morning! Your team is ready.',
      '🌅 Rise and shine! All agents online.',
      '☕ Morning briefing: team standing by.',
    ],
    afternoon: [
      '🌤️ Afternoon briefing: {missions} mission{s} pending.',
      '📋 Good afternoon! Team is productive.',
      '⚡ Afternoon check-in: all systems go.',
    ],
    evening: [
      '🌙 Night shift activated. Deep work mode.',
      '🌆 Evening operations: team on standby.',
      '✨ Good evening! Ready for focused work.',
    ],
    night: [
      '🦉 Burning the midnight oil? Your team never sleeps.',
      '🌌 Late night mode. Running at full power.',
      '🔮 Night operations active. Stay sharp.',
    ]
  };

  function showWelcome() {
    const timeOfDay = getTimeOfDay();
    const messages = WELCOME_MESSAGES[timeOfDay] || WELCOME_MESSAGES.morning;
    let msg = messages[Math.floor(Math.random() * messages.length)];

    // Replace placeholders
    const data = (typeof SpawnKit !== 'undefined' && SpawnKit?.data) ? SpawnKit.data : null;
    const pendingMissions = data?.missions
      ? data.missions.filter(m => m?.status === 'in_progress' || m?.status === 'pending').length
      : 0;
    msg = msg.replace('{missions}', pendingMissions);
    msg = msg.replace('{s}', pendingMissions !== 1 ? 's' : '');

    if (_welcomeEl) _welcomeEl.remove();

    _welcomeEl = document.createElement('div');
    _welcomeEl.className = 'oc-welcome';
    _welcomeEl.textContent = msg;
    _welcomeEl.setAttribute('role', 'status');
    _welcomeEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(_welcomeEl);

    // Fade out after 5 seconds
    _welcomeTimeout = setTimeout(() => {
      if (_welcomeEl) {
        _welcomeEl.classList.add('oc-fading');
        setTimeout(() => {
          if (_welcomeEl && _welcomeEl.parentNode) _welcomeEl.remove();
          _welcomeEl = null;
        }, 500);
      }
    }, 5000);
  }

  // ══════════════════════════════════════════════════════════════
  //  TEAM STATUS PANEL (shows when clicking status bar agents)
  // ══════════════════════════════════════════════════════════════

  function showTeamStatusPanel() {
    closeAllPanels();
    injectStyles();

    const overlay = document.createElement('div');
    overlay.className = 'oc-overlay oc-visible';
    overlay.id = 'oc-team-panel';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Team Status');

    const panel = document.createElement('div');
    panel.className = 'oc-panel';

    const header = document.createElement('div');
    header.className = 'oc-panel-header';
    const title = document.createElement('div');
    title.className = 'oc-panel-title';
    title.textContent = '📊 Team Status';
    header.appendChild(title);
    panel.appendChild(header);

    const body = document.createElement('div');
    body.className = 'oc-panel-body';

    const agents = (typeof SpawnKit !== 'undefined' && SpawnKit?.data?.agents) ? SpawnKit.data.agents : [];
    const names = window.SpawnKitNames;

    if (agents.length === 0) {
      body.innerHTML = '<div style="text-align:center;padding:20px;opacity:0.6;">No team members found</div>';
    } else {
      const list = document.createElement('ul');
      list.className = 'oc-team-list';

      agents.forEach(agent => {
        const themeInfo = names?.[_theme]?.[agent?.id] || null;
        const displayName = themeInfo?.name || agent?.name || 'Unknown';
        const emoji = themeInfo?.emoji || agent?.emoji || '🤖';

        const li = document.createElement('li');
        li.className = 'oc-team-member';

        li.innerHTML = `
          <span class="oc-team-emoji">${emoji}</span>
          <span class="oc-team-name">${escapeHtml(displayName)}</span>
          <span class="oc-status-badge"><span class="oc-status-dot"></span>${escapeHtml(formatStatus(agent?.status))}</span>
          <span class="oc-team-task">${escapeHtml(agent?.currentTask || 'Idle')}</span>
        `;

        li.addEventListener('click', () => {
          overlay.remove();
          showAgentDetail(agent);
        });

        list.appendChild(li);
      });

      body.appendChild(list);
    }

    // Subagents section
    const subagents = (typeof SpawnKit !== 'undefined' && SpawnKit?.data?.subagents) ? SpawnKit.data.subagents : [];
    if (subagents.length > 0) {
      const subLabel = document.createElement('div');
      subLabel.className = 'oc-section-label';
      subLabel.style.marginTop = '16px';
      subLabel.textContent = '👥 Active Helpers';
      body.appendChild(subLabel);

      subagents.forEach(sa => {
        const item = document.createElement('div');
        item.className = 'oc-team-member';
        item.innerHTML = `
          <span class="oc-team-emoji">⚡</span>
          <span class="oc-team-name">${escapeHtml(sa?.name || '')}</span>
          <span class="oc-team-task">${escapeHtml(sa?.task || '')}</span>
        `;
        body.appendChild(item);
      });
    }

    panel.appendChild(body);

    // Close footer
    const footer = document.createElement('div');
    footer.className = 'oc-shortcuts-bar';
    footer.innerHTML = '<span class="oc-shortcut-item"><span class="oc-key-badge">ESC</span> Close</span>';
    panel.appendChild(footer);

    overlay.appendChild(panel);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') overlay.remove();
    });

    document.body.appendChild(overlay);
    overlay.focus();
  }

  // ══════════════════════════════════════════════════════════════
  //  MISSIONS PANEL
  // ══════════════════════════════════════════════════════════════

  function showMissionsPanel() {
    closeAllPanels();
    injectStyles();

    const overlay = document.createElement('div');
    overlay.className = 'oc-overlay oc-visible';
    overlay.id = 'oc-missions-panel';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Active Missions');

    const panel = document.createElement('div');
    panel.className = 'oc-panel';

    const header = document.createElement('div');
    header.className = 'oc-panel-header';
    const title = document.createElement('div');
    title.className = 'oc-panel-title';
    title.textContent = '⚡ Active Missions';
    header.appendChild(title);
    panel.appendChild(header);

    const body = document.createElement('div');
    body.className = 'oc-panel-body';

    const missions = (typeof SpawnKit !== 'undefined' && SpawnKit?.data?.missions) ? SpawnKit.data.missions : [];

    if (missions.length === 0) {
      body.innerHTML = '<div style="text-align:center;padding:20px;opacity:0.6;">No missions yet. Press X to create one!</div>';
    } else {
      missions.forEach(mission => {
        const item = document.createElement('div');
        item.style.cssText = 'padding: 10px 0; border-bottom: 1px solid ' + P().border + '20;';

        const priorityIcon = mission?.priority === 'high' ? '🟡' : (mission?.priority === 'critical' ? '🔴' : '🟢');
        const progressPct = Math.round((mission?.progress || 0) * 100);

        item.innerHTML = `
          <div style="display:flex;align-items:center;gap:8px;">
            <span>${priorityIcon}</span>
            <span style="flex:1;color:${P().fg}">${escapeHtml(mission?.title || mission?.name || 'Untitled')}</span>
            <span style="color:${P().fgDim};font-size:calc(${P().fontSize} - 2px)">${progressPct}%</span>
          </div>
          <div style="margin-top:4px;height:4px;background:${P().bgAlt};border-radius:2px;overflow:hidden;">
            <div style="height:100%;width:${progressPct}%;background:${P().accent};border-radius:2px;transition:width 0.3s;"></div>
          </div>
        `;

        body.appendChild(item);
      });
    }

    panel.appendChild(body);

    // New mission button
    const btnRow = document.createElement('div');
    btnRow.className = 'oc-btn-row';
    btnRow.style.padding = '8px 20px 16px';

    const newBtn = document.createElement('button');
    newBtn.className = 'oc-btn oc-btn-primary';
    newBtn.textContent = '➕ New Mission';
    newBtn.addEventListener('click', () => {
      overlay.remove();
      showMissionForm();
    });
    btnRow.appendChild(newBtn);
    panel.appendChild(btnRow);

    overlay.appendChild(panel);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') overlay.remove();
    });

    document.body.appendChild(overlay);
    overlay.focus();
  }

  // ══════════════════════════════════════════════════════════════
  //  ACTION HANDLERS (stubs that surface OpenClaw features)
  // ══════════════════════════════════════════════════════════════

  function handleScheduleAction() {
    // Show a simple schedule prompt
    showMissionForm('Remind me to: ');
    showToast('💡 Tip: Type "remind me at 9am to..." for scheduled tasks');
  }

  function handleMemoryAction() {
    showToast('🧠 Checking team knowledge base...');
    // In real OpenClaw integration, this would read MEMORY.md
    if (typeof SpawnKit !== 'undefined' && SpawnKit?.emit) {
      SpawnKit.emit('mission:new', {
        text: 'Review recent team knowledge and summarize key context',
        assignedTo: ['atlas'],
        priority: 'normal',
      });
    }
  }

  function handleSearchAction() {
    showMissionForm('Search the web for: ');
    showToast('💡 Tip: Describe what you\'re looking for');
  }

  function handleEmailAction() {
    showToast('📧 Checking inbox...');
    if (typeof SpawnKit !== 'undefined' && SpawnKit?.emit) {
      SpawnKit.emit('mission:new', {
        text: 'Check email inbox for urgent messages and upcoming calendar events',
        assignedTo: ['atlas'],
        priority: 'normal',
      });
    }
  }

  function handleSubagentAction() {
    showMissionForm('');
    showToast('👥 Describe the task — a helper will be spawned for it');
  }

  // ══════════════════════════════════════════════════════════════
  //  TOAST NOTIFICATIONS
  // ══════════════════════════════════════════════════════════════

  function showToast(message, durationMs) {
    const toast = document.createElement('div');
    toast.className = 'oc-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('oc-toast-out');
      setTimeout(() => {
        if (toast.parentNode) toast.remove();
      }, 300);
    }, durationMs || 3000);
  }

  // ══════════════════════════════════════════════════════════════
  //  UTILITY HELPERS
  // ══════════════════════════════════════════════════════════════

  function closeAllPanels() {
    closeQuickActions();
    closeMissionForm();
    closeAgentDetail();

    // Remove any one-off panels
    ['oc-team-panel', 'oc-missions-panel'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  }

  function isAnyPanelOpen() {
    return _quickActionsVisible || _missionFormVisible || _agentDetailVisible
      || !!document.getElementById('oc-team-panel')
      || !!document.getElementById('oc-missions-panel');
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return String(num);
  }

  function formatStatus(status) {
    const map = {
      active: 'Active',
      working: 'Working',
      building: 'Building',
      creating: 'Creating',
      organizing: 'Organizing',
      monitoring: 'Monitoring',
      idle: 'Idle',
      offline: 'Offline',
    };
    return map[status] || (status ? (status || '').charAt(0).toUpperCase() + (status || '').slice(1) : 'Unknown');
  }

  function timeSince(date) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    return Math.floor(seconds / 86400) + 'd ago';
  }

  function countAgentMissions(agentId) {
    if (typeof SpawnKit === 'undefined' || !SpawnKit?.data?.missions) return 0;
    return (SpawnKit.data?.missions || []).filter(m => m?.assignedTo?.includes?.(agentId)).length;
  }

  // ══════════════════════════════════════════════════════════════
  //  KEYBOARD HANDLER
  // ══════════════════════════════════════════════════════════════

  function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Don't capture when typing in our own inputs
      const tag = (e?.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e?.target?.isContentEditable) {
        // Only handle ESC in inputs (to close panels)
        if (e.key === 'Escape') {
          if (isAnyPanelOpen()) {
            e.preventDefault();
            e.stopPropagation();
            closeAllPanels();
          }
        }
        return;
      }

      // Don't capture with modifiers (except Shift for ?)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key.toLowerCase()) {
        case 'q':
          e.preventDefault();
          e.stopPropagation();
          if (_quickActionsVisible) {
            closeQuickActions();
          } else {
            showQuickActions();
          }
          break;

        case 'x':
          // Only intercept if no panel is open and the original handler
          // hasn't already been explicitly prevented
          if (!isAnyPanelOpen()) {
            e.preventDefault();
            e.stopPropagation();
            showMissionForm();
          }
          break;

        case 'escape':
          if (isAnyPanelOpen()) {
            e.preventDefault();
            e.stopPropagation();
            closeAllPanels();
          }
          break;
      }
    }, true); // Use capture phase to intercept before theme handlers
  }

  // ══════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ══════════════════════════════════════════════════════════════

  return {
    /**
     * Initialize the OpenClaw Helpers layer.
     * @param {Object} opts
     * @param {'gameboy'|'cyberpunk'|'executive'} opts.theme
     * @param {boolean} [opts.statusBar=true] — show status bar
     * @param {boolean} [opts.welcome=true] — show welcome message
     * @param {boolean} [opts.tooltips=true] — enable tooltips
     */
    init(opts = {}) {
      if (_initialized) return;
      _initialized = true;

      _theme = opts.theme || 'gameboy';

      // 1. Inject styles
      injectStyles();

      // 2. Setup keyboard handler
      setupKeyboard();

      // 3. Build status bar
      if (opts.statusBar !== false) {
        buildStatusBar();
      }

      // 4. Setup tooltips
      if (opts.tooltips !== false) {
        setupTooltips();
      }

      // 5. Show welcome message (after a short delay for boot sequence)
      if (opts.welcome !== false) {
        setTimeout(() => showWelcome(), 2000);
      }

      // 6. Listen for SpawnKit data updates to refresh status bar
      if (typeof SpawnKit !== 'undefined' && SpawnKit?.on) {
        SpawnKit.on('data:refresh', () => updateStatusBar());
        SpawnKit.on('mission:new', () => {
          setTimeout(updateStatusBar, 500);
        });
        SpawnKit.on('mission:complete', () => {
          setTimeout(updateStatusBar, 500);
        });
      }

      console.log(`[OpenClawHelpers] Initialized (theme: ${_theme})`);
      console.log('[OpenClawHelpers] Press Q for quick actions, X for new mission');
    },

    /**
     * Update theme and re-inject styles.
     * @param {string} newTheme
     */
    refreshTheme(newTheme) {
      if (newTheme) _theme = newTheme;
      injectStyles();
      updateStatusBar();
      console.log(`[OpenClawHelpers] Theme refreshed: ${_theme}`);
    },

    // Quick Actions
    showQuickActions,
    closeQuickActions,

    // Mission Form
    showMissionForm,
    closeMissionForm,

    // Agent Detail
    showAgentDetail,
    closeAgentDetail,

    // Status Bar
    updateStatusBar,

    // Tooltips
    showTooltip,
    hideTooltip,

    /**
     * Register a tooltip zone — themes can call this to add hover hints.
     * @param {HTMLElement} element
     * @param {string} text
     */
    registerTooltip(element, text) {
      if (!element) return;
      element.addEventListener('mouseenter', (e) => {
        showTooltip(text, e.clientX, e.clientY);
      });
      element.addEventListener('mousemove', (e) => {
        showTooltip(text, e.clientX, e.clientY);
      });
      element.addEventListener('mouseleave', () => {
        hideTooltip();
      });
    },

    // Toast
    showToast,

    // Welcome
    showWelcome,

    // Team/Missions panels
    showTeamStatusPanel,
    showMissionsPanel,

    // Panel state
    isAnyPanelOpen,
    closeAllPanels,

    // Getters
    get theme() { return _theme; },
    get initialized() { return _initialized; },
  };
})();
