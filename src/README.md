# FleetKit v2 - Theme System & Data Bridge

## Overview

FleetKit v2 features a unified theme system with a real-time data bridge that connects all themes to live OpenClaw data. Users can switch between themes seamlessly while maintaining consistent data flow.

## Files

- **`theme-selector.html`** - Landing page for choosing themes (like picking your starter Pokémon!)
- **`data-bridge.js`** - Universal data bridge exposing `FleetKit.data` to all themes
- **`theme-switcher.js`** - Theme switcher component (gear icon) for switching themes
- **`data-integration-example.js`** - Examples showing how themes integrate with the data bridge
- **`README.md`** - This documentation

## Theme Selector

The theme selector provides a beautiful landing page where users choose their preferred interface:

- **🎮 GameBoy** - Retro Pixel Paradise 
- **🌃 Cyberpunk** - Neon Command Center
- **🏢 Executive** - Corporate Boardroom

### Features
- Clean dark UI with animated backgrounds
- Theme preview with color gradients
- Smooth loading animations
- Saves preference to `localStorage('fleetkit-theme')`
- Auto-redirects to saved theme on return visits
- Easter eggs (Konami code, click counter)

## Data Bridge

The data bridge (`data-bridge.js`) provides a global `FleetKit.data` object with real-time data:

```js
FleetKit.data = {
  agents: [...],      // Main agents with status, tasks, metrics
  subagents: [...],   // Spawned subagents with progress
  missions: [...],    // Active missions with progress, assignments
  crons: [...],       // Scheduled tasks with next/last run times
  metrics: {...},     // System metrics (tokens, API calls, uptime)
  events: [...]       // Real-time event queue
}
```

### Integration Points

Ready for OpenClaw integration:

- `GET /api/sessions` → agent statuses & subagents
- `GET /api/crons` → scheduled tasks  
- `WebSocket /ws/events` → real-time updates
- Config in `~/.fleetkit/config.json`

### Event System

```js
FleetKit.on('mission:new', callback)
FleetKit.on('agent:status', callback)  
FleetKit.on('cron:trigger', callback)
FleetKit.on('subagent:spawn', callback)
FleetKit.on('subagent:complete', callback)
```

## Theme Integration

Any theme can integrate with just **3 lines of code**:

```js
// 1. Access global data
const data = FleetKit.data;

// 2. Listen for updates
FleetKit.on('agent:status', updateUI);

// 3. Use the data
displayAgents(data.agents);
```

### Complete Example

```js
function integrateWithFleetKit() {
    // Get live agent data
    const activeAgents = FleetKit.data.agents.filter(a => a.status === 'active');
    
    // Listen for mission updates
    FleetKit.on('mission:progress', (event) => {
        const mission = FleetKit.data.missions.find(m => m.id === event.data.missionId);
        updateProgressBar(mission.id, mission.progress);
    });
    
    // Listen for subagent spawns
    FleetKit.on('subagent:spawn', (event) => {
        addNewCharacter(event.data.subagentId, event.data.task);
    });
    
    // Display current data
    displayAgents(activeAgents);
    displayMissions(FleetKit.data.missions);
    displayMetrics(FleetKit.data.metrics);
}
```

## Theme Switcher

The theme switcher adds a gear icon to every office theme:

- **Position**: Fixed top-right corner
- **Appearance**: Adapts to each theme's styling
- **Functionality**: Switch themes without returning to selector
- **Dropdown**: Shows all available themes + "Theme Selector" link

### Installation

Add to any theme's HTML:

```html
<script src="../src/data-bridge.js"></script>
<script src="../src/theme-switcher.js"></script>
<script>
    document.addEventListener('DOMContentLoaded', function() {
        initThemeSwitcher();
    });
</script>
```

## Theme Development

### Structure

Each theme should:

1. Include the data bridge: `<script src="../src/data-bridge.js"></script>`
2. Include the theme switcher: `<script src="../src/theme-switcher.js"></script>`  
3. Initialize the switcher: `initThemeSwitcher()`
4. Integrate with data: Use `FleetKit.data` and event system

### Styling

Theme switcher automatically adapts:

```css
body.gameboy-theme #theme-switcher-button {
    background: rgba(15, 56, 15, 0.9);
    border-color: #8BAC0F;
    color: #9BBB0F;
}

body.cyberpunk-theme #theme-switcher-button {
    border-color: #00ffff;
    color: #00ffff;
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
}

body.executive-theme #theme-switcher-button {
    background: rgba(44, 36, 22, 0.9);
    border-color: #c9a876;
    color: #c9a876;
}
```

## Data Structure

### Agents
```js
{
  id: 'kira',
  name: 'Kira', 
  role: 'CEO',
  status: 'active',
  currentTask: 'Strategic planning session',
  emoji: '👑',
  lastSeen: '2026-02-18T22:55:00.000Z',
  sessionId: 'agent:main:kira',
  modelUsed: 'claude-opus-4-6',
  tokensUsed: 12500,
  apiCalls: 45
}
```

### Missions
```js
{
  id: 'm1',
  title: 'FleetKit v2 Launch',
  description: 'Build and deploy the next generation AI office interface', 
  status: 'in_progress',
  progress: 0.72,
  assignedTo: ['forge', 'echo', 'hunter'],
  priority: 'high',
  createdAt: '2026-02-17T22:55:00.000Z',
  dueDate: '2026-02-20T22:55:00.000Z',
  tags: ['development', 'product-launch']
}
```

### Metrics
```js
{
  tokensToday: 52300,
  apiCallsToday: 287, 
  activeSessions: 6,
  uptime: '2d 14h 23m',
  memoryUsage: 0.68,
  cpuUsage: 0.23
}
```

## Quality Standards

### Theme Selector
- Should feel like choosing your starter Pokémon
- Smooth animations and hover effects
- Auto-redirects and loading states
- Easter eggs for engagement

### Data Bridge  
- Clean enough that any theme can plug in with 3 lines
- Realistic mock data matching OpenClaw structure
- Event system for real-time updates
- Ready for API integration with documented endpoints

### Browser Compatibility
- Pure browser JS, no build tools
- Works with `file://` protocol
- Compatible with all modern browsers
- Responsive design for mobile

## Future OpenClaw Integration

The system is designed for easy OpenClaw integration:

1. Replace mock data in `data-bridge.js` with API calls
2. Connect WebSocket for real-time events
3. Map OpenClaw session data to FleetKit agent structure
4. Store config in `~/.fleetkit/config.json`

All integration points are documented with `// from: API_NAME` comments.