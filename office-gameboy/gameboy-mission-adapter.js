/**
 * GameBoy Mission Adapter — Wires MissionController into the GameBoy theme
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This is the Pokémon moment. MissionController decides WHAT happens,
 * this adapter decides HOW it looks in GameBoy green.
 * 
 * All 16 callbacks implemented with:
 * - GameBoy 4-color palette (#9BBB0F, #8BAC0F, #306230, #0F380F)
 * - Chunky pixel borders, ALL CAPS, Press Start 2P font
 * - Smooth isometric grid lerping
 * - Sub-agents at 70% scale with lighter shade
 * - Graceful fallbacks everywhere
 * 
 * @author Echo (CMO)
 * @version 1.0.0
 */

(function (global) {
  'use strict';

  // ─── GameBoy Palette ────────────────────────────────────────────
  const GB = {
    lightest: 0x9BBB0F,
    light:    0x8BAC0F,
    dark:     0x306230,
    darkest:  0x0F380F,
    // CSS versions
    css: {
      lightest: '#9BBB0F',
      light:    '#8BAC0F',
      dark:     '#306230',
      darkest:  '#0F380F',
    }
  };

  // ─── Sub-agent name pool (Pokémon trainers via SpawnKitNames) ──
  let stagiaireCounter = 0;
  
  function getSubAgentDisplayName(index) {
    if (window.SpawnKitNames) return SpawnKitNames.getSubAgentName('gameboy', index);
    const fallback = ['ROOKIE #1', 'YOUNGSTER #1', 'BUG CATCHER #1'];
    return fallback[index % fallback.length];
  }
  
  function resolveObjectName(objectId) {
    if (window.SpawnKitNames) return SpawnKitNames.resolveObject('gameboy', objectId);
    return objectId;
  }
  
  function resolveAgentName(canonicalId, field) {
    if (window.SpawnKitNames) return SpawnKitNames.resolve('gameboy', canonicalId, field);
    const fallback = { hunter: 'TRADER', forge: 'HACKER', echo: 'BARD', atlas: 'SCRIBE', sentinel: 'WATCHER' };
    return fallback[canonicalId] || canonicalId;
  }

  // ─── Notification queue (top of screen) ─────────────────────────
  let notificationContainer = null;
  let notificationTimeout = null;

  // ─── Whiteboard text tracking ───────────────────────────────────
  let whiteboardTextSprite = null;

  // ─── Object animation sprites (overlays on map objects) ─────────
  const objectOverlays = {};

  // ─── References set during init ─────────────────────────────────
  let _app = null;
  let _charManager = null;
  let _officeMap = null;
  let _effectsContainer = null;

  // ─── Character ID → GameBoyCharacter lookup ─────────────────────

  function findChar(charId) {
    if (!_charManager) return null;
    // Try by name first (mission controller uses lowercase IDs like 'hunter', 'forge')
    const byName = _charManager.findCharacterByName(charId);
    if (byName) return byName;
    // Try by role
    const byRole = _charManager.findCharacterByRole(charId);
    if (byRole) return byRole;
    // Try sub-agents
    const sub = _charManager.subAgents.find(s =>
      s.subagentId === charId || s.name.toLowerCase() === String(charId).toLowerCase()
    );
    return sub || null;
  }

  // ─── Lerp helper (smooth movement via requestAnimationFrame) ────

  function lerpMove(character, fromGrid, toGrid, durationMs) {
    return new Promise(resolve => {
      if (!character) { resolve(); return; }

      const startX = fromGrid.x;
      const startY = fromGrid.y;
      const endX = toGrid.x;
      const endY = toGrid.y;
      const startTime = performance.now();
      const dur = Math.max(100, durationMs);

      // Set character to moving state
      character.isMoving = true;

      function step(now) {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / dur);
        // Ease-in-out cubic
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        character.gridX = startX + (endX - startX) * ease;
        character.gridY = startY + (endY - startY) * ease;
        character.updateScreenPosition();

        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          character.gridX = endX;
          character.gridY = endY;
          character.targetX = endX;
          character.targetY = endY;
          character.isMoving = false;
          character.updateScreenPosition();
          resolve();
        }
      }

      requestAnimationFrame(step);
    });
  }

  // ─── Get screen position for a grid position ───────────────────

  function gridToScreenAbsolute(gridX, gridY) {
    if (!_officeMap) return { x: 0, y: 0 };
    const iso = _officeMap.gridToScreen(gridX, gridY);
    // The character container has an offset — match it
    return { x: iso.x, y: iso.y };
  }

  // ─── Create notification overlay ────────────────────────────────

  function ensureNotificationContainer() {
    if (notificationContainer && notificationContainer.parent) return notificationContainer;

    notificationContainer = new PIXI.Container();
    notificationContainer.zIndex = 9999;

    // Position at top center of the effects container
    if (_effectsContainer) {
      _effectsContainer.addChild(notificationContainer);
    } else if (_app) {
      _app.stage.addChild(notificationContainer);
    }

    return notificationContainer;
  }

  // ─── Object overlay helpers ─────────────────────────────────────

  function getOrCreateObjectOverlay(objectId) {
    if (objectOverlays[objectId] && objectOverlays[objectId].parent) {
      return objectOverlays[objectId];
    }

    const overlay = new PIXI.Container();
    overlay.zIndex = 100;

    // Get position from map locations
    const locMap = {
      mailbox: 'mailbox',
      phone: 'phoneAlarm',
      whiteboard: 'missionBoard',
      door: null, // We'll position door at top-right of walkable area
      coffee: 'coffeeStation',
    };

    const locKey = locMap[objectId];
    let loc = locKey ? _officeMap?.locations[locKey] : null;

    // Door position — top center near entrance
    if (objectId === 'door') {
      loc = { x: 8, y: 1 };
    }

    if (loc && _officeMap) {
      const screenPos = _officeMap.gridToScreen(loc.x, loc.y);
      overlay.x = _app.screen.width / 2 + screenPos.x;
      overlay.y = 150 + screenPos.y;
    }

    if (_effectsContainer) {
      _effectsContainer.addChild(overlay);
    } else if (_app) {
      _app.stage.addChild(overlay);
    }

    objectOverlays[objectId] = overlay;
    return overlay;
  }

  function clearObjectOverlay(objectId) {
    const overlay = objectOverlays[objectId];
    if (overlay) {
      overlay.removeChildren();
    }
  }

  // ─── Mailbox animations ─────────────────────────────────────────

  function animateMailboxGlow(overlay) {
    overlay.removeChildren();

    // Glowing mailbox with flag up
    const gfx = new PIXI.Graphics();
    let blinkTimer = 0;
    let blinkOn = true;

    // Draw mailbox box
    gfx.lineStyle(2, GB.darkest);
    gfx.beginFill(GB.lightest);
    gfx.drawRect(-8, -8, 16, 16);
    gfx.endFill();

    // Flag (up position)
    gfx.beginFill(GB.lightest);
    gfx.drawRect(8, -12, 3, 8);
    gfx.endFill();
    gfx.beginFill(GB.darkest);
    gfx.drawRect(8, -12, 6, 3);
    gfx.endFill();

    // Letter icon
    const letter = new PIXI.Text('📮', { fontSize: 10 });
    letter.anchor.set(0.5);
    letter.y = -20;

    overlay.addChild(gfx);
    overlay.addChild(letter);

    // Blink animation
    const interval = setInterval(() => {
      blinkOn = !blinkOn;
      gfx.alpha = blinkOn ? 1 : 0.4;
      letter.alpha = blinkOn ? 1 : 0.5;
    }, 300);

    // Store cleanup
    overlay._cleanup = () => clearInterval(interval);
  }

  // ─── Phone animations ──────────────────────────────────────────

  function animatePhoneRing(overlay) {
    overlay.removeChildren();
    if (overlay._cleanup) { overlay._cleanup(); overlay._cleanup = null; }

    const gfx = new PIXI.Graphics();
    gfx.lineStyle(2, GB.darkest);
    gfx.beginFill(GB.lightest);
    gfx.drawCircle(0, 0, 8);
    gfx.endFill();

    // Ring waves
    const wave1 = new PIXI.Graphics();
    wave1.lineStyle(1, GB.lightest, 0.6);
    wave1.drawCircle(0, 0, 12);
    const wave2 = new PIXI.Graphics();
    wave2.lineStyle(1, GB.light, 0.4);
    wave2.drawCircle(0, 0, 16);

    const ringText = new PIXI.Text('📞', { fontSize: 10 });
    ringText.anchor.set(0.5);
    ringText.y = -18;

    overlay.addChild(gfx);
    overlay.addChild(wave1);
    overlay.addChild(wave2);
    overlay.addChild(ringText);

    // Shake animation
    let shakeT = 0;
    const interval = setInterval(() => {
      shakeT += 0.3;
      gfx.x = Math.sin(shakeT * 10) * 3;
      wave1.alpha = 0.3 + Math.abs(Math.sin(shakeT)) * 0.5;
      wave2.alpha = 0.2 + Math.abs(Math.cos(shakeT)) * 0.4;
    }, 50);

    overlay._cleanup = () => clearInterval(interval);
  }

  // ─── Door animations ───────────────────────────────────────────

  function animateDoorOpen(overlay) {
    overlay.removeChildren();
    if (overlay._cleanup) { overlay._cleanup(); overlay._cleanup = null; }

    const gfx = new PIXI.Graphics();
    // Open door frame
    gfx.lineStyle(2, GB.darkest);
    gfx.beginFill(GB.dark);
    gfx.drawRect(-10, -14, 20, 28);
    gfx.endFill();

    // Opening (lighter inside)
    gfx.beginFill(GB.lightest, 0.5);
    gfx.drawRect(-8, -12, 12, 24);
    gfx.endFill();

    // Door knob
    gfx.beginFill(GB.lightest);
    gfx.drawCircle(2, 0, 2);
    gfx.endFill();

    overlay.addChild(gfx);
  }

  function animateDoorClosed(overlay) {
    overlay.removeChildren();
    if (overlay._cleanup) { overlay._cleanup(); overlay._cleanup = null; }

    const gfx = new PIXI.Graphics();
    gfx.lineStyle(2, GB.darkest);
    gfx.beginFill(GB.dark);
    gfx.drawRect(-10, -14, 20, 28);
    gfx.endFill();

    // Door knob
    gfx.beginFill(GB.lightest);
    gfx.drawCircle(6, 0, 2);
    gfx.endFill();

    overlay.addChild(gfx);
  }

  // ─── Whiteboard text overlay ────────────────────────────────────

  function showWhiteboardText(text, missionId) {
    const overlay = getOrCreateObjectOverlay('whiteboard');
    // Remove old text if any
    if (whiteboardTextSprite && whiteboardTextSprite.parent) {
      whiteboardTextSprite.parent.removeChild(whiteboardTextSprite);
    }

    const safeText = text || 'MISSION';
    const truncated = safeText.length > 20 ? safeText.slice(0, 19) + '…' : safeText;

    whiteboardTextSprite = new PIXI.Text(truncated.toUpperCase(), {
      fontFamily: 'Press Start 2P, Monaco, monospace',
      fontSize: 5,
      fill: GB.darkest,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: 40,
    });
    whiteboardTextSprite.anchor.set(0.5);
    whiteboardTextSprite.y = -2;
    overlay.addChild(whiteboardTextSprite);
  }

  function clearWhiteboardText() {
    if (whiteboardTextSprite && whiteboardTextSprite.parent) {
      whiteboardTextSprite.parent.removeChild(whiteboardTextSprite);
      whiteboardTextSprite = null;
    }
  }

  // ─── Screen flash effect ────────────────────────────────────────

  function screenFlash(color, durationMs) {
    if (!_app) return;

    const flash = new PIXI.Graphics();
    flash.beginFill(color || 0xFFFFFF, 0.8);
    flash.drawRect(0, 0, _app.screen.width, _app.screen.height);
    flash.endFill();
    flash.zIndex = 10000;

    _app.stage.addChild(flash);

    const dur = durationMs || 300;
    const startTime = performance.now();

    function fade(now) {
      const t = Math.min(1, (now - startTime) / dur);
      flash.alpha = 0.8 * (1 - t);
      if (t < 1) {
        requestAnimationFrame(fade);
      } else {
        _app.stage.removeChild(flash);
      }
    }
    requestAnimationFrame(fade);
  }

  // ─── Confetti particles ─────────────────────────────────────────

  function spawnConfetti(container, count) {
    if (!container && !_effectsContainer) return;
    const parent = container || _effectsContainer;

    const particles = [];
    const confettiContainer = new PIXI.Container();
    confettiContainer.zIndex = 5000;
    parent.addChild(confettiContainer);

    for (let i = 0; i < (count || 30); i++) {
      const p = new PIXI.Graphics();
      const colors = [GB.lightest, GB.light, GB.dark];
      p.beginFill(colors[Math.floor(Math.random() * colors.length)]);
      p.drawRect(0, 0, 3, 3);
      p.endFill();

      p.x = Math.random() * (_app?.screen?.width || 800);
      p.y = -10 - Math.random() * 50;
      p._vx = (Math.random() - 0.5) * 2;
      p._vy = 0.5 + Math.random() * 2;
      p._life = 1.0;

      confettiContainer.addChild(p);
      particles.push(p);
    }

    function animate() {
      let alive = false;
      for (const p of particles) {
        if (p._life <= 0) continue;
        p.x += p._vx;
        p.y += p._vy;
        p._vy += 0.05; // gravity
        p._life -= 0.008;
        p.alpha = Math.max(0, p._life);
        if (p._life > 0) alive = true;
      }
      if (alive) {
        requestAnimationFrame(animate);
      } else {
        parent.removeChild(confettiContainer);
      }
    }
    requestAnimationFrame(animate);
  }

  // ─── Map character IDs to agent names ───────────────────────────

  const CHAR_ID_MAP = {
    kira: 'Hunter',  // Kira/ApoMac → Hunter is the CEO/lead in GameBoy theme
    hunter: 'Hunter',
    forge: 'Forge',
    echo: 'Echo',
    atlas: 'Atlas',
    sentinel: 'Sentinel',
  };

  function resolveCharName(charId) {
    return CHAR_ID_MAP[String(charId).toLowerCase()] || charId;
  }

  // ─── Map object IDs to map location keys ────────────────────────

  const OBJECT_LOC_MAP = {
    mailbox: 'mailbox',
    phone: 'phoneAlarm',
    whiteboard: 'missionBoard',
    coffee: 'coffeeStation',
    door: null, // special handling
  };

  function getObjectGridPos(objectId) {
    if (objectId === 'door') return { x: 8, y: 1 };

    const locKey = OBJECT_LOC_MAP[objectId];
    if (locKey && _officeMap?.locations[locKey]) {
      const loc = _officeMap.locations[locKey];
      return { x: loc.x, y: loc.y };
    }

    // Check desk positions: desk_hunter, desk_forge, etc.
    if (String(objectId).startsWith('desk_')) {
      const agentName = objectId.replace('desk_', '');
      const deskKey = agentName + 'Desk';
      const loc = _officeMap?.locations[deskKey];
      if (loc) return { x: loc.x, y: loc.y };
    }

    return { x: 8, y: 6 }; // center fallback
  }

  // ═══════════════════════════════════════════════════════════════
  // ██  MAIN ADAPTER — initMissionAdapter()  ██████████████████████
  // ═══════════════════════════════════════════════════════════════

  function initMissionAdapter(app, characterManager, officeMap, effectsContainer) {
    // Guard: MissionController must exist
    if (typeof MissionController === 'undefined') {
      console.warn('🎮 [MissionAdapter] MissionController not loaded — skipping adapter init');
      return;
    }

    _app = app;
    _charManager = characterManager;
    _officeMap = officeMap;
    _effectsContainer = effectsContainer || (app ? app.stage : null);

    console.log('🎮 [MissionAdapter] Registering GameBoy theme with MissionController...');

    MissionController.registerTheme({

      // ─── 1. moveCharacter ─────────────────────────────────────
      moveCharacter(charId, fromPos, toPos, duration) {
        const name = resolveCharName(charId);
        const char = findChar(name) || findChar(charId);
        if (!char) {
          console.warn(`[MissionAdapter] Character not found: ${charId}`);
          return Promise.resolve();
        }

        const from = fromPos || { x: char.gridX, y: char.gridY };
        return lerpMove(char, from, toPos, duration || 2000);
      },

      // ─── 2. showSpeechBubble ──────────────────────────────────
      showSpeechBubble(charId, text, duration) {
        const name = resolveCharName(charId);
        const char = findChar(name) || findChar(charId);
        if (!char) return;

        // GameBoy style: ALL CAPS, strip complex emoji for pixel font
        const cleanText = String(text || '').toUpperCase().slice(0, 20);
        char.showSpeechBubble(cleanText);

        // Also send to Pokémon system message box for typewriter effect
        if (window.PokemonUI && text && text.length > 6) {
          const pokeName = char.title || char.name || charId;
          window.PokemonUI.systemMessage(`${pokeName}: ${cleanText}`);
        }

        if (duration && char.speechTimer !== undefined) {
          char.speechTimer = duration;
        }
      },

      // ─── 3. showProgressBar ───────────────────────────────────
      showProgressBar(charId, progress) {
        const name = resolveCharName(charId);
        const char = findChar(name) || findChar(charId);
        if (!char) return;

        const pct = Math.max(0, Math.min(100, progress)) / 100;

        // Ensure progress bar container exists
        if (!char.progressBar) {
          // Create GameBoy-style progress bar
          const barContainer = new PIXI.Container();

          const barBg = new PIXI.Graphics();
          barBg.lineStyle(1, GB.darkest, 1);
          barBg.beginFill(GB.darkest);
          barBg.drawRect(-15, -2, 30, 4);
          barBg.endFill();

          const barFill = new PIXI.Graphics();

          barContainer.addChild(barBg);
          barContainer.addChild(barFill);
          barContainer.y = 16;

          char.progressBar = { container: barContainer, fill: barFill, progress: 0 };
          char.container.addChild(barContainer);
        }

        // Update fill
        char.progressBar.progress = pct;
        char.progressBar.fill.clear();
        char.progressBar.fill.beginFill(GB.lightest);
        char.progressBar.fill.drawRect(-15, -2, 30 * pct, 4);
        char.progressBar.fill.endFill();
      },

      // ─── 4. hideProgressBar ───────────────────────────────────
      hideProgressBar(charId) {
        const name = resolveCharName(charId);
        const char = findChar(name) || findChar(charId);
        if (!char) return;
        char.hideProgressBar();
      },

      // ─── 5. playAnimation ─────────────────────────────────────
      playAnimation(charId, animName, opts) {
        const name = resolveCharName(charId);
        const char = findChar(name) || findChar(charId);
        if (!char) return Promise.resolve();

        const anim = String(animName).toLowerCase();

        switch (anim) {
          case 'idle':
          case 'idle_1':
            char.isWorking = false;
            char.state = 'thinking';
            break;

          case 'working':
          case 'working_1':
            char.isWorking = true;
            char.state = 'working_at_desk';
            char.workingAnimation = 0;
            break;

          case 'walking':
          case 'walk_right_1':
            char.isMoving = true;
            break;

          case 'celebrating':
          case 'celebrating_1':
            char.state = 'celebrating';
            char.celebrationBounce = 0;
            break;

          case 'stand_up':
            char.isWorking = false;
            char.state = 'thinking';
            break;

          case 'open_letter':
          case 'carry_document':
            char.carryDocument('MISSION');
            break;

          case 'writing':
            char.isWorking = true;
            char.showSpeechBubble('WRITING...');
            break;

          case 'answer_phone':
            char.showSpeechBubble('HELLO?');
            break;

          case 'look_up':
            // Subtle attention — just show a brief "?" bubble
            char.showSpeechBubble('?');
            if (char.speechTimer !== undefined) char.speechTimer = 1000;
            break;

          default:
            // Unknown animation — just update sprite frame
            char.updateSpriteFrame?.();
            break;
        }

        // Update sprite frame for new state
        char.updateSpriteFrame?.();

        return Promise.resolve();
      },

      // ─── 6. showNotification (Pokémon-style) ────────────────────
      showNotification(text, type) {
        // Also push to Pokémon system message box
        if (window.PokemonUI) {
          window.PokemonUI.systemMessage(String(text || '').toUpperCase());
        }
        ensureNotificationContainer();
        notificationContainer.removeChildren();

        if (notificationTimeout) {
          clearTimeout(notificationTimeout);
          notificationTimeout = null;
        }

        // GameBoy-style notification box
        const box = new PIXI.Graphics();
        const padding = 8;
        const maxWidth = 300;

        const notifText = new PIXI.Text(String(text || '').toUpperCase(), {
          fontFamily: 'Press Start 2P, Monaco, monospace',
          fontSize: 7,
          fill: type === 'success' ? GB.lightest : (type === 'warning' ? GB.dark : GB.lightest),
          align: 'center',
          wordWrap: true,
          wordWrapWidth: maxWidth - padding * 2,
        });
        notifText.anchor.set(0.5, 0.5);

        const boxW = Math.min(maxWidth, notifText.width + padding * 2);
        const boxH = notifText.height + padding * 2;

        // Chunky border box
        box.lineStyle(3, GB.light);
        box.beginFill(GB.darkest, 0.95);
        box.drawRect(-boxW / 2, -boxH / 2, boxW, boxH);
        box.endFill();

        // Inner highlight
        box.lineStyle(1, GB.dark);
        box.drawRect(-boxW / 2 + 2, -boxH / 2 + 2, boxW - 4, boxH - 4);

        notificationContainer.addChild(box);
        notificationContainer.addChild(notifText);

        // Position at top center
        notificationContainer.x = (_app?.screen?.width || 800) / 2;
        notificationContainer.y = 25;

        // Auto-dismiss
        notificationTimeout = setTimeout(() => {
          if (notificationContainer) {
            // Fade out
            const fadeStart = performance.now();
            function fadeNotif(now) {
              const t = Math.min(1, (now - fadeStart) / 400);
              notificationContainer.alpha = 1 - t;
              if (t < 1) {
                requestAnimationFrame(fadeNotif);
              } else {
                notificationContainer.removeChildren();
                notificationContainer.alpha = 1;
              }
            }
            requestAnimationFrame(fadeNotif);
          }
        }, 3500);
      },

      // ─── 7. triggerObject ─────────────────────────────────────
      triggerObject(objectId, state, data) {
        const overlay = getOrCreateObjectOverlay(objectId);

        switch (objectId) {
          case 'mailbox':
            if (state === 'glowing') {
              animateMailboxGlow(overlay);
              _officeMap?.triggerMailboxFlash?.();
            } else if (state === 'empty') {
              clearObjectOverlay(objectId);
              if (overlay._cleanup) { overlay._cleanup(); overlay._cleanup = null; }
            }
            break;

          case 'phone':
            if (state === 'ringing') {
              animatePhoneRing(overlay);
              _officeMap?.triggerPhoneRing?.();
            } else if (state === 'answered' || state === 'silent') {
              clearObjectOverlay(objectId);
              if (overlay._cleanup) { overlay._cleanup(); overlay._cleanup = null; }
            }
            break;

          case 'whiteboard':
            if (state === 'mission' && data?.text) {
              showWhiteboardText(data.text, data.missionId);
            } else if (state === 'complete') {
              // Flash the whiteboard green then add a ✓
              if (whiteboardTextSprite) {
                whiteboardTextSprite.style.fill = GB.css.lightest;
                whiteboardTextSprite.text = '✓ DONE!';
              }
            } else if (state === 'clear') {
              clearWhiteboardText();
            }
            break;

          case 'door':
            if (state === 'open') {
              animateDoorOpen(overlay);
            } else if (state === 'closed') {
              animateDoorClosed(overlay);
            }
            break;

          case 'coffee':
            // Coffee machine bubbling
            if (state === 'brewing') {
              overlay.removeChildren();
              const steam = new PIXI.Text('☕', { fontSize: 12 });
              steam.anchor.set(0.5);
              steam.y = -16;
              overlay.addChild(steam);
            } else {
              clearObjectOverlay(objectId);
            }
            break;

          default:
            break;
        }

        return Promise.resolve();
      },

      // ─── 8. writeWhiteboard (QUEST BOARD) ──────────────────────
      writeWhiteboard(text, missionId) {
        showWhiteboardText(text, missionId);

        // Also update the DOM mission panel with HP bar
        const panel = document.getElementById('currentMissions');
        if (panel) {
          panel.innerHTML = `
            <div class="mission-item">
              <div>${String(text || 'QUEST').toUpperCase()}</div>
              <div class="hp-bar">
                <div class="hp-fill hp-green" style="width: 5%"></div>
              </div>
            </div>`;
        }
        
        // Wild MISSION appeared!
        if (window.PokemonUI) {
          window.PokemonUI.wildEncounterMission(text || 'NEW QUEST');
        }

        return Promise.resolve();
      },

      // ─── 9. clearWhiteboard ───────────────────────────────────
      clearWhiteboard(missionId) {
        clearWhiteboardText();
        clearObjectOverlay('whiteboard');

        const panel = document.getElementById('currentMissions');
        if (panel) {
          panel.innerHTML = `
            <div class="mission-item">
              <div>STATUS: READY</div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: 0%"></div>
              </div>
            </div>`;
        }

        return Promise.resolve();
      },

      // ─── 10. spawnSubAgent (Pokémon trainer class names) ───────
      spawnSubAgent(config) {
        if (!_charManager) return config.id || 'unknown';

        const name = config.name || getSubAgentDisplayName(stagiaireCounter);
        stagiaireCounter++;

        // Spawn at door position
        const doorPos = { x: 8, y: 2 };

        const stagiaire = new GameBoyCharacter(
          (name || 'ROOKIE').toUpperCase(),
          'STAGIAIRE',
          '📂',
          GB.light, // Lighter shade to distinguish
          doorPos,
          _officeMap
        );

        // Store sub-agent ID for tracking
        stagiaire.subagentId = config.id;

        // 70% scale to distinguish from main agents
        stagiaire.container.scale.set(0.7);

        // Give them a document
        stagiaire.carryDocument('TASK');

        _charManager.subAgents.push(stagiaire);
        _charManager.container.addChild(stagiaire.container);

        console.log(`🎮 [MissionAdapter] Stagiaire spawned: ${name}`);

        return config.id || stagiaire.subagentId;
      },

      // ─── 11. removeSubAgent ───────────────────────────────────
      removeSubAgent(charId) {
        if (!_charManager) return;

        const sub = _charManager.subAgents.find(s =>
          s.subagentId === charId || s.name.toLowerCase() === String(charId).toLowerCase()
        );

        if (sub) {
          _charManager.removeSubAgent(sub);
          console.log(`🎮 [MissionAdapter] Stagiaire removed: ${sub.name}`);
        }
      },

      // ─── 12. celebrate (SUPER EFFECTIVE!) ─────────────────────
      celebrate(charIds) {
        // Screen flash!
        screenFlash(0xFFFFFF, 350);

        // Confetti particles
        setTimeout(() => {
          spawnConfetti(_effectsContainer, 40);
        }, 100);

        // Make all specified characters bounce
        const ids = charIds || [];
        for (const id of ids) {
          const name = resolveCharName(id);
          const char = findChar(name) || findChar(id);
          if (char) {
            char.state = 'celebrating';
            char.celebrationBounce = 0;
            char.updateSpriteFrame?.();
          }
        }

        // Also trigger the existing celebration system
        if (_charManager?.showGameBoyConfetti) {
          _charManager.showGameBoyConfetti();
        }
        
        // Pokémon victory message
        if (window.PokemonUI) {
          const ceoTitle = resolveAgentName('ceo', 'title');
          window.PokemonUI.superEffective(ceoTitle, 'DEPLOY');
        }

        return Promise.resolve();
      },

      // ─── 13. getCharacterPosition ─────────────────────────────
      getCharacterPosition(charId) {
        const name = resolveCharName(charId);
        const char = findChar(name) || findChar(charId);
        if (!char) return { x: 8, y: 6 }; // center fallback
        return { x: char.gridX, y: char.gridY };
      },

      // ─── 14. getObjectPosition ────────────────────────────────
      getObjectPosition(objectId) {
        return getObjectGridPos(objectId);
      },

      // ─── 15. getAgentIds ──────────────────────────────────────
      getAgentIds() {
        if (!_charManager) return ['hunter', 'forge', 'echo', 'atlas', 'sentinel'];
        return _charManager.characters.map(c => c.name.toLowerCase());
      },

      // ─── 16. getCeoId ─────────────────────────────────────────
      getCeoId() {
        // Hunter is the lead/CEO in the GameBoy office
        return 'hunter';
      },

      // ─── BONUS: playSound (optional) ──────────────────────────
      playSound(soundId) {
        // No audio in GameBoy theme (authentic silent LCD experience!)
        // Could add Web Audio beeps here in the future
      },
    });

    console.log('🎮 [MissionAdapter] ✅ GameBoy theme registered with MissionController!');
    console.log('🎮 [MissionAdapter] Checking for live data...');

    // Start demo mode ONLY if no live data is available
    setTimeout(async () => {
      if (typeof MissionController === 'undefined' || !MissionController.demo) return;
      
      // Check if live data is available (Electron + OpenClaw installed)
      let hasLiveData = false;
      try {
        if (window.spawnkitAPI && typeof window.spawnkitAPI.isAvailable === 'function') {
          hasLiveData = await window.spawnkitAPI.isAvailable();
        }
      } catch (e) { /* not in Electron context */ }
      
      if (hasLiveData) {
        console.log('🎮 [MissionAdapter] Live data detected — demo mode SKIPPED');
        return;
      }
      
      console.log('🎮 ═══════════════════════════════════════');
      console.log('🎮  DEMO MODE — No live data, showing showcase');
      console.log('🎮 ═══════════════════════════════════════');
      MissionController.demo({ loop: true, pauseBetween: 4000 });
    }, 3000);
  }

  // ── Expose globally ─────────────────────────────────────────────
  window.initMissionAdapter = initMissionAdapter;

  console.log('🎮 GameBoy Mission Adapter loaded — waiting for initMissionAdapter() call');

})(typeof window !== 'undefined' ? window : this);
