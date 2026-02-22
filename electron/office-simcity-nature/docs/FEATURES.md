# SpawnKit SimCity Theme — Feature Guide

## 🏗️ Isometric World Engine

### Tile System
- **20×20 grid** using diamond-shaped isometric tiles
- Ground types: grass (default) and path (road network)
- Objects placed on tiles: tents, trees, campfire, logs, signs, flowers, crops, fences
- Deterministic map generation using seeded RNG for consistent layouts

### Rendering Pipeline
1. Ground tiles rendered back-to-front (painter's algorithm)
2. Objects and characters sorted by row for correct depth
3. Characters rendered with warm sepia tint for visual cohesion
4. Speech bubbles rendered above characters

## 🧑‍💻 Agent Character System

### 6 Unique Characters
Each agent is mapped to a Kenney Mini Character with full animation sets:
- **ApoMac (CEO)** → `character-male-a`
- **Forge (CTO)** → `character-male-c`
- **Hunter (CRO)** → `character-male-d`
- **Atlas (COO)** → `character-female-a`
- **Echo (CMO)** → `character-female-c`
- **Sentinel (Security)** → `character-male-e`

### Animation Details
- **8 frames** per animation (idle + walk)
- **4 directions** (NE, NW, SE, SW)
- Characters face movement direction automatically
- Idle animation plays when agent is at their station

## 🧠 Behavior AI

### State Machine
Each agent runs through these states:

| State | Description | Duration |
|-------|-------------|----------|
| `WORKING` | Idle at home tent | 5-15 seconds |
| `WALKING_TO_POI` | Walking to campfire or another agent | Path-dependent |
| `AT_CAMPFIRE` | Socializing at village center | 5-13 seconds |
| `WALKING_TO_AGENT` | Heading to visit a colleague | Path-dependent |
| `MEETING` | Chatting with another agent | 4-10 seconds |
| `RETURNING` | Walking back to home tent | Path-dependent |

### BFS Pathfinding
- Agents use breadth-first search on the path tile network
- 8-directional movement (including diagonals)
- Automatic nearest-path-tile finding for off-road starts
- Smooth interpolation along waypoints

### Speech Bubbles
- **Work bubbles** — Role-specific messages (e.g., Forge: "⌨️ Refactoring...")
- **Social bubbles** — Generic socializing at campfire (e.g., "☕ Coffee break!")
- **Collaboration bubbles** — Meeting-specific dialogue
- **Emotion emojis** — Floating emoji reactions during interactions
- Bubbles have fade-in/fade-out animations

## 🗺️ Map Elements

### Structures
- 6 agent tents (one per agent)
- Campfire with stone ring and log seating
- Sign posts near paths

### Vegetation
- Dense forest borders (trees, fall trees)
- Flower patches (red, yellow, purple variants)
- Crop fields (pumpkins, carrots, melons, turnips)
- Mushroom clusters
- Bushes and stumps

### Terrain Features
- Connected path network for agent navigation
- Fence lines in garden areas
- Log stacks near tents
- Rocks and stones scattered naturally

## 📊 Interactive Panels

### Agent Detail Panel
- Agent avatar, name, role, and current task
- Performance metrics grid (tasks, uptime, etc.)
- Skill chips with proficiency indicators
- TODO list with done/in-progress/pending items
- SOUL text (agent personality description)

### Chat Panel
- Multi-agent routing dropdown (send to CEO, Atlas, Forge, etc.)
- Real-time message display with user/system styling
- Timestamp on messages
- Keyboard shortcuts for quick sending

### Status Bar Features
- Live agent count
- Village uptime timer
- Real-time clock
- Quick-access buttons: Missions, Crons, Memory, Chat, Settings
- Command input bar for direct agent interaction

## 🎮 Camera Controls
- **Pan**: Click and drag anywhere on the canvas
- **Zoom**: Scroll wheel or +/- buttons (0.3x to 3.0x range)
- **Reset**: Home button returns to default view
- Cursor changes to grab/grabbing during pan
