"""
Feature definitions for the CoverAI recommendation model.
All features are defined here as the single source of truth used by
both the offline training pipeline and the online inference path.
This prevents training-serving skew.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Tuple
import numpy as np
import pandas as pd
from loguru import logger


# ── Feature Registry ───────────────────────────────────────────────────────
USER_FEATURES = [
    "age",
    "age_squared",            # non-linear age effect
    "age_bucket",             # 18-25, 26-35, 36-45, 46-55, 55+
    "gender_male",
    "gender_female",
    "income_rank",            # ordinal 1-5 from income bracket
    "city_tier_rank",         # 1-3
    "is_smoker",
    "has_diabetes",
    "has_hypertension",
    "has_heart_disease",
    "health_risk_score",      # composite: sum of health flags
    "family_size",
    "is_family",              # family_members > 1
    "monthly_budget_log",     # log(budget + 1)
    "budget_to_income_ratio", # budget / estimated monthly income
    "num_existing_policies",  # policies already held
    "has_health_coverage",
    "has_life_coverage",
    "has_term_coverage",
    "has_motor_coverage",
]

POLICY_FEATURES = [
    "premium_log",            # log(base_premium + 1)
    "sum_assured_log",        # log(sum_assured + 1) or 0
    "premium_to_assured_ratio",
    "waiting_period_norm",    # waiting_period / 365
    "cashless_hospitals_log",
    "co_payment_pct",
    "avg_rating",
    "total_reviews_log",
    "claim_ratio",
    "is_featured",
    "category_health",
    "category_life",
    "category_term",
    "category_motor",
    "category_travel",
    "category_home",
    "policy_term_norm",       # policy_term / 40
    "age_eligibility",        # 1 if user age in [min_age, max_age]
    "popularity_score",
]

INTERACTION_FEATURES = [
    "budget_fit_score",        # how well premium fits budget
    "age_fit_score",           # age eligibility with margin
    "health_relevance_score",  # health flags × policy category
    "coverage_gap_score",      # does policy fill an uncovered category
    "income_fit_score",        # income bracket vs premium tier
]

ALL_FEATURES = USER_FEATURES + POLICY_FEATURES + INTERACTION_FEATURES

# Map income bracket to approximate monthly income midpoint (INR)
INCOME_BRACKET_MAP: Dict[str, float] = {
    "BELOW_3L":   2000.0,
    "3L_TO_6L":   7500.0,
    "6L_TO_10L":  13333.0,
    "10L_TO_20L": 25000.0,
    "ABOVE_20L":  50000.0,
}

INCOME_RANK_MAP: Dict[str, int] = {
    "BELOW_3L":   1,
    "3L_TO_6L":   2,
    "6L_TO_10L":  3,
    "10L_TO_20L": 4,
    "ABOVE_20L":  5,
}

CITY_TIER_RANK_MAP: Dict[str, int] = {
    "TIER_1": 3,
    "TIER_2": 2,
    "TIER_3": 1,
}

CATEGORY_LIST = ["HEALTH", "LIFE", "TERM", "MOTOR", "TRAVEL", "HOME"]


def engineer_user_features(user: Dict[str, Any]) -> Dict[str, float]:
    """
    Build user-side features from a user profile dict.
    Used identically in training and inference.
    """
    age = float(user.get("age", 30))
    income_bracket = user.get("income_bracket", "6L_TO_10L")
    city_tier = user.get("city_tier", "TIER_2")
    monthly_budget = float(user.get("monthly_budget", 2000))
    family_members = int(user.get("family_members", 1))
    purchased = user.get("purchased_categories", [])

    monthly_income = INCOME_BRACKET_MAP.get(income_bracket, 13333.0)
    income_rank = INCOME_RANK_MAP.get(income_bracket, 3)
    city_rank = CITY_TIER_RANK_MAP.get(city_tier, 2)

    health_flags = [
        int(user.get("is_smoker", False)),
        int(user.get("has_diabetes", False)),
        int(user.get("has_hypertension", False)),
        int(user.get("has_heart_disease", False)),
    ]

    age_bucket = (
        0 if age < 26
        else 1 if age < 36
        else 2 if age < 46
        else 3 if age < 56
        else 4
    )

    return {
        "age": age,
        "age_squared": age ** 2,
        "age_bucket": float(age_bucket),
        "gender_male": float(user.get("gender", "OTHER") == "MALE"),
        "gender_female": float(user.get("gender", "OTHER") == "FEMALE"),
        "income_rank": float(income_rank),
        "city_tier_rank": float(city_rank),
        "is_smoker": float(health_flags[0]),
        "has_diabetes": float(health_flags[1]),
        "has_hypertension": float(health_flags[2]),
        "has_heart_disease": float(health_flags[3]),
        "health_risk_score": float(sum(health_flags)),
        "family_size": float(family_members),
        "is_family": float(family_members > 1),
        "monthly_budget_log": float(np.log1p(monthly_budget)),
        "budget_to_income_ratio": float(monthly_budget / max(monthly_income, 1)),
        "num_existing_policies": float(len(purchased)),
        "has_health_coverage": float("HEALTH" in purchased),
        "has_life_coverage": float("LIFE" in purchased),
        "has_term_coverage": float("TERM" in purchased),
        "has_motor_coverage": float("MOTOR" in purchased),
    }


def engineer_policy_features(
    policy: Dict[str, Any],
    user_age: int,
) -> Dict[str, float]:
    """
    Build policy-side features from a policy dict.
    """
    base_premium = float(policy.get("base_premium", 0))
    sum_assured = float(policy.get("sum_assured") or 0)
    category = policy.get("category", "HEALTH")
    min_age = int(policy.get("min_age", 0))
    max_age = int(policy.get("max_age", 99))

    premium_to_assured = (base_premium / max(sum_assured, 1)) * 100 if sum_assured > 0 else 0
    age_eligible = float(min_age <= user_age <= max_age)

    feat = {
        "premium_log": float(np.log1p(base_premium)),
        "sum_assured_log": float(np.log1p(sum_assured)),
        "premium_to_assured_ratio": float(min(premium_to_assured, 100)),
        "waiting_period_norm": float(policy.get("waiting_period_days", 30)) / 365.0,
        "cashless_hospitals_log": float(np.log1p(policy.get("cashless_hospitals") or 0)),
        "co_payment_pct": float(policy.get("co_payment_percent", 0)),
        "avg_rating": float(policy.get("avg_rating", 3.0)),
        "total_reviews_log": float(np.log1p(policy.get("total_reviews", 0))),
        "claim_ratio": float(policy.get("claim_settlement_ratio") or 97.0) / 100.0,
        "is_featured": float(policy.get("is_featured", False)),
        "policy_term_norm": float(policy.get("policy_term_years") or 10) / 40.0,
        "age_eligibility": age_eligible,
        "popularity_score": float(policy.get("popularity_score", 5.0)) / 10.0,
    }

    # One-hot category
    for cat in CATEGORY_LIST:
        feat[f"category_{cat.lower()}"] = float(category == cat)

    return feat


def engineer_interaction_features(
    user: Dict[str, Any],
    policy: Dict[str, Any],
) -> Dict[str, float]:
    """
    Build cross-features that capture user ↔ policy interaction.
    These are the most important features for ranking.
    """
    age = float(user.get("age", 30))
    monthly_budget = float(user.get("monthly_budget", 2000))
    income_bracket = user.get("income_bracket", "6L_TO_10L")
    monthly_income = INCOME_BRACKET_MAP.get(income_bracket, 13333.0)
    purchased = user.get("purchased_categories", [])
    category = policy.get("category", "HEALTH")
    base_premium = float(policy.get("base_premium", 0))
    min_age = int(policy.get("min_age", 0))
    max_age = int(policy.get("max_age", 99))

    # Budget fit: 1.0 = premium perfectly at 15% of monthly income
    monthly_premium = base_premium / 12
    budget_ratio = monthly_premium / max(monthly_budget, 1)
    budget_fit = max(0.0, 1.0 - abs(budget_ratio - 0.15) * 4)

    # Age fit: penalise if near eligibility boundary
    age_center = (min_age + max_age) / 2
    age_range = max(max_age - min_age, 1)
    age_fit = max(0.0, 1.0 - abs(age - age_center) / (age_range / 2))
    if not (min_age <= age <= max_age):
        age_fit = 0.0

    # Health relevance: health plans matter more when user has conditions
    health_flags = sum([
        int(user.get("is_smoker", False)),
        int(user.get("has_diabetes", False)),
        int(user.get("has_hypertension", False)),
        int(user.get("has_heart_disease", False)),
    ])
    health_relevance = 0.0
    if category == "HEALTH":
        health_relevance = min(1.0, 0.3 + health_flags * 0.2)
    elif category in ("LIFE", "TERM"):
        health_relevance = min(1.0, 0.2 + health_flags * 0.15)

    # Coverage gap: higher score if this category is NOT already covered
    coverage_gap = float(category not in purchased)

    # Income fit: can the user comfortably afford this?
    annual_premium = base_premium
    income_fit = max(0.0, 1.0 - (annual_premium / max(monthly_income * 12, 1)) * 3)

    return {
        "budget_fit_score": float(budget_fit),
        "age_fit_score": float(age_fit),
        "health_relevance_score": float(health_relevance),
        "coverage_gap_score": float(coverage_gap),
        "income_fit_score": float(max(0.0, income_fit)),
    }


def build_feature_vector(
    user: Dict[str, Any],
    policy: Dict[str, Any],
) -> np.ndarray:
    """
    Assemble the full feature vector for one (user, policy) pair.
    Returns a 1-D numpy array aligned to ALL_FEATURES.
    """
    user_feats = engineer_user_features(user)
    policy_feats = engineer_policy_features(policy, user_age=int(user.get("age", 30)))
    interaction_feats = engineer_interaction_features(user, policy)

    combined = {**user_feats, **policy_feats, **interaction_feats}

    vec = np.array([combined.get(f, 0.0) for f in ALL_FEATURES], dtype=np.float32)
    return vec


def build_feature_matrix(
    user: Dict[str, Any],
    policies: List[Dict[str, Any]],
) -> np.ndarray:
    """
    Build feature matrix for one user against N policies.
    Returns shape (N, len(ALL_FEATURES)).
    """
    rows = [build_feature_vector(user, policy) for policy in policies]
    return np.stack(rows, axis=0)


def get_feature_names() -> List[str]:
    return ALL_FEATURES
