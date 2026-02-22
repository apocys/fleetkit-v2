# SpawnKit Data Bridge — Live Mode Documentation

## Overview

The SpawnKit data-bridge.js has been enhanced with robust live mode functionality that connects the dashboard to real OpenClaw data. It polls the REST proxy endpoints every 30 seconds, emits events when data changes, and provides graceful error handling with exponential backoff.

## Architecture

```
OpenClaw Filesystem → data-provider.js → Electron IPC → data-bridge.js → SpawnKit API → Dashboard Panels
```

### Components

1. **data-provider.js** (Electron main process)
   - Reads OpenClaw filesystem directly (`~/.openclaw/agents/main/sessions/*.jsonl`, cron jobs, memory, etc.)
   - Exposes data via Electron IPC (`spawnkitAPI`)
   - Provides endpoints: `getSessions()`, `getCrons()`, `getMemory()`, `getMetrics()`, `getAll()`

2. **data-bridge.js** (Renderer process)
   - Universal bridge supporting both live (Electron) and demo (browser) modes
   - Polls IPC endpoints every 30 seconds in live mode
   - Event detection and emission for real-time updates
   - Exponential backoff retry logic with graceful fallback to demo mode

## Live Mode Features

### Data Sources
- **Agent Sessions**: Active/idle status, current tasks, token usage, API calls
- **Subagents**: Running tasks, progress, parent agent mapping
- **Cron Jobs**: Scheduled tasks, next run times, success/failure status
- **Memory**: Long-term memory, daily notes, heartbeat state
- **Metrics**: Token usage, API calls, uptime, resource usage

### Event System
The data-bridge emits events when data changes are detected:

```javascript
// Agent status changes
SpawnKit.on('agent:status', (data) => {
  console.log(`${data.name} changed from ${data.oldStatus} to ${data.newStatus}`);
});

// New subagent spawned
SpawnKit.on('subagent:spawn', (data) => {
  console.log(`${data.name} spawned under ${data.parentAgent}`);
});

// New mission created
SpawnKit.on('mission:new', (data) => {
  console.log(`New mission: ${data.title}`);
});

// Cron job triggered
SpawnKit.on('cron:trigger', (data) => {
  console.log(`Cron job ${data.name} executed`);
});

// Data refresh completed
SpawnKit.on('data:refresh', (data) => {
  console.log(`Data refreshed: ${data.agents.length} agents, ${data.subagents.length} subagents`);
});
```

### Error Handling & Resilience

#### Exponential Backoff
- **Success**: 30-second intervals
- **1st failure**: 30s delay
- **2nd failure**: 60s delay  
- **3rd failure**: 120s delay
- **4th failure**: 240s delay
- **5th+ failure**: 300s delay (max 5 minutes)

#### Graceful Degradation
1. **Connection Loss**: After 5 consecutive failures, automatically falls back to demo mode
2. **Demo Badge**: Shows prominent "DEMO MODE" indicator when not connected to live data
3. **Retry Logic**: Continues attempting to reconnect in the background
4. **State Preservation**: Maintains last known good data during temporary outages

#### Error Recovery
```javascript
// Check connection health
const debug = SpawnKit.api.getDebugInfo();
console.log(`Failures: ${debug.failureCount}, Last error: ${debug.lastRefreshError}`);

// Force reconnection attempt
await SpawnKit.api.forceRefresh();

// Manual fallback to demo mode
SpawnKit.mode = 'demo';
SpawnKit.data = makeDemoData();
```

## Usage Examples

### Basic Integration
```html
<script src="src/data-bridge.js"></script>
<script>
  // Data automatically available after initialization
  console.log('Mode:', SpawnKit.mode);
  console.log('Agents:', SpawnKit.data.agents);
  
  // Listen for updates
  SpawnKit.on('data:refresh', (data) => {
    updateDashboard(data);
  });
  
  // Manual refresh
  await SpawnKit.refresh();
</script>
```

### Dashboard Panel Integration
```javascript
// Real-time agent status display
function updateAgentPanel() {
  const agents = SpawnKit.data.agents;
  agents.forEach(agent => {
    const panel = document.getElementById(`agent-${agent.id}`);
    panel.className = `agent-card ${agent.status}`;
    panel.querySelector('.task').textContent = agent.currentTask;
    panel.querySelector('.tokens').textContent = `${agent.tokensUsed} tokens`;
  });
}

SpawnKit.on('data:refresh', updateAgentPanel);
SpawnKit.on('agent:status', updateAgentPanel);
```

### Mission Creation
```javascript
// Send new mission to OpenClaw
const result = await SpawnKit.api.sendMission('Build new landing page');
if (result.success) {
  console.log('Mission created:', result.path);
  // Data will be refreshed automatically to show new mission
}
```

### Subagent Spawning
```javascript
// Spawn a new subagent with Agent OS naming v2.0
const subagent = await SpawnKit.api.spawnSubagent('forge', 'CodeBuilder', 'Enhance theme system');
console.log('Spawned:', subagent.agentOSName); // e.g., "Forge.CodeBuilder-01"
```

## Configuration

### Polling Intervals
```javascript
// Default: 30s live, 60s demo
SpawnKit.config.refreshInterval = 30000;

// Restart live updates with new interval
SpawnKit.stopLive();
SpawnKit.startLive();
```

### Theme Integration
```javascript
// Theme-specific display formatting
SpawnKit.config.theme = 'gameboy'; // 'executive', 'sims', 'gameboy'
SpawnKit.saveConfig();
```

### Debug Information
```javascript
const debug = SpawnKit.api.getDebugInfo();
console.log('Live Mode Status:', {
  mode: debug.mode,
  connected: debug.hasElectronAPI,
  refreshes: debug.refreshCount,
  failures: debug.failureCount,
  lastError: debug.lastRefreshError,
  dataSize: debug.dataSize
});
```

## Testing

### Unit Test
```bash
node test-data-bridge-live.js
```

### Manual Testing
1. Open SpawnKit in Electron app
2. Check console for "🔌 SpawnKit: Connected to OpenClaw (live data)"
3. Verify 30-second refresh intervals
4. Test connection failure by stopping OpenClaw daemon
5. Verify automatic fallback to demo mode
6. Restart OpenClaw and verify reconnection

### Integration Tests
```javascript
// Test event emission
let statusChanges = 0;
SpawnKit.on('agent:status', () => statusChanges++);

// Simulate agent status change and verify event
await SpawnKit.refresh();
// statusChanges should increment if agent status changed
```

## Performance

### Memory Usage
- **Live Mode**: ~2-5MB for typical 6-agent setup with 20 subagents
- **Demo Mode**: ~500KB static data
- **Caching**: 5-second TTL on data-provider.js reduces filesystem reads

### Network/IPC Overhead
- **30-second intervals**: ~2 IPC calls per minute (isAvailable + getAll)
- **Backoff during failures**: Reduces load when OpenClaw is unavailable
- **Event-driven updates**: No polling needed for UI updates after data refresh

### Resource Impact
- **CPU**: Minimal (background setTimeout, not setInterval)
- **Disk**: Read-only access to OpenClaw session files
- **Memory**: Automatic cleanup of old event listeners

## Troubleshooting

### Common Issues

1. **"Demo Mode" badge appears**
   - OpenClaw daemon not running: `openclaw gateway start`
   - Workspace path incorrect: Check `~/.openclaw/workspace` exists
   - Permission issues: Ensure SpawnKit can read OpenClaw files

2. **No data updates**
   - Check `SpawnKit.api.getDebugInfo().liveUpdateActive`
   - Verify `refreshCount` is incrementing
   - Check browser console for error messages

3. **High failure count**
   - Filesystem permission issues
   - OpenClaw configuration corruption
   - Session files locked by another process

### Debugging Commands
```javascript
// Check connection
await window.spawnkitAPI.isAvailable();

// Raw data fetch
const raw = await window.spawnkitAPI.getAll();

// Force refresh and check errors
try {
  await SpawnKit.refresh();
} catch (e) {
  console.error('Refresh failed:', e);
}

// Live update status
console.log('Live updates:', SpawnKit.api.getDebugInfo());
```

## Future Enhancements

### Planned Features
- **WebSocket mode**: Real-time push updates instead of polling
- **Selective refresh**: Update only changed data sections
- **Offline queue**: Store missions/commands when disconnected
- **Connection health monitoring**: Visual indicator of data freshness

### Extension Points
- **Custom event types**: Add mission progress, memory updates
- **Data transformers**: Custom mapping for different dashboard themes
- **Caching strategies**: Local storage backup for offline mode
- **Performance monitoring**: Track refresh times and failure patterns

---

**Status**: ✅ **COMPLETE** — Live mode fully implemented with 30-second polling, robust error handling, and exponential backoff retry logic. Dashboard panels can now consume real OpenClaw data with automatic fallback to demo mode when disconnected.