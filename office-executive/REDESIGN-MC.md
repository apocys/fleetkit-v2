# Mission Control Redesign — Claude Cowork Layout

## Reference
Claude.ai Cowork mode (screenshot from Kira)

## Layout: 3-panel (left sidebar, center chat, right sidebar)

### HTML Structure (replace existing mc-overlay content)
```html
<div class="mc-overlay" id="missionControlOverlay">
  <!-- LEFT SIDEBAR (~240px) -->
  <div class="mc-sidebar-left" id="mcSideLeft">
    <div class="mc-sl-actions">
      <button class="mc-sl-btn" id="mcNewMission">+ New Mission</button>
      <button class="mc-sl-btn" id="mcSearch">🔍 Search</button>
      <button class="mc-sl-btn" id="mcCustomize">⚙ Customize</button>
    </div>
    <div class="mc-sl-section-label">Recent</div>
    <div class="mc-sl-history" id="mcHistoryList"></div>
    <div class="mc-sl-footer" id="mcUserFooter"></div>
  </div>
  
  <!-- CENTER PANEL (fluid) -->
  <div class="mc-center" id="mcCenter">
    <div class="mc-center-tabs" id="mcCenterTabs">
      <button class="mc-tab active" data-tab="chat">Chat</button>
      <button class="mc-tab" data-tab="orchestration">Orchestration</button>
      <button class="mc-tab" data-tab="remote">Remote</button>
    </div>
    <div class="mc-center-title" id="mcCenterTitle"></div>
    <div class="mc-center-body" id="mcCenterBody"></div>
    <div class="mc-center-input" id="mcCenterInput">
      <textarea id="mcChatInput" placeholder="Reply..."></textarea>
      <div class="mc-input-bar">
        <button class="mc-attach-btn" id="mcAttach">+</button>
        <div class="mc-input-right">
          <span class="mc-model-label" id="mcModelLabel">Opus 4.6</span>
          <button class="mc-send-btn" id="mcSend">↑</button>
        </div>
      </div>
    </div>
  </div>
  
  <!-- RIGHT SIDEBAR (~270px) -->
  <div class="mc-sidebar-right" id="mcSideRight">
    <div class="mc-sr-section" id="mcProgression"></div>
    <div class="mc-sr-section" id="mcFiles"></div>
    <div class="mc-sr-section" id="mcContext"></div>
  </div>
</div>
```

### CSS Variables
```
--mc-bg-sidebar: #1a1a1e
--mc-bg-center: #292930
--mc-bg-input: #333340
--mc-text-primary: #e0e0e5
--mc-text-secondary: #999
--mc-text-muted: #666
--mc-accent-green: #34A853
--mc-accent-orange: #D4783A
--mc-accent-blue: #4a9eff
--mc-border: #3a3a44
--mc-selected: #2a2a33
```

### File Split
1. `mc-layout.css` (~200 lines) — grid layout, sidebar, center, right panel CSS
2. `mc-sidebar-left.js` (~200 lines) — left sidebar logic (new mission, search, history, user footer)
3. `mc-center.js` (~250 lines) — center panel: tabs, chat rendering, input, send
4. `mc-sidebar-right.js` (~200 lines) — right panel: progression, files, context
5. `mc-core.js` (~150 lines) — open/close, data loading, wiring, ESC handler

### Shared IDs/Classes (CONTRACT)
- Overlay: `#missionControlOverlay`
- Left: `#mcSideLeft`, `#mcHistoryList`, `#mcUserFooter`, `#mcNewMission`, `#mcSearch`, `#mcCustomize`
- Center: `#mcCenter`, `#mcCenterTabs`, `#mcCenterTitle`, `#mcCenterBody`, `#mcCenterInput`, `#mcChatInput`, `#mcSend`, `#mcModelLabel`
- Right: `#mcSideRight`, `#mcProgression`, `#mcFiles`, `#mcContext`
- Tabs: `.mc-tab[data-tab]`, `.mc-tab.active`
- CSS prefix: `mc-` for everything

### Globals
- `window.openMissionControl()` — opens overlay
- `window.closeMissionControl()` — closes overlay
- `window.mcRefresh()` — manual refresh
- `window.OC_API_URL` or origin for API
- `window.skFetch()` — auth-wrapped fetch
