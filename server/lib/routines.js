/**
 * AgentRoutines — SpawnKit Agent Routine Engine v1.0
 * Theme-agnostic behavior system. Themes plug in via ThemeAdapter.
 * The engine decides WHAT agents do; the theme decides HOW it looks.
 *
 * Usage:
 *   AgentRoutines.init(adapter, agents);
 *   AgentRoutines.start();
 */
(function(global) {
  'use strict';

  // ─── Simulated time ────────────────────────────────────────────────────────
  // 1 real minute = 2 simulated hours → full day cycle = 12 real minutes
  var ENGINE_START_TIME = Date.now();

  function getSimulatedHour() {
    var elapsed = (Date.now() - ENGINE_START_TIME) % (12 * 60 * 1000);
    return Math.floor((elapsed / (12 * 60 * 1000)) * 24); // 0–23
  }

  function getTimePeriod() {
    var h = getSimulatedHour();
    if (h >= 6  && h < 12) return 'morning';
    if (h >= 12 && h < 18) return 'afternoon';
    if (h >= 18 && h < 22) return 'evening';
    return 'night';
  }

  // ─── Built-in routines ─────────────────────────────────────────────────────
  var ROUTINES = {
    IDLE:      { animation: 'idle',  emoji: '💤', text: 'Resting',     duration: [3000, 8000],   showProgress: false },
    WALK:      { animation: 'walk',  emoji: '🚶', text: 'Walking',     duration: [4000, 10000],  showProgress: false, target: 'random_waypoint' },
    WORK:      { animation: 'work',  emoji: '⚡', text: 'Working',     duration: [8000, 20000],  showProgress: true  },
    EAT:       { animation: 'eat',   emoji: '🍖', text: 'Eating',      duration: [5000, 10000],  showProgress: false, target: 'tavern' },
    SLEEP:     { animation: 'sleep', emoji: '😴', text: 'Sleeping',    duration: [8000, 15000],  showProgress: false, target: 'quarters' },
    SOCIALIZE: { animation: 'talk',  emoji: '💬', text: 'Chatting',    duration: [4000, 8000],   showProgress: false, target: 'nearest_agent' },
    TRAIN:     { animation: 'work',  emoji: '⚔️', text: 'Training',    duration: [6000, 12000],  showProgress: true,  target: 'training_ground' },
    PORTAL:    { animation: 'walk',  emoji: '🌀', text: 'Traveling',   duration: [3000, 6000],   showProgress: false, target: 'portal' },
    RESEARCH:  { animation: 'work',  emoji: '📚', text: 'Researching', duration: [10000, 25000], showProgress: true,  target: 'library' },
    // REAL_TASK: dynamically set text; duration ignored (progress driven externally)
    REAL_TASK: { animation: 'work',  emoji: '⚡', text: '',            duration: [0, 0],         showProgress: true,  target: 'assigned_building' },
  };

  // ─── Default schedule (routine names per time-of-day period) ──────────────
  var DEFAULT_SCHEDULE = {
    morning:   ['IDLE', 'EAT', 'WALK', 'WORK'],
    afternoon: ['WORK', 'WORK', 'SOCIALIZE', 'RESEARCH'],
    evening:   ['EAT', 'WALK', 'SOCIALIZE', 'IDLE'],
    night:     ['SLEEP', 'SLEEP', 'IDLE'],
  };

  // ─── Internal state ────────────────────────────────────────────────────────
  var adapter = {};        // ThemeAdapter provided by the theme
  var agentStates = {};    // keyed by agentId
  var loopTimer = null;    // setInterval handle
  var TICK_MS = 2000;      // tick every 2 seconds

  // ─── Safe adapter call (graceful fallback if method missing) ───────────────
  function call(method /* , args... */) {
    if (typeof adapter[method] === 'function') {
      var args = Array.prototype.slice.call(arguments, 1);
      try { adapter[method].apply(adapter, args); } catch(e) { /* swallow */ }
    }
  }

  // ─── Resolve movement target position ─────────────────────────────────────
  function resolveTarget(agentId, targetType) {
    if (!targetType) return null;
    var wps, nearId, state, b;
    switch (targetType) {
      case 'random_waypoint':
        wps = (typeof adapter.getWaypoints === 'function') ? adapter.getWaypoints() : [];
        return wps.length ? wps[Math.floor(Math.random() * wps.length)] : null;

      case 'nearest_agent':
        nearId = (typeof adapter.getNearestAgent === 'function') ? adapter.getNearestAgent(agentId) : null;
        if (!nearId) return null;
        return (typeof adapter.getAgentPosition === 'function') ? adapter.getAgentPosition(nearId) : null;

      case 'assigned_building':
        state = agentStates[agentId];
        if (state && state.building && typeof adapter.getBuildingByType === 'function') {
          b = adapter.getBuildingByType(state.building);
          return b ? b.position : null;
        }
        return null;

      default:
        // targetType is a building type string (tavern, quarters, library, …)
        if (typeof adapter.getBuildingByType === 'function') {
          b = adapter.getBuildingByType(targetType);
          return b ? b.position : null;
        }
        return null;
    }
  }

  // ─── Transition an agent to a new routine ─────────────────────────────────
  function transitionTo(agentId, routineName) {
    var state = agentStates[agentId];
    if (!state) return;

    var routine = ROUTINES[routineName] || ROUTINES.IDLE;
    var oldRoutine = state.currentRoutine;

    // Randomise duration within [min, max]
    var dur = routine.duration;
    var duration = (dur[1] > dur[0])
      ? dur[0] + Math.floor(Math.random() * (dur[1] - dur[0]))
      : dur[0];

    state.currentRoutine = routineName;
    state.startTime      = Date.now();
    state.duration       = Math.max(duration, 1); // never zero
    state.progress       = 0;

    // Move agent to target, then play animation
    var target = resolveTarget(agentId, routine.target);
    if (target) {
      call('moveAgent', agentId, target, function() {
        call('playAnimation', agentId, routine.animation);
      });
    } else {
      call('playAnimation', agentId, routine.animation);
    }

    // Show speech bubble with text; clear text after 3s but keep emoji
    call('showBubble', agentId, routine.text, routine.emoji);
    setTimeout(function() {
      if (agentStates[agentId] && agentStates[agentId].currentRoutine === routineName) {
        call('showBubble', agentId, '', routine.emoji);
      }
    }, 3000);

    // Progress bar visibility
    if (!routine.showProgress) {
      call('hideProgress', agentId);
    }

    // Notify theme of routine change
    if (typeof adapter.onRoutineChange === 'function') {
      try { adapter.onRoutineChange(agentId, oldRoutine, routineName); } catch(e) {}
    }
  }

  // ─── Update progress for an ongoing real task ─────────────────────────────
  function updateRealTaskProgress(agentId) {
    var state = agentStates[agentId];
    if (!state || !state.realTask) return;
    // Progress is driven externally; just refresh display
    call('showProgress', agentId, state.realTask.progress || 0);
  }

  // ─── Main tick ────────────────────────────────────────────────────────────
  function tick() {
    var now = Date.now();
    Object.keys(agentStates).forEach(function(agentId) {
      var state = agentStates[agentId];
      if (!state || state.paused) return;

      // Real task in progress — don't interrupt
      if (state.realTask) {
        updateRealTaskProgress(agentId);
        return;
      }

      var elapsed = now - state.startTime;
      if (elapsed >= state.duration) {
        // Pick next routine from schedule
        var period  = getTimePeriod();
        var options = (state.schedule && state.schedule[period]) || DEFAULT_SCHEDULE[period];
        var next    = options[Math.floor(Math.random() * options.length)];
        transitionTo(agentId, next);
      } else if (ROUTINES[state.currentRoutine] && ROUTINES[state.currentRoutine].showProgress) {
        // Refresh progress bar
        state.progress = Math.min(100, Math.floor((elapsed / state.duration) * 100));
        call('showProgress', agentId, state.progress);
      }
    });
  }

  // ─── Public API ───────────────────────────────────────────────────────────
  var AgentRoutines = {

    /** Initialize engine. Must be called before start(). */
    init: function(themeAdapter, agents) {
      adapter = themeAdapter || {};
      ENGINE_START_TIME = Date.now(); // reset simulated clock on init
      agentStates = {};
      agents.forEach(function(agent) {
        agentStates[agent.id] = {
          currentRoutine: 'IDLE',
          startTime:  Date.now() - Math.floor(Math.random() * 5000), // stagger
          duration:   3000 + Math.floor(Math.random() * 5000),
          progress:   0,
          realTask:   null,
          schedule:   {
            morning:   DEFAULT_SCHEDULE.morning.slice(),
            afternoon: DEFAULT_SCHEDULE.afternoon.slice(),
            evening:   DEFAULT_SCHEDULE.evening.slice(),
            night:     DEFAULT_SCHEDULE.night.slice(),
          },
          building: agent.building || null,
          paused:   false,
        };
      });
    },

    /** Start the automatic tick loop (2s interval). */
    start: function() {
      if (loopTimer) return; // already running
      loopTimer = setInterval(tick, TICK_MS);
    },

    /** Stop the automatic tick loop. */
    stop: function() {
      if (loopTimer) { clearInterval(loopTimer); loopTimer = null; }
    },

    /** Manual tick — useful for testing or frame-driven themes. */
    tick: tick,

    /** Called when a real API task arrives. Overrides current routine. */
    onTask: function(agentId, task) {
      var state = agentStates[agentId];
      if (!state) return;
      state.realTask = {
        name:     task.name || task.label || 'Working...',
        progress: task.progress || 0,
      };
      state.currentRoutine = 'REAL_TASK';
      state.startTime      = Date.now();
      ROUTINES.REAL_TASK.text = state.realTask.name;
      call('showBubble',   agentId, state.realTask.name, '⚡');
      call('showProgress', agentId, state.realTask.progress);
      call('playAnimation', agentId, 'work');
      var target = resolveTarget(agentId, 'assigned_building');
      if (target) call('moveAgent', agentId, target, function() {});
    },

    /** Called when a real task finishes. Returns agent to idle routine. */
    onTaskComplete: function(agentId) {
      var state = agentStates[agentId];
      if (!state) return;
      state.realTask = null;
      call('showBubble',  agentId, 'Done!', '✅');
      call('hideProgress', agentId);
      setTimeout(function() {
        call('hideBubble', agentId);
        transitionTo(agentId, 'IDLE');
      }, 3000);
    },

    /** Get current display state for an agent. */
    getState: function(agentId) {
      var state = agentStates[agentId];
      if (!state) return null;
      var routine = ROUTINES[state.currentRoutine] || ROUTINES.IDLE;
      return {
        routine:  state.currentRoutine,
        emoji:    routine.emoji,
        text:     state.realTask ? state.realTask.name : routine.text,
        progress: state.progress,
        paused:   state.paused,
      };
    },

    /** Replace an agent's schedule (must have morning/afternoon/evening/night arrays). */
    setSchedule: function(agentId, schedule) {
      if (agentStates[agentId]) agentStates[agentId].schedule = schedule;
    },

    /** Register a custom routine definition. */
    registerRoutine: function(name, def) {
      ROUTINES[name] = def;
    },
  };

  global.AgentRoutines = AgentRoutines;

}(typeof window !== 'undefined' ? window : this));
