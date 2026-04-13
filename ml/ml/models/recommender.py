"""
Recommendation scoring engine.
Orchestrates: feature store → ML model (or rule-based fallback) → rank → explain.
"""

import time
import asyncio
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from loguru import logger

from ml.models.model_registry import model_registry
from ml.features.feature_store import feature_store
from ml.features.feature_definitions import (
    engineer_user_features,
    engineer_policy_features,
    engineer_interaction_features,
    INCOME_BRACKET_MAP,
)
from app.schemas.request_schemas import UserFeatures
from app.schemas.response_schemas import ScoredPolicy, PolicySummary
from config.settings import get_settings

settings = get_settings()


class RecommendationEngine:
    """
    Scores and ranks insurance policies for a given user.

    Strategy:
    1. Try ML model (XGBoost) → fast, accurate when trained
    2. Fall back to rule-based weighted scoring if model not loaded
    Both paths produce identical output shapes so callers are unaware.
    """

    async def recommend(
        self,
        user_features: UserFeatures,
        policies: List[Dict[str, Any]],
        category_filter: Optional[str] = None,
        limit: int = 5,
        exclude_ids: Optional[List[str]] = None,
    ) -> Tuple[List[ScoredPolicy], bool]:
        """
        Returns (scored_policies, fallback_used).
        scored_policies is sorted descending by score, truncated to limit.
        """
        t0 = time.time()
        exclude_ids = exclude_ids or []

        # Filter policies
        eligible = [
            p for p in policies
            if p["id"] not in exclude_ids
            and (category_filter is None or p.get("category") == category_filter)
            and p.get("min_age", 0) <= user_features.age <= p.get("max_age", 99)
        ]

        if not eligible:
            logger.warning(f"No eligible policies for user {user_features.user_id}")
            return [], False

        user_dict = self._features_to_dict(user_features)

        # Attempt ML scoring
        scores = None
        fallback = False

        if model_registry.is_loaded:
            scores = model_registry.predict_proba_batch(user_dict, eligible)
            if scores is None:
                logger.warning("ML scoring returned None — switching to rule-based")
                fallback = True
        else:
            fallback = True

        if fallback or scores is None:
            scores = self._rule_based_scores(user_dict, eligible)

        # Rank
        ranked_indices = np.argsort(scores)[::-1][:limit]
        results = []

        for rank, idx in enumerate(ranked_indices, start=1):
            policy = eligible[idx]
            score = float(scores[idx])

            reasons = self._generate_reasons(user_dict, policy, score)
            contributions = self._feature_contributions(user_dict, policy)

            results.append(
                ScoredPolicy(
                    policy=self._to_policy_summary(policy),
                    score=round(score, 4),
                    rank=rank,
                    reasons=reasons,
                    feature_contributions=contributions,
                    model_version=model_registry.model_version if not fallback else "rule-based-v1",
                )
            )

        elapsed_ms = (time.time() - t0) * 1000
        logger.debug(
            f"Scored {len(eligible)} policies for user {user_features.user_id} "
            f"in {elapsed_ms:.1f}ms (fallback={fallback})"
        )
        return results, fallback

    # ── Rule-based Scoring ────────────────────────────────────────────────

    def _rule_based_scores(
        self,
        user: Dict[str, Any],
        policies: List[Dict[str, Any]],
    ) -> np.ndarray:
        """
        Weighted heuristic scoring. Used when ML model is unavailable.
        Produces scores in [0, 1].
        """
        scores = []

        age = float(user.get("age", 30))
        monthly_budget = float(user.get("monthly_budget", 2000))
        monthly_income = INCOME_BRACKET_MAP.get(user.get("income_bracket", "6L_TO_10L"), 13333)
        purchased = user.get("purchased_categories", [])
        health_flags = sum([
            int(user.get("is_smoker", False)),
            int(user.get("has_diabetes", False)),
            int(user.get("has_hypertension", False)),
            int(user.get("has_heart_disease", False)),
        ])

        for policy in policies:
            score = 0.0
            base_premium = float(policy.get("base_premium", 0))
            category = policy.get("category", "HEALTH")
            min_age = int(policy.get("min_age", 0))
            max_age = int(policy.get("max_age", 99))

            if not (min_age <= age <= max_age):
                scores.append(0.0)
                continue

            # Budget fit (30%)
            monthly_premium = base_premium / 12
            budget_ratio = monthly_premium / max(monthly_budget, 1)
            if budget_ratio <= 0.15:
                score += settings.WEIGHT_BUDGET_FIT
            elif budget_ratio <= 0.25:
                score += settings.WEIGHT_BUDGET_FIT * 0.7
            elif budget_ratio <= 0.40:
                score += settings.WEIGHT_BUDGET_FIT * 0.35
            elif budget_ratio > 0.70:
                score -= settings.WEIGHT_BUDGET_FIT * 0.5

            # Age relevance (20%)
            age_center = (min_age + max_age) / 2
            age_range = max(max_age - min_age, 1)
            age_norm = max(0.0, 1.0 - abs(age - age_center) / (age_range / 2))
            score += settings.WEIGHT_AGE_RELEVANCE * age_norm

            # Health relevance (25%)
            if category == "HEALTH":
                score += settings.WEIGHT_HEALTH_RELEVANCE * min(1.0, 0.4 + health_flags * 0.15)
            elif category in ("LIFE", "TERM") and health_flags > 0:
                score += settings.WEIGHT_HEALTH_RELEVANCE * 0.6
            elif category == "MOTOR":
                score += settings.WEIGHT_HEALTH_RELEVANCE * 0.3

            # Popularity (15%)
            pop = float(policy.get("popularity_score", 5.0))
            rating = float(policy.get("avg_rating", 3.0))
            score += settings.WEIGHT_POPULARITY * ((pop / 10.0) * 0.6 + (rating / 5.0) * 0.4)

            # Coverage diversification (10%)
            if category not in purchased:
                score += settings.WEIGHT_DIVERSIFICATION
            else:
                score -= settings.WEIGHT_DIVERSIFICATION * 0.3

            # Family bonus
            if user.get("family_members", 1) > 1 and category == "HEALTH":
                score += 0.05

            scores.append(float(np.clip(score, 0, 1)))

        return np.array(scores, dtype=np.float32)

    # ── Reason Generation ─────────────────────────────────────────────────

    def _generate_reasons(
        self,
        user: Dict[str, Any],
        policy: Dict[str, Any],
        score: float,
    ) -> List[str]:
        """Human-readable reasons for recommendation."""
        reasons = []
        age = int(user.get("age", 30))
        monthly_budget = float(user.get("monthly_budget", 2000))
        category = policy.get("category", "HEALTH")
        base_premium = float(policy.get("base_premium", 0))
        purchased = user.get("purchased_categories", [])

        monthly_premium = base_premium / 12
        budget_ratio = monthly_premium / max(monthly_budget, 1)

        if budget_ratio <= 0.15:
            reasons.append("Fits comfortably within your monthly budget")
        elif budget_ratio <= 0.25:
            reasons.append("Reasonably priced for your income bracket")

        if category not in purchased:
            reasons.append(f"Fills a gap — you have no {category.lower()} coverage")

        health_flags = [
            user.get("is_smoker"), user.get("has_diabetes"),
            user.get("has_hypertension"), user.get("has_heart_disease"),
        ]
        if any(health_flags) and category == "HEALTH":
            reasons.append("Covers pre-existing conditions after waiting period")

        if user.get("family_members", 1) > 1 and category == "HEALTH":
            reasons.append(f"Suitable for family cover ({user['family_members']} members)")

        if policy.get("avg_rating", 0) >= 4.5:
            reasons.append(f"Highly rated by customers ({policy['avg_rating']:.1f}★)")

        claim_ratio = float(policy.get("claim_settlement_ratio") or 97)
        if claim_ratio >= 99:
            reasons.append(f"{claim_ratio:.2f}% claim settlement ratio")

        if policy.get("is_featured"):
            reasons.append("Featured plan — editor's pick")

        if age <= 30 and category in ("TERM", "LIFE"):
            reasons.append("Ideal age to lock in low premiums for life")

        return reasons[:4]  # Cap at 4 reasons

    # ── Feature Contributions ─────────────────────────────────────────────

    def _feature_contributions(
        self,
        user: Dict[str, Any],
        policy: Dict[str, Any],
    ) -> Dict[str, float]:
        """Lightweight contribution proxy (no SHAP; for display only)."""
        interaction = engineer_interaction_features(user, policy)
        return {
            "budget_fit":        round(interaction["budget_fit_score"], 3),
            "age_fit":           round(interaction["age_fit_score"], 3),
            "health_relevance":  round(interaction["health_relevance_score"], 3),
            "coverage_gap":      round(interaction["coverage_gap_score"], 3),
            "income_fit":        round(interaction["income_fit_score"], 3),
        }

    # ── Helpers ───────────────────────────────────────────────────────────

    def _features_to_dict(self, features: UserFeatures) -> Dict[str, Any]:
        return {
            "user_id": features.user_id,
            "age": features.age,
            "gender": features.gender.value if hasattr(features.gender, "value") else features.gender,
            "income_bracket": features.income_bracket.value if hasattr(features.income_bracket, "value") else features.income_bracket,
            "city_tier": features.city_tier.value if hasattr(features.city_tier, "value") else features.city_tier,
            "is_smoker": features.is_smoker,
            "has_diabetes": features.has_diabetes,
            "has_hypertension": features.has_hypertension,
            "has_heart_disease": features.has_heart_disease,
            "family_members": features.family_members,
            "monthly_budget": features.monthly_budget,
            "purchased_categories": features.purchased_categories,
        }

    def _to_policy_summary(self, policy: Dict[str, Any]) -> PolicySummary:
        return PolicySummary(
            id=policy.get("id", ""),
            name=policy.get("name", ""),
            category=policy.get("category", ""),
            insurer_name=policy.get("insurer", policy.get("insurer_name", "")),
            base_premium=float(policy.get("base_premium", 0)),
            sum_assured=policy.get("sum_assured"),
            avg_rating=float(policy.get("avg_rating", 0)),
            claim_settlement_ratio=policy.get("claim_settlement_ratio"),
            cashless_hospitals=policy.get("cashless_hospitals"),
            inclusions=policy.get("inclusions", []),
            is_featured=bool(policy.get("is_featured", False)),
        )


# ── Singleton ─────────────────────────────────────────────────────────────
recommendation_engine = RecommendationEngine()
