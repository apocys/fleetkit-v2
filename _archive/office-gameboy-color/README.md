# SpawnKit v2 - GameBoy Virtual Office 🎮

**VERSION A: GameBoy Office** - A retro-styled virtual office with interactive mission mechanics, inspired by classic GameBoy RPGs.

## 🎨 Visual Style

### GameBoy Green Monochrome Palette
- **Lightest**: `#9BBB0F` - Text, highlights, progress bars
- **Light**: `#8BAC0F` - Character sprites, UI elements  
- **Dark**: `#306230` - Backgrounds, furniture
- **Darkest**: `#0F380F` - Borders, shadows, text outlines

### Retro Aesthetic Features
- ✅ **Chunky pixel borders** (2-3px thick on everything)
- ✅ **Dot matrix background texture** (subtle 4x4 grid pattern)
- ✅ **4-shade dithering** for graphics depth
- ✅ **Pixelated fonts** (Press Start 2P)
- ✅ **No anti-aliasing** - crisp pixel art rendering

## 🎯 Interactive Mission System

### Mission Flow (GameBoy RPG Style)
1. **Mission Assignment**: Kira gives a new task
2. **CEO Briefing**: Hunter walks to the mission board and writes the task
3. **Team Gathering**: Agents pathfind to surround the whiteboard
4. **Task Breakdown**: Floating text bubbles show individual assignments
5. **Execution**: Agents scatter to workstations with progress bars
6. **Sub-agent Spawning**: Smaller "stagiaire" characters carry documents between agents
7. **Completion**: Team celebration with GameBoy-style confetti

### Mission Board UI
- Real-time progress tracking in retro panel
- Priority indicators (URGENT, HIGH, MEDIUM)
- Multiple concurrent missions support
- Auto-generated subtasks

## 🏢 Office Elements (GameBoy Style)

### Interactive Locations
- **📋 Mission Board** (center-left) - Displays active tasks as pixelated text
- **📮 Mailbox** (corner) - Flashes green when heartbeats/notifications arrive
- **☎️ Phone/Alarm** (wall) - Rings (visual pulse) for cron jobs, shows schedules
- **☕ Coffee Station** (corner) - Animated steam, agents visit for energy
- **🗃️ File Cabinets** - Agents walk here when "searching memory"
- **👥 Meeting Room** (center) - Collaborative space for group discussions

### Character Interactions
- **Sub-agents spawn** as smaller characters at the bottom edge
- **Document carrying** - visible file icons move between agents
- **Speech bubbles** with GameBoy-style chunky borders
- **Celebration animations** - jumping with retro confetti particles
- **Working animations** - subtle bobbing, progress bars above desks

## 🎮 Controls & Features

### Keyboard Controls
- **M** - Trigger group meeting
- **C** - Team celebration  
- **W** - Whiteboard planning session
- **I** - Enable click-to-move interaction
- **S** - Show detailed system status
- **X** - Add urgent custom mission
- **Z** - Save office state

### Cheat Codes (GameBoy Style)
- **Ctrl+K** - Konami Code (spawn extra agents)
- **Ctrl+M** - Matrix formation mode
- **Ctrl+R** - Rainbow color cycle

### Interactive Elements
- Click on office locations to trigger events
- Click on empty spaces to move characters
- Mission panel updates in real-time
- Auto-save every 30 seconds

## 🤖 Character States & Behaviors

### Main Agents (5 Characters)
- **Hunter** (CEO) - Gold theme, leads missions
- **Forge** (CTO) - Green theme, handles technical tasks
- **Echo** (CMO) - Dark green theme, manages marketing/planning
- **Atlas** (Data) - Green theme, processes information
- **Sentinel** (Security) - Dark green theme, monitors systems

### Character States
- `working_at_desk` - Focused work with progress bars
- `going_to_meeting` - Pathfinding to meeting room
- `in_meeting` - Collaborative discussion
- `getting_coffee` - Energy restoration break
- `celebrating` - Success moments with bouncing
- `thinking` - Deep contemplation pose
- `searching_files` - Memory/data retrieval

### Sub-Agents (Stagiaires)
- Smaller scale characters (0.7x)
- Carry visible document icons
- Move between main agents during missions
- Auto-cleanup after task completion

## 🔄 Event System

### Heartbeat Events
- Mailbox flashes when notifications arrive
- Characters check mail and return to work
- Integrates with OpenClaw session data

### Cron Job Events  
- Phone/alarm rings (visual pulse effect)
- Sentinel typically handles scheduled tasks
- Shows time-sensitive activities

### Mission Events
- Auto-generated every 45-75 seconds
- Variety of tech-focused tasks
- Priority-based queue system
- Progress tracking and completion rewards

## 🛠️ Technical Implementation

### Architecture
- **`gameboy-office.js`** - Main engine with retro effects
- **`gameboy-map.js`** - Isometric office layout with GameBoy styling
- **`gameboy-characters.js`** - Retro character sprites and animations
- **`gameboy-state-bridge.js`** - Mission system and event simulation

### GameBoy Effects
- Dot matrix background pattern
- Subtle screen flicker (every 2 seconds)
- Chunky pixel borders on all elements
- Authentic 4-color dithering patterns
- Nearest neighbor scaling (no blur)

### Performance
- 60 FPS target with delta timing
- Efficient sprite rendering
- Background process management
- Auto-cleanup of completed elements

## 🎯 Quality Bar Achieved

**"Managing a team in a GameBoy RPG"** ✅

The office feels like commanding a party in a classic RPG:
- **Charming retro aesthetic** with authentic GameBoy palette
- **Purposeful character movement** driven by missions
- **Interactive mission mechanics** that feel like quest management  
- **Visual feedback systems** (progress bars, celebrations, notifications)
- **Engaging team dynamics** with sub-agents carrying information

## 🚀 Usage

1. Open `index.html` in any modern browser
2. Watch the startup sequence initialize
3. Characters begin autonomous activities
4. Missions auto-generate every 45-75 seconds
5. Use keyboard controls to trigger events
6. Click on office elements for interactions

## 🔮 Future Enhancements

- **Real OpenClaw integration** - Live session data
- **Sound effects** - GameBoy-style chiptune audio
- **Save/load campaigns** - Persistent mission progress
- **Character customization** - Different sprite sets
- **Expanded office layouts** - Multiple rooms/floors

---

**Built with love for the retro gaming aesthetic** 🎮💚

*Experience the nostalgia of managing your AI team like it's 1989.*