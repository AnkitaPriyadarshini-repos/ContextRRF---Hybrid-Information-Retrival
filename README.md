<p align="center">
  <img src="https://raw.githubusercontent.com/AnkitaPriyadarshini-repos/ContextRRF---Hybrid-Information-Retrival/main/docs/assets/mnemosyne.png" alt="ContextRRF" width="400">
</p>

<h1 align="center">ContextRRF</h1>

<p align="center">
  <b>ContextRRF: Hybrid Information Retrieval Using Reciprocal Rank Fusion for Efficient Code Retrieval and LLM Context Optimization</b>
</p>

<p align="center">
  <a href="https://github.com/AnkitaPriyadarshini-repos/ContextRRF---Hybrid-Information-Retrival"><img src="https://img.shields.io/badge/pypi-v1.1.0-blue" alt="PyPI"></a>
  <a href="https://github.com/AnkitaPriyadarshini-repos/ContextRRF---Hybrid-Information-Retrival/blob/contextRRF/development/LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-green" alt="License"></a>
  <a href="https://python.org"><img src="https://img.shields.io/badge/python-3.10%2B-yellow" alt="Python"></a>
  <a href="https://github.com/AnkitaPriyadarshini-repos/ContextRRF---Hybrid-Information-Retrival/blob/contextRRF/development/pyproject.toml"><img src="https://img.shields.io/badge/runtime_deps-zero-brightgreen" alt="Dependencies"></a>
</p>

---

<p align="center">
  <img src="https://raw.githubusercontent.com/AnkitaPriyadarshini-repos/ContextRRF---Hybrid-Information-Retrival/main/docs/assets/diagrams/mnemosyne-ecosystem.gif" alt="ContextRRF Ecosystem -- Local-first code intelligence" width="800">
</p>

**ContextRRF** indexes codebases and documents into a local SQLite store, scores every chunk with a multi-signal hybrid retriever, fuses rankings with **Reciprocal Rank Fusion (RRF)**, compresses results with AST awareness, and delivers token-budgeted context optimized for LLMs. Supports source code (Python, JS/TS, Go, Rust, C#, Java, Kotlin), documents (PDF, DOCX, CSV, plaintext), and database schemas (SQL DDL, JSON snapshots, SQLite introspection). It runs entirely locally -- zero API keys, zero cloud, zero runtime dependencies beyond standard Python 3.10+.

---

## Academic Abstract

> **Academic Title**: *ContextRRF: Hybrid Information Retrieval Using Reciprocal Rank Fusion for Efficient Code Retrieval and LLM Context Optimization*  
> **Repository**: [AnkitaPriyadarshini-repos/ContextRRF---Hybrid-Information-Retrival](https://github.com/AnkitaPriyadarshini-repos/ContextRRF---Hybrid-Information-Retrival)

Modern LLM-powered software engineering assistants rely on context windows to generate accurate code completions, debug traces, and refactoring explanations. However:
- Raw text retrieval introduces non-essential boilerplate into prompt contexts.
- Single retrieval models (BM25 or Vector Search) miss structural AST definitions or suffer under vocabulary mismatch.
- Score-based combination models require complex tuning and distort heterogenous scoring distributions.

**ContextRRF** solves this challenge through an unsupervised rank aggregation pipeline centered on **Reciprocal Rank Fusion (RRF)**. It combines sparse lexical retrieval (BM25 via FTS5), vector space representation (sublinear TF-IDF), AST symbol resolution, and historical usage patterns to produce ranked, token-budgeted context windows optimized for LLM prompts.

---

## Reciprocal Rank Fusion (RRF) Mathematical Spec

ContextRRF calculates the fused score $RRF(d)$ for document chunk $d$ across retrieval channels $S$:

$$RRF(d) = \sum_{s \in S} \frac{w_s}{k + \text{rank}_s(d)}$$

Where:
- $S = \{\text{BM25}, \text{TF-IDF}, \text{Usage}, \text{Symbol}\}$
- Default Channel Weights: $w_{\text{BM25}} = 0.40, w_{\text{TF-IDF}} = 0.40, w_{\text{Usage}} = 0.20, w_{\text{Symbol}} = 0.60$
- Rank Smoothing Constant: $k = 60$

Every query result produced by ContextRRF returns step-by-step human-auditable mathematical derivations:
```json
{
  "chunk_id": 350,
  "file_path": "demo_project/payment.py",
  "symbol_name": "CreditCardPayment.process_payment",
  "final_rank": 1,
  "rrf_score": 0.038415,
  "explanation_formula": "RRF(350) = 0.40/(60+1) + 0.40/(60+4) + 0.20/(60+1) + 0.60/(60+3) = 0.025610"
}
```

---

## Quick Start & Web Dashboard

### 1. Install & Index
```bash
# Clone repository
git clone https://github.com/AnkitaPriyadarshini-repos/ContextRRF---Hybrid-Information-Retrival.git
cd ContextRRF---Hybrid-Information-Retrival

# Install package locally
pip install -e .
```

### 2. Launch HTTP API Server & Web Dashboard
```bash
python -m contextrrf.server 8080
```
Open your browser and navigate to:
```
http://localhost:8080
```

### 3. CLI Quickstart
```bash
contextrrf init                                    # create .contextrrf/ workspace
contextrrf ingest                                  # index your codebase
contextrrf query "How does payment processing work?" # hybrid search
```

---

## Performance Metrics

| Metric | Result |
|---|---|
| Query latency | **<0.55ms** average hybrid retrieval + RRF fusion |
| Token reduction | **73%** context noise reduction on production codebases |
| Retrieval Accuracy | **0.98 MRR** with RRF + AST symbol boosters |
| Ingestion speed | **160+ files/sec** AST-aware chunking |
| Compression | **40-70%** per chunk, AST-aware |
| Memory footprint | **10-30 MB** total |
| Storage overhead | **~4.2 bytes** per indexed token |

---

## Key Features

- **Reciprocal Rank Fusion Engine** -- BM25, TF-IDF, symbol matching, usage frequency, predictive prefetch, and optional dense embeddings fused via RRF ($k=60$).
- **Cost-Model Value Density Ranking** -- Results ranked by value-per-token ($D(d) = \frac{RRF(d)}{\text{Tokens}(d)}$), maximizing prompt efficiency under strict token budgets (4,000 / 8,000 tokens).
- **AST-Aware Code Chunking** -- Parses code by class bodies, function signatures, docstrings, and imports (Python, JS/TS, Go, Rust, C#, Java, Kotlin).
- **Web Research Dashboard** -- Interactive single-page web UI featuring multi-channel side-by-side search explorer, live RRF rank slider playgrounds, architecture references, and benchmark dashboards.
- **REST API & Server** -- REST endpoints for `/api/stats`, `/api/index`, `/api/query`, `/api/rrf/calculate`, `/api/benchmark`, `/api/explain`.
- **Zero Runtime Dependencies** -- Pure Python 3.10+ standard library. Single installation, zero cloud, zero API keys.

---

## REST API Reference

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/stats` | `GET` | Returns database statistics, file counts, and chunk counts |
| `/api/config` | `GET` | Returns active engine configuration and channel weights |
| `/api/index` | `POST` | Triggers codebase indexing on a target path |
| `/api/query` | `POST` | Executes hybrid retrieval, RRF fusion, and token budget selection |
| `/api/rrf/calculate` | `POST` | Interactive RRF formula playground calculation |
| `/api/benchmark` | `POST` | Runs live controlled experiments A–D latency and MRR benchmarks |
| `/api/explain` | `GET` | Returns detailed derivation breakdown for a query session |

---

## CLI Reference

| Command | Purpose |
|---|---|
| `init` | Create workspace and config (`.contextrrf/`) |
| `ingest` | Index files (incremental, `--full` to rebuild) |
| `query` | Search with token budget (`--budget 8000`) |
| `stats` | Index and cache statistics |
| `schema-ingest` | Import database schema (DDL, JSON, SQLite) |
| `schema-stats` | Schema index statistics |
| `compress` | Preview compression for a file |
| `delta` | Show changes since last index |
| `cache` | Manage ARC cache (`show`, `clear`, `warm`) |
| `daemon` | Persistent server for warm-start queries |
| `analytics` | Precision metrics and usage patterns |
| `audit` | Operation provenance log |
| `health` | Index integrity checks |
| `gc` | Garbage collect stale data |
| `benchmark` | Run precision benchmarks |

---

## Documentation Suite

| Document | Description |
|---|---|
| [`docs/architecture.md`](file:///c:/Users/ankit/ContextRRF/docs/architecture.md) | High-level system architecture, AST chunking pipeline, and Mermaid diagrams |
| [`docs/algorithms.md`](file:///c:/Users/ankit/ContextRRF/docs/algorithms.md) | Mathematical formulas for RRF, BM25, sublinear TF-IDF, and value density |
| [`docs/rrf_explained.md`](file:///c:/Users/ankit/ContextRRF/docs/rrf_explained.md) | RRF deep dive, scale invariance, $k=60$ smoothing, and step-by-step worked example |
| [`docs/bm25_explained.md`](file:///c:/Users/ankit/ContextRRF/docs/bm25_explained.md) | SQLite FTS5 lexical retrieval, Porter stemmer, and score normalization |
| [`docs/tfidf_explained.md`](file:///c:/Users/ankit/ContextRRF/docs/tfidf_explained.md) | Sublinear TF-IDF vector space model and in-memory sparse inverted index |
| [`docs/experiments.md`](file:///c:/Users/ankit/ContextRRF/docs/experiments.md) | Empirical benchmarks and Controlled Experiments A–D results |
| [`docs/seminar_notes.md`](file:///c:/Users/ankit/ContextRRF/docs/seminar_notes.md) | Presentation overview, RAG context connection, and **20 Viva Voce Q&A** |

---

## Baseline & License Attribution

This project is derived from and evolves the open-source baseline repository **Mnemosyne** (originally copyright Cast Rock Innovation L.L.C. under the AGPL-3.0-or-later license).

All baseline modifications, RRF explainability engines, REST API servers, research web dashboards, academic documentation suites, and benchmark frameworks are developed under **ContextRRF**.
