# ContextRRF Algorithmic Specifications

## Overview
This document specifies the mathematical formulas, scoring functions, and algorithmic bounds employed within **ContextRRF**.

---

## 1. Reciprocal Rank Fusion (RRF)

### Mathematical Definition
Reciprocal Rank Fusion fuses $m$ independent ranking channels into a unified score for document $d$:

$$RRF(d) = \sum_{s \in S} \frac{w_s}{k + \text{rank}_s(d)}$$

### Parameters & Defaults
- $S = \{\text{BM25}, \text{TF-IDF}, \text{Usage}, \text{Symbol}\}$
- $w_{\text{BM25}} = 0.40$
- $w_{\text{TF-IDF}} = 0.40$
- $w_{\text{Usage}} = 0.20$
- $w_{\text{Symbol}} = 0.60$ (when symbol match active)
- $k = 60$ (smoothing constant preventing top-rank dominance)

### Properties & Benefits
1. **Scale-Invariant**: Operates strictly on ordinal ranks ($\text{rank}_s(d) \in \mathbb{N}^+$), removing the need to normalize incompatible raw scores (e.g. negative BM25 vs cosine similarity $[0, 1]$).
2. **Outlier Resistant**: A single anomalous score across channels cannot distort the combined ranking.
3. **Monotonicity**: Higher rank in any constituent channel strictly increases or maintains $RRF(d)$.

---

## 2. BM25 Lexical Retrieval

ContextRRF uses the Okapi BM25 scoring algorithm via SQLite FTS5:

$$\text{Score}_{\text{BM25}}(D, Q) = \sum_{i=1}^{n} \text{IDF}(q_i) \cdot \frac{f(q_i, D) \cdot (k_1 + 1)}{f(q_i, D) + k_1 \cdot \left(1 - b + b \cdot \frac{|D|}{\text{avgdl}}\right)}$$

$$\text{IDF}(q_i) = \ln \left( \frac{N - n(q_i) + 0.5}{n(q_i) + 0.5} + 1 \right)$$

### Parameters
- $k_1 = 1.2$ (term frequency saturation control)
- $b = 0.75$ (document length normalization control)
- $|D|$: Token length of chunk $D$
- $\text{avgdl}$: Average chunk length across the corpus

---

## 3. Sublinear TF-IDF Vector Retrieval

To prevent frequent terms in large functions from dominating vector scores, ContextRRF applies sublinear term frequency scaling:

$$\text{TF}(t, d) = 1 + \ln(f(t, d)) \quad \text{if } f(t, d) > 0 \text{ else } 0$$

$$\text{IDF}(t, D) = \ln \left( \frac{1 + N}{1 + |\text{docs}(t)|} \right) + 1$$

$$\vec{V}(d) = \left[ \text{TF}(t_1, d) \cdot \text{IDF}(t_1, D), \dots, \text{TF}(t_m, d) \cdot \text{IDF}(t_m, D) \right]$$

$$\text{CosineSimilarity}(q, d) = \frac{\vec{V}(q) \cdot \vec{V}(d)}{\|\vec{V}(q)\| \|\vec{V}(d)\|}$$

---

## 4. Cost Model Value Density Ranking

To select chunks optimized for token budget constraints, ContextRRF computes a value density metric $D(d)$:

$$D(d) = \frac{RRF(d)}{\text{Tokens}(d)} \times (1 - \text{BoilerplateRatio}(d))$$

### Boilerplate Penalty Computation
$$\text{BoilerplateRatio}(d) = \min\left(1.0, \frac{\text{Lines}_{\text{boilerplate}}}{\text{Lines}_{\text{total}}} + 0.3 \times \text{RepetitionScore}\right)$$

Chunks from non-code extensions (`.html`, `.css`, `.md`) or test suites (`tests/`) receive additional density penalties so production logic is prioritized in context windows.

---

## 5. Token Budget Allocation Algorithm

```python
def budget_cut(ranked_chunks: list[tuple[Chunk, float]], budget: int) -> list[Chunk]:
    selected = []
    used_tokens = 0
    for chunk, density_score in ranked_chunks:
        tokens = estimate_tokens(chunk.content)
        if used_tokens + tokens <= budget:
            selected.append(chunk)
            used_tokens += tokens
        elif chunk.compressed and used_tokens + estimate_tokens(chunk.compressed) <= budget:
            chunk.use_compressed = True
            selected.append(chunk)
            used_tokens += estimate_tokens(chunk.compressed)
    return selected
```
