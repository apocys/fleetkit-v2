---
name: verify-before-done
description: Use when about to claim work is complete, fixed, passing, or ready. Use before committing, creating PRs, marking tasks done, or telling Kira something works. Triggers on any completion claim — "done", "fixed", "tests pass", "deployed", "working now", or any positive status assertion.
---

# Verify Before Done

Evidence before claims, always. Claiming work is complete without verification is dishonesty, not efficiency.

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the verification command IN THIS RESPONSE, you cannot claim it passes.

## The Gate (apply before EVERY completion claim)

```
1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, not cached)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output actually confirm the claim?
   - NO → State actual status with evidence
   - YES → State claim WITH evidence (paste output)
5. ONLY THEN: Make the claim
```

Skip any step = lying, not verifying.

## What Requires Verification

| Claim | Requires | NOT Sufficient |
|-------|----------|----------------|
| "Tests pass" | Test command output: 0 failures | Previous run, "should pass" |
| "Build succeeds" | Build command: exit 0 | "Linter passed" |
| "Bug fixed" | Reproduce original symptom: passes | "Code changed, should work" |
| "Deployed" | curl/browser confirms live | "git push succeeded" |
| "Sub-agent completed" | Check diff/output yourself | Agent's "success" report |
| "Requirements met" | Line-by-line checklist with evidence | "Tests passing" |

## Red Flags — STOP and Verify

If you catch yourself:
- Using "should", "probably", "seems to", "looks correct"
- Saying "Great!", "Perfect!", "Done!" before running verification
- About to commit/push without testing
- Trusting a sub-agent's success report without checking
- Relying on partial verification ("linter passed" ≠ "builds")
- Thinking "just this once"

**ALL of these mean: STOP. Run the command. Paste the output. THEN claim.**

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Should work now" | RUN the verification |
| "I'm confident" | Confidence ≠ evidence |
| "Just this once" | No exceptions |
| "Linter passed" | Linter ≠ compiler ≠ tests ≠ works |
| "Agent said success" | Verify independently |
| "Partial check is enough" | Partial proves nothing |
| "I already manually tested" | Show the output or it didn't happen |

## Correct Patterns

```
✅ [Run test] → [See: 34/34 pass] → "All tests pass"
❌ "Should pass now" / "Looks correct"

✅ [curl endpoint] → [See: 200 OK] → "Deployed and responding"  
❌ "Pushed to git, should be live"

✅ [Check sub-agent diff] → [Verify files exist] → "Sub-agent delivered"
❌ "Sub-agent said it's done"

✅ Re-read requirements → checklist each → evidence per item → "Complete"
❌ "Tests pass, so requirements are met"
```

## When to Apply

**ALWAYS before:**
- Any variation of success/completion/done/fixed/working
- Any expression of satisfaction about work state
- Committing, pushing, PRs, task completion
- Moving to next task
- Reporting status to Kira
- Delegating to sub-agents and trusting their report

**The Bottom Line:** Run the command. Read the output. THEN claim the result. Non-negotiable.
