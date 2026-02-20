/**
 * SpawnKit v2 — Achievement & Stats System (Gamification Layer)
 * ══════════════════════════════════════════════════════════════
 *
 * Makes users WANT to keep the tab open. Dopamine-driven engagement:
 * achievements, streaks, stats dashboard, productivity scoring.
 *
 * All state persisted to localStorage under `spawnkit-achievements-*` keys.
 * Hooks into SpawnKit event bus (SpawnKit.on / SpawnKit.emit) and
 * MissionController lifecycle.
 *
 * API: window.SpawnKitAchievements.{unlock, check, getAll, getStats, ...}
 *
 * @author Echo (CMO)
 * @version 2.0.0
 */

(function (global) {
  'use strict';

  // ═══════════════════════════════════════════════════════════════
  // ─── ACHIEVEMENT DEFINITIONS ──────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  const ACHIEVEMENTS = [
    // Getting Started
    { id: 'first_boot',      name: 'Power On!',         desc: 'Launch SpawnKit for the first time',     icon: '🎮', points: 10,  category: 'start' },
    { id: 'first_mission',   name: 'Quest Accepted',    desc: 'Complete your first mission',            icon: '⚔️', points: 20,  category: 'start' },
    { id: 'theme_explorer',  name: 'Theme Explorer',    desc: 'Try all 3 themes',                      icon: '🎨', points: 30,  category: 'start' },

    // Dedication
    { id: 'night_owl',       name: 'Night Owl',         desc: 'Use SpawnKit after midnight',            icon: '🦉', points: 15,  category: 'dedication' },
    { id: 'early_bird',      name: 'Early Bird',        desc: 'Use SpawnKit before 7 AM',               icon: '🐦', points: 15,  category: 'dedication' },
    { id: 'marathon',        name: 'Marathon Runner',    desc: 'Keep SpawnKit open for 1 hour',          icon: '🏃', points: 25,  category: 'dedication' },
    { id: 'dedicated',       name: 'Dedicated',         desc: 'Visit 7 days in a row',                  icon: '🔥', points: 50,  category: 'dedication' },

    // Productivity
    { id: 'ten_missions',    name: 'Task Master',       desc: 'Complete 10 missions',                   icon: '✅', points: 30,  category: 'productivity' },
    { id: 'fifty_missions',  name: 'Mission Legend',     desc: 'Complete 50 missions',                   icon: '🏆', points: 100, category: 'productivity' },
    { id: 'team_player',     name: 'Team Player',       desc: 'Involve all 5 agents in missions',       icon: '🤝', points: 40,  category: 'productivity' },

    // Fun
    { id: 'coffee_addict',   name: 'Coffee Addict',     desc: 'Visit the coffee station 10 times',      icon: '☕', points: 20,  category: 'fun' },
    { id: 'konami',          name: 'Old School',         desc: 'Enter the Konami code',                  icon: '🕹️', points: 50,  category: 'fun' },
    { id: 'sound_on',        name: 'Audiophile',         desc: 'Enable sound effects',                   icon: '🔊', points: 10,  category: 'fun' },
    { id: 'all_shortcuts',   name: 'Keyboard Warrior',   desc: 'Use every keyboard shortcut',            icon: '⌨️', points: 35,  category: 'fun' },

    // Mastery
    { id: 'all_achievements', name: 'Completionist',    desc: 'Unlock all other achievements',          icon: '💎', points: 200, category: 'mastery' },
  ];

  const TOTAL_POINTS = ACHIEVEMENTS.reduce((s, a) => s + a.points, 0);

  // ═══════════════════════════════════════════════════════════════
  // ─── STORAGE LAYER ────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  const KEYS = {
    unlocked:     'spawnkit-achievements-unlocked',
    stats:        'spawnkit-achievements-stats',
    streak:       'spawnkit-achievements-streak',
    themes:       'spawnkit-achievements-themes',
    shortcuts:    'spawnkit-achievements-shortcuts',
    agents:       'spawnkit-achievements-agents',
    coffeeCount:  'spawnkit-achievements-coffee',
    sessionStart: 'spawnkit-achievements-session-start',
  };

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  }

  function saveJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  // ═══════════════════════════════════════════════════════════════
  // ─── STATE ────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  /** Set of unlocked achievement IDs */
  let _unlocked = new Set(loadJSON(KEYS.unlocked, []));

  /** Cumulative stats */
  let _stats = Object.assign({
    totalMissions:      0,
    missionsToday:      0,
    missionsTodayDate:  null,   // YYYY-MM-DD
    totalUptime:        0,      // seconds
    agentMissions:      {},     // agentId → count
    favoriteAgent:      null,
    bootCount:          0,
  }, loadJSON(KEYS.stats, {}));

  /** Streak data */
  let _streak = Object.assign({
    current:    0,
    best:       0,
    lastVisit:  null,   // YYYY-MM-DD
    history:    [],     // last 30 dates
  }, loadJSON(KEYS.streak, {}));

  /** Themes visited (for theme_explorer) */
  let _themesVisited = new Set(loadJSON(KEYS.themes, []));

  /** Shortcuts used (for all_shortcuts tracking) */
  let _shortcutsUsed = new Set(loadJSON(KEYS.shortcuts, []));

  /** Agents involved in missions (for team_player) */
  let _agentsInvolved = new Set(loadJSON(KEYS.agents, []));

  /** Coffee station visit count */
  let _coffeeCount = loadJSON(KEYS.coffeeCount, 0);

  /** When this session started (for marathon tracking) */
  let _sessionStartTime = Date.now();

  /** Stats overlay visible? */
  let _overlayVisible = false;
  let _overlayEl = null;

  /** Toast queue */
  let _toastQueue = [];
  let _toastShowing = false;

  /** Uptime tracking interval */
  let _uptimeInterval = null;

  /** Marathon check interval */
  let _marathonInterval = null;

  /** Konami code tracker */
  let _konamiBuffer = [];
  const KONAMI_SEQUENCE = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'b', 'a'
  ];

  // All known keyboard shortcuts in SpawnKit
  const ALL_SHORTCUTS = new Set([
    '1', '2', '3', '4', '5',   // Select agents
    'm',                         // New mission
    'd',                         // Demo
    'c',                         // Coffee
    'Escape',                    // Close/cancel
    'Tab',                       // Stats overlay
  ]);

  // ═══════════════════════════════════════════════════════════════
  // ─── THEME DETECTION ──────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  function getCurrentTheme() {
    return localStorage.getItem('spawnkit-theme') || 'cyberpunk';
  }

  // ═══════════════════════════════════════════════════════════════
  // ─── DATE HELPERS ─────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function daysBetween(dateStr1, dateStr2) {
    const d1 = new Date(dateStr1 + 'T00:00:00');
    const d2 = new Date(dateStr2 + 'T00:00:00');
    return Math.round((d2 - d1) / 86400000);
  }

  function formatUptime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  // ═══════════════════════════════════════════════════════════════
  // ─── PERSISTENCE ──────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  function persist() {
    saveJSON(KEYS.unlocked,    Array.from(_unlocked));
    saveJSON(KEYS.stats,       _stats);
    saveJSON(KEYS.streak,      _streak);
    saveJSON(KEYS.themes,      Array.from(_themesVisited));
    saveJSON(KEYS.shortcuts,   Array.from(_shortcutsUsed));
    saveJSON(KEYS.agents,      Array.from(_agentsInvolved));
    saveJSON(KEYS.coffeeCount, _coffeeCount);
  }

  // ═══════════════════════════════════════════════════════════════
  // ─── PARTICLE SYSTEM (Celebration effect) ─────────────────────
  // ═══════════════════════════════════════════════════════════════

  function spawnParticles(containerEl, count) {
    const theme = getCurrentTheme();
    const colors = {
      gameboy:   ['#9BBB0F', '#8BAC0F', '#306230', '#0F380F'],
      cyberpunk: ['#00ffff', '#ff00ff', '#ffff00', '#00ff00', '#ff3366'],
      executive: ['#c9a876', '#d4b886', '#f5f0e0', '#ffffff', '#ffd700'],
    };
    const palette = colors[theme] || colors.cyberpunk;

    for (let i = 0; i < (count || 20); i++) {
      const p = document.createElement('div');
      const size = 4 + Math.random() * 6;
      const angle = Math.random() * Math.PI * 2;
      const velocity = 60 + Math.random() * 120;
      const dx = Math.cos(angle) * velocity;
      const dy = Math.sin(angle) * velocity;
      const color = palette[Math.floor(Math.random() * palette.length)];
      const dur = 600 + Math.random() * 800;

      Object.assign(p.style, {
        position: 'absolute',
        width: size + 'px',
        height: size + 'px',
        background: color,
        borderRadius: theme === 'gameboy' ? '0' : '50%',
        left: '50%',
        top: '50%',
        pointerEvents: 'none',
        zIndex: '100001',
        boxShadow: theme === 'cyberpunk' ? `0 0 ${size}px ${color}` : 'none',
      });

      containerEl.appendChild(p);

      // Animate with keyframes
      p.animate([
        { transform: 'translate(-50%, -50%) translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(0)`, opacity: 0 },
      ], { duration: dur, easing: 'cubic-bezier(0, 0.8, 0.5, 1)', fill: 'forwards' });

      setTimeout(() => p.remove(), dur + 50);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ─── TOAST NOTIFICATION SYSTEM ────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  function ensureToastContainer() {
    let c = document.getElementById('spawnkit-toast-container');
    if (c) return c;

    c = document.createElement('div');
    c.id = 'spawnkit-toast-container';
    Object.assign(c.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: '100000',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      pointerEvents: 'none',
    });
    document.body.appendChild(c);
    return c;
  }

  function showToast(achievement) {
    _toastQueue.push(achievement);
    if (!_toastShowing) processToastQueue();
  }

  function processToastQueue() {
    if (_toastQueue.length === 0) {
      _toastShowing = false;
      return;
    }
    _toastShowing = true;
    const achievement = _toastQueue.shift();
    renderToast(achievement);
  }

  function renderToast(achievement) {
    const container = ensureToastContainer();
    const theme = getCurrentTheme();
    const toast = document.createElement('div');
    toast.className = 'spawnkit-achievement-toast';

    // Theme-adaptive styles
    const themeStyles = {
      gameboy: {
        bg: '#0F380F',
        border: '3px solid #9BBB0F',
        color: '#9BBB0F',
        fontFamily: "'Press Start 2P', 'Courier New', monospace",
        borderRadius: '0',
        boxShadow: 'inset -2px -2px 0 #306230, inset 2px 2px 0 #8BAC0F',
        fontSize: '10px',
        pointsColor: '#8BAC0F',
        labelBg: '#306230',
        imageRendering: 'pixelated',
      },
      cyberpunk: {
        bg: 'rgba(10, 0, 30, 0.95)',
        border: '1px solid #00ffff',
        color: '#00ffff',
        fontFamily: "'Orbitron', 'Courier New', monospace",
        borderRadius: '4px',
        boxShadow: '0 0 20px rgba(0, 255, 255, 0.4), 0 0 40px rgba(0, 255, 255, 0.1), inset 0 0 20px rgba(0, 255, 255, 0.05)',
        fontSize: '12px',
        pointsColor: '#ff00ff',
        labelBg: 'rgba(0, 255, 255, 0.1)',
        textShadow: '0 0 10px rgba(0, 255, 255, 0.8)',
      },
      executive: {
        bg: 'linear-gradient(135deg, #1c1c1c 0%, #2c2416 100%)',
        border: '2px solid #c9a876',
        color: '#f5f0e0',
        fontFamily: "'Georgia', 'Times New Roman', serif",
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(201, 168, 118, 0.3)',
        fontSize: '13px',
        pointsColor: '#ffd700',
        labelBg: 'rgba(201, 168, 118, 0.15)',
      },
    };

    const s = themeStyles[theme] || themeStyles.cyberpunk;

    Object.assign(toast.style, {
      background: s.bg,
      border: s.border,
      color: s.color,
      fontFamily: s.fontFamily,
      borderRadius: s.borderRadius,
      boxShadow: s.boxShadow,
      fontSize: s.fontSize,
      padding: '16px 20px',
      minWidth: '280px',
      maxWidth: '360px',
      pointerEvents: 'auto',
      cursor: 'pointer',
      position: 'relative',
      overflow: 'hidden',
      transform: 'translateX(120%)',
      transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
      backdropFilter: 'blur(10px)',
    });

    if (s.textShadow) toast.style.textShadow = s.textShadow;
    if (s.imageRendering) toast.style.imageRendering = s.imageRendering;

    // Inner HTML
    toast.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px;">
        <div style="font-size:32px; line-height:1; flex-shrink:0; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
          ${achievement.icon}
        </div>
        <div style="flex:1; min-width:0;">
          <div style="
            font-size:9px;
            text-transform:uppercase;
            letter-spacing:2px;
            opacity:0.7;
            margin-bottom:4px;
            ${theme === 'gameboy' ? 'font-size:7px;' : ''}
          ">🏆 Achievement Unlocked!</div>
          <div style="
            font-weight:bold;
            font-size:${theme === 'gameboy' ? '11px' : '15px'};
            margin-bottom:2px;
            white-space:nowrap;
            overflow:hidden;
            text-overflow:ellipsis;
          ">${achievement.name}</div>
          <div style="
            font-size:${theme === 'gameboy' ? '8px' : '11px'};
            opacity:0.7;
          ">${achievement.desc}</div>
        </div>
        <div style="
          background:${s.labelBg};
          padding:4px 10px;
          border-radius:${theme === 'gameboy' ? '0' : '12px'};
          font-size:${theme === 'gameboy' ? '9px' : '12px'};
          font-weight:bold;
          color:${s.pointsColor};
          white-space:nowrap;
          flex-shrink:0;
        ">+${achievement.points}</div>
      </div>
    `;

    // Scanline effect for cyberpunk
    if (theme === 'cyberpunk') {
      const scanline = document.createElement('div');
      Object.assign(scanline.style, {
        position: 'absolute', top: '0', left: '0', right: '0', bottom: '0',
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.03) 2px, rgba(0,255,255,0.03) 4px)',
        pointerEvents: 'none',
      });
      toast.appendChild(scanline);
    }

    // Shimmer bar at top for executive
    if (theme === 'executive') {
      const shimmer = document.createElement('div');
      Object.assign(shimmer.style, {
        position: 'absolute', top: '0', left: '0', right: '0', height: '2px',
        background: 'linear-gradient(90deg, transparent, #ffd700, transparent)',
        animation: 'spawnkit-shimmer 2s ease-in-out infinite',
      });
      toast.appendChild(shimmer);
    }

    // Pixel top bar for gameboy
    if (theme === 'gameboy') {
      const pixBar = document.createElement('div');
      Object.assign(pixBar.style, {
        position: 'absolute', top: '0', left: '0', right: '0', height: '3px',
        background: '#9BBB0F',
      });
      toast.appendChild(pixBar);
    }

    container.appendChild(toast);

    // Slide in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0)';
      });
    });

    // Play sound (if GameBoy FX or theme sounds available)
    _playAchievementSound();

    // Spawn celebration particles
    setTimeout(() => spawnParticles(toast, 24), 300);

    // Click to dismiss
    toast.addEventListener('click', () => dismissToast(toast));

    // Auto-dismiss after 5s
    setTimeout(() => dismissToast(toast), 5000);
  }

  function dismissToast(toast) {
    if (toast._dismissed) return;
    toast._dismissed = true;
    toast.style.transform = 'translateX(120%)';
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
      // Process next in queue
      setTimeout(processToastQueue, 300);
    }, 500);
  }

  function _playAchievementSound() {
    // Try to use MissionController's sound system
    if (typeof MissionController !== 'undefined' && MissionController?.config?.soundEffects && MissionController?._theme?.playSound) {
      try { MissionController._theme.playSound('achievement'); } catch {}
      return;
    }

    // Fallback: generate a chiptune-style achievement jingle with Web Audio
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      // Ascending arpeggio — C5, E5, G5, C6
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = getCurrentTheme() === 'gameboy' ? 'square' : 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        osc.connect(gain);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.15);
      });
    } catch {}
  }

  // ═══════════════════════════════════════════════════════════════
  // ─── INJECT GLOBAL CSS ────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  function injectCSS() {
    if (document.getElementById('spawnkit-achievements-css')) return;
    const style = document.createElement('style');
    style.id = 'spawnkit-achievements-css';
    style.textContent = `
      @keyframes spawnkit-shimmer {
        0%, 100% { opacity: 0.3; transform: translateX(-100%); }
        50% { opacity: 1; transform: translateX(100%); }
      }

      @keyframes spawnkit-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }

      @keyframes spawnkit-glow {
        0%, 100% { box-shadow: 0 0 5px rgba(0, 255, 255, 0.3); }
        50% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.6); }
      }

      @keyframes spawnkit-fadeIn {
        from { opacity: 0; transform: scale(0.95); }
        to   { opacity: 1; transform: scale(1); }
      }

      @keyframes spawnkit-slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      @keyframes spawnkit-streak-fire {
        0%, 100% { transform: scale(1) rotate(-2deg); }
        25% { transform: scale(1.1) rotate(2deg); }
        50% { transform: scale(1.05) rotate(-1deg); }
        75% { transform: scale(1.15) rotate(1deg); }
      }

      #spawnkit-stats-overlay {
        animation: spawnkit-fadeIn 0.3s ease-out;
      }

      #spawnkit-stats-overlay .stat-row {
        animation: spawnkit-slideUp 0.3s ease-out both;
      }

      #spawnkit-stats-overlay .achievement-badge {
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        cursor: default;
      }

      #spawnkit-stats-overlay .achievement-badge:hover {
        transform: scale(1.15);
      }

      #spawnkit-stats-overlay .achievement-badge.locked {
        filter: grayscale(1) brightness(0.4);
        opacity: 0.4;
      }

      #spawnkit-stats-overlay .achievement-badge.locked:hover {
        filter: grayscale(0.5) brightness(0.6);
        opacity: 0.7;
      }
    `;
    document.head.appendChild(style);
  }

  // ═══════════════════════════════════════════════════════════════
  // ─── STREAK TRACKER ───────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  function updateStreak() {
    const today = todayStr();

    if (_streak.lastVisit === today) return; // already counted today

    if (_streak.lastVisit) {
      const gap = daysBetween(_streak.lastVisit, today);
      if (gap === 1) {
        // Consecutive day — extend streak
        _streak.current++;
      } else if (gap > 1) {
        // Streak broken
        _streak.current = 1;
      }
    } else {
      _streak.current = 1;
    }

    _streak.lastVisit = today;
    if (_streak.current > _streak.best) _streak.best = _streak.current;

    // Update history (keep last 30)
    _streak.history.push(today);
    if (_streak.history.length > 30) _streak.history.shift();

    persist();

    // Milestone notifications
    const milestones = [3, 7, 14, 30, 50, 100];
    if (milestones.includes(_streak.current)) {
      _showStreakMilestone(_streak.current);
    }

    // Check dedicated achievement (7-day streak)
    if (_streak.current >= 7) {
      SpawnKitAchievements.unlock('dedicated');
    }
  }

  function _showStreakMilestone(days) {
    const messages = {
      3:   { icon: '🔥', msg: '3-day streak! You\'re on fire!' },
      7:   { icon: '🔥🔥', msg: '7-day streak! Unstoppable!' },
      14:  { icon: '🔥🔥🔥', msg: '2-week streak! Legend!' },
      30:  { icon: '🌟', msg: '30-day streak! You ARE SpawnKit!' },
      50:  { icon: '💫', msg: '50-day streak! Mythical!' },
      100: { icon: '👑', msg: '100-day streak! Ultimate!' },
    };
    const m = messages[days] || { icon: '🔥', msg: `${days}-day streak!` };

    // Show as a pseudo-achievement toast
    showToast({
      icon: m.icon,
      name: `${days}-Day Streak!`,
      desc: m.msg,
      points: days,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // ─── PRODUCTIVITY SCORE ───────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  function getProductivityScore() {
    const missionScore = _stats.totalMissions * 10;
    const achievementScore = _unlocked.size * 5;
    const streakScore = _streak.current * 3;
    return missionScore + achievementScore + streakScore;
  }

  function getScoreBadge(score) {
    if (score >= 500) return { emoji: '💎', label: 'Diamond' };
    if (score >= 300) return { emoji: '🥇', label: 'Gold' };
    if (score >= 100) return { emoji: '🥈', label: 'Silver' };
    return { emoji: '🥉', label: 'Bronze' };
  }

  // ═══════════════════════════════════════════════════════════════
  // ─── STATS OVERLAY ────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  function showStatsOverlay() {
    if (_overlayVisible) { hideStatsOverlay(); return; }
    _overlayVisible = true;

    const theme = getCurrentTheme();
    const score = getProductivityScore();
    const badge = getScoreBadge(score);
    const achievementPoints = ACHIEVEMENTS.filter(a => _unlocked.has(a.id)).reduce((s, a) => s + a.points, 0);
    const today = todayStr();

    // Ensure missionsToday is for today
    if (_stats.missionsTodayDate !== today) {
      _stats.missionsToday = 0;
      _stats.missionsTodayDate = today;
    }

    // Find favorite agent
    let favAgent = '—';
    if (_stats.agentMissions && Object.keys(_stats.agentMissions).length) {
      const sorted = Object.entries(_stats.agentMissions).sort((a, b) => b[1] - a[1]);
      favAgent = sorted?.[0]?.[0] || '—';
    }

    // Current session uptime
    const sessionUptime = Math.floor((Date.now() - _sessionStartTime) / 1000);
    const totalUp = _stats.totalUptime + sessionUptime;

    // Theme-specific overlay styles
    const themeOverlay = {
      gameboy: {
        bg: 'rgba(15, 56, 15, 0.97)',
        border: '4px solid #9BBB0F',
        color: '#9BBB0F',
        fontFamily: "'Press Start 2P', 'Courier New', monospace",
        headerColor: '#9BBB0F',
        sectionBg: 'rgba(48, 98, 48, 0.5)',
        accentColor: '#8BAC0F',
        lockedColor: '#306230',
        borderRadius: '0',
        badgeBorder: '2px solid #8BAC0F',
        fontSize: '10px',
      },
      cyberpunk: {
        bg: 'rgba(5, 0, 20, 0.97)',
        border: '1px solid #00ffff',
        color: '#00ffff',
        fontFamily: "'Orbitron', 'Courier New', monospace",
        headerColor: '#00ffff',
        sectionBg: 'rgba(0, 255, 255, 0.05)',
        accentColor: '#ff00ff',
        lockedColor: '#333',
        borderRadius: '4px',
        badgeBorder: '1px solid rgba(0, 255, 255, 0.3)',
        fontSize: '12px',
        textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
      },
      executive: {
        bg: 'rgba(20, 18, 14, 0.97)',
        border: '2px solid #c9a876',
        color: '#f5f0e0',
        fontFamily: "'Georgia', 'Times New Roman', serif",
        headerColor: '#c9a876',
        sectionBg: 'rgba(201, 168, 118, 0.08)',
        accentColor: '#ffd700',
        lockedColor: '#444',
        borderRadius: '12px',
        badgeBorder: '1px solid rgba(201, 168, 118, 0.3)',
        fontSize: '13px',
      },
    };

    const ts = themeOverlay[theme] || themeOverlay.cyberpunk;

    // Build overlay
    const overlay = document.createElement('div');
    overlay.id = 'spawnkit-stats-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0', left: '0', width: '100vw', height: '100vh',
      zIndex: '99998',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(8px)',
    });

    const panel = document.createElement('div');
    Object.assign(panel.style, {
      background: ts.bg,
      border: ts.border,
      color: ts.color,
      fontFamily: ts.fontFamily,
      borderRadius: ts.borderRadius,
      padding: '32px 40px',
      minWidth: '420px',
      maxWidth: '560px',
      maxHeight: '80vh',
      overflowY: 'auto',
      position: 'relative',
    });
    if (ts.textShadow) panel.style.textShadow = ts.textShadow;

    // Scanlines for cyberpunk
    if (theme === 'cyberpunk') {
      const scanBg = document.createElement('div');
      Object.assign(scanBg.style, {
        position: 'absolute', top: '0', left: '0', right: '0', bottom: '0',
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.02) 2px, rgba(0,255,255,0.02) 4px)',
        pointerEvents: 'none', borderRadius: ts.borderRadius,
      });
      panel.appendChild(scanBg);
    }

    // Build stats HTML
    const unlockedList = ACHIEVEMENTS.filter(a => _unlocked.has(a.id));
    const lockedList = ACHIEVEMENTS.filter(a => !_unlocked.has(a.id));

    let achievementsHTML = '';
    ACHIEVEMENTS.forEach(a => {
      const isUnlocked = _unlocked.has(a.id);
      achievementsHTML += `
        <div class="achievement-badge ${isUnlocked ? '' : 'locked'}" 
             title="${isUnlocked ? a.name + ': ' + a.desc + ' (+' + a.points + ' pts)' : '🔒 ' + a.name + ': ' + a.desc}"
             style="
               display:inline-flex; align-items:center; justify-content:center;
               width:44px; height:44px; font-size:22px;
               border:${ts.badgeBorder}; border-radius:${theme === 'gameboy' ? '0' : '8px'};
               background:${isUnlocked ? ts.sectionBg : 'transparent'};
               margin:4px;
             ">
          ${isUnlocked ? a.icon : '🔒'}
        </div>
      `;
    });

    // Streak visual
    const streakEmoji = _streak.current >= 7 ? '🔥🔥🔥' : _streak.current >= 3 ? '🔥🔥' : _streak.current >= 1 ? '🔥' : '❄️';
    const streakStyle = _streak.current >= 3 ? 'animation: spawnkit-streak-fire 1s ease-in-out infinite;' : '';

    panel.innerHTML += `
      <div style="position:relative; z-index:1;">
        <!-- Header -->
        <div style="text-align:center; margin-bottom:24px;">
          <div style="font-size:${theme === 'gameboy' ? '12px' : '20px'}; font-weight:bold; color:${ts.headerColor}; margin-bottom:4px;">
            📊 YOUR FLEET STATS
          </div>
          <div style="font-size:${theme === 'gameboy' ? '8px' : '11px'}; opacity:0.6;">
            ${badge.emoji} ${badge.label} Fleet Commander
          </div>
        </div>

        <!-- Stats Grid -->
        <div style="
          background:${ts.sectionBg}; 
          border-radius:${theme === 'gameboy' ? '0' : '8px'}; 
          padding:16px 20px; 
          margin-bottom:16px;
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px 24px;
        ">
          <div class="stat-row" style="animation-delay:0.05s">
            <div style="font-size:${theme === 'gameboy' ? '7px' : '10px'}; opacity:0.6; text-transform:uppercase; letter-spacing:1px;">Total Missions</div>
            <div style="font-size:${theme === 'gameboy' ? '12px' : '18px'}; font-weight:bold;">${_stats.totalMissions}</div>
          </div>
          <div class="stat-row" style="animation-delay:0.1s">
            <div style="font-size:${theme === 'gameboy' ? '7px' : '10px'}; opacity:0.6; text-transform:uppercase; letter-spacing:1px;">Missions Today</div>
            <div style="font-size:${theme === 'gameboy' ? '12px' : '18px'}; font-weight:bold;">${_stats.missionsToday}</div>
          </div>
          <div class="stat-row" style="animation-delay:0.15s">
            <div style="font-size:${theme === 'gameboy' ? '7px' : '10px'}; opacity:0.6; text-transform:uppercase; letter-spacing:1px;">Favorite Agent</div>
            <div style="font-size:${theme === 'gameboy' ? '10px' : '14px'}; font-weight:bold;">${favAgent}</div>
          </div>
          <div class="stat-row" style="animation-delay:0.2s">
            <div style="font-size:${theme === 'gameboy' ? '7px' : '10px'}; opacity:0.6; text-transform:uppercase; letter-spacing:1px;">Total Uptime</div>
            <div style="font-size:${theme === 'gameboy' ? '10px' : '14px'}; font-weight:bold;">${formatUptime(totalUp)}</div>
          </div>
          <div class="stat-row" style="animation-delay:0.25s">
            <div style="font-size:${theme === 'gameboy' ? '7px' : '10px'}; opacity:0.6; text-transform:uppercase; letter-spacing:1px;">Current Streak</div>
            <div style="font-size:${theme === 'gameboy' ? '10px' : '14px'}; font-weight:bold;">
              <span style="${streakStyle} display:inline-block;">${streakEmoji}</span> ${_streak.current} day${_streak.current !== 1 ? 's' : ''}
            </div>
          </div>
          <div class="stat-row" style="animation-delay:0.3s">
            <div style="font-size:${theme === 'gameboy' ? '7px' : '10px'}; opacity:0.6; text-transform:uppercase; letter-spacing:1px;">Productivity</div>
            <div style="font-size:${theme === 'gameboy' ? '10px' : '14px'}; font-weight:bold; color:${ts.accentColor};">${badge.emoji} ${score}</div>
          </div>
        </div>

        <!-- Achievement Score Bar -->
        <div style="margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; font-size:${theme === 'gameboy' ? '8px' : '11px'}; margin-bottom:6px;">
            <span>🏆 Achievement Score</span>
            <span style="color:${ts.accentColor}; font-weight:bold;">${achievementPoints} / ${TOTAL_POINTS}</span>
          </div>
          <div style="
            height:${theme === 'gameboy' ? '8px' : '6px'};
            background:${ts.lockedColor};
            border-radius:${theme === 'gameboy' ? '0' : '3px'};
            overflow:hidden;
          ">
            <div style="
              height:100%;
              width:${Math.round((achievementPoints / TOTAL_POINTS) * 100)}%;
              background:${theme === 'cyberpunk' ? 'linear-gradient(90deg, #00ffff, #ff00ff)' : theme === 'executive' ? 'linear-gradient(90deg, #c9a876, #ffd700)' : '#9BBB0F'};
              border-radius:${theme === 'gameboy' ? '0' : '3px'};
              transition: width 0.5s ease;
              ${theme === 'cyberpunk' ? 'box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);' : ''}
            "></div>
          </div>
        </div>

        <!-- Achievements -->
        <div style="
          background:${ts.sectionBg}; 
          border-radius:${theme === 'gameboy' ? '0' : '8px'}; 
          padding:16px 20px; 
          margin-bottom:16px;
        ">
          <div style="
            font-size:${theme === 'gameboy' ? '9px' : '13px'}; 
            font-weight:bold; 
            margin-bottom:12px;
            color:${ts.headerColor};
          ">
            🏆 ACHIEVEMENTS (${unlockedList.length}/${ACHIEVEMENTS.length})
          </div>
          <div style="display:flex; flex-wrap:wrap; justify-content:center;">
            ${achievementsHTML}
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align:center; font-size:${theme === 'gameboy' ? '7px' : '10px'}; opacity:0.5;">
          Press <kbd style="
            background:${ts.sectionBg}; 
            padding:2px 6px; 
            border-radius:3px; 
            border:1px solid ${ts.headerColor}40;
          ">TAB</kbd> or <kbd style="
            background:${ts.sectionBg}; 
            padding:2px 6px; 
            border-radius:3px; 
            border:1px solid ${ts.headerColor}40;
          ">ESC</kbd> to close
        </div>
      </div>
    `;

    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    _overlayEl = overlay;

    // Click overlay bg to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) hideStatsOverlay();
    });
  }

  function hideStatsOverlay() {
    if (!_overlayVisible || !_overlayEl) return;
    _overlayVisible = false;
    _overlayEl.style.opacity = '0';
    _overlayEl.style.transition = 'opacity 0.2s ease';
    setTimeout(() => {
      if (_overlayEl && _overlayEl.parentNode) _overlayEl.parentNode.removeChild(_overlayEl);
      _overlayEl = null;
    }, 200);
  }

  // ═══════════════════════════════════════════════════════════════
  // ─── ACHIEVEMENT UNLOCK ENGINE ────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  function unlock(achievementId) {
    if (_unlocked.has(achievementId)) return false;

    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement) {
      console.warn(`[Achievements] Unknown achievement: ${achievementId}`);
      return false;
    }

    _unlocked.add(achievementId);
    persist();

    // Show toast
    showToast(achievement);

    // Emit event
    if (typeof SpawnKit !== 'undefined' && SpawnKit?.emit) {
      SpawnKit.emit('achievement:unlocked', { achievement, total: _unlocked.size });
    }

    console.log(`[Achievements] 🏆 Unlocked: ${achievement.icon} ${achievement.name} (+${achievement.points})`);

    // Check completionist (all OTHER achievements unlocked)
    const nonCompletionist = ACHIEVEMENTS.filter(a => a.id !== 'all_achievements');
    if (nonCompletionist.every(a => _unlocked.has(a.id))) {
      // Slight delay so the current toast shows first
      setTimeout(() => unlock('all_achievements'), 2000);
    }

    return true;
  }

  function check(achievementId) {
    return _unlocked.has(achievementId);
  }

  // ═══════════════════════════════════════════════════════════════
  // ─── EVENT HOOKS & AUTO-TRACKING ─────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  function bindSpawnKitEvents() {
    if (typeof SpawnKit === 'undefined' || !SpawnKit?.on) return;

    // Mission complete → track stats + achievements
    SpawnKit.on('mission:complete', (data) => {
      const today = todayStr();
      _stats.totalMissions++;

      if (_stats.missionsTodayDate !== today) {
        _stats.missionsToday = 1;
        _stats.missionsTodayDate = today;
      } else {
        _stats.missionsToday++;
      }

      // Track agents involved
      if (data?.assignedTo) {
        const agents = Array.isArray(data.assignedTo) ? data.assignedTo : [data.assignedTo];
        (agents || []).forEach(agentId => {
          _agentsInvolved.add(agentId);
          _stats.agentMissions[agentId] = (_stats.agentMissions[agentId] || 0) + 1;
        });
      }

      // Update favorite agent
      if (_stats.agentMissions && Object.keys(_stats.agentMissions).length) {
        const sorted = Object.entries(_stats.agentMissions).sort((a, b) => b[1] - a[1]);
        _stats.favoriteAgent = sorted?.[0]?.[0] || null;
      }

      persist();

      // Check mission achievements
      if (_stats.totalMissions === 1) unlock('first_mission');
      if (_stats.totalMissions >= 10) unlock('ten_missions');
      if (_stats.totalMissions >= 50) unlock('fifty_missions');

      // Team player: all 5 agents involved
      if (_agentsInvolved.size >= 5) unlock('team_player');
    });

    // Theme switch → track for theme_explorer
    SpawnKit.on('theme:changed', (data) => {
      if (data?.theme) {
        _themesVisited.add(data.theme);
        persist();
        if (_themesVisited.size >= 3) unlock('theme_explorer');
      }
    });
  }

  function bindKeyboardTracking() {
    document.addEventListener('keydown', (e) => {
      // Stats overlay toggle (Tab)
      if (e.key === 'Tab') {
        e.preventDefault();
        if (_overlayVisible) {
          hideStatsOverlay();
        } else {
          showStatsOverlay();
        }
        // Track shortcut
        _shortcutsUsed.add('Tab');
        persist();
        _checkShortcutsAchievement();
        return;
      }

      // Close overlay on Escape
      if (e.key === 'Escape' && _overlayVisible) {
        hideStatsOverlay();
        _shortcutsUsed.add('Escape');
        persist();
        _checkShortcutsAchievement();
        return;
      }

      // Konami code tracking
      _konamiBuffer.push(e.key);
      if (_konamiBuffer.length > KONAMI_SEQUENCE.length) {
        _konamiBuffer.shift();
      }
      if (_konamiBuffer.length === KONAMI_SEQUENCE.length &&
          _konamiBuffer.every((k, i) => k === KONAMI_SEQUENCE[i])) {
        unlock('konami');
        _konamiBuffer = [];
      }

      // Track known shortcuts
      if (ALL_SHORTCUTS.has(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        _shortcutsUsed.add(e.key);
        persist();
        _checkShortcutsAchievement();
      }
    });
  }

  function _checkShortcutsAchievement() {
    // All known shortcuts used?
    const allUsed = Array.from(ALL_SHORTCUTS).every(k => _shortcutsUsed.has(k));
    if (allUsed) unlock('all_shortcuts');
  }

  function bindTimeChecks() {
    // Check time-based achievements every 30 seconds
    setInterval(() => {
      const hour = new Date().getHours();

      // Night owl (midnight to 4 AM)
      if (hour >= 0 && hour < 4) {
        unlock('night_owl');
      }

      // Early bird (before 7 AM, but after 4 AM so it doesn't overlap with night owl too much)
      if (hour >= 4 && hour < 7) {
        unlock('early_bird');
      }
    }, 30000);

    // Check immediately on load
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 4) unlock('night_owl');
    if (hour >= 4 && hour < 7) unlock('early_bird');
  }

  function bindMarathonTracker() {
    // Check every minute if session has been open 1 hour
    _marathonInterval = setInterval(() => {
      const elapsed = Date.now() - _sessionStartTime;
      if (elapsed >= 3600000) { // 1 hour in ms
        unlock('marathon');
        clearInterval(_marathonInterval);
      }
    }, 60000);
  }

  function bindUptimeTracker() {
    // Save uptime every 30 seconds
    _uptimeInterval = setInterval(() => {
      _stats.totalUptime += 30;
      persist();
    }, 30000);

    // Save on unload
    window.addEventListener('beforeunload', () => {
      const sessionSeconds = Math.floor((Date.now() - _sessionStartTime) / 1000);
      // We've been saving every 30s, so only add the remainder
      const remainder = sessionSeconds % 30;
      _stats.totalUptime += remainder;
      persist();
    });
  }

  function bindCoffeeTracking() {
    // Listen for coffee station interactions
    if (typeof SpawnKit !== 'undefined' && SpawnKit?.on) {
      SpawnKit.on('coffee:visit', () => {
        _coffeeCount++;
        saveJSON(KEYS.coffeeCount, _coffeeCount);
        if (_coffeeCount >= 10) unlock('coffee_addict');
      });
    }

    // Also hook into keyboard shortcut 'c' for coffee
    document.addEventListener('keydown', (e) => {
      if (e.key === 'c' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.target.matches('input, textarea')) {
        _coffeeCount++;
        saveJSON(KEYS.coffeeCount, _coffeeCount);
        if (_coffeeCount >= 10) unlock('coffee_addict');
      }
    });
  }

  function bindSoundTracking() {
    // When sound is enabled, unlock audiophile
    if (typeof SpawnKit !== 'undefined' && SpawnKit?.on) {
      SpawnKit.on('sound:enabled', () => {
        unlock('sound_on');
      });
    }

    // Also check MissionController config
    const checkSound = () => {
      if (typeof MissionController !== 'undefined' && MissionController?.config?.soundEffects) {
        unlock('sound_on');
      }
    };
    setTimeout(checkSound, 2000);
    setTimeout(checkSound, 10000);
  }

  function bindThemeTracking() {
    // Track current theme on load
    const currentTheme = getCurrentTheme();
    _themesVisited.add(currentTheme);
    persist();

    // Watch for changes via localStorage
    window.addEventListener('storage', (e) => {
      if (e.key === 'spawnkit-theme' && e.newValue) {
        _themesVisited.add(e.newValue);
        persist();
        if (_themesVisited.size >= 3) unlock('theme_explorer');
      }
    });

    // Check if already visited all 3
    if (_themesVisited.size >= 3) unlock('theme_explorer');
  }

  // ═══════════════════════════════════════════════════════════════
  // ─── INITIALIZATION ───────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  function init() {
    injectCSS();

    // Boot count + first_boot achievement
    _stats.bootCount++;
    persist();
    if (_stats.bootCount === 1) {
      // Slight delay so the page has loaded
      setTimeout(() => unlock('first_boot'), 1500);
    }

    // Update streak
    updateStreak();

    // Reset today's missions if new day
    const today = todayStr();
    if (_stats.missionsTodayDate !== today) {
      _stats.missionsToday = 0;
      _stats.missionsTodayDate = today;
      persist();
    }

    // Bind all trackers
    bindSpawnKitEvents();
    bindKeyboardTracking();
    bindTimeChecks();
    bindMarathonTracker();
    bindUptimeTracker();
    bindCoffeeTracking();
    bindSoundTracking();
    bindThemeTracking();

    console.log(`[Achievements] 🎮 System initialized — ${_unlocked.size}/${ACHIEVEMENTS.length} unlocked, streak: ${_streak.current} days`);
  }

  // ═══════════════════════════════════════════════════════════════
  // ─── PUBLIC API ───────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  const SpawnKitAchievements = {
    /** Unlock an achievement by ID. Returns true if newly unlocked. */
    unlock(achievementId) {
      return unlock(achievementId);
    },

    /** Check if an achievement is unlocked. */
    check(achievementId) {
      return check(achievementId);
    },

    /** Get all achievements with their unlock status. */
    getAll() {
      return ACHIEVEMENTS.map(a => ({
        ...a,
        unlocked: _unlocked.has(a.id),
        unlockedAt: null, // Could be enhanced with timestamps
      }));
    },

    /** Get comprehensive stats object. */
    getStats() {
      const sessionUptime = Math.floor((Date.now() - _sessionStartTime) / 1000);
      return {
        totalMissions:    _stats.totalMissions,
        missionsToday:    _stats.missionsToday,
        favoriteAgent:    _stats.favoriteAgent || '—',
        totalUptime:      _stats.totalUptime + sessionUptime,
        uptimeFormatted:  formatUptime(_stats.totalUptime + sessionUptime),
        currentStreak:    _streak.current,
        bestStreak:       _streak.best,
        bootCount:        _stats.bootCount,
        achievementsUnlocked: _unlocked.size,
        achievementsTotal:    ACHIEVEMENTS.length,
        achievementPoints:    ACHIEVEMENTS.filter(a => _unlocked.has(a.id)).reduce((s, a) => s + a.points, 0),
        totalPoints:          TOTAL_POINTS,
        agentMissions:        { ..._stats.agentMissions },
        coffeeVisits:         _coffeeCount,
        shortcutsUsed:        _shortcutsUsed.size,
        themesVisited:        _themesVisited.size,
      };
    },

    /** Get productivity score and badge. */
    getScore() {
      const score = getProductivityScore();
      const badge = getScoreBadge(score);
      return { score, ...badge };
    },

    /** Open the stats overlay. */
    showStatsOverlay() {
      showStatsOverlay();
    },

    /** Close the stats overlay. */
    hideStatsOverlay() {
      hideStatsOverlay();
    },

    /** Reset all achievements and stats (dev only). */
    reset() {
      if (!confirm('Reset ALL SpawnKit achievements and stats? This cannot be undone.')) return;
      _unlocked = new Set();
      _stats = {
        totalMissions: 0, missionsToday: 0, missionsTodayDate: null,
        totalUptime: 0, agentMissions: {}, favoriteAgent: null, bootCount: 0,
      };
      _streak = { current: 0, best: 0, lastVisit: null, history: [] };
      _themesVisited = new Set();
      _shortcutsUsed = new Set();
      _agentsInvolved = new Set();
      _coffeeCount = 0;
      Object.values(KEYS).forEach(k => localStorage.removeItem(k));
      console.log('[Achievements] 🗑️ All data reset');
    },

    /** Get the achievement definitions (read-only). */
    get ACHIEVEMENTS() { return ACHIEVEMENTS.map(a => ({ ...a })); },

    /** Track a keyboard shortcut usage (for external callers). */
    trackShortcut(key) {
      if (ALL_SHORTCUTS.has(key)) {
        _shortcutsUsed.add(key);
        persist();
        _checkShortcutsAchievement();
      }
    },

    /** Track a coffee station visit (for external callers). */
    trackCoffee() {
      _coffeeCount++;
      saveJSON(KEYS.coffeeCount, _coffeeCount);
      if (_coffeeCount >= 10) unlock('coffee_addict');
    },

    /** Track agent involvement in a mission (for external callers). */
    trackAgent(agentId) {
      _agentsInvolved.add(agentId);
      _stats.agentMissions[agentId] = (_stats.agentMissions[agentId] || 0) + 1;
      persist();
      if (_agentsInvolved.size >= 5) unlock('team_player');
    },

    /** Manually trigger a mission completion (for testing or external use). */
    trackMissionComplete(data) {
      if (typeof SpawnKit !== 'undefined' && SpawnKit.emit) {
        SpawnKit.emit('mission:complete', data || {});
      }
    },

    /** Check if the stats overlay is currently visible. */
    get isOverlayVisible() { return _overlayVisible; },
  };

  // ═══════════════════════════════════════════════════════════════
  // ─── BOOTSTRAP ────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  // Expose API globally
  window.SpawnKitAchievements = SpawnKitAchievements;

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already loaded — init on next tick to let other scripts load
    setTimeout(init, 0);
  }

})(typeof window !== 'undefined' ? window : global);
