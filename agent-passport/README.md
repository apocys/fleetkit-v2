# 🛂 Agent Passport

Portable identity card for AI agents. Your goals, working style, projects, and preferences — auto-injected into any agent context by SpawnKit.

## What is it?

Every time you spin up a new AI agent, it starts blank. You re-explain yourself, your projects, your preferences. Agent Passport solves this: one JSON file that travels with you across agents, tools, and platforms.

## Quick Start

```bash
# Extract a passport from existing OpenClaw USER.md + SOUL.md
node passport.js extract USER.md SOUL.md my-passport.json

# Import a passport into OpenClaw-compatible files
node passport.js import my-passport.json ./output/

# Validate a passport
node passport.js validate my-passport.json
```

## Schema

See [`schema.json`](schema.json) for the full JSON Schema (2020-12).

**Required fields:**
- `name` — how agents should address you
- `goals` — what you're working toward (at least 1)

**Optional fields:**
- `working_style` — communication tone, detail level, decision speed, feedback style, timezone
- `active_projects` — current projects with name, description, role, stack, repo
- `do_list` — things agents SHOULD do
- `dont_list` — things agents should NEVER do
- `expertise` — your domain knowledge (helps agents calibrate explanations)

## Example

```json
{
  "name": "Kira",
  "goals": [
    { "goal": "Launch SpawnKit v1", "priority": "high", "deadline": "2026-02-22" }
  ],
  "working_style": {
    "communication": "direct",
    "detail_level": "concise",
    "decision_speed": "fast"
  },
  "do_list": ["Be action-oriented", "Challenge my ideas"],
  "dont_list": ["Don't be generic", "Don't oversimplify"]
}
```

## How SpawnKit Uses It

1. **Onboarding:** 5-min chat generates your passport automatically
2. **Injection:** SpawnKit injects your passport into every agent's system prompt
3. **Portable:** Export your passport, share it, import it into any SpawnKit instance
4. **Evolving:** Passport updates as your goals and projects change

## Files

- `schema.json` — JSON Schema definition
- `passport.js` — CLI tool (extract / import / validate)
- `kira.json` — Example passport (hand-crafted)
