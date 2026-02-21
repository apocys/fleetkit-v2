/**
 * Sims Effects — Thought Bubbles, Floating Text, Day/Night, Simlish
 * ═══════════════════════════════════════════════════════════════════
 * Visual effects that make the office feel alive, Sims-style:
 *  - Thought bubbles with tiny icons above agents
 *  - "+friendship" / "-mood" floating indicators
 *  - Subtle day/night ambient light cycle
 *  - Simlish gibberish speech bubbles when agents "talk"
 *
 * @author Echo (CMO) ✨
 */

class SimsEffects {
    constructor(effectsContainer, officeMap, app) {
        this.container = effectsContainer;
        this.officeMap = officeMap;
        this.app = app;

        this.floatingTexts = [];
        this.thoughtBubbles = [];
        this.speechBubbles = [];

        // Day/night cycle
        this.dayNightTimer = 0;
        this.dayNightOverlay = null;
        this._createDayNightOverlay();

        // Random Simlish chat timer
        this.simlishTimer = 0;
        this.nextSimlish = 12000 + Math.random() * 18000;
    }

    // ── Day/Night Cycle ─────────────────────────────────

    _createDayNightOverlay() {
        this.dayNightOverlay = new PIXI.Graphics();
        const w = this.app?.screen?.width || 900;
        const h = this.app?.screen?.height || 560;
        this.dayNightOverlay.beginFill(0x001133, 0);
        this.dayNightOverlay.drawRect(0, 0, w, h);
        this.dayNightOverlay.endFill();
        this.container?.addChild(this.dayNightOverlay);
    }

    _updateDayNight(dt) {
        if (!this.dayNightOverlay) return;
        this.dayNightTimer += dt * 0.00002; // Very slow cycle
        // Oscillate between 0 (day) and 0.12 (dusk)
        const nightAmount = Math.max(0, Math.sin(this.dayNightTimer) * 0.12);
        const w = this.app?.screen?.width || 900;
        const h = this.app?.screen?.height || 560;

        this.dayNightOverlay.clear();
        if (nightAmount > 0.01) {
            this.dayNightOverlay.beginFill(0x001133, nightAmount);
            this.dayNightOverlay.drawRect(0, 0, w, h);
            this.dayNightOverlay.endFill();
        }
    }

    // ── Thought Bubbles ─────────────────────────────────

    showThoughtBubble(character, icon) {
        if (!character) return;
        const bubble = new PIXI.Container();

        // Cloud shape
        const cloud = new PIXI.Graphics();
        cloud.beginFill(0xffffff, 0.9);
        cloud.drawRoundedRect(-16, -16, 32, 24, 10);
        cloud.endFill();

        // Thought dots (leading up to cloud)
        cloud.beginFill(0xffffff, 0.7);
        cloud.drawCircle(-6, 12, 3);
        cloud.drawCircle(-2, 18, 2);
        cloud.endFill();

        // Border
        cloud.lineStyle(1, 0xcccccc);
        cloud.drawRoundedRect(-16, -16, 32, 24, 10);
        cloud.lineStyle(0);

        // Icon text
        const iconText = new PIXI.Text(icon || '💭', {
            fontSize: 14,
            fill: 0x333333,
        });
        iconText.anchor.set(0.5, 0.5);
        iconText.y = -4;

        bubble.addChild(cloud);
        bubble.addChild(iconText);

        // Position above character
        const sp = this.officeMap?.gridToScreen(character.gridX, character.gridY) || { x: 0, y: 0 };
        bubble.x = (this.app?.screen?.width || 900) / 2 + sp.x;
        bubble.y = 30 + sp.y;

        bubble._lifetime = 3000;
        bubble._age = 0;

        this.container.addChild(bubble);
        this.thoughtBubbles.push(bubble);
    }

    // ── Floating Text ───────────────────────────────────

    showFloatingText(x, y, text, color) {
        color = color || 0x00cc00;

        const ft = new PIXI.Text(text, {
            fontFamily: '"Trebuchet MS", sans-serif',
            fontSize: 11,
            fill: color,
            fontWeight: 'bold',
            stroke: 0xffffff,
            strokeThickness: 2,
        });
        ft.anchor.set(0.5, 0.5);
        ft.x = x;
        ft.y = y;
        ft._lifetime = 2000;
        ft._age = 0;
        ft._vy = -0.5;

        this.container.addChild(ft);
        this.floatingTexts.push(ft);
    }

    // ── Simlish Speech Bubbles ──────────────────────────

    showSimlishChat(charA, charB) {
        if (!charA || !charB) return;
        if (!window.SIMS_PHRASES) return;

        const categories = Object.keys(SIMS_PHRASES);
        if (!categories.length) return;
        const cat = categories[Math.floor(Math.random() * categories.length)];
        const phrases = SIMS_PHRASES[cat];
        if (!phrases?.length) return;

        const phraseA = phrases[Math.floor(Math.random() * phrases.length)];
        charA.showSpeechBubble(phraseA);

        // Second character replies after a short delay
        setTimeout(() => {
            const phraseB = phrases[Math.floor(Math.random() * phrases.length)];
            charB.showSpeechBubble(phraseB);
        }, 1500);

        // Show interaction indicators
        const spA = this.officeMap?.gridToScreen(charA.gridX, charA.gridY) || { x: 0, y: 0 };
        const midX = (this.app?.screen?.width || 900) / 2 + spA.x;
        const midY = 60 + spA.y;

        const indicators = ['+Social', '💬', '+Friendship'];
        const indicator = indicators[Math.floor(Math.random() * indicators.length)];
        this.showFloatingText(midX, midY, indicator, 0x4488cc);
    }

    // ── Mood Change Indicator ───────────────────────────

    showMoodChange(character, delta) {
        if (!character) return;
        const sp = this.officeMap?.gridToScreen(character.gridX, character.gridY) || { x: 0, y: 0 };
        const x = (this.app?.screen?.width || 900) / 2 + sp.x;
        const y = 50 + sp.y;

        if (delta > 0) {
            this.showFloatingText(x, y, '+Mood', 0x00cc00);
        } else {
            this.showFloatingText(x, y, '-Mood', 0xcc0000);
        }
    }

    // ── Event Indicators ────────────────────────────────

    showEventIndicator(x, y, text) {
        this.showFloatingText(x, y, text, 0xccaa00);
    }

    // ── Update loop ─────────────────────────────────────

    update(dt) {
        // Day/night
        this._updateDayNight(dt);

        // Floating texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft._age += dt;
            ft.y += ft._vy * (dt * 0.06);
            ft.alpha = 1 - (ft._age / ft._lifetime);

            if (ft._age >= ft._lifetime) {
                this.container.removeChild(ft);
                this.floatingTexts.splice(i, 1);
            }
        }

        // Thought bubbles
        for (let i = this.thoughtBubbles.length - 1; i >= 0; i--) {
            const tb = this.thoughtBubbles[i];
            tb._age += dt;
            // Float up slightly
            tb.y -= dt * 0.005;
            // Fade out in last 500ms
            if (tb._age > tb._lifetime - 500) {
                tb.alpha = Math.max(0, (tb._lifetime - tb._age) / 500);
            }
            if (tb._age >= tb._lifetime) {
                this.container.removeChild(tb);
                this.thoughtBubbles.splice(i, 1);
            }
        }

        // Random Simlish chat
        this.simlishTimer += dt;
        if (this.simlishTimer >= this.nextSimlish) {
            this.simlishTimer = 0;
            this.nextSimlish = 12000 + Math.random() * 18000;
            // Trigger through state bridge if available
            window.simsOffice?.stateBridge?._triggerRandomEvent();
        }
    }
}

window.SimsEffects = SimsEffects;
