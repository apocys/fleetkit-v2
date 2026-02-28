# SpawnKit Executive Office — Page & Interaction Spec

> **URL:** https://app.spawnkit.ai/office-executive/
> **Last updated:** 2026-02-27

---

## 📑 Table of Contents

1. [Onboarding Flow (First Visit)](#1-onboarding-flow)
2. [Main View: Office Floor (Grid)](#2-main-view-office-floor)
3. [Main View: Hierarchy (Org Chart)](#3-main-view-hierarchy)
4. [CEO Office / Mission Control](#4-ceo-office--mission-control)
5. [Agent Detail Panel](#5-agent-detail-panel)
6. [Agent Wizard (New Agent)](#6-agent-wizard)
7. [Chat Panel](#7-chat-panel)
8. [Missions Panel](#8-missions-panel)
9. [Cron Jobs Panel](#9-cron-jobs-panel)
10. [Memory Panel](#10-memory-panel)
11. [Settings Panel](#11-settings-panel)
12. [Remote Offices Panel](#12-remote-offices-panel)
13. [Theme Picker](#13-theme-picker)
14. [Boardroom (Meeting)](#14-boardroom-meeting)
15. [Orchestration Panel](#15-orchestration-panel)
16. [Chat History (Unified)](#16-chat-history-unified)
17. [Activate Agent Modal (Legacy)](#17-activate-agent-modal)
18. [Mailbox Overlay (CEO Inbox)](#18-mailbox-overlay)
19. [Status Bar](#19-status-bar)

---

## 1. Onboarding Flow

**Trigger:** First visit (no `spawnkit-onboarded` in localStorage)  
**Overlay:** Full-screen glassmorphism overlay (z-index: 10000)  
**Module:** `onboarding.js`

### Beat 1 — Welcome
**Displayed:**
- SpawnKit logo/branding
- Welcome message: "Welcome to your Executive Office"
- Subtle animation

**Buttons:**
| Button | Expected Behavior |
|--------|------------------|
| (Auto-advance) | Transitions to Beat 2 after 3 seconds |
| Click anywhere | Skips timer, goes to Beat 2 immediately |
| Skip All | Marks onboarding complete, closes overlay, goes straight to Office Floor |

---

### Beat 2 — Quick Setup
**Displayed:**
- Progress dots (step 1 of 4 active)
- Section label: "Quick Setup"
- Title: "Make it yours"
- Subtitle: "Personalize your office in seconds."
- Input field: "What should we call you?" (user's name)
- Input field: "Name your CEO agent" (placeholder: "e.g. Atlas, Commander")

**Buttons:**
| Button | Expected Behavior |
|--------|------------------|
| **Continue →** | Saves name + CEO name to localStorage (`spawnkit-config`), transitions to Beat 2.5 (Channels). Disabled until name field is filled. |
| **Skip setup →** | Skips to Beat 2.5 (Channels) without saving config |

---

### Beat 2.5 — Connect Your Channels
**Displayed:**
- Progress dots (step 2 active)
- Title: "Connect Your Channels"
- 6 channel cards: Telegram, Signal, Discord, iMessage, Slack, WhatsApp
- Each card shows: icon, name, connection status ("Not connected")
- Cards animate in with stagger effect

**Buttons:**
| Button | Expected Behavior |
|--------|------------------|
| **Channel card click** | Opens mini-wizard for that channel (inline, within the overlay). Shows channel-specific setup steps (bot token for Telegram, phone for Signal, etc.) |
| **Continue →** | Advances to Beat 3 (First Mission) |
| **Skip for now →** | Skips to Beat 3 without connecting any channels |
| Mini-wizard **Back** | Returns to channel selection |
| Mini-wizard **Connect** | Saves channel config to localStorage, marks card as "Connected ✓" |

---

### Beat 3 — First Mission
**Displayed:**
- Progress dots (step 3 active)
- Title: "Your First Mission"
- Description of what missions are
- Input to type a first mission or suggested mission templates

**Buttons:**
| Button | Expected Behavior |
|--------|------------------|
| **Launch Mission →** | Saves mission, transitions to Beat 4 |
| **Skip →** | Advances to Beat 4 without creating a mission |

---

### Beat 4 — Feature Discovery
**Displayed:**
- Progress dots (step 4 active)
- Feature cards showing key capabilities (Chat, Missions, Skills, etc.)
- Cards animate in with stagger
- Final welcome message

**Buttons:**
| Button | Expected Behavior |
|--------|------------------|
| **Enter your Office →** | Sets `spawnkit-onboarded=true` in localStorage, closes overlay with fade animation, reveals the Office Floor. Restores hidden statusbar. |

---

## 2. Main View: Office Floor (Grid)

**Displayed:**
- Top bar with view toggle (Grid / Hierarchy) and clock
- 6 agent rooms in a grid layout:
  - **CEO Office** (large, center) — labeled with CEO name
  - **Atlas** (COO) — Operations
  - **Forge** (CTO) — Engineering
  - **Hunter** (CRO) — Revenue
  - **Echo** (CMO) — Marketing
  - **Sentinel** (QA) — Security
- **Boardroom** — Meeting room
- Each room shows: agent avatar (SVG), name, role, status dot (green/idle), current task
- Inactive agents show "🔒 Inactive" overlay with reduced opacity
- Status bar at bottom

**Buttons/Interactions:**
| Element | Expected Behavior |
|---------|------------------|
| **CEO room click** | Opens Mission Control (full-screen overlay) |
| **Agent room click (active)** | Opens Agent Detail Panel (right slide) |
| **Agent room click (inactive)** | Opens Agent Wizard (step-by-step: name → role → model) |
| **Boardroom click** | Opens Meeting/Boardroom overlay |
| **Grid tab** | Shows this grid view (default) |
| **Hierarchy tab** | Switches to org chart view |
| **Status bar buttons** | See [Status Bar](#19-status-bar) |

---

## 3. Main View: Hierarchy (Org Chart)

**Displayed:**
- Org chart layout with CEO at top
- C-level agents below in tree structure
- Each card shows: emoji/avatar, name, role, status
- Lines connecting CEO to reports
- Sub-agents shown under their parent

**Buttons/Interactions:**
| Element | Expected Behavior |
|---------|------------------|
| **CEO card click** | Opens Mission Control |
| **Agent card click** | Opens Agent Detail Panel |
| **Grid tab** | Switches back to floor grid view |

---

## 4. CEO Office / Mission Control

**Trigger:** Click CEO room or CEO card  
**Module:** `mission-control.js`, `mc-core.js`, `mc-center.js`, `mc-sidebar-left.js`, `mc-sidebar-right.js`  
**Overlay:** Full-screen with left sidebar, center content, right sidebar

**Displayed:**
- **Left sidebar:** Agent list, session list, navigation
- **Center:** Main content area (chat, task view, brainstorm)
- **Right sidebar:** Context panel (agent details, memory, crons)
- CEO avatar and status at top

**Buttons/Interactions:**
| Element | Expected Behavior |
|---------|------------------|
| **Chat input** | Send message to CEO agent via API |
| **Agent list item click** | Select agent, show their context in right panel |
| **New Mission button** | Create a new mission from Mission Control |
| **Close/Back button** | Returns to Office Floor |
| **Brainstorm button** | Opens brainstorm interface |

---

## 5. Agent Detail Panel

**Trigger:** Click on an active (non-CEO) agent room  
**Overlay:** Right-side slide panel  
**Module:** `main.js` → `openDetailPanel()`

**Displayed:**
- **Hero section:** Agent avatar (SVG or initial), name, role, current task
- **Status dot:** Green (active), Orange (busy), Gray (idle)
- **Metrics section:** Status, Tokens Used, API Calls, Last Active (fetched live from API)
- **Current Task:** From live TODO data
- **TODO List:** Items with status (done/pending) and icons
- **Sub-Agents section:** List of spawned sub-agents with model, tokens, time ago (fetched from API)
- **Skills section:** Skill chips with remove button (×)
- **Soul (Personality):** Excerpt from agent's SOUL.md (first 500 chars)

**Buttons/Interactions:**
| Element | Expected Behavior |
|---------|------------------|
| **Close (×)** | Closes detail panel |
| **Backdrop click** | Closes detail panel |
| **+ Add Skill** | Opens skill picker dropdown (12 built-in skills). Click a skill → adds it to agent |
| **Skill × button** | Removes that skill from agent |
| **✏️ Edit Agent** | Opens agent editor (for non-CEO agents) |
| **Sub-agent item click** | Could expand to show sub-agent details |

---

## 6. Agent Wizard (New Agent)

**Trigger:** Click on an inactive agent room  
**Module:** `agents.js` → `openAddAgentWizard()`  
**Overlay:** Center modal (z-index: 10001)

### Step 1 — Name & Identity
**Displayed:**
- Progress bar (3 steps, step 1 active)
- Title: "Step 1 — Name & Identity"
- Emoji picker (preset grid: 🤖🧠⚡🔥🎯💎🦊🐙🌟🚀🛸👾)
- Text input: emoji (left), name (right, placeholder: "Agent name e.g. Nexus")

**Buttons:**
| Button | Expected Behavior |
|--------|------------------|
| **Emoji button** | Sets emoji in the emoji input |
| **Continue →** | Saves name + emoji to wizard state, advances to Step 2. Disabled if name is empty. |

### Step 2 — Role
**Displayed:**
- Progress bar (step 2 active)
- Title: "Step 2 — Role"
- Subtitle: "What will [emoji] [name] do?"
- 10 role cards: TaskRunner ⚡, CodeBuilder 🛠️, Researcher 🔍, Analyst 📊, Writer ✍️, Designer 🎨, Security 🛡️, Operations ⚙️, Support 💬, Custom 🧩
- Each card shows: emoji, name, description
- Selected card has blue border highlight

**Buttons:**
| Button | Expected Behavior |
|--------|------------------|
| **Role card click** | Selects that role (highlights it, deselects others) |
| **Continue →** | Saves role, advances to Step 3. Disabled if no role selected. |
| **← Back** | Returns to Step 1 |

### Step 3 — Model
**Displayed:**
- Progress bar (step 3 active)
- Title: "Step 3 — Model"
- Model options: Claude Opus 4.6 (Premium), Claude Sonnet 4 (Recommended), Claude Haiku 4.5 (Fast), GPT-4o (Standard), GPT-4o Mini (Budget)
- Each option shows: name + tier badge

**Buttons:**
| Button | Expected Behavior |
|--------|------------------|
| **Model option click** | Selects that model |
| **Create Agent →** | Creates agent: adds to ACTIVE_AGENT_IDS, saves to localStorage, sends spawn request via API, removes "inactive" overlay from room, shows confirmation animation, closes wizard |
| **← Back** | Returns to Step 2 |

---

## 7. Chat Panel

**Trigger:** Click 💬 Chat button in status bar  
**Module:** `main.js` (chat tab section)  
**Overlay:** Right-side slide panel

**Displayed:**
- Header: "Chat" with target selector and history button
- Chat target dropdown (CEO, specific agents)
- Message history: user messages (right-aligned) + AI responses (left-aligned)
- Empty state: "Send a message to start chatting"
- Chat input bar at bottom (text input + send button)
- Typing indicator: animated bouncing dots (●●●) when waiting for response

**Buttons/Interactions:**
| Element | Expected Behavior |
|---------|------------------|
| **Send button (→)** | Sends message to selected target via `/api/oc/chat`. Shows typing dots. Displays response when received. |
| **Enter key** | Same as send button |
| **Target dropdown** | Switches chat target (CEO, Atlas, Forge, etc.) |
| **📜 History button** | Opens unified chat history overlay |
| **Close (×)** | Closes chat panel |
| **Backdrop click** | Closes chat panel |

---

## 8. Missions Panel

**Trigger:** Click 🎯 Missions button in status bar  
**Module:** `main.js` → missions section  
**Overlay:** Right-side slide panel

**Displayed:**
- Header: "Missions"
- Mission list with status (active/completed/failed)
- Each mission shows: title, assigned agent(s), progress, timestamps
- Empty state if no missions
- New mission form (expandable)

**Buttons/Interactions:**
| Element | Expected Behavior |
|---------|------------------|
| **+ New Mission** | Expands mission creation form (title, description, target agent) |
| **🚀 Launch** | Creates new mission via API, adds to mission list, collapses form |
| **Cancel** | Collapses new mission form without saving |
| **Mission item click** | Expands to show mission details, TODO items, assigned agents |
| **Close (×)** | Closes missions panel |

---

## 9. Cron Jobs Panel

**Trigger:** Click ⏱ Cron button in status bar  
**Module:** `main.js` → cron section  
**Overlay:** Right-side slide panel

**Displayed:**
- Header: "Cron Jobs"
- List of scheduled jobs fetched from `/api/oc/crons`
- Each job shows: name, schedule (human readable), status (enabled/disabled), last run time
- Empty state: "No cron jobs configured"

**Buttons/Interactions:**
| Element | Expected Behavior |
|---------|------------------|
| **Job item click** | Expands to show job details (schedule, payload, run history) |
| **Enable/Disable toggle** | Toggles job enabled state via API |
| **Run Now** | Triggers immediate job execution |
| **Close (×)** | Closes cron panel |

---

## 10. Memory Panel

**Trigger:** Click 🧠 Memory button in status bar  
**Module:** `main.js` → memory section  
**Overlay:** Right-side slide panel

**Displayed:**
- Header: "Memory"
- Memory content from `/api/oc/memory` (MEMORY.md rendered)
- Sections with collapsible headers
- Search/filter functionality

**Buttons/Interactions:**
| Element | Expected Behavior |
|---------|------------------|
| **Section header click** | Toggles section collapse/expand |
| **Close (×)** | Closes memory panel |

---

## 11. Settings Panel

**Trigger:** Click ⚙️ Settings button in status bar  
**Module:** `main.js` → `renderSettings()`  
**Overlay:** Right-side slide panel (z-index: 10001 when open)

**Displayed:**
- Header: "Settings"
- 4 sections:

### 🔑 API Keys
- API key input field (masked)
- Save/validate button
- Connection status indicator

### ⚡ Available Skills
- List of installed skills from `/api/oc/config`
- Each skill shows: name, description, enabled status
- Skills catalog link

### 🎨 Appearance (NEW)
- Color scheme toggle: Dark mode / Light mode
- Accent color picker: 6 color options (Blue, Purple, Green, Orange, Pink, Red)
- Font size: Small / Medium / Large

### 🏡 Village Profile
- Village/office name
- CEO agent name
- Description

**Buttons/Interactions:**
| Element | Expected Behavior |
|---------|------------------|
| **Dark/Light toggle** | Switches color scheme, saves to localStorage |
| **Accent color click** | Applies accent color to CSS variables, saves preference |
| **Font size click** | Changes base font size, saves preference |
| **Save API Key** | Validates and saves API key |
| **Close (×)** | Closes settings panel |

---

## 12. Remote Offices Panel

**Trigger:** Click 🌐 Remote button in status bar  
**Module:** `main.js` → remote section  
**Overlay:** Right-side slide panel

**Displayed:**
- Header: "Remote Offices"
- List of connected remote gateways
- Each remote shows: name, URL, health status (🟢/🔴), last heartbeat
- Add new remote form
- Empty state: "No remote offices connected"

**Buttons/Interactions:**
| Element | Expected Behavior |
|---------|------------------|
| **+ Add Remote** | Shows form to add gateway URL + credentials |
| **Connect** | Tests connection to gateway, adds to list if successful |
| **Remote item click** | Shows remote details, connected agents |
| **Health check** | Pings remote gateway, updates status |
| **Remove** | Disconnects and removes remote office |
| **Close (×)** | Closes remote panel |

---

## 13. Theme Picker

**Trigger:** Click 🎨 Theme button in status bar  
**Module:** `main.js` → theme picker  
**Overlay:** Center modal

**Displayed:**
- Theme grid with preview cards:
  - Executive (current)
  - Medieval Castle
  - SimCity / Natural Kit
  - Village Illustrated
  - Modern
- Each card shows: theme name, small preview, description

**Buttons/Interactions:**
| Element | Expected Behavior |
|---------|------------------|
| **Theme card click** | Navigates to that theme's URL (e.g., `/office-medieval/`) |
| **Close (×)** | Closes theme picker |
| **Backdrop click** | Closes theme picker |

---

## 14. Boardroom (Meeting)

**Trigger:** Click Boardroom room in grid  
**Module:** `main.js` → meeting overlay  
**Overlay:** Center/right panel

**Displayed:**
- Header: "Active Boardroom"
- Meeting agenda / brainstorm topics
- Participant list (which agents are in the meeting)
- Meeting notes / transcript area
- Empty state when no active meetings

**Buttons/Interactions:**
| Element | Expected Behavior |
|---------|------------------|
| **← Back** | Closes meeting panel, returns to floor |
| **Close (×)** | Closes meeting panel |

---

## 15. Orchestration Panel

**Trigger:** Accessed via internal navigation or orchestration button  
**Module:** `orchestration.js`  
**Overlay:** Right-side slide panel

**Displayed:**
- Header: "Orchestration"
- Workflow/pipeline visualization
- Active orchestration runs
- Agent assignment and task routing

**Buttons/Interactions:**
| Element | Expected Behavior |
|---------|------------------|
| **Pipeline step click** | Shows step details |
| **Close (×)** | Closes orchestration panel |

---

## 16. Chat History (Unified)

**Trigger:** Click 📜 History button in Chat panel  
**Module:** `main.js` → `openChatHistory()`  
**Overlay:** Full modal

**Displayed:**
- Header: "Chat History"
- Unified timeline from all channels (Telegram, Signal, WhatsApp, SpawnKit)
- Each message shows: sender, channel badge, timestamp, content
- Channel filter tabs
- Search functionality
- Scroll to load more

**Buttons/Interactions:**
| Element | Expected Behavior |
|---------|------------------|
| **Channel tab** | Filters messages to that channel only |
| **Search** | Filters messages by text content |
| **Message click** | Could expand to show full context |
| **Close (×)** | Closes history overlay |
| **Backdrop click** | Closes history overlay |

---

## 17. Activate Agent Modal (Legacy)

**Trigger:** Fallback when `openAddAgentWizard` is unavailable  
**Module:** `main.js` → `openActivateModal()`  
**Overlay:** Center modal

**Displayed:**
- Header: "Activate Agent" with agent name
- Step 1: Skill picker with recommended + all skills as chips
- Counter: "Selected: 0/3" (max 3 skills)
- Step 2: Confirmation with skill list

**Buttons/Interactions:**
| Element | Expected Behavior |
|---------|------------------|
| **Skill chip click** | Toggles selection (max 3). Selected = blue border + check. Disabled when max reached. |
| **Activate →** | Spawns agent session via API, adds to ACTIVE_AGENT_IDS, shows confirmation |
| **Start a Conversation →** (Step 2) | Opens chat panel targeting the activated agent |
| **Cancel / Close** | Closes modal without activating |

---

## 18. Mailbox Overlay (CEO Inbox)

**Trigger:** Click CEO avatar or mailbox indicator  
**Module:** `main.js` → mailbox section  
**Overlay:** Center/right panel

**Displayed:**
- Header: "CEO Communications"
- Message timeline (cross-channel inbox)
- Unread count badge
- Each message: sender, channel, timestamp, preview
- Empty state when no messages

**Buttons/Interactions:**
| Element | Expected Behavior |
|---------|------------------|
| **Message click** | Expands full message content |
| **Reply** | Opens chat panel with reply context |
| **Mark as read** | Clears unread badge for that message |
| **Close (×)** | Closes mailbox overlay |

---

## 19. Status Bar

**Location:** Fixed bottom bar  
**Module:** `main.js`, `index.html`  
**Always visible** (except during onboarding)

**Displayed:**
- Left: Clock + system status
- Center/Right: Action buttons

**Buttons:**
| Button | Icon | Expected Behavior |
|--------|------|------------------|
| **Missions** | 🎯 | Opens Missions Panel |
| **Cron** | ⏱ | Opens Cron Jobs Panel |
| **Memory** | 🧠 | Opens Memory Panel |
| **Chat** | 💬 | Opens Chat Panel |
| **Settings** | ⚙️ | Opens Settings Panel |
| **Remote** | 🌐 | Opens Remote Offices Panel |
| **Themes** | 🎨 | Opens Theme Picker |
| **Add Agent** | ➕ | Opens Agent Wizard (currently hidden) |

---

## 🔧 Known Issues & Fixes Applied

| Issue | Status | Fix |
|-------|--------|-----|
| Settings popup blocked by onboarding overlay z-index | ✅ Fixed | Settings gets z-index 10001 when open |
| Agent Wizard not opening (old skill picker shown instead) | ✅ Fixed | `openAddAgentWizard` exported to window, inactive room click routes to wizard |
| Typing dots not animated | ✅ Fixed | Added CSS `@keyframes typingBounce` animation |
| Skip Setup button tiny touch target | ✅ Fixed | Increased padding to 12px 20px, added tap highlight |
| Add Agent Overlay z-index too low | ✅ Fixed | Bumped from 300 to 10001 |
| Statusbar clickable during onboarding | ✅ Fixed | Hidden during onboarding, restored on complete |

---

*Document auto-generated by ApoMac — SpawnKit Executive Office v4*
