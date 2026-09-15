# ContextRRF: Hybrid Information Retrieval Using Reciprocal Rank Fusion

> **Academic Title**: *ContextRRF: Hybrid Information Retrieval Using Reciprocal Rank Fusion for Efficient Code Retrieval and LLM Context Optimization*
>
> **Project Repository**: [AnkitaPriyadarshini-repos/ContextRRF---Hybrid-Information-Retrival](https://github.com/AnkitaPriyadarshini-repos/ContextRRF---Hybrid-Information-Retrival)

---

## Abstract & Overview

**ContextRRF** is a zero-dependency, open-source hybrid information retrieval engine engineered specifically for codebase search and Large Language Model (LLM) context window optimization.

Modern AI coding assistants often struggle with prompt clutter, missing AST context, or inconsistent search rankings when querying large codebases. ContextRRF solves this by combining sparse lexical retrieval (BM25 via FTS5), vector space search (sublinear TF-IDF), AST symbol resolution, and historical usage patterns into a unified ranking framework using **Reciprocal Rank Fusion (RRF)**.

### Key Features
- **Reciprocal Rank Fusion Engine**: Fuses multiple retrieval channels without score normalization distortion ($RRF(d) = \sum \frac{w_s}{k + \text{rank}_s(d)}$).
- **Zero Heavy Dependencies**: Built using standard Python library modules and SQLite (`sqlite3`, `ast`, `http.server`).
- **AST-Aware Code Chunking**: Intelligently chunks Python code by class definitions, function signatures, imports, and top-level blocks.
- **Value Density Cost Model**: Re-ranks candidate chunks by relevance per token ($D(d) = \frac{RRF(d)}{\text{Tokens}(d)}$) to maximize prompt efficiency within strict token budgets.
- **Explainability Engine**: Provides step-by-step mathematical derivations and JSON breakdowns for every retrieved result.
- **Web Research Dashboard**: Premium single-page web UI featuring live multi-channel comparisons, interactive RRF formula playgrounds, architecture diagrams, and benchmark suites.

---

## Reciprocal Rank Fusion (RRF) Mathematical Formula

ContextRRF calculates the fused score $RRF(d)$ for document chunk $d$ across retrieval channels $S$:

$$RRF(d) = \sum_{s \in S} \frac{w_s}{k + \text{rank}_s(d)}$$

Where:
- $S = \{\text{BM25}, \text{TF-IDF}, \text{Usage}, \text{Symbol}\}$
- Default Weights: $w_{\text{BM25}} = 0.40, w_{\text{TF-IDF}} = 0.40, w_{\text{Usage}} = 0.20, w_{\text{Symbol}} = 0.60$
- Rank Smoothing Constant: $k = 60$

---

## Quickstart & Local Execution

### Prerequisites
- Python 3.10+
- Modern Web Browser (Chrome, Edge, Firefox, Safari)

### 1. Clone & Setup
```bash
git clone https://github.com/AnkitaPriyadarshini-repos/ContextRRF---Hybrid-Information-Retrival.git
cd ContextRRF---Hybrid-Information-Retrival
```

### 2. Start ContextRRF Server & Web Dashboard
```bash
python -m contextrrf.server 8080
```
Open your browser and navigate to:
```
http://localhost:8080
```

---

## REST API Reference

### 1. `GET /api/stats`
Returns system statistics including files indexed, chunk count, and database size.

### 2. `POST /api/index`
Triggers codebase indexing on a target directory.
```json
{
  "path": "demo_project"
}
```

### 3. `POST /api/query`
Executes hybrid retrieval with RRF fusion, token budget selection, and step-by-step formula derivation.
```json
{
  "query": "credit card payment refund",
  "token_budget": 4000,
  "weights": { "bm25": 0.4, "tfidf": 0.4, "usage": 0.2 },
  "k": 60
}
```

### 4. `POST /api/rrf/calculate`
Interactive endpoint for calculating rank fusion over custom document ranks.

### 5. `POST /api/benchmark`
Runs live controlled experiments (Exp A–D) and returns latency (ms) and Mean Reciprocal Rank (MRR) metrics.

---

## Project Structure

```
ContextRRF/
├── demo_project/          # Sample Python codebase (payment, auth, db, cache)
├── docs/                  # Academic Documentation Suite
│   ├── architecture.md    # Pipeline architecture & Mermaid diagrams
│   ├── algorithms.md      # Formulas (RRF, BM25, TF-IDF, Density)
│   ├── rrf_explained.md   # Deep dive & worked numerical example
│   ├── bm25_explained.md  # SQLite FTS5 lexical retrieval
│   ├── tfidf_explained.md # Sublinear TF-IDF vector space model
│   ├── experiments.md    # Controlled experiments A-D results
│   └── seminar_notes.md  # Presentation overview & 20 Viva Voce Q&A
├── contextrrf/             # Core Python Engine
│   ├── server.py          # HTTP API & Static Web Server
│   ├── ranking.py         # RRF Fusion & Explanation Engine
│   ├── retrieval.py       # Multi-Channel Retrieval Engine
│   ├── ingest.py          # AST Chunker & Hash Deduplication
│   └── store.py           # SQLite Persistence Layer
└── web/                   # Web Research Dashboard (HTML5/CSS3/JS)
    ├── index.html         # Dashboard HTML structure
    ├── style.css          # Glassmorphism dark mode styling
    └── app.js             # Interactive UI logic & state management
```

---

## Baseline & License Attribution

This project is derived from and builds upon the open-source baseline repository **ContextRRF** (originally copyright Cast Rock Innovation L.L.C. under the AGPL-3.0-or-later license).

All baseline modifications, RRF explainability engines, HTTP API servers, research web dashboards, academic documentation suites, and benchmark frameworks are developed under **ContextRRF**.
