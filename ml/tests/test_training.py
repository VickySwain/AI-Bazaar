"""Tests for data generation and preprocessing pipeline."""

import pytest
import numpy as np
import pandas as pd
from ml.training.data_generator import (
    generate_user_profile,
    compute_purchase_probability,
    generate_interaction_dataset,
    POLICIES,
)
from ml.training.preprocessor import RecommendationPreprocessor


class TestDataGenerator:
    def test_generate_user_profile_valid(self):
        user = generate_user_profile()
        assert isinstance(user, dict)
        assert 18 <= user["age"] <= 70
        assert user["gender"] in ("MALE", "FEMALE", "OTHER")
        assert user["income_bracket"] in (
            "BELOW_3L", "3L_TO_6L", "6L_TO_10L", "10L_TO_20L", "ABOVE_20L"
        )
        assert user["monthly_budget"] > 0
        assert user["family_members"] >= 1

    def test_purchase_probability_in_range(self):
        user = generate_user_profile()
        for policy in POLICIES:
            prob = compute_purchase_probability(user, policy)
            assert 0.0 <= prob <= 1.0, f"Probability {prob} out of range"

    def test_ineligible_age_returns_zero(self):
        young_user = generate_user_profile()
        young_user["age"] = 17

        senior_policy = {
            "id": "x", "category": "HEALTH", "base_premium": 20000,
            "sum_assured": 500000, "min_age": 60, "max_age": 80,
            "waiting_period_days": 0, "avg_rating": 4.0, "total_reviews": 100,
            "claim_settlement_ratio": 97.0, "is_featured": False, "popularity_score": 5.0,
        }
        prob = compute_purchase_probability(young_user, senior_policy)
        assert prob == 0.0

    def test_generate_interaction_dataset_small(self):
        df = generate_interaction_dataset(n_users=100)
        assert isinstance(df, pd.DataFrame)
        assert len(df) > 0
        assert "label" in df.columns
        assert "user_id" in df.columns
        assert "policy_id" in df.columns
        assert df["label"].isin([0, 1]).all()

    def test_dataset_has_both_classes(self):
        df = generate_interaction_dataset(n_users=200)
        assert df["label"].sum() > 0, "No positive examples"
        assert (df["label"] == 0).sum() > 0, "No negative examples"

    def test_dataset_has_correct_columns(self):
        df = generate_interaction_dataset(n_users=50)
        required = [
            "user_id", "policy_id", "label", "age", "gender",
            "income_bracket", "base_premium", "policy_category",
        ]
        for col in required:
            assert col in df.columns, f"Missing column: {col}"


class TestPreprocessor:
    @pytest.fixture
    def small_df(self):
        return generate_interaction_dataset(n_users=100)

    def test_fit_transform_shape(self, small_df):
        pp = RecommendationPreprocessor()
        X = pp.fit_transform(small_df)
        from ml.features.feature_definitions import ALL_FEATURES
        assert X.shape == (len(small_df), len(ALL_FEATURES))

    def test_fit_transform_dtype(self, small_df):
        pp = RecommendationPreprocessor()
        X = pp.fit_transform(small_df)
        assert X.dtype == np.float32

    def test_no_nan_after_preprocessing(self, small_df):
        pp = RecommendationPreprocessor()
        X = pp.fit_transform(small_df)
        assert not np.isnan(X).any()

    def test_no_inf_after_preprocessing(self, small_df):
        pp = RecommendationPreprocessor()
        X = pp.fit_transform(small_df)
        assert not np.isinf(X).any()

    def test_transform_requires_fit(self, small_df):
        pp = RecommendationPreprocessor()
        with pytest.raises(RuntimeError, match="fitted"):
            pp.transform(small_df)

    def test_transform_single_shape(self, small_df):
        from ml.features.feature_definitions import ALL_FEATURES
        pp = RecommendationPreprocessor()
        pp.fit_transform(small_df)

        user = {"age": 30, "income_bracket": "6L_TO_10L", "city_tier": "TIER_2",
                "gender": "MALE", "is_smoker": False, "has_diabetes": False,
                "has_hypertension": False, "has_heart_disease": False,
                "family_members": 1, "monthly_budget": 2000, "purchased_categories": []}
        policy = POLICIES[0]

        X = pp.transform_single(user, policy)
        assert X.shape == (1, len(ALL_FEATURES))

    def test_transform_batch_shape(self, small_df):
        from ml.features.feature_definitions import ALL_FEATURES
        pp = RecommendationPreprocessor()
        pp.fit_transform(small_df)

        user = {"age": 30, "income_bracket": "6L_TO_10L", "city_tier": "TIER_2",
                "gender": "MALE", "is_smoker": False, "has_diabetes": False,
                "has_hypertension": False, "has_heart_disease": False,
                "family_members": 1, "monthly_budget": 2000, "purchased_categories": []}

        X = pp.transform_batch(user, POLICIES)
        assert X.shape == (len(POLICIES), len(ALL_FEATURES))

    def test_save_and_load(self, small_df, tmp_path):
        pp = RecommendationPreprocessor()
        pp.fit_transform(small_df)

        scaler_path = tmp_path / "scaler.joblib"
        names_path  = tmp_path / "features.json"

        pp.save(scaler_path, names_path)
        assert scaler_path.exists()
        assert names_path.exists()

        loaded = RecommendationPreprocessor.load(scaler_path, names_path)
        assert loaded._is_fitted is True
        assert len(loaded.feature_names) > 0

        # Loaded preprocessor should transform identically
        user = {"age": 30, "income_bracket": "6L_TO_10L", "city_tier": "TIER_2",
                "gender": "MALE", "is_smoker": False, "has_diabetes": False,
                "has_hypertension": False, "has_heart_disease": False,
                "family_members": 1, "monthly_budget": 2000, "purchased_categories": []}
        orig  = pp.transform_single(user, POLICIES[0])
        reloaded = loaded.transform_single(user, POLICIES[0])
        np.testing.assert_array_almost_equal(orig, reloaded)
