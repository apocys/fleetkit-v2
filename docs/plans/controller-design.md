# Dashboard Controller — Design Document

**Module:** `SpawnKitDashboard`  
**File:** `src/dashboard-controller.js`  
**Author:** Forge (CTO)  
**Date:** 2026-02-20

---

## 1. Module Pattern

IIFE exposing a singleton `SpawnKitDashboard` on `window`. Consistent with `SpawnKit`, `MissionController`, and `SpawnKitAchievements` patterns already in the codebase.

```js
(function(global) {
  'use strict';
  const SpawnKitDashboard = { ... };
  global.SpawnKitDashboard = SpawnKitDashboard;
})(typeof window !== 'undefined' ? window : global);
```

## 2. API Surface

| Method | Description |
|---|---|
| `init(options?)` | Bootstrap dashboard: load persisted state, bind events, set up iframe listener |
| `selectTheme(themeId)` | Switch active theme, persist, emit `themeChanged`, post to iframe |
| `toggleSidebar()` | Toggle sidebar state, persist, emit `sidebarToggled` |
| `loadAgents()` | Load agents from localStorage or return defaults |
| `addAgent(agent)` | Add a new agent, persist, emit `agentUpdated` |
| `removeAgent(agentId)` | Remove agent by ID, persist, emit `agentUpdated` |
| `awardXP(agentId, amount)` | Grant XP to agent, check level-up, emit `agentLevelUp` if applicable |
| `getLevel(xp)` | Pure function: XP → level number |
| `createMission(mission)` | Add mission to board, persist, emit `missionCreated` |
| `completeMission(missionId)` | Mark complete, award XP, check achievements, emit `missionComplete` |
| `loadMissions()` | Load missions from localStorage or return defaults |
| `postToTheme(msg)` | Send postMessage to active iframe |
| `syncAgentsToTheme()` | Push full agent state to iframe |
| `getState()` | Return full state snapshot |
| `destroy()` | Remove event listeners, clean up |

## 3. State Shape

```js
{
  currentTheme: 'gameboy',       // active theme ID
  sidebarOpen: true,             // sidebar visibility
  agents: [                      // agent roster
    { id, name, role, emoji, sprite, xp, level },
    ...
  ],
  missions: [                    // mission board
    { id, title, status, reward, assignedTo, createdAt, completedAt },
    ...
  ]
}
```

## 4. localStorage Keys

| Key | Type | Description |
|---|---|---|
| `spawnkit-theme` | string | Current theme ID |
| `spawnkit-agents` | JSON array | Agent roster with XP/levels |
| `spawnkit-missions` | JSON array | Mission board |
| `spawnkit-sidebar` | `'true'`/`'false'` | Sidebar state |

All localStorage operations wrapped in try/catch.

## 5. Event System

Uses `SpawnKit.emit()` / `SpawnKit.on()` when available, falls back to `CustomEvent` on `document`.

| Event | Payload | Trigger |
|---|---|---|
| `themeChanged` | `{ themeId, themeName }` | `selectTheme()` |
| `sidebarToggled` | `{ open: boolean }` | `toggleSidebar()` |
| `agentUpdated` | `{ agents: Agent[] }` | `addAgent()`, `removeAgent()`, `awardXP()` |
| `agentLevelUp` | `{ agent, oldLevel, newLevel }` | `awardXP()` when level crosses threshold |
| `missionCreated` | `{ mission }` | `createMission()` |
| `missionComplete` | `{ mission, xpAwarded }` | `completeMission()` |

## 6. iframe postMessage Protocol

```js
// Outbound (dashboard → theme iframe)
{
  type: 'spawnkit:sync',
  payload: {
    action: 'themeChanged' | 'agentSync' | 'missionUpdate',
    data: { ... }
  }
}

// Inbound (theme iframe → dashboard)
{
  type: 'spawnkit:request',
  payload: {
    action: 'getAgents' | 'getState' | 'awardXP',
    data: { ... }
  }
}
```

Origin validation: accept messages only from same origin or configured whitelist.

## 7. Integration with Existing Modules

- **SpawnKit (data-bridge):** Reuse event bus. Read `SpawnKit.data.agents` for live data enrichment.
- **theme-switcher:** Reuse theme map (`gameboy`, `gameboy-color`, `sims`). `selectTheme()` delegates navigation to `switchTheme()` from theme-switcher.
- **achievements:** Trigger `SpawnKit.emit('mission:complete', ...)` so achievements system picks it up automatically. Reuse achievement definitions for unlock checks.
- **mission-controller:** `completeMission()` calls `MissionController.executeMission()` to trigger office animations.

## 8. XP & Leveling Curve

```
Level 1:    0 XP
Level 2:  100 XP
Level 3:  300 XP
Level 4:  600 XP
Level 5: 1000 XP
...
Formula: threshold(n) = 50 * n * (n - 1)
```

## 9. Default Agents

| ID | Name | Role | Emoji | Starting XP |
|---|---|---|---|---|
| `atlas` | Atlas | COO | 📊 | 0 |
| `forge` | Forge | CTO | 🔨 | 0 |
| `echo` | Echo | CMO | 📢 | 0 |

## 10. Security Constraints

- Zero `eval()` or `innerHTML`
- All user inputs validated (type checks, length limits)
- postMessage origin validation
- localStorage wrapped in try/catch
- No external network calls
