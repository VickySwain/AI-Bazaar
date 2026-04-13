from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from pathlib import Path
from functools import lru_cache
from typing import List, Optional

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ────────────────────────────────────────────────────────
    APP_NAME: str = "CoverAI ML Service"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    PORT: int = 8000
    WORKERS: int = 4
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]

    # ── Database ───────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql://coverai:coverai_secret@localhost:5432/coverai_db"
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20

    # ── Redis ──────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/1"
    RECOMMENDATION_CACHE_TTL: int = 3600        # 1 hour
    FEATURE_CACHE_TTL: int = 1800               # 30 min

    # ── Kafka ──────────────────────────────────────────────────────────────
    KAFKA_BROKERS: str = "localhost:9092"
    KAFKA_GROUP_ID: str = "coverai-ml-group"
    KAFKA_TOPICS_CONSUME: List[str] = [
        "policy.search.events",
        "recommendations.interaction",
    ]
    KAFKA_TOPICS_PRODUCE: List[str] = [
        "recommendations.generated",
        "model.retrain.triggered",
    ]

    # ── Model Paths ────────────────────────────────────────────────────────
    MODEL_DIR: Path = BASE_DIR / "data" / "models"
    DATA_DIR: Path = BASE_DIR / "data"
    RAW_DATA_DIR: Path = BASE_DIR / "data" / "raw"
    PROCESSED_DATA_DIR: Path = BASE_DIR / "data" / "processed"

    # ── MLflow ─────────────────────────────────────────────────────────────
    MLFLOW_TRACKING_URI: str = "http://localhost:5000"
    MLFLOW_EXPERIMENT_NAME: str = "coverai-recommendations"

    # ── Model Parameters ───────────────────────────────────────────────────
    MODEL_VERSION: str = "v1.0.0"
    RECOMMENDATION_LIMIT_DEFAULT: int = 5
    RECOMMENDATION_LIMIT_MAX: int = 20
    MIN_SCORE_THRESHOLD: float = 0.05

    # ── Training ───────────────────────────────────────────────────────────
    TRAIN_TEST_SPLIT: float = 0.2
    RANDOM_STATE: int = 42
    CV_FOLDS: int = 5
    MIN_INTERACTIONS_FOR_RETRAIN: int = 1000
    RETRAIN_SCHEDULE_HOURS: int = 24

    # ── Rule-based fallback weights ────────────────────────────────────────
    WEIGHT_BUDGET_FIT: float = 0.30
    WEIGHT_AGE_RELEVANCE: float = 0.20
    WEIGHT_HEALTH_RELEVANCE: float = 0.25
    WEIGHT_POPULARITY: float = 0.15
    WEIGHT_DIVERSIFICATION: float = 0.10

    @property
    def kafka_brokers_list(self) -> List[str]:
        return self.KAFKA_BROKERS.split(",")

    @property
    def model_path(self) -> Path:
        return self.MODEL_DIR / f"xgb_recommender_{self.MODEL_VERSION}.joblib"

    @property
    def scaler_path(self) -> Path:
        return self.MODEL_DIR / f"scaler_{self.MODEL_VERSION}.joblib"

    @property
    def encoder_path(self) -> Path:
        return self.MODEL_DIR / f"encoder_{self.MODEL_VERSION}.joblib"

    @property
    def feature_names_path(self) -> Path:
        return self.MODEL_DIR / f"feature_names_{self.MODEL_VERSION}.json"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
