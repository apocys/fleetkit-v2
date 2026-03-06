# SpawnKit P0 Fixes — CTAs, Cron, Memory, Comms (Design Brief)

## Scope

Implement production-ready versions of these flows without large refactors:

1. **Mission Desk Hero CTAs**
2. **Cron panel (Scheduled Jobs)**
3. **Memory panel (Fleet Memory)**
4. **CEO Communications panel**

Add:
- minimal, targeted **test coverage** for each fixed flow
- concise **documentation** of expected behavior

## Goals

- Fix the four defects identified in QA:
  1. Hero CTA click does nothing visible
  2. CEO Communications panel unreachable / stuck on "Loading targets..."
  3. Cron panel shows false empty state ("No Cron Jobs" while jobs exist)
  4. Memory panel opens with no content
- Keep implementation small and incremental
- Maintain a rollback path via Git commits

## Out of Scope

- Large redesigns of the Mission Desk layout
- Full-blown notification system
- Complex memory editing UI (read-only is enough for now)

## Implementation Strategy

### 1) Hero CTAs

**Files (expected):**
- `app/` or `src/` entry for Mission Desk UI (hero section)
- JS module that wires CTA buttons to actions (e.g., `missionDesk.js`, `main.js`)

**Behavior:**
- Each CTA injects a specific, predefined prompt into the main input ("Ask your team anything..."):
  - Analyze our roadmap → roadmap analysis prompt
  - Draft marketing plan → marketing plan prompt
  - Security audit → security/audit prompt
  - Brainstorm features → ideation prompt
- Focus the input after injection.
- Do **not** auto-send on first iteration.

**Acceptance Criteria:**
- Clicking any CTA produces visible text in the main input.
- No console errors.

---

### 2) Cron Panel (Scheduled Jobs)

**Files (expected):**
- JS file responsible for opening the Cron dialog.
- Module that fetches cron jobs from the backend or from an existing SpawnKit → OpenClaw bridge.

**Behavior:**
- When the user opens the Cron panel:
  - show `Loading cron jobs…` while fetching
  - if jobs exist: show list (name, schedule, next run, status)
  - if none: show a true empty state message
  - on error: show a non-technical error message

**Data Contract (example):**
- `{ id, name, schedule, nextRun, status }`

**Acceptance Criteria:**
- Panel no longer shows `No Cron Jobs` when jobs exist.
- Correct states for loading, empty, error.

---

### 3) Memory Panel (Fleet Memory)

**Files (expected):**
- JS module for the memory dialog.
- Data loader that returns a list of memory entries.

**Behavior:**
- When the user opens the Memory panel:
  - show a list of entries (date, title/file, snippet)
  - clicking an entry shows its content (or a larger snippet)
  - keep "Only the CEO can edit memory" as a banner, but do **not** block reading

**Acceptance Criteria:**
- Panel no longer appears as an empty shell.
- At least a minimal, accurate view of memory exists.

---

### 4) CEO Communications Panel

**Files (expected):**
- JS module for communications / mission chat.
- Data loader for targets.

**Behavior:**
- Ensure there is a clear, visible trigger to open the panel.
- Replace the permanent `Loading targets...` with:
  - real list of targets (e.g., offices, channels), **or**
  - explicit, user-friendly empty/error state.
- Ensure the dialog is actually visible (`opacity: 1`) when active.

**Acceptance Criteria:**
- User can open CEO Communications from an obvious entry point.
- Target selector is no longer stuck on `Loading targets...`.

---

### 5) Shared Panel / State Handling

**Goal:** avoid half-mounted hidden dialogs and inconsistent states.

**Actions:**
- Identify central panel/modal state logic.
- Ensure each panel uses a unified pattern:
  - `openPanel(name)`
  - `closePanel(name)`
  - state: `loading`, `loaded`, `empty`, `error` (where relevant)

---

### 6) Tests

**Files (examples):**
- `test/mission-desk-ctas.test.js`
- `test/cron-panel.test.js`
- `test/memory-panel.test.js`
- `test/communications-panel.test.js`

**Scope:**
- CTA: clicking each hero button injects expected prompt.
- Cron: panel shows jobs, empty message, or error message depending on mocked responses.
- Memory: panel lists entries and shows content; proper empty state.
- Communications: panel openability + target loading behavior.

---

### 7) Documentation

**Files:**
- `docs/` (e.g. `docs/beta-behavior.md` or update existing EXECUTIVE_PORT_SUMMARY / INTEGRATION-SUMMARY)

**Content:**
- Hero quick actions behavior.
- Cron/Memory/Communications panel behavior in beta.
- QA checklist for verifying these flows.

---

## Resilience / Rollback

- Keep changes incremental and commit in small, focused units.
- After each panel implementation, run tests and do a quick manual check.
- Use Git to provide a clear rollback point if any change misbehaves.
