#!/bin/bash
# SpawnKit Deploy Script — v2.1
# Deploys server/ directory to production (office-executive is the canonical app)
set -euo pipefail

REPO="/home/apocyz_runner/spawnkit"
DEPLOYED="/home/apocyz_runner/spawnkit-server"
DEPLOY_LOG="$HOME/deploy-history.log"
MAX_BACKUPS=3
HEALTH_TIMEOUT=30
FORCE=false

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
  
  BACKUPS=($(ls -dt "${DEPLOYED}.bak."* 2>/dev/null || true))
  if (( ${#BACKUPS[@]} > MAX_BACKUPS )); then
    for OLD in "${BACKUPS[@]:$MAX_BACKUPS}"; do
      echo "🗑️  Removing old backup: $(basename $OLD)"
      rm -rf "$OLD"
    done
  fi
fi

# ── 3. Deploy — server/ is the single source of truth ──
echo "📁 Syncing server/ → production..."
rsync -a --delete \
  --exclude='sync.sh' \
  --exclude='restart.sh' \
  --exclude='auto-sync.sh' \
  --exclude='caddy-patch.sh' \
  --exclude='_old_root/' \
  "$REPO/server/" "$DEPLOYED/"

echo "📝 Recording deploy..."
echo "$COMMIT" > /tmp/.last-deploy-commit

# ── 4. Restart server ──
echo "🔄 Restarting server..."
systemctl --user restart spawnkit-server.service 2>/dev/null || {
  echo "⚠️  systemctl restart failed, trying kill+start..."
  pkill -f "node.*server.js.*8765" 2>/dev/null || true
  sleep 1
  cd "$DEPLOYED" && nohup node server.js > /tmp/spawnkit-server.log 2>&1 &
}
sleep 3

# ── 5. Health Check + Rollback ──
echo "🏥 Health check..."
HEALTH_OK=false
for i in $(seq 1 3); do
  if curl -sf --max-time "$HEALTH_TIMEOUT" "http://localhost:8765/api/oc/health" > /dev/null 2>&1; then
    HEALTH_OK=true
    break
  fi
  sleep 2
done

if [[ "$HEALTH_OK" == "false" ]]; then
  echo "❌ Health check FAILED after deploy!"
  
  LATEST_BACKUP=$(ls -dt "${DEPLOYED}.bak."* 2>/dev/null | head -1)
  if [[ -n "$LATEST_BACKUP" ]]; then
    echo "🔄 Rolling back from $LATEST_BACKUP..."
    rm -rf "$DEPLOYED"
    mv "$LATEST_BACKUP" "$DEPLOYED"
    systemctl --user restart spawnkit-server.service 2>/dev/null || true
    echo "⚠️  Rollback complete."
  fi
  
  DEPLOY_END=$(date +%s)
  DURATION=$((DEPLOY_END - DEPLOY_START))
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | $COMMIT | FAILED+ROLLBACK | ${DURATION}s" >> "$DEPLOY_LOG"
  exit 1
fi

# ── 6. Deploy Log ──
DEPLOY_END=$(date +%s)
DURATION=$((DEPLOY_END - DEPLOY_START))
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | $COMMIT | SUCCESS | ${DURATION}s | branch=$BRANCH" >> "$DEPLOY_LOG"

echo "✅ Deploy complete: $COMMIT v$(cat "$DEPLOYED/version.json" 2>/dev/null | python3 -c 'import json,sys;print(json.load(sys.stdin).get("version","?"))' 2>/dev/null || echo '?') in ${DURATION}s"
