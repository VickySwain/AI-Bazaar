"""
Background scheduler for automated model retraining and feature store refresh.

Jobs:
  - nightly_retrain     : retrain model at 2 AM daily if enough new interactions
  - refresh_policy_cache: refresh Redis policy cache every 10 minutes
  - model_health_check  : log model performance metrics every hour
"""

import asyncio
from datetime import datetime
from typing import Optional
from loguru import logger

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from config.settings import get_settings

settings = get_settings()


async def job_nightly_retrain():
    """
    Nightly retraining job. Checks if enough new interactions have accumulated
    before triggering a full training run.
    """
    logger.info("[Scheduler] Nightly retraining job triggered")

    # Check interaction count (skip if not enough new data)
    try:
        from app.models.database import AsyncSessionLocal
        from sqlalchemy import text

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                text("""
                    SELECT COUNT(*) FROM recommendation_interactions
                    WHERE created_at >= NOW() - INTERVAL '24 hours'
                """)
            )
            count = result.scalar() or 0

        if count < settings.MIN_INTERACTIONS_FOR_RETRAIN:
            logger.info(
                f"[Scheduler] Only {count} new interactions (min {settings.MIN_INTERACTIONS_FOR_RETRAIN}) "
                "— skipping retraining"
            )
            return
    except Exception as e:
        logger.warning(f"[Scheduler] Interaction count check failed: {e}. Proceeding anyway.")

    # Run training in thread executor (CPU-bound, non-blocking)
    try:
        loop = asyncio.get_event_loop()
        from ml.training.trainer import run_training, TrainingConfig

        config = TrainingConfig(
            use_cached_data=False,  # Force fresh data from DB
            log_to_mlflow=True,
        )
        result = await loop.run_in_executor(None, run_training, config)

        # Reload model into registry
        from ml.models.model_registry import model_registry
        model_registry.reload()

        logger.info(
            f"[Scheduler] Retraining complete. "
            f"AUC-ROC: {result.metrics.get('auc_roc', 0):.4f} | "
            f"Samples: {result.training_samples}"
        )

    except Exception as e:
        logger.error(f"[Scheduler] Retraining failed: {e}")


async def job_refresh_policy_cache():
    """Refresh the Redis policy catalog cache from the database."""
    try:
        from app.models.database import AsyncSessionLocal
        from app.models.policy_repository import policy_repository
        from ml.features.feature_store import feature_store

        async with AsyncSessionLocal() as db:
            policies = await policy_repository._query_policies(db, category=None)

        if policies:
            await feature_store.set_all_policies(policies)
            logger.debug(f"[Scheduler] Policy cache refreshed ({len(policies)} policies)")
    except Exception as e:
        logger.warning(f"[Scheduler] Policy cache refresh failed: {e}")


async def job_model_health_check():
    """Log model health metrics hourly for monitoring."""
    from ml.models.model_registry import model_registry

    info = model_registry.get_info()
    logger.info(
        f"[Scheduler] Model health — loaded={info['is_loaded']} | "
        f"version={info['version']} | "
        f"features={info['feature_count']}"
    )


def start_scheduler() -> AsyncIOScheduler:
    """Create and start the APScheduler instance. Returns the running scheduler."""
    scheduler = AsyncIOScheduler(timezone="Asia/Kolkata")

    # Nightly retraining at 2 AM IST
    scheduler.add_job(
        job_nightly_retrain,
        CronTrigger(hour=2, minute=0),
        id="nightly_retrain",
        name="Nightly Model Retraining",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    # Policy cache refresh every 10 minutes
    scheduler.add_job(
        job_refresh_policy_cache,
        IntervalTrigger(minutes=10),
        id="refresh_policy_cache",
        name="Policy Cache Refresh",
        replace_existing=True,
    )

    # Model health check every hour
    scheduler.add_job(
        job_model_health_check,
        IntervalTrigger(hours=1),
        id="model_health_check",
        name="Model Health Check",
        replace_existing=True,
    )

    scheduler.start()
    logger.info(
        f"Scheduler started with {len(scheduler.get_jobs())} jobs: "
        + ", ".join(j.name for j in scheduler.get_jobs())
    )
    return scheduler
