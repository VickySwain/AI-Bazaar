"""
Shared pytest fixtures for unit and integration tests.
"""

import pytest
import asyncio
import numpy as np
from unittest.mock import AsyncMock, MagicMock, patch
from typing import List, Dict, Any

from app.schemas.request_schemas import UserFeatures, RecommendationRequest, IncomeBracket, CityTier, Gender


# ── Event loop ────────────────────────────────────────────────────────────
@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# ── Sample data ────────────────────────────────────────────────────────────
@pytest.fixture
def sample_user_features() -> UserFeatures:
    return UserFeatures(
        user_id="test-user-001",
        age=32,
        gender=Gender.MALE,
        income_bracket=IncomeBracket.SIX_TO_10L,
        city_tier=CityTier.TIER_2,
        is_smoker=False,
        has_diabetes=False,
        has_hypertension=False,
        has_heart_disease=False,
        family_members=2,
        monthly_budget=2500.0,
        purchased_categories=["MOTOR"],
    )


@pytest.fixture
def sample_user_dict(sample_user_features) -> Dict[str, Any]:
    return {
        "user_id":          sample_user_features.user_id,
        "age":              sample_user_features.age,
        "gender":           sample_user_features.gender.value,
        "income_bracket":   sample_user_features.income_bracket.value,
        "city_tier":        sample_user_features.city_tier.value,
        "is_smoker":        sample_user_features.is_smoker,
        "has_diabetes":     sample_user_features.has_diabetes,
        "has_hypertension": sample_user_features.has_hypertension,
        "has_heart_disease":sample_user_features.has_heart_disease,
        "family_members":   sample_user_features.family_members,
        "monthly_budget":   sample_user_features.monthly_budget,
        "purchased_categories": sample_user_features.purchased_categories,
    }


@pytest.fixture
def sample_policies() -> List[Dict[str, Any]]:
    return [
        {
            "id": "pol-001", "name": "Test Term Plan",
            "category": "TERM", "insurer": "Test Insurer", "insurer_name": "Test Insurer",
            "base_premium": 7200, "sum_assured": 10000000,
            "min_age": 18, "max_age": 65, "waiting_period_days": 0,
            "cashless_hospitals": 0, "co_payment_percent": 0,
            "avg_rating": 4.5, "total_reviews": 1000, "claim_settlement_ratio": 98.5,
            "is_featured": True, "popularity_score": 8.5, "policy_term_years": 30,
        },
        {
            "id": "pol-002", "name": "Test Health Plan",
            "category": "HEALTH", "insurer": "Test Insurer", "insurer_name": "Test Insurer",
            "base_premium": 9800, "sum_assured": 500000,
            "min_age": 18, "max_age": 65, "waiting_period_days": 30,
            "cashless_hospitals": 10000, "co_payment_percent": 0,
            "avg_rating": 4.7, "total_reviews": 2000, "claim_settlement_ratio": 99.0,
            "is_featured": True, "popularity_score": 9.0, "policy_term_years": 1,
        },
        {
            "id": "pol-003", "name": "Test Life Plan",
            "category": "LIFE", "insurer": "Test Insurer", "insurer_name": "Test Insurer",
            "base_premium": 15000, "sum_assured": 2000000,
            "min_age": 20, "max_age": 55, "waiting_period_days": 0,
            "cashless_hospitals": 0, "co_payment_percent": 0,
            "avg_rating": 4.3, "total_reviews": 800, "claim_settlement_ratio": 97.0,
            "is_featured": False, "popularity_score": 7.5, "policy_term_years": 20,
        },
    ]


@pytest.fixture
def sample_recommendation_request(sample_user_features) -> RecommendationRequest:
    return RecommendationRequest(features=sample_user_features, limit=5)


# ── Mock DB session ────────────────────────────────────────────────────────
@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.execute = AsyncMock()
    db.commit  = AsyncMock()
    return db


# ── Mock feature store ─────────────────────────────────────────────────────
@pytest.fixture
def mock_feature_store():
    store = AsyncMock()
    store.get_recommendations  = AsyncMock(return_value=None)
    store.set_recommendations  = AsyncMock(return_value=True)
    store.get_all_policies     = AsyncMock(return_value=None)
    store.get_policies_by_category = AsyncMock(return_value=None)
    store.is_connected         = AsyncMock(return_value=True)
    return store
