/**
 * SpawnKit v2 — Responsive Viewport System
 * ══════════════════════════════════════════
 * 
 * Handles responsive behavior for all three themes:
 * 
 * GameBoy (fixed 800×600 canvas):
 *   - Scales canvas down with CSS transform on small viewports
 *   - Touch zones for mobile interaction
 *   - "Best on desktop" subtle hint
 * 
 * Cyberpunk / Executive (CSS-based):
 *   - Injects responsive breakpoints
 *   - Stacks agent cards vertically on narrow screens
 *   - Collapses panels into hamburger menu
 * 
 * @author Atlas (COO) — Visual Polish Layer
 */

(function(global) {
    'use strict';

    // ── Detect current theme ───────────────────────────────────────

    function detectTheme() {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('gameboy'))        return 'gameboy';
        if (path.includes('cyberpunk'))      return 'cyberpunk';
        if (path.includes('executive'))      return 'executive';
        return 'selector';
    }

    // ── GameBoy: Canvas Scaling ────────────────────────────────────

    function initGameBoyResponsive() {
        const CANVAS_W = 800;
        const CANVAS_H = 600;
        
        function scaleCanvas() {
            const container = document.getElementById('gameContainer');
            if (!container) return;
            
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            
            if (vw < CANVAS_W + 40) {
                const scale = Math.min((vw - 20) / CANVAS_W, (vh - 200) / CANVAS_H, 1);
                container.style.transform = `scale(${scale.toFixed(3)})`;
                container.style.transformOrigin = 'top center';
                // Adjust wrapper to prevent layout shift
                if (container.parentElement) {
                    container.parentElement.style.height = `${Math.round(CANVAS_H * scale)}px`;
                    container.parentElement.style.overflow = 'visible';
                }
            } else {
                container.style.transform = '';
                if (container.parentElement) container.parentElement.style.height = '';
            }
        }
        
        // Debounced resize
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(scaleCanvas, 100);
        });
        scaleCanvas();

        // ── Touch controls for mobile ──────────────────────────────
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            createTouchControls();
            showMobileHint();
        }
    }

    function createTouchControls() {
        const touchLayer = document.createElement('div');
        touchLayer.id = 'fk-touch-controls';
        touchLayer.innerHTML = `
            <div class="touch-zone touch-zone-m" data-key="m" title="Meeting">M</div>
            <div class="touch-zone touch-zone-c" data-key="c" title="Celebrate">C</div>
            <div class="touch-zone touch-zone-w" data-key="w" title="Whiteboard">W</div>
            <div class="touch-zone touch-zone-i" data-key="i" title="Interact">I</div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            #fk-touch-controls {
                position: fixed;
                bottom: 16px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 12px;
                z-index: 9000;
                padding: 8px 16px;
                background: rgba(15, 56, 15, 0.85);
                border: 2px solid #8BAC0F;
                border-radius: 8px;
                backdrop-filter: blur(8px);
            }
            .touch-zone {
                width: 48px;
                height: 48px;
                background: #306230;
                border: 2px solid #8BAC0F;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Press Start 2P', monospace;
                font-size: 12px;
                color: #9BBB0F;
                cursor: pointer;
                user-select: none;
                -webkit-user-select: none;
                transition: all 0.1s ease;
                -webkit-tap-highlight-color: transparent;
            }
            .touch-zone:active {
                background: #8BAC0F;
                color: #0F380F;
                transform: scale(0.92);
            }
            /* Hide on desktop */
            @media (min-width: 820px) and (hover: hover) {
                #fk-touch-controls { display: none; }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(touchLayer);

        // Simulate keyboard events on tap
        touchLayer.addEventListener('click', (e) => {
            const zone = e.target.closest('.touch-zone');
            if (!zone) return;
            const key = zone.dataset.key;
            if (key) {
                document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
                // Visual feedback
                zone.style.background = '#8BAC0F';
                zone.style.color = '#0F380F';
                setTimeout(() => {
                    zone.style.background = '';
                    zone.style.color = '';
                }, 150);
            }
        });
    }

    function showMobileHint() {
        // Only show once per session
        if (sessionStorage.getItem('fk-mobile-hint-shown')) return;
        
        const hint = document.createElement('div');
        hint.id = 'fk-mobile-hint';
        hint.innerHTML = '🖥️ Best on desktop — but we got you covered!';
        
        const style = document.createElement('style');
        style.textContent = `
            #fk-mobile-hint {
                position: fixed;
                top: 60px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(15, 56, 15, 0.92);
                border: 1px solid #8BAC0F;
                border-radius: 6px;
                padding: 8px 16px;
                font-family: 'Press Start 2P', monospace;
                font-size: 7px;
                color: #9BBB0F;
                z-index: 9500;
                opacity: 0;
                animation: fkHintIn 0.5s 1s forwards, fkHintOut 0.5s 5s forwards;
                pointer-events: none;
                white-space: nowrap;
                backdrop-filter: blur(8px);
            }
            @keyframes fkHintIn {
                to { opacity: 0.95; }
            }
            @keyframes fkHintOut {
                to { opacity: 0; }
            }
            @media (min-width: 820px) {
                #fk-mobile-hint { display: none; }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(hint);
        sessionStorage.setItem('fk-mobile-hint-shown', '1');
        
        // Self-destruct after animation
        setTimeout(() => hint.remove(), 6500);
    }

    // ── Cyberpunk: Responsive Breakpoints ──────────────────────────

    function initCyberpunkResponsive() {
        injectResponsiveCSS(`
            /* ── Cyberpunk Responsive ──────────────────── */

            /* Tablet: stack workstations in 2-col grid */
            @media (max-width: 1024px) {
                .office-container {
                    grid-template-columns: 1fr 1fr !important;
                    gap: 12px !important;
                    padding: 12px !important;
                }
                .hologram-table {
                    grid-column: 1 / -1 !important;
                }
                .security-panel {
                    grid-column: 1 / -1 !important;
                }
                .header-terminal .system-stats {
                    font-size: 10px;
                }
            }

            /* Phone: single column, stack everything */
            @media (max-width: 640px) {
                .office-container {
                    grid-template-columns: 1fr !important;
                    gap: 8px !important;
                    padding: 8px !important;
                }
                .workstation {
                    min-height: auto !important;
                }
                .terminal-screen {
                    max-height: 120px;
                    overflow-y: auto;
                }
                .header-terminal {
                    padding: 8px !important;
                }
                .header-terminal .system-stats {
                    display: none;
                }
                .hologram-table {
                    padding: 12px !important;
                }
                .mission-display {
                    font-size: 12px !important;
                }
                .metric-grid {
                    grid-template-columns: 1fr 1fr !important;
                    gap: 6px !important;
                }
                .crt-screen {
                    padding: 8px !important;
                }
                .process-indicators {
                    display: none;
                }
                /* Hamburger: collapse security panel */
                .security-panel {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    z-index: 8000;
                    border-radius: 12px 12px 0 0;
                    transform: translateY(calc(100% - 36px));
                    transition: transform 0.3s ease;
                    cursor: pointer;
                }
                .security-panel:hover,
                .security-panel.expanded {
                    transform: translateY(0);
                }
                .security-panel .panel-header::after {
                    content: ' ▲ tap to expand';
                    font-size: 9px;
                    opacity: 0.6;
                }
            }

            /* Very small: minimal chrome */
            @media (max-width: 400px) {
                .agent-name, .agent-role {
                    font-size: 10px !important;
                }
                .terminal-body {
                    font-size: 9px !important;
                }
            }
        `);

        // Toggle security panel on mobile
        setTimeout(() => {
            const panel = document.querySelector('.security-panel');
            if (panel) {
                panel.addEventListener('click', function() {
                    if (window.innerWidth <= 640) {
                        this.classList.toggle('expanded');
                    }
                });
            }
        }, 500);
    }

    // ── Executive: Responsive Breakpoints ──────────────────────────

    function initExecutiveResponsive() {
        injectResponsiveCSS(`
            /* ── Executive Responsive ──────────────────── */

            /* Tablet */
            @media (max-width: 1024px) {
                .agents-container {
                    display: grid !important;
                    grid-template-columns: repeat(3, 1fr) !important;
                    gap: 12px !important;
                    padding: 16px !important;
                }
                .executive-desks {
                    display: grid !important;
                    grid-template-columns: 1fr 1fr !important;
                    gap: 12px !important;
                }
                .conference-room {
                    padding: 16px !important;
                }
                .wall-displays {
                    flex-direction: column !important;
                }
                .executive-dashboard {
                    padding: 12px !important;
                }
                .dashboard-controls {
                    flex-wrap: wrap;
                    gap: 4px;
                }
            }

            /* Phone */
            @media (max-width: 640px) {
                .agents-container {
                    grid-template-columns: 1fr 1fr !important;
                    gap: 8px !important;
                    padding: 8px !important;
                }
                .agent.executive-suit {
                    padding: 8px !important;
                }
                .executive-desks {
                    grid-template-columns: 1fr !important;
                }
                .office-floor {
                    padding: 8px !important;
                }
                .conference-room {
                    padding: 8px !important;
                }
                .chair-arrangement {
                    display: none !important;
                }
                .wall-displays {
                    display: none !important;
                }
                .sub-agents {
                    display: none !important;
                }
                .coffee-bar, .reception-area, .server-room {
                    display: none !important;
                }
                .mission-interface {
                    padding: 8px !important;
                }
                .mission-input input {
                    font-size: 14px !important;
                    padding: 8px !important;
                }
                .executive-dashboard .metric-card {
                    min-width: auto !important;
                }
                .dashboard-content {
                    overflow-x: auto;
                }
                .agent-nameplate {
                    font-size: 10px !important;
                    white-space: nowrap;
                }
            }

            /* Very small */
            @media (max-width: 400px) {
                .agents-container {
                    grid-template-columns: 1fr !important;
                }
                .executive-dashboard {
                    display: none !important;
                }
            }
        `);
    }

    // ── Theme Selector: Already responsive, enhance slightly ───────

    function initSelectorResponsive() {
        // The theme-selector.html already has responsive CSS.
        // Add subtle enhancements.
        injectResponsiveCSS(`
            @media (max-width: 480px) {
                .theme-card {
                    width: 90vw !important;
                    max-width: 280px;
                    height: auto !important;
                    min-height: 320px;
                    padding: 16px !important;
                }
                .header .logo {
                    font-size: 1.5rem !important;
                }
                .header {
                    margin-bottom: 24px !important;
                }
            }
        `);
    }

    // ── Utility: inject a <style> block ────────────────────────────

    function injectResponsiveCSS(css) {
        const style = document.createElement('style');
        style.id = 'fk-responsive-' + Math.random().toString(36).slice(2, 6);
        style.textContent = css;
        document.head.appendChild(style);
    }

    // ── Initialize based on current theme ──────────────────────────

    function init() {
        const theme = detectTheme();
        
        switch (theme) {
            case 'gameboy':   initGameBoyResponsive();   break;
            case 'cyberpunk': initCyberpunkResponsive();  break;
            case 'executive': initExecutiveResponsive();  break;
            case 'selector':  initSelectorResponsive();   break;
        }
    }

    // ── Export ──────────────────────────────────────────────────────

    if (!window.SpawnKit) window.SpawnKit = {};
    
    window.SpawnKit.responsive = {
        init: init,
        detectTheme: detectTheme
    };

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})(typeof window !== 'undefined' ? window : global);
