#!/bin/bash
# SpawnKit GameBoy Live Data — Integration Test
# Run after all 3 Forge sub-agents complete

set -e

echo "=== SPAWNKIT GAMEBOY LIVE DATA TEST ==="
echo ""

# 1. Check all files exist and have content
echo "--- File Integrity ---"
for f in \
  office-gameboy/index.html \
  office-gameboy/gameboy-office.js \
  office-gameboy/gameboy-map.js \
  office-gameboy/gameboy-characters.js \
  office-gameboy/gameboy-state-bridge.js \
  office-gameboy/gameboy-effects.js \
  office-gameboy/gameboy-mission-adapter.js \
  src/data-bridge.js; do
  if [ -f "$f" ]; then
    lines=$(wc -l < "$f")
    echo "  ✅ $f ($lines lines)"
  else
    echo "  ❌ $f MISSING"
  fi
done

echo ""
echo "--- Data Bridge: spawnkitAPI Integration ---"
grep -c "spawnkitAPI" src/data-bridge.js
echo "  ^ spawnkitAPI references (should be >3)"
grep -c "getAll\|getSessions\|getCrons" src/data-bridge.js
echo "  ^ API call references (should be >2)"
grep -c "data:refresh\|agent:status\|subagent:spawn" src/data-bridge.js
echo "  ^ event firing (should be >2)"

echo ""
echo "--- State Bridge: Data Format Expectations ---"
grep -c "agents\|missions\|subagents\|crons" office-gameboy/gameboy-state-bridge.js
echo "  ^ data field references"
grep -c "currentTask\|status\|progress" office-gameboy/gameboy-state-bridge.js
echo "  ^ status field references"

echo ""
echo "--- Map: Named Locations ---"
grep -c "missionBoard\|phoneAlarm\|coffeeMachine\|serverRoom\|meetingRoom" office-gameboy/gameboy-map.js
echo "  ^ location references (should be >3)"

echo ""
echo "--- Characters: Role Matching ---"
grep -c "CRO\|CTO\|CMO\|COO\|Auditor\|CEO" office-gameboy/gameboy-characters.js
echo "  ^ role references"

echo ""
echo "--- No Stale References ---"
grep -c "FleetKit\|fleetkit" office-gameboy/*.js src/data-bridge.js 2>/dev/null || echo "0"
echo "  ^ FleetKit refs (MUST be 0)"
grep -c "global\." src/data-bridge.js 2>/dev/null || echo "0"
echo "  ^ global. refs in data-bridge (MUST be 0)"

echo ""
echo "--- DOM Elements in index.html ---"
for id in gameContainer pokeText wildEncounter currentMissions missionPanelTitle; do
  grep -q "$id" office-gameboy/index.html && echo "  ✅ #$id found" || echo "  ❌ #$id MISSING"
done

echo ""
echo "--- Script Loading Order ---"
grep 'script src' office-gameboy/index.html | head -15

echo ""
echo "=== TEST COMPLETE ==="
