# SpawnKit v2

**Your AI team, visualized.**

Watch your AI agents work, collaborate, and complete missions in a living virtual office. Three cinematic themes. One powerful engine.

## 🎮 Themes

| Theme | Style | Vibe |
|-------|-------|------|
| **GameBoy** | Retro pixel art | Pokémon-style quests, chiptune music, 8-bit sprites |
| **Cyberpunk** | Neon terminals | Mr. Robot aesthetics, live data feeds, hacker vibes |
| **Executive** | Luxury boardroom | Succession energy, KPI dashboards, gold accents |

## ⚡ Quick Start

```bash
# Open the theme selector
open src/theme-selector.html

# Or jump straight to a theme
open office-gameboy/index.html
open office-cyberpunk/index.html
open office-executive/index.html
```

### Electron Desktop App

```bash
cd electron
npm install
npm start
```

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Q` | Command palette (Spotlight-style) |
| `X` | New mission |
| `TAB` | Stats & achievements |
| `?` | All keyboard shortcuts |
| `M` | Team meeting |
| `C` | Celebrate |
| `N` | Toggle sound |
| `ESC` | Close any overlay |

## 🏆 Features

- **3 Cinematic Boot Sequences** — Each theme has a unique startup animation
- **15 Achievements** — Badges, streaks, and productivity scoring
- **Command Palette** — Type anything, your team handles it
- **Click + Keyboard** — FAB button for mouse users, shortcuts for power users
- **Dynamic Favicons** — SVG favicons that match your theme
- **Responsive** — Desktop, tablet, mobile
- **Offline-Ready** — All assets bundled locally
- **Zero Dependencies** — Pure JS/HTML/CSS, no frameworks

## 📊 Stats

- **28,847 lines** of production code
- **16 shared modules** in `src/`
- **3 complete themes** with unique assets
- **0 external runtime dependencies**

## 🏗️ Architecture

```
src/                    # Shared modules (loaded by all themes)
├── achievements.js     # 15 badges, streaks, stats dashboard
├── boot-sequence.js    # 3 cinematic boot sequences  
├── click-affordances.js # FAB, clickable agents, prompt bar
├── data-bridge.js      # Universal data API + event bus
├── favicon.js          # Dynamic SVG favicons
├── meta-tags.js        # OG cards + Twitter cards
├── mission-controller.js # Pokémon-style mission orchestration
├── openclaw-helpers.js # Command palette, mission form, agent cards
├── page-title.js       # Live document.title updates
├── responsive.js       # Mobile viewport + touch controls
├── sprites.js          # 16×16 pixel art characters
├── theme-names.js      # Theme-specific agent names
├── theme-selector.html # Entry point
├── theme-switcher.js   # Gear icon for theme switching
├── transitions.js      # Smooth page transitions
└── ux-layer.js         # Keyboard overlay, onboarding, nav, errors

office-gameboy/         # Pokémon RPG theme
office-cyberpunk/       # Neuromancer/Mr. Robot theme  
office-executive/       # Succession/Severance theme
landing/                # Marketing landing page
electron/               # Desktop app wrapper
lib/                    # Bundled libraries (PixiJS)
```

## 📄 License

MIT

## 💜 Powered by [OpenClaw](https://openclaw.ai)

Built with obsession. Every pixel matters.
