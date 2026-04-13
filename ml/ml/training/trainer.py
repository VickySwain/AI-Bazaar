"""
CoverAI Recommendation Model Trainer.
"""

import json
import time
import joblib
import warnings
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime
from dataclasses import dataclass, field

import xgboost as xgb
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.metrics import (
    roc_auc_score, average_precision_score,
    precision_score, recall_score, f1_score,
    classification_report,
)

try:
    import mlflow
    import mlflow.xgboost
    MLFLOW_AVAILABLE = True
except ImportError:
    MLFLOW_AVAILABLE = False

try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False

from loguru import logger
from ml.training.preprocessor import RecommendationPreprocessor
from ml.training.data_generator import (
    generate_interaction_dataset, save_dataset, load_dataset,
    POLICIES,
)
from ml.features.feature_definitions import ALL_FEATURES, get_feature_names
from config.settings import get_settings

warnings.filterwarnings("ignore", category=UserWarning)
settings = get_settings()


@dataclass
class TrainingConfig:
    n_estimators: int = 400
    max_depth: int = 6
    learning_rate: float = 0.05
    subsample: float = 0.8
    colsample_bytree: float = 0.8
    min_child_weight: int = 5
    gamma: float = 0.1
    reg_alpha: float = 0.1
    reg_lambda: float = 1.0
    scale_pos_weight: float = 3.0
    tree_method: str = "hist"
    eval_metric: str = "auc"
    test_size: float = 0.20
    cv_folds: int = 5
    random_state: int = 42
    early_stopping_rounds: int = 30
    n_synthetic_users: int = 8000
    use_cached_data: bool = True
    model_version: str = "v1.0.0"
    run_shap: bool = True
    log_to_mlflow: bool = True


@dataclass
class TrainingResult:
    model_version: str
    trained_at: str
    training_samples: int
    feature_count: int
    metrics: Dict[str, float] = field(default_factory=dict)
    feature_importances: Dict[str, float] = field(default_factory=dict)
    shap_values: Optional[np.ndarray] = None
    model_path: Optional[str] = None
    duration_seconds: float = 0.0


class RecommendationTrainer:

    def __init__(self, config: Optional[TrainingConfig] = None):
        self.config = config or TrainingConfig()
        self.model: Optional[xgb.XGBClassifier] = None
        self.preprocessor: Optional[RecommendationPreprocessor] = None
        self._ensure_dirs()

    def _ensure_dirs(self):
        for d in [settings.MODEL_DIR, settings.RAW_DATA_DIR, settings.PROCESSED_DATA_DIR]:
            d.mkdir(parents=True, exist_ok=True)

    def prepare_data(self) -> pd.DataFrame:
        raw_path = settings.RAW_DATA_DIR / "interactions.parquet"
        if self.config.use_cached_data and raw_path.exists():
            logger.info(f"Loading cached dataset from {raw_path}")
            df = load_dataset(raw_path)
        else:
            logger.info("Generating fresh synthetic dataset...")
            df = generate_interaction_dataset(n_users=self.config.n_synthetic_users)
            save_dataset(df, raw_path)
        logger.info(
            f"Dataset loaded: {len(df)} rows | "
            f"Positive rate: {df['label'].mean():.2%} | "
            f"Unique users: {df['user_id'].nunique()} | "
            f"Policies: {df['policy_id'].nunique()}"
        )
        return df

    def train(self) -> TrainingResult:
        t0 = time.time()
        logger.info("=" * 60)
        logger.info(f"Starting training — model {self.config.model_version}")
        logger.info("=" * 60)

        # 1. Data
        df = self.prepare_data()

        # 2. Preprocessing
        self.preprocessor = RecommendationPreprocessor()
        X = self.preprocessor.fit_transform(df)
        y = df["label"].values.astype(np.float32)

        logger.info(f"Feature matrix shape: {X.shape}")
        logger.info(f"Label distribution: {y.mean():.3f} positive rate")

        # 3. Train/val split
        X_train, X_val, y_train, y_val = train_test_split(
            X, y,
            test_size=self.config.test_size,
            random_state=self.config.random_state,
            stratify=y,
        )
        logger.info(f"Train: {X_train.shape[0]} | Val: {X_val.shape[0]}")

        # 4. Cross-validation (NO early stopping)
        logger.info(f"Running {self.config.cv_folds}-fold cross-validation...")
        cv_model = self._build_model()
        skf = StratifiedKFold(n_splits=self.config.cv_folds, shuffle=True, random_state=42)
        cv_scores = cross_val_score(cv_model, X_train, y_train, cv=skf, scoring="roc_auc", n_jobs=-1)
        logger.info(f"CV AUC-ROC: {cv_scores.mean():.4f} +/- {cv_scores.std():.4f}")

        # 5. Final training (WITH early stopping)
        logger.info("Training final model...")
        self.model = self._build_model_with_early_stopping()
        self.model.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            verbose=50,
        )

        # 6. Evaluate
        metrics = self._evaluate(X_val, y_val, cv_scores)

        # 7. Feature importances
        feat_importances = self._compute_feature_importances()

        # 8. SHAP
        shap_vals = None
        if self.config.run_shap and SHAP_AVAILABLE:
            shap_vals = self._compute_shap(X_val[:500])

        # 9. Save
        model_path = self._save_artefacts()

        # 10. MLflow
        if self.config.log_to_mlflow and MLFLOW_AVAILABLE:
            self._log_to_mlflow(metrics, feat_importances, model_path)

        duration = time.time() - t0
        logger.info("=" * 60)
        logger.info(f"Training complete in {duration:.1f}s")
        logger.info(f"  AUC-ROC : {metrics.get('auc_roc', 0):.4f}")
        logger.info(f"  AUC-PR  : {metrics.get('auc_pr', 0):.4f}")
        logger.info(f"  P@5     : {metrics.get('precision_at_5', 0):.4f}")
        logger.info(f"  NDCG@10 : {metrics.get('ndcg_at_10', 0):.4f}")
        logger.info("=" * 60)

        return TrainingResult(
            model_version=self.config.model_version,
            trained_at=datetime.utcnow().isoformat(),
            training_samples=len(df),
            feature_count=X.shape[1],
            metrics=metrics,
            feature_importances=feat_importances,
            shap_values=shap_vals,
            model_path=str(model_path),
            duration_seconds=round(duration, 2),
        )

    def _build_model(self) -> xgb.XGBClassifier:
        """CV ke liye — early stopping NAHI"""
        return xgb.XGBClassifier(
            n_estimators=self.config.n_estimators,
            max_depth=self.config.max_depth,
            learning_rate=self.config.learning_rate,
            subsample=self.config.subsample,
            colsample_bytree=self.config.colsample_bytree,
            min_child_weight=self.config.min_child_weight,
            gamma=self.config.gamma,
            reg_alpha=self.config.reg_alpha,
            reg_lambda=self.config.reg_lambda,
            scale_pos_weight=self.config.scale_pos_weight,
            tree_method=self.config.tree_method,
            random_state=self.config.random_state,
            use_label_encoder=False,
            verbosity=0,
        )

    def _build_model_with_early_stopping(self) -> xgb.XGBClassifier:
        """Final training ke liye — early stopping HAAN"""
        return xgb.XGBClassifier(
            n_estimators=self.config.n_estimators,
            max_depth=self.config.max_depth,
            learning_rate=self.config.learning_rate,
            subsample=self.config.subsample,
            colsample_bytree=self.config.colsample_bytree,
            min_child_weight=self.config.min_child_weight,
            gamma=self.config.gamma,
            reg_alpha=self.config.reg_alpha,
            reg_lambda=self.config.reg_lambda,
            scale_pos_weight=self.config.scale_pos_weight,
            tree_method=self.config.tree_method,
            eval_metric=self.config.eval_metric,
            early_stopping_rounds=self.config.early_stopping_rounds,
            random_state=self.config.random_state,
            use_label_encoder=False,
            verbosity=0,
        )

    def _evaluate(self, X_val: np.ndarray, y_val: np.ndarray, cv_scores: np.ndarray) -> Dict[str, float]:
        y_prob = self.model.predict_proba(X_val)[:, 1]
        y_pred = (y_prob >= 0.5).astype(int)

        metrics = {
            "auc_roc":     float(roc_auc_score(y_val, y_prob)),
            "auc_pr":      float(average_precision_score(y_val, y_prob)),
            "precision":   float(precision_score(y_val, y_pred, zero_division=0)),
            "recall":      float(recall_score(y_val, y_pred, zero_division=0)),
            "f1":          float(f1_score(y_val, y_pred, zero_division=0)),
            "cv_auc_mean": float(cv_scores.mean()),
            "cv_auc_std":  float(cv_scores.std()),
            "val_samples": int(len(y_val)),
        }
        metrics["precision_at_5"]  = self._precision_at_k(y_val, y_prob, k=5)
        metrics["precision_at_10"] = self._precision_at_k(y_val, y_prob, k=10)
        metrics["ndcg_at_5"]       = self._ndcg_at_k(y_val, y_prob, k=5)
        metrics["ndcg_at_10"]      = self._ndcg_at_k(y_val, y_prob, k=10)

        logger.info("\nEvaluation Report:")
        logger.info(classification_report(y_val, y_pred, target_names=["No Buy", "Buy"]))
        return metrics

    def _precision_at_k(self, y_true: np.ndarray, y_score: np.ndarray, k: int) -> float:
        top_k_idx = np.argsort(y_score)[::-1][:k]
        return float(y_true[top_k_idx].mean())

    def _ndcg_at_k(self, y_true: np.ndarray, y_score: np.ndarray, k: int) -> float:
        sorted_idx = np.argsort(y_score)[::-1][:k]
        gains = y_true[sorted_idx]
        discounts = np.log2(np.arange(2, len(gains) + 2))
        dcg = np.sum(gains / discounts)
        ideal_gains = np.sort(y_true)[::-1][:k]
        idcg = np.sum(ideal_gains / discounts[:len(ideal_gains)])
        return float(dcg / idcg) if idcg > 0 else 0.0

    def _compute_feature_importances(self) -> Dict[str, float]:
        importances = self.model.feature_importances_
        feat_names = get_feature_names()
        fi_dict = dict(zip(feat_names, importances.tolist()))
        fi_dict = dict(sorted(fi_dict.items(), key=lambda x: x[1], reverse=True))
        logger.info("Top 10 Feature Importances:")
        for i, (feat, imp) in enumerate(list(fi_dict.items())[:10]):
            logger.info(f"  {i+1:2d}. {feat:<35} {imp:.4f}")
        return fi_dict

    def _compute_shap(self, X_sample: np.ndarray) -> Optional[np.ndarray]:
        logger.info(f"Computing SHAP values for {len(X_sample)} samples...")
        try:
            explainer = shap.TreeExplainer(self.model)
            shap_values = explainer.shap_values(X_sample)
            logger.info("SHAP computation complete")
            return shap_values
        except Exception as e:
            logger.warning(f"SHAP computation failed: {e}")
            return None

    def _save_artefacts(self) -> Path:
        joblib.dump(self.model, settings.model_path)
        logger.info(f"Model saved -> {settings.model_path}")
        self.preprocessor.save(settings.scaler_path, settings.feature_names_path)
        joblib.dump({}, settings.encoder_path)
        return settings.model_path

    def _log_to_mlflow(self, metrics, feat_importances, model_path):
        try:
            mlflow.set_tracking_uri(settings.MLFLOW_TRACKING_URI)
            mlflow.set_experiment(settings.MLFLOW_EXPERIMENT_NAME)
            with mlflow.start_run(run_name=f"xgb_{self.config.model_version}"):
                mlflow.log_params({
                    "model_version":    self.config.model_version,
                    "n_estimators":     self.config.n_estimators,
                    "max_depth":        self.config.max_depth,
                    "learning_rate":    self.config.learning_rate,
                    "subsample":        self.config.subsample,
                    "colsample_bytree": self.config.colsample_bytree,
                    "n_features":       len(ALL_FEATURES),
                })
                mlflow.log_metrics(metrics)
                fi_path = settings.PROCESSED_DATA_DIR / "feature_importances.json"
                with open(fi_path, "w") as f:
                    json.dump(feat_importances, f, indent=2)
                mlflow.log_artifact(str(fi_path))
                mlflow.log_artifact(str(model_path))
                logger.info("MLflow run logged successfully")
        except Exception as e:
            logger.warning(f"MLflow logging failed (non-fatal): {e}")


def run_hyperparameter_search(X, y, n_trials=30):
    try:
        import optuna
        optuna.logging.set_verbosity(optuna.logging.WARNING)
    except ImportError:
        logger.warning("Optuna not installed. Skipping HPO.")
        return {}

    def objective(trial):
        params = {
            "n_estimators":     trial.suggest_int("n_estimators", 100, 600),
            "max_depth":        trial.suggest_int("max_depth", 3, 9),
            "learning_rate":    trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
            "subsample":        trial.suggest_float("subsample", 0.5, 1.0),
            "colsample_bytree": trial.suggest_float("colsample_bytree", 0.5, 1.0),
            "min_child_weight": trial.suggest_int("min_child_weight", 1, 10),
            "gamma":            trial.suggest_float("gamma", 0, 1.0),
            "reg_alpha":        trial.suggest_float("reg_alpha", 0, 2.0),
            "reg_lambda":       trial.suggest_float("reg_lambda", 0.5, 3.0),
        }
        model = xgb.XGBClassifier(**params, tree_method="hist", use_label_encoder=False, verbosity=0)
        cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
        scores = cross_val_score(model, X, y, cv=cv, scoring="roc_auc", n_jobs=-1)
        return scores.mean()

    study = optuna.create_study(direction="maximize")
    study.optimize(objective, n_trials=n_trials, show_progress_bar=True)
    logger.info(f"Best HPO AUC: {study.best_value:.4f}")
    logger.info(f"Best params: {study.best_params}")
    return study.best_params


def run_training(config: Optional[TrainingConfig] = None) -> TrainingResult:
    config = config or TrainingConfig()
    trainer = RecommendationTrainer(config)
    return trainer.train()


if __name__ == "__main__":
    import sys
    force_fresh = "--fresh" in sys.argv
    cfg = TrainingConfig(use_cached_data=not force_fresh)
    result = run_training(cfg)
    print("\nTraining Result:")
    for k, v in result.metrics.items():
        print(f"  {k}: {v:.4f}" if isinstance(v, float) else f"  {k}: {v}")