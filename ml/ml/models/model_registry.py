"""
Model registry: loads, holds, and serves the trained XGBoost model.
Provides thread-safe access for FastAPI workers.
Supports hot-reload without service restart.
"""

import json
import time
import joblib
import threading
import numpy as np
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime
from loguru import logger

from config.settings import get_settings

settings = get_settings()


class ModelRegistry:
    """
    Singleton-style registry that manages the loaded model and preprocessor.
    Thread-safe via RLock for concurrent FastAPI requests.
    """

    def __init__(self):
        self._lock = threading.RLock()
        self._model = None
        self._preprocessor = None
        self._feature_names: List[str] = []
        self._is_loaded = False
        self._model_version: str = "unknown"
        self._trained_at: Optional[datetime] = None
        self._training_samples: int = 0
        self._metrics: Dict[str, float] = {}
        self._load_time: float = 0.0

    # ── Loading ────────────────────────────────────────────────────────────

    def load(self, force: bool = False) -> bool:
        """Load model from disk. Returns True on success."""
        with self._lock:
            if self._is_loaded and not force:
                return True

            model_path = settings.model_path
            scaler_path = settings.scaler_path
            feature_names_path = settings.feature_names_path

            if not model_path.exists():
                logger.warning(
                    f"Model file not found at {model_path}. "
                    "Will use rule-based fallback until model is trained."
                )
                return False

            try:
                t0 = time.time()
                logger.info(f"Loading model from {model_path}…")

                self._model = joblib.load(model_path)
                logger.info(f"  XGBoost model loaded ({model_path.stat().st_size / 1024:.1f} KB)")

                # Load preprocessor
                from ml.training.preprocessor import RecommendationPreprocessor
                self._preprocessor = RecommendationPreprocessor.load(
                    scaler_path, feature_names_path
                )

                # Load feature names
                if feature_names_path.exists():
                    with open(feature_names_path) as f:
                        data = json.load(f)
                        self._feature_names = data.get("features", [])

                self._is_loaded = True
                self._model_version = settings.MODEL_VERSION
                self._load_time = time.time() - t0

                logger.info(
                    f"Model loaded in {self._load_time:.2f}s | "
                    f"Version: {self._model_version} | "
                    f"Features: {len(self._feature_names)}"
                )
                return True

            except Exception as e:
                logger.error(f"Failed to load model: {e}")
                self._is_loaded = False
                return False

    def reload(self) -> bool:
        """Hot-reload model from disk without service restart."""
        logger.info("Hot-reloading model…")
        return self.load(force=True)

    # ── Inference ─────────────────────────────────────────────────────────

    def predict_proba_batch(
        self,
        user: Dict[str, Any],
        policies: List[Dict[str, Any]],
    ) -> Optional[np.ndarray]:
        """
        Score N policies for one user.
        Returns shape (N,) probability array or None if model not loaded.
        """
        with self._lock:
            if not self._is_loaded or self._model is None:
                return None

            try:
                X = self._preprocessor.transform_batch(user, policies)
                probs = self._model.predict_proba(X)[:, 1]
                return probs.astype(np.float32)
            except Exception as e:
                logger.error(f"Inference error: {e}")
                return None

    def predict_proba_single(
        self,
        user: Dict[str, Any],
        policy: Dict[str, Any],
    ) -> Optional[float]:
        """Score a single (user, policy) pair."""
        with self._lock:
            if not self._is_loaded:
                return None
            try:
                X = self._preprocessor.transform_single(user, policy)
                prob = float(self._model.predict_proba(X)[0, 1])
                return prob
            except Exception as e:
                logger.error(f"Single inference error: {e}")
                return None

    def get_feature_importances(self) -> Dict[str, float]:
        """Return feature importance dict from the loaded model."""
        with self._lock:
            if not self._is_loaded:
                return {}
            fi = self._model.feature_importances_
            names = self._feature_names if self._feature_names else [f"f{i}" for i in range(len(fi))]
            return dict(zip(names, fi.tolist()))

    # ── Properties ────────────────────────────────────────────────────────

    @property
    def is_loaded(self) -> bool:
        return self._is_loaded

    @property
    def model_version(self) -> str:
        return self._model_version

    @property
    def feature_count(self) -> int:
        return len(self._feature_names)

    def get_info(self) -> Dict[str, Any]:
        return {
            "version": self._model_version,
            "algorithm": "XGBoost (binary:logistic)",
            "trained_at": self._trained_at.isoformat() if self._trained_at else None,
            "training_samples": self._training_samples,
            "feature_count": self.feature_count,
            "metrics": self._metrics,
            "is_loaded": self._is_loaded,
            "fallback_active": not self._is_loaded,
            "load_time_seconds": self._load_time,
        }


# ── Singleton ─────────────────────────────────────────────────────────────
model_registry = ModelRegistry()
