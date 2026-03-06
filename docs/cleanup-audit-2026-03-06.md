# SpawnKit Cleanup Audit — 2026-03-06

## Old Root Page (server/index.html) — Features Inventory
Before deletion, these features must be confirmed present in office-executive:

| Feature | Old Root | Office-Executive | Status |
|---------|----------|------------------|--------|
| Google Auth overlay | ✅ google-auth.js | ✅ auth.js (token-based) | REPLACED |
| SVG Agent Avatars | ✅ 6 SVGs inline | ✅ Emoji-based | REPLACED |
| Agent Room Grid (6 rooms) | ✅ exec-room divs | ✅ exec-room divs | ✅ PRESENT |
| CEO Office (mailbox, orchestration) | ✅ inline | ✅ in index.html | ✅ PRESENT |
| View toggle (Grid/Hierarchy) | ✅ | ✅ main.js | ✅ PRESENT |
| Gateway detection | ✅ gateway-detect.js (24L) | ✅ Merged in app.js | ✅ MERGED |
| Live agent polling | ✅ live-agents.js (591L) | ✅ Merged in app.js | ✅ MERGED |
| Relay bridge | ✅ relay-bridge.js (771L) | ✅ Merged in app.js/data-bridge | ✅ MERGED |
| Agent wizard | ✅ agent-wizard.js (341L) | ✅ agent-wizard.js exists | ✅ PRESENT |
| Setup wizard | ✅ setup-wizard.js (503L) | ❌ Not in office-executive | DEPRECATED (handled by deploy-wizard.js) |
| App init (3041L) | ✅ app-init.js | ✅ Merged into main.js/app.js | ✅ MERGED |
| MC wiring | ✅ mc-wiring.js (434L) | ❌ | REPLACED by mc-core.js + mc-center.js |
| Mission Control | ✅ mission-control.js | ✅ mission-control.js + mc-*.js | ✅ PRESENT |
| Mission Desk | ✅ mission-desk.js/css | ✅ mission-desk.js/css | ✅ PRESENT |
| Onboarding wizard | ✅ onboarding.js | ✅ onboarding.js | ✅ PRESENT |
| Theme picker | ✅ inline in HTML | ✅ app.js | ✅ PRESENT |
| Feature toolbar | ✅ feature-toolbar.js | ✅ feature-toolbar.js | ✅ PRESENT |
| Channel onboarding | ✅ | ✅ | ✅ PRESENT |
| Skill forge | ✅ | ✅ | ✅ PRESENT |
| Swarm UI | ✅ | ✅ | ✅ PRESENT |

## Landing Page (landing/index.html) — Separate product page
This is a MARKETING page, not the app. Features:
- Hero with animated title
- Demo tabs (GameBoy, Cyberpunk, Executive themes)
- Features grid (4 categories)
- How it works (3 steps)
- Pricing section
- Testimonials
- Footer with links
→ KEEP as separate landing page, do NOT merge with app

## Files to DELETE from server/
- `index.html` (old root — replace with redirect/copy of office-executive)
- `exec-styles.css` (old styling, replaced by styles.css)
- `app-init.js` (3041L — merged into office-executive/app.js+main.js)
- `gateway-detect.js` (24L — merged into office-executive/app.js)
- `google-auth.js` (290L — replaced by auth.js)
- `live-agents.js` (591L — merged into office-executive/app.js)
- `mc-wiring.js` (434L — replaced by mc-core.js + mc-center.js)
- `relay-bridge.js` (771L — merged into data-bridge.js)
- `setup-wizard.js` (503L — replaced by deploy-wizard.js)
- `panel-fix.css` (19L — merged into styles.css)
- `polish.css` (146L — merged into styles.css)
- `index.html.monolith.bak` (backup — archive)

## SimCity files to DELETE
- `server/office-simcity/` (entire directory)

## SimCity refs to clean from:
- server/lib/theme-chat.js (5 lines)
- server/lib/kanban-board.js (4 lines)
- server/lib/agent-drag.js (1 line)
- server/lib/activity-bubbles.js (simcity theme object)
- server/lib/theme-customize.js (2 refs)
- server/office-executive/index.html (theme card)
- server/office-medieval/index.html (theme card)
- server/office-medieval/medieval-theme-picker.js (1 entry)

## Fake Buttons (role="button" on divs)
Files with `<div role="button">` that should be `<button>`:
- office-executive/index.html: 7 agent room divs
- office-executive/mission-desk.js: 3 generated divs
- office-executive/main.js: 2 org-card divs
→ Convert to semantic `<button>` elements
