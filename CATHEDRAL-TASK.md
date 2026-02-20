# CATHEDRAL TASK — SpawnKit v2 → SpawnKit Unified Dashboard

## YOUR MISSION
Build a UNIFIED SpawnKit dashboard that merges the visual themes (spawnkit-v2/) with the SpawnKit product (products/spawnkit-os/site/).

**THE #1 RULE**: Zero terminal. A grandmother must be able to use this. No jargon, no CLI, no "deploy". Just beautiful, working software.

## CURRENT CODEBASE

### Visual Themes (spawnkit-v2/)
- `src/` — 16 shared modules: PixiJS engine, UX layer, achievements, boot sequences, sprites, theme switcher, etc.
- `office-gameboy/` — GameBoy Pokémon RPG theme (green monochrome, 4-color palette)
- `office-gameboy-color/` — Enhanced GameBoy Color variant
- `office-sims/` — The Sims 1 isometric office theme (plumbobs, mood system)
- `src/theme-selector.html` — Standalone theme picker page
- `lib/pixi.min.js` — PixiJS rendering engine

### SpawnKit Product (products/spawnkit-os/site/)
- `dashboard.html` — Current dashboard with agent cards
- `js/agent-builder.js` — 6-step Create-A-Agent wizard
- `js/setup-wizard.js` — OAuth bridge setup (zero terminal)
- `js/sprite-composer.js` — 16x16 pixel art composition
- `js/agent-xp.js` — XP and leveling system

## WHAT TO BUILD

### 1. Unified Dashboard (`spawnkit-v2/dashboard.html`)
Create ONE new dashboard.html in spawnkit-v2/ that:
- **First visit**: Full-screen theme selector with animated previews of all 3 themes
- **After selection**: Dashboard with chosen theme as the LIVE background/environment
- **Sidebar/overlay**: Agent management, missions, achievements (works with ANY theme)
- **Theme saved in localStorage**, switchable via settings gear icon

### 2. Fix ALL JavaScript Bugs
- Audit EVERY .js file for null-safety issues
- Add optional chaining (`?.`) wherever object chains could be null
- Ensure `this.stateBridge`, `this.characterManager`, `this.officeMap` are ALWAYS null-safe
- Test stability: ZERO errors in 60-second runtime test

### 3. Grandma UX Requirements
- **No jargon**: Replace "Deploy" → "Launch", "Config" → "Settings", "API" → "Connection"
- **Big buttons**: Minimum 44px touch targets
- **Visual feedback**: Loading spinners, success animations, helpful error messages
- **Onboarding tooltips**: First-time hints that explain each section
- **Mobile responsive**: Works on phone, tablet, desktop
- **Dark theme by default** with soft, comfortable colors

### 4. Theme Integration
Each theme renders in an iframe or container within the dashboard:
- Theme receives agent data via postMessage or shared state
- Agents appear as characters in the visual world
- Clicking a character in the theme opens its management panel
- Mission progress shown BOTH in theme (visual) and sidebar (list)

### 5. Agent Management Panel (overlay on any theme)
- **Create Agent**: Big "+" button → launches Create-A-Agent wizard
- **Agent Cards**: Photo/sprite, name, level, XP bar, current task
- **Quick Actions**: Pause, edit, delete with confirmation
- **Mission Board**: Active missions with progress bars

## QUALITY REQUIREMENTS
- Zero console errors
- All themes load and animate correctly
- Theme switching without page reload
- Mobile responsive (320px to 4K)
- Performance: <3s load, 60fps
- Accessibility: keyboard navigable

## FILES TO MODIFY/CREATE
1. `spawnkit-v2/dashboard.html` — NEW unified dashboard
2. `spawnkit-v2/src/dashboard-controller.js` — NEW dashboard logic
3. `spawnkit-v2/src/*.js` — Fix null-safety bugs in ALL shared modules
4. `spawnkit-v2/office-gameboy/*.js` — Fix null-safety bugs
5. `spawnkit-v2/office-gameboy-color/*.js` — Fix null-safety bugs  
6. `spawnkit-v2/office-sims/*.js` — Fix null-safety bugs

## ITERATION PROTOCOL
After building, you MUST run 20 self-review iterations:
1. Build the feature
2. Check for bugs (grep for unsafe property access, test in browser)
3. Fix what you find
4. Repeat

Track each iteration in a comment block at the top of dashboard.html:
```
<!-- ITERATION LOG
Loop 1: Initial build — created dashboard shell
Loop 2: Fixed theme loader null ref
Loop 3: Added mobile responsive breakpoints
...
Loop 20: Final polish, all tests pass
-->
```

When completely finished, run this command to notify me:
openclaw system event --text "Done: SpawnKit unified dashboard built — 20 iterations complete, all themes integrated, zero terminal UX" --mode now
