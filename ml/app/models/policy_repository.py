"""
Policy repository: fetches active policies from PostgreSQL (or cache).
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from loguru import logger

from ml.features.feature_store import feature_store
from ml.training.data_generator import POLICIES  # fallback seed data


class PolicyRepository:
    """Fetches policy data from DB with Redis caching."""

    async def get_active_policies(
        self,
        db: AsyncSession,
        category: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Returns active policies. Checks Redis first, then DB, then seed fallback.
        """
        # 1. Cache check
        if category:
            cached = await feature_store.get_policies_by_category(category)
        else:
            cached = await feature_store.get_all_policies()

        if cached:
            logger.debug(f"Policy cache hit (category={category})")
            return cached

        # 2. Database query
        try:
            policies = await self._query_policies(db, category)
            if policies:
                # Write to cache
                if category:
                    await feature_store.set_policies_by_category(category, policies)
                else:
                    await feature_store.set_all_policies(policies)
                return policies
        except Exception as e:
            logger.warning(f"DB policy query failed: {e}. Using seed data.")

        # 3. Seed fallback (for development / first boot)
        seed = POLICIES if not category else [p for p in POLICIES if p["category"] == category]
        logger.debug(f"Using {len(seed)} seed policies (fallback)")
        return seed

    async def _query_policies(
        self,
        db: AsyncSession,
        category: Optional[str],
    ) -> List[Dict[str, Any]]:
        sql = text("""
            SELECT
                p.id,
                p.name,
                p.description,
                p.category,
                p.base_premium::float,
                p.sum_assured::float,
                p.min_age,
                p.max_age,
                p.policy_term_years,
                p.waiting_period_days,
                p.cashless_hospitals,
                p.co_payment_percent::float,
                p.avg_rating::float,
                p.total_reviews,
                p.is_featured,
                p.popularity_score::float,
                p.external_id,
                p.inclusions,
                p.exclusions,
                p.coverage_details,
                i.name  AS insurer_name,
                i.claim_settlement_ratio::float AS claim_settlement_ratio
            FROM policies p
            JOIN insurers i ON i.id = p.insurer_id
            WHERE p.status = 'ACTIVE'
              AND i.is_active = true
            """ + ("AND p.category = :category" if category else "") + """
            ORDER BY p.popularity_score DESC
            LIMIT 200
        """)

        params = {"category": category} if category else {}
        result = await db.execute(sql, params)
        rows = result.mappings().all()

        policies = []
        for row in rows:
            policy = dict(row)
            # Ensure Python types for numpy compatibility
            for float_field in ["base_premium", "sum_assured", "co_payment_percent",
                                 "avg_rating", "popularity_score", "claim_settlement_ratio"]:
                if policy.get(float_field) is not None:
                    policy[float_field] = float(policy[float_field])
            for int_field in ["min_age", "max_age", "waiting_period_days",
                               "cashless_hospitals", "total_reviews"]:
                if policy.get(int_field) is not None:
                    policy[int_field] = int(policy[int_field])
            policies.append(policy)

        return policies

    async def get_policy_by_id(
        self,
        db: AsyncSession,
        policy_id: str,
    ) -> Optional[Dict[str, Any]]:
        try:
            sql = text("""
                SELECT p.*, i.name AS insurer_name, i.claim_settlement_ratio::float
                FROM policies p
                JOIN insurers i ON i.id = p.insurer_id
                WHERE p.id = :id AND p.status = 'ACTIVE'
            """)
            result = await db.execute(sql, {"id": policy_id})
            row = result.mappings().first()
            return dict(row) if row else None
        except Exception as e:
            logger.warning(f"Policy by ID query failed: {e}")
            return None


policy_repository = PolicyRepository()
