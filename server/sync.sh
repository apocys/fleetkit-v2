#!/bin/bash
# Full sync from git repo to live server — ALWAYS use --delete
# This script should be the ONLY way to deploy changes

set -e

REPO="/home/apocyz_runner/fleetkit-v2"
LIVE="/home/apocyz_runner/executive-office"

echo "🔄 Syncing repo → live server..."

# Sync each directory with --delete to remove stale files
rsync -av --delete "$REPO/executive-office/" "$LIVE/" --exclude='sync.sh'
rsync -av --delete "$REPO/lib/" "$LIVE/lib/"
rsync -av --delete "$REPO/office-medieval/" "$LIVE/office-medieval/"
rsync -av --delete "$REPO/office-simcity-nature/" "$LIVE/office-simcity-nature/" 2>/dev/null || true

echo "✅ Sync complete — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
