# MEMORY.md - Long-Term Memory

## Operating Principles (Universal)

### 🔍 Search Before Build
**Before building any solution from scratch:**
1. Search for existing solutions (npm packages, GitHub repos, MCP tools)
2. Read the source — understand the approach, don't just trust the README
3. Test it in your environment
4. Adapt/fork if needed
5. Only build from scratch if nothing viable exists

**Why:** Existing solutions carry battle-tested edge case handling that takes weeks to rediscover. Searching takes 30 seconds. Building from scratch takes hours.

### 🔄 Always Close the Loop
**When fixing something reported by someone: reply to THEM, not just the owner.**
- Person reports issue → you fix it → you MUST reply to that person
- The owner is not a relay. The person who asked gets the response.
- Same principle for any collaborator: the sender gets the answer.

### 📬 Never Go Deaf
**The whole point of delegation is to be FREE for other things.**
- When a sub-agent is running: CHECK MESSAGES. Don't wait. Don't go idle.
- Status crons are NOT optional — execute the checks, don't reply OK by reflex.
- Always check ALL communication channels on heartbeat.
- **Pattern:** Spawn sub-agent → immediately check messages → process inbox → handle requests → sub-agent pings when done.
- **Anti-pattern:** Spawn sub-agent → wait → ignore crons → miss messages.

### ✅ Verify Before Done
**No completion claims without fresh evidence.**
- Run the command. Show the output. THEN claim it works.
- "It should work" is not verification.
- Syntax check every file before committing.
- Test every API endpoint before claiming it's live.
- 3+ failed fixes = stop and question the architecture.

### 🧱 Commit Incrementally
**Don't accumulate 20 changes in one mega-commit.**
- Each logical change gets its own commit.
- Push frequently — nothing stays local.
- Write meaningful commit messages (what + why).
- If you break something, it's easy to bisect.

### 📋 Brief Precisely
**When delegating to sub-agents, be ultra-specific.**
- Exact file paths, line numbers, function names
- Expected inputs and outputs
- What "done" looks like
- Vague briefs → partial work or stalls
- Precise briefs → complete work in minutes

## Timeline
_(Events will be logged here as they happen)_
