# SpawnKit Electron App

A beautiful, minimal Electron app that provides a premium setup wizard and desktop interface for SpawnKit v2.

## Features

### ✨ First-Run Setup Wizard
- **Step 1: Welcome** - Premium onboarding experience
- **Step 2: Configuration** - Auto-detect OpenClaw workspace, configure API provider
- **Step 3: Meet Your Team** - Introduction to the 5 AI agents

### 🖥️ Main Application
- Loads the PixiJS office view (when available)
- System tray integration
- Menu bar with settings and controls
- Dark theme matching the office aesthetic

## Structure

```
electron/
├── package.json          # Dependencies & build config
├── main.js               # Electron main process
├── preload.js            # Secure IPC bridge
├── renderer/
│   ├── index.html        # Main window
│   ├── setup.html        # Setup wizard
│   ├── setup.js          # Setup logic
│   └── style.css         # Shared dark theme
└── assets/
    ├── icon.png          # App icon (256x256)
    └── icon.svg          # Source SVG
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for distribution
npm run build

# Platform-specific builds
npm run build:mac
npm run build:win
npm run build:linux
```

## Configuration

The app stores its configuration in `~/.spawnkit/config.json`:

```json
{
  "workspacePath": "~/.openclaw/workspace",
  "apiProvider": "claude",
  "apiKey": "sk-..."
}
```

## Security

- `contextIsolation: true`
- `nodeIntegration: false` 
- Secure IPC through preload script
- API keys stored locally, never transmitted

## Design Philosophy

**Apple-like Experience:**
- No terminal or config files required
- Beautiful 3-step setup wizard
- Feels like unwrapping a premium product
- Non-technical users can set up without documentation

**Quality Bar:**
Show this to someone who's never used a command line. They should be able to get SpawnKit running in under 2 minutes.

## Integration

- Automatically loads the PixiJS office from `../office/index.html`
- Falls back to a placeholder view if office isn't built yet
- Tray icon shows SpawnKit status
- Menu commands integrate with the office view