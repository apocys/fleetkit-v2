# Executive Office V4 — Kira's Feedback Fixes

## File: /Users/apocys/.openclaw/workspace/fleetkit-v2/office-executive/index.html (7046 lines)

## Issues to Fix (priority order)

### 1. CRON TIMER — Show countdown to next action
- In the Sessions tab, each cron tile should display a countdown timer ("Next in 4m 32s")
- Each cron tile should be clickable → expand to show session details + TODO

### 2. ADD AGENT WIZARD — Role selection scroll bug
- When selecting a role in step 2, the list scrolls up and hides the selection
- Fix: auto-scroll to selected item, or keep viewport stable after selection
- Also: the role list container should have overflow-y:auto with proper height

### 3. ADD AGENT WIZARD — Model list outdated
- Shows "Opus 4" instead of "Opus 4.6" (claude-opus-4-6)
- Update model list to current: Opus 4.6, Sonnet 4, Haiku 4.5, etc.

### 4. NEW AGENT TILE — Not clickable
- After creating an agent via wizard, the new tile appears but clicking does nothing
- Should open the agent detail panel (same as existing agents)

### 5. ADD SKILL — Notification only, skill not added to list
- When adding a skill to an agent, shows a toast but doesn't persist in the agent's skill list
- Skills should come from global skill list (available_skills from OpenClaw config)
- Future: marketplace integration (clawhub.com)

### 6. AGENT PANEL — Metrics not connected
- Agent detail panel shows Metrics section but values are static/empty
- Should show: tasks completed, uptime, token usage, etc.

### 7. AGENT PANEL — Current task not shown
- No indication of what the agent is currently working on
- Should show active task name + progress

### 8. AGENT PANEL — Sub-agents not visible
- If an agent has spawned sub-agents, they should be listed in its panel
- Clickable → navigate to sub-agent panel

### 9. ORCHESTRATION CENTER — "Main.coordinator-01" unclear
- Sub-agent names like "Main.coordinator-01" are confusing
- Show human-readable names, or at least explain the naming convention
- Consider: don't show internal coordinator names in the UI

### 10. FLEET GRID — Click agent → navigate to panel
- Clicking an agent tile in the fleet grid should open its detail panel
- Currently some tiles might not have click handlers

### 11. ORCHESTRATION — Skills list is read-only
- Skills are listed but can't be managed (add/remove/configure)
- Need a proper "Skill Center" with:
  - Browse available skills
  - Add new skills (great UX, wizard-style for basic users)
  - Configure skill settings
  - Future: install from marketplace

### 12. CEO AGENT — Special status
- CEO (main agent) should be visually distinct — cannot be decommissioned
- Clearly labeled as orchestrator
- Can do work directly OR delegate to team

### 13. C-LEVEL AGENTS — Can spawn sub-agents
- Each C-level agent can spawn sub-agents (their key capability)
- This should be visible in the UI (spawn button, sub-agent tree)

### 14. MISSIONS — Task management system
- CEO creates missions via chat
- Mission = project with its own TODO list
- CEO mobilizes team/agents for missions
- Each agent has its own TODO list
- Agents can have multiple parallel tasks
- If overloaded → C-level spawns a sub-agent to delegate
- All of this should be visible in the UI

### 15. SUB-AGENT DETAIL — Full history + TODO
- Clicking a sub-agent shows full conversation history
- Shows TODO with item status (pending/in-progress/done/blocked)

### 16. CRON TILES — Clickable
- Each cron/session tile should be clickable
- Shows session details, TODO, history
