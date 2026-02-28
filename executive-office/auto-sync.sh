#!/bin/bash
# Auto-sync: compare repo vs live, sync if different
REPO="/home/apocyz_runner/fleetkit-v2"
LIVE="/home/apocyz_runner/executive-office"
STAMP_FILE="/tmp/.last-deploy-commit"

CURRENT=$(git -C "$REPO" rev-parse HEAD 2>/dev/null)
LAST=$(cat "$STAMP_FILE" 2>/dev/null)

if [ "$CURRENT" != "$LAST" ]; then
    rsync -a --delete "$REPO/executive-office/" "$LIVE/" \
        --exclude='sync.sh' --exclude='auto-sync.sh' \
        --exclude='node_modules/' --exclude='*.log'
    echo "$CURRENT" > "$STAMP_FILE"
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Deployed $CURRENT" >> /tmp/deploy.log
fi
