# Current Reciprocal Rank Fusion (RRF) Behavior in ContextRRF

This document details the exact Reciprocal Rank Fusion (RRF) implementation in ContextRRF (v1.1.0 baseline), traced directly from source files [`contextrrf/ranking.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/ranking.py) and [`contextrrf/retrieval.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/retrieval.py).

---

## 1. Mathematical Formulation

In ContextRRF, Reciprocal Rank Fusion combines score lists from multiple retrieval channels (such as **BM25**, **TF-IDF**, **Symbol Matcher**, and **Dense Vector Search**) into a single unified score per chunk $d$.

The equation implemented in `rrf_fuse` is:

$$RRF(d) = \sum_{s \in S} \frac{w_s}{k + \text{rank}_s(d)}$$

Where:
- $S$: Set of active retrieval sources (e.g., `{"bm25", "tfidf", "symbol", "dense"}`).
- $w_s$: Weight assigned to source $s$ (defaults to `1.0` if unspecified).
- $k$: RRF smoothing constant (fixed to `60` by default).
- $\text{rank}_s(d)$: The 1-based rank of chunk $d$ in the sorted candidate list for source $s$.

---

## 2. Source Code Implementation

The fusion algorithm is defined in [`contextrrf/ranking.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/ranking.py):

```python
def rrf_fuse(
    score_lists: dict[str, list[tuple[int, float]]],
    weights: dict[str, float],
    k: int = 60,
) -> list[tuple[int, float, dict]]:
    # Build rank maps for each source
    rank_maps: dict[str, dict[int, int]] = {}
    list_lengths: dict[str, int] = {}

    for source, pairs in score_lists.items():
        sorted_pairs = sorted(pairs, key=lambda x: x[1], reverse=True)
        list_lengths[source] = len(sorted_pairs)
        rank_maps[source] = {chunk_id: rank + 1 for rank, (chunk_id, _) in enumerate(sorted_pairs)}

    # Collect all unique chunk ids across all sources
    all_ids: set[int] = set()
    for pairs in score_lists.values():
        for chunk_id, _ in pairs:
            all_ids.add(chunk_id)

    # Build raw score lookup for reporting
    raw_scores: dict[str, dict[int, float]] = {}
    for source, pairs in score_lists.items():
        raw_scores[source] = {chunk_id: score for chunk_id, score in pairs}

    results: list[tuple[int, float, dict]] = []
    for chunk_id in all_ids:
        rrf_score = 0.0
        source_scores: dict[str, float] = {}
        for source in score_lists:
            w = weights.get(source, 1.0)
            rank = rank_maps[source].get(chunk_id, list_lengths[source] + 1)
            contribution = w / (k + rank)
            rrf_score += contribution
            source_scores[source] = raw_scores[source].get(chunk_id, 0.0)
        source_scores["rrf"] = rrf_score
        results.append((chunk_id, rrf_score, source_scores))

    results.sort(key=lambda x: x[1], reverse=True)
    return results
```

---

## 3. Key Algorithmic Properties

### A. Missing-Result Handling (Penalty Rank)
If a chunk $d$ appears in some candidate source lists (e.g. BM25) but is absent from another list $s$ (e.g. TF-IDF), it is assigned a **penalty rank**:

$$\text{rank}_s(d) = |L_s| + 1$$

Where $|L_s| = \text{list\_lengths}[s]$. This ensures chunks missing from a specific search channel are not unfairly boosted or zeroed out, but receive a contribution proportional to the size of that list.

### B. Dynamic Channel Weights
The weights dictionary allows tuning per-source importance:
- BM25 weight: Default `1.0`
- TF-IDF weight: Default `1.0`
- Symbol weight: Boosted in symbol-heavy queries
- Dense weight: Default `1.0` when ONNX runtime is enabled

### C. Smoothing Constant $k = 60$
Setting $k = 60$ dampens the high rank variance near top positions, preventing a rank-1 result in a noisy channel from dominating consistent rank-2/rank-3 results across multiple channels.

---

## 4. Retrieval Integration & Post-Fusion Adjustments

In [`contextrrf/retrieval.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/retrieval.py), `_rrf_fuse` gathers scores from each active backend, executes `rrf_fuse(...)`, and passes the resulting candidates to:
1. Filename match boosting (`1.5x` multiplier for exact file/path matching).
2. Cost-model value-density scoring (`cost_model_score`).
3. Greedy token-budget selection (`budget_cut`).
