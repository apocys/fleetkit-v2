#!/bin/bash
# SpawnKit Deploy Script — safe deploy from repo to production
# Safety features: branch protection, backup, health check, rollback, logging
set -euo pipefail

REPO="/home/apocyz_runner/spawnkit"
DEPLOYED="/home/apocyz_runner/spawnkit-server"
DEPLOY_LOG="$HOME/deploy-history.log"
MAX_BACKUPS=3
HEALTH_TIMEOUT=30
FORCE=false

# Parse args
[[ "${1:-}" == "--force" ]] && FORCE=true

cd "$REPO"

# ── 1. Branch Protection ──
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" != "main" && "$FORCE" == "false" ]]; then
  echo "❌ Refusing to deploy from branch '$BRANCH'. Use --force to override."
  exit 1
fi

if [[ -n "$(git status --porcelain)" && "$FORCE" == "false" ]]; then
  echo "❌ Uncommitted changes detected. Commit or stash first, or use --force."
  exit 1
fi

# Pull latest
git pull origin main --ff-only 2>/dev/null || {
  echo "⚠️  git pull failed (non-fast-forward). Deploying current HEAD."
}

COMMIT=$(git rev-parse --short HEAD)
DEPLOY_START=$(date +%s)
echo "🚀 Deploying commit $COMMIT from branch $BRANCH..."

# ── 2. Pre-deploy Backup ──
BACKUP_TS=$(date +%s)
if [[ -d "$DEPLOYED" ]]; then
  echo "📦 Creating backup..."
  cp -r "$DEPLOYED" "${DEPLOYED}.bak.${BACKUP_TS}"
  
  # Keep only last N backups
  BACKUPS=($(ls -dt "${DEPLOYED}.bak."* 2>/dev/null || true))
  if (( ${#BACKUPS[@]} > MAX_BACKUPS )); then
    for OLD in "${BACKUPS[@]:$MAX_BACKUPS}"; do
      echo "🗑️  Removing old backup: $(basename $OLD)"
      rm -rf "$OLD"
    done
  fi
fi

# ── 3. Deploy (rsync from repo) ──
echo "📁 Syncing Server (core)..."
rsync -a --delete --exclude='sync.sh' --exclude='restart.sh' "$REPO/server/" "$DEPLOYED/"
echo "📁 Syncing Executive..."
rsync -a --delete "$REPO/office-executive/" "$DEPLOYED/office-executive/"
echo "📁 Syncing Medieval..."
rsync -a --delete "$REPO/office-medieval/" "$DEPLOYED/office-medieval/" 2>/dev/null || true
echo "📁 Syncing SimCity..."
rsync -a --delete "$REPO/office-simcity/" "$DEPLOYED/office-simcity/" 2>/dev/null || true

# Copy root files
[[ -f "$REPO/index.html" ]] && cp "$REPO/index.html" "$DEPLOYED/index.html"
[[ -f "$REPO/server.js" ]] && cp "$REPO/server.js" "$DEPLOYED/server.js"

# ── 4. Health Check + Rollback ──
echo "🏥 Health check..."
HEALTH_OK=false
for i in $(seq 1 3); do
  if curl -sf --max-time "$HEALTH_TIMEOUT" "http://localhost:8765/health" > /dev/null 2>&1; then
    HEALTH_OK=true
    break
  fi
  sleep 2
done

if [[ "$HEALTH_OK" == "false" ]]; then
  echo "❌ Health check FAILED after deploy!"
  
  # Rollback from latest backup
  LATEST_BACKUP=$(ls -dt "${DEPLOYED}.bak."* 2>/dev/null | head -1)
  if [[ -n "$LATEST_BACKUP" ]]; then
    echo "🔄 Rolling back from $LATEST_BACKUP..."
    rm -rf "$DEPLOYED"
    mv "$LATEST_BACKUP" "$DEPLOYED"
    echo "⚠️  Rollback complete."
  fi
  
  # Notify via fleet relay
  curl -s -X POST "http://localhost:18790/api/fleet/message" \
    -H 'Authorization: Bearer sk-fleet-2ad53564b03d9facbe3389bb5c461179ffc73af12e50ae00' \
    -H 'Content-Type: application/json' \
    -d "{\"from\":\"sycopa\",\"to\":\"apomac\",\"subject\":\"DEPLOY FAILED\",\"text\":\"Deploy of $COMMIT FAILED — health check failed. Rolled back.\",\"priority\":\"high\"}" \
    > /dev/null 2>&1 || true
  
  DEPLOY_END=$(date +%s)
  DURATION=$((DEPLOY_END - DEPLOY_START))
  echo "$( date -u +%Y-%m-%dT%H:%M:%SZ) | $COMMIT | FAILED+ROLLBACK | ${DURATION}s" >> "$DEPLOY_LOG"
  exit 1
fi

# ── 5. Deploy Log ──
DEPLOY_END=$(date +%s)
DURATION=$((DEPLOY_END - DEPLOY_START))
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | $COMMIT | SUCCESS | ${DURATION}s | branch=$BRANCH" >> "$DEPLOY_LOG"

echo "✅ Deploy complete: $COMMIT in ${DURATION}s"
