"""
Feature preprocessing pipeline.
Transforms raw interaction DataFrame into scaled feature matrix.
Fits scaler + encoder in training; applies in inference.
"""

import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Tuple, List, Optional, Dict, Any
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.impute import SimpleImputer
from loguru import logger

from ml.features.feature_definitions import (
    build_feature_matrix,
    build_feature_vector,
    engineer_user_features,
    engineer_policy_features,
    engineer_interaction_features,
    ALL_FEATURES,
    INCOME_BRACKET_MAP,
    INCOME_RANK_MAP,
    CITY_TIER_RANK_MAP,
)


class RecommendationPreprocessor:
    """
    Stateful preprocessor: fit on training data, transform on inference.
    Serialisable via joblib.
    """

    def __init__(self):
        self.scaler = StandardScaler()
        self.imputer = SimpleImputer(strategy="median")
        self.feature_names: List[str] = ALL_FEATURES
        self._is_fitted = False

    def fit_transform(self, df: pd.DataFrame) -> np.ndarray:
        """
        Build feature matrix from raw DataFrame and fit preprocessing steps.
        Returns (N, F) float32 array.
        """
        logger.info(f"Fitting preprocessor on {len(df)} samples…")
        X = self._dataframe_to_features(df)

        # Fit imputer → fill NaNs
        X = self.imputer.fit_transform(X)

        # Fit scaler → normalise
        X = self.scaler.fit_transform(X)

        self._is_fitted = True
        logger.info(f"Preprocessor fitted. Feature matrix: {X.shape}")
        return X.astype(np.float32)

    def transform(self, df: pd.DataFrame) -> np.ndarray:
        """Apply fitted preprocessing steps to new data."""
        if not self._is_fitted:
            raise RuntimeError("Preprocessor must be fitted before transform()")
        X = self._dataframe_to_features(df)
        X = self.imputer.transform(X)
        X = self.scaler.transform(X)
        return X.astype(np.float32)

    def transform_single(
        self,
        user: Dict[str, Any],
        policy: Dict[str, Any],
    ) -> np.ndarray:
        """
        Transform a single (user, policy) pair for real-time inference.
        Returns shape (1, F).
        """
        if not self._is_fitted:
            raise RuntimeError("Preprocessor must be fitted before use")

        vec = build_feature_vector(user, policy).reshape(1, -1)
        vec = self.imputer.transform(vec)
        vec = self.scaler.transform(vec)
        return vec.astype(np.float32)

    def transform_batch(
        self,
        user: Dict[str, Any],
        policies: List[Dict[str, Any]],
    ) -> np.ndarray:
        """
        Transform one user against N policies for batch ranking.
        Returns shape (N, F).
        """
        if not self._is_fitted:
            raise RuntimeError("Preprocessor must be fitted before use")

        X = build_feature_matrix(user, policies)   # (N, F) raw
        X = self.imputer.transform(X)
        X = self.scaler.transform(X)
        return X.astype(np.float32)

    def _dataframe_to_features(self, df: pd.DataFrame) -> np.ndarray:
        """
        Convert a raw interaction DataFrame to a feature matrix.
        Each row is one (user, policy) pair.
        """
        rows = []
        for _, row in df.iterrows():
            user = {
                "user_id": row.get("user_id", ""),
                "age": row.get("age", 30),
                "gender": row.get("gender", "OTHER"),
                "income_bracket": row.get("income_bracket", "6L_TO_10L"),
                "city_tier": row.get("city_tier", "TIER_2"),
                "is_smoker": bool(row.get("is_smoker", False)),
                "has_diabetes": bool(row.get("has_diabetes", False)),
                "has_hypertension": bool(row.get("has_hypertension", False)),
                "has_heart_disease": bool(row.get("has_heart_disease", False)),
                "family_members": int(row.get("family_members", 1)),
                "monthly_budget": float(row.get("monthly_budget", 2000)),
                "purchased_categories": [],
            }
            # Reconstruct purchased_categories from flags
            cats = []
            if row.get("has_health_coverage"): cats.append("HEALTH")
            if row.get("has_life_coverage"):   cats.append("LIFE")
            if row.get("has_term_coverage"):    cats.append("TERM")
            if row.get("has_motor_coverage"):   cats.append("MOTOR")
            user["purchased_categories"] = cats

            policy = {
                "id": row.get("policy_id", ""),
                "category": row.get("policy_category", "HEALTH"),
                "base_premium": float(row.get("base_premium", 0)),
                "sum_assured": float(row.get("sum_assured", 0)),
                "min_age": int(row.get("min_age", 0)),
                "max_age": int(row.get("max_age", 99)),
                "waiting_period_days": int(row.get("waiting_period_days", 30)),
                "cashless_hospitals": int(row.get("cashless_hospitals", 0)),
                "co_payment_percent": float(row.get("co_payment_percent", 0)),
                "avg_rating": float(row.get("avg_rating", 3.0)),
                "total_reviews": int(row.get("total_reviews", 0)),
                "claim_settlement_ratio": float(row.get("claim_settlement_ratio", 97.0)),
                "is_featured": bool(row.get("is_featured", False)),
                "popularity_score": float(row.get("popularity_score", 5.0)),
                "policy_term_years": float(row.get("policy_term_years", 1)),
            }

            vec = build_feature_vector(user, policy)
            rows.append(vec)

        return np.stack(rows, axis=0)

    def save(self, scaler_path: Path, feature_names_path: Path) -> None:
        joblib.dump(
            {"scaler": self.scaler, "imputer": self.imputer, "is_fitted": self._is_fitted},
            scaler_path,
        )
        with open(feature_names_path, "w") as f:
            json.dump({"features": self.feature_names}, f, indent=2)
        logger.info(f"Preprocessor saved to {scaler_path}")

    @classmethod
    def load(cls, scaler_path: Path, feature_names_path: Path) -> "RecommendationPreprocessor":
        obj = cls()
        data = joblib.load(scaler_path)
        obj.scaler = data["scaler"]
        obj.imputer = data["imputer"]
        obj._is_fitted = data["is_fitted"]
        with open(feature_names_path) as f:
            obj.feature_names = json.load(f)["features"]
        logger.info(f"Preprocessor loaded from {scaler_path}")
        return obj
