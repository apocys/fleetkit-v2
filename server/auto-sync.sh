#!/bin/bash
# Auto-sync: pull latest from GitHub, compare repo vs live, sync if different
REPO="/home/apocyz_runner/spawnkit"
LIVE="/home/apocyz_runner/spawnkit-server"
STAMP_FILE="/tmp/.last-deploy-commit"

# Pull latest from origin (fast-forward only, silent)
git -C "$REPO" pull --ff-only origin main --quiet 2>/dev/null

CURRENT=$(git -C "$REPO" rev-parse HEAD 2>/dev/null)
LAST=$(cat "$STAMP_FILE" 2>/dev/null)

if [ "$CURRENT" != "$LAST" ]; then
    rsync -a --delete "$REPO/server/" "$LIVE/" \
        --exclude='sync.sh' --exclude='auto-sync.sh' \
        --exclude='node_modules/' --exclude='*.log'
    echo "$CURRENT" > "$STAMP_FILE"
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Deployed $CURRENT" >> /tmp/deploy.log
    
    # Restart server to pick up changes
    systemctl --user restart spawnkit-server.service 2>/dev/null || true
fi
