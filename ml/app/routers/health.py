"""Health check and monitoring endpoints."""

import time
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.database import get_db, check_db_connection
from app.schemas.response_schemas import HealthResponse
from ml.models.model_registry import model_registry
from ml.features.feature_store import feature_store
from config.settings import get_settings

settings = get_settings()
router = APIRouter(tags=["Health"])

_start_time = time.time()


@router.get("/health", response_model=HealthResponse, summary="Service health check")
async def health_check(db: AsyncSession = Depends(get_db)):
    db_ok    = await check_db_connection()
    cache_ok = await feature_store.is_connected()

    return HealthResponse(
        status="healthy" if db_ok else "degraded",
        version=settings.APP_VERSION,
        model_loaded=model_registry.is_loaded,
        cache_connected=cache_ok,
        db_connected=db_ok,
        uptime_seconds=round(time.time() - _start_time, 1),
    )


@router.get("/health/ping", summary="Simple liveness probe")
async def ping():
    return {"status": "ok", "service": settings.APP_NAME}


@router.get("/health/ready", summary="Readiness probe")
async def ready():
    """Returns 200 when service is ready to accept traffic."""
    return {
        "ready": True,
        "model_loaded": model_registry.is_loaded,
        "fallback_active": not model_registry.is_loaded,
    }
