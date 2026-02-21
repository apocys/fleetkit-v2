/**
 * SpawnKit v2 — Universal Mission Controller
 * ═══════════════════════════════════════════
 * 
 * The Pokémon-style gameplay core. This module orchestrates ALL mission
 * interactions across every theme. It decides WHAT happens and WHEN.
 * Themes register callbacks that decide HOW it looks.
 * 
 * Think of it like the Pokémon engine: the same battle system runs whether
 * you're on a Game Boy, GBA, or DS. The theme is just the renderer.
 * 
 * Events consumed:
 *   SpawnKit.emit('mission:new', { text, assignedTo, priority })
 *   SpawnKit.emit('cron:trigger', { name, schedule, owner })
 *   SpawnKit.emit('subagent:spawn', { name, task, parentAgent })
 *   SpawnKit.emit('subagent:complete', { id, result })
 *   SpawnKit.emit('mission:progress', { missionId, progress, agent })
 *   SpawnKit.emit('mission:complete', { missionId })
 * 
 * Events emitted:
 *   SpawnKit.emit('mc:phase', { missionId, phase, data })
 *   SpawnKit.emit('mc:state', { state })
 * 
 * @author Forge (CTO)
 * @version 2.0.0
 */

(function (global) {
  'use strict';

  // ─── Helpers ──────────────────────────────────────────────────────

  /** Generate a short unique ID */
  function uid(prefix) {
    return (prefix || 'mc') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  }

  /** Awaitable delay that respects animation speed and cancellation */
  function wait(ms, speedMultiplier, abortSignal) {
    const actual = Math.max(16, ms / (speedMultiplier || 1));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, actual);
      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }
    });
  }

  /** Safe theme callback invocation — never crash the sequence */
  function safeCall(fn, ...args) {
    if (typeof fn !== 'function') return Promise.resolve();
    try {
      const result = fn(...args);
      // Handle both sync and async callbacks
      if (result && typeof result.then === 'function') {
        return result.catch(err => {
          console.warn('[MissionController] Theme callback error:', err);
        });
      }
      return Promise.resolve(result);
    } catch (err) {
      console.warn('[MissionController] Theme callback error:', err);
      return Promise.resolve();
    }
  }

  // ─── Speech bubble text pools ─────────────────────────────────────

  const WORK_BUBBLES = [
    'On it! 💪', 'Coding...', 'Hmm... 🤔', 'Almost!', 'Let me check...',
    'Building... 🔨', 'Thinking...', 'Got it!', 'Interesting...', 'Working... ⚡'
  ];

  const PROGRESS_BUBBLES = {
    25: ['25% done!', 'Getting started...', 'Making progress 📊'],
    50: ['Halfway there! 🎯', '50% complete!', 'On track!'],
    75: ['75%! Almost done!', 'Final stretch! 🏃', 'Nearly there!'],
    90: ['Almost done! ✨', 'Wrapping up...', 'Final touches!'],
  };

  const CRON_BUBBLES = {
    'Morning Briefing': ['Good morning, team! ☀️', 'Morning brief time!', 'Rise and shine! 🌅'],
    'Weekly Revenue Report': ['Revenue check time! 💰', 'Let\'s see the numbers!', 'Weekly report incoming!'],
    'Security Scan': ['Security sweep! 🛡️', 'Running scans...', 'Checking defenses!'],
    'Backup Routine': ['Backup time! 💾', 'Saving everything!', 'Data safety first!'],
    _default: ['Task triggered! ⏰', 'Time to work!', 'Let\'s go!']
  };

  const CELEBRATION_BUBBLES = [
    '🎉 Done!', 'Victory! 🏆', 'Nailed it! 💪', 'Ship it! 🚀',
    'High five! ✋', 'Excellent! ⭐', 'Parfait! 🇫🇷', 'Boom! 💥'
  ];

  function pickRandom(arr) {
    if (!arr?.length) return '';
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function getProgressBubble(pct) {
    if (pct >= 90) return pickRandom(PROGRESS_BUBBLES[90]);
    if (pct >= 75) return pickRandom(PROGRESS_BUBBLES[75]);
    if (pct >= 50) return pickRandom(PROGRESS_BUBBLES[50]);
    if (pct >= 25) return pickRandom(PROGRESS_BUBBLES[25]);
    return pickRandom(WORK_BUBBLES);
  }

  function getCronBubble(cronName) {
    const pool = CRON_BUBBLES[cronName] || CRON_BUBBLES._default;
    return pickRandom(pool);
  }

  // ─── Mission Controller ───────────────────────────────────────────

  const MissionController = {

    // ── Configuration ─────────────────────────────────────────────
    config: {
      animationSpeed: 1.0,       // Global speed multiplier (2.0 = 2× faster)
      showSpeechBubbles: true,
      showProgressBars: true,
      soundEffects: false,
      progressUpdateInterval: 3000, // ms between progress bubble updates
      demoAutoStart: false,         // Auto-start demo on first load
      debugLog: false               // Verbose logging
    },

    // ── Internal state ────────────────────────────────────────────
    _theme: null,
    _activeMissions: new Map(),     // missionId → mission object
    _activeSubAgents: new Map(),    // subAgentId → subagent object
    _missionQueue: [],              // Queued missions waiting to start
    _currentSequence: null,         // Currently running animation sequence
    _currentAbort: null,            // AbortController for current sequence
    _demoRunning: false,
    _demoAbort: null,
    _eventsBound: false,
    _initialized: false,

    // ── Phase timing (in ms, before speed multiplier) ─────────────
    timing: {
      // Mission phases
      mailboxAlert:       2000,
      ceoWalkToMailbox:   3000,
      ceoWalkToWhiteboard: 3000,
      teamGathering:      4000,
      briefing:           3000,
      scatterToWork:      3000,
      progressInterval:   3000,
      completion:         3000,
      // Cron phases
      phoneRings:         2000,
      ceoPicksUp:         2000,
      announcement:       2000,
      agentsReact:        1000,
      // Sub-agent phases
      doorOpens:          1000,
      stagiaireEnters:    2000,
      walksToParent:      2000,
      receivesTask:       1000,
      subagentCompletion: 2000,
      // Pauses
      pauseBetweenPhases: 500,
      pauseBetweenAgents: 400,
    },

    // ── Theme registration ────────────────────────────────────────

    /**
     * Register a theme's animation callbacks.
     * 
     * @param {Object} callbacks
     * @param {Function} callbacks.moveCharacter(charId, fromPos, toPos, duration) → Promise
     * @param {Function} callbacks.showSpeechBubble(charId, text, duration) → void
     * @param {Function} callbacks.showProgressBar(charId, progress) → void
     * @param {Function} callbacks.hideProgressBar(charId) → void
     * @param {Function} callbacks.playAnimation(charId, animName, opts) → void
     * @param {Function} callbacks.showNotification(text, type) → void
     * @param {Function} callbacks.triggerObject(objectId, state, data) → void
     * @param {Function} callbacks.writeWhiteboard(text, missionId) → void
     * @param {Function} callbacks.clearWhiteboard(missionId) → void
     * @param {Function} callbacks.spawnSubAgent(config) → charId
     * @param {Function} callbacks.removeSubAgent(id) → void
     * @param {Function} callbacks.celebrate(charIds) → void
     * @param {Function} callbacks.getCharacterPosition(charId) → { x, y }
     * @param {Function} callbacks.getObjectPosition(objectId) → { x, y }
     * @param {Function} callbacks.getAgentIds() → string[]  (all agent charIds in the scene)
     * @param {Function} callbacks.getCeoId() → string  (the CEO / ApoMac character id)
     * @param {Function} [callbacks.playSound(soundId)] → void  (optional)
     */
    registerTheme(callbacks) {
      if (!callbacks || typeof callbacks !== 'object') {
        throw new Error('[MissionController] registerTheme requires a callbacks object');
      }

      // Validate required callbacks
      const required = [
        'moveCharacter', 'showSpeechBubble', 'playAnimation',
        'triggerObject', 'celebrate', 'getCharacterPosition',
        'getObjectPosition', 'getAgentIds', 'getCeoId'
      ];

      const missing = required.filter(k => typeof callbacks[k] !== 'function');
      if (missing.length) {
        console.warn(`[MissionController] Missing theme callbacks: ${missing.join(', ')}`);
        console.warn('[MissionController] Registering anyway — missing callbacks will be no-ops');
      }

      this._theme = callbacks;
      this._log('Theme registered successfully');

      // Auto-bind SpawnKit events if not already done
      if (!this._eventsBound) {
        this._bindEvents();
      }

      this._initialized = true;

      // Auto-start demo if configured
      if (this.config.demoAutoStart) {
        setTimeout(() => this.demo(), 1000);
      }
    },

    // ── Event binding ─────────────────────────────────────────────

    _bindEvents() {
      if (this._eventsBound) return;
      if (typeof SpawnKit === 'undefined' || !SpawnKit?.on) {
        this._log('SpawnKit not available — skipping event binding');
        return;
      }

      SpawnKit.on('mission:new', (data) => this.executeMission(data));
      SpawnKit.on('mission:progress', (data) => this._handleMissionProgress(data));
      SpawnKit.on('mission:complete', (data) => this._handleMissionComplete(data));
      SpawnKit.on('cron:trigger', (data) => this.triggerCron(data));
      SpawnKit.on('subagent:spawn', (data) => this.spawnSubAgent(data));
      SpawnKit.on('subagent:complete', (data) => this._handleSubAgentComplete(data));

      this._eventsBound = true;
      this._log('SpawnKit events bound');
    },

    // ── Logging ───────────────────────────────────────────────────

    _log(...args) {
      if (this.config.debugLog) {
        console.log('[MissionController]', ...args);
      }
    },

    _emitPhase(missionId, phase, data) {
      this._log(`Phase: ${phase}`, data || '');
      if (typeof SpawnKit !== 'undefined' && SpawnKit?.emit) {
        SpawnKit.emit('mc:phase', { missionId, phase, data });
      }
    },

    _emitState() {
      if (typeof SpawnKit !== 'undefined' && SpawnKit?.emit) {
        SpawnKit.emit('mc:state', { state: this.getState() });
      }
    },

    // ── Theme callback wrappers (safe) ────────────────────────────

    _move(charId, from, to, duration) {
      return safeCall(this._theme?.moveCharacter, charId, from, to, duration / this.config.animationSpeed);
    },

    _bubble(charId, text, duration) {
      if (!this.config.showSpeechBubbles) return;
      safeCall(this._theme?.showSpeechBubble, charId, text, (duration || 2500) / this.config.animationSpeed);
    },

    _progress(charId, value) {
      if (!this.config.showProgressBars) return;
      safeCall(this._theme?.showProgressBar, charId, value);
    },

    _hideProgress(charId) {
      safeCall(this._theme?.hideProgressBar, charId);
    },

    _anim(charId, name, opts) {
      return safeCall(this._theme?.playAnimation, charId, name, opts);
    },

    _notify(text, type) {
      safeCall(this._theme?.showNotification, text, type || 'info');
    },

    _object(objectId, state, data) {
      return safeCall(this._theme?.triggerObject, objectId, state, data);
    },

    _whiteboard(text, missionId) {
      return safeCall(this._theme?.writeWhiteboard, text, missionId);
    },

    _clearWhiteboard(missionId) {
      return safeCall(this._theme?.clearWhiteboard, missionId);
    },

    _celebrate(charIds) {
      return safeCall(this._theme?.celebrate, charIds);
    },

    _pos(charId) {
      if (!this._theme?.getCharacterPosition) return { x: 0, y: 0 };
      try { return this._theme?.getCharacterPosition(charId) || { x: 0, y: 0 }; }
      catch { return { x: 0, y: 0 }; }
    },

    _objPos(objectId) {
      if (!this._theme?.getObjectPosition) return { x: 0, y: 0 };
      try { return this._theme?.getObjectPosition(objectId) || { x: 0, y: 0 }; }
      catch { return { x: 0, y: 0 }; }
    },

    _agents() {
      if (!this._theme?.getAgentIds) return [];
      try { return this._theme?.getAgentIds() || []; }
      catch { return []; }
    },

    _ceo() {
      if (!this._theme?.getCeoId) return 'kira';
      try { return this._theme?.getCeoId() || 'kira'; }
      catch { return 'kira'; }
    },

    _sound(soundId) {
      if (!this.config.soundEffects) return;
      safeCall(this._theme?.playSound, soundId);
    },

    // ─── MISSION EXECUTION ───────────────────────────────────────

    /**
     * Execute a full mission sequence — the Pokémon RPG loop.
     * 
     * @param {Object} mission
     * @param {string} mission.text — mission description
     * @param {string[]} [mission.assignedTo] — agent IDs to assign
     * @param {string} [mission.priority] — 'low' | 'normal' | 'high' | 'critical'
     * @param {string} [mission.id] — custom mission ID
     * @returns {Promise<Object>} — the completed mission object
     */
    async executeMission(mission) {
      if (!this._theme) {
        console.warn('[MissionController] No theme registered — queueing mission');
        this._missionQueue.push(mission);
        return null;
      }

      // Build mission object
      const m = {
        id: mission?.id || uid('mission'),
        text: mission?.text || mission?.title || 'New Mission',
        description: mission?.description || mission?.text || '',
        assignedTo: mission?.assignedTo || this._agents(),
        priority: mission?.priority || 'normal',
        status: 'starting',
        progress: 0,
        startedAt: Date.now(),
        completedAt: null,
        phases: [],
      };

      // If there's already a running sequence, interrupt it
      if (this._currentAbort) {
        this._log('Interrupting current sequence for new mission');
        this._currentAbort.abort();
        // Clear any pending timers to prevent race conditions
        this._currentAbort = null;
        this._currentSequence = null;
        await wait(500, this.config.animationSpeed); // Increased cleanup time
      }

      // Store & track
      this._activeMissions.set(m.id, m);
      this._emitState();

      // Create abort controller for this sequence
      const abort = new AbortController();
      this._currentAbort = abort;

      try {
        this._currentSequence = m.id;

        // ═══ PHASE 1: MAILBOX ALERT ═══
        await this._phaseMail(m, abort.signal);

        // ═══ PHASE 2: CEO WALKS TO MAILBOX ═══
        await this._phaseCeoToMailbox(m, abort.signal);

        // ═══ PHASE 3: CEO WALKS TO WHITEBOARD ═══
        await this._phaseCeoToWhiteboard(m, abort.signal);

        // ═══ PHASE 4: TEAM GATHERING ═══
        await this._phaseTeamGathering(m, abort.signal);

        // ═══ PHASE 5: BRIEFING ═══
        await this._phaseBriefing(m, abort.signal);

        // ═══ PHASE 6: SCATTER TO WORK ═══
        await this._phaseScatter(m, abort.signal);

        // ═══ PHASE 7: PROGRESS UPDATES ═══
        await this._phaseProgress(m, abort.signal);

        // ═══ PHASE 8: COMPLETION ═══
        await this._phaseCompletion(m, abort.signal);

        m.status = 'completed';
        m.completedAt = Date.now();

      } catch (err) {
        if (err.name === 'AbortError') {
          this._log(`Mission ${m.id} interrupted`);
          m.status = 'interrupted';
        } else {
          console.error('[MissionController] Mission execution error:', err);
          m.status = 'failed';
        }
      } finally {
        if (this._currentSequence === m.id) {
          this._currentSequence = null;
          this._currentAbort = null;
        }
        this._emitState();
      }

      // Process queued missions
      this._processQueue();

      return m;
    },

    // ── Phase implementations ─────────────────────────────────────

    async _phaseMail(m, signal) {
      m.status = 'mailbox_alert';
      m.phases.push('mailbox_alert');
      this._emitPhase(m.id, 'mailbox_alert');

      // Mailbox flashes / glows
      await this._object('mailbox', 'glowing', { missionId: m.id });
      this._sound('mail_arrive');
      this._notify(`📬 New mission incoming!`, 'mission');

      await wait(this.timing.mailboxAlert, this.config.animationSpeed, signal);
    },

    async _phaseCeoToMailbox(m, signal) {
      m.status = 'ceo_to_mailbox';
      m.phases.push('ceo_to_mailbox');
      this._emitPhase(m.id, 'ceo_to_mailbox');

      const ceo = this._ceo();
      const ceoPos = this._pos(ceo);
      const mailboxPos = this._objPos('mailbox');

      // CEO stands up and walks to mailbox
      await this._anim(ceo, 'stand_up');
      await this._move(ceo, ceoPos, mailboxPos, this.timing.ceoWalkToMailbox);

      // Open letter animation
      await this._anim(ceo, 'open_letter');
      this._bubble(ceo, '📧 New orders!', 2000);
      await this._object('mailbox', 'empty');

      await wait(this.timing.pauseBetweenPhases, this.config.animationSpeed, signal);
    },

    async _phaseCeoToWhiteboard(m, signal) {
      m.status = 'ceo_to_whiteboard';
      m.phases.push('ceo_to_whiteboard');
      this._emitPhase(m.id, 'ceo_to_whiteboard');

      const ceo = this._ceo();
      const ceoPos = this._objPos('mailbox'); // CEO is at mailbox now
      const whiteboardPos = this._objPos('whiteboard');

      // CEO carries document to whiteboard
      await this._anim(ceo, 'carry_document');
      await this._move(ceo, ceoPos, whiteboardPos, this.timing.ceoWalkToWhiteboard);

      // Write mission on whiteboard
      await this._anim(ceo, 'writing');
      await this._object('whiteboard', 'mission', { text: m.text, missionId: m.id });
      await this._whiteboard(m.text, m.id);

      this._sound('marker_write');

      await wait(this.timing.pauseBetweenPhases, this.config.animationSpeed, signal);
    },

    async _phaseTeamGathering(m, signal) {
      m.status = 'team_gathering';
      m.phases.push('team_gathering');
      this._emitPhase(m.id, 'team_gathering');

      const ceo = this._ceo();
      const whiteboardPos = this._objPos('whiteboard');
      const allAgents = this._agents();
      const assigned = m.assignedTo || [];

      // CEO calls the team
      this._bubble(ceo, '📢 Team, gather up!', 2000);
      this._sound('attention');

      await wait(this.timing.pauseBetweenPhases, this.config.animationSpeed, signal);

      // Assigned agents walk to whiteboard area
      const gatherPromises = [];
      for (let i = 0; i < allAgents.length; i++) {
        const agentId = allAgents[i];
        if (agentId === ceo) continue; // CEO is already there

        const agentPos = this._pos(agentId);
        const isAssigned = assigned.includes(agentId);

        if (isAssigned) {
          // Walk to whiteboard with slight offset so they don't overlap
          const offset = {
            x: whiteboardPos.x + (i - allAgents.length / 2) * 20,
            y: whiteboardPos.y + 30 + (i % 2) * 15
          };
          gatherPromises.push(
            wait(i * this.timing.pauseBetweenAgents, this.config.animationSpeed, signal)
              .then(() => this._move(agentId, agentPos, offset, this.timing.teamGathering * 0.7))
          );
        } else {
          // Non-assigned agents just look up (subtle attention)
          gatherPromises.push(
            this._anim(agentId, 'look_up')
          );
        }
      }

      await Promise.all(gatherPromises);
      await wait(this.timing.pauseBetweenPhases, this.config.animationSpeed, signal);
    },

    async _phaseBriefing(m, signal) {
      m.status = 'briefing';
      m.phases.push('briefing');
      this._emitPhase(m.id, 'briefing');

      const ceo = this._ceo();
      const assigned = (m.assignedTo || []).filter(id => id !== ceo);

      // CEO explains the mission
      this._bubble(ceo, `📋 Mission: ${this._truncate(m.text, 30)}`, 3000);
      await wait(1200, this.config.animationSpeed, signal);

      // Each assigned agent gets their assignment bubble
      for (let i = 0; i < assigned.length; i++) {
        const agentId = assigned[i];
        const task = this._generateAgentTask(agentId, m);

        await wait(this.timing.pauseBetweenAgents, this.config.animationSpeed, signal);
        this._bubble(agentId, `✅ ${task}`, 2500);
      }

      this._sound('briefing_complete');
      await wait(this.timing.briefing - 1200, this.config.animationSpeed, signal);
    },

    async _phaseScatter(m, signal) {
      m.status = 'working';
      m.phases.push('scatter');
      this._emitPhase(m.id, 'scatter');

      const ceo = this._ceo();
      const allAgents = this._agents();

      // Everyone walks back to their desks
      const scatterPromises = [];
      for (const agentId of allAgents) {
        // Theme should know each agent's home desk position
        const homePos = this._pos(agentId); // Themes should return home/desk pos for non-moving characters
        const deskPos = this._objPos(`desk_${agentId}`) || homePos;
        const currentPos = this._pos(agentId);

        scatterPromises.push(
          this._move(agentId, currentPos, deskPos, this.timing.scatterToWork)
        );
      }

      await Promise.all(scatterPromises);

      // Start working animations and show progress bars
      for (const agentId of (m?.assignedTo || [])) {
        await this._anim(agentId, 'working');
        this._progress(agentId, 0);
      }

      await wait(this.timing.pauseBetweenPhases, this.config.animationSpeed, signal);
    },

    async _phaseProgress(m, signal) {
      m.phases.push('progress');
      this._emitPhase(m.id, 'progress');

      // Simulate gradual progress with random speech bubbles
      const totalSteps = 8;
      const stepDelay = this.timing.progressInterval;

      for (let step = 1; step <= totalSteps; step++) {
        // Check if mission was completed externally
        if (m.status === 'completed' || m.status === 'interrupted') break;

        const pct = Math.min(100, Math.round((step / totalSteps) * 100));
        m.progress = pct / 100;

        // Update progress bars for all assigned agents
        for (const agentId of (m?.assignedTo || [])) {
          this._progress(agentId, pct);
        }

        // Occasional speech bubbles (not every step — that'd be annoying)
        if (step % 2 === 0 || step === totalSteps) {
          const talker = pickRandom(m.assignedTo || []);
          this._bubble(talker, getProgressBubble(pct), 2000);
        }

        this._emitPhase(m.id, 'progress_update', { progress: pct });

        await wait(stepDelay, this.config.animationSpeed, signal);
      }

      m.progress = 1.0;
    },

    async _phaseCompletion(m, signal) {
      m.status = 'completing';
      m.phases.push('completion');
      this._emitPhase(m.id, 'completion');

      // Hide progress bars
      for (const agentId of (m?.assignedTo || [])) {
        this._hideProgress(agentId);
      }

      // Mark whiteboard as complete
      await this._object('whiteboard', 'complete', { missionId: m.id });

      // All agents celebrate!
      const allAgents = this._agents();
      await this._celebrate(allAgents);

      // Celebration bubbles
      for (const agentId of (m?.assignedTo || [])) {
        this._bubble(agentId, pickRandom(CELEBRATION_BUBBLES), 2500);
        await wait(200, this.config.animationSpeed, signal);
      }

      this._sound('celebration');
      this._notify(`🎉 Mission complete: ${this._truncate(m.text, 40)}`, 'success');

      await wait(this.timing.completion, this.config.animationSpeed, signal);

      // Clear whiteboard after celebration
      await this._clearWhiteboard(m.id);

      // Return agents to idle
      for (const agentId of allAgents) {
        await this._anim(agentId, 'idle');
      }
    },

    // ─── CRON JOB EVENT ──────────────────────────────────────────

    /**
     * Trigger a cron job event — phone rings, CEO picks up, announcement.
     * 
     * @param {Object} cron
     * @param {string} cron.name — cron job name
     * @param {string} [cron.schedule] — cron expression
     * @param {string} [cron.owner] — which agent owns this cron
     */
    async triggerCron(cron) {
      if (!this._theme) {
        this._log('No theme — ignoring cron trigger');
        return;
      }

      const cronId = cron.id || uid('cron');
      const cronName = cron.name || 'Scheduled Task';
      const owner = cron.owner || null;

      // If a mission is animating, don't interrupt — just notify
      if (this._currentSequence) {
        this._notify(`⏰ ${cronName} triggered`, 'cron');
        return;
      }

      const abort = new AbortController();
      this._currentAbort = abort;
      this._currentSequence = cronId;

      try {
        // ═══ PHASE 1: PHONE RINGS ═══
        this._emitPhase(cronId, 'phone_rings');
        await this._object('phone', 'ringing', { cronName });
        this._sound('phone_ring');
        this._notify(`📞 ${cronName}!`, 'cron');

        await wait(this.timing.phoneRings, this.config.animationSpeed, abort.signal);

        // ═══ PHASE 2: CEO PICKS UP ═══
        this._emitPhase(cronId, 'ceo_picks_up');
        const ceo = this._ceo();
        const ceoPos = this._pos(ceo);
        const phonePos = this._objPos('phone');

        await this._anim(ceo, 'stand_up');
        await this._move(ceo, ceoPos, phonePos, this.timing.ceoPicksUp);
        await this._anim(ceo, 'answer_phone');
        await this._object('phone', 'answered');

        await wait(this.timing.pauseBetweenPhases, this.config.animationSpeed, abort.signal);

        // ═══ PHASE 3: ANNOUNCEMENT ═══
        this._emitPhase(cronId, 'announcement');
        this._bubble(ceo, getCronBubble(cronName), 2500);

        await wait(this.timing.announcement, this.config.animationSpeed, abort.signal);

        // ═══ PHASE 4: AGENTS REACT ═══
        this._emitPhase(cronId, 'agents_react');
        const allAgents = this._agents().filter(id => id !== ceo);

        // Relevant agents acknowledge
        for (const agentId of allAgents) {
          const isOwner = agentId === owner;
          if (isOwner || Math.random() < 0.4) {
            this._bubble(agentId, isOwner ? 'On it! 👍' : '👍', 1500);
          }
        }

        await wait(this.timing.agentsReact, this.config.animationSpeed, abort.signal);

        // Phone goes back to silent, CEO returns to desk
        await this._object('phone', 'silent');
        const deskPos = this._objPos(`desk_${ceo}`) || this._pos(ceo);
        await this._move(ceo, phonePos, deskPos, this.timing.ceoPicksUp);
        await this._anim(ceo, 'idle');

      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('[MissionController] Cron trigger error:', err);
        }
      } finally {
        if (this._currentSequence === cronId) {
          this._currentSequence = null;
          this._currentAbort = null;
        }
      }
    },

    // ─── SUB-AGENT SPAWNING ──────────────────────────────────────

    /**
     * Spawn a sub-agent — stagiaire enters the office, walks to parent, starts working.
     * 
     * @param {Object} config
     * @param {string} config.name — sub-agent name
     * @param {string} config.task — what they're doing
     * @param {string} config.parentAgent — parent agent ID
     * @returns {Promise<string>} — sub-agent ID
     */
    async spawnSubAgent(config) {
      if (!this._theme) {
        this._log('No theme — ignoring subagent spawn');
        return null;
      }

      const sa = {
        id: config.id || uid('sa'),
        name: config.name || 'Stagiaire',
        task: config.task || 'Helping out',
        parentAgent: config.parentAgent || this._ceo(),
        status: 'entering',
        progress: 0,
        spawnedAt: Date.now(),
        completedAt: null,
      };

      this._activeSubAgents.set(sa.id, sa);
      this._emitState();

      // Don't interrupt mission sequences — just animate in parallel
      try {
        // ═══ PHASE 1: DOOR OPENS ═══
        this._emitPhase(sa.id, 'door_opens');
        await this._object('door', 'open', { subAgentId: sa.id });
        this._sound('door_open');

        await wait(this.timing.doorOpens, this.config.animationSpeed);

        // ═══ PHASE 2: STAGIAIRE ENTERS ═══
        this._emitPhase(sa.id, 'stagiaire_enters');
        const charId = await safeCall(this._theme?.spawnSubAgent, {
          id: sa.id,
          name: sa.name,
          parentAgent: sa.parentAgent,
        });
        sa.charId = charId || sa.id;

        const doorPos = this._objPos('door');
        const entryPos = { x: doorPos.x, y: doorPos.y + 20 };
        await this._move(sa.charId, doorPos, entryPos, this.timing.stagiaireEnters);
        this._bubble(sa.charId, `📂 ${this._truncate(sa.name, 15)} reporting!`, 2000);

        await wait(this.timing.pauseBetweenPhases, this.config.animationSpeed);

        // ═══ PHASE 3: WALKS TO PARENT ═══
        this._emitPhase(sa.id, 'walks_to_parent');
        const parentPos = this._pos(sa.parentAgent);
        const sideDesk = { x: parentPos.x + 30, y: parentPos.y + 10 };

        await this._move(sa.charId, entryPos, parentPos, this.timing.walksToParent);

        // Close door behind them
        await this._object('door', 'closed');

        await wait(this.timing.pauseBetweenPhases, this.config.animationSpeed);

        // ═══ PHASE 4: RECEIVES TASK ═══
        this._emitPhase(sa.id, 'receives_task');
        this._bubble(sa.parentAgent, `Here's the task: ${this._truncate(sa.task, 25)}`, 2500);
        await wait(800, this.config.animationSpeed);
        this._bubble(sa.charId, 'Got it! 📝', 1500);

        await wait(this.timing.receivesTask, this.config.animationSpeed);

        // ═══ PHASE 5: WORKS AT SIDE DESK ═══
        this._emitPhase(sa.id, 'working');
        sa.status = 'working';
        await this._move(sa.charId, parentPos, sideDesk, 1000);
        await this._anim(sa.charId, 'working');
        this._progress(sa.charId, 0);

      } catch (err) {
        console.error('[MissionController] Sub-agent spawn error:', err);
        sa.status = 'failed';
      }

      this._emitState();
      return sa.id;
    },

    /**
     * Complete a sub-agent — they finish, walk to door, leave.
     * @param {string} id — sub-agent ID
     * @param {string} [result] — optional completion message
     */
    async completeSubAgent(id, result) {
      const sa = this._activeSubAgents.get(id);
      if (!sa) {
        this._log(`Sub-agent ${id} not found`);
        return;
      }

      try {
        sa.status = 'completing';
        this._hideProgress(sa.charId);

        // ═══ COMPLETION: Walk to parent, report, leave ═══
        this._emitPhase(sa.id, 'subagent_complete');

        // Report to parent
        const parentPos = this._pos(sa.parentAgent);
        const currentPos = this._pos(sa.charId);
        await this._move(sa.charId, currentPos, parentPos, 1000);
        this._bubble(sa.charId, result || '✅ Task complete!', 2000);
        await wait(1000, this.config.animationSpeed);
        this._bubble(sa.parentAgent, '👍 Great work!', 1500);
        await wait(800, this.config.animationSpeed);

        // Walk to door
        const doorPos = this._objPos('door');
        await this._object('door', 'open');
        await this._move(sa.charId, parentPos, doorPos, this.timing.subagentCompletion);

        // Remove character and close door
        await safeCall(this._theme?.removeSubAgent, sa.charId);
        await this._object('door', 'closed');
        this._sound('door_close');

        sa.status = 'completed';
        sa.completedAt = Date.now();

      } catch (err) {
        console.error('[MissionController] Sub-agent completion error:', err);
        sa.status = 'failed';
      }

      this._activeSubAgents.delete(id);
      this._emitState();
    },

    // ── External event handlers ───────────────────────────────────

    _handleMissionProgress(data) {
      if (!data?.missionId) return;
      const m = this._activeMissions.get(data.missionId);
      if (!m) return;

      const pct = Math.round((data?.progress || data?.newProgress || 0) * 100);
      m.progress = pct / 100;

      // Update progress bars
      if (data?.agent) {
        this._progress(data.agent, pct);
        if (pct % 25 === 0) {
          this._bubble(data.agent, getProgressBubble(pct), 2000);
        }
      } else {
        for (const agentId of (m.assignedTo || [])) {
          this._progress(agentId, pct);
        }
      }
    },

    _handleMissionComplete(data) {
      if (!data?.missionId) return;
      const m = this._activeMissions.get(data.missionId);
      if (m) {
        m.status = 'completed';
        m.progress = 1.0;
      }
    },

    _handleSubAgentComplete(data) {
      if (!data?.id) return;
      this.completeSubAgent(data.id, data.result);
    },

    // ─── MISSION MANAGEMENT ──────────────────────────────────────

    /**
     * Cancel an active mission animation.
     * @param {string} missionId
     */
    cancelMission(missionId) {
      const m = this._activeMissions.get(missionId);
      if (!m) return false;

      // If this mission is the current sequence, abort it
      if (this._currentSequence === missionId && this._currentAbort) {
        this._currentAbort.abort();
      }

      m.status = 'cancelled';

      // Clean up progress bars
      for (const agentId of (m?.assignedTo || [])) {
        this._hideProgress(agentId);
        this._anim(agentId, 'idle');
      }

      this._notify(`❌ Mission cancelled: ${this._truncate(m.text, 30)}`, 'warning');
      this._emitState();
      return true;
    },

    /**
     * Get current state snapshot.
     */
    getState() {
      return {
        initialized: this._initialized,
        themeRegistered: !!this._theme,
        currentSequence: this._currentSequence,
        activeMissions: Object.fromEntries(
          Array.from(this._activeMissions.entries()).map(([id, m]) => [id, {
            id: m.id,
            text: m.text,
            status: m.status,
            progress: m.progress,
            assignedTo: m.assignedTo,
            startedAt: m.startedAt,
            completedAt: m.completedAt,
          }])
        ),
        activeSubAgents: Object.fromEntries(
          Array.from(this._activeSubAgents.entries()).map(([id, sa]) => [id, {
            id: sa.id,
            name: sa.name,
            task: sa.task,
            parentAgent: sa.parentAgent,
            status: sa.status,
            progress: sa.progress,
          }])
        ),
        queueLength: this._missionQueue.length,
        config: { ...this.config },
      };
    },

    // ── Queue processing ──────────────────────────────────────────

    _processQueue() {
      if (this._missionQueue.length > 0 && !this._currentSequence) {
        const next = this._missionQueue.shift();
        this._log('Processing queued mission:', next.text);
        this.executeMission(next);
      }
    },

    // ── Text helpers ──────────────────────────────────────────────

    _truncate(text, max) {
      if (!text) return '';
      return text.length > max ? text.slice(0, max - 1) + '…' : text;
    },

    _generateAgentTask(agentId, mission) {
      // Generate contextual task descriptions based on agent role
      const roleMap = {
        kira: ['Strategic oversight', 'Vision alignment', 'Final review'],
        hunter: ['Revenue analysis', 'Pipeline check', 'Deal coordination'],
        forge: ['Technical build', 'Architecture review', 'Code implementation'],
        echo: ['Content creation', 'Communications', 'Marketing prep'],
        sentinel: ['Security review', 'Audit check', 'Compliance scan'],
        atlas: ['Operations planning', 'Process optimization', 'Logistics'],
      };

      const tasks = roleMap[agentId] || ['Working on it', 'Contributing', 'Supporting'];
      return pickRandom(tasks);
    },

    // ─── DEMO MODE ───────────────────────────────────────────────

    /**
     * Run a full demo loop that showcases every interaction type.
     * Creates a living, breathing office — like opening Pokémon for the first time.
     * 
     * @param {Object} [opts]
     * @param {boolean} [opts.loop=true] — loop forever
     * @param {number} [opts.pauseBetween=3000] — pause between sequences (ms)
     */
    async demo(opts) {
      if (this._demoRunning) {
        this._log('Demo already running');
        return;
      }

      if (!this._theme) {
        console.warn('[MissionController] Cannot run demo — no theme registered');
        return;
      }

      const { loop = true, pauseBetween = 3000 } = opts || {};

      this._demoRunning = true;
      this._demoAbort = new AbortController();
      const signal = this._demoAbort.signal;

      console.log('🎮 ═══════════════════════════════════════');
      console.log('🎮  SPAWNKIT MISSION CONTROLLER — DEMO');
      console.log('🎮  Press MissionController.stopDemo()');
      console.log('🎮 ═══════════════════════════════════════');

      try {
        do {
          // ── ACT 1: A mission arrives ──────────────────
          console.log('🎮 Act 1: Mission arrives...');
          await this.executeMission({
            text: 'Build SpawnKit v2 Dashboard',
            assignedTo: this._agents().slice(0, 3), // First 3 agents
            priority: 'high',
          });

          if (signal.aborted) break;
          await wait(pauseBetween, this.config.animationSpeed, signal);

          // ── ACT 2: Cron job triggers ──────────────────
          console.log('🎮 Act 2: Cron triggers — phone rings!');
          await this.triggerCron({
            name: 'Morning Briefing',
            schedule: '0 9 * * *',
            owner: this._agents()[0],
          });

          if (signal.aborted) break;
          await wait(pauseBetween, this.config.animationSpeed, signal);

          // ── ACT 3: Sub-agent spawns ───────────────────
          console.log('🎮 Act 3: Sub-agent enters the office...');
          const saId = await this.spawnSubAgent({
            name: 'Theme Builder',
            task: 'Building the UI components',
            parentAgent: this._agents().length > 2 ? this._agents()[2] : this._ceo(),
          });

          if (signal.aborted) break;

          // Let the sub-agent work for a bit
          if (saId) {
            const sa = this._activeSubAgents.get(saId);
            if (sa) {
              // Simulate progress updates
              for (let p = 25; p <= 100; p += 25) {
                await wait(1500, this.config.animationSpeed, signal);
                if (signal.aborted) break;
                this._progress(sa.charId, p);
                if (p === 50) {
                  this._bubble(sa.charId, 'Halfway done! 🎯', 1500);
                }
              }

              if (!signal.aborted) {
                await wait(500, this.config.animationSpeed, signal);
                await this.completeSubAgent(saId, '✅ UI components ready!');
              }
            }
          }

          if (signal.aborted) break;
          await wait(pauseBetween, this.config.animationSpeed, signal);

          // ── ACT 4: Another mission → big celebration ──
          console.log('🎮 Act 4: Final mission — team celebration!');
          await this.executeMission({
            text: 'Ship SpawnKit v2 to Production 🚀',
            assignedTo: this._agents(), // Everyone!
            priority: 'critical',
          });

          if (signal.aborted) break;

          console.log('🎮 ── Demo cycle complete ──');
          await wait(pauseBetween * 2, this.config.animationSpeed, signal);

        } while (loop && !signal.aborted);

      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('[MissionController] Demo error:', err);
        }
      } finally {
        this._demoRunning = false;
        this._demoAbort = null;
        console.log('🎮 Demo ended');
      }
    },

    /**
     * Stop the running demo.
     */
    stopDemo() {
      if (this._demoAbort) {
        this._demoAbort.abort();
      }
      if (this._currentAbort) {
        this._currentAbort.abort();
      }
      this._demoRunning = false;
      console.log('🎮 Demo stopped');
    },

    /**
     * Quick test — fire a single mission without the full demo loop.
     * @param {string} [text] — mission text
     */
    async quickTest(text) {
      return this.executeMission({
        text: text || 'Quick test mission! 🧪',
        priority: 'normal',
      });
    },

    // ── Reset ─────────────────────────────────────────────────────

    /**
     * Reset all state — useful between theme switches.
     */
    reset() {
      this.stopDemo();
      this._activeMissions.clear();
      this._activeSubAgents.clear();
      this._missionQueue = [];
      this._currentSequence = null;
      this._currentAbort = null;
      this._theme = null;
      this._initialized = false;
      this._log('State reset');
    },
  };

  // ── Expose globally ─────────────────────────────────────────────
  window.MissionController = MissionController;

  // Auto-bind events when SpawnKit is available
  if (typeof document !== 'undefined') {
    const tryBind = () => {
      if (typeof SpawnKit !== 'undefined' && SpawnKit?.on) {
        MissionController._bindEvents();
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryBind);
    } else {
      tryBind();
    }
  }

  console.log('⚔️ MissionController loaded — register a theme to begin');

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));

// Export for Node.js / module bundlers
if (typeof module !== 'undefined' && module.exports) {
  module.exports = (typeof window !== 'undefined') ? window.MissionController : MissionController;
}
