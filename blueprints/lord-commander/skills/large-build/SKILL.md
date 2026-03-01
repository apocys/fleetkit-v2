---
name: large-build
description: Build large codebases using modular sub-agent orchestration. Use when the task involves creating or refactoring 500+ lines of code, multi-file projects, full-stack apps, or any task that would exceed a single agent's output token limit. Triggers on requests like "build an app", "create a full project", "implement all screens", "scaffold the backend", or any multi-file code generation task.
---

# Large Build — Modular Sub-Agent Orchestration

Build large projects by splitting work into small, independent sub-agent tasks that can't stall.

## Core Problem

Single-agent builds stall when output exceeds ~4000 lines. The agent hits the output token limit mid-write and produces nothing. This wastes time, tokens, and context.

## The Pattern

### 1. Decompose Before Building

Before spawning any sub-agent, decompose the project into modules:

- Each module = 1-4 files, max ~250 lines per file
- Each module must be independently writable (no circular dependencies)
- Define the interface contract between modules upfront (function names, exports, DOM IDs, class names)

**Write the interface contract first.** This is the single most important step. If module A renders `<div id="panel-home">` and module B looks for `#home`, everything breaks. Define shared selectors, function signatures, event names, and data shapes in a contract document before any sub-agent starts.

### 2. Spawn Small, Parallel Sub-Agents

Each sub-agent gets:
- **Exact file paths** to write
- **Exact function/class/ID names** to use (from the contract)
- **Max 4 files** per sub-agent
- **Max ~250 lines** per file (with allowance for embedded styles up to ~350)
- **No dependencies on other sub-agents' output** — each must be self-contained

Spawn independent sub-agents in parallel. Wait for all to complete.

### 3. Monitor for Stalls

Set up a stall detector (cron or manual check):
- Check sub-agent transcript file sizes every 5 minutes
- If a transcript hasn't grown in 5+ minutes → stalled
- Kill and respawn stalled agents with the same task
- Common stall cause: task too large → split further

### 4. Two-Stage Review (per sub-agent)

After EACH sub-agent delivers, apply the `two-stage-review` skill:
1. **Stage 1 — Spec compliance:** Does output match the brief + interface contract exactly? Missing requirements? Extra features?
2. **Stage 2 — Code quality:** Bugs, security, error handling, patterns? (Only after Stage 1 passes)
3. Fix issues before moving to next sub-agent. Re-review fixes.

### 5. Integration Pass

After all sub-agents deliver and pass review:
1. Verify all files exist and are non-empty
2. Check for interface mismatches (CSS class names vs JS, HTML IDs vs selectors)
3. Test in browser/runtime
4. Fix integration bugs yourself (don't spawn for small fixes)

### 6. Commit Incrementally

Don't wait for everything to be perfect. Commit after each working milestone:
- Scaffold committed → screens committed → CSS committed → integration fixes committed

## Sub-Agent Brief Template

Use this structure for every sub-agent task:

```
Write [N] files to [path]:

## Files to create
1. `filename.js` (~150 lines) — [description]
2. `filename2.js` (~200 lines) — [description]

## Interface contract
- Panel IDs: `#panel-[name]` (must match exactly)
- Global functions: `ScreenName.render()`, `ScreenName.show(id)`
- Events: listens to `panelActivated` with `detail.tab === '[name]'`
- Store API: `Store.getMemories()`, `Store.saveMemory(m)`
- CSS: self-contained via embedded <style> blocks OR uses classes from shared stylesheet

## Design system
- [Colors, fonts, spacing — copy from project]
- [Component patterns — describe what a card/button/input looks like]

## What NOT to do
- Do not modify files outside your scope
- Do not exceed 250 lines per file
- Do not use classes/IDs not in the contract
```

## Anti-Patterns

| Anti-Pattern | Why It Fails | Instead |
|---|---|---|
| One sub-agent writes 4000+ lines | Hits output token limit, produces nothing | Split into 4+ sub-agents |
| Vague brief ("build the frontend") | Agent makes wrong assumptions about IDs, names, structure | Exact file paths + interface contract |
| Sub-agents depend on each other's output | Must run sequentially, stalls cascade | Make each fully independent |
| No stall monitoring | Dead agent wastes 10+ minutes unnoticed | Check transcripts every 5 min |
| Waiting for perfection before committing | Loses work if context overflows | Commit each working milestone |
| Resuming stalled agents | Resume doesn't exist for sub-agents | Kill and respawn |

## Stall Detector Setup

Add a cron job to monitor active sub-agents:

```
Schedule: every 5 minutes
Payload: "Look at active sub-agents. For each, check if their transcript 
file has grown in the last 5 minutes. If stalled, report which ones."
```

## When to Use This Skill

- Creating a new app with 5+ files
- Refactoring a monolithic file into modules  
- Building full-stack features (API + frontend + tests)
- Any code generation task estimated at 500+ total lines
- When a previous single-agent attempt stalled or produced incomplete output

## When NOT to Use

- Small edits (< 200 lines total)
- Single-file changes
- Bug fixes
- Config changes
