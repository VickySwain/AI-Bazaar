# CoverAI ML Recommendation Service

> XGBoost-powered insurance policy recommendation engine with FastAPI, Redis feature store, and MLflow tracking.

## Architecture

```
Request → FastAPI → RecommendationEngine
                         │
              ┌──────────┴──────────┐
              │                     │
         ML Model              Rule-Based
         (XGBoost)             (Fallback)
              │
    ┌─────────┴──────────┐
    │                    │
Feature Store        PolicyRepo
  (Redis)           (PostgreSQL)
```

### ML Pipeline

```
Synthetic Data → Feature Engineering → Preprocessor → XGBoost → MLflow
     │                  │                                 │
data_generator.py   feature_definitions.py           trainer.py
                    (44 features, shared              (CV + early
                     train/serve)                      stopping)
```

## Quick Start

### 1. Install dependencies

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Set up environment

```bash
cp .env.example .env
# Edit .env with your DB / Redis / Kafka credentials
```

### 3. Start infrastructure

```bash
docker-compose up -d postgres redis mlflow
```

### 4. Train the model

```bash
python scripts/train.py
# Options:
#   --fresh          Regenerate synthetic data
#   --users 10000    Larger dataset
#   --hpo            Hyperparameter optimisation (requires optuna)
#   --evaluate       Run offline evaluation after training
```

### 5. Populate feature store

```bash
python scripts/materialize_features.py
```

### 6. Start the API

```bash
# Development (hot reload)
python app/main.py

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# Docker
docker-compose up ml-service
```

### 7. API Docs

Open **http://localhost:8000/docs** for interactive Swagger UI.

---

## API Reference

### Recommendation

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/recommend` | Score policies for one user |
| `POST` | `/recommend/batch` | Score for multiple users |
| `POST` | `/recommend/insights` | Coverage gap insights |
| `GET`  | `/recommend/explain` | Feature importance |

#### Example request

```bash
curl -X POST http://localhost:8000/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "features": {
      "user_id": "user-001",
      "age": 32,
      "gender": "MALE",
      "income_bracket": "6L_TO_10L",
      "city_tier": "TIER_2",
      "is_smoker": false,
      "has_diabetes": false,
      "has_hypertension": false,
      "has_heart_disease": false,
      "family_members": 2,
      "monthly_budget": 2500,
      "purchased_categories": ["MOTOR"]
    },
    "category": "HEALTH",
    "limit": 5
  }'
```

#### Example response

```json
{
  "user_id": "user-001",
  "recommendations": [
    {
      "policy": {
        "id": "pol-004",
        "name": "HDFC ERGO Optima Restore",
        "category": "HEALTH",
        "insurer_name": "HDFC ERGO",
        "base_premium": 9800,
        "avg_rating": 4.8
      },
      "score": 0.8142,
      "rank": 1,
      "reasons": [
        "Fits comfortably within your monthly budget",
        "Fills a gap — you have no health coverage",
        "Highly rated by customers (4.8★)",
        "99.39% claim settlement ratio"
      ],
      "feature_contributions": {
        "budget_fit": 0.812,
        "age_fit": 0.943,
        "health_relevance": 0.400,
        "coverage_gap": 1.000,
        "income_fit": 0.871
      },
      "model_version": "v1.0.0"
    }
  ],
  "model_version": "v1.0.0",
  "generated_at": "2024-03-31T10:00:00Z",
  "from_cache": false,
  "fallback_used": false,
  "inference_ms": 12.4
}
```

### Training

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/training/train` | Trigger async retraining |
| `GET`  | `/training/jobs/{id}` | Job status |
| `GET`  | `/training/model` | Model info + metrics |
| `POST` | `/training/reload` | Hot-reload model |

### Interactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/interactions` | Record click/quote/purchase event |
| `GET`  | `/interactions/stats/{user_id}` | User interaction stats |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/health` | Full health check (DB + Redis + model) |
| `GET`  | `/health/ping` | Liveness probe |
| `GET`  | `/health/ready` | Readiness probe |

---

## Feature Engineering

44 features across three families:

### User Features (21)
- `age`, `age_squared`, `age_bucket` — age and non-linear age effects
- `gender_male`, `gender_female` — one-hot encoded gender
- `income_rank` — ordinal 1–5 from income bracket
- `city_tier_rank` — 1–3 city tier encoding
- `is_smoker`, `has_diabetes`, `has_hypertension`, `has_heart_disease` — health flags
- `health_risk_score` — sum of health flags
- `family_size`, `is_family` — household size
- `monthly_budget_log` — log-transformed budget
- `budget_to_income_ratio` — affordability ratio
- `num_existing_policies`, `has_health_coverage`, etc. — portfolio flags

### Policy Features (14)
- `premium_log`, `sum_assured_log` — log-transformed monetary values
- `premium_to_assured_ratio` — premium efficiency
- `waiting_period_norm`, `cashless_hospitals_log` — coverage quality
- `avg_rating`, `total_reviews_log`, `claim_ratio` — quality signals
- `is_featured`, `popularity_score` — platform signals
- `category_{health,life,term,motor,travel,home}` — one-hot category
- `age_eligibility` — binary eligibility flag
- `policy_term_norm` — normalised policy term

### Cross-Interaction Features (9)
- `budget_fit_score` — how well premium fits monthly budget
- `age_fit_score` — age proximity to eligibility centre
- `health_relevance_score` — health flags × policy category
- `coverage_gap_score` — whether category fills a portfolio gap
- `income_fit_score` — premium affordability vs annual income

**Key design:** All 44 features are computed by `ml/features/feature_definitions.py` — the **single source of truth** for both offline training and online inference. This prevents training-serving skew.

---

## Model

| Property | Value |
|----------|-------|
| Algorithm | XGBoost binary classifier |
| Objective | `binary:logistic` (purchase probability) |
| n_estimators | 400 (early stopping) |
| max_depth | 6 |
| Learning rate | 0.05 |
| Subsample | 0.8 |
| colsample_bytree | 0.8 |
| scale_pos_weight | 3.0 (handles class imbalance) |
| CV folds | 5-fold stratified |

### Typical Metrics (on 8K synthetic users)
| Metric | Value |
|--------|-------|
| AUC-ROC | ~0.87 |
| AUC-PR | ~0.61 |
| Precision@5 | ~0.42 |
| NDCG@5 | ~0.71 |
| MRR | ~0.68 |

---

## Fallback Strategy

When the ML model is not available (first boot, model file missing, inference error):
- The service automatically falls back to **rule-based weighted scoring**
- Same 5 scoring dimensions: budget fit, age fit, health relevance, coverage gap, income fit
- Response includes `"fallback_used": true`
- No service interruption — callers are unaffected

---

## Nightly Retraining

The APScheduler runs the following jobs automatically:

| Job | Schedule | Description |
|-----|----------|-------------|
| `nightly_retrain` | 2 AM IST daily | Retrain if ≥1000 new interactions |
| `refresh_policy_cache` | Every 10 min | Refresh Redis policy catalog |
| `model_health_check` | Every hour | Log model status |

Trigger manually:

```bash
curl -X POST http://localhost:8000/training/train \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

---

## Running Tests

```bash
# All tests
pytest

# Unit tests only (fast)
pytest -m unit

# With coverage report
pytest --cov=ml --cov=app --cov-report=html

# Specific module
pytest tests/test_features.py -v
pytest tests/test_recommender.py -v
pytest tests/test_evaluator.py -v
pytest tests/test_api.py -v
pytest tests/test_training.py -v
```

---

## Project Structure

```
coverai-ml/
├── app/
│   ├── main.py                   FastAPI app + lifespan
│   ├── middleware/
│   │   ├── logging_middleware.py  Structured request logging
│   │   └── error_handler.py       Global exception handlers
│   ├── models/
│   │   ├── database.py            Async SQLAlchemy setup
│   │   └── policy_repository.py   Policy DB + cache queries
│   ├── routers/
│   │   ├── recommend.py           /recommend endpoints
│   │   ├── training.py            /training endpoints
│   │   ├── health.py              /health endpoints
│   │   └── interactions.py        /interactions endpoints
│   └── schemas/
│       ├── request_schemas.py     Pydantic request models
│       └── response_schemas.py    Pydantic response models
│
├── ml/
│   ├── features/
│   │   ├── feature_definitions.py  44 engineered features (train+serve)
│   │   └── feature_store.py        Redis online feature store
│   ├── models/
│   │   ├── model_registry.py       Thread-safe model holder
│   │   └── recommender.py          Scoring engine (ML + fallback)
│   ├── training/
│   │   ├── data_generator.py       Synthetic data generation
│   │   ├── preprocessor.py         StandardScaler + imputation
│   │   ├── trainer.py              Full XGBoost training pipeline
│   │   └── scheduler.py            APScheduler nightly jobs
│   └── evaluation/
│       └── evaluator.py            Ranking metrics + A/B comparison
│
├── scripts/
│   ├── train.py                   CLI training entrypoint
│   ├── materialize_features.py    Populate Redis feature store
│   └── evaluate.py                Standalone evaluation runner
│
├── notebooks/
│   ├── 01_eda.ipynb               Exploratory data analysis
│   └── 02_model_training.ipynb    Training walkthrough
│
├── tests/
│   ├── conftest.py                Shared fixtures
│   ├── test_features.py           Feature engineering unit tests
│   ├── test_recommender.py        Recommender engine unit tests
│   ├── test_evaluator.py          Ranking metrics unit tests
│   ├── test_training.py           Data gen + preprocessor tests
│   └── test_api.py                FastAPI integration tests
│
├── config/
│   └── settings.py                Pydantic settings
├── data/
│   ├── raw/                       Parquet interaction files
│   ├── processed/                 EDA plots, evaluation reports
│   └── models/                    Saved model artifacts
├── logs/                          Log files
├── Dockerfile
├── docker-compose.yml
├── pytest.ini
├── requirements.txt
└── .env.example
```

---

## NestJS Integration

The CoverAI backend calls this service at `POST /recommend`:

```typescript
// NestJS recommendation service
const response = await this.httpService
  .post(`${mlServiceUrl}/recommend`, {
    features: {
      user_id: user.id,
      age: profile?.age || 30,
      gender: profile?.gender || 'OTHER',
      income_bracket: profile?.incomeBracket || '6L_TO_10L',
      city_tier: profile?.cityTier || 'TIER_2',
      is_smoker: profile?.isSmoker || false,
      has_diabetes: profile?.hasDiabetes || false,
      has_hypertension: profile?.hasHypertension || false,
      has_heart_disease: profile?.hasHeartDisease || false,
      family_members: profile?.familyMembers || 1,
      monthly_budget: profile?.monthlyBudget || 2000,
      purchased_categories: purchasedCategories,
    },
    category: dto.category,
    limit: dto.limit || 5,
  })
  .pipe(timeout(mlTimeout))
  .toPromise();
```
