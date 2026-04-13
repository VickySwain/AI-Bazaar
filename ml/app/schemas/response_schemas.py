from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class PolicySummary(BaseModel):
    id: str
    name: str
    category: str
    insurer_name: str
    base_premium: float
    sum_assured: Optional[float] = None
    avg_rating: float
    claim_settlement_ratio: Optional[float] = None
    cashless_hospitals: Optional[int] = None
    inclusions: List[str] = Field(default_factory=list)
    is_featured: bool = False


class ScoredPolicy(BaseModel):
    policy: PolicySummary
    score: float = Field(ge=0.0, le=1.0)
    rank: int = Field(ge=1)
    reasons: List[str] = Field(default_factory=list)
    feature_contributions: Optional[Dict[str, float]] = None
    model_version: str = "v1.0.0"


class RecommendationResponse(BaseModel):
    user_id: str
    recommendations: List[ScoredPolicy]
    model_version: str
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    from_cache: bool = False
    fallback_used: bool = False
    inference_ms: Optional[float] = None


class BatchRecommendationResponse(BaseModel):
    results: List[RecommendationResponse]
    total_inference_ms: float


class ModelInfo(BaseModel):
    version: str
    algorithm: str
    trained_at: Optional[datetime]
    training_samples: Optional[int]
    feature_count: int
    metrics: Dict[str, float] = Field(default_factory=dict)
    is_loaded: bool
    fallback_active: bool


class HealthResponse(BaseModel):
    status: str
    version: str
    model_loaded: bool
    cache_connected: bool
    db_connected: bool
    uptime_seconds: float


class TrainingStatus(str, Enum):
    IDLE = "IDLE"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class TrainingResponse(BaseModel):
    job_id: str
    status: TrainingStatus
    message: str
    started_at: Optional[datetime] = None
    metrics: Optional[Dict[str, float]] = None


class InsightType(str, Enum):
    ACTION = "ACTION"
    TIP = "TIP"
    ALERT = "ALERT"
    GAP = "GAP"


class InsightPriority(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class InsightItem(BaseModel):
    type: InsightType
    title: str
    description: str
    priority: InsightPriority


class InsightsResponse(BaseModel):
    user_id: str
    insights: List[InsightItem]
    generated_at: datetime = Field(default_factory=datetime.utcnow)
