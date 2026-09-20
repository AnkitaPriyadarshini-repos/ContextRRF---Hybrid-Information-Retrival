# ContextRRF

## Hybrid Information Retrieval Using Reciprocal Rank Fusion
### For Efficient Code Retrieval and LLM Context Optimization

![ContextRRF Hero](docs/assets/contextrrf-hero.png)

ContextRRF is a zero-dependency, high-performance hybrid information retrieval engine engineered for codebases and technical documentation. By fusing lexical FTS5 BM25 search with sublinear TF-IDF vector space modeling through Reciprocal Rank Fusion (RRF), ContextRRF delivers explainable, high-relevance code chunks optimized for LLM prompt context budgets.

![Python](https://img.shields.io/badge/Python-3.11%2B-blue.svg)
![License](https://img.shields.io/badge/License-AGPL--3.0-green.svg)
![Retrieval](https://img.shields.io/badge/Retrieval-Hybrid%20RRF-orange.svg)
![Dependencies](https://img.shields.io/badge/Dependencies-Zero-success.svg)
![Test Suite](https://img.shields.io/badge/Tests-435%20Passed-brightgreen.svg)

---

## Why ContextRRF?

Modern software projects span thousands of files, complex module hierarchies, and millions of tokens. When supplying code context to Large Language Models (LLMs), traditional single-signal retrieval mechanisms suffer from critical failure modes:

* **Keyword Search (BM25):** Misses conceptual or semantic matches when exact identifiers differ.
* **Vector Search (TF-IDF/Dense):** Frequently retrieves irrelevant boilerplate code that shares abstract vocabulary but lacks specific symbol names.
* **Context Overfill:** Unfiltered search returns redundant, low-density code that inflates LLM API costs and degrades reasoning quality (*lost-in-the-middle* phenomenon).

**ContextRRF** solves these challenges by evaluating multiple independent retrieval channels, fusing ordinal candidate rankings using **Reciprocal Rank Fusion (RRF)**, and pruning retrieved context according to strict value-density token budget constraints.

---

## Core Idea

```
Codebase & Documents
        ↓
Structural & AST Chunking
        ↓
BM25 Lexical + TF-IDF Vector Channels
        ↓
Reciprocal Rank Fusion (RRF)
        ↓
Value Density Ranking (Relevance / Token Cost)
        ↓
Token Budget Selection (budget_cut)
        ↓
AST-Preserving Context Compression
        ↓
LLM-Ready Context
```

The core academic focus of ContextRRF is **Reciprocal Rank Fusion (RRF)**. RRF merges document ranks across disparate retrieval channels without requiring arbitrary score normalization or channel calibration:

$$RRF(d) = \sum_{s \in S} \frac{w_s}{k + \text{rank}_s(d)}$$

Where:
* $d$: Candidate code chunk or document section.
* $s \in S$: Active retrieval channel ($S = \{\text{BM25}, \text{TF-IDF}, \text{Symbol}, \text{Usage}\}$).
* $\text{rank}_s(d)$: 1-indexed ordinal rank of document $d$ within channel $s$.
* $w_s$: Weight assigned to retrieval channel $s$ (default $w_{\text{BM25}} = 0.40$, $w_{\text{TF-IDF}} = 0.40$).
* $k$: Smoothing constant preventing top-ranked candidates from dominating (default $k = 60$).

---

## Features

* **Hybrid Lexical & Vector Retrieval:** Combines SQLite FTS5 BM25 full-text matching with pure-Python sublinear TF-IDF sparse vector search.
* **Reciprocal Rank Fusion:** Scale-invariant rank aggregation mechanism ensuring robust consensus ranking across retrieval channels.
* **Explainable Channel Contributions:** Detailed score decomposition revealing exact BM25, TF-IDF, and symbol rank contributions for every retrieved result.
* **Code-Aware Structural Chunking:** Language-specific AST and regex chunkers for Python, JavaScript/TypeScript, Go, Rust, Java, C#, and SQL/DDL.
* **Document Ingestion:** Built-in splitters for Markdown, PDF, CSV, and DOCX files.
* **Token-Aware Context Selection (`budget_cut`):** Greedy value-density selection algorithm prioritizing high-relevance, low-token chunks within user-configured token budgets (e.g. 4,000 or 8,000 tokens).
* **AST-Preserving Context Compression:** Signature-retaining line compressor that strips boilerplate, docstrings, and non-essential implementations while preserving interface structures.
* **Zero Runtime Dependencies:** Written entirely in standard Python 3.11+ using built-in `sqlite3` FTS5 tables and math libraries.
* **Incremental Delta Indexing:** BLAKE3/SHA-256 hash tracking for instant index updates upon file modification.
* **Interactive Web Dashboard:** Modern dark-mode web application featuring search exploration, live RRF weight tuning, architecture visualization, and evaluation benchmarks.

---

## System Architecture

![ContextRRF Architecture](docs/assets/contextrrf-architecture.png)

ContextRRF processes code bases through a clean, multi-stage pipeline:

1. **Ingestion & Hash Delta Tracking:** Scans files while honoring `.gitignore` rules and computing file content hashes.
2. **Structural AST Chunking:** Segments code into logical boundaries (functions, classes, interfaces, doc sections) rather than fixed token windows.
3. **FTS5 & Inverted Index Persistence:** Stores chunk text in SQLite with FTS5 BM25 indexing and builds an in-memory TF-IDF inverted index.
4. **Dual Channel Retrieval:** Runs parallel candidate queries over FTS5 BM25 and sublinear TF-IDF vector channels.
5. **Reciprocal Rank Fusion:** Fuses candidate lists using weighted RRF with smoothing constant $k=60$.
6. **Post-Fusion Boosting:** Applies symbol match multipliers (`2.0x`) and boilerplate penalties (`1.0 - 0.5 * ratio`).
7. **Value Density Allocation:** Ranks chunks by $\text{Relevance} / \ln(1 + \text{Tokens})$ and fills the prompt window up to the specified token ceiling.

---

## Algorithms Summary

### BM25 Lexical Search
Evaluated via SQLite FTS5 with Porter stemming and sub-tokenization. Preprocesses queries by removing stop words and forming OR-conjunctions to maximize term recall over identifier variations.

### Sublinear TF-IDF Vector Space
Computes term frequency as $\text{TF}(t, d) = 1 + \ln(\text{count}(t, d))$ for $\text{count} > 0$, combined with smoothed inverse document frequency $\text{IDF}(t) = \ln((1 + N)/(1 + \text{df}(t))) + 1.0$. camelCase and snake_case identifiers are split automatically during indexing.

### Reciprocal Rank Fusion (RRF)
Aggregates ordinal candidate ranks from BM25 and TF-IDF without needing raw score scaling. Missing items in a channel receive a default penalty rank ($|L_s| + 1$).

### Value Density Budgeting
Calculates density score $D(d) = \frac{\text{RRF}(d)}{1 + \ln(1 + \text{Tokens}(d))} \times (1 - \text{BoilerplateRatio}(d))$. Chunks are selected greedily until reaching the target token ceiling.

### Signature-Preserving Compression
Strips internal function bodies, docstrings, and redundant comments while retaining class definitions, method signatures, and return annotations.

Detailed mathematical derivations and source code mappings are available in [`ALGORITHMS.md`](ALGORITHMS.md).

---

## RRF Ranking Example

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

* **`routes.py`**:
  $$RRF = \frac{0.40}{60 + 3} + \frac{0.40}{60 + 4} = 0.006349 + 0.006250 = \mathbf{0.012599}$$

**Result:** `middleware.py` and `auth.py` achieve high consensus across both channels, rising above single-channel outliers and securing top placement in the final context payload.

---

## Quick Start

### 1. Clone Repository & Setup Environment

```bash
git clone https://github.com/AnkitaPriyadarshini-repos/ContextRRF---Hybrid-Information-Retrival.git
cd ContextRRF---Hybrid-Information-Retrival

# Create and activate virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux / macOS:
source .venv/bin/activate

# Install ContextRRF engine in editable mode
pip install -e .
```

### 2. Initialize & Ingest Codebase

```bash
# Initialize local SQLite index database
python -m contextrrf.cli init

# Ingest sample project or target directory
python -m contextrrf.cli ingest demo_project
```

### 3. Query Code Context

```bash
# Execute hybrid RRF search query
python -m contextrrf.cli query "How does authentication work?" --budget 2000
```

### 4. Inspect Index Statistics

```bash
# Display indexed files, chunks, and token counts
python -m contextrrf.cli stats
```

---

## Interactive Dashboard

Launch the embedded web interface to explore retrieval results, analyze rank contributions, and test RRF parameter variations interactively:

```bash
python -m contextrrf.cli serve --port 8000
```

Open your browser to `http://localhost:8000` to access:

* **Search Explorer:** Query codebase and inspect BM25 vs TF-IDF vs RRF rankings side-by-side.
* **RRF Playground:** Adjust smoothing constant $k$ and channel weights $w_s$ in real time.
* **System Architecture:** Visual breakdown of ingestion, chunking, and fusion stages.
* **Benchmark Suite:** Run latency and relevance evaluation queries.

---

## Academic Evaluation Framework

ContextRRF evaluates retrieval performance across six standardized dimensions:

| Evaluation Metric | Baseline / Target | Status |
|:---|:---|:---|
| **Retrieval Latency** | Sub-100ms response time for corpus < 10,000 chunks | *Baseline-reported* |
| **Token Reduction Rate** | 40%–60% context reduction via value density budgeting | *ContextRRF experiment* |
| **RRF Ranking Stability** | Kendall's $\tau \ge 0.85$ under channel noise perturbation | *ContextRRF experiment* |
| **AST Chunk Integrity** | Zero broken syntax trees across multi-file extraction | *ContextRRF experiment* |
| **Multi-Language Coverage** | Support for 7+ programming languages & 4 doc formats | *ContextRRF experiment* |
| **Mean Reciprocal Rank (MRR)** | Benchmark query MRR evaluation | *To be evaluated* |

---

## Use Cases

* **Precise Code Search:** Locate exact functions, handlers, and interface definitions across large repositories.
* **LLM Context Optimization:** Reduce prompt token usage while improving model response accuracy.
* **Developer Onboarding:** Quickly map dependencies, database initialization, and route structures in unfamiliar codebases.
* **Pull Request Analysis:** Extract relevant historical code chunks impacted by a proposed change.
* **Legacy Code Exploration:** Identify core business logic buried within legacy software suites.
* **Automated Context Preparation:** Feed high-density context chunks directly to local or remote LLM coding agents.

---

## Project Structure

```
ContextRRF/
├── .github/              # CI/CD workflows (PyPI publish, test suite)
├── contextrrf/           # Core Python engine source code
│   ├── chunkers/         # Language AST & document chunkers
│   ├── embeddings/       # TF-IDF vector space backend
│   ├── tests/            # Pytest test suite (435 passing tests)
│   ├── bloom.py          # Query term Bloom filter
│   ├── cache.py          # Adaptive Replacement Cache (ARC)
│   ├── cli.py            # Command line interface handler
│   ├── compress.py       # AST-preserving context compressor
│   ├── ingest.py         # Directory traversal & chunking engine
│   ├── ranking.py        # RRF fusion & value-density budget selection
│   ├── retrieval.py      # Hybrid FTS5 BM25 + TF-IDF query engine
│   └── store.py          # SQLite FTS5 database persistence layer
├── demo_project/         # Sample codebase for quick start and testing
├── docs/                 # Academic documentation & technical reference
│   ├── algorithms/       # Mathematical formulas & algorithm specs
│   ├── architecture/     # System architecture diagrams & inventory
│   ├── assets/           # Visual graphics & architecture diagrams
│   ├── experiments/      # Benchmark results & experimental notes
│   ├── guides/           # Contributing, tuning & developer playbooks
│   ├── integrations/     # MCP Server & Ollama Bridge packages
│   └── reference/        # Security, license, changelog & technical docs
├── web/                  # Interactive dark-mode dashboard UI
├── ALGORITHMS.md         # Comprehensive algorithm reference
├── BASELINE_REPORT.md    # Baseline verification & evolution history
├── LICENSE               # AGPL-3.0 License file
├── README.md             # Project primary documentation
├── pyproject.toml        # Build configuration & entry points
└── requirements.txt      # Core runtime environment specifications
```

---

## Research Basis & Baseline Attribution

ContextRRF is an academic engineering extension and reorganization derived from the open-source **Mnemosyne** retrieval-engine baseline.

The ContextRRF project focuses specifically on:
* Reciprocal Rank Fusion (RRF) algorithm analysis, parameter tuning, and rank combination stability.
* Explainable multi-channel hybrid information retrieval for code corpora.
* Value-density token-aware context optimization under strict LLM prompt budget constraints.
* AST-preserving code compression for context preservation.
* Interactive visual evaluation tools and real-time RRF simulation.

ContextRRF maintains baseline credit and open-source license attribution while establishing an independent, focused academic framework for hybrid code retrieval.

---

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

---

## License

ContextRRF is released under the [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE).
