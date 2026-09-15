"""
Unit tests for ContextRRF Reciprocal Rank Fusion (RRF) implementation in contextrrf.ranking.
"""

import pytest
from contextrrf.ranking import rrf_fuse, DEFAULT_RRF_WEIGHTS


def test_rrf_fuse_basic_rankings():
    """Verify basic rank fusion across two channels with equal weights."""
    score_lists = {
        "BM25": [(101, 1.0), (102, 0.8), (103, 0.5)],
        "TFIDF": [(102, 0.9), (101, 0.7), (104, 0.4)],
    }
    weights = {"BM25": 0.5, "TFIDF": 0.5}
    fused = rrf_fuse(score_lists, weights, k=60)

    # Candidate 101: BM25 rank 1, TFIDF rank 2
    # Candidate 102: BM25 rank 2, TFIDF rank 1
    # Scores for 101 and 102 should be equal: 0.5/(60+1) + 0.5/(60+2) = 0.5/61 + 0.5/62
    expected_score = 0.5 / 61.0 + 0.5 / 62.0
    
    assert len(fused) == 4
    top_ids = {fused[0][0], fused[1][0]}
    assert top_ids == {101, 102}
    assert abs(fused[0][1] - expected_score) < 1e-6
    assert abs(fused[1][1] - expected_score) < 1e-6


def test_rrf_explanation_formula():
    """Verify that rrf_fuse attaches structured per-channel explanations and formula strings."""
    score_lists = {
        "BM25": [(1, 0.9)],
        "TFIDF": [(1, 0.85)],
    }
    weights = {"BM25": 0.4, "TFIDF": 0.4}
    fused = rrf_fuse(score_lists, weights, k=60)

    cid, rrf_score, scores_dict = fused[0]
    assert cid == 1
    assert "explanation_formula" in scores_dict
    assert "details" in scores_dict

    bm25_detail = scores_dict["details"]["BM25"]
    assert bm25_detail["rank"] == 1
    assert abs(bm25_detail["contribution"] - (0.4 / 61.0)) < 1e-6

    formula = scores_dict["explanation_formula"]
    assert "RRF(1) =" in formula
    assert "0.40/(60+1)" in formula


def test_rrf_default_weights():
    """Verify that rrf_fuse handles missing weight keys using DEFAULT_RRF_WEIGHTS."""
    score_lists = {
        "bm25": [(1, 10.0)],
        "tfidf": [(1, 0.9)],
    }
    fused = rrf_fuse(score_lists, k=60)
    assert len(fused) == 1
    cid, rrf_score, scores = fused[0]
    assert cid == 1
    assert rrf_score > 0.0
