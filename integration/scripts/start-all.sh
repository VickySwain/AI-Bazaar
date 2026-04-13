#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# CoverAI Full Stack Startup Script
# Usage: ./scripts/start-all.sh [--train] [--fresh] [--prod]
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$ROOT_DIR/docker/docker-compose.yml"

# ── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; PURPLE='\033[0;35m'; NC='\033[0m'

log()    { echo -e "${GREEN}[CoverAI]${NC} $1"; }
warn()   { echo -e "${YELLOW}[WARN]${NC}   $1"; }
error()  { echo -e "${RED}[ERROR]${NC}  $1" >&2; }
section(){ echo -e "\n${PURPLE}━━━ $1 ━━━${NC}"; }

# ── Parse flags ─────────────────────────────────────────────────────────────
TRAIN=false; FRESH=false; PROD=false
for arg in "$@"; do
  case $arg in
    --train) TRAIN=true ;;
    --fresh) FRESH=true ;;
    --prod)  PROD=true  ;;
  esac
done

section "CoverAI Platform Startup"
log "Mode: $([ "$PROD" == "true" ] && echo "PRODUCTION" || echo "DEVELOPMENT")"
log "Train ML model: $TRAIN"
log "Fresh data: $FRESH"

# ── Check prerequisites ──────────────────────────────────────────────────────
section "Prerequisites"
for cmd in docker docker-compose; do
  if ! command -v $cmd &>/dev/null; then
    error "$cmd not found. Please install it first."
    exit 1
  fi
  log "$cmd ✓"
done

# ── Start infrastructure ─────────────────────────────────────────────────────
section "Starting Infrastructure"
docker-compose -f "$COMPOSE_FILE" up -d postgres redis zookeeper kafka mlflow
log "Infrastructure started"

# ── Wait for Postgres ────────────────────────────────────────────────────────
section "Waiting for Postgres"
for i in $(seq 1 30); do
  if docker-compose -f "$COMPOSE_FILE" exec -T postgres \
    pg_isready -U coverai -d coverai_db &>/dev/null; then
    log "Postgres ready ✓"
    break
  fi
  echo -n "."
  sleep 2
done

# ── Wait for Redis ───────────────────────────────────────────────────────────
section "Waiting for Redis"
for i in $(seq 1 20); do
  if docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping &>/dev/null; then
    log "Redis ready ✓"
    break
  fi
  echo -n "."
  sleep 2
done

# ── Start ML Service ─────────────────────────────────────────────────────────
section "Starting ML Service (FastAPI)"
docker-compose -f "$COMPOSE_FILE" up -d ml-service
log "ML service starting..."

# ── Train model if requested ──────────────────────────────────────────────────
if [ "$TRAIN" == "true" ]; then
  section "Training ML Model"
  TRAIN_ARGS=""
  [ "$FRESH" == "true" ] && TRAIN_ARGS="--fresh"
  log "Running: python scripts/train.py $TRAIN_ARGS --evaluate"
  docker-compose -f "$COMPOSE_FILE" --profile train run --rm train python scripts/train.py $TRAIN_ARGS --evaluate
  log "Model training complete ✓"

  # Materialize features into Redis
  log "Materializing features into Redis..."
  docker-compose -f "$COMPOSE_FILE" --profile train run --rm train python scripts/materialize_features.py
  log "Feature materialization complete ✓"
fi

# ── Start Backend ────────────────────────────────────────────────────────────
section "Starting Backend (NestJS)"
docker-compose -f "$COMPOSE_FILE" up -d backend
log "Backend starting..."

# Wait for backend health
for i in $(seq 1 40); do
  if curl -sf http://localhost:3001/health/ping &>/dev/null; then
    log "Backend ready ✓"
    break
  fi
  echo -n "."
  sleep 3
done

# ── Start Frontend ───────────────────────────────────────────────────────────
section "Starting Frontend (Next.js)"
docker-compose -f "$COMPOSE_FILE" up -d frontend
log "Frontend starting..."

# ── Final health check ────────────────────────────────────────────────────────
section "Service Health Check"
sleep 5

check_service() {
  local name=$1; local url=$2
  if curl -sf "$url" &>/dev/null; then
    log "$name ✓  ($url)"
  else
    warn "$name may still be starting ($url)"
  fi
}

check_service "Frontend   (Next.js)"  "http://localhost:3000"
check_service "Backend    (NestJS)"   "http://localhost:3001/health/ping"
check_service "ML Service (FastAPI)"  "http://localhost:8000/health/ping"
check_service "MLflow     (Tracking)" "http://localhost:5000"
check_service "Kafka UI              " "http://localhost:8080"
check_service "Redis Commander       " "http://localhost:8081"

section "All Services Running"
echo ""
echo -e "  ${BLUE}🌐 Frontend      ${NC}→  http://localhost:3000"
echo -e "  ${BLUE}⚙️  Backend API   ${NC}→  http://localhost:3001/api/v1"
echo -e "  ${BLUE}📚 API Docs      ${NC}→  http://localhost:3001/docs"
echo -e "  ${BLUE}🤖 ML Service    ${NC}→  http://localhost:8000"
echo -e "  ${BLUE}📊 ML API Docs   ${NC}→  http://localhost:8000/docs"
echo -e "  ${BLUE}📈 MLflow        ${NC}→  http://localhost:5000"
echo -e "  ${BLUE}📨 Kafka UI      ${NC}→  http://localhost:8080"
echo -e "  ${BLUE}🔴 Redis UI      ${NC}→  http://localhost:8081"
echo ""
echo -e "  ${GREEN}Logs:${NC} docker-compose -f docker/docker-compose.yml logs -f [service]"
echo -e "  ${GREEN}Stop:${NC} docker-compose -f docker/docker-compose.yml down"
echo ""
