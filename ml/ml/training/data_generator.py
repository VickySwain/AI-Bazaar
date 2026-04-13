"""
Synthetic training data generator for CoverAI recommendation model.
Generates realistic user profiles + policy data + interaction labels.
"""

import random
import numpy as np
import pandas as pd
from faker import Faker
from pathlib import Path
from loguru import logger
from typing import Dict, List, Tuple, Optional
import json

fake = Faker("en_IN")
random.seed(42)
np.random.seed(42)

# ── Policy catalogue (mirrors DB seed) ────────────────────────────────────
POLICIES = [
    {
        "id": "pol-001", "name": "HDFC Life Click 2 Protect Super",
        "category": "TERM", "insurer": "HDFC Life", "base_premium": 7200,
        "sum_assured": 10000000, "min_age": 18, "max_age": 65,
        "waiting_period_days": 0, "cashless_hospitals": 0,
        "co_payment_percent": 0, "avg_rating": 4.7, "total_reviews": 2841,
        "claim_settlement_ratio": 99.39, "is_featured": True, "popularity_score": 9.2,
        "policy_term_years": 30,
    },
    {
        "id": "pol-002", "name": "LIC New Jeevan Amar",
        "category": "TERM", "insurer": "LIC", "base_premium": 8400,
        "sum_assured": 5000000, "min_age": 18, "max_age": 65,
        "waiting_period_days": 0, "cashless_hospitals": 0,
        "co_payment_percent": 0, "avg_rating": 4.6, "total_reviews": 5120,
        "claim_settlement_ratio": 98.62, "is_featured": True, "popularity_score": 9.5,
        "policy_term_years": 35,
    },
    {
        "id": "pol-003", "name": "ICICI Pru iProtect Smart",
        "category": "TERM", "insurer": "ICICI Prudential", "base_premium": 6800,
        "sum_assured": 10000000, "min_age": 18, "max_age": 60,
        "waiting_period_days": 0, "cashless_hospitals": 0,
        "co_payment_percent": 0, "avg_rating": 4.5, "total_reviews": 1920,
        "claim_settlement_ratio": 97.82, "is_featured": False, "popularity_score": 8.8,
        "policy_term_years": 40,
    },
    {
        "id": "pol-004", "name": "HDFC ERGO Optima Restore",
        "category": "HEALTH", "insurer": "HDFC ERGO", "base_premium": 9800,
        "sum_assured": 500000, "min_age": 18, "max_age": 65,
        "waiting_period_days": 30, "cashless_hospitals": 13000,
        "co_payment_percent": 0, "avg_rating": 4.8, "total_reviews": 3640,
        "claim_settlement_ratio": 99.39, "is_featured": True, "popularity_score": 9.1,
        "policy_term_years": 1,
    },
    {
        "id": "pol-005", "name": "Star Comprehensive Insurance",
        "category": "HEALTH", "insurer": "Star Health", "base_premium": 11200,
        "sum_assured": 1000000, "min_age": 18, "max_age": 65,
        "waiting_period_days": 30, "cashless_hospitals": 14000,
        "co_payment_percent": 0, "avg_rating": 4.6, "total_reviews": 2280,
        "claim_settlement_ratio": 99.06, "is_featured": True, "popularity_score": 8.9,
        "policy_term_years": 1,
    },
    {
        "id": "pol-006", "name": "LIC Jeevan Anand",
        "category": "LIFE", "insurer": "LIC", "base_premium": 12500,
        "sum_assured": 1000000, "min_age": 18, "max_age": 50,
        "waiting_period_days": 0, "cashless_hospitals": 0,
        "co_payment_percent": 0, "avg_rating": 4.4, "total_reviews": 6810,
        "claim_settlement_ratio": 98.62, "is_featured": False, "popularity_score": 8.4,
        "policy_term_years": 35,
    },
    {
        "id": "pol-007", "name": "HDFC Life Sanchay Plus",
        "category": "LIFE", "insurer": "HDFC Life", "base_premium": 25000,
        "sum_assured": 3000000, "min_age": 30, "max_age": 65,
        "waiting_period_days": 0, "cashless_hospitals": 0,
        "co_payment_percent": 0, "avg_rating": 4.3, "total_reviews": 1540,
        "claim_settlement_ratio": 99.39, "is_featured": False, "popularity_score": 8.0,
        "policy_term_years": 20,
    },
    {
        "id": "pol-008", "name": "HDFC ERGO Comprehensive Car Insurance",
        "category": "MOTOR", "insurer": "HDFC ERGO", "base_premium": 4500,
        "sum_assured": 500000, "min_age": 18, "max_age": 70,
        "waiting_period_days": 0, "cashless_hospitals": 0,
        "co_payment_percent": 0, "avg_rating": 4.2, "total_reviews": 1120,
        "claim_settlement_ratio": 99.39, "is_featured": False, "popularity_score": 7.8,
        "policy_term_years": 1,
    },
    {
        "id": "pol-009", "name": "HDFC ERGO Travel Insurance",
        "category": "TRAVEL", "insurer": "HDFC ERGO", "base_premium": 899,
        "sum_assured": 2500000, "min_age": 0, "max_age": 75,
        "waiting_period_days": 0, "cashless_hospitals": 0,
        "co_payment_percent": 0, "avg_rating": 4.4, "total_reviews": 890,
        "claim_settlement_ratio": 99.39, "is_featured": False, "popularity_score": 7.5,
        "policy_term_years": 0,
    },
]

INCOME_BRACKETS = ["BELOW_3L", "3L_TO_6L", "6L_TO_10L", "10L_TO_20L", "ABOVE_20L"]
CITY_TIERS = ["TIER_1", "TIER_2", "TIER_3"]
GENDERS = ["MALE", "FEMALE", "OTHER"]
CATEGORIES = ["HEALTH", "LIFE", "TERM", "MOTOR", "TRAVEL", "HOME"]

INCOME_MONTHLY_MAP = {
    "BELOW_3L": 2000, "3L_TO_6L": 7500, "6L_TO_10L": 13333,
    "10L_TO_20L": 25000, "ABOVE_20L": 50000,
}


def generate_user_profile() -> Dict:
    age = max(18, min(70, int(np.random.normal(35, 12))))
    income = random.choices(INCOME_BRACKETS, weights=[0.15, 0.25, 0.30, 0.20, 0.10])[0]
    monthly_income = INCOME_MONTHLY_MAP[income]
    monthly_budget = random.uniform(0.05, 0.25) * monthly_income

    health_risk = random.random()
    return {
        "user_id": fake.uuid4(),
        "age": age,
        "gender": random.choices(GENDERS, weights=[0.5, 0.45, 0.05])[0],
        "income_bracket": income,
        "city_tier": random.choices(CITY_TIERS, weights=[0.30, 0.45, 0.25])[0],
        "is_smoker": random.random() < 0.15,
        "has_diabetes": random.random() < (0.05 if age < 40 else 0.15),
        "has_hypertension": random.random() < (0.03 if age < 40 else 0.20),
        "has_heart_disease": random.random() < (0.01 if age < 40 else 0.08),
        "family_members": random.choices([1, 2, 3, 4, 5], weights=[0.20, 0.30, 0.30, 0.15, 0.05])[0],
        "monthly_budget": round(monthly_budget, 2),
        "purchased_categories": random.sample(CATEGORIES, k=random.randint(0, 3)),
    }


def compute_purchase_probability(user: Dict, policy: Dict) -> float:
    """
    Ground-truth purchase probability used to generate labels.
    Based on domain knowledge — this is what the model learns to replicate.
    """
    score = 0.0
    age = user["age"]
    monthly_budget = user["monthly_budget"]
    income = user["income_bracket"]
    monthly_income = INCOME_MONTHLY_MAP[income]
    purchased = user["purchased_categories"]
    category = policy["category"]
    base_premium = policy["base_premium"]
    min_age = policy["min_age"]
    max_age = policy["max_age"]

    # Age eligibility is hard gate
    if not (min_age <= age <= max_age):
        return 0.0

    # Budget fit (30%)
    monthly_premium = base_premium / 12
    budget_ratio = monthly_premium / max(monthly_budget, 1)
    if budget_ratio <= 0.15:
        score += 0.30
    elif budget_ratio <= 0.25:
        score += 0.20
    elif budget_ratio <= 0.40:
        score += 0.10
    elif budget_ratio > 0.60:
        score -= 0.20

    # Income fit (10%)
    annual_budget_pct = base_premium / max(monthly_income * 12, 1)
    if annual_budget_pct < 0.05:
        score += 0.10
    elif annual_budget_pct < 0.10:
        score += 0.07
    elif annual_budget_pct > 0.20:
        score -= 0.10

    # Health relevance (25%)
    health_flags = sum([
        user["is_smoker"], user["has_diabetes"],
        user["has_hypertension"], user["has_heart_disease"]
    ])
    if category == "HEALTH":
        score += 0.15 + health_flags * 0.025
    elif category in ("LIFE", "TERM") and health_flags > 0:
        score += 0.10 + health_flags * 0.02
    elif category == "MOTOR" and user["age"] >= 21:
        score += 0.08

    # Coverage gap (15%)
    if category not in purchased:
        score += 0.15
    else:
        score -= 0.05  # Slight penalty — already covered

    # Family relevance (10%)
    if user["family_members"] > 1 and category == "HEALTH":
        score += 0.10
    elif user["family_members"] > 2 and category in ("LIFE", "TERM"):
        score += 0.05

    # Policy quality (10%)
    score += min(0.10, (policy["avg_rating"] - 3.5) * 0.05)
    score += min(0.05, (policy["claim_settlement_ratio"] - 95) * 0.01)
    if policy["is_featured"]:
        score += 0.03

    # Sigmoid → probability
    prob = 1 / (1 + np.exp(-score * 3))
    return float(np.clip(prob, 0.01, 0.99))


def generate_interaction_dataset(n_users: int = 5000) -> pd.DataFrame:
    """
    Generate n_users × n_policies interaction records with purchase labels.
    """
    logger.info(f"Generating synthetic dataset with {n_users} users…")
    records = []

    for i in range(n_users):
        user = generate_user_profile()

        # Each user sees a random subset of policies (simulating impressions)
        n_policies_seen = random.randint(3, len(POLICIES))
        seen_policies = random.sample(POLICIES, n_policies_seen)

        for policy in seen_policies:
            prob = compute_purchase_probability(user, policy)

            # Simulate label: purchase or not
            label = int(random.random() < prob)

            # Implicit feedback label (softer): clicked / quoted
            interaction_score = prob + random.gauss(0, 0.05)

            records.append({
                # Identifiers
                "user_id": user["user_id"],
                "policy_id": policy["id"],
                # Target
                "label": label,
                "interaction_score": float(np.clip(interaction_score, 0, 1)),
                # User features
                "age": user["age"],
                "gender": user["gender"],
                "income_bracket": user["income_bracket"],
                "city_tier": user["city_tier"],
                "is_smoker": int(user["is_smoker"]),
                "has_diabetes": int(user["has_diabetes"]),
                "has_hypertension": int(user["has_hypertension"]),
                "has_heart_disease": int(user["has_heart_disease"]),
                "family_members": user["family_members"],
                "monthly_budget": user["monthly_budget"],
                "purchased_count": len(user["purchased_categories"]),
                "has_health_coverage": int("HEALTH" in user["purchased_categories"]),
                "has_life_coverage": int("LIFE" in user["purchased_categories"]),
                "has_term_coverage": int("TERM" in user["purchased_categories"]),
                "has_motor_coverage": int("MOTOR" in user["purchased_categories"]),
                # Policy features
                "policy_category": policy["category"],
                "base_premium": policy["base_premium"],
                "sum_assured": policy.get("sum_assured", 0),
                "min_age": policy["min_age"],
                "max_age": policy["max_age"],
                "waiting_period_days": policy.get("waiting_period_days", 30),
                "cashless_hospitals": policy.get("cashless_hospitals", 0),
                "co_payment_percent": policy.get("co_payment_percent", 0),
                "avg_rating": policy["avg_rating"],
                "total_reviews": policy["total_reviews"],
                "claim_settlement_ratio": policy["claim_settlement_ratio"],
                "is_featured": int(policy["is_featured"]),
                "popularity_score": policy["popularity_score"],
                "policy_term_years": policy.get("policy_term_years", 1),
            })

        if (i + 1) % 1000 == 0:
            logger.info(f"  Generated {i + 1}/{n_users} users…")

    df = pd.DataFrame(records)
    logger.info(
        f"Dataset generated: {len(df)} rows, "
        f"{df['label'].sum()} purchases "
        f"({df['label'].mean():.1%} conversion)"
    )
    return df


def save_dataset(df: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(path, index=False)
    logger.info(f"Dataset saved to {path} ({path.stat().st_size / 1024:.1f} KB)")


def load_dataset(path: Path) -> pd.DataFrame:
    return pd.read_parquet(path)


def get_policies() -> List[Dict]:
    return POLICIES


if __name__ == "__main__":
    from pathlib import Path
    out = Path("data/raw/interactions.parquet")
    df = generate_interaction_dataset(n_users=8000)
    save_dataset(df, out)
    print(df.info())
    print(df.head())
