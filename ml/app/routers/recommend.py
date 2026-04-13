"""
/recommend endpoints:
  POST /recommend          - score policies for one user
  POST /recommend/batch    - score for multiple users
  POST /recommend/insights - coverage gap analysis
  GET  /recommend/explain  - feature importance for a recommendation
"""

import time
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.models.database import get_db
from app.models.policy_repository import policy_repository
from app.schemas.request_schemas import (
    RecommendationRequest, BatchRecommendationRequest, UserFeatures,
)
from app.schemas.response_schemas import (
    RecommendationResponse, BatchRecommendationResponse, InsightsResponse, InsightItem,
    InsightType, InsightPriority,
)
from ml.models.recommender import recommendation_engine
from ml.features.feature_store import feature_store
from ml.models.model_registry import model_registry
from config.settings import get_settings

settings = get_settings()
router = APIRouter(prefix="/recommend", tags=["Recommendations"])


# ── Single Recommendation ─────────────────────────────────────────────────

@router.post(
    "",
    response_model=RecommendationResponse,
    summary="Get AI-powered policy recommendations for a user",
)
async def get_recommendations(
    request: RecommendationRequest,
    db: AsyncSession = Depends(get_db),
):
    t0 = time.time()
    user_id = request.features.user_id
    category = request.category.value if request.category else None
    limit = min(request.limit, settings.RECOMMENDATION_LIMIT_MAX)

    # 1. Check cache
    cached = await feature_store.get_recommendations(user_id, category)
    if cached and not request.context.get("bypass_cache"):
        logger.debug(f"Recommendation cache hit for user {user_id}")
        return RecommendationResponse(
            user_id=user_id,
            recommendations=cached,
            model_version=model_registry.model_version,
            from_cache=True,
            inference_ms=0.0,
        )

    # 2. Fetch active policies
    policies = await policy_repository.get_active_policies(db, category=category)
    if not policies:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active policies found",
        )

    # 3. Score + rank
    try:
        scored, fallback_used = await recommendation_engine.recommend(
            user_features=request.features,
            policies=policies,
            category_filter=category,
            limit=limit,
            exclude_ids=request.exclude_policy_ids,
        )
    except Exception as e:
        logger.error(f"Recommendation engine error for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Recommendation engine error",
        )

    if not scored:
        logger.warning(f"No recommendations generated for user {user_id}")
        return RecommendationResponse(
            user_id=user_id,
            recommendations=[],
            model_version=model_registry.model_version,
            fallback_used=fallback_used,
            inference_ms=(time.time() - t0) * 1000,
        )

    # 4. Cache result
    scored_dicts = [s.model_dump() for s in scored]
    await feature_store.set_recommendations(user_id, scored_dicts, category)

    elapsed_ms = (time.time() - t0) * 1000
    logger.info(
        f"Recommendations generated for {user_id}: "
        f"{len(scored)} items in {elapsed_ms:.0f}ms "
        f"(fallback={fallback_used})"
    )

    return RecommendationResponse(
        user_id=user_id,
        recommendations=scored,
        model_version=model_registry.model_version,
        fallback_used=fallback_used,
        inference_ms=round(elapsed_ms, 2),
    )


# ── Batch Recommendation ──────────────────────────────────────────────────

@router.post(
    "/batch",
    response_model=BatchRecommendationResponse,
    summary="Score policies for multiple users (batch inference)",
)
async def get_batch_recommendations(
    request: BatchRecommendationRequest,
    db: AsyncSession = Depends(get_db),
):
    t0 = time.time()
    results = []

    for req in request.requests:
        resp = await get_recommendations(req, db)
        results.append(resp)

    total_ms = (time.time() - t0) * 1000
    return BatchRecommendationResponse(
        results=results,
        total_inference_ms=round(total_ms, 2),
    )


# ── Insights ──────────────────────────────────────────────────────────────

@router.post(
    "/insights",
    response_model=InsightsResponse,
    summary="Generate personalised insurance insights and coverage gap analysis",
)
async def get_insights(features: UserFeatures, db: AsyncSession = Depends(get_db)):
    insights: List[InsightItem] = []

    age = features.age
    purchased = features.purchased_categories
    health_flags = [
        features.is_smoker, features.has_diabetes,
        features.has_hypertension, features.has_heart_disease,
    ]

    # Profile completeness
    profile_fields = [features.age, features.monthly_budget]
    if not all(profile_fields):
        insights.append(InsightItem(
            type=InsightType.ACTION,
            title="Complete your profile",
            description="Add your age and budget to get accurately personalised recommendations.",
            priority=InsightPriority.HIGH,
        ))

    # Age-based tip
    if age <= 30:
        insights.append(InsightItem(
            type=InsightType.TIP,
            title="Lock in low premiums now",
            description=(
                "Term life premiums at 25 can be 60% cheaper than at 40. "
                "Buying now saves lakhs over your lifetime."
            ),
            priority=InsightPriority.HIGH,
        ))

    # Health conditions
    if any(health_flags):
        conditions = []
        if features.is_smoker:        conditions.append("smoking")
        if features.has_diabetes:     conditions.append("diabetes")
        if features.has_hypertension: conditions.append("hypertension")
        if features.has_heart_disease:conditions.append("heart disease")
        insights.append(InsightItem(
            type=InsightType.ALERT,
            title="Pre-existing conditions need coverage",
            description=(
                f"Your profile indicates {', '.join(conditions)}. "
                "We'll highlight plans with the shortest waiting periods for these."
            ),
            priority=InsightPriority.HIGH,
        ))

    # Family coverage
    if features.family_members > 1 and "HEALTH" not in purchased:
        insights.append(InsightItem(
            type=InsightType.TIP,
            title="Family floater can save up to 40%",
            description=(
                f"A family floater health plan for {features.family_members} members "
                "is typically 30–40% cheaper than individual policies for each."
            ),
            priority=InsightPriority.MEDIUM,
        ))

    # Coverage gaps
    essential_categories = [("HEALTH", "health"), ("TERM", "term life")]
    for cat, label in essential_categories:
        if cat not in purchased:
            insights.append(InsightItem(
                type=InsightType.GAP,
                title=f"No {label} insurance detected",
                description=(
                    f"You currently have no {label} coverage. "
                    "This is considered essential financial protection for you and your family."
                ),
                priority=InsightPriority.HIGH,
            ))

    # Budget insight
    if features.monthly_budget > 0:
        monthly_str = f"₹{int(features.monthly_budget):,}"
        insights.append(InsightItem(
            type=InsightType.TIP,
            title=f"Your budget: {monthly_str}/month",
            description=(
                f"With {monthly_str}/month you can get solid health + term coverage. "
                "We've prioritised plans that fit this budget."
            ),
            priority=InsightPriority.LOW,
        ))

    return InsightsResponse(
        user_id=features.user_id,
        insights=insights[:6],  # cap at 6 insights
    )


# ── Explain ───────────────────────────────────────────────────────────────

@router.get(
    "/explain",
    summary="Get feature importance explanation for the recommendation model",
)
async def explain_model():
    fi = model_registry.get_feature_importances()
    if not fi:
        return {
            "model_loaded": False,
            "message": "Model not loaded — using rule-based fallback",
            "feature_importances": {},
        }

    # Sort top 20
    top = dict(sorted(fi.items(), key=lambda x: x[1], reverse=True)[:20])
    return {
        "model_loaded": True,
        "model_version": model_registry.model_version,
        "feature_importances": top,
        "total_features": len(fi),
    }
