#!/usr/bin/env bash
# Rollback all CoverAI services to the previous deployment.
set -euo pipefail

NAMESPACE="${NAMESPACE:-coverai}"
G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; NC='\033[0m'

echo -e "\n${Y}Rolling back CoverAI services...${NC}\n"

# Show current state
echo "Current pod state:"
kubectl get pods -n "$NAMESPACE" --no-headers | awk '{print "  "$1" "$3}'

echo ""

# Rollback in reverse deploy order: frontend → backend → ml
for DEPLOY in frontend backend ml-service; do
  PREV=$(kubectl rollout history deployment/$DEPLOY -n "$NAMESPACE" \
    --no-headers 2>/dev/null | tail -2 | head -1 | awk '{print $1}' || echo "")

  echo -e "${Y}Rolling back $DEPLOY...${NC}"
  kubectl rollout undo deployment/$DEPLOY --namespace="$NAMESPACE"
  kubectl rollout status deployment/$DEPLOY --namespace="$NAMESPACE" --timeout=180s
  echo -e "${G}✓ $DEPLOY rolled back${NC}"
done

echo ""
echo "Post-rollback pod state:"
kubectl get pods -n "$NAMESPACE" -o wide

echo -e "\n${G}Rollback complete.${NC}"
echo "  Check logs: kubectl logs -n ${NAMESPACE} -l app=backend --tail=50"
