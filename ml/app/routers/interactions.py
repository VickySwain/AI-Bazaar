"""
/interactions endpoints — store user interaction events for model retraining.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from loguru import logger

from app.models.database import get_db
from app.schemas.request_schemas import InteractionEvent

router = APIRouter(prefix="/interactions", tags=["Interactions"])


@router.post(
    "",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Track a user interaction event (click, quote, purchase)",
)
async def record_interaction(
    event: InteractionEvent,
    db: AsyncSession = Depends(get_db),
):
    """
    Stores interaction events to PostgreSQL for offline model retraining.
    Events are also used to invalidate recommendation cache on purchase.
    """
    try:
        await db.execute(
            text("""
                INSERT INTO recommendation_interactions
                    (user_id, policy_id, recommendation_id, action, session_id, context, created_at)
                VALUES
                    (:user_id, :policy_id, :recommendation_id, :action, :session_id, :context, NOW())
                ON CONFLICT DO NOTHING
            """),
            {
                "user_id":           event.user_id,
                "policy_id":         event.policy_id,
                "recommendation_id": event.recommendation_id,
                "action":            event.action.value,
                "session_id":        event.session_id,
                "context":           str(event.context),
            },
        )
        await db.commit()
    except Exception as e:
        logger.warning(f"Interaction insert failed (non-fatal): {e}")
        # Don't raise — interaction tracking should never block the user

    # Invalidate recommendation cache on purchase
    if event.action.value == "purchase":
        from ml.features.feature_store import feature_store
        invalidated = await feature_store.invalidate_recommendations(event.user_id)
        logger.info(
            f"Invalidated {invalidated} cached recommendations "
            f"for user {event.user_id} after purchase"
        )

    return {"accepted": True, "event": event.action.value}


@router.get(
    "/stats/{user_id}",
    summary="Get interaction stats for a user",
)
async def get_user_interaction_stats(
    user_id: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(
            text("""
                SELECT action, COUNT(*) as count
                FROM recommendation_interactions
                WHERE user_id = :user_id
                GROUP BY action
            """),
            {"user_id": user_id},
        )
        rows = result.mappings().all()
        return {"user_id": user_id, "stats": [dict(r) for r in rows]}
    except Exception as e:
        logger.warning(f"Stats query failed: {e}")
        return {"user_id": user_id, "stats": []}
