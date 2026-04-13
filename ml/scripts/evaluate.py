#!/usr/bin/env python
"""
Run offline evaluation and print a detailed report.

Usage:
    python scripts/evaluate.py
    python scripts/evaluate.py --users 1000
    python scripts/evaluate.py --save report.json
"""

import sys
import json
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from loguru import logger


def main():
    parser = argparse.ArgumentParser(description="Offline model evaluation")
    parser.add_argument("--users", type=int, default=500)
    parser.add_argument("--save", type=str, default=None)
    args = parser.parse_args()

    logger.info(f"Running evaluation with {args.users} test users…")

    from ml.models.model_registry import model_registry
    model_registry.load()

    from ml.evaluation.evaluator import run_offline_evaluation
    results = run_offline_evaluation()

    # Print clean summary
    print("\n" + "="*55)
    print("  CoverAI Recommendation Model — Evaluation Report")
    print("="*55)

    print("\n📊 ML Model Metrics:")
    for k, v in results.get("model", {}).items():
        if k != "label" and isinstance(v, float):
            print(f"   {k:<25}: {v:.4f}")

    print("\n📏 Baseline (Rule-Based) Metrics:")
    for k, v in results.get("baseline", {}).items():
        if k != "label" and isinstance(v, float):
            print(f"   {k:<25}: {v:.4f}")

    print("\n🚀 Lift (ML vs Baseline):")
    for k, v in results.get("lifts", {}).items():
        sign = "+" if v > 0 else ""
        print(f"   {k:<30}: {sign}{v:.2f}%")

    print("\n📚 Catalogue Coverage:")
    for k, v in results.get("catalogue", {}).items():
        print(f"   {k:<25}: {v:.4f}")
    print()

    if args.save:
        out = Path(args.save)
        # Remove numpy arrays before serialising
        clean = {
            k: v for k, v in results.items()
            if k not in ("model", "baseline") or True
        }
        with open(out, "w") as f:
            json.dump(
                {k: v for k, v in results.items() if isinstance(v, (dict, list, float, int, str))},
                f,
                indent=2,
                default=str,
            )
        logger.info(f"Report saved to {out}")


if __name__ == "__main__":
    main()
