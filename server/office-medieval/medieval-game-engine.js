/**
 * medieval-game-engine.js — Deep Agent Action System for Three.js Medieval Theme
 * 
 * Connects real OpenClaw session data to visual agent behaviors:
 * - Polls /api/oc/sessions every 5s for action states
 * - Maps actions to zones (coding→Forge, reviewing→Library, etc.)
 * - Drives agent movement, emojis, speech bubbles, aura effects
 * - Tracks task progress, mission log, real-time status display
 * 
 * Requires: medieval-scene.js (castleApp), medieval-agent-lifecycle.js (MedievalLifecycle)
 */
(function () {
  'use strict';

  // ══════════════════════════════════════════════════════════════
  // ACTION → ZONE MAPPING
  // ══════════════════════════════════════════════════════════════

  var ACTION_CONFIG = {
    coding:        { zone: 'forge',    emoji: '🔨', aura: 0xFF6600, label: 'Forging Code',       particle: 'sparks' },
    debugging:     { zone: 'forge',    emoji: '🔧', aura: 0xFF3300, label: 'Debugging',          particle: 'sparks' },
    reviewing:     { zone: 'library',  emoji: '📜', aura: 0x3366FF, label: 'Reviewing Scrolls',  particle: 'dust'   },
    researching:   { zone: 'library',  emoji: '🔍', aura: 0x6699FF, label: 'Researching',        particle: 'dust'   },
    communicating: { zone: 'tavern',   emoji: '💬', aura: 0x33CC66, label: 'At the Tavern',      particle: null     },
    planning:      { zone: 'castle',   emoji: '📐', aura: 0xFFCC00, label: 'War Council',        particle: 'glow'   },
    deploying:     { zone: 'market',   emoji: '📦', aura: 0x00CC99, label: 'Shipping to Market', particle: 'glow'   },
    guarding:      { zone: 'castle',   emoji: '🛡️', aura: 0x9933FF, label: 'On Watch',           particle: null     },
    working:       { zone: 'castle',   emoji: '⚔️', aura: 0xFFAA00, label: 'On a Quest',         particle: null     },
    idle:          { zone: null,       emoji: '💤', aura: null,     label: 'Resting',            particle: null     },
    error:         { zone: 'chapel',   emoji: '⚠️', aura: 0xFF0000, label: 'Seeking Guidance',   particle: 'alert'  },
  };

  // Zone centers in Three.js world coordinates
  var ZONE_POSITIONS = {
    forge:     { x: 12,  z: 20 },
    library:   { x: 5,   z: 22 },
    tavern:    { x: -5,  z: 24 },
    castle:    { x: 0,   z: 0  },
    market:    { x: 7,   z: 27 },
    chapel:    { x: -9,  z: 27 },
    mission:   { x: -12, z: 20 },
    graveyard: { x: -15, z: -10 },
    farm:      { x: -16, z: 10 },
    river:     { x: 0,   z: 14 },
  };

  // ══════════════════════════════════════════════════════════════
  // STATE
  // ══════════════════════════════════════════════════════════════

  var agentActions = new Map();
  var missionLog = [];
  var _app = null;
  var _pollInterval = null;

  // ══════════════════════════════════════════════════════════════
  // POLL SESSIONS
  // ══════════════════════════════════════════════════════════════

  function pollSessions() {
    if (!window.ThemeAuth) return;
    var apiUrl = window.OC_RELAY_URL || window.OC_API_URL || '';

    window.ThemeAuth.fetch(apiUrl + '/api/oc/sessions').then(function (resp) {
      if (!resp.ok) return null;
      return resp.json();
    }).then(function (data) {
      if (!data) return;
      var sessions = data.sessions || data || [];
      processSessionData(sessions);
    }).catch(function () {});
  }

  function processSessionData(sessions) {
    var app = _app;
    if (!app) return;

    var coreAgents = ['sycopa', 'forge', 'atlas', 'hunter', 'echo', 'sentinel'];
    var agentSessions = {};

    // Main session → sycopa
    var mainSession = sessions.find(function (s) { return s.key === 'agent:main:main'; });
    if (mainSession && mainSession.status === 'active') {
      agentSessions['sycopa'] = {
        action: mainSession.action || 'working',
        task: mainSession.task || mainSession.label || 'Main session',
        tokens: mainSession.totalTokens || 0,
        model: mainSession.model || 'unknown',
      };
    }

    // Sub-agents → match to core agents by label, or by keyword
    sessions.forEach(function (s) {
      if (s.kind !== 'subagent' || s.status !== 'active') return;

      var label = (s.label || '').toLowerCase();
      var matched = false;

      coreAgents.forEach(function (agentId) {
        if (matched) return;
        if (label.indexOf(agentId) >= 0) {
          agentSessions[agentId] = {
            action: s.action || 'working',
            task: s.task || s.label || 'Sub-agent task',
            tokens: s.totalTokens || 0,
            model: s.model || 'unknown',
          };
          matched = true;
        }
      });

      if (!matched) {
        var assignTo = null;
        if (label.match(/code|build|implement|fix|refactor/)) assignTo = 'forge';
        else if (label.match(/review|audit|test|security/)) assignTo = 'sentinel';
        else if (label.match(/research|search|find|analyze/)) assignTo = 'atlas';
        else if (label.match(/chat|message|respond/)) assignTo = 'echo';
        else if (label.match(/market|revenue|sales|price/)) assignTo = 'hunter';
        else {
          for (var i = 0; i < coreAgents.length; i++) {
            if (!agentSessions[coreAgents[i]]) { assignTo = coreAgents[i]; break; }
          }
        }
        if (assignTo && !agentSessions[assignTo]) {
          agentSessions[assignTo] = {
            action: s.action || 'working',
            task: s.task || s.label || 'Quest',
            tokens: s.totalTokens || 0,
            model: s.model || 'unknown',
          };
        }
      }
    });

    // Crons → sentinel
    sessions.forEach(function (s) {
      if (s.kind === 'cron' && s.status === 'active' && !agentSessions['sentinel']) {
        agentSessions['sentinel'] = {
          action: 'guarding', task: s.label || 'Patrol duty',
          tokens: s.totalTokens || 0, model: s.model || 'unknown',
        };
      }
    });

    // Apply to each agent
    coreAgents.forEach(function (agentId) {
      var sessionData = agentSessions[agentId];
      var newAction = sessionData ? sessionData.action : 'idle';
      var config = ACTION_CONFIG[newAction] || ACTION_CONFIG.idle;
      var current = agentActions.get(agentId);

      if (!current || current.action !== newAction) {
        // Action changed
        if (current && current.action !== newAction) {
          logMission(agentId, newAction, sessionData ? sessionData.task : null);
        }

        // Clean up old aura
        if (current && current.auraLight) {
          if (current.auraLight.parent) current.auraLight.parent.remove(current.auraLight);
          current.auraLight.dispose();
        }

        var newState = {
          action: newAction, zone: config.zone, since: Date.now(),
          task: sessionData ? sessionData.task : null,
          tokens: sessionData ? sessionData.tokens : 0,
          model: sessionData ? sessionData.model : null,
          emoji: config.emoji, label: config.label,
          auraLight: null, auraColor: config.aura,
        };

        // Move to zone
        if (config.zone && ZONE_POSITIONS[config.zone]) {
          moveAgentToZone(agentId, config.zone);
        }

        // Create aura light
        if (config.aura && app.scene && typeof THREE !== 'undefined') {
          try {
            var light = new THREE.PointLight(config.aura, 2, 5);
            light.position.set(0, 1.5, 0);
            var charData = app.characterModels.get(agentId);
            if (charData && charData.group) {
              charData.group.add(light);
              newState.auraLight = light;
            }
          } catch (e) {}
        }

        // Override lifecycle emoji
        if (window.MedievalLifecycle) {
          var ls = window.MedievalLifecycle.getAgentState(agentId);
          if (ls) {
            ls.currentEmoji = config.emoji;
            ls.lastEmojiChange = performance.now() + 60000;
          }
        }

        agentActions.set(agentId, newState);
        showActionBubble(agentId, config.label, sessionData ? sessionData.task : null);

      } else if (current && sessionData) {
        current.tokens = sessionData.tokens;
        current.task = sessionData.task;
      }
    });

    updateStatusDisplay();
  }

  // ══════════════════════════════════════════════════════════════
  // MOVEMENT
  // ══════════════════════════════════════════════════════════════

  function moveAgentToZone(agentId, zoneName) {
    var app = _app;
    if (!app) return;
    var charData = app.characterModels.get(agentId);
    if (!charData) return;
    var target = ZONE_POSITIONS[zoneName];
    if (!target) return;

    var jx = (Math.random() - 0.5) * 3;
    var jz = (Math.random() - 0.5) * 3;

    charData.waypoints = [
      { x: charData.group.position.x, z: charData.group.position.z },
      { x: target.x + jx, z: target.z + jz },
    ];
    charData.waypointIndex = 0;
    charData.nextWaypointIndex = 1;
    charData.speed = 0.5;
  }

  // ══════════════════════════════════════════════════════════════
  // SPEECH BUBBLES
  // ══════════════════════════════════════════════════════════════

  function showActionBubble(agentId, actionLabel, task) {
    var app = _app;
    if (!app || !app.labelElements) return;
    var labelEl = app.labelElements.get(agentId);
    if (!labelEl) return;

    var container = document.getElementById('labels-container') || document.body;

    // Remove existing game bubble for this agent
    var existing = container.querySelector('[data-game-bubble="' + agentId + '"]');
    if (existing) existing.remove();

    var bubble = document.createElement('div');
    bubble.setAttribute('data-game-bubble', agentId);
    bubble.style.cssText = 'position:absolute;z-index:200;pointer-events:none;' +
      'background:linear-gradient(135deg,rgba(26,26,46,0.95),rgba(22,33,62,0.95));' +
      'border:1px solid rgba(201,169,89,0.6);border-radius:8px;padding:6px 10px;' +
      'font-family:Crimson Text,serif;font-size:12px;color:#f4e4bc;' +
      'max-width:180px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,0.4);' +
      'animation:bubbleFadeIn 0.3s ease;';

    var text = actionLabel;
    if (task) {
      var shortTask = task.length > 30 ? task.substring(0, 27) + '...' : task;
      text += '<br><span style="font-size:10px;color:#c9a959;">' + shortTask + '</span>';
    }
    bubble.innerHTML = text;
    bubble.style.left = labelEl.style.left;
    bubble.style.top = (parseFloat(labelEl.style.top || 0) - 40) + 'px';
    container.appendChild(bubble);

    setTimeout(function () {
      bubble.style.opacity = '0';
      bubble.style.transition = 'opacity 0.5s';
      setTimeout(function () { bubble.remove(); }, 500);
    }, 5000);
  }

  // ══════════════════════════════════════════════════════════════
  // AURA PULSE
  // ══════════════════════════════════════════════════════════════

  function updateAuras() {
    var now = performance.now();
    agentActions.forEach(function (state) {
      if (!state.auraLight) return;
      state.auraLight.intensity = 1.5 + Math.sin(now * 0.003 + state.auraColor * 0.001) * 0.8;
    });
  }

  // ══════════════════════════════════════════════════════════════
  // ACTION LABELS UNDER AGENT NAME
  // ══════════════════════════════════════════════════════════════

  function updateActionLabels() {
    var app = _app;
    if (!app || !app.labelElements) return;

    app.labelElements.forEach(function (labelEl, agentId) {
      var state = agentActions.get(agentId);
      if (!state) return;

      var actionEl = labelEl._gameActionLabel;
      if (!actionEl) {
        actionEl = document.createElement('div');
        actionEl.style.cssText = 'font-size:9px;color:#c9a959;font-family:Crimson Text,serif;' +
          'text-align:center;margin-top:1px;opacity:0.85;text-shadow:0 1px 2px rgba(0,0,0,0.8);' +
          'position:absolute;transform:translateX(-50%);white-space:nowrap;pointer-events:none;';
        var container = document.getElementById('labels-container') || document.body;
        container.appendChild(actionEl);
        labelEl._gameActionLabel = actionEl;
      }

      if (state.action !== 'idle') {
        actionEl.textContent = state.label;
        actionEl.style.display = 'block';
        actionEl.style.left = labelEl.style.left;
        actionEl.style.top = (parseFloat(labelEl.style.top || 0) + 16) + 'px';
      } else {
        actionEl.style.display = 'none';
      }
    });
  }

  // ══════════════════════════════════════════════════════════════
  // STATUS DISPLAY (top-right HUD)
  // ══════════════════════════════════════════════════════════════

  function updateStatusDisplay() {
    var bar = document.getElementById('game-engine-status');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'game-engine-status';
      bar.style.cssText = 'position:fixed;top:60px;right:12px;z-index:150;' +
        'background:rgba(26,26,46,0.9);border:1px solid rgba(201,169,89,0.4);' +
        'border-radius:8px;padding:8px 12px;font-family:Crimson Text,serif;' +
        'color:#f4e4bc;font-size:11px;max-width:220px;backdrop-filter:blur(8px);' +
        'box-shadow:0 2px 12px rgba(0,0,0,0.3);';
      document.body.appendChild(bar);
    }

    var lines = [];
    agentActions.forEach(function (state, agentId) {
      if (state.action === 'idle') return;
      var elapsed = Math.floor((Date.now() - state.since) / 1000);
      var timeStr = elapsed < 60 ? elapsed + 's' : Math.floor(elapsed / 60) + 'm';
      lines.push(
        '<div style="display:flex;align-items:center;gap:4px;margin:2px 0;">' +
        '<span>' + state.emoji + '</span>' +
        '<span style="color:#c9a959;font-weight:600;">' + agentId + '</span>' +
        '<span style="opacity:0.7;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">— ' + state.label + '</span>' +
        '<span style="color:#4ade80;font-size:9px;">' + timeStr + '</span>' +
        '</div>'
      );
    });

    if (lines.length > 0) {
      bar.innerHTML = '<div style="color:#c9a959;font-weight:600;margin-bottom:4px;font-size:12px;">' +
        '⚔️ Active Quests (' + lines.length + ')</div>' + lines.join('');
      bar.style.display = 'block';
    } else {
      bar.innerHTML = '<div style="color:#64748b;font-style:italic;">🏰 Castle is quiet...</div>';
    }
  }

  // ══════════════════════════════════════════════════════════════
  // MISSION LOG
  // ══════════════════════════════════════════════════════════════

  function logMission(agentId, action, task) {
    missionLog.push({ timestamp: Date.now(), agentId: agentId, action: action, task: task });
    if (missionLog.length > 50) missionLog.shift();

    var app = _app;
    if (app && app.addActivityLog) {
      var config = ACTION_CONFIG[action] || ACTION_CONFIG.idle;
      var msg = config.emoji + ' ' + agentId + ' → ' + config.label;
      if (task) msg += ' (' + task.substring(0, 40) + ')';
      app.addActivityLog(msg, agentId);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // GAME LOOP
  // ══════════════════════════════════════════════════════════════

  function gameLoop() {
    updateAuras();
    updateActionLabels();
    requestAnimationFrame(gameLoop);
  }

  // ══════════════════════════════════════════════════════════════
  // BOOTSTRAP
  // ══════════════════════════════════════════════════════════════

  function bootstrap() {
    _app = window.castleApp;
    if (!_app || !_app.scene || !_app.characterModels || _app.characterModels.size < 1) {
      setTimeout(bootstrap, 1000);
      return;
    }

    console.log('[GameEngine] ⚔️ Initializing Agent Action System...');

    // CSS
    var style = document.createElement('style');
    style.textContent = '@keyframes bubbleFadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }';
    document.head.appendChild(style);

    // Init all core agents as idle
    ['sycopa', 'forge', 'atlas', 'hunter', 'echo', 'sentinel'].forEach(function (id) {
      agentActions.set(id, {
        action: 'idle', zone: null, since: Date.now(),
        task: null, tokens: 0, model: null,
        emoji: '💤', label: 'Resting',
        auraLight: null, auraColor: null,
      });
    });

    // Poll every 5s
    pollSessions();
    _pollInterval = setInterval(pollSessions, 5000);

    // Render loop
    requestAnimationFrame(gameLoop);

    // Public API
    window.MedievalGameEngine = {
      getAgentAction: function (id) { return agentActions.get(id); },
      getAllActions: function () { return Object.fromEntries(agentActions); },
      getMissionLog: function () { return missionLog.slice(); },
      getActionConfig: function () { return ACTION_CONFIG; },
      forceAction: function (agentId, action) {
        var fake = [{ key: 'force:' + agentId, kind: 'subagent', status: 'active',
          label: agentId + '-' + action, action: action, task: 'Manual: ' + action,
          model: 'manual', totalTokens: 0 }];
        processSessionData(fake);
      },
      pollNow: pollSessions,
    };

    console.log('[GameEngine] ✅ Agent Action System ready — actions: ' + Object.keys(ACTION_CONFIG).join(', '));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(bootstrap, 3000); });
  } else {
    setTimeout(bootstrap, 3000);
  }
})();
