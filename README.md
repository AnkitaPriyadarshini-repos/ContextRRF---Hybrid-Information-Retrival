<p align="center">
  <img src="docs/assets/contextrrf-hero.png" alt="ContextRRF" width="400">
</p>

<h1 align="center">ContextRRF</h1>

<p align="center">
  Hybrid Information Retrieval Using Reciprocal Rank Fusion for Efficient Code Retrieval and LLM Context Optimization
</p>

<p align="center">
  <a href="https://github.com/AnkitaPriyadarshini-repos/ContextRRF---Hybrid-Information-Retrival"><img src="https://img.shields.io/badge/pypi-v1.1.0-blue" alt="PyPI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-green" alt="License"></a>
  <a href="https://python.org"><img src="https://img.shields.io/badge/python-3.11%2B-yellow" alt="Python"></a>
  <a href="pyproject.toml"><img src="https://img.shields.io/badge/runtime_deps-zero-brightgreen" alt="Dependencies"></a>
</p>

---

<p align="center">
  <img src="docs/assets/contextrrf-ecosystem.png" alt="ContextRRF Ecosystem -- three packages, zero cloud" width="800">
</p>

ContextRRF indexes your codebase and documents into a local SQLite store, scores every chunk with a 6-signal hybrid retriever, compresses results with AST awareness, and returns exactly what you need within a token or result budget. Supports source code (Python, JS/TS, Go, Rust, C#, Java, Kotlin), documents (PDF, DOCX, CSV, plaintext), and database schemas (SQL DDL, JSON snapshots, SQLite introspection). It runs entirely locally -- no API keys, no cloud, no runtime dependencies beyond Python 3.11+.

## Install

```bash
pip install contextrrf-engine
```

## Quick Start

```bash
contextrrf init                                    # create .contextrrf/ workspace
contextrrf ingest                                  # index your codebase
contextrrf query "How does authentication work?"   # search
```

## Performance

| Metric | Result |
|---|---|
| Query latency | **<20ms** warm, <500ms cold |
| Token reduction | **73%** on 829-file production repo |
| File retrieval accuracy | **100%** across all test sets |
| Ingestion speed | **167 files/sec** (~0.5s for 87 files) |
| Compression | **40-70%** per chunk, AST-aware |
| Memory footprint | **10-30 MB** total |
| Storage overhead | **~4.2 bytes** per indexed token |

## Features

- **Hybrid 6-signal search** -- BM25, TF-IDF, symbol matching, usage frequency, predictive prefetch, and optional dense embeddings fused via Reciprocal Rank Fusion
- **Cost-model ranking** -- results ranked by value-per-token, not just relevance. Like a query optimizer for code retrieval
- **AST-aware compression** -- four-stage pipeline preserves signatures, docstrings, and control flow while collapsing boilerplate (20-60% reduction)
- **Self-tuning ARC cache** -- adapts between recency and frequency patterns automatically, persisted across sessions
- **Delta-aware tracking** -- detects file and chunk-level changes, delivers diffs instead of full content (80-95% savings on incremental queries)
- **Content deduplication** -- SHA-256 addressed storage eliminates duplicate chunks across files
- **7-language structural chunking** -- Python (AST), JavaScript/TypeScript, Go, C#, Rust, Java, Kotlin
- **Document ingestion** -- PDF, DOCX, CSV, and plaintext extraction into an isolated document partition with independent BM25 + TF-IDF retrieval. Optional `contextrrf-engine[pdf]` extra for PDF support
- **Schema ingestion** -- DDL files, JSON/YAML snapshots, and live SQLite introspection indexed alongside code for cross-domain queries
- **Daemon mode** -- JSON-RPC over Unix socket keeps indexes warm for sub-20ms queries
- **Full audit trail** -- append-only JSON-lines log of every operation
- **Zero runtime dependencies** -- pure Python 3.11+ stdlib. One `pip install`, no conflicts

## Use Cases

**Code search and navigation** -- Natural language queries return ranked, deduplicated results with function-level precision. Symbol-aware search finds implementations directly, not just string matches.

**LLM context optimization** -- Feed Claude, GPT, Cursor, or any LLM agent the right tokens from a 100K+ codebase. Drop-in integration via instruction files cuts API spend 70%+ on context-heavy workflows.

**Developer onboarding** -- New team members query "how does X work?" and get ranked results spanning models, middleware, and routes -- complete function signatures with context, not random line hits.

**PR review and CI/CD** -- Delta tracking identifies which functions changed and pulls their callers and tests into a review bundle. Pipe query output into automated review pipelines.

**Legacy codebase archaeology** -- Before a rewrite or migration, index a large monolith to answer "what calls this table?" or "which modules depend on this API?" Hybrid search beats grep for cross-cutting queries.

## System Architecture

<p align="center">
  <img src="docs/assets/contextrrf-architecture.png" alt="ContextRRF Architecture" width="800">
</p>

ContextRRF processes code bases through a clean, multi-stage pipeline:

1. **Ingestion & Hash Delta Tracking:** Scans files while honoring `.gitignore` rules and computing file content hashes.
2. **Structural AST Chunking:** Segments code into logical boundaries (functions, classes, interfaces, doc sections) rather than fixed token windows.
3. **FTS5 & Inverted Index Persistence:** Stores chunk text in SQLite with FTS5 BM25 indexing and builds an in-memory TF-IDF inverted index.
4. **Dual Channel Retrieval:** Runs parallel candidate queries over FTS5 BM25 and sublinear TF-IDF vector channels.
5. **Reciprocal Rank Fusion:** Fuses candidate lists using weighted RRF with smoothing constant $k=60$.
6. **Post-Fusion Boosting:** Applies symbol match multipliers (`2.0x`) and boilerplate penalties (`1.0 - 0.5 * ratio`).
7. **Value Density Allocation:** Ranks chunks by $\text{Relevance} / \ln(1 + \text{Tokens})$ and fills the prompt window up to the specified token ceiling.

## Reciprocal Rank Fusion (RRF)

Reciprocal Rank Fusion merges document ranks across independent retrieval channels without requiring raw score scaling:

$$RRF(d) = \sum_{s \in S} \frac{w_s}{k + \text{rank}_s(d)}$$

Where $d$ is the candidate chunk, $s \in S$ is the active retrieval channel ($\{\text{BM25}, \text{TF-IDF}, \text{Symbol}, \text{Usage}\}$), $\text{rank}_s(d)$ is the 1-indexed rank of candidate $d$ in channel $s$, $w_s$ is channel weight (default $0.40$), and $k=60$ is the rank smoothing constant.

## Worked RRF Example

Consider a query targeting authentication middleware:

```
Query: "authentication middleware"
Token Budget: 1,000 tokens
```

### Channel Ranks

| Rank | BM25 Channel | TF-IDF Channel |
|:---:|:---|:---|
| **#1** | `auth.py` (`authenticate_request`) | `middleware.py` (`AuthMiddleware`) |
| **#2** | `middleware.py` (`AuthMiddleware`) | `auth.py` (`authenticate_request`) |
| **#3** | `routes.py` (`register_routes`) | `login.py` (`login_handler`) |

### RRF Calculation ($k = 60, w_{\text{BM25}} = 0.40, w_{\text{TF-IDF}} = 0.40$)

* **`middleware.py`**:
  $$RRF = \frac{0.40}{60 + 2} + \frac{0.40}{60 + 1} = 0.006451 + 0.006557 = \mathbf{0.013008}$$

* **`auth.py`**:
  $$RRF = \frac{0.40}{60 + 1} + \frac{0.40}{60 + 2} = 0.006557 + 0.006451 = \mathbf{0.013008}$$

## Interactive Dashboard

Launch the embedded web interface to explore retrieval results, analyze rank contributions, and test RRF parameter variations interactively:

```bash
python -m contextrrf.cli serve --port 8000
```

Open your browser to `http://localhost:8000` to access the Search Explorer, live RRF Playground, System Architecture viewer, and Benchmark UI.

## Documentation Index

| Document | Description | Path |
|:---|:---|:---|
| **Algorithm Reference** | Deep dive into RRF formulas, BM25 FTS5 parameters & TF-IDF vectors | [`ALGORITHMS.md`](ALGORITHMS.md) |
| **Baseline Report** | Initial repository verification, system limits & baseline metrics | [`BASELINE_REPORT.md`](BASELINE_REPORT.md) |
| **System Architecture** | Full technical architecture specifications & data flows | [`docs/architecture/architecture.md`](docs/architecture/architecture.md) |
| **Algorithmic Specifications** | Mathematical formulas, bounds & density functions | [`docs/algorithms/algorithms.md`](docs/algorithms/algorithms.md) |
| **Experimental Suite** | Query benchmarks, experimental results & seminar notes | [`docs/experiments/experiments.md`](docs/experiments/experiments.md) |
| **Tuning Guide** | Parameter optimization for chunk size, RRF $k$, and weights | [`docs/guides/TUNING.md`](docs/guides/TUNING.md) |
| **MCP Server Integration** | Model Context Protocol integration docs | [`docs/reference/MCP.md`](docs/reference/MCP.md) |
| **Contributing Guide** | Local development environment & pull request guidelines | [`docs/guides/CONTRIBUTING.md`](docs/guides/CONTRIBUTING.md) |

## License

ContextRRF is released under the [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE).
