# BM25 Lexical Retrieval in ContextRRF

## Overview
BM25 (Best Matching 25) is a probabilistic information retrieval algorithm that evaluates document relevance based on term occurrences. In **ContextRRF**, BM25 serves as the primary sparse lexical channel, leveraging SQLite's native FTS5 extension.

---

## Technical Mechanism & FTS5 Schema

### FTS5 Virtual Table Schema
ContextRRF creates an SQLite FTS5 table `fts_chunks` mapping chunk content and symbol names:

```sql
CREATE VIRTUAL TABLE fts_chunks USING fts5(
    chunk_id UNINDEXED,
    symbol_name,
    content,
    tokenize='porter unicode61'
);
```

### Key Components
1. **Porter Stemming**: Reduces terms to their root forms (e.g. `payments`, `paying`, `payable` -> `pay`).
2. **Unicode61 Tokenizer**: Handles programming identifiers containing underscores and camelCase boundaries.
3. **FTS5 `bm25()` Function**: SQLite FTS5 computes raw negative scores where more negative values indicate stronger term match density.

---

## Score Normalization in ContextRRF

Because raw FTS5 BM25 scores are negative values, ContextRRF transforms them into positive, normalized $[0, 1]$ values prior to ranking:

```python
# Convert negative FTS5 scores to positive values
positive_scores = [abs(score) for cid, score in fTS_results]
max_score = max(positive_scores) if positive_scores else 1.0

# Normalize to [0, 1] relative to top result
bm25_normalized = [(cid, score / max_score) for cid, score in zip(chunk_ids, positive_scores)]
```

---

## Strengths & Limitations in Code Retrieval

| Feature | Performance in Code Retrieval |
| :--- | :--- |
| **Exact Identifiers** | High precision when exact function names or variables are queried. |
| **Vocabulary Mismatch** | Fails when query uses synonyms not present in source code (e.g. "auth" vs "login"). |
| **Code Structure** | Treats code as flat text without native understanding of class inheritance. |
