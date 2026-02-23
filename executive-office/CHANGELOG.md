# Changelog

All notable changes to SpawnKit Executive Office are documented here.

---

## [Unreleased] — 2026-02-23

### Added

- **E2E test suite** — 28-step automated test plan, 88% pass rate
- **Onboarding wizard** — First-run setup flow for new teams
- **Activity tab** — Live agent activity feed per office
- **Skill Library** — 17 built-in skills with visual Skill Picker UI
- **Typing indicator** — Chat shows "typing…" while agent responds
- **Chat persistence** — Conversation history survives page reloads
- **Chat bubble layout** — Redesigned message UI with user/agent alignment
- **Brainstorm inline form** — Start a session without leaving the page
- **Brainstorm file attachment** — Attach files to brainstorm sessions
- **Brainstorm past sessions** — Browse and reload previous sessions
- **Brainstorm real AI** — Wired to fleet relay for actual model responses
- **Boardroom full-page view** — Brainstorm converted from modal to full-page experience
- **Mission Control restructure** — Chat as default tab, persistent input bar
- **Mission Control external messages** — Ingest messages from Telegram and other channels
- **Remote Offices** — View and interact with agents on connected fleet relay nodes (real fleet data)
- **New Mission form** — Create missions directly from the Missions panel
- **Follow Up + Save buttons** — Replaced the "Apply Fix" button with more intuitive actions
- **Agent activation persistence** — Active/inactive state survives page reload
- **API auth** — Bearer token gate on all `/api/*` routes (`SK_API_TOKEN` env var)
- **Code split** — Monolithic 11,259-line `index.html` refactored into 7 focused modules

### Fixed

- **P1: Cron panel** — Crons were not saving or triggering correctly
- **P1: Chat** — Messages were not being sent to the correct agent endpoint
- **P1: Memory rendering** — Memory entries were blank / not displaying
- **Telegram metadata stripping** — Removed raw Telegram metadata leaking into chat display

### Changed

- **UX overhaul** — Removed jargon, renamed rooms to plain English ("Honest Rooms")
- **CEO tile cleanup** — Removed Inbox and Orchestration buttons from CEO overview tile
- **File structure** — `office-executive/index.html` split into:
  - `index.html` — HTML structure only (~930 lines)
  - `styles.css` — All CSS (~4,164 lines)
  - `app.js` — Config, utils, onboarding, live agent behaviors
  - `main.js` — Core logic, panels, brainstorm, settings
  - `agents.js` — Add Agent wizard
  - `orchestration.js` — Orchestration panel
  - `mission-control.js` — CEO Mission Control
  - `auth.js` — API auth gate

---

## [v1.0] — 2026-01-xx (initial)

- Initial release: 6 agent offices, basic chat, task panel, server.js API
- Medieval, SimCity, and modern office themes
- Fleet relay integration scaffold
