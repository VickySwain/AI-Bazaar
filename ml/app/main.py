"""
CoverAI ML Service — FastAPI application entry point.

Lifespan:
  startup  → connect DB / Redis, load model, warm feature store, start scheduler
  shutdown → flush connections, stop scheduler gracefully
"""

import asyncio
import sys
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.middleware import (
    RequestLoggingMiddleware,
    validation_exception_handler,
    generic_exception_handler,
)
from app.routers import recommend, training, health, interactions
from app.models.database import engine
from ml.features.feature_store import feature_store
from ml.models.model_registry import model_registry
from config.settings import get_settings

settings = get_settings()

# ── Logging ────────────────────────────────────────────────────────────────
logger.remove()
logger.add(
    sys.stdout,
    format=(
        "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
        "<level>{level:<8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
        "{message}"
    ),
    level=settings.LOG_LEVEL,
    colorize=True,
    enqueue=True,
    backtrace=True,
    diagnose=settings.DEBUG,
)
logger.add(
    "logs/ml_service.log",
    rotation="100 MB",
    retention="14 days",
    compression="gz",
    level="INFO",
    enqueue=True,
)


# ── Lifespan ───────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    # ── STARTUP ─────────────────────────────────────────────────────────
    logger.info("=" * 60)
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info("=" * 60)

    # 1. Connect feature store (Redis)
    logger.info("Connecting feature store...")
    await feature_store.connect()

    # 2. Load ML model from disk
    logger.info("Loading recommendation model...")
    loaded = model_registry.load()
    if not loaded:
        logger.warning(
            "Model not found on disk. Falling back to rule-based scoring.\n"
            "  -> Run `python scripts/train.py` to train and save the model."
        )
    else:
        logger.info(
            f"Model loaded: {model_registry.model_version} "
            f"({model_registry.feature_count} features)"
        )

    # 3. Start background scheduler
    try:
        from ml.training.scheduler import start_scheduler
        scheduler = start_scheduler()
        app.state.scheduler = scheduler
        logger.info("Background scheduler started")
    except Exception as e:
        logger.warning(f"Scheduler start failed (non-fatal): {e}")
        app.state.scheduler = None

    # 4. Optionally warm policy cache from DB
    try:
        await _warm_policy_cache()
    except Exception as e:
        logger.warning(f"Policy cache warm failed (non-fatal): {e}")

    logger.info(f"{settings.APP_NAME} ready -> http://0.0.0.0:{settings.PORT}")
    logger.info(f"API docs -> http://0.0.0.0:{settings.PORT}/docs")

    yield  # ─── App runs here ─────────────────────────────────────────

    # ── SHUTDOWN ─────────────────────────────────────────────────────────
    logger.info("Shutting down...")

    if hasattr(app.state, "scheduler") and app.state.scheduler:
        app.state.scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")

    await feature_store.disconnect()
    await engine.dispose()
    logger.info("Shutdown complete.")


async def _warm_policy_cache():
    """Pre-load policy catalog into Redis on startup."""
    from app.models.database import AsyncSessionLocal
    from app.models.policy_repository import policy_repository

    cached = await feature_store.get_all_policies()
    if cached:
        logger.debug(f"Policy cache already warm ({len(cached)} policies)")
        return

    async with AsyncSessionLocal() as db:
        policies = await policy_repository.get_active_policies(db)
        if policies:
            await feature_store.set_all_policies(policies)
            logger.info(f"Policy cache warmed with {len(policies)} policies")


# ── App Factory ────────────────────────────────────────────────────────────
def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "CoverAI ML Recommendation Service — "
            "XGBoost-powered policy scoring with rule-based fallback, "
            "Redis feature store, and MLflow experiment tracking."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # ── CORS ────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Custom Middleware ────────────────────────────────────────────────
    app.add_middleware(RequestLoggingMiddleware)

    # ── Exception Handlers ───────────────────────────────────────────────
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)

    # ── Routers ──────────────────────────────────────────────────────────
    app.include_router(health.router)
    app.include_router(recommend.router)
    app.include_router(training.router)
    app.include_router(interactions.router)

    @app.get("/", tags=["Root"])
    async def root():
        return {
            "service": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "docs": "/docs",
            "health": "/health",
            "model": {
                "loaded": model_registry.is_loaded,
                "version": model_registry.model_version,
                "fallback": not model_registry.is_loaded,
            },
        }

    return app


app = create_app()


# ── Dev server entrypoint ──────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG,
        workers=1 if settings.DEBUG else settings.WORKERS,
        log_level=settings.LOG_LEVEL.lower(),
        access_log=False,
    )