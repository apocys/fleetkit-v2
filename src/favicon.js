/**
 * SpawnKit v2 — Dynamic Favicons
 * ═══════════════════════════════
 * 
 * Each theme gets a unique, hand-crafted SVG favicon rendered as a data URI.
 * No external files. Pure pixel-perfect SVG.
 * 
 * - GameBoy: Green pixel GameBoy icon
 * - Cyberpunk: Neon cyan terminal cursor with glow
 * - Executive: Gold FK monogram with serif elegance
 * - Theme Selector: Rainbow gradient FK
 * 
 * @author Atlas (COO) — Visual Polish Layer
 */

(function(global) {
    'use strict';

    const favicons = {

        // ── GameBoy: Green pixel GameBoy icon ─────────────────────────
        gameboy: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<rect width="32" height="32" rx="3" fill="#306230"/>
<rect x="4" y="2" width="24" height="16" rx="2" fill="#0F380F" stroke="#8BAC0F" stroke-width="1"/>
<rect x="6" y="4" width="20" height="12" fill="#9BBB0F"/>
<text x="16" y="13" font-family="monospace" font-size="8" font-weight="bold" fill="#0F380F" text-anchor="middle">FK</text>
<circle cx="22" cy="23" r="2.5" fill="#8BAC0F"/>
<circle cx="18" cy="25" r="2" fill="#8BAC0F"/>
<rect x="8" y="22" width="2" height="6" fill="#8BAC0F"/>
<rect x="6" y="24" width="6" height="2" fill="#8BAC0F"/>
</svg>`,

        // ── Cyberpunk: Neon cyan terminal cursor with glow ───────────
        cyberpunk: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<defs>
<filter id="g"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<rect width="32" height="32" rx="2" fill="#0a0a0f"/>
<rect x="2" y="2" width="28" height="28" rx="1" fill="none" stroke="#00ffff" stroke-width="0.5" opacity="0.4"/>
<text x="4" y="13" font-family="monospace" font-size="9" fill="#00ffff" filter="url(#g)" opacity="0.9">$&gt;</text>
<rect x="4" y="16" width="24" height="2" fill="#ff00ff" filter="url(#g)" opacity="0.7"/>
<text x="5" y="27" font-family="monospace" font-size="7" font-weight="bold" fill="#00ffff" filter="url(#g)">FK_</text>
<rect x="22" y="20" width="2" height="9" fill="#00ffff" filter="url(#g)">
<animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"/>
</rect>
</svg>`,

        // ── Executive: Gold FK monogram with serif elegance ──────────
        executive: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<defs>
<linearGradient id="gld" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="#e8d5a3"/>
<stop offset="30%" stop-color="#c9a876"/>
<stop offset="60%" stop-color="#b8944a"/>
<stop offset="100%" stop-color="#8b6914"/>
</linearGradient>
</defs>
<rect width="32" height="32" rx="4" fill="#1a1510"/>
<rect x="2" y="2" width="28" height="28" rx="3" fill="none" stroke="url(#gld)" stroke-width="1.5"/>
<rect x="4" y="4" width="24" height="24" rx="2" fill="none" stroke="url(#gld)" stroke-width="0.5" opacity="0.4"/>
<text x="16" y="22" font-family="Georgia,serif" font-size="16" font-weight="bold" fill="url(#gld)" text-anchor="middle" letter-spacing="1">FK</text>
</svg>`,

        // ── Theme Selector: Rainbow gradient FK ─────────────────────
        selector: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<defs>
<linearGradient id="rnb" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="#00ffff"/>
<stop offset="33%" stop-color="#ff00ff"/>
<stop offset="66%" stop-color="#ffff00"/>
<stop offset="100%" stop-color="#00ffff"/>
</linearGradient>
</defs>
<rect width="32" height="32" rx="4" fill="#0a0a0a"/>
<text x="16" y="22" font-family="monospace" font-size="16" font-weight="bold" fill="url(#rnb)" text-anchor="middle" letter-spacing="1">FK</text>
<rect x="3" y="3" width="26" height="26" rx="3" fill="none" stroke="url(#rnb)" stroke-width="1"/>
</svg>`
    };

    // ── Encode SVG → data URI ──────────────────────────────────────

    function svgToDataUri(svgString) {
        // Minify: collapse whitespace, trim
        const minified = svgString
            .replace(/\n\s*/g, '')
            .replace(/>\s+</g, '><')
            .trim();
        // Encode for data URI (URI-encode special chars)
        return 'data:image/svg+xml,' + encodeURIComponent(minified);
    }

    // ── Apply favicon to <head> ────────────────────────────────────

    function setFavicon(themeId) {
        const svg = favicons[themeId];
        if (!svg) {
            console.warn('[Favicon] Unknown theme:', themeId);
            return;
        }

        const dataUri = svgToDataUri(svg);

        // Remove any existing favicons to prevent stacking
        const existing = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
        existing.forEach(el => el.remove());

        // Create and append new favicon
        const link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/svg+xml';
        link.href = dataUri;
        document.head.appendChild(link);

        // Also set a 32x32 variant for broader compatibility
        const link32 = document.createElement('link');
        link32.rel = 'icon';
        link32.type = 'image/svg+xml';
        link32.sizes = '32x32';
        link32.href = dataUri;
        document.head.appendChild(link32);
    }

    // ── Auto-detect theme and apply ────────────────────────────────

    function autoSetFavicon() {
        const path = window.location.pathname.toLowerCase();
        
        if (path.includes('gameboy'))        setFavicon('gameboy');
        else if (path.includes('cyberpunk')) setFavicon('cyberpunk');
        else if (path.includes('executive')) setFavicon('executive');
        else                                 setFavicon('selector');
    }

    // ── Export ──────────────────────────────────────────────────────

    if (!window.SpawnKit) window.SpawnKit = {};

    window.SpawnKit.favicon = {
        set: setFavicon,
        auto: autoSetFavicon,
        favicons: favicons,
        svgToDataUri: svgToDataUri
    };

    // Auto-apply on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoSetFavicon);
    } else {
        autoSetFavicon();
    }

})(typeof window !== 'undefined' ? window : global);
