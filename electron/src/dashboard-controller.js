/**
 * SpawnKit Dashboard Controller
 * Central logic: themes, agent CRUD, XP/levels, missions, sidebar, iframe comms, events.
 * All localStorage in try/catch. All public methods validate inputs. Null-safe throughout.
 * @module SpawnKitDashboard
 * @version 3.0.0
 */
(function (root) {
  'use strict';

  var STORAGE_KEY = 'spawnkit-state';
  var THEMES = {
    'gameboy':       { name: 'GameBoy',       path: './office-gameboy/index.html',       emoji: '🎮', accent: '#9BBB0F' },
    'gameboy-color': { name: 'GameBoy Color', path: './office-gameboy-color/index.html', emoji: '🌈', accent: '#53868B' },
    'sims':          { name: 'The Sims',      path: './office-sims/index.html',          emoji: '💎', accent: '#E2C275' }
  };
  var XP_K = 50, MAX_AG = 20, MAX_MI = 100, MAX_N = 64, MAX_D = 256, PFX = 'spawnkit:';
  var _s = { theme: null, sidebarOpen: false, agents: [], missions: [], visited: false };
  var _h = {}, _iframe = null, _th = [], _ml = null, _init = false;

  // ── Helpers ──
  function clip(s, n) { return typeof s === 'string' ? s.slice(0, n) : ''; }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function isS(v) { return typeof v === 'string' && v.length > 0; }
  function isN(v) { return typeof v === 'number' && !isNaN(v); }

  // ── Persistence ──
  /** @returns {boolean} True if save succeeded */
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: _s.theme, sidebarOpen: _s.sidebarOpen, agents: _s.agents, missions: _s.missions, visited: _s.visited })); A.emit('state:save', {}); return true; }
    catch (_) { return false; }
  }
  /** @returns {boolean} True if load succeeded */
  function load() {
    try {
      var r = localStorage.getItem(STORAGE_KEY); if (!r) return false;
      var d = JSON.parse(r); if (!d || typeof d !== 'object') return false;
      if (isS(d.theme) && THEMES[d.theme]) _s.theme = d.theme;
      if (typeof d.sidebarOpen === 'boolean') _s.sidebarOpen = d.sidebarOpen;
      if (typeof d.visited === 'boolean') _s.visited = d.visited;
      if (Array.isArray(d.agents)) { _s.agents = []; for (var i = 0; i < d.agents.length && i < MAX_AG; i++) { var a = valAg(d.agents[i]); if (a) _s.agents.push(a); } }
      if (Array.isArray(d.missions)) { _s.missions = []; for (var j = 0; j < d.missions.length && j < MAX_MI; j++) { var m = valMi(d.missions[j]); if (m) _s.missions.push(m); } }
      A.emit('state:load', {}); return true;
    } catch (_) { return false; }
  }

  // ── Validation ──
  function valAg(r) {
    if (!r || typeof r !== 'object' || !isS(r.name)) return null;
    return { id: isS(r.id) ? clip(r.id, MAX_N) : uid(), name: clip(r.name, MAX_N), role: clip(r.role || 'Agent', MAX_N), sprite: clip(r.sprite || '🤖', 128), xp: isN(r.xp) ? Math.max(0, Math.floor(r.xp)) : 0 };
  }
  function valMi(r) {
    if (!r || typeof r !== 'object' || !isS(r.title)) return null;
    return { id: isS(r.id) ? clip(r.id, MAX_N) : uid(), title: clip(r.title, MAX_D), desc: clip(r.desc || '', MAX_D), assignee: isS(r.assignee) ? clip(r.assignee, MAX_N) : null, status: r.status === 'done' ? 'done' : 'active', reward: isN(r.reward) ? Math.max(0, Math.floor(r.reward)) : 50, createdAt: isS(r.createdAt) ? r.createdAt : new Date().toISOString(), completedAt: isS(r.completedAt) ? r.completedAt : null };
  }
  function findAg(id) { for (var i = 0; i < _s.agents.length; i++) if (_s.agents[i].id === id) return i; return -1; }
  function cp(o) { return Object.assign({}, o); }
  function agSnap() { return _s.agents.map(cp); }
  function miSnap() { return _s.missions.map(cp); }

  // ── XP / Levels ──
  /** @param {number} xp @returns {number} Level (min 1). Curve: threshold(L)=50·L·(L-1) */
  function getLevel(xp) { if (!isN(xp) || xp < 0) return 1; return Math.max(1, Math.floor((1 + Math.sqrt(1 + xp / (XP_K / 4))) / 2)); }
  /** @param {number} xp @returns {{ level:number, current:number, needed:number, percent:number }} */
  function getLevelProgress(xp) {
    if (!isN(xp) || xp < 0) xp = 0;
    var l = getLevel(xp), lo = XP_K * l * (l - 1), hi = XP_K * (l + 1) * l, cur = xp - lo, need = hi - lo;
    return { level: l, current: cur, needed: need, percent: need > 0 ? Math.round(cur / need * 100) : 100 };
  }

  // ── Iframe comms ──
  /** @param {Object} msg Payload to send to theme iframe */
  function postToTheme(msg) {
    if (!_iframe || !msg || typeof msg !== 'object') return;
    try { _iframe.contentWindow && _iframe.contentWindow.postMessage({ type: PFX + 'sync', payload: msg }, location.origin); } catch (_) {}
  }
  function onMsg(e) {
    if (e.origin !== location.origin) return;
    var d = e && e.data; if (!d || typeof d !== 'object' || typeof d.type !== 'string' || d.type.indexOf(PFX) !== 0) return;
    for (var i = 0; i < _th.length; i++) { try { _th[i](d.payload || d, e); } catch (_) {} }
    var p = d.payload; if (!p || typeof p !== 'object') return;
    if (p.action === 'getAgents') postToTheme({ action: 'agentSync', agents: agSnap() });
    if (p.action === 'getState') A.syncState();
    if (p.action === 'awardXP' && p.agentId) A.awardXP(p.agentId, p.amount);
  }

  // ── Public API ──
  var A = {
    /** Initialize dashboard. Load state, setup listeners, detect first visit.
     * @param {Object} [opts] @param {HTMLIFrameElement} [opts.iframe] @param {string} [opts.defaultTheme]
     * @returns {{ theme:string, agents:number, missions:number, firstVisit:boolean }} */
    init: function (opts) {
      if (_init) return A.getState();
      opts = opts && typeof opts === 'object' ? opts : {};
      if (opts.iframe && opts.iframe.contentWindow) _iframe = opts.iframe;
      load();
      if (!_s.theme) _s.theme = (isS(opts.defaultTheme) && THEMES[opts.defaultTheme]) ? opts.defaultTheme : 'gameboy';
      var fv = !_s.visited; if (fv) { _s.visited = true; save(); }
      if (typeof window !== 'undefined' && !_ml) { _ml = onMsg; window.addEventListener('message', _ml); }
      _init = true; A.emit('init', { firstVisit: fv });
      return { theme: _s.theme, agents: _s.agents.length, missions: _s.missions.length, firstVisit: fv };
    },
    /** Tear down listeners and references. */
    destroy: function () {
      if (_ml && typeof window !== 'undefined') { window.removeEventListener('message', _ml); _ml = null; }
      _iframe = null; _th = []; _h = {}; _init = false;
    },

    // ── Theme ──
    /** Select a theme: save + load iframe. @param {string} id @returns {boolean} */
    selectTheme: function (id) {
      if (!isS(id) || !THEMES[id]) return false;
      var prev = _s.theme; _s.theme = id; save();
      if (_iframe) { try { _iframe.src = THEMES[id].path; } catch (_) {} }
      A.emit('theme:change', { id: id, name: THEMES[id].name, previous: prev }); return true;
    },
    /** Switch theme without full reload (no loading overlay). @param {string} id @returns {boolean} */
    switchTheme: function (id) {
      if (!isS(id) || !THEMES[id] || _s.theme === id) return false;
      var prev = _s.theme; _s.theme = id; save();
      if (_iframe) { try { _iframe.contentWindow.location.replace(THEMES[id].path); } catch (_) { try { _iframe.src = THEMES[id].path; } catch (_2) {} } }
      A.emit('theme:switch', { id: id, name: THEMES[id].name, previous: prev }); return true;
    },
    /** @returns {string|null} Active theme ID */
    getCurrentTheme: function () { return _s.theme || null; },
    /** @param {string} id @returns {string|null} Iframe URL path */
    getThemePath: function (id) { return (isS(id) && THEMES[id]) ? THEMES[id].path : null; },

    // ── Sidebar ──
    /** Toggle sidebar. @returns {boolean} New open state */
    toggleSidebar: function () { _s.sidebarOpen = !_s.sidebarOpen; save(); A.emit('sidebar:toggle', { open: _s.sidebarOpen }); return _s.sidebarOpen; },
    /** @returns {boolean} */
    isSidebarOpen: function () { return !!_s.sidebarOpen; },

    // ── Agents ──
    /** @returns {Object[]} All agents (copies) */
    getAgents: function () { return agSnap(); },
    /** @param {string} id @returns {Object|null} Agent copy */
    getAgent: function (id) { if (!isS(id)) return null; var i = findAg(id); return i >= 0 ? cp(_s.agents[i]) : null; },
    /** Create agent. @param {{ name:string, role?:string, sprite?:string }} data @returns {Object|null} */
    addAgent: function (data) {
      if (_s.agents.length >= MAX_AG) return null;
      var a = valAg(data); if (!a) return null;
      if (findAg(a.id) >= 0) return null;
      _s.agents.push(a); save();
      A.emit('agent:add', { agent: cp(a) }); postToTheme({ action: 'agentSync', agents: agSnap() }); return cp(a);
    },
    /** Partial update. @param {string} id @param {Object} patch @returns {Object|null} */
    updateAgent: function (id, patch) {
      if (!isS(id) || !patch || typeof patch !== 'object') return null;
      var i = findAg(id); if (i < 0) return null;
      var a = _s.agents[i];
      if (isS(patch.name)) a.name = clip(patch.name, MAX_N);
      if (isS(patch.role)) a.role = clip(patch.role, MAX_N);
      if (isS(patch.sprite)) a.sprite = clip(patch.sprite, 128);
      save(); A.emit('agent:update', { agent: cp(a) }); postToTheme({ action: 'agentSync', agents: agSnap() }); return cp(a);
    },
    /** @param {string} id @returns {boolean} */
    removeAgent: function (id) {
      if (!isS(id)) return false; var i = findAg(id); if (i < 0) return false;
      _s.agents.splice(i, 1); save(); A.emit('agent:remove', { id: id }); postToTheme({ action: 'agentSync', agents: agSnap() }); return true;
    },

    // ── XP / Levels ──
    /** Award XP to agent. @param {string} agentId @param {number} amount @returns {Object|null} */
    awardXP: function (agentId, amount) {
      if (!isS(agentId) || !isN(amount) || amount <= 0) return null;
      var i = findAg(agentId); if (i < 0) return null;
      var a = _s.agents[i], oldL = getLevel(a.xp);
      a.xp += Math.floor(amount); var newL = getLevel(a.xp); save();
      if (newL > oldL) { A.emit('agent:levelup', { agent: cp(a), oldLevel: oldL, newLevel: newL }); postToTheme({ action: 'agentLevelUp', agent: cp(a), oldLevel: oldL, newLevel: newL }); }
      A.emit('agent:update', { agent: cp(a) }); return cp(a);
    },
    /** @param {number} xp @returns {number} */
    getLevel: getLevel,
    /** @param {number} xp @returns {{ level:number, current:number, needed:number, percent:number }} */
    getLevelProgress: getLevelProgress,

    // ── Missions ──
    /** @returns {Object[]} All missions (copies) */
    getMissions: function () { return miSnap(); },
    /** Create mission. @param {{ title:string, desc?:string, assignee?:string }} data @returns {Object|null} */
    createMission: function (data) {
      if (_s.missions.length >= MAX_MI || !data || typeof data !== 'object') return null;
      var m = valMi({ id: uid(), title: data.title, desc: data.desc, assignee: data.assignee, reward: data.reward, createdAt: new Date().toISOString() });
      if (!m) return null; m.status = 'active';
      _s.missions.push(m); save(); A.emit('mission:create', { mission: cp(m) }); postToTheme({ action: 'missionUpdate', mission: cp(m), type: 'created' }); return cp(m);
    },
    /** Complete mission, award XP to assignee. @param {string} id @returns {Object|null} */
    completeMission: function (id) {
      if (!isS(id)) return null;
      for (var i = 0; i < _s.missions.length; i++) {
        if (_s.missions[i].id === id && _s.missions[i].status !== 'done') {
          var m = _s.missions[i]; m.status = 'done'; m.completedAt = new Date().toISOString();
          var xp = 0; if (isS(m.assignee)) { var r = A.awardXP(m.assignee, m.reward); if (r) xp = m.reward; }
          save(); A.emit('mission:complete', { mission: cp(m), xpAwarded: xp }); postToTheme({ action: 'missionUpdate', mission: cp(m), type: 'completed' }); return cp(m);
        }
      } return null;
    },

    // ── Iframe Communication ──
    /** @param {Object} msg */
    postToTheme: postToTheme,
    /** Register handler for theme messages. @param {Function} handler */
    onThemeMessage: function (handler) { if (typeof handler === 'function') _th.push(handler); },
    /** Push full state to theme iframe. */
    syncState: function () { postToTheme({ action: 'stateSync', theme: _s.theme, agents: agSnap(), missions: miSnap() }); },

    // ── Persistence (public) ──
    /** Save state to localStorage. @returns {boolean} */
    save: save,
    /** Load state from localStorage. @returns {boolean} */
    load: load,

    // ── Event Emitter ──
    /** @param {string} event @param {Function} handler */
    on: function (event, handler) { if (!isS(event) || typeof handler !== 'function') return; if (!_h[event]) _h[event] = []; _h[event].push(handler); },
    /** @param {string} event @param {Function} handler */
    off: function (event, handler) { if (!isS(event) || !_h[event]) return; _h[event] = _h[event].filter(function (f) { return f !== handler; }); },
    /** @param {string} event @param {*} [data] */
    emit: function (event, data) { if (!isS(event) || !_h[event]) return; var l = _h[event].slice(); for (var i = 0; i < l.length; i++) { try { l[i](data); } catch (_) {} } },

    /** Full state snapshot. @returns {Object} */
    getState: function () { return { theme: _s.theme, sidebarOpen: _s.sidebarOpen, agents: agSnap(), missions: miSnap(), visited: _s.visited, initialized: _init }; }
  };

  root.SpawnKitDashboard = A;
  if (typeof module !== 'undefined' && module.exports) module.exports = A;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
