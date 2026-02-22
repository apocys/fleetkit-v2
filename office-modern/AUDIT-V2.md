# Office-Modern v2 — Sentinel Audit

**Date:** 2026-02-21 21:20 CET  
**Auditor:** Sentinel  
**Previous grade:** D+ (v1)  
**Method:** Screenshot + pixel-level canvas sampling (image model unavailable, compensated with programmatic color analysis across 12+ regions)

---

## Checklist (10 items)

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | Walls SOLID (rb c14-16 r0-3) | ✅ PASS | Wall face/baseboard = `rgb(248,248,248)` — solid white, not wireframes. 4-row structure (cap/face/baseboard/shadow) verified. |
| 2 | Desks recognizable brown (off r0-r3 c0-c2) | ✅ PASS | CEO desk avg `rgb(190,169,140)` dominant BROWN. Workspace desks dominant color `200,180,140` (42%). Conference table avg `rgb(186,143,114)` = warm brown (60% at `200,140,80`). |
| 3 | Chairs visible (int r44-47) | ⚠️ PARTIAL | Meeting chairs render at `rgb(171,171,188)` — blue-grey lavender tones. They exist (168 unique colors in region) but blend into the purple carpet floor. Not invisible dots, but low contrast. |
| 4 | No pink bed tiles | ✅ PASS | Full-canvas scan at 20px intervals: `pinkBedTilesFound = false`. Zero pink pixels anywhere. |
| 5 | Monitors are dark screens (off r8-9) | ⚠️ PARTIAL | Workspace monitors avg `rgb(133,141,167)` — blue-tinted but not convincingly dark. Dominant bucket is `160,180,200` (54%). CEO monitor darker at avg `rgb(135,124,121)`. Visible but look more like light screens than dark ones. |
| 6 | Plants green, 3 tiles tall | ✅ PASS | Meeting-left plant dominant GREEN (17% at `220,260,180`). CEO plant strongly GREEN at avg `rgb(175,206,189)` with 38% at `180,260,240`. All plants 3 tiles tall in code. |
| 7 | Glass partitions reasonable | ✅ PASS | 119 unique colors in glass region. Blue-grey semi-transparent (`rgb(117,125,148)`) with visible frame bars. Not raw fillRect — proper layered rendering with highlight lines. |
| 8 | Room labels readable (opacity 0.4) | ✅ PASS | Labels drawn with bold 16px Courier + rgba shadow + 0.4 opacity text. 5 labels: RÉUNION, CEO, SERVEURS, DÉTENTE, ACCUEIL. Code verified. |
| 9 | Background warm brown (#1e1a16) | ✅ PASS | CSS body + canvas fill = `rgb(30,26,22)` = `#1e1a16`. Confirmed at exposed edges (left/right walls). Not cold navy. |
| 10 | Density 70%+ | ✅ PASS | Programmatic density scan: **97%** non-background pixels. Massively furnished. |

**Score: 8/10 full pass, 2 partial**

---

## Grade: **B+**

Massive improvement from D+. The scene reads as a furnished, lived-in office. Walls are solid, desks are brown, plants are green, no pink bugs, warm background, great density.

**Would I ship this? YES** — with minor polish notes below.

---

## Top 3 Remaining Issues

1. **Chair visibility (low priority):** Meeting chairs (int r44-47) render in lavender/blue-grey that's nearly the same value as the purple meeting room carpet. Consider using a contrasting chair variant or adding a darker outline/shadow beneath chairs to pop them off the floor.

2. **Monitor darkness:** Workspace monitors read as light blue-grey (`avg 133,141,167`) rather than convincingly dark screens. The sprite tiles at off r8-9 may need a darker row, or a dark tinted overlay could help simulate powered-off/dark screens. CEO monitors are marginally better.

3. **Meeting-room right plant ambiguity:** Plant at x=9 averages BLUE dominant (`rgb(172,175,182)`) vs. clearly GREEN for other plants. The int c4 variant may have less green saturation than c1. Minor — only one of ~8 plants is affected.

---

## What Went Right (vs v1)

- Solid walls instead of wireframe outlines — night and day difference
- Brown desks are clearly identifiable furniture pieces
- 97% density (was sparse before)
- Warm brown background sets the right mood
- Glass partitions look professional (layered transparency + highlights)
- Server room has distinct dark concrete floor + filing cabinets
- Agent characters animate and patrol with name tags
- HUD bar renders cleanly with live clock
- No console errors, all 16 sprites loaded
