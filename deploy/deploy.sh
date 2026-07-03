#!/usr/bin/env bash
# deploy/deploy.sh — Remote deployment script for pricing-service
# Run on the OCI VM as user "deploy"
set -euo pipefail

SERVICE_DIR="/opt/pricing-service"
COMPOSE_FILE="${SERVICE_DIR}/docker-compose.prod.yml"
LOG_FILE="${SERVICE_DIR}/deploy.log"

log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }
error(){ log "ERROR: $*"; exit 1; }

log "=== Deploy started ==="

cd "$SERVICE_DIR" || error "Directory $SERVICE_DIR not found"

log "Pulling latest images..."
docker compose -f "$COMPOSE_FILE" pull || error "Pull failed"

log "Starting services..."
docker compose -f "$COMPOSE_FILE" up -d || error "Up failed"

log "Waiting for API healthcheck..."
for i in $(seq 1 12); do
  if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
    log "✓ API is healthy"
    break
  fi
  log "  attempt $i/12 — waiting..."
  sleep 5
done

log "Cleaning old images..."
docker image prune -f --filter "until=24h"

log "=== Deploy complete ==="
