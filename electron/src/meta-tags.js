/**
 * SpawnKit v2 — Open Graph & Meta Tags
 * ═════════════════════════════════════
 * 
 * Dynamically sets OG meta tags for link previews on social platforms.
 * Since we can't host static images for og:image, we generate theme-specific
 * SVG data URIs (works for some crawlers) and set sensible fallback text.
 * 
 * Also sets:
 *   - theme-color meta (browser chrome tinting)
 *   - description meta
 *   - twitter:card meta
 * 
 * @author Atlas (COO) — Visual Polish Layer
 */

(function(global) {
    'use strict';

    // ── Theme meta configurations ──────────────────────────────────

    const META_CONFIG = {
        gameboy: {
            title: 'SpawnKit — GameBoy Office 🎮',
            description: 'Watch your AI agents work in a retro pixel office. Press Start to begin!',
            themeColor: '#9BBB0F',
            ogImage: generateOgImage('gameboy')
        },
        cyberpunk: {
            title: 'SpawnKit — Cyber Command Center 🌃',
            description: 'AI agents in a neon-lit command center. Hack the future.',
            themeColor: '#00ffff',
            ogImage: generateOgImage('cyberpunk')
        },
        executive: {
            title: 'SpawnKit — Executive Boardroom 🏢',
            description: 'Your AI C-suite in a premium corporate office. Business runs itself.',
            themeColor: '#c9a876',
            ogImage: generateOgImage('executive')
        },
        selector: {
            title: 'SpawnKit — Your AI Executive Team',
            description: 'Watch your AI agents work in a virtual office. GameBoy, Cyberpunk, or Executive style.',
            themeColor: '#00ffff',
            ogImage: generateOgImage('selector')
        }
    };

    // ── Generate OG preview image (SVG) ────────────────────────────
    // Note: Most social crawlers won't render SVG data URIs,
    // but it's useful for direct browser previews and local sharing.

    function generateOgImage(theme) {
        const configs = {
            gameboy: {
                bg: '#0F380F', accent: '#9BBB0F', sub: '#8BAC0F',
                title: 'SPAWNKIT', subtitle: 'GAMEBOY OFFICE',
                font: 'monospace'
            },
            cyberpunk: {
                bg: '#0a0a0f', accent: '#00ffff', sub: '#ff00ff',
                title: 'SPAWNKIT', subtitle: 'CYBER_CMD',
                font: 'monospace'
            },
            executive: {
                bg: '#1a1510', accent: '#c9a876', sub: '#8b6914',
                title: 'SpawnKit', subtitle: 'Executive Suite',
                font: 'Georgia, serif'
            },
            selector: {
                bg: '#0a0a0a', accent: '#ffffff', sub: '#888888',
                title: 'SpawnKit v2', subtitle: 'Choose Your Theme',
                font: 'sans-serif'
            }
        };
        
        const c = configs[theme] || configs.selector;
        
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="${c.bg}"/>
<text x="600" y="270" font-family="${c.font}" font-size="72" font-weight="bold" fill="${c.accent}" text-anchor="middle">${c.title}</text>
<text x="600" y="340" font-family="${c.font}" font-size="32" fill="${c.sub}" text-anchor="middle">${c.subtitle}</text>
<text x="600" y="420" font-family="sans-serif" font-size="22" fill="${c.sub}" text-anchor="middle" opacity="0.7">Your AI Executive Team</text>
<rect x="100" y="500" width="1000" height="4" fill="${c.accent}" opacity="0.3" rx="2"/>
</svg>`;
        
        return 'data:image/svg+xml,' + encodeURIComponent(svg.replace(/\n\s*/g, '').replace(/>\s+</g, '><'));
    }

    // ── Set a <meta> tag (create or update) ────────────────────────

    function setMeta(attr, value, content) {
        let meta = document.querySelector(`meta[${attr}="${value}"]`);
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute(attr, value);
            document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
    }

    // ── Apply all meta tags for a theme ────────────────────────────

    function applyMeta(themeId) {
        const config = META_CONFIG[themeId] || META_CONFIG.selector;

        // Open Graph
        setMeta('property', 'og:title', config.title);
        setMeta('property', 'og:description', config.description);
        setMeta('property', 'og:type', 'website');
        setMeta('property', 'og:image', config.ogImage);
        setMeta('property', 'og:image:width', '1200');
        setMeta('property', 'og:image:height', '630');
        setMeta('property', 'og:site_name', 'SpawnKit');

        // Twitter Card
        setMeta('name', 'twitter:card', 'summary_large_image');
        setMeta('name', 'twitter:title', config.title);
        setMeta('name', 'twitter:description', config.description);
        setMeta('name', 'twitter:image', config.ogImage);

        // Standard meta
        setMeta('name', 'description', config.description);
        setMeta('name', 'theme-color', config.themeColor);
        
        // Apple mobile
        setMeta('name', 'apple-mobile-web-app-capable', 'yes');
        setMeta('name', 'apple-mobile-web-app-status-bar-style', 'black-translucent');
        setMeta('name', 'mobile-web-app-capable', 'yes');
    }

    // ── Auto-detect and apply ──────────────────────────────────────

    function autoApply() {
        const path = window.location.pathname.toLowerCase();
        let theme = 'selector';
        
        if (path.includes('gameboy'))        theme = 'gameboy';
        else if (path.includes('cyberpunk')) theme = 'cyberpunk';
        else if (path.includes('executive')) theme = 'executive';
        
        applyMeta(theme);
    }

    // ── Export ──────────────────────────────────────────────────────

    if (!window.SpawnKit) window.SpawnKit = {};

    window.SpawnKit.meta = {
        apply: applyMeta,
        auto: autoApply,
        configs: META_CONFIG
    };

    // Auto-apply immediately (meta tags should be in <head> ASAP)
    autoApply();

})(typeof window !== 'undefined' ? window : global);
