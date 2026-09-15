# Architecture Inventory — ContextRRF (v1.1.0 Baseline)

This document provides a comprehensive inventory of all major subsystems, entry points, data pipelines, ranking mechanisms, storage layers, and integrations in ContextRRF, mapped directly to their actual source files.

---

## Component Mapping Table

| No. | Subsystem / Feature | Primary Source File(s) | Description |
|---|---|---|---|
| 1 | **Entry Points** | [`pyproject.toml`](file:///c:/Users/ankit/ContextRRF/pyproject.toml)<br>[`contextrrf/__main__.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/__main__.py)<br>[`contextrrf/__init__.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/__init__.py) | Defines `contextrrf = contextrrf.cli:main` executable entry point and module initializers. |
| 2 | **CLI Interface** | [`contextrrf/cli.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/cli.py) | Full command-line parser (`argparse`) supporting `init`, `ingest`, `query`, `stats`, `daemon`, `purge`, `audit`, etc. |
| 3 | **Indexing Pipeline** | [`contextrrf/ingest.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/ingest.py)<br>[`contextrrf/schema_ingest.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/schema_ingest.py) | Scans workspace, calculates content hashes, orchestrates language-specific chunking, extracts symbols, updates SQLite FTS5 index. |
| 4 | **File Discovery** | [`contextrrf/ingest.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/ingest.py) | File crawler handling recursive traversal, `.gitignore` / ignore pattern evaluation, file size limits, and binary file filtering. |
| 5 | **Code Chunking** | [`contextrrf/chunkers/code_chunker.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/chunkers/code_chunker.py)<br>[`contextrrf/chunkers/brace_chunker.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/chunkers/brace_chunker.py)<br>[`contextrrf/chunkers/js_chunker.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/chunkers/js_chunker.py)<br>[`contextrrf/chunkers/py_chunker` / generic] | Structure-aware AST/regex code chunkers for Python, JavaScript/TypeScript, Go, Rust, C#, Java, and brace-delimited languages. |
| 6 | **Document Chunking** | [`contextrrf/chunkers/document_chunker.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/chunkers/document_chunker.py)<br>[`contextrrf/chunkers/text_chunker.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/chunkers/text_chunker.py)<br>[`contextrrf/extractors/`](file:///c:/Users/ankit/ContextRRF/contextrrf/extractors) | Section and paragraph-based splitters for Markdown, plain text, PDF, CSV, and DOCX files. |
| 7 | **SQLite Storage & Schema** | [`contextrrf/store.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/store.py)<br>[`contextrrf/schema.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/schema.py)<br>[`contextrrf/doc_store.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/doc_store.py) | Manages relational tables (`files`, `chunks`, `symbols`, `access_log`) and SQLite `fts5` virtual table for full-text search. |
| 8 | **BM25 Retrieval** | [`contextrrf/retrieval.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/retrieval.py) | Queries SQLite FTS5 index using BM25 scoring algorithm over chunk content and symbol signatures. |
| 9 | **TF-IDF Retrieval** | [`contextrrf/embeddings/tfidf_backend.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/embeddings/tfidf_backend.py) | In-memory TF-IDF indexer with custom sub-linear term weighting and cosine similarity vector scoring. |
| 10 | **Optional Dense Retrieval** | [`contextrrf/embeddings/dense_backend.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/embeddings/dense_backend.py) | ONNX Runtime based embedding model integration (e.g. MiniLM-L6-v2) for vector search when `[dense]` is installed. |
| 11 | **Symbol Retrieval** | [`contextrrf/retrieval.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/retrieval.py)<br>[`contextrrf/store.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/store.py) | Matches query identifiers against extracted function names, class definitions, and variable signatures. |
| 12 | **Usage Signals** | [`contextrrf/retrieval.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/retrieval.py)<br>[`contextrrf/store.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/store.py) | Tracks access frequency and recency per chunk, applying recency boosts to frequently queried code paths. |
| 13 | **Prefetching** | [`contextrrf/prefetch.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/prefetch.py) | Analyzes imports and file dependencies to prefetch related neighbor chunks during retrieval. |
| 14 | **Reciprocal Rank Fusion (RRF)** | [`contextrrf/ranking.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/ranking.py)<br>[`contextrrf/retrieval.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/retrieval.py) | Merges ranked lists from BM25, TF-IDF, Symbol, and Dense channels into a single unified score list using $RRF(d) = \sum \frac{w_s}{k + r_s(d)}$. |
| 15 | **Post-Fusion Ranking** | [`contextrrf/ranking.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/ranking.py)<br>[`contextrrf/retrieval.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/retrieval.py) | Applies filename match boosts, symbol boosts, boilerplate penalties, and computes value density scores. |
| 16 | **Token-Budget Selection** | [`contextrrf/ranking.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/ranking.py) | Greedy selection algorithm (`budget_cut`) that fills token budget based on value density and falls back to chunk compression when needed. |
| 17 | **Compression** | [`contextrrf/compress.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/compress.py) | Content compressor stripping docstrings, comments, whitespace, and thinning non-essential lines while preserving code structure. |
| 18 | **Caching** | [`contextrrf/cache.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/cache.py) | Query result LRU cache store with TTL invalidation to return sub-millisecond cached search responses. |
| 19 | **Bloom Filter** | [`contextrrf/bloom.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/bloom.py) | In-memory probabilistic set filter for rapid non-existent query term filtering before executing full database lookups. |
| 20 | **Delta Tracking** | [`contextrrf/delta.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/delta.py) | Content hashing (BLAKE3/SHA256) and timestamp comparison to enable fast incremental re-ingestion of changed files. |
| 21 | **Analytics & Audit** | [`contextrrf/analytics.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/analytics.py)<br>[`contextrrf/audit.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/audit.py) | Aggregates database usage metrics, index sizes, query throughput, compression ratios, and integrity auditing. |
| 22 | **Daemon / JSON-RPC** | [`contextrrf/daemon.py`](file:///c:/Users/ankit/ContextRRF/contextrrf/daemon.py) | Background socket server exposing JSON-RPC API endpoints for low-latency external client integrations. |
| 23 | **MCP Integration** | [`mcp/src/contextrrf_mcp/server.py`](file:///c:/Users/ankit/ContextRRF/mcp/src/contextrrf_mcp/server.py) | Model Context Protocol (MCP) server integration bringing ContextRRF tools directly into Anthropic Claude / IDE hosts. |
| 24 | **Ollama Integration** | [`ollama/src/contextrrf_ollama/agent.py`](file:///c:/Users/ankit/ContextRRF/ollama/src/contextrrf_ollama) | Bridge CLI and agent integration for serving context to local Ollama LLMs. |
| 25 | **Test Suite** | [`contextrrf/tests/`](file:///c:/Users/ankit/ContextRRF/contextrrf/tests) | 24 pytest integration, benchmark, chunker, retrieval, and store unit test suites. |

---

## Detailed Pipeline Flow

```mermaid
flowchart TD
    A[Workspace Files] --> B[File Discovery & Delta Tracking]
    B --> C{File Type?}
    C -->|Code| D[Structure / Brace / Language Chunker]
    C -->|Document| E[Markdown / Text / PDF Extractor & Chunker]
    D --> F[SQLite Store & FTS5 Index]
    E --> F
    F --> G[Query Processing]
    G --> H1[BM25 Channel]
    G --> H2[TF-IDF Channel]
    G --> H3[Symbol Matcher]
    G --> H4[Optional Dense Vectors]
    H1 --> I[Reciprocal Rank Fusion - rrf_fuse]
    H2 --> I
    H3 --> I
    H4 --> I
    I --> J[Post-Fusion Ranking & Density Scoring]
    J --> K[Greedy Token Budget Selection & Compression]
    K --> L[Formatted Query Result]
```
