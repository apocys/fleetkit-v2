/**
 * SpawnKit Dashboard Controller
 * Manages theme loading, sidebar state, agent data, and iframe communication.
 *
 * @module SpawnKitDashboard
 */

const STORAGE_KEYS = {
  THEME: 'spawnkit_theme',
  AGENTS: 'spawnkit_agents',
  MISSIONS: 'spawnkit_missions',
  ACHIEVEMENTS: 'spawnkit_achievements',
};

const XP_PER_LEVEL = 100;
const MISSION_XP_REWARD = 25;

/* -------------------------------------------------------------------------- */
/*  Simple Event Emitter mixin                                                */
/* -------------------------------------------------------------------------- */

const EventEmitter = {
  _listeners: {},

  /**
   * Register an event listener.
   * @param {string} event
   * @param {Function} fn
   */
  on(event, fn) {
    if (typeof fn !== 'function') return;
    (this._listeners[event] ??= []).push(fn);
  },

  /**
   * Remove an event listener.
   * @param {string} event
   * @param {Function} fn
   */
  off(event, fn) {
    const list = this._listeners[event];
    if (!list) return;
    this._listeners[event] = list.filter((f) => f !== fn);
  },

  /**
   * Emit an event with optional payload.
   * @param {string} event
   * @param {*} data
   */
  emit(event, data) {
    const list = this._listeners[event];
    if (!list) return;
    for (const fn of list) {
      try {
        fn(data);
      } catch (err) {
        console.error(`[SpawnKit] listener error on "${event}":`, err);
      }
    }
  },
};

/* -------------------------------------------------------------------------- */
/*  Dashboard Controller                                                      */
/* -------------------------------------------------------------------------- */

const SpawnKitDashboard = {
  ...EventEmitter,

  // ---- state ---------------------------------------------------------------
  currentTheme: null,
  sidebarOpen: false,
  agents: [],
  missions: [],
  achievements: [],

  /* ======================================================================== */
  /*  Initialisation                                                          */
  /* ======================================================================== */

  /**
   * Initialise the dashboard — restore persisted state, bind global listeners.
   * Call once when the host page loads.
   */
  init() {
    this.load();
    window.addEventListener('message', (e) => this.handleThemeMessage(e));
    this.emit('init');
  },

  /* ======================================================================== */
  /*  Theme management                                                        */
  /* ======================================================================== */

  /**
   * Select and activate a theme for the first time (from the theme selector).
   * @param {string} themeId — identifier such as "cyberpunk", "retro", "minimal"
   */
  selectTheme(themeId) {
    if (!themeId || typeof themeId !== 'string') {
      console.warn('[SpawnKit] selectTheme: invalid themeId');
      return;
    }
    this.currentTheme = themeId;
    this._saveItem(STORAGE_KEYS.THEME, themeId);
    this._loadThemeIframe(themeId);
    this.emit('themeSelected', themeId);
  },

  /**
   * Switch to a different theme without a full page reload.
   * @param {string} themeId
   */
  switchTheme(themeId) {
    if (!themeId || typeof themeId !== 'string') return;
    if (themeId === this.currentTheme) return;
    this.selectTheme(themeId);
    this.syncAgentsToTheme();
    this.emit('themeSwitched', themeId);
  },

  /**
   * Return the iframe src path for a given theme.
   * @param {string} themeId
   * @returns {string}
   */
  getThemePath(themeId) {
    return `themes/${themeId}/index.html`;
  },

  /** @private */
  _loadThemeIframe(themeId) {
    const container = document.getElementById('theme-container');
    if (!container) return;
    container.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.id = 'theme-iframe';
    iframe.src = this.getThemePath(themeId);
    iframe.style.cssText = 'width:100%;height:100%;border:none;';
    container.appendChild(iframe);

    // Once the iframe is ready, push current agent data
    iframe.addEventListener('load', () => this.syncAgentsToTheme());

    // Hide theme-selector if present
    const selector = document.getElementById('theme-selector');
    if (selector) selector.style.display = 'none';
  },

  /* ======================================================================== */
  /*  Sidebar                                                                 */
  /* ======================================================================== */

  /** Toggle the sidebar open/closed with a CSS-class animation. */
  toggleSidebar() {
    this.sidebarOpen ? this.closeSidebar() : this.openSidebar();
  },

  /** Open the sidebar. */
  openSidebar() {
    this.sidebarOpen = true;
    document.getElementById('sidebar')?.classList.add('open');
    this.emit('sidebarToggled', true);
  },

  /** Close the sidebar. */
  closeSidebar() {
    this.sidebarOpen = false;
    document.getElementById('sidebar')?.classList.remove('open');
    this.emit('sidebarToggled', false);
  },

  /* ======================================================================== */
  /*  Agent management                                                        */
  /* ======================================================================== */

  /**
   * Load agents from localStorage (or seed with defaults).
   * @returns {Array<Object>}
   */
  loadAgents() {
    const stored = this._loadItem(STORAGE_KEYS.AGENTS);
    this.agents = Array.isArray(stored) && stored.length ? stored : this.getDefaultAgents();
    this._saveItem(STORAGE_KEYS.AGENTS, this.agents);
    this.emit('agentsLoaded', this.agents);
    return this.agents;
  },

  /**
   * Add a new agent and persist.
   * @param {{ name: string, role: string, sprite?: string }} config
   * @returns {Object} the created agent
   */
  addAgent(config) {
    if (!config?.name || !config?.role) {
      console.warn('[SpawnKit] addAgent: name and role are required');
      return null;
    }
    const agent = {
      id: `agent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: config.name,
      role: config.role,
      sprite: config.sprite || '🤖',
      xp: 0,
      level: 1,
      achievements: [],
      createdAt: new Date().toISOString(),
    };
    this.agents.push(agent);
    this._saveItem(STORAGE_KEYS.AGENTS, this.agents);
    this.syncAgentsToTheme();
    this.emit('agentAdded', agent);
    return agent;
  },

  /**
   * Remove an agent by id (with confirmation callback).
   * @param {string} id
   * @param {boolean} [confirmed=false] — skip confirmation when true
   * @returns {boolean}
   */
  removeAgent(id, confirmed = false) {
    if (!id) return false;
    if (!confirmed && typeof window !== 'undefined') {
      const agent = this.getAgentById(id);
      if (!window.confirm(`Remove agent "${agent?.name ?? id}"?`)) return false;
    }
    const idx = this.agents.findIndex((a) => a.id === id);
    if (idx === -1) return false;
    const [removed] = this.agents.splice(idx, 1);
    this._saveItem(STORAGE_KEYS.AGENTS, this.agents);
    this.syncAgentsToTheme();
    this.emit('agentRemoved', removed);
    return true;
  },

  /**
   * Find an agent by id.
   * @param {string} id
   * @returns {Object|undefined}
   */
  getAgentById(id) {
    return this.agents.find((a) => a.id === id);
  },

  /**
   * Return three starter agents.
   * @returns {Array<Object>}
   */
  getDefaultAgents() {
    const now = new Date().toISOString();
    return [
      { id: 'agent_default_1', name: 'Kai',   role: 'Scout',    sprite: '🐺', xp: 0, level: 1, achievements: [], createdAt: now },
      { id: 'agent_default_2', name: 'Nova',  role: 'Engineer', sprite: '🦊', xp: 0, level: 1, achievements: [], createdAt: now },
      { id: 'agent_default_3', name: 'Lyra',  role: 'Medic',    sprite: '🦉', xp: 0, level: 1, achievements: [], createdAt: now },
    ];
  },

  /* ======================================================================== */
  /*  Missions                                                                */
  /* ======================================================================== */

  /**
   * Load missions from localStorage.
   * @returns {Array<Object>}
   */
  loadMissions() {
    this.missions = this._loadItem(STORAGE_KEYS.MISSIONS) || [];
    this.emit('missionsLoaded', this.missions);
    return this.missions;
  },

  /**
   * Create a new mission.
   * @param {string} title
   * @param {string} [description='']
   * @returns {Object} the created mission
   */
  createMission(title, description = '') {
    if (!title || typeof title !== 'string') {
      console.warn('[SpawnKit] createMission: title is required');
      return null;
    }
    const mission = {
      id: `mission_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title,
      description,
      status: 'active',
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    this.missions.push(mission);
    this._saveItem(STORAGE_KEYS.MISSIONS, this.missions);
    this.emit('missionCreated', mission);
    return mission;
  },

  /**
   * Mark a mission complete and award XP to the first agent.
   * @param {string} id
   * @returns {boolean}
   */
  completeMission(id) {
    const mission = this.missions.find((m) => m.id === id);
    if (!mission || mission.status === 'complete') return false;
    mission.status = 'complete';
    mission.completedAt = new Date().toISOString();
    this._saveItem(STORAGE_KEYS.MISSIONS, this.missions);

    // Award XP to first agent as a default recipient
    if (this.agents.length) {
      this.awardXP(this.agents[0].id, MISSION_XP_REWARD);
    }
    this.emit('missionCompleted', mission);
    return true;
  },

  /* ======================================================================== */
  /*  XP & Achievements                                                       */
  /* ======================================================================== */

  /**
   * Award XP to an agent and check for level-ups.
   * @param {string} agentId
   * @param {number} amount — must be a positive integer
   */
  awardXP(agentId, amount) {
    if (!agentId || typeof amount !== 'number' || amount <= 0) return;
    const agent = this.getAgentById(agentId);
    if (!agent) return;

    const prevLevel = agent.level;
    agent.xp += Math.floor(amount);
    agent.level = this.getLevel(agent.xp);
    this._saveItem(STORAGE_KEYS.AGENTS, this.agents);

    this.emit('xpAwarded', { agentId, amount, totalXP: agent.xp });
    if (agent.level > prevLevel) {
      this.emit('levelUp', { agentId, newLevel: agent.level });
    }
    this.checkAchievements();
    this.syncAgentsToTheme();
  },

  /**
   * Calculate level from cumulative XP.
   * @param {number} xp
   * @returns {number}
   */
  getLevel(xp) {
    return Math.max(1, Math.floor((xp || 0) / XP_PER_LEVEL) + 1);
  },

  /**
   * Check all agents for newly unlocked achievements and persist.
   */
  checkAchievements() {
    const definitions = [
      { id: 'first_blood',  check: (a) => a.xp >= 1,                label: 'First Blood — Earned first XP' },
      { id: 'level_5',      check: (a) => a.level >= 5,             label: 'Veteran — Reached level 5' },
      { id: 'level_10',     check: (a) => a.level >= 10,            label: 'Elite — Reached level 10' },
      { id: 'centurion',    check: (a) => a.xp >= 1000,             label: 'Centurion — 1 000 XP' },
    ];

    let changed = false;
    for (const agent of this.agents) {
      for (const def of definitions) {
        if (!agent.achievements.includes(def.id) && def.check(agent)) {
          agent.achievements.push(def.id);
          changed = true;
          this.emit('achievementUnlocked', { agentId: agent.id, achievement: def });
        }
      }
    }
    if (changed) {
      this._saveItem(STORAGE_KEYS.AGENTS, this.agents);
    }
  },

  /* ======================================================================== */
  /*  Iframe communication                                                    */
  /* ======================================================================== */

  /**
   * Send a structured message to the active theme iframe.
   * @param {{ type: string, [key: string]: * }} message
   */
  postToTheme(message) {
    if (!message || typeof message !== 'object') return;
    const iframe = document.getElementById('theme-iframe');
    if (!iframe?.contentWindow) return;
    try {
      iframe.contentWindow.postMessage({ source: 'spawnkit', ...message }, '*');
    } catch (err) {
      console.error('[SpawnKit] postToTheme failed:', err);
    }
  },

  /**
   * Handle incoming postMessage events from theme iframes.
   * @param {MessageEvent} event
   */
  handleThemeMessage(event) {
    const data = event.data;
    if (!data || data.source !== 'spawnkit-theme') return;

    switch (data.type) {
      case 'themeReady':
        this.syncAgentsToTheme();
        break;
      case 'requestAgents':
        this.syncAgentsToTheme();
        break;
      case 'awardXP':
        if (data.agentId && data.amount) this.awardXP(data.agentId, data.amount);
        break;
      case 'createMission':
        if (data.title) this.createMission(data.title, data.description);
        break;
      default:
        this.emit('themeMessage', data);
    }
  },

  /**
   * Push the current agent roster to the active theme iframe.
   */
  syncAgentsToTheme() {
    this.postToTheme({ type: 'agentSync', agents: this.agents });
  },

  /* ======================================================================== */
  /*  Persistence helpers                                                     */
  /* ======================================================================== */

  /** Persist all dashboard state to localStorage. */
  save() {
    this._saveItem(STORAGE_KEYS.THEME, this.currentTheme);
    this._saveItem(STORAGE_KEYS.AGENTS, this.agents);
    this._saveItem(STORAGE_KEYS.MISSIONS, this.missions);
  },

  /** Restore all dashboard state from localStorage. */
  load() {
    this.currentTheme = this._loadItem(STORAGE_KEYS.THEME) || null;
    this.loadAgents();
    this.loadMissions();
  },

  /** @private */
  _saveItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`[SpawnKit] Failed to save "${key}":`, err);
    }
  },

  /** @private */
  _loadItem(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.error(`[SpawnKit] Failed to load "${key}":`, err);
      return null;
    }
  },
};
