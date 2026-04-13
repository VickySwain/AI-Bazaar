# CoverAI — Complete Deployment & Integration Guide

## Table of Contents
1. [Quick Start (Local)](#1-quick-start-local)
2. [Data Flow Reference](#2-data-flow-reference)
3. [Service Communication Map](#3-service-communication-map)
4. [Environment Setup](#4-environment-setup)
5. [Train the ML Model](#5-train-the-ml-model)
6. [Running E2E Tests](#6-running-e2e-tests)
7. [Monitoring](#7-monitoring)
8. [Production Deployment](#8-production-deployment)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Quick Start (Local)

### Prerequisites
- Docker 24+ and Docker Compose v2
- Node.js 20+ (for running frontend/backend outside Docker)
- Python 3.11+ (for running ML service outside Docker)

### Directory Layout
```
coverai/
├── coverai-frontend/      # Next.js 14 app
├── coverai-backend/       # NestJS REST API
├── coverai-ml/            # FastAPI ML service
└── coverai-integration/   # This package (integration layer)
    ├── backend-bridge/    # NestJS ← → FastAPI adapter code
    ├── frontend-integration/  # React hooks + components
    ├── docker/            # Master docker-compose.yml
    ├── monitoring/        # Prometheus + Grafana
    ├── tests/e2e/         # Full stack integration tests
    └── scripts/           # start-all.sh, health-check.sh
```

### Step 1 — Clone and place service files

```bash
# Copy integration files into their respective service directories:

# Backend bridge files
cp backend-bridge/ml-service.adapter.ts \
   ../coverai-backend/src/recommendations/

cp backend-bridge/recommendations.service.ts \
   ../coverai-backend/src/recommendations/

cp backend-bridge/recommendations.module.ts \
   ../coverai-backend/src/recommendations/

cp backend-bridge/recommendations.controller.ts \
   ../coverai-backend/src/recommendations/

cp backend-bridge/kafka/kafka-consumer.service.ts \
   ../coverai-backend/src/common/kafka/

cp backend-bridge/kafka/kafka-events.ts \
   ../coverai-backend/src/common/kafka/

# Frontend integration files
cp frontend-integration/useRecommendations.ts \
   ../coverai-frontend/src/hooks/

cp frontend-integration/components/MlStatusBadge.tsx \
   ../coverai-frontend/src/components/recommendations/

cp frontend-integration/recommend-page-updated.tsx \
   ../coverai-frontend/src/app/recommend/page.tsx

cp frontend-integration/dataflow-page.tsx \
   ../coverai-frontend/src/app/dataflow/page.tsx

# Docker compose
cp docker/docker-compose.yml ../coverai-backend/docker-compose.yml
cp docker/init-db.sql ../coverai-backend/scripts/
```

### Step 2 — Configure environment

```bash
# Copy and edit environment files
cp docs/environment-config.env /tmp/env-reference.env

# Each service needs its own .env
cat /tmp/env-reference.env  # Read the NEXT.JS section → frontend/.env.local
cat /tmp/env-reference.env  # Read the NESTJS section   → backend/.env
cat /tmp/env-reference.env  # Read the FASTAPI section   → ml/.env
```

### Step 3 — Start everything

```bash
cd coverai-integration

# First run (includes ML model training):
./scripts/start-all.sh --train

# Subsequent runs (model already trained):
./scripts/start-all.sh

# Check status:
./scripts/health-check.sh
```

### Step 4 — Verify

Open http://localhost:3000/dataflow to see the live architecture diagram.

---

## 2. Data Flow Reference

### A. Recommendation Request (cache miss)
```
[Browser] →─ GET /recommendations?limit=5  ─────────────────────────────┐
                                                                          │
[Next.js]    useRecommendationFlow() hook                                 │
             Axios + JWT Bearer token                                      │
             ↓                                                            │
[NestJS]     JwtAuthGuard validates token                    ~2ms         │
             RecommendationsController                                     │
             ↓                                                            │
             MlServiceAdapter.canRequest()                   ~0ms         │
             Circuit breaker: CLOSED → proceed                            │
             ↓                                                            │
             Redis cache check                               ~3ms         │
             Key: ml:rec:{md5(userId+cat+limit)}                          │
             Result: MISS → continue                                       │
             ↓                                                            │
             PostgreSQL: SELECT user profile                  ~8ms        │
             age, income_bracket, health flags,                           │
             purchased_categories (JOIN purchases)                        │
             ↓                                                            │
[NestJS → FastAPI]                                                        │
             POST http://ml-service:8000/recommend           ~80ms total  │
             Body: { features: {...44 fields}, limit: 5 }                 │
             ↓                                                            │
[FastAPI]    JWT not required (internal network)                          │
             Redis feature cache check                       ~2ms         │
             Key: feat:policy:{id}                                        │
             Result: HIT → use cached policy features                     │
             ↓                                                            │
             Build 44-feature matrix (9 policies × 44 features)          │
             StandardScaler.transform()                      ~1ms         │
             XGBoost.predict_proba()                         ~3ms         │
             ↓                                                            │
             Rank by score, filter age-ineligible                         │
             Generate reasons (top 4 per policy)             ~1ms         │
             ↓                                                            │
             Cache result in Redis                           ~2ms         │
             Key: rec:user-123:health → TTL 3600s                        │
             ↓                                                            │
[NestJS ← FastAPI]                                                        │
             Join ML policy IDs with PostgreSQL              ~12ms        │
             (full policy metadata, insurer details)                      │
             ↓                                                            │
             Cache in NestJS Redis                           ~2ms         │
             Key: ml:rec:{md5} → TTL 1800s                               │
             ↓                                                            │
             Kafka emit: recommendations.generated           async        │
             Persist Recommendation records to PostgreSQL    async        │
             ↓                                                            │
[Browser] ←─ 5 scored policies with reasons, ranks, scores               │
             Total: ~120ms                                    ───────────┘

### B. Recommendation Request (cache hit)

[Browser] → GET /recommendations?limit=5
[NestJS]    Redis cache: HIT (Key: ml:rec:{md5})
[Browser] ← 5 policies returned
Total: ~8ms
```

### C. Payment → Policy Activation (Kafka-driven)
```
[Browser] → POST /payments/order { quoteId }
[NestJS]  → Razorpay.orders.create()   ← API call
[Browser] ← { orderId, amount, keyId }

[Browser] → Razorpay.js checkout modal
[User]      Completes payment
[Browser] → POST /payments/verify { razorpayOrderId, razorpayPaymentId, razorpaySignature }
[NestJS]  → HMAC signature verification ← crypto.createHmac
[NestJS]  → UPDATE payments SET status='CAPTURED'
[NestJS]  → UPDATE purchases SET status='ACTIVE', policyNumber='POL-...'
[NestJS]  → Kafka: payment.captured { paymentId, userId, purchaseId }
            ↓ (async, parallel)
[Kafka]   → NotificationService consumer
            → sendPaymentReceipt() email
            → sendPolicyActivated() email
[Kafka]   → KafkaConsumerService (backend)
            → UPDATE recommendations SET was_purchased=true
            → MlServiceAdapter.invalidateUserCache(userId)
              → DELETE rec:userId:* from Redis (ML service)
            → FastAPI POST /interactions { action: 'purchase' }
              → DELETE rec:userId:* from Redis (ML Redis)
[Browser] ← 200 { success: true, paymentId, purchaseId }
```

### D. Nightly ML Retraining (Scheduled)
```
[APScheduler] 02:00 IST → job_nightly_retrain()

[FastAPI]  → SELECT COUNT(*) FROM recommendation_interactions
              WHERE created_at >= NOW() - INTERVAL '24 hours'
              Result: 1247 > 1000 threshold → proceed
           ↓
           → generate_interaction_dataset() OR load from Parquet
           → RecommendationPreprocessor.fit_transform()
           → XGBoost.fit() with early stopping
           → Evaluate: AUC-ROC, NDCG@K, Precision@K
           → mlflow.log_metrics(), mlflow.log_artifact()
           → joblib.dump(model, data/models/xgb_v1.0.0.joblib)
           ↓
           → model_registry.reload()  ← hot swap, zero downtime
           → Kafka: model.retrain.complete { metrics, version }
```

---

## 3. Service Communication Map

```
┌─────────────────────────────────────────────────────────┐
│                   External Traffic                       │
│              Browser / Mobile / API clients              │
└─────────────┬───────────────────────┬───────────────────┘
              │ HTTPS :443            │ HTTPS :443
              ▼                       ▼
┌─────────────────────┐   ┌──────────────────────┐
│  Next.js Frontend   │   │   NestJS Backend API  │
│  Port 3000          │   │   Port 3001           │
│                     │──▶│                       │
│  React Query hooks  │   │  JWT Auth             │
│  Zustand state      │   │  REST endpoints       │
│  Framer Motion UI   │   │  Redis caching        │
└─────────────────────┘   └──────┬────────────────┘
                                  │
              ┌───────────────────┼─────────────────────┐
              │ HTTP :8000        │ TCP :5432            │ TCP :6379
              ▼                   ▼                      ▼
┌─────────────────────┐  ┌──────────────────┐  ┌────────────────┐
│  FastAPI ML Service │  │   PostgreSQL      │  │  Redis         │
│  Port 8000          │  │   Port 5432       │  │  Port 6379     │
│                     │  │                   │  │                │
│  XGBoost inference  │  │  Primary data     │  │  DB 0: NestJS  │
│  Feature store      │◀─│  store            │  │  DB 1: FastAPI │
│  APScheduler        │  │  All entities     │  │  Sessions      │
│  Rule-based fallback│  │  Interaction log  │  │  Feature store │
└─────────────────────┘  └──────────────────┘  └────────────────┘
              │
              │ Kafka :9092 (all producers/consumers)
              ▼
┌─────────────────────────────────────────────────────────┐
│                     Apache Kafka                         │
│  Topics:                                                 │
│  ├── payment.captured           (NestJS → all)           │
│  ├── policy.activated           (NestJS → notif, ML)     │
│  ├── policy.quote.created       (NestJS → analytics)     │
│  ├── recommendations.generated  (NestJS → ML, analytics) │
│  ├── recommendations.interaction(NestJS → ML)            │
│  └── model.retrain.complete     (FastAPI → NestJS admin) │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Environment Setup

See `docs/environment-config.env` for the complete annotated config.

Critical values to change before production:
- `JWT_SECRET` — minimum 32 chars, cryptographically random
- `JWT_REFRESH_SECRET` — different from JWT_SECRET
- `DATABASE_PASSWORD` — strong unique password
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — live keys

Generate secure secrets:
```bash
openssl rand -hex 32   # For JWT secrets
openssl rand -base64 32  # Alternative
```

---

## 5. Train the ML Model

```bash
# Inside Docker
docker-compose --profile train run --rm train python scripts/train.py --evaluate

# Or locally
cd coverai-ml
python scripts/train.py --evaluate

# With fresh synthetic data (regenerates 8000 user interactions)
python scripts/train.py --fresh --evaluate

# Full HPO + training
python scripts/train.py --hpo --trials 50 --evaluate

# After training, populate the Redis feature store
python scripts/materialize_features.py
```

Expected output:
```
Training complete in 42.3s
  AUC-ROC: 0.8714
  AUC-PR:  0.6142
  P@5:     0.4280
  NDCG@10: 0.7163
```

---

## 6. Running E2E Tests

```bash
# Start all services first
./scripts/start-all.sh

# Then run tests
cd tests/e2e
npm install
npm test

# Against staging
BACKEND_URL=https://api-staging.coverai.in/api/v1 \
ML_URL=https://ml-staging.coverai.in \
npm test
```

Tests run in order (bail=false, so all execute):
1. Service health checks
2. Auth flow (register, login, refresh, revoke)
3. Policy catalog (list, filter, compare, quote)
4. ML recommendation flow (ML + cache + fallback)
5. User profile and dashboard
6. Payment flow
7. Kafka events
8. ML resilience (fallback, circuit breaker)
9. Cleanup

---

## 7. Monitoring

### Start monitoring stack
```bash
cd coverai-integration
docker-compose \
  -f docker/docker-compose.yml \
  -f monitoring/docker-compose.monitoring.yml \
  up -d
```

| Dashboard | URL |
|-----------|-----|
| Grafana | http://localhost:3100 (admin / coverai_grafana) |
| Prometheus | http://localhost:9090 |

The CoverAI Platform Dashboard auto-provisions with panels for:
- API request rates by endpoint
- ML inference latency percentiles (p50/p95/p99)
- ML model loaded status
- Redis cache hit rate
- Kafka event throughput per topic
- Recent purchases (PostgreSQL direct)
- Policy sales breakdown by category

### Key metrics to watch
```promql
# ML inference p99 latency (alert if > 500ms)
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{job="fastapi-ml"}[5m]))

# Recommendation cache hit rate (alert if < 60%)
rate(redis_keyspace_hits_total[1m]) /
  (rate(redis_keyspace_hits_total[1m]) + rate(redis_keyspace_misses_total[1m]))

# NestJS error rate (alert if > 1%)
rate(http_requests_total{job="nestjs-backend", status=~"5.."}[5m]) /
  rate(http_requests_total{job="nestjs-backend"}[5m])

# ML circuit breaker open (alert if = 1)
ml_circuit_breaker_open{job="nestjs-backend"}
```

---

## 8. Production Deployment

### Kubernetes (recommended)

The `infrastructure/k8s/` directory in `coverai-backend` contains deployment manifests. Key changes for production:

```yaml
# All services need these changes:
env:
  - name: NODE_ENV
    value: production
  - name: JWT_SECRET
    valueFrom:
      secretKeyRef:
        name: coverai-secrets
        key: jwt-secret
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: coverai-secrets
        key: database-url
```

### Deployment order
```bash
# 1. Infrastructure (RDS, ElastiCache, MSK)
terraform apply

# 2. Run database migrations
kubectl run migrations --image=coverai-backend --command -- npm run migration:run

# 3. Train initial ML model
kubectl create job initial-training --from=cronjob/ml-trainer

# 4. Deploy ML service (FastAPI) first
kubectl apply -f k8s/ml-service/

# 5. Wait for ML health
kubectl wait --for=condition=ready pod -l app=ml-service --timeout=120s

# 6. Deploy backend (NestJS)
kubectl apply -f k8s/backend/

# 7. Deploy frontend (Next.js)
kubectl apply -f k8s/frontend/
```

### Health checks
All three services expose:
- `GET /health/ping` — liveness probe (returns 200 immediately)
- `GET /health/ready` — readiness probe (checks DB + Redis + model)
- `GET /health` — full health (DB, Redis, model, uptime)

---

## 9. Troubleshooting

### ML model not loaded (fallback active)
```bash
# Check if model file exists
ls -la coverai-ml/data/models/

# If empty, train the model
cd coverai-ml && python scripts/train.py

# Hot-reload without restart
curl -X POST http://localhost:8000/training/reload
```

### Recommendations returning empty
```bash
# Check ML service is healthy
curl http://localhost:8000/health

# Check policies exist in DB
curl http://localhost:3001/api/v1/policies | python3 -m json.tool | grep total

# Check Redis connection in ML service
curl http://localhost:8000/health | python3 -c "import sys,json; print(json.load(sys.stdin))"

# Force cache flush in ML service
curl -X POST http://localhost:8000/training/reload
```

### Circuit breaker OPEN
```bash
# Check NestJS logs
docker-compose logs backend | grep -i "circuit"

# The circuit auto-recovers after 30s
# Or restart the backend
docker-compose restart backend
```

### Kafka consumer not processing events
```bash
# Check Kafka UI for lag
open http://localhost:8080

# Check consumer group offsets
docker-compose exec kafka kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --group coverai-group-backend \
  --describe

# Reset offsets if needed
docker-compose exec kafka kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --group coverai-group-backend \
  --reset-offsets --to-latest \
  --topic payment.captured --execute
```

### Common port conflicts
| Port | Service | Fix |
|------|---------|-----|
| 5432 | PostgreSQL | `lsof -ti:5432 \| xargs kill` |
| 6379 | Redis | `lsof -ti:6379 \| xargs kill` |
| 3000 | Next.js | Change `PORT` in frontend/.env |
| 3001 | NestJS | Change `PORT` in backend/.env |
| 8000 | FastAPI | Change `PORT` in ml/.env |
