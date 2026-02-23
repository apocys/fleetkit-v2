# SpawnKit Executive Office

AI team management dashboard built on OpenClaw. Manage your AI agents like a CEO manages their executive team.

## Architecture

- **Server:** Node.js (`server.js`) on port 8765
- **Frontend:** Vanilla JS, no build step
- **Reverse proxy:** Caddy → `app.spawnkit.ai`
- **Fleet relay:** Port 18790 for inter-office communication

## File Structure

```
executive-office/
├── server.js                    # API server (tasks, brainstorm, chat proxy, fleet relay)
├── office-executive/
│   ├── index.html               # HTML structure (~930 lines)
│   ├── styles.css               # All CSS (~4,164 lines)
│   ├── auth.js                  # API auth gate (Bearer token)
│   ├── app.js                   # Config, utils, onboarding, live agent behaviors
│   ├── main.js                  # Core logic, panels, brainstorm, settings
│   ├── agents.js                # Add Agent wizard
│   ├── orchestration.js         # Orchestration panel
│   ├── mission-control.js       # CEO Mission Control (chat, tasks, fleet, remote)
│   └── src/
│       ├── data-bridge.js       # OpenClaw API bridge
│       ├── fleet-client.js      # Fleet relay WebSocket client
│       └── fleet-bootstrap.js   # Fleet bootstrap
└── tasks.json                   # Runtime task tracking (not committed)
```

## Features

- **6 agent offices** with status indicators and activation system
- **Mission Control** — live chat with CEO, active tasks, project log, fleet status
- **Boardroom** — full-page brainstorm with dialectical reasoning (Echo/Forge/Sentinel)
- **Skill Library** — 17 production skills with picker UI (max 3 per agent)
- **Onboarding Wizard** — 3-step OAuth provider cards (no API key jargon)
- **Remote Offices** — real-time fleet relay data (connected offices, WS status)
- **API Auth** — Bearer token on all `/api/*` routes
- **Bottom bar** — Missions, Crons, Memory, Chat, Settings, Remote, Theme Picker

## Setup

```bash
cd executive-office
npm install  # if needed
node server.js
# or
systemctl --user start executive-office.service
```

## Auth

Set `SK_API_TOKEN` environment variable:
```bash
export SK_API_TOKEN=your-secret-token
```

Default: `sk-spawnkit-kira-2026`

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/oc/chat` | GET | Chat transcript (last 50 messages) |
| `/api/oc/chat` | POST | Send message to CEO |
| `/api/oc/sessions` | GET | Active sessions |
| `/api/oc/memory` | GET | Fleet memory |
| `/api/oc/config` | GET | Sanitized config |
| `/api/oc/crons` | GET | Scheduled jobs |
| `/api/tasks` | GET | Active + completed tasks |
| `/api/brainstorm` | POST | Brainstorm question → CEO analysis |
| `/api/remote/offices` | GET | Fleet relay office status |

All endpoints require `Authorization: Bearer <token>` header.

## Production

- URL: `https://app.spawnkit.ai/office-executive/`
- Caddy config: `/etc/caddy/Caddyfile`
- Service: `systemctl --user restart executive-office.service`
