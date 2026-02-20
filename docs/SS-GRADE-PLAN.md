# SpawnKit v2 — SS+ GRADE PLAN

## Current State: S-grade (individual components)
## Target: SS+ (complete product — zero friction, addictive, mindblowing end-to-end)

---

## Phase 1: LAUNCH & TEST (30 min)
Actually open every page, find every bug, test every flow.

### Test Matrix
- [ ] Theme selector → GameBoy → boot → office → missions → demo loop
- [ ] Theme selector → Cyberpunk → boot → office → data display
- [ ] Theme selector → Executive → boot → office → dashboard
- [ ] Theme switching (gear icon in each theme)
- [ ] ?reset escape hatch on theme selector
- [ ] Returning user (no boot, abbreviated)
- [ ] All keyboard shortcuts (M, C, I, S, W, X, ESC)
- [ ] Sound toggle (M key in GameBoy)
- [ ] Mobile viewport (does it degrade gracefully?)

## Phase 2: UX FIXES (1h)
Based on test results. Prioritized by user impact.

### Must-Have for SS+
- [ ] Unified navigation: every page has clear way back to selector
- [ ] Loading states: show something while PixiJS initializes
- [ ] Error recovery: if any script fails, show helpful message not blank screen
- [ ] Tutorial/onboarding: first-time user knows what they're looking at
- [ ] Keyboard shortcut overlay (? key shows all shortcuts)
- [ ] Responsive: at minimum don't break on tablet/small screens

### Addictive Features
- [ ] Achievement system: "First mission completed!", "10 missions done!", "Night owl (used after midnight)"
- [ ] Agent affinity: agents remember which tasks they did well on
- [ ] Easter eggs: Konami code, secret agent #6, hidden themes
- [ ] Stats page: total missions, uptime, favorite agent, productivity score
- [ ] Notification badges: unread missions count on theme selector

## Phase 3: POLISH (1h)
- [ ] Consistent hover/click feedback on ALL interactive elements
- [ ] Smooth transitions between ALL states
- [ ] Loading skeleton while office renders
- [ ] Favicon for each theme
- [ ] Page titles update dynamically
- [ ] Meta tags for sharing (og:image, og:description)

## Phase 4: SENTINEL SS+ AUDIT
- Full end-to-end test
- UX review (is anything confusing?)
- Performance check (FPS, memory)
- Accessibility basics (keyboard nav, contrast)
- "Would a stranger understand this in 10 seconds?"

---

## Success Criteria for SS+
1. Open theme selector → understand immediately what this is
2. Pick a theme → WOW moment from boot sequence
3. Office loads → characters moving, alive, engaging
4. Within 30 seconds → user clicks something and it responds
5. After 2 minutes → user doesn't want to close the tab
6. Share factor → user screenshots and sends to a friend
