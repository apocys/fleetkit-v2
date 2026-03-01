# Lessons Learned — Real Cases

## Case: Remember App (Feb 2026)

### Attempt 1: Single Agent, Monolithic Build
- **Task:** Build 14-screen web app as one index.html (~4000 lines)
- **Result:** Agent stalled at 50 minutes, zero output. Hit output token limit mid-write.
- **Wasted:** 50 minutes, ~100k tokens

### Attempt 2: Modular Architecture, No Interface Contract
- **Task:** Split into shell (index.html) + 14 JS modules, spawned 3 sub-agents
- **Result:** All files delivered, but app rendered blank. HTML used `id="splash"` while JS expected `#splash-screen`. CSS had `.polaroid-card` while JS rendered `.polaroid`. ~270 class name mismatches.
- **Root cause:** Each sub-agent invented its own naming conventions. No shared contract.
- **Fix time:** 2 hours of manual integration debugging

### Attempt 3: Modular + Contract (What Worked)
- **Pattern:** Interface contract defined first → sub-agents given exact IDs/classes/events → 7 of 12 screens self-styled with embedded CSS → integration bugs caught and fixed in 30 minutes
- **Result:** All 12 screens working, committed, deployed

### Key Insight
The interface contract is worth more than all the code. 10 minutes defining shared names saves 2+ hours of integration debugging.

## Sizing Guidelines (Empirical)

| Output Size | Approach | Success Rate |
|---|---|---|
| < 200 lines | Write directly (no sub-agent) | ~99% |
| 200-500 lines | Single sub-agent | ~90% |
| 500-1500 lines | 2-3 sub-agents with contract | ~85% |
| 1500-4000 lines | 4-8 sub-agents with contract | ~80% |
| 4000+ lines | Must split, no exceptions | 0% if attempted as one |

## Self-Styling Pattern

When building modular UI apps, screens that embed their own `<style>` blocks are more resilient than depending on a shared stylesheet. The shared CSS only needs to cover:
- Base reset, variables, fonts, keyframes
- Layout scaffolding (screen transitions, nav, panels, overlays)
- Shared components (buttons, inputs, empty states)

Screen-specific styles (timeline dots, settings toggles, chat bubbles) belong in the screen module itself.
