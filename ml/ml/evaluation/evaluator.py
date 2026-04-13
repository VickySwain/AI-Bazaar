"""
Offline evaluation harness for the CoverAI recommendation model.

Metrics computed:
  - AUC-ROC, AUC-PR
  - Precision@K, Recall@K, F1@K (K = 1, 3, 5, 10)
  - NDCG@K
  - Mean Reciprocal Rank (MRR)
  - Coverage (% of policies recommended at least once)
  - Diversity (avg intra-list category diversity)
  - A/B comparison: ML model vs rule-based baseline
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from pathlib import Path
from loguru import logger

from sklearn.metrics import roc_auc_score, average_precision_score


class RecommendationEvaluator:
    """Offline evaluation of ranking quality for the recommendation model."""

    def __init__(self, k_values: List[int] = None):
        self.k_values = k_values or [1, 3, 5, 10]

    # ── Core Ranking Metrics ───────────────────────────────────────────────

    def precision_at_k(
        self,
        y_true_list: List[List[int]],
        y_score_list: List[List[float]],
        k: int,
    ) -> float:
        """
        Precision@K averaged over users.
        y_true_list: for each user, relevance labels for all candidates
        y_score_list: for each user, predicted scores for all candidates
        """
        precisions = []
        for y_true, y_score in zip(y_true_list, y_score_list):
            y_true = np.array(y_true)
            y_score = np.array(y_score)
            top_k_idx = np.argsort(y_score)[::-1][:k]
            p = y_true[top_k_idx].sum() / k
            precisions.append(p)
        return float(np.mean(precisions))

    def recall_at_k(
        self,
        y_true_list: List[List[int]],
        y_score_list: List[List[float]],
        k: int,
    ) -> float:
        recalls = []
        for y_true, y_score in zip(y_true_list, y_score_list):
            y_true = np.array(y_true)
            y_score = np.array(y_score)
            n_relevant = y_true.sum()
            if n_relevant == 0:
                continue
            top_k_idx = np.argsort(y_score)[::-1][:k]
            r = y_true[top_k_idx].sum() / n_relevant
            recalls.append(r)
        return float(np.mean(recalls)) if recalls else 0.0

    def ndcg_at_k(
        self,
        y_true_list: List[List[int]],
        y_score_list: List[List[float]],
        k: int,
    ) -> float:
        ndcgs = []
        for y_true, y_score in zip(y_true_list, y_score_list):
            y_true = np.array(y_true, dtype=float)
            y_score = np.array(y_score)

            top_k_idx = np.argsort(y_score)[::-1][:k]
            gains = y_true[top_k_idx]
            discounts = np.log2(np.arange(2, len(gains) + 2))
            dcg = (gains / discounts).sum()

            ideal_gains = np.sort(y_true)[::-1][:k]
            idcg = (ideal_gains / discounts[:len(ideal_gains)]).sum()

            if idcg > 0:
                ndcgs.append(dcg / idcg)
        return float(np.mean(ndcgs)) if ndcgs else 0.0

    def mean_reciprocal_rank(
        self,
        y_true_list: List[List[int]],
        y_score_list: List[List[float]],
    ) -> float:
        """MRR: mean of 1/rank of first relevant item."""
        rrs = []
        for y_true, y_score in zip(y_true_list, y_score_list):
            y_true = np.array(y_true)
            y_score = np.array(y_score)
            sorted_idx = np.argsort(y_score)[::-1]
            for rank, idx in enumerate(sorted_idx, start=1):
                if y_true[idx] == 1:
                    rrs.append(1.0 / rank)
                    break
            else:
                rrs.append(0.0)
        return float(np.mean(rrs)) if rrs else 0.0

    def hit_rate_at_k(
        self,
        y_true_list: List[List[int]],
        y_score_list: List[List[float]],
        k: int,
    ) -> float:
        """Fraction of users for whom at least one relevant item is in top-K."""
        hits = 0
        for y_true, y_score in zip(y_true_list, y_score_list):
            y_true = np.array(y_true)
            y_score = np.array(y_score)
            top_k_idx = np.argsort(y_score)[::-1][:k]
            if y_true[top_k_idx].sum() > 0:
                hits += 1
        return hits / len(y_true_list) if y_true_list else 0.0

    # ── Catalogue Metrics ──────────────────────────────────────────────────

    def coverage(
        self,
        recommended_items: List[List[str]],
        all_item_ids: List[str],
    ) -> float:
        """Fraction of catalogue that appeared in at least one recommendation list."""
        seen = set()
        for rec_list in recommended_items:
            seen.update(rec_list)
        return len(seen) / max(len(all_item_ids), 1)

    def intra_list_diversity(
        self,
        recommended_items: List[List[str]],
        item_categories: Dict[str, str],
    ) -> float:
        """
        Average fraction of distinct categories across recommendation lists.
        Higher = more diverse recommendations.
        """
        diversities = []
        for rec_list in recommended_items:
            cats = [item_categories.get(i, "UNKNOWN") for i in rec_list]
            if len(cats) > 0:
                diversities.append(len(set(cats)) / len(cats))
        return float(np.mean(diversities)) if diversities else 0.0

    # ── Full Evaluation Report ─────────────────────────────────────────────

    def evaluate(
        self,
        y_true_list: List[List[int]],
        y_score_list: List[List[float]],
        recommended_item_lists: Optional[List[List[str]]] = None,
        all_item_ids: Optional[List[str]] = None,
        item_categories: Optional[Dict[str, str]] = None,
        label: str = "Model",
    ) -> Dict[str, float]:
        """
        Run all metrics and return a flat dict of results.
        """
        logger.info(f"Evaluating {label} on {len(y_true_list)} users…")

        results = {"label": label}

        # Flatten for AUC-style metrics
        y_true_flat = np.concatenate([np.array(y) for y in y_true_list])
        y_score_flat = np.concatenate([np.array(s) for s in y_score_list])

        if y_true_flat.sum() > 0:
            results["auc_roc"] = float(roc_auc_score(y_true_flat, y_score_flat))
            results["auc_pr"] = float(average_precision_score(y_true_flat, y_score_flat))
        else:
            results["auc_roc"] = 0.0
            results["auc_pr"] = 0.0

        results["mrr"] = self.mean_reciprocal_rank(y_true_list, y_score_list)

        for k in self.k_values:
            results[f"precision@{k}"] = self.precision_at_k(y_true_list, y_score_list, k)
            results[f"recall@{k}"]    = self.recall_at_k(y_true_list, y_score_list, k)
            results[f"ndcg@{k}"]      = self.ndcg_at_k(y_true_list, y_score_list, k)
            results[f"hit_rate@{k}"]  = self.hit_rate_at_k(y_true_list, y_score_list, k)

        if recommended_item_lists and all_item_ids:
            results["coverage"] = self.coverage(recommended_item_lists, all_item_ids)

        if recommended_item_lists and item_categories:
            results["intra_list_diversity"] = self.intra_list_diversity(
                recommended_item_lists, item_categories
            )

        self._print_report(results)
        return results

    def _print_report(self, results: Dict):
        label = results.get("label", "Model")
        logger.info(f"\n{'='*50}")
        logger.info(f"  Evaluation: {label}")
        logger.info(f"{'='*50}")
        logger.info(f"  AUC-ROC      : {results.get('auc_roc', 0):.4f}")
        logger.info(f"  AUC-PR       : {results.get('auc_pr', 0):.4f}")
        logger.info(f"  MRR          : {results.get('mrr', 0):.4f}")
        for k in [3, 5, 10]:
            p = results.get(f"precision@{k}", 0)
            n = results.get(f"ndcg@{k}", 0)
            h = results.get(f"hit_rate@{k}", 0)
            logger.info(f"  P@{k:<2} / NDCG@{k:<2} / HR@{k:<2}: {p:.4f} / {n:.4f} / {h:.4f}")
        if "coverage" in results:
            logger.info(f"  Coverage     : {results['coverage']:.4f}")
        if "intra_list_diversity" in results:
            logger.info(f"  Diversity    : {results['intra_list_diversity']:.4f}")
        logger.info(f"{'='*50}\n")

    # ── A/B Comparison ─────────────────────────────────────────────────────

    def ab_compare(
        self,
        y_true_list: List[List[int]],
        model_scores: List[List[float]],
        baseline_scores: List[List[float]],
        k: int = 5,
    ) -> Dict:
        """
        Compare ML model vs rule-based baseline on the same user-policy pairs.
        Returns lift metrics.
        """
        model_results    = self.evaluate(y_true_list, model_scores, label="ML Model")
        baseline_results = self.evaluate(y_true_list, baseline_scores, label="Rule-Based Baseline")

        lifts = {}
        for metric in [f"precision@{k}", f"ndcg@{k}", "auc_roc", "mrr"]:
            m = model_results.get(metric, 0)
            b = baseline_results.get(metric, 0)
            lift = ((m - b) / max(b, 1e-9)) * 100
            lifts[f"{metric}_lift_%"] = round(lift, 2)

        logger.info(f"A/B Lift (ML vs Baseline): {lifts}")

        return {
            "model": model_results,
            "baseline": baseline_results,
            "lifts": lifts,
        }


def run_offline_evaluation() -> Dict:
    """
    Run a full offline evaluation using the trained model and rule-based baseline
    on a held-out test set derived from synthetic data.
    """
    from ml.training.data_generator import generate_interaction_dataset, POLICIES
    from ml.models.model_registry import model_registry
    from ml.models.recommender import recommendation_engine, RecommendationEngine
    from app.schemas.request_schemas import UserFeatures

    logger.info("Generating evaluation dataset…")
    df_test = generate_interaction_dataset(n_users=500)

    evaluator = RecommendationEvaluator()
    policy_ids = [p["id"] for p in POLICIES]

    # Group by user to build per-user label + score lists
    user_groups = df_test.groupby("user_id")
    y_true_list, ml_score_list, rule_score_list = [], [], []
    all_recommended = []

    for user_id, group in user_groups:
        user_row = group.iloc[0]

        user = {
            "user_id": user_id,
            "age": int(user_row["age"]),
            "gender": str(user_row["gender"]),
            "income_bracket": str(user_row["income_bracket"]),
            "city_tier": str(user_row["city_tier"]),
            "is_smoker": bool(user_row["is_smoker"]),
            "has_diabetes": bool(user_row["has_diabetes"]),
            "has_hypertension": bool(user_row["has_hypertension"]),
            "has_heart_disease": bool(user_row["has_heart_disease"]),
            "family_members": int(user_row["family_members"]),
            "monthly_budget": float(user_row["monthly_budget"]),
            "purchased_categories": [],
        }

        # Per-user true labels and scores for each policy in test set
        y_true = []
        ml_scores = []
        rule_scores = []
        user_recs = []

        for pol in POLICIES:
            row = group[group["policy_id"] == pol["id"]]
            label = int(row["label"].values[0]) if len(row) > 0 else 0
            y_true.append(label)

            # ML score
            if model_registry.is_loaded:
                ml_s = model_registry.predict_proba_single(user, pol) or 0.0
            else:
                ml_s = 0.0
            ml_scores.append(ml_s)

            # Rule-based score
            rule_s = float(recommendation_engine._rule_based_scores(user, [pol])[0])
            rule_scores.append(rule_s)

        top5_idx = sorted(range(len(ml_scores)), key=lambda i: ml_scores[i], reverse=True)[:5]
        user_recs = [POLICIES[i]["id"] for i in top5_idx]

        y_true_list.append(y_true)
        ml_score_list.append(ml_scores)
        rule_score_list.append(rule_scores)
        all_recommended.append(user_recs)

    item_categories = {p["id"]: p["category"] for p in POLICIES}

    results = evaluator.ab_compare(y_true_list, ml_score_list, rule_score_list, k=5)
    results["catalogue"] = {
        "coverage": evaluator.coverage(all_recommended, policy_ids),
        "diversity": evaluator.intra_list_diversity(all_recommended, item_categories),
    }
    return results


if __name__ == "__main__":
    results = run_offline_evaluation()
    import json
    print(json.dumps({k: v for k, v in results.items() if k != "model" and k != "baseline"}, indent=2))
