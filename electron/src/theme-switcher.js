/**
 * SpawnKit v2 - Universal Theme Switcher Component
 * 
 * Add this to any office theme to enable theme switching
 * Usage: Just include this script and call initThemeSwitcher()
 */

(function(global) {
    'use strict';
    
    // Theme configuration
    const themes = {
        gameboy: {
            name: 'Pixel',
            path: '../office-gameboy/index.html',
            emoji: '🎮',
            color: '#9BBB0F'
        },
        'gameboy-color': {
            name: 'Pixel Color',
            path: '../office-gameboy-color/index.html',
            emoji: '🌈',
            color: '#53868B'
        },
        sims: {
            name: 'The Sims',
            path: '../office-sims/index.html',
            emoji: '💎',
            color: '#E2C275'
        }
    };
    
    // Create the theme switcher UI
    function createThemeSwitcher() {
        // Main container
        const container = document.createElement('div');
        container.id = 'theme-switcher';
        container.innerHTML = `
            <div id="theme-switcher-button">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.98C19.47,12.66 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11.02L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11.02C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.66 4.57,12.98L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.04 4.95,18.95L7.44,17.95C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.95L19.05,18.95C19.27,19.04 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.98Z"/>
                </svg>
            </div>
            <div id="theme-switcher-dropdown">
                <div class="theme-option" data-theme="gameboy">
                    <span class="theme-emoji">🎮</span>
                    <span class="theme-name">Pixel</span>
                </div>
                <div class="theme-option" data-theme="gameboy-color">
                    <span class="theme-emoji">🌈</span>
                    <span class="theme-name">Pixel Color</span>
                </div>
                <div class="theme-option" data-theme="sims">
                    <span class="theme-emoji">💎</span>
                    <span class="theme-name">The Sims</span>
                </div>
                <div class="theme-option theme-selector-link">
                    <span class="theme-emoji">🎯</span>
                    <span class="theme-name">Theme Selector</span>
                </div>
            </div>
        `;
        
        // Add CSS styles
        const style = document.createElement('style');
        style.textContent = `
            #theme-switcher {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            #theme-switcher-button {
                width: 44px;
                height: 44px;
                background: rgba(0, 0, 0, 0.7);
                border: 2px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s ease;
                backdrop-filter: blur(10px);
                color: #ffffff;
            }
            
            #theme-switcher-button:hover {
                background: rgba(0, 0, 0, 0.9);
                border-color: rgba(255, 255, 255, 0.4);
                transform: scale(1.05);
            }
            
            #theme-switcher-dropdown {
                position: absolute;
                top: 54px;
                right: 0;
                background: rgba(0, 0, 0, 0.95);
                border: 2px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                min-width: 160px;
                opacity: 0;
                visibility: hidden;
                transform: translateY(-10px);
                transition: all 0.3s ease;
                backdrop-filter: blur(15px);
            }
            
            #theme-switcher.open #theme-switcher-dropdown {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }
            
            .theme-option {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 12px 16px;
                cursor: pointer;
                transition: all 0.2s ease;
                color: #e0e0e0;
                font-size: 14px;
                font-weight: 500;
            }
            
            .theme-option:hover {
                background: rgba(255, 255, 255, 0.1);
                color: #ffffff;
            }
            
            .theme-option.active {
                background: rgba(255, 255, 255, 0.15);
                color: #ffffff;
            }
            
            .theme-option:first-child {
                border-radius: 6px 6px 0 0;
            }
            
            .theme-option:last-child {
                border-radius: 0 0 6px 6px;
            }
            
            .theme-emoji {
                font-size: 16px;
                width: 20px;
                text-align: center;
            }
            
            .theme-name {
                flex: 1;
            }
            
            .theme-selector-link {
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                margin-top: 4px;
                font-style: italic;
                opacity: 0.8;
            }
            
            /* Theme-specific styling for the gear button */
            body.gameboy-theme #theme-switcher-button {
                background: rgba(15, 56, 15, 0.9);
                border-color: #8BAC0F;
                color: #9BBB0F;
            }
            
            body.gameboy-theme #theme-switcher-button:hover {
                background: #306230;
                border-color: #9BBB0F;
            }
            
            body.sims-theme #theme-switcher-button {
                background: rgba(26, 58, 74, 0.9);
                border-color: #E2C275;
                color: #E2C275;
            }
            
            body.sims-theme #theme-switcher-button:hover {
                background: rgba(42, 72, 88, 0.9);
                border-color: #00ff00;
                color: #00ff00;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(container);
        
        return container;
    }
    
    // Initialize the theme switcher
    function initThemeSwitcher() {
        const container = createThemeSwitcher();
        const button = container.querySelector('#theme-switcher-button');
        const dropdown = container.querySelector('#theme-switcher-dropdown');
        const options = container.querySelectorAll('.theme-option[data-theme]');
        const selectorLink = container.querySelector('.theme-selector-link');
        
        // Get current theme from localStorage
        const currentTheme = localStorage.getItem('spawnkit-theme') || 'gameboy';
        
        // Mark current theme as active
        options.forEach(option => {
            if (option.dataset.theme === currentTheme) {
                option.classList.add('active');
            }
        });
        
        // Add body class for theme-specific styling
        document.body.classList.add(`${currentTheme}-theme`);
        
        // Toggle dropdown
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            container.classList.toggle('open');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            container.classList.remove('open');
        });
        
        // Prevent dropdown close when clicking inside
        dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Handle theme selection
        options.forEach(option => {
            option.addEventListener('click', () => {
                const theme = option.dataset.theme;
                if (theme && theme !== currentTheme) {
                    switchTheme(theme);
                }
            });
        });
        
        // Handle theme selector link
        selectorLink.addEventListener('click', () => {
            window.location.href = '../src/theme-selector.html';
        });
        
        // Keyboard navigation
        container.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                container.classList.remove('open');
            }
        });
    }
    
    // Switch to a different theme
    function switchTheme(themeId) {
        if (!themes[themeId]) {
            console.error('Unknown theme:', themeId);
            return;
        }
        
        const theme = themes[themeId];
        
        // Save theme preference
        localStorage.setItem('spawnkit-theme', themeId);
        
        // Show loading animation if available
        if (typeof showThemeLoadingAnimation === 'function') {
            showThemeLoadingAnimation(theme.name);
        }
        
        // Small delay for UX
        setTimeout(() => {
            window.location.href = theme.path;
        }, 300);
    }
    
    // Optional loading animation
    function showThemeLoadingAnimation(themeName) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 18px;
            font-weight: 500;
        `;
        
        overlay.innerHTML = `
            <div style="text-align: center;">
                <div style="width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.3); border-top: 3px solid white; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                <div>Loading ${themeName}...</div>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
        
        document.body.appendChild(overlay);
    }
    
    // Export functions to global scope
    window.initThemeSwitcher = initThemeSwitcher;
    window.switchTheme = switchTheme;
    window.showThemeLoadingAnimation = showThemeLoadingAnimation;
    
})(typeof window !== 'undefined' ? window : global);