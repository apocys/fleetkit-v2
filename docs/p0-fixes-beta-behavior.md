# P0 Fixes — Beta Behavior Reference

> Implemented 2026-03-03. Covers Hero CTAs, Cron panel, Memory panel, CEO Communications.

## 1. Hero Quick Actions (CTA Chips)

**Location:** Mission Desk hero section, below the main input.

**Behavior:**
- 4 suggestion chips: Analyze roadmap, Draft marketing plan, Security audit, Brainstorm features
- Clicking a chip **injects the prompt text** into the main input ("Ask your team anything...")
- The input receives focus so the user can review/edit the text
- The send button becomes visible (via input event dispatch)
- The message is **not auto-sent** — the user must press Enter or click Send

**Why:** Lets users preview and modify the suggested prompt before committing.

## 2. Cron Panel (Scheduled Jobs)

**Trigger:** Click the Cron/Calendar button in the office grid, or via the API.

**Behavior:**
- Shows "Loading cron jobs..." while fetching data
- Data source fallback chain (first match wins):
  1. HTTP fetch to `/api/oc/crons` (relay bridge)
  2. Cached `liveCronData` (from prefetch)
  3. `SpawnKit.data.crons` (direct data-bridge)
  4. `API.getCrons()` (API bridge method)
- If jobs exist: displays grouped by owner, with name, schedule (human-readable), next run, status, and toggle
- If truly empty: shows "No Cron Jobs" with helpful message
- On error: silently falls through to next fallback

**Data shape per job:** `{ id, name, schedule, enabled, owner, state: { nextRunAtMs, lastRunAtMs } }`

## 3. Memory Panel (Fleet Memory)

**Trigger:** Click the Memory button in the office grid.

**Behavior:**
- Shows "Loading memory..." while fetching
- Data source fallback chain:
  1. Cached `liveMemoryData` (from prefetch)
  2. `API.getMemory()` (API bridge)
  3. `SpawnKit.data.memory` (direct data-bridge)
  4. HTTP fetch to `/api/oc/memory` (relay bridge)
- Displays: Golden Rules (from MEMORY.md), full MEMORY.md content (truncated at 3KB), daily notes list, heartbeat state
- Read-only: banner at bottom says "Only the CEO can edit memory"
- If no data: shows "No Memory Data" with guidance

## 4. CEO Communications Panel

**Triggers:**
- "Communications" quick-action button on Mission Desk (new)
- Mailbox button on CEO Room card in grid view (existing)

**Behavior:**
- Panel opens with full opacity and pointer events (CSS `.mailbox-overlay.open`)
- 3 tabs: Chat, Messages, Activity
- **Target selector** (chat tab): populated eagerly on panel open from `SpawnKit.data.agents` or hardcoded defaults; no longer stuck on "Loading targets..."
- Default tab when opened from Mission Desk: Messages

## QA Checklist

- [ ] Click each CTA chip — text appears in input, input is focused, message NOT sent
- [ ] Press Enter after chip injection — message sends correctly
- [ ] Open Cron panel — see "Loading..." then real jobs (or correct empty state)
- [ ] Open Memory panel — see "Loading..." then MEMORY.md content and daily notes
- [ ] Memory panel shows "Only the CEO can edit memory" banner
- [ ] Click Communications button on Mission Desk — panel opens, visible
- [ ] Chat tab target selector shows real agents (not "Loading targets...")
- [ ] No console errors during any of the above flows
- [ ] Run `node test/p0-fixes.test.js` — all tests pass
