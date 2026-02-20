/**
 * SpawnKit v2 — Dynamic Page Titles
 * ═══════════════════════════════════
 * 
 * Updates document.title based on the current application state.
 * Listens to SpawnKit events (mission lifecycle, meetings, celebrations)
 * and crafts contextual, emoji-rich titles that make the browser tab alive.
 * 
 * Title patterns:
 *   Idle:         "SpawnKit — GameBoy Office 🎮"
 *   Mission:      "⚡ Mission: Build Landing Page — SpawnKit"
 *   Meeting:      "🤝 Team Meeting — SpawnKit"
 *   Celebrating:  "🎉 Mission Complete! — SpawnKit"
 *   Boot:         "🔄 Booting SpawnKit..."
 * 
 * @author Atlas (COO) — Visual Polish Layer
 */

(function(global) {
    'use strict';

    // ── Theme-specific idle titles ─────────────────────────────────

    const IDLE_TITLES = {
        gameboy:   'SpawnKit — GameBoy Office 🎮',
        cyberpunk: 'SpawnKit — Cyber Command 🌃',
        executive: 'SpawnKit — Executive Suite 🏢',
        selector:  'SpawnKit — Choose Your Theme ✨'
    };

    // ── State → title mapping ──────────────────────────────────────

    let currentTheme = 'selector';
    let currentState = 'idle';
    let missionName = '';
    let titleAnimationId = null;
    let blinkState = true;

    function detectTheme() {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('gameboy'))        return 'gameboy';
        if (path.includes('cyberpunk'))      return 'cyberpunk';
        if (path.includes('executive'))      return 'executive';
        return 'selector';
    }

    function buildTitle() {
        switch (currentState) {
            case 'mission':
                return missionName 
                    ? `⚡ Mission: ${truncate(missionName, 30)} — SpawnKit`
                    : '⚡ Mission Active — SpawnKit';
            
            case 'meeting':
                return '🤝 Team Meeting — SpawnKit';
            
            case 'celebrating':
                return '🎉 Mission Complete! — SpawnKit';
            
            case 'boot':
                return '🔄 Booting SpawnKit...';
            
            case 'error':
                return '⚠️ Alert — SpawnKit';
            
            case 'idle':
            default:
                return IDLE_TITLES[currentTheme] || IDLE_TITLES.selector;
        }
    }

    function truncate(str, max) {
        if (!str) return '';
        return str.length > max ? str.slice(0, max - 1) + '…' : str;
    }

    function updateTitle() {
        document.title = buildTitle();
    }

    // ── Activity indicator (subtle blink for active states) ────────

    function startActivityBlink() {
        stopActivityBlink();
        if (currentState === 'mission') {
            titleAnimationId = setInterval(() => {
                blinkState = !blinkState;
                const prefix = blinkState ? '⚡' : '💫';
                const name = missionName ? truncate(missionName, 30) : 'Active';
                document.title = `${prefix} Mission: ${name} — SpawnKit`;
            }, 2000);
        }
    }

    function stopActivityBlink() {
        if (titleAnimationId) {
            clearInterval(titleAnimationId);
            titleAnimationId = null;
        }
    }

    // ── State transitions ──────────────────────────────────────────

    function setState(state, data) {
        const prevState = currentState;
        currentState = state;
        
        if (data && data.name) {
            missionName = data.name;
        }
        if (data && data.text) {
            missionName = data.text;
        }

        stopActivityBlink();
        updateTitle();
        
        if (state === 'mission') {
            startActivityBlink();
        }
    }

    // ── Hook into SpawnKit event system ────────────────────────────

    function bindEvents() {
        if (!window.SpawnKit || typeof window.SpawnKit.on !== 'function') {
            // Retry later if SpawnKit isn't ready yet
            setTimeout(bindEvents, 200);
            return;
        }

        // Mission lifecycle
        window.SpawnKit.on('mission:new', (data) => {
            setState('mission', data);
        });

        window.SpawnKit.on('mission:progress', (data) => {
            if (data && data.progress >= 100) {
                setState('celebrating');
                // Auto-return to idle after celebration
                setTimeout(() => setState('idle'), 5000);
            }
        });

        window.SpawnKit.on('mission:complete', () => {
            setState('celebrating');
            setTimeout(() => setState('idle'), 5000);
        });

        // Meetings
        window.SpawnKit.on('meeting:start', () => {
            setState('meeting');
        });

        window.SpawnKit.on('meeting:end', () => {
            setState('idle');
        });

        // MC state events (from mission-controller)
        window.SpawnKit.on('mc:state', (data) => {
            if (!data) return;
            const s = data.state || data;
            if (s === 'idle')        setState('idle');
            else if (s === 'active') setState('mission', data);
            else if (s === 'done')   {
                setState('celebrating');
                setTimeout(() => setState('idle'), 5000);
            }
        });

        // MC phase events
        window.SpawnKit.on('mc:phase', (data) => {
            if (!data) return;
            if (data.phase === 'celebration') {
                setState('celebrating');
                setTimeout(() => setState('idle'), 5000);
            } else if (data.phase === 'meeting' || data.phase === 'boardMeeting') {
                setState('meeting');
            } else if (data.phase === 'assign' || data.phase === 'work') {
                setState('mission', { name: data.data?.text || missionName });
            }
        });

        // Boot
        window.SpawnKit.on('boot:start', () => setState('boot'));
        window.SpawnKit.on('boot:complete', () => setState('idle'));
    }

    // ── Initialize ─────────────────────────────────────────────────

    function init() {
        currentTheme = detectTheme();
        updateTitle();
        bindEvents();
    }

    // ── Export ──────────────────────────────────────────────────────

    if (!window.SpawnKit) window.SpawnKit = {};

    window.SpawnKit.pageTitle = {
        init: init,
        setState: setState,
        getState: () => currentState,
        getTitle: buildTitle
    };

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})(typeof window !== 'undefined' ? window : global);
