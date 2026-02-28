# Changelog

## 2026-02-23 — Major Overhaul

### Testing
- E2E test suite: 28 steps, 88% pass rate
- Full UX audit with structured report

### Bug Fixes (P1)
- Crons not rendering → async fetch from fleet relay
- Chat "Unexpected response format" → POST proxy through fleet relay
- Memory content not rendered → async handling fix

### UX Overhaul
- Onboarding Wizard: 3-step flow, OAuth provider cards, localStorage persistence
- Honest Rooms: 5 inactive agents dimmed with overlay
- Jargon removed: "ORCHESTRATOR · NON-DECOMMISSIONABLE" → "TEAM LEAD · ALWAYS ACTIVE"
- CEO tile cleanup: removed Inbox/Orchestration buttons (dispersed to proper locations)

### Chat
- Typing indicator (animated dots)
- Chat persistence (localStorage, last 50)
- Bubble layout: Kira = blue right, Sycopa = white left
- Telegram metadata stripping (clean messages)
- Real-time polling (5s refresh, smart auto-scroll)
- Chat input bar in Mission Control

### Brainstorm & Boardroom
- Inline brainstorm form (no popup overlay)
- File attachment (max 100KB)
- Past sessions with localStorage history
- Wired to real AI via fleet relay → CEO
- Boardroom converted to full-page view (slide-up animation)
- Follow Up + Save buttons (replaced hardcoded "Apply Fix")

### Mission Control Restructure
- Chat as default tab (before Activity)
- Active Tasks with checkbox UI
- External Messages section
- Remote Offices with real fleet relay data (Sycopa HQ + ApoMac HQ)
- Status bar: connected, model, tokens, sessions

### New Features
- Skill Library: 17 production-grade skills
- Skill Picker UI: 2-step activation, max 3 per agent
- Activity tab: live feed from agents/crons
- New Mission form with model selector
- Agent activation persistence (localStorage)
- CEO renamed to Sycopa throughout

### Security
- API auth: Bearer token on all `/api/*` routes
- Login overlay with access code
- Auto-logout on 401

### Code Quality
- Split 11,259-line index.html → 7 modular files
- index.html: 930 lines (pure HTML)
- styles.css: 4,164 lines
- app.js + main.js + agents.js + orchestration.js + mission-control.js + auth.js
