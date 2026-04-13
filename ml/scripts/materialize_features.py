#!/usr/bin/env python
"""
Feature materialization script.
Reads all active policies from PostgreSQL and writes them to Redis
so the online inference path never has to hit the DB for policy features.

Run this:
  - after training a new model
  - when policies are updated in bulk
  - as part of CI/CD deployment

Usage:
    python scripts/materialize_features.py
    python scripts/materialize_features.py --dry-run
"""

import sys
import asyncio
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from loguru import logger
from config.settings import get_settings

settings = get_settings()


async def materialize(dry_run: bool = False):
    from ml.features.feature_store import feature_store
    from app.models.database import AsyncSessionLocal
    from app.models.policy_repository import PolicyRepository

    logger.info("Connecting to feature store…")
    await feature_store.connect()

    if not await feature_store.is_connected():
        logger.error("Redis unavailable — cannot materialize features")
        return

    logger.info("Fetching active policies from database…")
    repo = PolicyRepository()

    async with AsyncSessionLocal() as db:
        try:
            policies = await repo._query_policies(db, category=None)
        except Exception as e:
            logger.error(f"DB query failed: {e}")
            return

    if not policies:
        logger.warning("No active policies found in database")
        return

    logger.info(f"Found {len(policies)} active policies")

    if dry_run:
        logger.info("[DRY RUN] Would materialize:")
        for p in policies[:5]:
            logger.info(f"  → {p['id']}: {p['name']}")
        if len(policies) > 5:
            logger.info(f"  … and {len(policies)-5} more")
        return

    # Write all policies to Redis
    count = await feature_store.bulk_set_policy_features(policies, ttl=3600)
    logger.info(f"Materialized {count} policy feature records")

    # Write the full catalog list
    await feature_store.set_all_policies(policies)
    logger.info("Full policy catalog written to Redis")

    # Write per-category lists
    categories = set(p.get("category") for p in policies)
    for cat in categories:
        cat_policies = [p for p in policies if p.get("category") == cat]
        await feature_store.set_policies_by_category(cat, cat_policies)
        logger.info(f"  Category {cat}: {len(cat_policies)} policies")

    await feature_store.disconnect()
    logger.info("Feature materialization complete ✅")


def main():
    parser = argparse.ArgumentParser(description="Materialize policy features into Redis")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    args = parser.parse_args()

    asyncio.run(materialize(dry_run=args.dry_run))


if __name__ == "__main__":
    main()
