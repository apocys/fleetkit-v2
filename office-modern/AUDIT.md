# 🔥 SENTINEL AUDIT — Office Modern Theme
**Date:** 2026-02-21 20:46 CET  
**Auditor:** Sentinel  
**Version audited:** Current `index.html` (597 lines, single-file canvas app)  
**Steve Jobs test:** ❌ **Would not ship.**

---

## OVERALL GRADE: D+

The concept is there. The architecture is sound. But the execution is visually sloppy — the theme looks like a *first draft prototype* rather than a polished pixel art scene. The fundamental problem: **sprite coordinates are largely guessed**, resulting in wrong furniture, mismatched tiles, and a scene that bears only a passing resemblance to the LimeZu reference designs.

---

## 1. FIDÉLITÉ VISUELLE — Grade: D

### Walls
| Aspect | Status | Details |
|--------|--------|---------|
| Wall structure | ⚠️ Partially correct | Uses ORB rows 0-3 (cap/face/baseboard/shadow) — correct 4-row structure |
| Wall tile selection | ❌ Wrong | Code alternates c1-2/c3-4 pairs but c0 is empty, c1-2 are only ~96px filled (partial tiles). The references show FULL solid wall tiles with clear face coloring |
| Side walls | ❌ Wrong | Uses c7/c9 r1 which are partial tiles (112px filled) — looks like thin strips, not proper vertical wall edges |
| Bottom wall | ⚠️ Weak | Only draws baseboard row (r2) — no face, no cap. Should be a proper wall or at minimum a consistent baseboard |
| Internal walls | ❌ Missing proper structure | Internal dividers only draw r2 (baseboard) — they should have face+baseboard at minimum |

**Reference comparison:** In LimeZu designs, walls are clearly 3-4 tiles high with distinct cap (top molding), face (main wall surface ~2 rows), baseboard (bottom trim), and shadow cast on floor. Our render has thin, partially transparent wall segments that look like wireframes, not walls.

### Floors
| Aspect | Status | Details |
|--------|--------|---------|
| Grey carpet (type 1) | ✅ Correct tiles | RB rows 17-18, cols 0-1 alternating — these ARE real carpet tiles with purple-blue tint ~(169,171,184) |
| Wood floor (type 2) | ⚠️ Wrong rows | RB rows 7-8 cols 0-1 — these are YELLOW wood tiles ~(207,196,160). References show warmer brown wood. Should likely be rows 9-10 or the brown wood from another section |
| Light tile (type 3) | ⚠️ Questionable | RB rows 19-20 — these are beige/tan tiles ~(180,178,173). Acceptable for break area |
| Office carpet (type 4) | ✅ OK | ORB rows 5-6 — purple-tinted carpet ~(188,185,201). Matches office aesthetic |
| Floor pattern | ⚠️ Simplistic | Only uses 2-tile repeat (cx=x%2, cy=y%2). References show richer patterns with more variation |

**Key issue:** The code only uses cols 0-1 (even/odd x) for floor tiles, but some floor types use cols 0-3 for a 2×2 repeating pattern with 4 variants. The 2-tile-wide pattern is correct for some tile sets but too simplistic for others.

### Furniture
| Piece | Status | Details |
|-------|--------|---------|
| CEO desk | ⚠️ Partially wrong | O rows 0-2, cols 0-2 — the top row (r0) has only 112px/256px filled. These look like desk parts but arrangement may not match the spritesheet's intended layout |
| Monitors | ❌ Likely wrong | O row 8 cols 0-1 — only ~89-92px filled. These are small partial sprites, not full monitors. The reference shows prominent dual monitors |
| Office desks | ⚠️ Uncertain | O rows 4-6 cols 4-5 — c4 is wood-colored (182,168,145), c5 is purple-tinted (185,179,196). Seems like desk+divider tiles, plausible |
| Conference table | ❌ Wrong size | Code draws 5 tiles wide using I rows 10-11 cols (dx-3)%4 — but r10 has multiple table styles side by side. Col 0 is a narrow side (42px), cols 1-2 are full (240px), col 3 is narrow again. The code wraps around with modulo creating random-looking tiles |
| Chairs | ❌ Very wrong | I rows 4-5 cols 0-1 — col 0 has only 21px filled (tiny fragment), col 1 has 32px. These are NOT chair sprites. They're tiny decorative elements. Real chairs should be larger sprites |
| Whiteboard | ⚠️ Misidentified | I rows 28-29 cols 5-7 — these are pink/skin-colored (~198,182,184). This is probably a bed or fabric furniture, NOT a whiteboard |
| Bookshelf | ✅ Plausible | I rows 14-15 cols 0-1 — dark objects (~103-124 grey). Could be shelf/cabinet tops |
| Sofa | ⚠️ Wrong tiles | I rows 4-5 cols 9-11 — c9 is very light (221,214,208) and c10 has only 21px. This doesn't form a convincing sofa |
| Server racks | ❌ Wrong coordinates | O rows 14-17 — r14 c0 has only 33px. These are mostly empty or tiny fragments, not full server racks |
| Filing cabinet | ❌ Wrong | O rows 40-42 — r40 c0 exists (107,107,110 grey) but r41 and r42 are EMPTY. Drawing 3 rows where 2 are empty |
| Coffee area | ⚠️ Partial | I rows 24-25 — small teal elements (~80-107 px), looks like tiny kitchen items not full counter |
| Plants | ✅ OK | Various plant sprites from I rows 0-2 — these work. Real sprites, varied colors |

### Ambiance
**Reference:** Warm, detailed, lived-in office with clear rooms, properly placed furniture forming recognizable workspaces. Characters at desks, clear pathways.  
**Our render:** Dark background with floating tile rectangles, thin wire-like walls, scattered sprite fragments that vaguely suggest furniture. It looks more like a debug visualization than a finished scene.

---

## 2. PERSONNAGES — Grade: B

### Animations
| Aspect | Status |
|--------|--------|
| Frame extraction | ✅ Correct — 24 frames = 4 dirs × 6 frames per direction |
| Directional movement | ✅ Correct — dir*FPD + af%FPD properly indexes |
| Sit animations | ✅ Available for Adam, Alex, Bob (sit spritesheets present) |
| Phone animation | ✅ Adam phone: 9 frames, correctly handled |
| Walk interpolation | ✅ Smooth path lerp with direction detection |

### Character Assignment
| Agent | Sprite | State | Tint | Issues |
|-------|--------|-------|------|--------|
| ApoMac | Adam | sit | None | ✅ Clean |
| Forge | Alex | sit | None | ✅ Clean |
| Hunter | Amelia | walk | None | ✅ Clean — has path loop |
| Atlas | Bob | sit | None | ✅ Clean |
| Echo | Adam | phone | (249,226,175) | ⚠️ Reuses Adam — could clash visually with ApoMac |
| Sentinel | Alex | idle | (166,227,161) | ⚠️ Reuses Alex — could clash with Forge |

### Tinting
- **Method:** Canvas overlay with `source-atop` at 25% opacity — clean approach
- **Cache:** Properly cached by img.src+tint key — good for performance
- **Issue:** 25% opacity tint is very subtle. At pixel scale it's barely noticeable. Echo (yellow tint on Adam) and ApoMac (no tint, also Adam) might look identical at a glance.

### Name Tags & Status Dots
- Name tags with shadow: ✅ Clean implementation
- Status dots (always green): ⚠️ Every agent shows green dot regardless of actual status. Should vary by state.

---

## 3. LAYOUT / UX — Grade: C+

### Room Zones
| Zone | Coords | Tiles | Status |
|------|--------|-------|--------|
| Meeting room | x:1-9, y:4-9 | 9×6 = 54 | ✅ Reasonable size |
| CEO office | x:20-28, y:4-9 | 9×6 = 54 | ✅ Reasonable |
| Open workspace | x:10-19, y:4-13 | 10×10 = 100 | ✅ Good central area |
| Server room | x:1-6, y:15-20 | 6×6 = 36 | ✅ OK |
| Break area | x:22-28, y:15-20 | 7×6 = 42 | ✅ OK |
| Reception | x:7-21, y:15-20 | 15×6 = 90 | ✅ Good |

### Issues
- **No corridors visible** — rooms bleed into each other with only thin glass lines separating them
- **Glass partitions are CSS-drawn rectangles** — not sprites. They're 2px wide semi-transparent fills, not proper glass wall sprites from the spritesheet
- **No doors** — the CEO "door gap" is just a slightly less-opaque rectangle
- **Y gap between upper and lower zones** (y:10-14) — the open workspace spans it but it creates an awkward transition
- **Room labels are very faint** (0.2 opacity) — barely readable, which is actually fine for ambient

### Proportions
- 30×22 tile grid at 16px scale = 480×352 native → scaled 2× = 960×704 canvas
- This is a reasonable office size but **small compared to reference design 2** which shows a much larger multi-room layout
- Agent positions are well-placed within rooms ✅

---

## 4. CODE QUALITÉ — Grade: C+

### ❌ Critical: Guessed Sprite Coordinates
The BIGGEST problem in the codebase. Almost every furniture piece uses coordinates that were clearly guessed without verifying the spritesheet layout:
- `dt(I, 0, 4, ...)` for "chairs" — row 4 col 0 has 21px filled. That's a tiny dot, not a chair.
- `dt(O, 0, 14, ...)` for "server racks" — row 14 col 0 has 33px. Barely visible.
- `dt(O, 0, 40, ...)` for "filing cabinet" — rows 41-42 are EMPTY.
- `dt(I, 5, 28, ...)` for "whiteboard" — these are pink/skin-colored tiles.

**This is the root cause of why the render looks wrong.** Someone needs to open each spritesheet in an image editor, identify the correct tile coordinates, and fix every single `dt()` call.

### ⚠️ Colored Rectangle Fallbacks
- **Glass walls**: Drawn as `ctx.fillRect()` with semi-transparent colors — NOT sprites
- **HUD bar**: CSS-drawn rectangle — acceptable for UI
- **No visible colored rectangles for floors/walls** — at least these use actual sprites ✅

### ✅ Performance
- Single canvas, `requestAnimationFrame` loop
- `image-rendering: pixelated` properly set
- Tint cache prevents re-creation
- Animation tick divisor (AS=10) reduces frame updates
- Should easily hit 60fps ✅

### ⚠️ Code Organization
- 597 lines single file — manageable but getting large
- No constants for sprite coordinates — magic numbers everywhere
- No sprite map/atlas definition — each `dt()` call hardcodes row/col
- Floor map uses fill() regions — clear and correct

### ✅ PostMessage API
- Proper `fleetkit:getState` / `fleetkit:update` message handling
- 5-second state broadcast interval
- Clean agent data structure

---

## 5. COMPARAISON DIRECTE — Reference vs. Render

### Visual Comparison Summary

| Aspect | Reference (LimeZu) | Our Render | Gap |
|--------|-------------------|------------|-----|
| Walls | Thick, solid, 3-4 tile layers with shading | Thin, partially-filled tiles | 🔴 HUGE |
| Floor | Rich patterns, warm colors, clear tile boundaries | Correct tiles but limited variety | 🟡 Medium |
| Desks | Clearly recognizable office desks with monitors | Vague brown/purple tile clusters | 🔴 HUGE |
| Chairs | Distinct chairs at desks, proper facing | Nearly invisible tiny pixel dots | 🔴 HUGE |
| Room dividers | Glass walls with visible frame structure | 2px semi-transparent lines | 🔴 Large |
| Plants | Lush, detailed potted plants | ✅ Actual plant sprites — these work | 🟢 Small |
| Characters | Crisp pixel art with animations | ✅ Correct sprites, clean animation | 🟢 Small |
| Lighting | Warm ambient, clear ceiling lights | Dark background, barely visible lamps | 🟡 Medium |
| Server room | Visible rack equipment, blinking lights | Tiny fragments, barely recognizable | 🔴 HUGE |
| Overall feel | Cozy, detailed, professional office | Sparse, dark, unfinished prototype | 🔴 HUGE |

---

## GRADES SUMMARY

| Criterion | Grade | Weight | Comment |
|-----------|-------|--------|---------|
| 1. Fidélité visuelle | **D** | 35% | Wrong sprite coords kill the visual quality |
| 2. Personnages | **B** | 20% | Animations work, tinting is subtle but functional |
| 3. Layout / UX | **C+** | 15% | Room zones are logical, glass walls are fake |
| 4. Code qualité | **C+** | 15% | Clean architecture, terrible sprite mapping |
| 5. Comparaison directe | **D** | 15% | Does not match references |
| **WEIGHTED TOTAL** | **D+** | | |

---

## 🔧 RECOMMENDATIONS (Priority Order)

### P0 — Must Fix (Blocks Shipping)

1. **🎨 SPRITE AUDIT** — Open EVERY spritesheet in Aseprite/image editor. Document the EXACT row/col for each furniture piece. The current coordinates are guesswork. This is a ~2h manual task but it's the ONLY way to fix the visual quality.

2. **🧱 WALL RECONSTRUCTION** — The wall drawing needs a complete rewrite:
   - Use ORB properly: rows 0-3 for horizontal walls, dedicated side wall tiles for vertical walls
   - Internal walls need proper face + baseboard (not just baseboard)
   - Verify which ORB columns are the correct wall pairs (currently c1-4 are partially transparent)

3. **🪟 GLASS WALLS** — Replace `fillRect()` glass with actual glass partition sprites from the Modern Office spritesheet. Look in the office singles folder for glass wall tiles.

4. **🪑 FURNITURE OVERHAUL** — Every furniture `dt()` call needs verified coordinates:
   - Conference table: identify correct cols in Interiors r10-11
   - Chairs: find actual chair sprites (current r4-5 c0-1 are wrong)
   - Monitors: find proper monitor sprites in Office sheet
   - Server racks: find actual rack sprites (current r14 has tiny fragments)
   - Filing cabinet: r41-42 are EMPTY, drawing nothing

### P1 — Should Fix

5. **🎭 TINT VISIBILITY** — Increase tint opacity from 25% to 35-40% so Echo and Sentinel are visually distinct from their base character counterparts.

6. **🚪 DOORS** — Add actual door sprites at room entrances instead of opacity gaps.

7. **💡 LIGHTING** — The dark background (#1a1a2e) is too harsh. References show warmer, lighter tones. Consider adding ambient light overlay or using lighter void color.

8. **🟢 STATUS DOTS** — Make status dot color vary: green=active, yellow=phone, blue=walking, grey=idle.

### P2 — Nice to Have

9. **📐 Larger Grid** — Consider 40×28 or larger to match reference design 2's spaciousness.

10. **🎵 Ambient Details** — Add subtle details: papers on desks, coffee cups, wall art, clocks, etc.

11. **📋 Sprite Map Constants** — Define a `SPRITES` constant mapping furniture names to {sheet, row, col, w, h} for maintainability.

---

## VERDICT

> "This has the skeleton of a good product but the skin of a prototype. The architecture (canvas, postMessage API, animation system, character handling) is solid B+ work. But the visual layer — which is *the entire point* of a pixel art theme — is D-tier because every furniture coordinate was guessed instead of verified. You cannot ship pixel art where the chairs are 21-pixel dots and the server racks are invisible."
>
> **Fix the sprite coordinates, fix the walls, and this becomes a B+. Ship it as-is and it's embarrassing.**

— Sentinel 🛡️
