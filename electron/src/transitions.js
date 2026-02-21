/**
 * SpawnKit v2 — Smooth Page Transitions
 * ══════════════════════════════════════
 * 
 * When switching themes via the gear icon:
 *   1. Current page fades out (300ms)
 *   2. Navigate to new theme
 *   3. New theme fades in (boot sequence plays within)
 * 
 * Also handles:
 *   - Initial page fade-in on load
 *   - Respects prefers-reduced-motion
 *   - Print stylesheet (easter egg 🤖)
 * 
 * @author Atlas (COO) — Visual Polish Layer
 */

(function(global) {
    'use strict';

    // ── Transition configuration ───────────────────────────────────

    const FADE_DURATION   = 300;  // ms for fade out
    const FADE_IN_DURATION = 400; // ms for fade in (slightly longer for smooth feel)

    // ── Check for reduced motion preference ────────────────────────

    function prefersReducedMotion() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    // ── Inject transition CSS + print stylesheet ───────────────────

    function injectStyles() {
        const style = document.createElement('style');
        style.id = 'fk-transitions';
        style.textContent = `
            /* ── Page Transitions ──────────────────────── */
            
            body {
                opacity: 1;
                transition: opacity ${FADE_IN_DURATION}ms ease-in;
            }
            
            body.fk-fade-in {
                opacity: 0;
            }
            
            body.fk-fade-out {
                opacity: 0 !important;
                transition: opacity ${FADE_DURATION}ms ease-out !important;
                pointer-events: none;
            }
            
            /* Respect prefers-reduced-motion */
            @media (prefers-reduced-motion: reduce) {
                body, body.fk-fade-in, body.fk-fade-out {
                    transition: none !important;
                }
            }

            /* ── Print Stylesheet (Easter Egg 🤖) ─────── */
            
            @media print {
                body * {
                    visibility: hidden !important;
                }
                
                body {
                    background: white !important;
                    position: relative;
                }
                
                body::after {
                    visibility: visible !important;
                    content: "Nice try! AI agents can't be printed. 🤖\\A\\AThey exist in the digital realm only.\\A\\A— SpawnKit v2";
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-family: 'Georgia', serif;
                    font-size: 24px;
                    color: #333;
                    text-align: center;
                    white-space: pre-wrap;
                    line-height: 1.8;
                    padding: 40px;
                    border: 2px solid #ccc;
                    border-radius: 12px;
                    max-width: 500px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // ── Fade-in on page load ───────────────────────────────────────

    function fadeInOnLoad() {
        if (prefersReducedMotion()) return;
        
        // Start invisible
        document.body.classList.add('fk-fade-in');
        
        // Trigger reflow, then remove the class to fade in
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                document.body.classList.remove('fk-fade-in');
            });
        });
    }

    // ── Fade-out before navigation ─────────────────────────────────

    function fadeOutAndNavigate(url) {
        if (prefersReducedMotion()) {
            window.location.href = url;
            return;
        }

        document.body.classList.add('fk-fade-out');
        
        setTimeout(() => {
            window.location.href = url;
        }, FADE_DURATION);
    }

    // ── Patch the theme switcher ───────────────────────────────────
    // Override the switchTheme and showThemeLoadingAnimation functions
    // to use our smooth transitions instead of the default behavior.

    function patchThemeSwitcher() {
        // Wait for theme switcher to be available
        const maxWait = 2000;
        const start = Date.now();

        function tryPatch() {
            if (typeof window.switchTheme === 'function') {
                const originalSwitch = window.switchTheme;
                
                window.switchTheme = function(themeId) {
                    const themes = {
                        gameboy:   '../office-gameboy/index.html',
                        cyberpunk: '../office-cyberpunk/index.html',
                        executive: '../office-executive/index.html'
                    };
                    
                    const url = themes[themeId];
                    if (!url) {
                        originalSwitch(themeId);
                        return;
                    }

                    // Save preference
                    localStorage.setItem('spawnkit-theme', themeId);
                    
                    // Fade out then navigate (boot param triggers boot sequence)
                    fadeOutAndNavigate(url + '?boot=true');
                };
                return;
            }
            
            if (Date.now() - start < maxWait) {
                setTimeout(tryPatch, 50);
            }
        }
        
        tryPatch();
    }

    // ── Patch theme selector page links ────────────────────────────

    function patchSelectorLinks() {
        const path = window.location.pathname.toLowerCase();
        if (!path.includes('theme-selector')) return;
        
        // Override the selectTheme function on the selector page
        const maxWait = 1000;
        const start = Date.now();

        function tryPatch() {
            if (typeof window.selectTheme === 'function') {
                const originalSelect = window.selectTheme;
                
                window.selectTheme = function(themeId) {
                    const themes = {
                        gameboy:   '../office-gameboy/index.html',
                        cyberpunk: '../office-cyberpunk/index.html',
                        executive: '../office-executive/index.html'
                    };
                    
                    const url = themes[themeId];
                    if (!url) {
                        originalSelect(themeId);
                        return;
                    }

                    localStorage.setItem('spawnkit-theme', themeId);
                    
                    // Show loading state
                    if (typeof window.showLoading === 'function') {
                        window.showLoading('Loading ' + themeId + ' Office...');
                    }
                    
                    // Brief delay for loading animation, then fade out
                    setTimeout(() => {
                        fadeOutAndNavigate(url + '?boot=true');
                    }, 800);
                };
            } else if (Date.now() - start < maxWait) {
                setTimeout(tryPatch, 50);
            }
        }
        
        tryPatch();
    }

    // ── Initialize ─────────────────────────────────────────────────

    function init() {
        injectStyles();
        fadeInOnLoad();
        patchThemeSwitcher();
        patchSelectorLinks();
    }

    // ── Export ──────────────────────────────────────────────────────

    if (!window.SpawnKit) window.SpawnKit = {};

    window.SpawnKit.transitions = {
        init: init,
        fadeOut: fadeOutAndNavigate,
        fadeIn: fadeInOnLoad
    };

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})(typeof window !== 'undefined' ? window : global);
