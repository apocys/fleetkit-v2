# 🎨 Design Review — Office Modern Theme (SpawnKit)

**Reviewer:** UX Design Lead + Game Designer  
**Date:** 2026-02-21  
**Version reviewed:** `office-modern/index.html` (canvas-based, ~600 LOC)  
**References:** LimeZu Modern Office Revamped (Design 1, Design 2, Video)

---

## 📊 Summary Scorecard

| Aspect | Grade | Notes |
|---|---|---|
| **UX Design** | C+ | Layout readable but lacks guidance; HUD is minimal |
| **Game Design** | D+ | Very little "life"; only 1 walking agent, no ambient animation |
| **Pixel Art Quality** | C | Tiles load but many are misaligned or use wrong sprite regions |
| **Immersion** | D | Feels like a debug view, not a living office |
| **Code Quality** | B- | Clean structure, good separation, but hardcoded tile coords are fragile |

**Overall: C-** — Solid foundation, but far from the LimeZu reference quality.

---

## 1. UX Design Review

### 1.1 Layout & Zone Communication — Grade: C+

**What works:**
- 5 distinct zones are defined (Meeting, CEO, Open Workspace, Server Room, Break Area, Reception)
- Glass partitions provide visual separation between zones
- Room labels ("RÉUNION", "CEO", "SERVEURS", etc.) exist at very low opacity

**What doesn't work:**
- Room labels at `opacity: 0.2` are nearly invisible — they should be the primary wayfinding tool
- No visual legend or onboarding for a first-time user. You land on the scene with zero context about what SpawnKit is doing
- The zones blur together visually because floor tile contrast is too low. Grey carpet (main) vs. office carpet (meeting) vs. wood (CEO) — these look very similar at 2x scale
- No zone highlighting on hover — you can't tell which room you're in
- The reception area (bottom center) is huge and empty, wasting prime visual real estate

**Recommendations:**
- Increase room label opacity to 0.4-0.5 and use a subtle text shadow
- Add a soft colored overlay or border glow per zone (e.g., CEO zone has warm golden ambient, Server has cool blue)
- Add a first-launch modal or animated intro sequence showing what each zone does

### 1.2 Tooltips & HUD — Grade: C

**Tooltips:**
- Tooltips work on character hover — good. They show Name, Role, Task, and Status
- Tooltip design (dark glassmorphism with Catppuccin colors) is polished
- But: tooltip only appears on the 16×32px character sprite — tiny hit target. Should expand to a ~48px radius
- No tooltips on furniture or rooms — hovering a desk or server rack gives nothing

**HUD (top bar):**
- Shows: FleetKit Bureau | 👥 6 agents | 📋 6 tâches | 🕐 time
- This is the bare minimum. Missing:
  - Agent status summary (how many active/idle/busy?)
  - Active alerts or events
  - Any clickable interaction
- The HUD is 22px tall on a 704px canvas — hard to read
- Font mixing: "Courier New" for body, "Segoe UI" for HUD — inconsistent

**Recommendations:**
- Add room tooltips (hover a zone → see its purpose and who's assigned)
- Expand character hit zones by 2× for easier hovering
- Add a collapsible sidebar or bottom panel with agent cards (name, avatar, current task, progress bar)
- Unify fonts — either go full monospace (retro) or full sans-serif (modern)

### 1.3 Intuitiveness & Onboarding — Grade: D+

- Zero onboarding for new users
- No visual affordance that characters are interactive (no glow, no cursor change, no highlight)
- The `cursor: default` CSS prevents any hint of interactivity
- No click interactions at all — only hover tooltips
- postMessage API exists but is invisible to the user

**Recommendations:**
- Add `cursor: pointer` when hovering an agent
- Add a subtle pulse/glow on agents to signal interactivity
- Implement click-to-focus: clicking an agent zooms/highlights them and shows a detailed card
- Add a small "?" help icon in the HUD with keyboard shortcuts and explanations

### 1.4 Visual Hierarchy (CEO > Others) — Grade: C-

- CEO (ApoMac) sits in the top-right corner — correct spatial hierarchy (private office)
- But the CEO sprite is the same size (16×32) as everyone else
- No visual crown, glow, badge, or any differentiator beyond the tooltip
- The CEO's desk is the same visual weight as workspace desks
- In the references, the CEO/boss area has a visibly larger desk, more décor, different flooring

**Recommendations:**
- Add a subtle golden glow or particle effect around the CEO
- Make the CEO office more visually rich (bigger desk, more decorations, awards on wall)
- Add a small role badge above each agent's nametag (👑 for CEO, 🔧 for CTO, etc.)

---

## 2. Game Design Review

### 2.1 Office "Liveness" — Grade: D

**Current state:**
- Only 1 agent walks (Hunter, CRO) on a predefined path
- 3 agents sit permanently (ApoMac, Forge, Atlas) — they idle-animate in place
- 1 agent is "on phone" (Echo) — static position with phone animation
- 1 agent stands idle (Sentinel) — breathing animation only

**What's missing vs. references:**
- In LimeZu references: characters walk between rooms, stop at coffee machines, interact with objects
- No ambient worker NPCs (non-agent characters walking around)
- No one ever stands up, gets coffee, walks to a meeting, returns to their desk
- The office feels frozen except for Hunter's patrol loop

**Recommendations:**
- Give ALL agents a daily routine: sit 60s → walk to break room → sit again → walk to meeting → etc.
- Add 2-3 non-agent NPCs (visitors, delivery person, intern) for ambient life
- Randomize walk timing so agents aren't synchronized
- Add micro-behaviors: agent stretches, looks at phone, turns to talk to neighbor

### 2.2 "Juice" (Particles, Effects, Transitions) — Grade: D-

**Current state:**
- Zero particle effects
- Zero screen transitions (no fade-in on load after the loading bar)
- No ambient effects (no screen glow, no floating dust motes, no blinking lights)
- No event-driven effects (no "task complete" celebration, no notification pop-up)
- Glass partitions are flat transparent rectangles — no reflection shimmer

**In the LimeZu references:**
- Monitors have screen glow and flickering
- Plants have subtle sway
- Light pools on the floor from ceiling lights
- Coffee machine has steam particles

**Recommendations:**
- Add monitor screen glow (oscillating blue/white light on desk surfaces)
- Add blinking server LEDs (tiny colored dots cycling in the server room)
- Add ceiling light pools (soft radial gradient on floor beneath each light)
- Add "task complete" micro-animation (confetti burst or checkmark popup above agent)
- Add a subtle day/night lighting cycle (warm → cool → warm)
- Glass partitions should have a slow-moving highlight/reflection

### 2.3 Agent Personality — Grade: C-

**Current state:**
- Agents use different base sprites (Adam, Alex, Amelia, Bob) — good diversity
- Tinting is applied to Echo (gold) and Sentinel (green) — smart differentiation
- But: tint at `rgba(r,g,b,0.25)` is too subtle to distinguish at a glance
- No unique accessories, hats, or visual markers per role
- Walking speed is uniform for Hunter — no personality in movement

**Recommendations:**
- Increase tint to 0.4 for better differentiation, or use distinct color palettes per character
- Add role-specific accessories: headphones for CTO, briefcase for CRO, coffee mug for CMO
- Vary walk speeds: CRO is fast/purposeful, COO is steady, intern is nervous/quick
- Add idle animations that differ: CEO leans back, CTO types furiously, CMO checks phone

### 2.4 Animation Rhythm — Grade: C

- Animation speed: 1 frame every 10 ticks at 60fps = ~6fps sprite animation — appropriate for pixel art
- Walker movement: 0.025 per frame = very slow, natural walking pace — good
- But there's only one animation tempo for everything. No variation in:
  - Walk cycles (all same speed)
  - Idle cycles (all same speed)
  - Environmental animations (none exist)

**Recommendation:**
- Vary idle animation speeds (CEO: slow/relaxed, CTO: fast/typing, Sentinel: alert/scanning)
- Add animation easing to walker paths (slow at turns, fast on straights)

---

## 3. Pixel Art Quality Review

### 3.1 Tile Alignment — Grade: C-

**Issues found in code analysis:**
- Floor tiles use a 2-wide alternating pattern (`x%2, y%2`) — this is correct for LimeZu tiles
- BUT: wall drawing uses hardcoded ORB column/row references (`c1-4, r0-3`) that may not correspond to the actual spritesheet layout
- Side walls use `c7` and `c9` which are likely out of bounds or wrong tile types for the Office Room Builder sheet
- The meeting room baseboard divider (y=9) overlaps with the floor tiles
- Glass partitions are drawn as raw `fillRect` with CSS colors — they're NOT pixel art at all, breaking the aesthetic

**Visible in screenshot:**
- Some wall tiles appear misaligned or show wrong tiles (the top wall has inconsistent patterning)
- The left/right side walls look like repeated single tiles rather than proper wall edges
- Floor transitions between zones have no border tiles — they cut sharply

**Recommendations:**
- Audit every sprite coordinate against the actual spritesheet (open PNGs in a sprite editor)
- Use proper wall corner and edge tiles from the ORB sheet instead of repeating face tiles
- Add floor transition tiles (carpet-to-wood border, carpet-to-tile border)
- Replace `fillRect` glass with actual semi-transparent sprite tiles or at least pixel-aligned rectangles

### 3.2 Color Palette Coherence — Grade: C+

**What works:**
- Catppuccin Mocha palette for UI (HUD, tooltips) — consistent and modern
- Agent name colors use distinct Catppuccin accents (peach, mauve, red, teal, yellow, green) — good

**What doesn't work:**
- Background `#1a1a2e` (dark navy) clashes with the warm LimeZu tile palette
- The `fillStyle='rgba(205,214,244,0.2)'` room labels are Catppuccin text on pixel art — style mismatch
- Glass partition colors (`#b0b8d0`, `#89b4fa`) are Catppuccin blue — feels foreign in pixel art
- No warmth in the scene. LimeZu references use warm browns, creams, soft greens. This scene feels cold and sterile

**Recommendations:**
- Change background void color to a dark warm brown (`#2a1f1f` or `#1e1a16`) to complement wood tones
- Add warm ambient lighting overlays in the CEO and break areas
- Tone down the blue glass to a more neutral warm grey with slight blue tint
- Match the UI overlay colors to the pixel art palette (extract colors from the actual tiles)

### 3.3 LimeZu Style Match — Grade: C-

**Reference analysis (Design 1 — small office):**
- Cozy 1-room office with desk, computer, bookshelf, couch, coffee table
- Warm wood floor, cream walls, soft lighting, plants, personal items everywhere
- Dense, lived-in feeling — every tile has something on it or near it
- Characters have clear roles (one at desk, one walking)

**Reference analysis (Design 2 — large office):**
- Multiple rooms: reception, open office, meeting room, break room, private office
- Clear visual hierarchy: boss office is bigger and more decorated
- Abundant decorative items: posters, clocks, calendars, cork boards, trash cans, water coolers
- Proper wall structure: base molding, wall face, ceiling trim, interior wall intersections
- Rug/mat placement under desks and at doorways

**Reference analysis (Video frame):**
- Shows character movement between rooms
- Dynamic lighting (monitor glow, window light)
- Multiple characters in different states (sitting, walking, at coffee machine)
- Heavy use of small objects (mugs, papers, pens, files on desks)

**Current office vs. references — gaps:**
1. **Density:** References are 80% decorated, current office is maybe 30% — too much empty floor
2. **Wall detail:** References have proper wall intersections, doorframes, window elements. Current has flat repeated tiles
3. **Furniture variety:** References have 15+ unique furniture pieces per room. Current reuses the same desk pattern
4. **Small objects:** References scatter small items everywhere (mugs, papers, phones). Current has zero desk-surface items
5. **Rugs/mats:** References place area rugs under workstations and at entries. Current has none

### 3.4 Immersion Breakers — Grade: D+

Critical immersion issues:
1. **Glass walls are CSS rectangles, not pixel art** — most jarring element
2. **Room labels use system fonts at low opacity** — look like debug overlays
3. **HUD uses system font "Segoe UI"** — should be a pixel font or at least monospace
4. **Empty floor space** — massive gaps with nothing in them (center of open workspace, reception)
5. **No windows** — the office has no exterior walls with windows. In LimeZu, every office has windows with light/blinds
6. **No wall decorations** — zero posters, clocks, diplomas, whiteboards (except meeting room). Walls are bare
7. **Name tags use "Segoe UI" sans-serif** — floating above pixel characters in system font
8. **Status dot is always green** — hardcoded `#a6e3a1`, not reflecting actual agent state

---

## 🏆 TOP 5 Most Impactful Improvements

### 1. 🌿 Fill the Empty Space — Furniture & Decorative Density (Impact: ★★★★★)
The #1 gap vs. LimeZu references. Add: wall posters, clocks, trash cans, coffee mugs on desks, paper stacks, desk lamps, monitor stands, keyboard/mouse sprites, area rugs, door mats, window blinds, filing cabinets near desks, coat rack by entrance. Target: no floor tile should be more than 3 tiles from a decoration.

### 2. 🏃 Agent Routines — Make the Office Alive (Impact: ★★★★★)
Currently 5/6 agents are static. Implement a simple state machine for each agent: `work(60-120s) → walk(to break/meeting) → interact(10-30s) → walk(back) → work`. Even just having 2-3 agents walking at any time transforms the scene from a still image to a living office.

### 3. ✨ Add Ambient Effects — Monitor Glow, Server LEDs, Light Pools (Impact: ★★★★☆)
The scene has zero ambient animation besides character sprite frames. Add:
- Monitor screen glow (subtle oscillating light on 6 desk areas)
- Server room blinking LEDs (red/green/blue tiny dots)
- Ceiling light pools (soft radial gradient on floor)
- Coffee machine steam (2-3 pixel particles rising)
These add massive perceived quality for minimal code.

### 4. 🧱 Fix Wall Structure & Add Windows (Impact: ★★★★☆)
Current walls are flat repeated tiles with wrong sprite coords. Properly implement:
- Wall corner pieces (L-shapes, T-intersections)
- Window elements on the top wall (LimeZu offices ALWAYS have windows)
- Interior doorframes where glass partitions have gaps
- Replace CSS `fillRect` glass with pixel-art-style semi-transparent panels

### 5. 🎯 Interactive Agent Cards — Click to Focus (Impact: ★★★☆☆)
Transform from passive display to interactive dashboard:
- Click an agent → camera smoothly pans to center them → detail card appears (avatar, role, current task, progress, last action)
- Click a room → see room stats (agents present, activity level)
- Add `cursor: pointer` on interactive elements
This turns the pixel art office from eye candy into a functional fleet management UI.

---

## 🔧 Quick Wins (< 30 min each)

| Fix | Time | Impact |
|---|---|---|
| Increase room label opacity to 0.4 + add text shadow | 5 min | Medium |
| Change background from `#1a1a2e` to warm dark brown | 2 min | Medium |
| Add `cursor: pointer` on agent hover | 5 min | Low-Med |
| Fix status dot to reflect actual agent state | 10 min | Medium |
| Add role emoji badges above name tags | 15 min | Medium |
| Add ceiling light floor glow (radial gradient) | 20 min | High |
| Add monitor screen glow (oscillating opacity) | 20 min | High |
| Unify font to monospace everywhere | 5 min | Low |

---

## 🎬 Conclusion

The foundation is solid: proper canvas rendering, sprite sheet loading, character animation system, tooltip system, and postMessage API. The code is well-structured and extendable.

But the **art direction gap** between this and the LimeZu references is significant. The references feel like living, breathing offices where every pixel was placed with intention. The current theme feels like a **technical proof-of-concept** — correct tiles placed programmatically, but missing the art direction, density, warmth, and life that make pixel art offices compelling.

The good news: the code architecture can support all the recommended improvements. The sprite sheets already contain most of the needed assets (desk items, decorations, window tiles). It's not a rebuild — it's a **decoration + animation pass**.

**Priority path:** Density (#1) → Agent Routines (#2) → Ambient FX (#3) → Walls/Windows (#4) → Interactivity (#5)

---

*Review conducted against LimeZu "Modern Office Revamped" reference pack (Design 1 & 2) and video reference frame.*
