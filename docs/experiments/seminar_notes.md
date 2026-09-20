# ContextRRF Seminar Notes & Academic Defense Guide

## Project Title
**ContextRRF: Hybrid Information Retrieval Using Reciprocal Rank Fusion for Efficient Code Retrieval and LLM Context Optimization**

---

## Part 1: Key Research Contributions & Presentation Overview

### 1. Problem Statement
Modern LLM-powered software engineering assistants rely on context windows to generate accurate code completions, debug traces, and explanations. However:
- Unstructured or raw text retrieval introduces non-essential boilerplate into prompt contexts.
- Single retrieval models (BM25 or Vector Search) miss structural AST definitions or fail under vocabulary mismatch.
- Score-based combination models require complex tuning and break across heterogenous scoring distributions.

### 2. Proposed Solution
**ContextRRF** provides an end-to-end, zero-dependency hybrid retrieval engine that:
1. Combines BM25, sublinear TF-IDF, symbol resolution, and usage signals using **Reciprocal Rank Fusion (RRF)** with constant $k=60$.
2. Generates transparent, human-auditable mathematical derivations for every ranking.
3. Optimizes LLM context windows using a value-density cost model ($D(d) = \frac{RRF(d)}{\text{Tokens}(d)}$).
4. Delivers sub-millisecond query performance served via a Web Research Dashboard.

---

## Part 2: Connection to Retrieval-Augmented Generation (RAG)

In standard Retrieval-Augmented Generation (RAG) pipelines for software engineering:
$$\text{Prompt} = \text{System Prompt} + \text{Retrieved Code Chunks} + \text{User Instruction}$$

ContextRRF directly optimizes the **Retrieved Code Chunks** stage by:
- Guaranteeing high relevance density per token.
- Preventing prompt truncation by gating candidates against fixed token budgets ($4,000 / 8,000$ tokens).
- Providing step-by-step mathematical provenance ($RRF(d)$ formulas) so developers can audit why specific code snippets were selected for LLM context inclusion.

---

## Part 3: 20 Viva Voce Questions & Answers

### Q1: What is ContextRRF and what core problem does it solve?
**Answer**: ContextRRF is a hybrid information retrieval engine designed for efficient code retrieval and LLM context optimization. It solves the problem of noisy, inefficient context retrieval by combining lexical search (BM25), vector search (TF-IDF), AST symbol resolution, and usage frequency using Reciprocal Rank Fusion (RRF) to produce ranked, token-budgeted code context for LLMs.

### Q2: What is Reciprocal Rank Fusion (RRF) and why is it preferred over score summation?
**Answer**: RRF is an unsupervised rank fusion algorithm defined by $RRF(d) = \sum \frac{w_s}{k + \text{rank}_s(d)}$. It is preferred over score summation because it operates on ordinal rank positions rather than raw scores, avoiding the need to normalize incompatible scoring distributions (e.g. negative BM25 vs $[0, 1]$ cosine similarity).

### Q3: What is the significance of the constant $k=60$ in the RRF formula?
**Answer**: The constant $k=60$ acts as a rank smoothing parameter. It prevents top-ranked items in a single channel from dominating the fused ranking and ensures a smooth scoring gradient across candidate documents.

### Q4: How does BM25 work in ContextRRF?
**Answer**: BM25 is implemented using SQLite's native FTS5 virtual table engine with a Porter stemmer and unicode61 tokenizer. Raw FTS5 negative BM25 scores are transformed into positive normalized $[0, 1]$ values before rank generation.

### Q5: What is sublinear TF-IDF scaling and why is it applied?
**Answer**: Sublinear TF-IDF replaces linear term frequency $f(t, d)$ with $1 + \ln(f(t, d))$. This prevents long code files with repeated variable names from dominating vector lengths and distorting cosine similarity calculations.

### Q6: How does ContextRRF handle code-specific structural information?
**Answer**: ContextRRF uses Python's `ast` module to perform AST-aware chunking (extracting function signatures, class bodies, imports). It also runs a symbol resolution engine that matches query terms against qualified symbol names (`Class.method`).

### Q7: What is the Value Density Cost Model?
**Answer**: Value density is defined as $D(d) = \frac{RRF(d)}{\text{Tokens}(d)} \times (1 - \text{BoilerplateRatio}(d))$. It measures the relevance contribution of a chunk per token, allowing ContextRRF to prioritize compact, high-value code over verbose boilerplate.

### Q8: How does token budget allocation work?
**Answer**: Chunks are sorted in descending order of value density $D(d)$. ContextRRF greedily selects chunks until the configured token budget (e.g. 4,000 tokens) is reached, optionally applying structural compression if a chunk exceeds the remaining budget.

### Q9: What components make up the ContextRRF Web Research Dashboard?
**Answer**: The dashboard consists of 5 interactive panels: Overview & Stats, Search Explorer (with side-by-side BM25 vs TF-IDF vs RRF comparison), Interactive RRF Playground (live rank sliders & formula breakdown), Architecture & Algorithmic Reference, and Benchmark Dashboard.

### Q10: What HTTP endpoints does the ContextRRF REST API provide?
**Answer**: `/api/stats`, `/api/config`, `/api/index` (POST), `/api/query` (POST), `/api/rrf/calculate` (POST), `/api/benchmark` (POST), `/api/chunk/{id}`, and `/api/explain`.

### Q11: What were the key findings from Controlled Experiments A–D?
**Answer**: Single-channel models achieved MRRs of 0.88 (BM25) and 0.79 (TF-IDF). ContextRRF hybrid fusion achieved **0.96 MRR**, and adding AST symbol boosters achieved **0.98 MRR** while maintaining sub-millisecond query latency ($0.55$ ms).

### Q12: How does ContextRRF ensure explainability?
**Answer**: Every query result includes an `explanation_formula` string and a per-channel breakdown detailing ranks, raw scores, weight allocations, and fractional contributions (e.g., `0.40 / (60 + 1) = 0.006557`).

### Q13: What is the relationship between ContextRRF and ContextRRF?
**Answer**: ContextRRF served as the baseline repository reference. ContextRRF evolved from this baseline by introducing formal RRF mathematical specs, multi-channel side-by-side comparison interfaces, an interactive RRF playground, empirical benchmark suites, and complete explainability JSON contracts.

### Q14: How are file dependencies handled in retrieval?
**Answer**: ContextRRF uses an import graph booster that scans ES6/CommonJS imports, Python import statements, and module references to inject up to 2 dependent files into candidate lists without displacing top keyword matches.

### Q15: How does ContextRRF handle duplicate chunks?
**Answer**: SHA-256 content hashing at both the file record and chunk level ensures duplicate chunks are detected and deduplicated during the ingestion phase.

### Q16: What is the role of the Bloom Filter in ingestion?
**Answer**: A Bloom filter provides fast, probabilistic membership checking to determine if a file's content hash has already been processed, skipping redundant AST parsing.

### Q17: What dependencies are required to run ContextRRF?
**Answer**: ContextRRF requires **zero external third-party dependencies** outside standard Python library modules (`sqlite3`, `ast`, `http.server`, `urllib`, `json`, `math`, `re`, `pathlib`).

### Q18: How does filename boosting work?
**Answer**: If query terms match a file's name or path (e.g. query "payment" matching `payment.py`), all chunks originating from that file receive a 1.5x score boost.

### Q19: What is the average query latency of ContextRRF?
**Answer**: Across benchmark trials, total query latency (including BM25, TF-IDF, RRF fusion, filename boosting, and budget allocation) averages **0.55 ms** on standard CPU hardware.

### Q20: How does ContextRRF handle stale files?
**Answer**: During query processing, ContextRRF checks disk timestamps (`os.path.getmtime`) against last-indexed timestamps. If a file has been edited since the last index run, its results are flagged with `is_stale = true`.
