# ContextRRF Baseline Report

## Repository
- **Upstream URL**: [https://github.com/AnkitaPriyadarshini-repos/ContextRRF---Hybrid-Information-Retrival](https://github.com/AnkitaPriyadarshini-repos/ContextRRF---Hybrid-Information-Retrival)
- **Git Branch**: `baseline/contextrrf-original`
- **Target Evolution**: `ContextRRF`

---

## Objective
Establish a clean, local working baseline of the open-source ContextRRF repository without altering core algorithmic behavior, adding personal memory/chatbots/person detection, or redesigning the architecture. Verify indexing, search retrieval, Reciprocal Rank Fusion (RRF), token budget selection, and test suite execution.

---

## Environment
- **Operating System**: Windows 11 Home (x86_64)
- **Python Version**: Python 3.13.1 (in isolated `.venv`)
- **Virtual Environment**: `.venv` created via `py -3.13 -m venv .venv`
- **Package Manager**: standard `pip` (`pip install -e . -r docs/guides/requirements-dev.txt`)

---

## Installation
- Successfully installed package `contextrrf-engine` (v1.1.0) in editable mode.
- Installed development dependencies (`pytest==8.3.4`, `pytest-asyncio==0.25.2`).
- Installed zero runtime third-party dependencies by default (stdlib only).

---

## Architecture
ContextRRF is a zero-dependency, sub-100ms LLM context compression and code/document retrieval engine.
- **Storage**: Local SQLite database (`.contextrrf/contextrrf.db`) with FTS5 virtual table for full-text BM25 scoring.
- **Chunking**: Language-aware AST/regex code chunkers (Python, JS/TS, Go, Rust, Java, C#, SQL/DDL) and document splitters (Markdown, PDF, CSV, DOCX).
- **Retrieval Pipeline**: Hybrid retrieval merging BM25, TF-IDF, Symbol Matching, and optional Dense Vector embeddings via Reciprocal Rank Fusion (RRF).

---

## Indexing Pipeline
1. Traverses project directory while honoring `.gitignore` and file size limits (`ingest.py`).
2. Computes BLAKE3/SHA-256 hashes to track file deltas (`delta.py`).
3. Passes files to language chunkers (`contextrrf/chunkers/`).
4. Extracts function/class symbol names (`symbols` table).
5. Writes chunks to SQLite database and populates SQLite FTS5 index (`store.py`).

---

## Retrieval Pipeline
```
Query -> BM25 + TF-IDF + Symbol Matching + Dense (Optional)
      -> Reciprocal Rank Fusion (RRF)
      -> Post-Fusion Boosts (Filename match, Symbol boost, Boilerplate penalty)
      -> Value Density Ranking (Relevance / log1p(Tokens))
      -> Prefetching Neighbor Chunks
      -> Greedy Token Budget Selection & Compression (budget_cut)
```

---

## BM25
- Powered by SQLite FTS5 (`fts_chunks`).
- Evaluates BM25 text match relevance scores over chunk content and symbol signatures.

---

## TF-IDF
- In-memory TF-IDF vector space model (`contextrrf/embeddings/tfidf_backend.py`).
- Uses sub-linear term frequency scaling ($1 + \ln(\text{tf})$) and inverse document frequency ($\ln(1 + N/df)$) with cosine similarity.

---

## RRF (Reciprocal Rank Fusion)
Implemented in [`contextrrf/ranking.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/ranking.py):

$$RRF(d) = \sum_{s \in S} \frac{w_s}{k + \text{rank}_s(d)}$$

- Default smoothing constant $k = 60$.
- Missing candidates in a channel receive penalty rank $|L_s| + 1$.
- Detailed analysis documented in [`docs/experiments/current_rrf_behavior.md`](file:///c:/Users/ankit/ContextRRF/docs/experiments/current_rrf_behavior.md).

---

## Post-Fusion Ranking
- Filename Boost: `1.5x` multiplier for exact file/path token matches.
- Structured Code Boost: `2.0x` multiplier for named functions/classes.
- Boilerplate Penalty: `(1.0 - 0.5 * boilerplate_ratio)` reduction.
- Value Density: Computed as $\text{relevance} / (1 + \ln(1 + \text{tokens}))$.

---

## Token Budget
- Greedy selection (`budget_cut` in `ranking.py`).
- Selects top value-density candidates until the user-specified token budget (default 8,000) is reached.

---

## Compression
- AST/line-based compression (`contextrrf/compress.py`).
- Condenses imports, removes docstrings/comments, and thins non-essential lines while preserving function signatures and symbols.

---

## Cache
- Adaptive Replacement Cache (ARC) / LRU query cache (`contextrrf/cache.py`).
- Provides sub-millisecond retrieval responses for repeat or overlapping queries.

---

## Bloom Filter
- In-memory probabilistic Bloom filter (`contextrrf/bloom.py`).
- Enables instant filtering of non-existent query terms before hitting SQLite.

---

## CLI
- Executable via `contextrrf` or `python -m contextrrf`.
- Subcommands verified: `init`, `ingest`, `query`, `stats`, `compress`, `cache`, `delta`, `audit`, `analytics`, `gc`, `health`.

---

## Test Results
- **Total Tests Collected**: 446
- **Passed**: 429
- **Skipped**: 17 (16 Unix domain socket daemon tests on Windows, 1 Windows symlink privilege test)
- **Failed**: 0
- **Execution Time**: 33.78 seconds

---

## Demo Queries & Observed Results
Tested against synthetic `demo_project/` (6 files: `auth.py`, `database.py`, `users.py`, `api.py`, `cache.py`, `config.py`):

| Query | Top Result Chunk | Score | Token Count | Status |
|---|---|---|---|---|
| `"How does authentication work?"` | `auth.py` (`authenticate_user`, lines 39-44) | 0.016 | 162 | PASSED |
| `"Where is the database connection created?"` | `database.py` (`connect`, lines 19-22) | 0.039 | 625 | PASSED |
| `"How is caching implemented?"` | `cache.py` (`clear`, lines 39-41) | 0.015 | 412 | PASSED |
| `"Where are API routes defined?"` | `api.py` (`health_check_handler`, lines 54-56) | 0.026 | 370 | PASSED |
| `"How are users authenticated?"` | `users.py` (`__init__`, lines 13-14) | 0.021 | 516 | PASSED |

---

## Known Limitations
1. **Unix Sockets on Windows**: The JSON-RPC background daemon uses `AF_UNIX`, which is not natively supported by Windows socket APIs without WSL/Named Pipes.
2. **Symlinks on Windows**: Symlink security containment check requires elevated Windows developer permissions to create symlinks during testing.

---

## Compatibility Fixes Made
1. **`contextrrf/store.py`**: Added safe fallback for `fcntl` import and `fcntl.flock` on Windows platforms.
2. **`contextrrf/tests/test_daemon.py`**: Added `@unittest.skipUnless(hasattr(socket, "AF_UNIX"), ...)` to prevent socket failures on Windows.
3. **`contextrrf/tests/test_ingest_paths.py`**: Added graceful skip for Windows privilege restrictions on symlink creation.
