"""
Unit tests for feature engineering.
Verifies that feature vectors are correctly shaped, bounded, and consistent
between training and inference paths.
"""

import pytest
import numpy as np
from ml.features.feature_definitions import (
    engineer_user_features,
    engineer_policy_features,
    engineer_interaction_features,
    build_feature_vector,
    build_feature_matrix,
    ALL_FEATURES,
    get_feature_names,
)


# ── Fixtures ───────────────────────────────────────────────────────────────
@pytest.fixture
def user():
    return {
        "user_id": "u-001",
        "age": 32,
        "gender": "MALE",
        "income_bracket": "6L_TO_10L",
        "city_tier": "TIER_2",
        "is_smoker": False,
        "has_diabetes": False,
        "has_hypertension": True,
        "has_heart_disease": False,
        "family_members": 3,
        "monthly_budget": 2500.0,
        "purchased_categories": ["MOTOR"],
    }


@pytest.fixture
def policy():
    return {
        "id": "p-001",
        "category": "HEALTH",
        "base_premium": 9800,
        "sum_assured": 500000,
        "min_age": 18,
        "max_age": 65,
        "waiting_period_days": 30,
        "cashless_hospitals": 12000,
        "co_payment_percent": 0,
        "avg_rating": 4.7,
        "total_reviews": 2500,
        "claim_settlement_ratio": 99.1,
        "is_featured": True,
        "popularity_score": 9.0,
        "policy_term_years": 1,
    }


# ── User Feature Tests ─────────────────────────────────────────────────────
class TestUserFeatures:
    def test_returns_dict(self, user):
        feats = engineer_user_features(user)
        assert isinstance(feats, dict)

    def test_all_expected_keys_present(self, user):
        feats = engineer_user_features(user)
        expected = [
            "age", "age_squared", "age_bucket", "gender_male", "gender_female",
            "income_rank", "city_tier_rank", "is_smoker", "has_diabetes",
            "has_hypertension", "has_heart_disease", "health_risk_score",
            "family_size", "is_family", "monthly_budget_log",
        ]
        for key in expected:
            assert key in feats, f"Missing key: {key}"

    def test_age_squared_correct(self, user):
        feats = engineer_user_features(user)
        assert feats["age_squared"] == pytest.approx(user["age"] ** 2)

    def test_health_risk_score_hypertension(self, user):
        feats = engineer_user_features(user)
        # Only has_hypertension=True → risk score = 1
        assert feats["health_risk_score"] == 1.0

    def test_is_family_true(self, user):
        feats = engineer_user_features(user)
        assert feats["is_family"] == 1.0  # family_members = 3

    def test_monthly_budget_log_positive(self, user):
        feats = engineer_user_features(user)
        assert feats["monthly_budget_log"] > 0

    def test_all_values_are_float(self, user):
        feats = engineer_user_features(user)
        for k, v in feats.items():
            assert isinstance(v, float), f"Feature {k} is not float: {type(v)}"

    def test_gender_one_hot_male(self, user):
        feats = engineer_user_features(user)
        assert feats["gender_male"] == 1.0
        assert feats["gender_female"] == 0.0

    def test_income_rank_range(self, user):
        feats = engineer_user_features(user)
        assert 1 <= feats["income_rank"] <= 5


# ── Policy Feature Tests ───────────────────────────────────────────────────
class TestPolicyFeatures:
    def test_returns_dict(self, policy):
        feats = engineer_policy_features(policy, user_age=32)
        assert isinstance(feats, dict)

    def test_premium_log_positive(self, policy):
        feats = engineer_policy_features(policy, user_age=32)
        assert feats["premium_log"] > 0

    def test_age_eligibility_in_range(self, policy):
        feats = engineer_policy_features(policy, user_age=32)
        assert feats["age_eligibility"] == 1.0  # 18 <= 32 <= 65

    def test_age_eligibility_out_of_range(self, policy):
        feats = engineer_policy_features(policy, user_age=15)
        assert feats["age_eligibility"] == 0.0

    def test_category_one_hot_health(self, policy):
        feats = engineer_policy_features(policy, user_age=32)
        assert feats["category_health"] == 1.0
        assert feats["category_term"] == 0.0
        assert feats["category_life"] == 0.0

    def test_cashless_hospitals_log(self, policy):
        feats = engineer_policy_features(policy, user_age=32)
        import math
        assert feats["cashless_hospitals_log"] == pytest.approx(math.log1p(12000))

    def test_claim_ratio_normalised(self, policy):
        feats = engineer_policy_features(policy, user_age=32)
        assert 0 <= feats["claim_ratio"] <= 1.0


# ── Interaction Feature Tests ──────────────────────────────────────────────
class TestInteractionFeatures:
    def test_returns_dict(self, user, policy):
        feats = engineer_interaction_features(user, policy)
        assert isinstance(feats, dict)

    def test_all_scores_in_range(self, user, policy):
        feats = engineer_interaction_features(user, policy)
        for k, v in feats.items():
            assert 0.0 <= v <= 1.0, f"{k}={v} out of [0,1]"

    def test_coverage_gap_health(self, user, policy):
        feats = engineer_interaction_features(user, policy)
        # HEALTH not in purchased_categories=["MOTOR"] → gap=1
        assert feats["coverage_gap_score"] == 1.0

    def test_coverage_gap_no_gap(self, user, policy):
        user_with_health = {**user, "purchased_categories": ["HEALTH", "MOTOR"]}
        feats = engineer_interaction_features(user_with_health, policy)
        assert feats["coverage_gap_score"] == 0.0

    def test_health_relevance_health_policy(self, user, policy):
        # User has hypertension → health plan should be relevant
        feats = engineer_interaction_features(user, policy)
        assert feats["health_relevance_score"] > 0.3


# ── Full Feature Vector Tests ──────────────────────────────────────────────
class TestFeatureVector:
    def test_shape_correct(self, user, policy):
        vec = build_feature_vector(user, policy)
        assert vec.shape == (len(ALL_FEATURES),)

    def test_dtype_float32(self, user, policy):
        vec = build_feature_vector(user, policy)
        assert vec.dtype == np.float32

    def test_no_nan_values(self, user, policy):
        vec = build_feature_vector(user, policy)
        assert not np.isnan(vec).any(), "Feature vector contains NaN"

    def test_no_inf_values(self, user, policy):
        vec = build_feature_vector(user, policy)
        assert not np.isinf(vec).any(), "Feature vector contains Inf"

    def test_matrix_shape(self, user, sample_policies):
        mat = build_feature_matrix(user, sample_policies)
        assert mat.shape == (len(sample_policies), len(ALL_FEATURES))

    def test_feature_names_length(self):
        names = get_feature_names()
        assert len(names) == len(ALL_FEATURES)
        assert names == ALL_FEATURES

    def test_default_user_no_crash(self, policy):
        """Empty/default user should not crash feature engineering."""
        minimal_user = {"user_id": "x"}
        vec = build_feature_vector(minimal_user, policy)
        assert vec.shape == (len(ALL_FEATURES),)
        assert not np.isnan(vec).any()
