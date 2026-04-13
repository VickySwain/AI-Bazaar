#!/usr/bin/env bash
# Health check all CoverAI services and print a status table.
set -euo pipefail

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'; BOLD='\033[1m'

check() {
  local name=$1; local url=$2; local field=$3
  local response
  if response=$(curl -sf --max-time 5 "$url" 2>/dev/null); then
    if [ -n "$field" ]; then
      local value
      value=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$field','?'))" 2>/dev/null || echo "?")
      printf "  ${GREEN}✓${NC} %-25s %-30s ${BLUE}%s${NC}\n" "$name" "$url" "$value"
    else
      printf "  ${GREEN}✓${NC} %-25s %s\n" "$name" "$url"
    fi
  else
    printf "  ${RED}✗${NC} %-25s ${RED}unreachable${NC} (%s)\n" "$name" "$url"
  fi
}

echo ""
echo -e "${BOLD}CoverAI Platform — Health Status${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo -e "${BLUE}Frontends:${NC}"
check "Next.js Frontend"     "http://localhost:3000"          ""

echo ""
echo -e "${BLUE}API Services:${NC}"
check "NestJS Backend"       "http://localhost:3001/health/ping" "status"
check "FastAPI ML Service"   "http://localhost:8000/health/ping" "status"

echo ""
echo -e "${BLUE}ML Model Status:${NC}"
if response=$(curl -sf --max-time 5 "http://localhost:8000/health" 2>/dev/null); then
  model_loaded=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print('✓ loaded' if d.get('model_loaded') else '✗ not loaded (fallback active)')" 2>/dev/null)
  uptime=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"{d.get('uptime_seconds',0):.0f}s\")" 2>/dev/null)
  printf "  ${GREEN}✓${NC} %-25s Model: %s | Uptime: %s\n" "Model Registry" "$model_loaded" "$uptime"

  # Check circuit breaker
  if cb_response=$(curl -sf --max-time 5 "http://localhost:3001/api/v1/recommendations/ml-health" 2>/dev/null); then
    cb=$(echo "$cb_response" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print(d.get('circuitBreaker','?'))" 2>/dev/null || echo "?")
    printf "  ${BLUE}ℹ${NC} %-25s Circuit Breaker: %s\n" "NestJS → ML Bridge" "$cb"
  fi
fi

echo ""
echo -e "${BLUE}Infrastructure:${NC}"
check "Kafka UI"             "http://localhost:8080"  ""
check "Redis Commander"      "http://localhost:8081"  ""
check "MLflow Tracking"      "http://localhost:5000"  ""

echo ""
echo -e "${BLUE}Data Flow Test:${NC}"

# Quick recommendation flow test
if token_response=$(curl -sf --max-time 10 \
    -X POST "http://localhost:3001/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@coverai.in","password":"Admin@123456"}' 2>/dev/null); then

  token=$(echo "$token_response" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['tokens']['accessToken'])" 2>/dev/null || echo "")

  if [ -n "$token" ]; then
    printf "  ${GREEN}✓${NC} %-25s Admin login successful\n" "Auth flow"

    if rec_response=$(curl -sf --max-time 10 \
        "http://localhost:3001/api/v1/recommendations?limit=3" \
        -H "Authorization: Bearer $token" 2>/dev/null); then
      rec_count=$(echo "$rec_response" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['total'])" 2>/dev/null || echo "?")
      printf "  ${GREEN}✓${NC} %-25s Recommendations: %s items\n" "Recommendation flow" "$rec_count"
    else
      printf "  ${YELLOW}⚠${NC} %-25s Could not fetch recommendations\n" "Recommendation flow"
    fi
  fi
else
  printf "  ${YELLOW}⚠${NC} %-25s Admin login failed (service may be starting)\n" "Auth flow"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  API Docs: ${BLUE}http://localhost:3001/docs${NC} | ${BLUE}http://localhost:8000/docs${NC}"
echo ""
