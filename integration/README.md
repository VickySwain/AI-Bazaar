# CoverAI — Integration Layer

> Connects the Next.js frontend, NestJS backend, and FastAPI ML service into a fully operational platform.

## Architecture Overview

```
Browser (Next.js)
     │  useRecommendations() hook
     │  React Query + Axios + JWT interceptor
     ▼
NestJS Backend (Port 3001)
     │  RecommendationsController
     │  → MlServiceAdapter (circuit breaker)
     │  → UserProfile (PostgreSQL)
     │  → Cache (Redis)
     ▼
FastAPI ML Service (Port 8000)
     │  XGBoost inference (44 features)
     │  → Feature Store (Redis)
     │  → Policy Catalog (PostgreSQL)
     │  ← Rule-based fallback if model missing
     ▼
Kafka Event Bus
     → recommendations.generated
     → recommendations.interaction
     → policy.search.events
     → payment.captured
     (ML service consumes interaction events for nightly retraining)
```

## Start Everything

```bash
# 1. Clone all three repos into sibling directories
#    coverai-frontend/  coverai-backend/  coverai-ml/  coverai-integration/

# 2. Start full stack
cd coverai-integration
chmod +x scripts/start-all.sh
./scripts/start-all.sh

# 3. First run: also train the ML model
./scripts/start-all.sh --train

# 4. Check all services
./scripts/health-check.sh
```

## Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Next.js Frontend | http://localhost:3000 | Main app |
| NestJS API | http://localhost:3001/api/v1 | REST backend |
| NestJS Swagger | http://localhost:3001/docs | API docs |
| FastAPI ML | http://localhost:8000 | ML inference |
| ML Swagger | http://localhost:8000/docs | ML API docs |
| MLflow | http://localhost:5000 | Experiment tracking |
| Kafka UI | http://localhost:8080 | Event bus UI |
| Redis Commander | http://localhost:8081 | Cache browser |
| Data Flow Viz | http://localhost:3000/dataflow | Live architecture explorer |

## End-to-End Recommendation Flow

A request from button click to rendered recommendation:

```
1. User clicks "Get Recommendations" in Next.js
   └── useRecommendationFlow() hook triggers

2. React Query calls GET /api/v1/recommendations?limit=5
   └── Axios interceptor attaches JWT Bearer token

3. NestJS JwtAuthGuard validates token
   └── RecommendationsController.getRecommendations()

4. NestJS checks Redis cache
   └── Cache key: ml:rec:{md5(userId+category+limit)}
   └── HIT → return cached response (< 5ms)
   └── MISS → proceed to step 5

5. NestJS fetches user profile from PostgreSQL
   └── age, income_bracket, health flags, purchased_categories

6. NestJS calls MlServiceAdapter.getRecommendations()
   └── Circuit breaker check: CLOSED → proceed
   └── POST http://ml-service:8000/recommend
   └── Timeout: 5 seconds, retries: 2

7. FastAPI receives request, checks its own Redis cache
   └── HIT → return cached (inference_ms ≈ 0)
   └── MISS → run XGBoost inference

8. FastAPI fetches online features from Redis feature store
   └── feat:policy:{id} → policy features per policy
   └── MISS → load from PostgreSQL + cache

9. FastAPI builds 44-feature matrix (user × N policies)
   └── feature_definitions.py: same code as training
   └── StandardScaler.transform() → XGBoost.predict_proba()

10. FastAPI ranks policies by P(purchase), applies age filter
    └── Generates human-readable reasons per policy
    └── Returns scored policies with model_version, inference_ms

11. NestJS enriches ML response with full DB policy records
    └── Joins ML policy IDs with PostgreSQL for full metadata

12. NestJS caches result in Redis (30 min TTL)
    └── Emits Kafka event: recommendations.generated

13. Response returns to Next.js frontend
    └── React Query caches in memory (30 min staleTime)
    └── RecommendationCard components render with score bars

Total latency: ~150ms (cache miss) | ~15ms (cache hit)
```

## Fallback Chain

When the ML model is unavailable:

```
FastAPI XGBoost  ← Fails or not trained
        ↓
FastAPI rule-based scorer (Python)
        ↓
If FastAPI is unreachable:
        ↓
NestJS MlServiceAdapter.circuitBreaker = OPEN
        ↓
NestJS rule-based fallback (TypeScript)
        ↓
Always returns a valid response
```

The `fallback_used: true` flag is always propagated so
the frontend can optionally display an informational badge.

## Running E2E Tests

```bash
cd tests/e2e
npm install

# Run against local stack
npm test

# Run against specific URLs
BACKEND_URL=https://api.coverai.in/api/v1 \
ML_URL=https://ml.coverai.in \
npm test
```

Tests cover:
- Service health (all 3 services)
- Auth flow: register → login → refresh → logout
- Policy catalog: list, filter, compare, quote
- Recommendation flow: NestJS → ML → fallback → cache
- Profile update → cache invalidation
- Payment order creation
- Kafka event emission
- Circuit breaker state

## Files in This Package

| File | Description |
|------|-------------|
| `backend-bridge/ml-service.adapter.ts` | NestJS HTTP client for FastAPI with circuit breaker |
| `backend-bridge/recommendations.service.ts` | Full integration service with ML + fallback |
| `backend-bridge/recommendations.module.ts` | NestJS module wiring |
| `backend-bridge/recommendations.controller.ts` | REST endpoints + ml-health |
| `frontend-integration/useRecommendations.ts` | React hooks with interaction tracking |
| `frontend-integration/dataflow-page.tsx` | Live animated architecture explorer |
| `docker/docker-compose.yml` | Full stack compose (all 3 services + infra) |
| `docker/init-db.sql` | Creates recommendation_interactions table |
| `tests/e2e/full-stack.e2e.test.ts` | 30+ end-to-end integration tests |
| `scripts/start-all.sh` | One-command startup with health polling |
| `scripts/health-check.sh` | Live status dashboard + flow test |
