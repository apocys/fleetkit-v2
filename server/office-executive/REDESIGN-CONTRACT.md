# Executive Office Redesign — Interface Contract

## Vision
Transform from dashboard-first to chat-first UI. The hero prompt ("What do we build today?") is the primary interface. Agent tiles collapse when chat activates.

## Two States
1. **Landing** (idle): Hero prompt + suggestion chips + agent row + quick actions
2. **Chat** (active): Full chat thread + collapsed agent icons + input bar

## Shared IDs & Classes

### Landing State Elements
- `#missionDesk` — Main landing container (visible in idle state)
- `#missionDeskHero` — "What do we build today?" headline
- `#missionDeskInput` — Main chat input (the hero prompt bar)
- `#missionDeskSuggestions` — Suggestion chips container
- `#missionDeskTeam` — Agent tile row (compact cards)
- `#missionDeskActions` — Quick action buttons (Missions, Boardroom, Skills, Marketplace)

### Chat State Elements
- `#chatExpanded` — Full chat view container (hidden in idle, visible when active)
- `#chatThread` — Message thread
- `#chatInput` — Chat input in expanded view
- `#chatAgentBar` — Collapsed agent icon row at bottom of chat
- `#chatBackBtn` — Back button to return to landing

### Transition Classes
- `.md-state-idle` — On body when in landing state
- `.md-state-chat` — On body when in chat state
- `.md-transitioning` — During animation (300ms)

### Agent Tile in Landing
```html
<div class="md-agent" data-agent="ceo">
  <div class="md-agent-avatar">
    <svg><use href="#avatar-ceo"/></svg>
    <span class="md-agent-status md-agent-status--active"></span>
  </div>
  <span class="md-agent-name">Sycopa</span>
  <span class="md-agent-role">CEO</span>
</div>
```

### Agent Icon in Chat (collapsed)
```html
<div class="md-agent-icon" data-agent="ceo" title="Sycopa — CEO">
  <svg><use href="#avatar-ceo"/></svg>
  <span class="md-agent-status md-agent-status--active"></span>
</div>
```

### Quick Action Button
```html
<button class="md-action" data-action="missions">
  <span class="md-action-icon">🎯</span>
  <span class="md-action-label">Missions</span>
</button>
```

### Chat Message
```html
<div class="md-msg md-msg--user">
  <div class="md-msg-content">User message here</div>
</div>
<div class="md-msg md-msg--ai">
  <div class="md-msg-avatar"><svg><use href="#avatar-ceo"/></svg></div>
  <div class="md-msg-content">AI response here</div>
</div>
```

### Panel (half-sheet)
```html
<div class="md-panel" id="panelMissions">
  <div class="md-panel-handle"></div>
  <div class="md-panel-header">
    <h3>Missions</h3>
    <button class="md-panel-close">×</button>
  </div>
  <div class="md-panel-body">...</div>
</div>
<div class="md-panel-backdrop"></div>
```

## CSS Design System
- Font: Inter (already loaded)
- Colors: Use existing CSS vars (--exec-blue, --bg-primary, --text-primary, etc.)
- Border radius: 16px cards, 12px buttons, 24px input
- Shadows: `0 1px 3px rgba(0,0,0,0.06)` (subtle), `0 8px 32px rgba(0,0,0,0.12)` (elevated)
- Animations: Use `--ease-smooth`, `--ease-spring` vars. All transitions 300ms.
- Backdrop blur: `backdrop-filter: blur(20px) saturate(180%)`

## Events
- `missionDesk:activate` — Fired when user submits in hero input → triggers chat expansion
- `missionDesk:deactivate` — Fired when user clicks back → returns to landing
- `missionDesk:panel` — Fired with `detail.panel` = 'missions'|'boardroom'|'skills'|'marketplace'
- Existing events preserved: `panelActivated`, `sk:sendMessage`

## Global Functions (on window)
- `window.MissionDesk.activate()` — Switch to chat state
- `window.MissionDesk.deactivate()` — Switch to landing state
- `window.MissionDesk.openPanel(name)` — Open a panel
- `window.MissionDesk.closePanel()` — Close any open panel
- `window.MissionDesk.sendMessage(text)` — Send through existing chat system

## Integration Points
- `app.js` — Existing chat/boardroom logic. MissionDesk calls `window.sendChatTabMessage(text)` for chat.
- `main.js` — Existing agent grid, marketplace, etc. MissionDesk replaces the grid as default view.
- `orchestration.js` — Skills/sessions panels. MissionDesk triggers these via existing overlay system.
- `mission-control.js` — Kanban panel. MissionDesk opens it as a panel.
