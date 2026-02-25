# SpawnKit FleetKit — Workstream Guide

## Quick Start
- **Repo:** `apocys/fleetkit-v2` on GitHub
- **Live:** `themes.spawnkit.ai` (various themes)
- **Server:** `executive-office/server.js` (Express, static + API proxy)

## Architecture

```
fleetkit-v2/
├── executive-office/     # Main dashboard
│   ├── index.html        # Shell (was 11K lines, now modular)
│   ├── js/
│   │   ├── main.js       # App controller, slash commands, chat
│   │   └── panels/
│   │       └── mission-center.js  # Kanban, todos, missions
│   ├── data-layer.js     # localStorage persistence (fleetkit_state)
│   └── server.js         # Express backend
├── office-medieval/      # Medieval castle theme (v5, 3 castles)
├── office-medieval-v1/v2/v3/  # Earlier iterations
├── office-simcity-nature/    # SimCity village theme
└── [other themes]
```

## Recent Work
### Mission Control (Kanban)
- Create Mission modal + quick-create
- Add Task per column, drag-and-drop between columns
- Delete task/mission via context menu
- localStorage persistence via `data-layer.js`
- **Bug fixes:** `outerHTML` → `_refreshKanban()` pattern, todo ID safety, listener leak in `destroy()`

### Slash Commands
- `/mission <task>` or `/m <task>` — brainstorm → extract tasks → create mission → open boardroom
- `/mr <task>` — brainstorm only (meeting room)
- Work in both SpawnKit chat input AND Telegram
- Telegram bot commands registered via BotFather

### Code Split
- Original 11,259-line `index.html` → 7 modular files
- API auth: Bearer token on all `/api/*` routes

## Key Patterns
- **Kanban re-render:** Never use `outerHTML` (detaches node, breaks events). Use `_refreshKanban()` + `_bindKanbanEvents()`.
- **Event cleanup:** `destroy()` must remove exact handler refs stored during `bindEvents()`.
- **FleetState:** Single state object in `data-layer.js`, auto-persists to `fleetkit_state` localStorage key.

## Themes
| Theme | URL | Status |
|-------|-----|--------|
| Executive Office | `/executive-office/` | Active, main dashboard |
| Medieval v5 | `/office-medieval/` | 3 castles, roads, rivers |
| SimCity Village | `/office-simcity-nature/` | 40x40 tile map, 6 agents |
| Green Iso | TBD | Production theme (Kira's idea) |

## Not Done
- [ ] Green Iso theme (isometric agent city, Pixel Crawler sprites)
- [ ] Agent Passport (extract + import)
- [ ] FeedCast / VideoCast
- [ ] Mission Board (users post tasks, idle agents pick up)
- [ ] Real OpenClaw data integration for demo
