/**
 * FleetKit v2 — SpawnKit Dashboard Controller
 * ═════════════════════════════════════════════
 *
 * Central orchestrator for the SpawnKit dashboard. Manages theme selection,
 * agent roster (with XP/leveling), mission board, sidebar state, and
 * iframe postMessage communication with active theme views.
 *
 * Integrates with:
 *   - FleetKit (data-bridge) event bus
 *   - FleetKitAchievements (unlock checks on mission complete)
 *   - MissionController (animation triggers)
 *   - theme-switcher (theme map + navigation)
 *
 * All state persisted to localStorage under `spawnkit-*` keys.
 *
 * API: window.SpawnKitDashboard.{init, selectTheme, toggleSidebar, ...}
 *
 * @author Forge (CTO)
 * @version 2.0.0
 */

(function (global) {
  'use strict';

  // ═══════════════════════════════════════════════════════════════
  // ─── CONSTANTS ────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  /** localStorage key map */
  var STORAGE_KEYS = {
    theme: 'spawnkit-theme',
    agents: 'spawnkit-agents',
    missions: 'spawnkit-missions',
    sidebar: 'spawnkit-sidebar'
  };

  /** Theme registry — id → metadata */
  var THEMES = {
    gameboy: {
      id: 'gameboy',
      name: 'Pixel',
      path: '../office-gameboy/index.html',
      emoji: '🎮',
      color: '#9BBB0F'
    },
    'gameboy-color': {
      id: 'gameboy-color',
      name: 'Pixel Color',
      path: '../office-gameboy-color/index.html',
      emoji: '🌈',
      color: '#53868B'
    },
    sims: {
      id: 'sims',
      name: 'The Sims',
      path: '../office-sims/index.html',
      emoji: '💎',
      color: '#E2C275'
    }
  };

  /** Default agent roster */
  var DEFAULT_AGENTS = [
    { id: 'atlas', name: 'Atlas', role: 'COO', emoji: '📊', sprite: 'atlas.png', xp: 0, level: 1 },
    { id: 'forge', name: 'Forge', role: 'CTO', emoji: '🔨', sprite: 'forge.png', xp: 0, level: 1 },
    { id: 'echo',  name: 'Echo',  role: 'CMO', emoji: '📢', sprite: 'echo.png',  xp: 0, level: 1 }
  ];

  /** Mission status enum */
  var MISSION_STATUS = {
    PENDING: 'pending',
    ACTIVE: 'active',
    COMPLETED: 'completed',
    FAILED: 'failed'
  };

  /** Maximum lengths for input validation */
  var MAX_NAME_LENGTH = 64;
  var MAX_TITLE_LENGTH = 200;
  var MAX_AGENTS = 20;
  var MAX_MISSIONS = 100;

  // ═══════════════════════════════════════════════════════════════
  // ─── STORAGE HELPERS ──────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  /**
   * Read a JSON value from localStorage.
   * @param {string} key - Storage key.
   * @param {*} fallback - Value to return on failure or missing key.
   * @returns {*} Parsed value or fallback.
   */
  function storageGet(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null || raw === undefined) return fallback;
      return JSON.parse(raw);
    } catch (_e) {
      return fallback;
    }
  }

  /**
   * Write a JSON value to localStorage.
   * @param {string} key - Storage key.
   * @param {*} value - Value to serialize.
   */
  function storageSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_e) {
      // Quota exceeded or private browsing — silently ignore
    }
  }

  /**
   * Read a plain string from localStorage.
   * @param {string} key - Storage key.
   * @param {string} fallback - Default value.
   * @returns {string}
   */
  function storageGetString(key, fallback) {
    try {
      var val = localStorage.getItem(key);
      return val !== null ? val : fallback;
    } catch (_e) {
      return fallback;
    }
  }

  /**
   * Write a plain string to localStorage.
   * @param {string} key - Storage key.
   * @param {string} value - String to store.
   */
  function storageSetString(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (_e) {
      // silent
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ─── EVENT HELPERS ────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  /**
   * Emit an event through FleetKit bus if available, otherwise dispatch
   * a CustomEvent on document.
   * @param {string} eventName - Event name.
   * @param {Object} data - Event payload.
   */
  function emitEvent(eventName, data) {
    if (typeof FleetKit !== 'undefined' && typeof FleetKit.emit === 'function') {
      FleetKit.emit(eventName, data);
    }
    if (typeof document !== 'undefined' && typeof CustomEvent === 'function') {
      document.dispatchEvent(new CustomEvent('spawnkit:' + eventName, { detail: data }));
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ─── UID HELPER ───────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  /**
   * Generate a short unique identifier.
   * @param {string} [prefix='sk'] - ID prefix.
   * @returns {string}
   */
  function uid(prefix) {
    return (prefix || 'sk') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  }

  // ═══════════════════════════════════════════════════════════════
  // ─── XP / LEVELING ────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  /**
   * Calculate the level for a given XP total.
   * Curve: threshold(n) = 50 * n * (n - 1).
   *   Level 1: 0, Level 2: 100, Level 3: 300, Level 4: 600, Level 5: 1000 …
   *
   * @param {number} xp - Total experience points.
   * @returns {number} Current level (1-based, minimum 1).
   */
  function getLevel(xp) {
    if (typeof xp !== 'number' || isNaN(xp) || xp < 0) return 1;
    // Solve 50*n*(n-1) <= xp  →  n <= (1 + sqrt(1 + xp/12.5)) / 2
    var n = Math.floor((1 + Math.sqrt(1 + xp / 12.5)) / 2);
    return Math.max(1, n);
  }

  /**
   * XP required to reach a given level.
   * @param {number} level - Target level.
   * @returns {number} XP threshold.
   */
  function xpForLevel(level) {
    if (typeof level !== 'number' || level < 2) return 0;
    return 50 * level * (level - 1);
  }

  // ═══════════════════════════════════════════════════════════════
  // ─── INTERNAL STATE ───────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  var _state = {
    currentTheme: 'gameboy',
    sidebarOpen: true,
    agents: [],
    missions: []
  };

  /** Reference to the active theme iframe element (set by consumer) */
  var _themeIframe = null;

  /** Allowed origins for postMessage validation */
  var _allowedOrigins = [];

  /** Whether init() has been called */
  var _initialized = false;

  /** Bound message handler reference (for cleanup) */
  var _messageHandler = null;

  // ═══════════════════════════════════════════════════════════════
  // ─── PERSISTENCE ──────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  /** Persist agents array to localStorage. */
  function persistAgents() {
    storageSet(STORAGE_KEYS.agents, _state.agents);
  }

  /** Persist missions array to localStorage. */
  function persistMissions() {
    storageSet(STORAGE_KEYS.missions, _state.missions);
  }

  /** Persist theme string to localStorage. */
  function persistTheme() {
    storageSetString(STORAGE_KEYS.theme, _state.currentTheme);
  }

  /** Persist sidebar boolean to localStorage. */
  function persistSidebar() {
    storageSetString(STORAGE_KEYS.sidebar, _state.sidebarOpen ? 'true' : 'false');
  }

  // ═══════════════════════════════════════════════════════════════
  // ─── VALIDATION ───────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  /**
   * Validate and sanitize an agent object.
   * @param {Object} agent - Raw agent data.
   * @returns {Object|null} Sanitized agent or null if invalid.
   */
  function validateAgent(agent) {
    if (!agent || typeof agent !== 'object') return null;
    if (typeof agent.id !== 'string' || agent.id.length === 0) return null;
    if (typeof agent.name !== 'string' || agent.name.length === 0) return null;

    return {
      id: agent.id.slice(0, MAX_NAME_LENGTH),
      name: agent.name.slice(0, MAX_NAME_LENGTH),
      role: typeof agent.role === 'string' ? agent.role.slice(0, MAX_NAME_LENGTH) : 'Agent',
      emoji: typeof agent.emoji === 'string' ? agent.emoji.slice(0, 8) : '🤖',
      sprite: typeof agent.sprite === 'string' ? agent.sprite.slice(0, 128) : '',
      xp: typeof agent.xp === 'number' && !isNaN(agent.xp) ? Math.max(0, Math.floor(agent.xp)) : 0,
      level: typeof agent.level === 'number' && !isNaN(agent.level) ? Math.max(1, Math.floor(agent.level)) : 1
    };
  }

  /**
   * Validate and sanitize a mission object.
   * @param {Object} mission - Raw mission data.
   * @returns {Object|null} Sanitized mission or null if invalid.
   */
  function validateMission(mission) {
    if (!mission || typeof mission !== 'object') return null;
    if (typeof mission.title !== 'string' || mission.title.length === 0) return null;

    var validStatuses = [MISSION_STATUS.PENDING, MISSION_STATUS.ACTIVE, MISSION_STATUS.COMPLETED, MISSION_STATUS.FAILED];
    var status = validStatuses.indexOf(mission.status) !== -1 ? mission.status : MISSION_STATUS.PENDING;

    return {
      id: typeof mission.id === 'string' ? mission.id.slice(0, MAX_NAME_LENGTH) : uid('mission'),
      title: mission.title.slice(0, MAX_TITLE_LENGTH),
      status: status,
      reward: typeof mission.reward === 'number' && !isNaN(mission.reward) ? Math.max(0, Math.floor(mission.reward)) : 50,
      assignedTo: Array.isArray(mission.assignedTo) ? mission.assignedTo.filter(function (id) { return typeof id === 'string'; }).slice(0, MAX_AGENTS) : [],
      createdAt: typeof mission.createdAt === 'string' ? mission.createdAt : new Date().toISOString(),
      completedAt: typeof mission.completedAt === 'string' ? mission.completedAt : null
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // ─── IFRAME COMMUNICATION ─────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  /**
   * Send a postMessage to the active theme iframe.
   * @param {Object} msg - Message payload. Wrapped in spawnkit:sync envelope.
   */
  function postToTheme(msg) {
    if (!_themeIframe || typeof _themeIframe.contentWindow === 'undefined') return;
    if (!msg || typeof msg !== 'object') return;

    var envelope = {
      type: 'spawnkit:sync',
      payload: msg
    };

    try {
      _themeIframe.contentWindow.postMessage(envelope, '*');
    } catch (_e) {
      // Cross-origin or iframe not ready — silent
    }
  }

  /**
   * Push full agent state to the active theme iframe.
   */
  function syncAgentsToTheme() {
    postToTheme({
      action: 'agentSync',
      data: { agents: _state.agents.slice() }
    });
  }

  /**
   * Handle incoming postMessage from theme iframes.
   * @param {MessageEvent} event - Browser message event.
   */
  function handleThemeMessage(event) {
    // Origin validation
    if (_allowedOrigins.length > 0) {
      var originAllowed = false;
      for (var i = 0; i < _allowedOrigins.length; i++) {
        if (event.origin === _allowedOrigins[i]) {
          originAllowed = true;
          break;
        }
      }
      // Also allow same-origin
      if (!originAllowed && event.origin !== location.origin) return;
    }

    var data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type !== 'spawnkit:request') return;

    var payload = data.payload;
    if (!payload || typeof payload !== 'object') return;

    switch (payload.action) {
      case 'getAgents':
        postToTheme({ action: 'agentSync', data: { agents: _state.agents.slice() } });
        break;
      case 'getState':
        postToTheme({ action: 'stateSync', data: SpawnKitDashboard.getState() });
        break;
      case 'awardXP':
        if (payload.data && typeof payload.data.agentId === 'string' && typeof payload.data.amount === 'number') {
          SpawnKitDashboard.awardXP(payload.data.agentId, payload.data.amount);
        }
        break;
      default:
        break;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ─── PUBLIC API ───────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  var SpawnKitDashboard = {

    // ── Initialization ──────────────────────────────────────────

    /**
     * Initialize the dashboard controller. Loads persisted state from
     * localStorage, sets up the iframe message listener, and emits
     * initial events.
     *
     * @param {Object} [options] - Configuration overrides.
     * @param {HTMLIFrameElement} [options.iframe] - Reference to the theme iframe element.
     * @param {string[]} [options.allowedOrigins] - Whitelist of origins for postMessage.
     * @param {string} [options.defaultTheme] - Default theme ID if none persisted.
     * @returns {Object} The initial state snapshot.
     */
    init: function init(options) {
      var opts = options || {};

      // Set iframe reference
      if (opts.iframe && opts.iframe.contentWindow) {
        _themeIframe = opts.iframe;
      }

      // Set allowed origins
      if (Array.isArray(opts.allowedOrigins)) {
        _allowedOrigins = opts.allowedOrigins.filter(function (o) { return typeof o === 'string'; });
      }

      // Load theme
      var savedTheme = storageGetString(STORAGE_KEYS.theme, opts.defaultTheme || 'gameboy');
      _state.currentTheme = THEMES[savedTheme] ? savedTheme : 'gameboy';

      // Load sidebar
      var savedSidebar = storageGetString(STORAGE_KEYS.sidebar, 'true');
      _state.sidebarOpen = savedSidebar !== 'false';

      // Load agents
      _state.agents = SpawnKitDashboard.loadAgents();

      // Load missions
      _state.missions = SpawnKitDashboard.loadMissions();

      // Bind message listener
      if (typeof window !== 'undefined' && !_messageHandler) {
        _messageHandler = handleThemeMessage;
        window.addEventListener('message', _messageHandler);
      }

      _initialized = true;

      console.log('[SpawnKitDashboard] Initialized — theme:', _state.currentTheme, '| agents:', _state.agents.length, '| missions:', _state.missions.length);

      return SpawnKitDashboard.getState();
    },

    // ── Theme Management ────────────────────────────────────────

    /**
     * Switch the active theme. Persists the choice, emits `themeChanged`,
     * and notifies the iframe.
     *
     * @param {string} themeId - Theme identifier (e.g. 'gameboy', 'sims').
     * @returns {boolean} True if theme was changed, false if invalid or same.
     */
    selectTheme: function selectTheme(themeId) {
      if (typeof themeId !== 'string') return false;
      if (!THEMES[themeId]) return false;
      if (themeId === _state.currentTheme) return false;

      var oldTheme = _state.currentTheme;
      _state.currentTheme = themeId;
      persistTheme();

      var eventData = {
        themeId: themeId,
        themeName: THEMES[themeId].name,
        previousTheme: oldTheme
      };

      emitEvent('themeChanged', eventData);
      postToTheme({ action: 'themeChanged', data: eventData });

      // Integrate with global theme-switcher if available
      if (typeof global.switchTheme === 'function') {
        global.switchTheme(themeId);
      }

      return true;
    },

    /**
     * Get the current theme metadata.
     * @returns {Object} Theme object with id, name, path, emoji, color.
     */
    getCurrentTheme: function getCurrentTheme() {
      return Object.assign({}, THEMES[_state.currentTheme] || THEMES.gameboy);
    },

    /**
     * Get all available themes.
     * @returns {Object} Map of themeId → theme metadata.
     */
    getThemes: function getThemes() {
      var copy = {};
      for (var key in THEMES) {
        if (THEMES.hasOwnProperty(key)) {
          copy[key] = Object.assign({}, THEMES[key]);
        }
      }
      return copy;
    },

    // ── Sidebar ─────────────────────────────────────────────────

    /**
     * Toggle the sidebar open/closed state. Persists and emits `sidebarToggled`.
     *
     * @returns {boolean} The new sidebar state (true = open).
     */
    toggleSidebar: function toggleSidebar() {
      _state.sidebarOpen = !_state.sidebarOpen;
      persistSidebar();

      var eventData = { open: _state.sidebarOpen };
      emitEvent('sidebarToggled', eventData);
      postToTheme({ action: 'sidebarToggled', data: eventData });

      return _state.sidebarOpen;
    },

    // ── Agent Management ────────────────────────────────────────

    /**
     * Load agents from localStorage or return the default roster.
     * Recalculates levels from stored XP to ensure consistency.
     *
     * @returns {Object[]} Array of agent objects.
     */
    loadAgents: function loadAgents() {
      var saved = storageGet(STORAGE_KEYS.agents, null);

      if (Array.isArray(saved) && saved.length > 0) {
        var agents = [];
        for (var i = 0; i < saved.length && i < MAX_AGENTS; i++) {
          var valid = validateAgent(saved[i]);
          if (valid) {
            // Recalculate level from XP to ensure consistency
            valid.level = getLevel(valid.xp);
            agents.push(valid);
          }
        }
        if (agents.length > 0) {
          _state.agents = agents;
          return agents;
        }
      }

      // Return deep copy of defaults
      _state.agents = DEFAULT_AGENTS.map(function (a) { return Object.assign({}, a); });
      persistAgents();
      return _state.agents;
    },

    /**
     * Add a new agent to the roster. Persists and emits `agentUpdated`.
     *
     * @param {Object} agentData - Agent data. Must include `id` and `name`.
     * @returns {Object|null} The added agent, or null if invalid/duplicate/at capacity.
     */
    addAgent: function addAgent(agentData) {
      if (_state.agents.length >= MAX_AGENTS) return null;

      var agent = validateAgent(agentData);
      if (!agent) return null;

      // Check for duplicate ID
      for (var i = 0; i < _state.agents.length; i++) {
        if (_state.agents[i].id === agent.id) return null;
      }

      agent.level = getLevel(agent.xp);
      _state.agents.push(agent);
      persistAgents();

      emitEvent('agentUpdated', { agents: _state.agents.slice() });
      syncAgentsToTheme();

      return Object.assign({}, agent);
    },

    /**
     * Remove an agent from the roster by ID. Persists and emits `agentUpdated`.
     *
     * @param {string} agentId - ID of the agent to remove.
     * @returns {boolean} True if removed, false if not found.
     */
    removeAgent: function removeAgent(agentId) {
      if (typeof agentId !== 'string') return false;

      var index = -1;
      for (var i = 0; i < _state.agents.length; i++) {
        if (_state.agents[i].id === agentId) {
          index = i;
          break;
        }
      }
      if (index === -1) return false;

      _state.agents.splice(index, 1);
      persistAgents();

      emitEvent('agentUpdated', { agents: _state.agents.slice() });
      syncAgentsToTheme();

      return true;
    },

    /**
     * Find an agent by ID.
     *
     * @param {string} agentId - Agent ID.
     * @returns {Object|null} Agent copy or null.
     */
    getAgent: function getAgent(agentId) {
      if (typeof agentId !== 'string') return null;
      for (var i = 0; i < _state.agents.length; i++) {
        if (_state.agents[i].id === agentId) {
          return Object.assign({}, _state.agents[i]);
        }
      }
      return null;
    },

    // ── XP & Leveling ───────────────────────────────────────────

    /**
     * Award XP to an agent. Automatically recalculates level and emits
     * `agentLevelUp` if the agent crosses a level threshold.
     *
     * @param {string} agentId - ID of the agent.
     * @param {number} amount - XP to award (must be positive).
     * @returns {Object|null} Updated agent copy, or null if not found / invalid amount.
     */
    awardXP: function awardXP(agentId, amount) {
      if (typeof agentId !== 'string') return null;
      if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) return null;

      var agent = null;
      for (var i = 0; i < _state.agents.length; i++) {
        if (_state.agents[i].id === agentId) {
          agent = _state.agents[i];
          break;
        }
      }
      if (!agent) return null;

      var oldLevel = agent.level;
      agent.xp += Math.floor(amount);
      agent.level = getLevel(agent.xp);

      persistAgents();

      // Emit agent update
      emitEvent('agentUpdated', { agents: _state.agents.slice() });

      // Check for level-up
      if (agent.level > oldLevel) {
        var levelUpData = {
          agent: Object.assign({}, agent),
          oldLevel: oldLevel,
          newLevel: agent.level
        };
        emitEvent('agentLevelUp', levelUpData);
        postToTheme({ action: 'agentLevelUp', data: levelUpData });
      }

      syncAgentsToTheme();

      return Object.assign({}, agent);
    },

    /**
     * Calculate level from XP. Pure utility function.
     *
     * @param {number} xp - Experience points.
     * @returns {number} Level (1-based).
     */
    getLevel: getLevel,

    /**
     * Get the XP threshold for a given level.
     *
     * @param {number} level - Target level.
     * @returns {number} XP required to reach that level.
     */
    xpForLevel: xpForLevel,

    // ── Mission Board ───────────────────────────────────────────

    /**
     * Load missions from localStorage or return an empty array.
     *
     * @returns {Object[]} Array of mission objects.
     */
    loadMissions: function loadMissions() {
      var saved = storageGet(STORAGE_KEYS.missions, null);

      if (Array.isArray(saved)) {
        var missions = [];
        for (var i = 0; i < saved.length && i < MAX_MISSIONS; i++) {
          var valid = validateMission(saved[i]);
          if (valid) missions.push(valid);
        }
        _state.missions = missions;
        return missions;
      }

      _state.missions = [];
      return _state.missions;
    },

    /**
     * Create a new mission and add it to the board. Persists and emits `missionCreated`.
     *
     * @param {Object} missionData - Mission data. Must include `title`.
     * @param {string} missionData.title - Mission title.
     * @param {number} [missionData.reward=50] - XP reward on completion.
     * @param {string[]} [missionData.assignedTo] - Agent IDs.
     * @returns {Object|null} The created mission, or null if invalid/at capacity.
     */
    createMission: function createMission(missionData) {
      if (_state.missions.length >= MAX_MISSIONS) return null;

      var raw = Object.assign({}, missionData, { id: uid('mission'), createdAt: new Date().toISOString() });
      var mission = validateMission(raw);
      if (!mission) return null;

      mission.status = MISSION_STATUS.ACTIVE;
      _state.missions.push(mission);
      persistMissions();

      emitEvent('missionCreated', { mission: Object.assign({}, mission) });
      postToTheme({ action: 'missionUpdate', data: { mission: Object.assign({}, mission), type: 'created' } });

      // Trigger MissionController animation if available
      if (typeof MissionController !== 'undefined' && typeof MissionController.executeMission === 'function') {
        MissionController.executeMission({
          id: mission.id,
          text: mission.title,
          assignedTo: mission.assignedTo,
          priority: 'normal'
        });
      }

      return Object.assign({}, mission);
    },

    /**
     * Complete a mission. Awards XP to assigned agents, checks achievements,
     * persists and emits `missionComplete`.
     *
     * @param {string} missionId - ID of the mission to complete.
     * @returns {Object|null} The completed mission, or null if not found / already done.
     */
    completeMission: function completeMission(missionId) {
      if (typeof missionId !== 'string') return null;

      var mission = null;
      for (var i = 0; i < _state.missions.length; i++) {
        if (_state.missions[i].id === missionId) {
          mission = _state.missions[i];
          break;
        }
      }
      if (!mission) return null;
      if (mission.status === MISSION_STATUS.COMPLETED) return null;

      mission.status = MISSION_STATUS.COMPLETED;
      mission.completedAt = new Date().toISOString();
      persistMissions();

      // Award XP to assigned agents
      var xpAwarded = {};
      var reward = mission.reward || 50;
      for (var j = 0; j < mission.assignedTo.length; j++) {
        var result = SpawnKitDashboard.awardXP(mission.assignedTo[j], reward);
        if (result) {
          xpAwarded[mission.assignedTo[j]] = reward;
        }
      }

      var eventData = {
        mission: Object.assign({}, mission),
        xpAwarded: xpAwarded,
        assignedTo: mission.assignedTo.slice()
      };

      emitEvent('missionComplete', eventData);
      postToTheme({ action: 'missionUpdate', data: { mission: Object.assign({}, mission), type: 'completed' } });

      // Notify achievements system via FleetKit bus
      emitEvent('mission:complete', {
        missionId: mission.id,
        assignedTo: mission.assignedTo.slice()
      });

      return Object.assign({}, mission);
    },

    /**
     * Get a mission by ID.
     *
     * @param {string} missionId - Mission ID.
     * @returns {Object|null} Mission copy or null.
     */
    getMission: function getMission(missionId) {
      if (typeof missionId !== 'string') return null;
      for (var i = 0; i < _state.missions.length; i++) {
        if (_state.missions[i].id === missionId) {
          return Object.assign({}, _state.missions[i]);
        }
      }
      return null;
    },

    // ── iframe Communication ────────────────────────────────────

    /**
     * Send a message to the active theme iframe.
     *
     * @param {Object} msg - Message payload. Wrapped in `{ type: 'spawnkit:sync', payload: msg }`.
     */
    postToTheme: postToTheme,

    /**
     * Push the full agent roster to the active theme iframe.
     */
    syncAgentsToTheme: syncAgentsToTheme,

    /**
     * Set or update the iframe reference used for postMessage communication.
     *
     * @param {HTMLIFrameElement} iframe - The iframe element.
     */
    setIframe: function setIframe(iframe) {
      if (iframe && typeof iframe === 'object' && iframe.contentWindow) {
        _themeIframe = iframe;
      }
    },

    // ── State Access ────────────────────────────────────────────

    /**
     * Get a full snapshot of the current dashboard state.
     *
     * @returns {Object} Deep-ish copy of the state.
     */
    getState: function getState() {
      return {
        currentTheme: _state.currentTheme,
        sidebarOpen: _state.sidebarOpen,
        agents: _state.agents.map(function (a) { return Object.assign({}, a); }),
        missions: _state.missions.map(function (m) { return Object.assign({}, m); }),
        initialized: _initialized,
        themeCount: Object.keys(THEMES).length,
        themeMeta: SpawnKitDashboard.getCurrentTheme()
      };
    },

    // ── Cleanup ─────────────────────────────────────────────────

    /**
     * Remove event listeners and reset internal references. Call when
     * tearing down the dashboard (e.g. page unload, SPA navigation).
     */
    destroy: function destroy() {
      if (_messageHandler && typeof window !== 'undefined') {
        window.removeEventListener('message', _messageHandler);
        _messageHandler = null;
      }
      _themeIframe = null;
      _allowedOrigins = [];
      _initialized = false;
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // ─── EXPOSE GLOBALLY ──────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  global.SpawnKitDashboard = SpawnKitDashboard;

  // ═══════════════════════════════════════════════════════════════
  // ─── AUTO-INITIALIZE ──────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  if (typeof document !== 'undefined') {
    var autoInit = function () {
      // Only auto-init if not already initialized (consumer may call init() manually)
      if (!_initialized) {
        SpawnKitDashboard.init();
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', autoInit);
    } else {
      autoInit();
    }
  }

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));

// Export for Node.js / module bundlers
if (typeof module !== 'undefined' && module.exports) {
  module.exports = (typeof window !== 'undefined') ? window.SpawnKitDashboard : SpawnKitDashboard;
}
