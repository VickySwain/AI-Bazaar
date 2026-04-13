"""
/training endpoints for triggering and monitoring model retraining.
"""

import uuid
import asyncio
from datetime import datetime
from typing import Dict, Optional
from fastapi import APIRouter, BackgroundTasks, HTTPException, Header, status
from loguru import logger

from app.schemas.request_schemas import RetrainRequest
from app.schemas.response_schemas import TrainingResponse, TrainingStatus, ModelInfo
from ml.models.model_registry import model_registry
from config.settings import get_settings

settings = get_settings()
router = APIRouter(prefix="/training", tags=["Model Training"])

# In-memory job store (replace with Redis/DB in production)
_training_jobs: Dict[str, TrainingResponse] = {}


def _require_api_key(x_api_key: Optional[str] = Header(default=None)):
    """Simple API key guard for training endpoints."""
    expected = getattr(settings, "TRAINING_API_KEY", None)
    if expected and x_api_key != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-API-Key header",
        )


# ── Trigger Training ───────────────────────────────────────────────────────

@router.post(
    "/train",
    response_model=TrainingResponse,
    summary="Trigger model retraining (async background job)",
)
async def trigger_training(
    request: RetrainRequest,
    background_tasks: BackgroundTasks,
):
    job_id = str(uuid.uuid4())[:8]
    response = TrainingResponse(
        job_id=job_id,
        status=TrainingStatus.RUNNING,
        message="Training job started",
        started_at=datetime.utcnow(),
    )
    _training_jobs[job_id] = response

    background_tasks.add_task(_run_training_job, job_id, request)
    logger.info(f"Training job {job_id} queued")
    return response


async def _run_training_job(job_id: str, request: RetrainRequest):
    from ml.training.trainer import run_training, TrainingConfig

    job = _training_jobs[job_id]
    try:
        logger.info(f"[Job {job_id}] Training started")

        config = TrainingConfig(
            use_cached_data=not request.force,
            model_version=request.model_version or settings.MODEL_VERSION,
        )
        if request.hyperparams:
            for k, v in request.hyperparams.items():
                if hasattr(config, k):
                    setattr(config, k, v)

        # Run training in thread pool (CPU-bound)
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, run_training, config)

        # Reload model
        model_registry.reload()

        job.status = TrainingStatus.COMPLETED
        job.message = f"Training complete. AUC-ROC: {result.metrics.get('auc_roc', 0):.4f}"
        job.metrics = result.metrics

        logger.info(f"[Job {job_id}] Training completed successfully")

    except Exception as e:
        job.status = TrainingStatus.FAILED
        job.message = f"Training failed: {str(e)}"
        logger.error(f"[Job {job_id}] Training failed: {e}")


# ── Job Status ─────────────────────────────────────────────────────────────

@router.get(
    "/jobs/{job_id}",
    response_model=TrainingResponse,
    summary="Get training job status",
)
async def get_job_status(job_id: str):
    if job_id not in _training_jobs:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return _training_jobs[job_id]


@router.get(
    "/jobs",
    summary="List all training jobs",
)
async def list_jobs():
    return {"jobs": list(_training_jobs.values())}


# ── Model Info ─────────────────────────────────────────────────────────────

@router.get(
    "/model",
    response_model=ModelInfo,
    summary="Get current model information and metrics",
)
async def get_model_info():
    info = model_registry.get_info()
    return ModelInfo(**info)


# ── Model Reload ───────────────────────────────────────────────────────────

@router.post(
    "/reload",
    summary="Hot-reload model from disk without restarting the service",
)
async def reload_model():
    success = model_registry.reload()
    if success:
        return {"status": "ok", "message": "Model reloaded", "version": model_registry.model_version}
    return {"status": "warning", "message": "Model file not found — fallback active"}
