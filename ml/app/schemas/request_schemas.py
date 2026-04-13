from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from enum import Enum


class PolicyCategory(str, Enum):
    HEALTH = "HEALTH"
    LIFE = "LIFE"
    TERM = "TERM"
    MOTOR = "MOTOR"
    TRAVEL = "TRAVEL"
    HOME = "HOME"


class Gender(str, Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"


class IncomeBracket(str, Enum):
    BELOW_3L = "BELOW_3L"
    THREE_TO_6L = "3L_TO_6L"
    SIX_TO_10L = "6L_TO_10L"
    TEN_TO_20L = "10L_TO_20L"
    ABOVE_20L = "ABOVE_20L"


class CityTier(str, Enum):
    TIER_1 = "TIER_1"
    TIER_2 = "TIER_2"
    TIER_3 = "TIER_3"


# ── Feature Vector ─────────────────────────────────────────────────────────
class UserFeatures(BaseModel):
    """Feature vector for ML inference. All fields have sensible defaults."""
    user_id: str = Field(..., description="User UUID")
    age: int = Field(default=30, ge=1, le=100)
    gender: Gender = Field(default=Gender.OTHER)
    income_bracket: IncomeBracket = Field(default=IncomeBracket.SIX_TO_10L)
    city_tier: CityTier = Field(default=CityTier.TIER_2)
    is_smoker: bool = False
    has_diabetes: bool = False
    has_hypertension: bool = False
    has_heart_disease: bool = False
    family_members: int = Field(default=1, ge=1, le=20)
    monthly_budget: float = Field(default=2000.0, ge=0)
    purchased_categories: List[str] = Field(default_factory=list)
    existing_coverage: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("age")
    @classmethod
    def validate_age(cls, v: int) -> int:
        if v < 1 or v > 100:
            raise ValueError("Age must be between 1 and 100")
        return v


# ── Recommendation Request ─────────────────────────────────────────────────
class RecommendationRequest(BaseModel):
    features: UserFeatures
    category: Optional[PolicyCategory] = None
    limit: int = Field(default=5, ge=1, le=20)
    exclude_policy_ids: List[str] = Field(default_factory=list)
    context: Dict[str, Any] = Field(default_factory=dict)


# ── Batch Recommendation ───────────────────────────────────────────────────
class BatchRecommendationRequest(BaseModel):
    requests: List[RecommendationRequest] = Field(..., min_length=1, max_length=50)


# ── Interaction Tracking ───────────────────────────────────────────────────
class InteractionAction(str, Enum):
    VIEW = "view"
    CLICK = "click"
    QUOTE = "quote"
    PURCHASE = "purchase"
    DISMISS = "dismiss"


class InteractionEvent(BaseModel):
    user_id: str
    policy_id: str
    recommendation_id: Optional[str] = None
    action: InteractionAction
    session_id: Optional[str] = None
    context: Dict[str, Any] = Field(default_factory=dict)


# ── Retraining ─────────────────────────────────────────────────────────────
class RetrainRequest(BaseModel):
    force: bool = False
    model_version: Optional[str] = None
    hyperparams: Optional[Dict[str, Any]] = None
