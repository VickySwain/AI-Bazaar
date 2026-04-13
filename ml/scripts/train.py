#!/usr/bin/env python
"""
CLI entrypoint for training the CoverAI recommendation model.

Usage:
    python scripts/train.py                        # train with defaults
    python scripts/train.py --fresh                # regenerate synthetic data
    python scripts/train.py --users 10000          # larger dataset
    python scripts/train.py --no-mlflow            # skip MLflow logging
    python scripts/train.py --hpo --trials 50      # with HPO
    python scripts/train.py --evaluate             # train + offline evaluation
"""

import sys
import argparse
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from loguru import logger
from ml.training.trainer import run_training, TrainingConfig
from config.settings import get_settings

settings = get_settings()


def parse_args():
    parser = argparse.ArgumentParser(
        description="Train CoverAI recommendation model",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--fresh", action="store_true",
        help="Regenerate synthetic data (ignore cache)",
    )
    parser.add_argument(
        "--users", type=int, default=8000,
        help="Number of synthetic users to generate (default: 8000)",
    )
    parser.add_argument(
        "--estimators", type=int, default=400,
        help="XGBoost n_estimators (default: 400)",
    )
    parser.add_argument(
        "--depth", type=int, default=6,
        help="XGBoost max_depth (default: 6)",
    )
    parser.add_argument(
        "--lr", type=float, default=0.05,
        help="Learning rate (default: 0.05)",
    )
    parser.add_argument(
        "--no-mlflow", action="store_true",
        help="Skip MLflow logging",
    )
    parser.add_argument(
        "--no-shap", action="store_true",
        help="Skip SHAP feature importance computation",
    )
    parser.add_argument(
        "--hpo", action="store_true",
        help="Run Optuna hyperparameter optimisation before training",
    )
    parser.add_argument(
        "--trials", type=int, default=30,
        help="Number of HPO trials (default: 30)",
    )
    parser.add_argument(
        "--evaluate", action="store_true",
        help="Run offline evaluation after training",
    )
    parser.add_argument(
        "--version", type=str, default=settings.MODEL_VERSION,
        help=f"Model version tag (default: {settings.MODEL_VERSION})",
    )
    return parser.parse_args()


def main():
    args = parse_args()

    logger.info("CoverAI Recommendation Model Trainer")
    logger.info(f"Python {sys.version}")
    logger.info(f"Model version: {args.version}")

    # ── Optional HPO ─────────────────────────────────────────────────────
    best_params = {}
    if args.hpo:
        logger.info(f"Running hyperparameter optimisation ({args.trials} trials)…")
        from ml.training.trainer import run_hyperparameter_search
        from ml.training.data_generator import generate_interaction_dataset
        from ml.training.preprocessor import RecommendationPreprocessor

        df = generate_interaction_dataset(n_users=3000)
        preprocessor = RecommendationPreprocessor()
        X = preprocessor.fit_transform(df)
        y = df["label"].values

        best_params = run_hyperparameter_search(X, y, n_trials=args.trials)
        logger.info(f"Best hyperparameters: {json.dumps(best_params, indent=2)}")

    # ── Build Config ──────────────────────────────────────────────────────
    config = TrainingConfig(
        n_estimators   = best_params.get("n_estimators",    args.estimators),
        max_depth      = best_params.get("max_depth",        args.depth),
        learning_rate  = best_params.get("learning_rate",    args.lr),
        subsample      = best_params.get("subsample",        0.8),
        colsample_bytree = best_params.get("colsample_bytree", 0.8),
        use_cached_data  = not args.fresh,
        n_synthetic_users = args.users,
        log_to_mlflow  = not args.no_mlflow,
        run_shap       = not args.no_shap,
        model_version  = args.version,
    )

    # ── Train ─────────────────────────────────────────────────────────────
    result = run_training(config)

    logger.info("\n✅ Training complete!")
    logger.info(f"   Model saved  : {result.model_path}")
    logger.info(f"   Samples      : {result.training_samples:,}")
    logger.info(f"   Features     : {result.feature_count}")
    logger.info(f"   Duration     : {result.duration_seconds:.1f}s")
    logger.info("\nKey metrics:")
    for k, v in result.metrics.items():
        if isinstance(v, float):
            logger.info(f"   {k:<25}: {v:.4f}")

    # ── Top feature importances ───────────────────────────────────────────
    if result.feature_importances:
        top = list(result.feature_importances.items())[:10]
        logger.info("\nTop 10 features:")
        for i, (feat, imp) in enumerate(top, 1):
            bar = "█" * int(imp * 200)
            logger.info(f"   {i:2}. {feat:<35} {imp:.4f} {bar}")

    # ── Offline evaluation ────────────────────────────────────────────────
    if args.evaluate:
        logger.info("\nRunning offline evaluation…")
        from ml.evaluation.evaluator import run_offline_evaluation
        eval_results = run_offline_evaluation()
        logger.info("Evaluation complete.")

    return result


if __name__ == "__main__":
    main()
