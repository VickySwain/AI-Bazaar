"""
Unit tests for the recommendation engine.
Uses mocked ML model registry so tests are fast and deterministic.
"""

import pytest
import numpy as np
from unittest.mock import AsyncMock, MagicMock, patch
from typing import List, Dict, Any

from app.schemas.request_schemas import UserFeatures, Gender, IncomeBracket, CityTier
from app.schemas.response_schemas import ScoredPolicy
from ml.models.recommender import RecommendationEngine


@pytest.fixture
def engine():
    return RecommendationEngine()


@pytest.fixture
def user_features():
    return UserFeatures(
        user_id="u-test",
        age=28,
        gender=Gender.FEMALE,
        income_bracket=IncomeBracket.SIX_TO_10L,
        city_tier=CityTier.TIER_1,
        is_smoker=False,
        has_diabetes=True,
        has_hypertension=False,
        has_heart_disease=False,
        family_members=1,
        monthly_budget=2000.0,
        purchased_categories=[],
    )


@pytest.fixture
def policies() -> List[Dict[str, Any]]:
    return [
        {
            "id": "p-1", "name": "Health Plus", "category": "HEALTH",
            "insurer": "Insurer A", "base_premium": 8000, "sum_assured": 500000,
            "min_age": 18, "max_age": 65, "waiting_period_days": 30,
            "cashless_hospitals": 10000, "co_payment_percent": 0,
            "avg_rating": 4.7, "total_reviews": 3000, "claim_settlement_ratio": 99.0,
            "is_featured": True, "popularity_score": 9.2, "policy_term_years": 1,
        },
        {
            "id": "p-2", "name": "Term Shield", "category": "TERM",
            "insurer": "Insurer B", "base_premium": 6500, "sum_assured": 10000000,
            "min_age": 18, "max_age": 60, "waiting_period_days": 0,
            "cashless_hospitals": 0, "co_payment_percent": 0,
            "avg_rating": 4.5, "total_reviews": 1500, "claim_settlement_ratio": 98.5,
            "is_featured": False, "popularity_score": 8.0, "policy_term_years": 30,
        },
        {
            "id": "p-3", "name": "Senior Plan", "category": "HEALTH",
            "insurer": "Insurer C", "base_premium": 25000, "sum_assured": 500000,
            "min_age": 60, "max_age": 80, "waiting_period_days": 90,  # user age 28 → ineligible
            "cashless_hospitals": 5000, "co_payment_percent": 20,
            "avg_rating": 4.0, "total_reviews": 500, "claim_settlement_ratio": 97.0,
            "is_featured": False, "popularity_score": 6.0, "policy_term_years": 1,
        },
    ]


# ── Rule-Based Scoring ─────────────────────────────────────────────────────
class TestRuleBasedScoring:
    def test_returns_ndarray(self, engine, policies):
        user = {
            "user_id": "u-test", "age": 28, "gender": "FEMALE",
            "income_bracket": "6L_TO_10L", "city_tier": "TIER_1",
            "is_smoker": False, "has_diabetes": True, "has_hypertension": False,
            "has_heart_disease": False, "family_members": 1,
            "monthly_budget": 2000.0, "purchased_categories": [],
        }
        scores = engine._rule_based_scores(user, policies)
        assert isinstance(scores, np.ndarray)
        assert len(scores) == len(policies)

    def test_all_scores_in_range(self, engine, policies):
        user = {
            "user_id": "u", "age": 28, "income_bracket": "6L_TO_10L",
            "city_tier": "TIER_2", "is_smoker": False, "has_diabetes": True,
            "has_hypertension": False, "has_heart_disease": False,
            "family_members": 1, "monthly_budget": 2000.0,
            "purchased_categories": [],
        }
        scores = engine._rule_based_scores(user, policies)
        assert (scores >= 0).all()
        assert (scores <= 1).all()

    def test_ineligible_policy_gets_zero(self, engine, policies):
        """Senior plan (min_age=60) should score 0 for age-28 user."""
        user = {
            "user_id": "u", "age": 28, "income_bracket": "6L_TO_10L",
            "city_tier": "TIER_2", "is_smoker": False, "has_diabetes": False,
            "has_hypertension": False, "has_heart_disease": False,
            "family_members": 1, "monthly_budget": 2000.0,
            "purchased_categories": [],
        }
        scores = engine._rule_based_scores(user, policies)
        # policies[2] is the senior plan (min_age=60)
        assert scores[2] == 0.0

    def test_health_plan_scores_higher_for_diabetic(self, engine, policies):
        """User with diabetes should get a higher score for health plan vs term."""
        user_diabetic = {
            "user_id": "u", "age": 30, "income_bracket": "6L_TO_10L",
            "city_tier": "TIER_2", "is_smoker": False, "has_diabetes": True,
            "has_hypertension": False, "has_heart_disease": False,
            "family_members": 1, "monthly_budget": 3000.0,
            "purchased_categories": [],
        }
        user_healthy = {**user_diabetic, "has_diabetes": False}

        scores_diabetic = engine._rule_based_scores(user_diabetic, policies[:2])
        scores_healthy  = engine._rule_based_scores(user_healthy,  policies[:2])

        # Health plan (idx 0) should score relatively higher for diabetic user
        health_diff = scores_diabetic[0] - scores_healthy[0]
        assert health_diff > 0, f"Expected higher health score for diabetic, got diff={health_diff}"


# ── Reason Generation ──────────────────────────────────────────────────────
class TestReasonGeneration:
    def test_returns_list(self, engine, policies):
        user = {
            "age": 28, "monthly_budget": 2000.0,
            "purchased_categories": [], "is_smoker": False,
            "has_diabetes": True, "has_hypertension": False,
            "has_heart_disease": False, "family_members": 1,
        }
        reasons = engine._generate_reasons(user, policies[0], score=0.7)
        assert isinstance(reasons, list)

    def test_max_4_reasons(self, engine, policies):
        user = {
            "age": 25, "monthly_budget": 500.0,
            "purchased_categories": [], "is_smoker": True,
            "has_diabetes": True, "has_hypertension": True,
            "has_heart_disease": True, "family_members": 4,
        }
        reasons = engine._generate_reasons(user, policies[0], score=0.9)
        assert len(reasons) <= 4

    def test_coverage_gap_reason(self, engine, policies):
        user = {
            "age": 28, "monthly_budget": 2000.0, "purchased_categories": [],
            "is_smoker": False, "has_diabetes": False,
            "has_hypertension": False, "has_heart_disease": False, "family_members": 1,
        }
        reasons = engine._generate_reasons(user, policies[0], score=0.7)
        gap_reasons = [r for r in reasons if "gap" in r.lower() or "coverage" in r.lower() or "health" in r.lower()]
        assert len(gap_reasons) > 0


# ── Full Recommend (async) ────────────────────────────────────────────────
class TestRecommendAsync:
    @pytest.mark.asyncio
    async def test_recommend_returns_scored_policies(
        self, engine, user_features, policies
    ):
        with patch("ml.models.recommender.model_registry") as mock_registry:
            mock_registry.is_loaded = False  # force fallback
            mock_registry.model_version = "rule-based-v1"

            results, fallback_used = await engine.recommend(
                user_features=user_features,
                policies=policies,
                limit=3,
            )

        assert isinstance(results, list)
        assert fallback_used is True
        # Should return at most 2 (senior plan is ineligible)
        assert len(results) <= 2

    @pytest.mark.asyncio
    async def test_recommend_respects_limit(self, engine, user_features, policies):
        with patch("ml.models.recommender.model_registry") as mock_registry:
            mock_registry.is_loaded = False
            mock_registry.model_version = "rule-based-v1"

            results, _ = await engine.recommend(
                user_features=user_features,
                policies=policies,
                limit=1,
            )

        assert len(results) <= 1

    @pytest.mark.asyncio
    async def test_recommend_ranks_descending(self, engine, user_features, policies):
        with patch("ml.models.recommender.model_registry") as mock_registry:
            mock_registry.is_loaded = False
            mock_registry.model_version = "rule-based-v1"

            results, _ = await engine.recommend(
                user_features=user_features,
                policies=policies,
                limit=5,
            )

        if len(results) >= 2:
            for i in range(len(results) - 1):
                assert results[i].score >= results[i + 1].score, (
                    f"Not sorted: {results[i].score} < {results[i+1].score}"
                )

    @pytest.mark.asyncio
    async def test_recommend_with_ml_model(self, engine, user_features, policies):
        mock_scores = np.array([0.8, 0.6, 0.0])  # senior plan = 0

        with patch("ml.models.recommender.model_registry") as mock_registry:
            mock_registry.is_loaded = True
            mock_registry.model_version = "v1.0.0"
            mock_registry.predict_proba_batch = MagicMock(return_value=mock_scores)

            results, fallback_used = await engine.recommend(
                user_features=user_features,
                policies=policies,
                limit=5,
            )

        assert fallback_used is False
        assert results[0].score == pytest.approx(0.8)

    @pytest.mark.asyncio
    async def test_recommend_excludes_ids(self, engine, user_features, policies):
        with patch("ml.models.recommender.model_registry") as mock_registry:
            mock_registry.is_loaded = False
            mock_registry.model_version = "rule-based-v1"

            results, _ = await engine.recommend(
                user_features=user_features,
                policies=policies,
                exclude_ids=["p-1"],
            )

        policy_ids = [r.policy.id for r in results]
        assert "p-1" not in policy_ids

    @pytest.mark.asyncio
    async def test_recommend_empty_policies_returns_empty(self, engine, user_features):
        with patch("ml.models.recommender.model_registry") as mock_registry:
            mock_registry.is_loaded = False
            mock_registry.model_version = "rule-based-v1"

            results, _ = await engine.recommend(
                user_features=user_features,
                policies=[],
                limit=5,
            )

        assert results == []
