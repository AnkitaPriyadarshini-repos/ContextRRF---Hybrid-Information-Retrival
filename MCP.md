# MCP Server Reference

ContextRRF ships an MCP (Model Context Protocol) server that gives Claude Code and other MCP-compatible agents native access to the 6-signal hybrid retrieval engine. Instead of grepping through files one at a time, the agent calls `contextrrf.search` and gets ranked, compressed, budget-aware results in a single tool call.

Everything runs locally. No API calls. No data leaves your machine.

## Install

```bash
pip install contextrrf-mcp
```

This installs:
- The `contextrrf-mcp` console script (the MCP server binary)
- The `mcp` SDK (Anthropic's stdio protocol library -- local only, no telemetry)
- Depends on `contextrrf-engine` (the core retrieval library -- must be installed separately or already present)

## Register with Claude Code

**Per-project** (recommended):
```bash
cd /your/project
claude mcp add contextrrf -- contextrrf-mcp
```

**Per-user** (available in all projects):
```bash
claude mcp add --scope user contextrrf -- contextrrf-mcp
```

**Manual config** -- add to `.mcp.json` in your project root:
```json
{
  "mcpServers": {
    "contextrrf": {
      "command": "contextrrf-mcp",
      "args": []
    }
  }
}
```

**With a virtualenv** -- point to the venv binary directly:
```bash
claude mcp add contextrrf -- /path/to/your/.venv/bin/contextrrf-mcp
```

## Tools

### `contextrrf.search`

Search the codebase using 6-signal hybrid retrieval.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `query` | string | yes | -- | Natural language query or keyword search |
| `budget` | integer | no | 8000 | Maximum token budget for results |
| `project_root` | string | no | cwd | Absolute path to the project root |

**What it does:**

1. Runs `query` through BM25 (full-text), TF-IDF (keyword similarity), symbol matching, usage frequency, predictive prefetch, and optional dense embeddings
2. Fuses all signal scores via Reciprocal Rank Fusion
3. Re-ranks by value-per-token (cost model)
4. Selects chunks within the token budget using greedy knapsack
5. Applies AST-aware compression if results exceed budget
6. Returns formatted results with file paths, line numbers, scores, and staleness annotations

**Example interaction in Claude Code:**

```
You: how does the authentication middleware work?
Claude: [calls contextrrf.search with query="authentication middleware"]
-> Returns 3 ranked chunks from auth.py, middleware.py, and config.py
-> Claude answers from those chunks without reading any other files
```

### `contextrrf.index`

Index or re-index the codebase. Incremental by default -- only processes files that changed since the last run.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `project_root` | string | no | cwd | Absolute path to the project root |
| `full` | boolean | no | false | Force full re-index (ignore cache) |

**What it does:**

1. Scans the project for supported files (respecting `.gitignore` and configured ignore patterns)
2. Computes content hashes to detect changes
3. Chunks changed files using language-specific AST parsers (Python, JS/TS, Go, C#, Rust, Java, Kotlin) or line-based chunking for other formats
4. Builds BM25 and TF-IDF indexes in SQLite
5. Creates a `.contextrrf/` directory in the project root (add to `.gitignore`)

**First run:** Indexes everything. Takes 5-30 seconds depending on codebase size.
**Subsequent runs:** Incremental. Only re-indexes changed files. Sub-second for small changesets.

### `contextrrf.stats`

Show index statistics for the current project.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `project_root` | string | no | cwd | Absolute path to the project root |

**Returns:** File count, chunk count, total tokens, language breakdown, and chunk type distribution.

## Architecture

```
Claude Code (local process)
    |
    | stdio pipe (JSON-RPC over stdin/stdout)
    |
contextrrf-mcp server (local process)
    |
    | Python function calls (in-process)
    |
contextrrf-engine
    |
    | SQLite read/write
    |
.contextrrf/ (local index database)
```

The MCP server is a thin async wrapper around the `contextrrf-engine` Python API. It uses the `mcp` SDK's stdio transport -- Claude Code spawns the server as a subprocess and communicates over stdin/stdout. No HTTP server, no ports, no network traffic.

**Lazy initialization:** The retrieval engine is only loaded when the first tool call arrives. Subsequent calls reuse the cached engine instance.

**Async safety:** All blocking engine calls (`query`, `ingest`) run in a thread executor to keep the async event loop responsive.

**Response size cap:** Search results are capped at 64KB to prevent context flooding.

## Configuration

The MCP server respects the same configuration as the CLI. Edit `.contextrrf/config.toml` in your project root:

```toml
[retrieval]
token_budget = 8000       # default per-query budget
max_results = 20          # max chunks per query
bm25_weight = 0.4         # BM25 signal weight
vector_weight = 0.4       # TF-IDF signal weight
usage_weight = 0.2        # usage frequency weight

[compression]
target_ratio = 0.4        # compress to 40% of original
preserve_signatures = true
preserve_docstrings = true

[general]
ignore_patterns = [".git", "node_modules", "__pycache__", ".contextrrf"]
max_file_size_kb = 512
```

The `budget` parameter in `contextrrf.search` overrides `token_budget` on a per-query basis.

## Environment Variables

| Variable | Description |
|---|---|
| `MNEMOSYNE_PROJECT_ROOT` | Default project root when `project_root` parameter is omitted. Falls back to cwd. |

## Troubleshooting

**"No files indexed yet"** -- Run `contextrrf.index` first, or run `contextrrf init && contextrrf ingest` from the CLI.

**Server not appearing in Claude Code** -- Verify registration with `claude mcp list`. Check that the binary path is correct: `which contextrrf-mcp` or the full venv path.

**Slow first query** -- Cold start loads the TF-IDF index into memory. Subsequent queries are <20ms. Use daemon mode (`contextrrf daemon start`) for persistent warm indexes.

**`.contextrrf/` directory** -- Created in the project root on first index. Add to your `.gitignore`. Contains only the SQLite index and cache -- no source code is stored, only chunk hashes and compressed representations.

## Compatibility

- Python 3.11+
- Claude Code (any version with MCP support)
- Any MCP-compatible host that supports stdio transport
- Works alongside other MCP servers without conflict

## Package Details

| | |
|---|---|
| **PyPI** | [contextrrf-mcp](https://pypi.org/project/contextrrf-mcp/) |
| **Depends on** | [contextrrf-engine](https://pypi.org/project/contextrrf-engine/) >= 1.0.0, [mcp](https://pypi.org/project/mcp/) >= 1.0.0 |
| **License** | AGPL-3.0 (commercial license available) |
| **Source** | [mcp/](mcp/) directory in the ContextRRF repository |

## License

AGPL-3.0 -- commercial licensing available from [Cast Net Technology](https://castnettechnology.com).

Copyright 2026 Cast Rock Innovation L.L.C.
