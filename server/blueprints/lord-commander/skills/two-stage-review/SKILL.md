---
name: two-stage-review
description: Use when reviewing sub-agent output, completed tasks, or any code delivery before marking it done. Use after each sub-agent task in large-build workflows, after feature implementation, or before merging. Triggers on task completion, sub-agent delivery, code review requests, or QA checks.
---

# Two-Stage Review

Review every delivery twice: first for spec compliance, then for code quality. Different reviewers catch different bugs — combining them catches almost everything.

## Why Two Stages

Single-pass reviews miss things because they try to evaluate everything at once. Spec compliance and code quality are different concerns:

- **Spec review** catches: missing requirements, extra features nobody asked for, wrong behavior, interface mismatches
- **Quality review** catches: bugs, security issues, bad patterns, missing error handling, performance problems

**Order matters:** Fix spec issues FIRST. No point polishing code that does the wrong thing.

## Stage 1: Spec Compliance Review

Check the delivery against what was asked for. Nothing more, nothing less.

### Checklist

1. **Re-read the original brief/task/plan** — not from memory, actually re-read it
2. **Line-by-line requirements check:**
   - ✅ Each requirement implemented?
   - ❌ Anything missing? (under-building)
   - ⚠️ Anything extra not requested? (over-building / YAGNI violation)
3. **Interface contract check** (for sub-agents):
   - File paths match contract?
   - Function names/IDs/classes match exactly?
   - Exports/imports align with other modules?
4. **Behavior check:**
   - Does it do what was asked? (not just "does it run")
   - Edge cases from the spec handled?

### Verdicts

- **✅ Spec compliant** — all requirements met, nothing extra → proceed to Stage 2
- **❌ Spec issues** — list each gap/extra → fix BEFORE Stage 2

**Do NOT proceed to Stage 2 with open spec issues.**

## Stage 2: Code Quality Review

Only after Stage 1 passes. Now assess HOW it was built.

### Checklist

1. **Correctness** — logic bugs, off-by-ones, null handling, async issues
2. **Error handling** — what happens when things fail? Silent swallows? User-facing errors?
3. **Security** — injection, XSS, auth bypasses, secrets in code, eval()
4. **Performance** — unnecessary loops, N+1 queries, unbounded growth, missing pagination
5. **Readability** — naming, structure, comments where non-obvious
6. **Patterns** — consistent with codebase conventions? DRY? Single responsibility?
7. **Tests** — test coverage for new code? Tests actually test behavior (not mocks)?

### Severity Levels

- **🔴 Critical** — must fix now (security, data loss, crash)
- **🟡 Important** — should fix before merge (bugs, bad patterns, missing error handling)
- **🟢 Minor** — nice to have (naming, style, minor optimization)

### Verdicts

- **✅ Approved** — ship it
- **🟡 Approved with notes** — minor items, can fix later
- **❌ Changes required** — important/critical issues → fix → re-review

## Review Loops

When issues are found:

```
Stage 1: Spec issues found
  → Implementer fixes spec gaps
  → Stage 1 re-review
  → Pass? → Stage 2

Stage 2: Quality issues found  
  → Implementer fixes quality issues
  → Stage 2 re-review (only changed code)
  → Pass? → Done
```

**Never skip re-review.** "I fixed it" is not verification. Re-check the fix.

## Integration with Large Build

When using the `large-build` skill, apply two-stage review after EACH sub-agent delivers:

```
Sub-agent delivers files
  → Stage 1: Do files match the brief + interface contract?
  → Fix any spec issues
  → Stage 2: Is the code quality acceptable?
  → Fix any quality issues
  → Mark task complete
  → Next sub-agent
```

After ALL sub-agents complete:
- **Final integration review** — do all modules work together?
- Check interface boundaries, data flow between modules, CSS conflicts

## For Self-Review (when no separate reviewer)

Same two stages, but be honest:

1. Re-read the original task (don't trust memory)
2. Diff your changes against the task requirements
3. Actually run the code and verify behavior
4. Check your own code for quality issues

**The hardest part of self-review:** admitting your own code has spec gaps. Force yourself to find at least one thing to improve.

## Anti-Patterns

| Anti-Pattern | Why It Fails | Instead |
|---|---|---|
| Single-pass review | Mixes concerns, misses things | Two stages: spec then quality |
| Quality review before spec | Polishing wrong code | Always spec first |
| Skipping re-review after fix | "I fixed it" ≠ verified | Re-review every fix |
| Performative approval | "Looks great!" teaches nothing | Specific technical feedback |
| Over-building approved | Extra features = extra bugs | YAGNI: flag anything not in spec |
| Accepting "close enough" | Spec gaps compound | Exact compliance or documented deviation |

## Quick Reference

| Stage | Focus | Key Question | Gate |
|-------|-------|-------------|------|
| 1. Spec | What was built | Does it match what was asked? | All requirements met, nothing extra |
| 2. Quality | How it was built | Is it well-built? | No critical/important issues |
