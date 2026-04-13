"""Unit tests for ranking evaluation metrics."""

import pytest
import numpy as np
from ml.evaluation.evaluator import RecommendationEvaluator


@pytest.fixture
def evaluator():
    return RecommendationEvaluator(k_values=[1, 3, 5])


# Perfect ranking: single relevant item always ranked first
PERFECT_LABELS  = [[1, 0, 0, 0, 0]] * 20
PERFECT_SCORES  = [[0.9, 0.7, 0.5, 0.3, 0.1]] * 20

# Worst ranking: relevant item always last
WORST_LABELS    = [[1, 0, 0, 0, 0]] * 20
WORST_SCORES    = [[0.1, 0.3, 0.5, 0.7, 0.9]] * 20

# Random
np.random.seed(42)
N = 30
RANDOM_LABELS   = [list((np.random.rand(5) > 0.7).astype(int)) for _ in range(N)]
RANDOM_SCORES   = [list(np.random.rand(5)) for _ in range(N)]


class TestPrecisionAtK:
    def test_perfect_ranking_p1(self, evaluator):
        p = evaluator.precision_at_k(PERFECT_LABELS, PERFECT_SCORES, k=1)
        assert p == pytest.approx(1.0)

    def test_worst_ranking_p1(self, evaluator):
        p = evaluator.precision_at_k(WORST_LABELS, WORST_SCORES, k=1)
        assert p == pytest.approx(0.0)

    def test_in_range(self, evaluator):
        p = evaluator.precision_at_k(RANDOM_LABELS, RANDOM_SCORES, k=3)
        assert 0.0 <= p <= 1.0


class TestNDCGAtK:
    def test_perfect_ndcg(self, evaluator):
        ndcg = evaluator.ndcg_at_k(PERFECT_LABELS, PERFECT_SCORES, k=5)
        assert ndcg == pytest.approx(1.0)

    def test_ndcg_in_range(self, evaluator):
        ndcg = evaluator.ndcg_at_k(RANDOM_LABELS, RANDOM_SCORES, k=5)
        assert 0.0 <= ndcg <= 1.0

    def test_perfect_better_than_random(self, evaluator):
        ndcg_perfect = evaluator.ndcg_at_k(PERFECT_LABELS, PERFECT_SCORES, k=5)
        ndcg_random  = evaluator.ndcg_at_k(RANDOM_LABELS, RANDOM_SCORES, k=5)
        assert ndcg_perfect >= ndcg_random


class TestMRR:
    def test_perfect_mrr(self, evaluator):
        mrr = evaluator.mean_reciprocal_rank(PERFECT_LABELS, PERFECT_SCORES)
        assert mrr == pytest.approx(1.0)

    def test_worst_mrr(self, evaluator):
        mrr = evaluator.mean_reciprocal_rank(WORST_LABELS, WORST_SCORES)
        assert mrr == pytest.approx(1/5)

    def test_mrr_in_range(self, evaluator):
        mrr = evaluator.mean_reciprocal_rank(RANDOM_LABELS, RANDOM_SCORES)
        assert 0.0 <= mrr <= 1.0


class TestHitRate:
    def test_perfect_hr1(self, evaluator):
        hr = evaluator.hit_rate_at_k(PERFECT_LABELS, PERFECT_SCORES, k=1)
        assert hr == pytest.approx(1.0)

    def test_worst_hr1(self, evaluator):
        hr = evaluator.hit_rate_at_k(WORST_LABELS, WORST_SCORES, k=1)
        assert hr == pytest.approx(0.0)

    def test_worst_hr5(self, evaluator):
        # All 5 items ranked → relevant item always in top-5
        hr = evaluator.hit_rate_at_k(WORST_LABELS, WORST_SCORES, k=5)
        assert hr == pytest.approx(1.0)


class TestCoverage:
    def test_full_coverage(self, evaluator):
        all_items = ["a", "b", "c"]
        recommended = [["a"], ["b"], ["c"]]
        cov = evaluator.coverage(recommended, all_items)
        assert cov == pytest.approx(1.0)

    def test_partial_coverage(self, evaluator):
        all_items = ["a", "b", "c", "d"]
        recommended = [["a"], ["b"]]
        cov = evaluator.coverage(recommended, all_items)
        assert cov == pytest.approx(0.5)

    def test_zero_coverage(self, evaluator):
        all_items = ["a", "b", "c"]
        recommended = [[]]
        cov = evaluator.coverage(recommended, all_items)
        assert cov == pytest.approx(0.0)


class TestDiversity:
    def test_full_diversity(self, evaluator):
        item_cats = {"a": "HEALTH", "b": "TERM", "c": "MOTOR"}
        recs = [["a", "b", "c"]]
        div = evaluator.intra_list_diversity(recs, item_cats)
        assert div == pytest.approx(1.0)

    def test_zero_diversity(self, evaluator):
        item_cats = {"a": "HEALTH", "b": "HEALTH", "c": "HEALTH"}
        recs = [["a", "b", "c"]]
        div = evaluator.intra_list_diversity(recs, item_cats)
        assert div == pytest.approx(1/3)


class TestFullEvaluate:
    def test_evaluate_returns_all_metrics(self, evaluator):
        results = evaluator.evaluate(PERFECT_LABELS, PERFECT_SCORES, label="Test")
        expected = ["auc_roc", "auc_pr", "mrr", "precision@1", "ndcg@3", "hit_rate@5"]
        for m in expected:
            assert m in results, f"Missing metric: {m}"

    def test_perfect_model_high_metrics(self, evaluator):
        results = evaluator.evaluate(PERFECT_LABELS, PERFECT_SCORES)
        assert results["precision@1"] == pytest.approx(1.0)
        assert results["mrr"] == pytest.approx(1.0)
        assert results["ndcg@5"] == pytest.approx(1.0)
