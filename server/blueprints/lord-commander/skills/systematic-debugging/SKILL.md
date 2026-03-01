---
name: systematic-debugging
description: Use when encountering any bug, test failure, unexpected behavior, or when a fix attempt has already failed. Use ESPECIALLY when under time pressure or when "just try this" feels tempting. Triggers on errors, stack traces, broken builds, flaky tests, or any technical issue before proposing fixes.
---

# Systematic Debugging

Find root cause before attempting fixes. Random patches waste time and create new bugs.

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you haven't completed Phase 1, you cannot propose fixes.

## Four Phases

### Phase 1: Root Cause Investigation

**BEFORE attempting ANY fix:**

1. **Read error messages carefully** — full stack traces, line numbers, error codes. Don't skip.
2. **Reproduce consistently** — exact steps, every time. If not reproducible → gather more data, don't guess.
3. **Check recent changes** — `git diff`, recent commits, new deps, config changes.
4. **Trace data flow** — Where does the bad value originate? Trace backward through call stack to source. Fix at source, not symptom.
5. **Multi-component systems** — Add diagnostic logging at EACH component boundary. Run once to gather evidence showing WHERE it breaks. THEN investigate that specific component.

### Phase 2: Pattern Analysis

1. **Find working examples** — locate similar working code in same codebase.
2. **Compare** — what's different between working and broken? List every difference.
3. **Understand dependencies** — what settings, config, environment does it need?

### Phase 3: Hypothesis & Test

1. **Form single hypothesis** — "I think X is the root cause because Y"
2. **Test minimally** — smallest possible change, one variable at a time
3. **Verify** — worked? → Phase 4. Didn't? → new hypothesis. DON'T stack fixes.

### Phase 4: Implementation

1. **Create failing test** (if applicable) reproducing the bug
2. **Implement single fix** addressing root cause — ONE change, no "while I'm here" improvements
3. **Verify fix** — run the command, show the output, confirm green

## The 3-Strike Rule

**If 3+ fixes have failed: STOP.**

Each fix revealing new problems in different places = architectural issue, not a bug.

**Action:** Stop fixing. Question the architecture. Discuss with Kira before attempting more.

This is NOT a failed hypothesis — this is a wrong design.

## Red Flags — STOP and Return to Phase 1

If you catch yourself thinking:
- "Quick fix for now, investigate later"
- "Just try changing X and see"
- "I don't fully understand but this might work"
- "It's probably X, let me fix that"
- "One more fix attempt" (when already tried 2+)
- Proposing solutions before tracing data flow

**ALL of these mean: STOP. Return to Phase 1.**

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Issue is simple, don't need process" | Simple issues have root causes too. Process is fast for simple bugs. |
| "Emergency, no time" | Systematic is FASTER than guess-and-check thrashing. |
| "Just try this first" | First fix sets the pattern. Do it right from start. |
| "I see the problem, let me fix it" | Seeing symptoms ≠ understanding root cause. |
| "One more fix attempt" (after 2+ fails) | 3+ failures = architectural problem. Stop. |

## When to Use

**Always** for: test failures, production bugs, unexpected behavior, build failures, performance issues.

**Especially** when: under time pressure, "obvious" fix seems tempting, previous fix didn't work, you've tried multiple fixes already.

## Quick Reference

| Phase | Key Activity | Success Criteria |
|-------|-------------|------------------|
| 1. Root Cause | Read errors, reproduce, trace data | Understand WHAT and WHY |
| 2. Pattern | Find working examples, compare | Identify differences |
| 3. Hypothesis | Form theory, test minimally | Confirmed or new hypothesis |
| 4. Implementation | Fix root cause, verify | Bug resolved, evidence shown |
