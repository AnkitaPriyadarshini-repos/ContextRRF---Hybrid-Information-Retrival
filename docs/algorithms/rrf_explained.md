# Reciprocal Rank Fusion (RRF) Deep Dive

## Introduction
Reciprocal Rank Fusion (RRF) is an unsupervised rank aggregation method designed to combine search results from multiple information retrieval systems. In **ContextRRF**, RRF acts as the core fusion mechanism, blending lexical, vector space, symbol, and temporal usage signals into a transparent ranking.

---

## Why RRF over Score-Based Merging?

When combining search engines (e.g. BM25 and Vector Search), raw scores cannot be directly summed or averaged due to fundamental incompatibilities:
1. **Heterogeneous Scale**: FTS5 BM25 yields raw scores ranging from negative unbounded numbers to zero; Cosine Similarity yields values in $[0, 1]$; Usage counts are integer event frequencies.
2. **Distribution Skew**: A high BM25 score of $12.5$ in one query cannot be calibrated against a cosine similarity of $0.82$ in another query.
3. **Hyperparameter Sensitivity**: Score-based linear combinations require complex normalization (Min-Max, Z-Score) which breaks when single outliers occur.

**RRF bypasses score normalization entirely by operating on rank positions.**

---

## Step-by-Step Derivation & Worked Example

Consider a query `"process_payment refund credit card"` evaluated against 4 candidate code chunks across 3 retrieval channels:

### 1. Channel Inputs

| Candidate Chunk | BM25 Rank | TF-IDF Rank | Usage Rank |
| :--- | :---: | :---: | :---: |
| `Chunk_1` (`payment.py:process_payment`) | **1** | **4** | **1** |
| `Chunk_2` (`payment.py:refund_transaction`)| **2** | **1** | **3** |
| `Chunk_3` (`api.py:payment_route`) | **3** | **2** | **2** |
| `Chunk_4` (`users.py:get_user`) | **4** | **3** | **4** |

### 2. Parameter Configuration
- Weights: $w_{\text{BM25}} = 0.40, w_{\text{TF-IDF}} = 0.40, w_{\text{Usage}} = 0.20$
- Smoothing Constant: $k = 60$

### 3. Step-by-Step Mathematical Calculation

#### For `Chunk_1`:
$$\text{BM25 Contribution} = \frac{0.40}{60 + 1} = \frac{0.40}{61} \approx 0.006557$$
$$\text{TF-IDF Contribution} = \frac{0.40}{60 + 4} = \frac{0.40}{64} \approx 0.006250$$
$$\text{Usage Contribution} = \frac{0.20}{60 + 1} = \frac{0.20}{61} \approx 0.003279$$

$$RRF(\text{Chunk}_1) = 0.006557 + 0.006250 + 0.003279 = \mathbf{0.016086}$$

#### For `Chunk_2`:
$$\text{BM25 Contribution} = \frac{0.40}{60 + 2} = \frac{0.40}{62} \approx 0.006452$$
$$\text{TF-IDF Contribution} = \frac{0.40}{60 + 1} = \frac{0.40}{61} \approx 0.006557$$
$$\text{Usage Contribution} = \frac{0.20}{60 + 3} = \frac{0.20}{63} \approx 0.003175$$

$$RRF(\text{Chunk}_2) = 0.006452 + 0.006557 + 0.003175 = \mathbf{0.016184}$$

---

### 4. Final Fused Output

1. **Rank 1**: `Chunk_2` ($RRF = 0.016184$) — Top TF-IDF match, 2nd BM25 match.
2. **Rank 2**: `Chunk_1` ($RRF = 0.016086$) — Top BM25 match, top Usage match.
3. **Rank 3**: `Chunk_3` ($RRF = 0.015982$) — Balanced across channels.
4. **Rank 4**: `Chunk_4` ($RRF = 0.015724$) — Low across channels.

---

## Role of Constant $k$

The constant $k$ (typically set to $60$) controls the penalty discrepancy between top-ranked items and lower-ranked items:
- If $k \to 0$, rank 1 receives an overwhelming advantage ($\frac{1}{1} = 1.0$ vs $\frac{1}{2} = 0.5$).
- If $k = 60$, the ratio between rank 1 and rank 2 is $\frac{61}{62} \approx 0.9838$, creating a smooth gradient that values consistency across multiple channels.

---

## Explainability JSON Schema

ContextRRF exposes complete mathematical derivations for every query result via `POST /api/query` and `GET /api/explain`:

```json
{
  "chunk_id": 350,
  "file_path": "demo_project/payment.py",
  "symbol_name": "CreditCardPayment.process_payment",
  "final_rank": 1,
  "rrf_score": 0.038415,
  "explanation_formula": "RRF(350) = 0.40/(60+1) + 0.40/(60+4) + 0.20/(60+1) + 0.60/(60+3) = 0.025610",
  "bm25": { "rank": 1, "score": 0.0, "contribution": 0.006557, "weight": 0.4 },
  "tfidf": { "rank": 4, "score": 16.15, "contribution": 0.006250, "weight": 0.4 },
  "usage": { "rank": 1, "score": 1.0, "contribution": 0.003279, "weight": 0.2 },
  "symbol": { "rank": 3, "score": 0.8, "contribution": 0.009524, "weight": 0.6 }
}
```
