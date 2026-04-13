"""
FastAPI integration tests using TestClient.
Tests the full HTTP request/response cycle with mocked dependencies.
"""

import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

from app.main import create_app
from app.schemas.response_schemas import ScoredPolicy, PolicySummary, RecommendationResponse
from tests.conftest import *


@pytest.fixture(scope="module")
def client():
    """Create test client with mocked lifespan dependencies."""
    with patch("app.main.feature_store") as mock_fs, \
         patch("app.main.model_registry") as mock_mr, \
         patch("ml.training.scheduler.start_scheduler", return_value=MagicMock()):

        mock_fs.connect    = AsyncMock()
        mock_fs.disconnect = AsyncMock()
        mock_mr.load       = MagicMock(return_value=True)
        mock_mr.is_loaded  = True
        mock_mr.model_version = "v1.0.0"
        mock_mr.feature_count = 44

        app = create_app()
        with TestClient(app, raise_server_exceptions=True) as c:
            yield c


# ── Health Endpoints ───────────────────────────────────────────────────────
class TestHealthEndpoints:
    def test_ping(self, client):
        resp = client.get("/health/ping")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"

    def test_ready(self, client):
        resp = client.get("/health/ready")
        assert resp.status_code == 200
        data = resp.json()
        assert "ready" in data
        assert data["ready"] is True

    def test_root(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        data = resp.json()
        assert "service" in data
        assert "docs" in data


# ── Recommendation Endpoints ───────────────────────────────────────────────
class TestRecommendEndpoints:
    def _make_request_payload(self, user_id="u-test", age=30, category=None, limit=5):
        payload = {
            "features": {
                "user_id": user_id,
                "age": age,
                "gender": "MALE",
                "income_bracket": "6L_TO_10L",
                "city_tier": "TIER_2",
                "is_smoker": False,
                "has_diabetes": False,
                "has_hypertension": False,
                "has_heart_disease": False,
                "family_members": 2,
                "monthly_budget": 2500.0,
                "purchased_categories": [],
            },
            "limit": limit,
        }
        if category:
            payload["category"] = category
        return payload

    def _mock_recommend(self, policies):
        """Patch the recommend endpoint's dependencies."""
        from app.schemas.response_schemas import ScoredPolicy, PolicySummary

        mock_scored = [
            ScoredPolicy(
                policy=PolicySummary(
                    id=p["id"], name=p["name"], category=p["category"],
                    insurer_name=p["insurer"], base_premium=p["base_premium"],
                    avg_rating=p["avg_rating"],
                ),
                score=0.8 - i * 0.1,
                rank=i + 1,
                reasons=["Good fit for your profile"],
                model_version="v1.0.0",
            )
            for i, p in enumerate(policies[:3])
        ]
        return mock_scored

    def test_recommend_returns_200(self, client, sample_policies):
        with patch("app.routers.recommend.feature_store") as mock_fs, \
             patch("app.routers.recommend.policy_repository") as mock_repo, \
             patch("app.routers.recommend.recommendation_engine") as mock_eng, \
             patch("app.routers.recommend.model_registry") as mock_mr:

            mock_fs.get_recommendations  = AsyncMock(return_value=None)
            mock_fs.set_recommendations  = AsyncMock()
            mock_repo.get_active_policies = AsyncMock(return_value=sample_policies)
            mock_eng.recommend           = AsyncMock(
                return_value=(self._mock_recommend(sample_policies), False)
            )
            mock_mr.model_version = "v1.0.0"
            mock_mr.is_loaded     = True

            resp = client.post("/recommend", json=self._make_request_payload())

        assert resp.status_code == 200
        data = resp.json()
        assert "recommendations" in data
        assert "user_id" in data
        assert data["user_id"] == "u-test"

    def test_recommend_cache_hit(self, client, sample_policies):
        cached = [
            {
                "policy": {
                    "id": "p-1", "name": "Cached Plan", "category": "HEALTH",
                    "insurer_name": "Ins", "base_premium": 9000, "avg_rating": 4.5,
                },
                "score": 0.75, "rank": 1, "reasons": [], "model_version": "v1.0.0",
            }
        ]
        with patch("app.routers.recommend.feature_store") as mock_fs, \
             patch("app.routers.recommend.policy_repository"), \
             patch("app.routers.recommend.model_registry") as mock_mr:

            mock_fs.get_recommendations = AsyncMock(return_value=cached)
            mock_mr.model_version = "v1.0.0"

            resp = client.post("/recommend", json=self._make_request_payload())

        assert resp.status_code == 200
        data = resp.json()
        assert data["from_cache"] is True

    def test_recommend_with_category_filter(self, client, sample_policies):
        health_policies = [p for p in sample_policies if p["category"] == "HEALTH"]

        with patch("app.routers.recommend.feature_store") as mock_fs, \
             patch("app.routers.recommend.policy_repository") as mock_repo, \
             patch("app.routers.recommend.recommendation_engine") as mock_eng, \
             patch("app.routers.recommend.model_registry") as mock_mr:

            mock_fs.get_recommendations  = AsyncMock(return_value=None)
            mock_fs.set_recommendations  = AsyncMock()
            mock_repo.get_active_policies = AsyncMock(return_value=health_policies)
            mock_eng.recommend           = AsyncMock(
                return_value=(self._mock_recommend(health_policies), False)
            )
            mock_mr.model_version = "v1.0.0"

            payload = self._make_request_payload(category="HEALTH")
            resp = client.post("/recommend", json=payload)

        assert resp.status_code == 200

    def test_recommend_invalid_age(self, client):
        payload = self._make_request_payload(age=0)
        resp = client.post("/recommend", json=payload)
        assert resp.status_code == 422

    def test_recommend_invalid_limit(self, client):
        payload = self._make_request_payload(limit=0)
        resp = client.post("/recommend", json=payload)
        assert resp.status_code == 422

    def test_insights_endpoint(self, client):
        payload = {
            "user_id": "u-001",
            "age": 25,
            "gender": "MALE",
            "income_bracket": "3L_TO_6L",
            "city_tier": "TIER_3",
            "is_smoker": True,
            "has_diabetes": False,
            "has_hypertension": False,
            "has_heart_disease": False,
            "family_members": 1,
            "monthly_budget": 1500.0,
            "purchased_categories": [],
        }
        resp = client.post("/recommend/insights", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert "insights" in data
        assert isinstance(data["insights"], list)

    def test_explain_endpoint(self, client):
        with patch("app.routers.recommend.model_registry") as mock_mr:
            mock_mr.is_loaded = False
            resp = client.get("/recommend/explain")

        assert resp.status_code == 200
        data = resp.json()
        assert "model_loaded" in data


# ── Training Endpoints ─────────────────────────────────────────────────────
class TestTrainingEndpoints:
    def test_model_info(self, client):
        with patch("app.routers.training.model_registry") as mock_mr:
            mock_mr.get_info.return_value = {
                "version": "v1.0.0",
                "algorithm": "XGBoost",
                "trained_at": None,
                "training_samples": 8000,
                "feature_count": 44,
                "metrics": {"auc_roc": 0.87},
                "is_loaded": True,
                "fallback_active": False,
            }
            resp = client.get("/training/model")

        assert resp.status_code == 200
        data = resp.json()
        assert data["version"] == "v1.0.0"
        assert data["feature_count"] == 44

    def test_trigger_training(self, client):
        resp = client.post("/training/train", json={"force": False})
        assert resp.status_code == 200
        data = resp.json()
        assert "job_id" in data
        assert data["status"] == "RUNNING"

    def test_reload_model_no_file(self, client):
        with patch("app.routers.training.model_registry") as mock_mr:
            mock_mr.reload.return_value = False
            resp = client.post("/training/reload")

        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "warning"


# ── Interaction Endpoints ──────────────────────────────────────────────────
class TestInteractionEndpoints:
    def test_record_interaction_click(self, client):
        with patch("app.routers.interactions.feature_store"):
            payload = {
                "user_id": "u-test",
                "policy_id": "pol-001",
                "action": "click",
            }
            resp = client.post("/interactions", json=payload)

        assert resp.status_code == 202
        data = resp.json()
        assert data["accepted"] is True

    def test_record_interaction_purchase_invalidates_cache(self, client):
        with patch("app.routers.interactions.feature_store") as mock_fs:
            mock_fs.invalidate_recommendations = AsyncMock(return_value=3)
            payload = {
                "user_id": "u-test",
                "policy_id": "pol-001",
                "action": "purchase",
            }
            resp = client.post("/interactions", json=payload)

        assert resp.status_code == 202

    def test_invalid_action(self, client):
        payload = {
            "user_id": "u-test",
            "policy_id": "pol-001",
            "action": "invalid_action",
        }
        resp = client.post("/interactions", json=payload)
        assert resp.status_code == 422
