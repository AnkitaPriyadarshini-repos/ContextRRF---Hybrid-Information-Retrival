# ContextRRF-Ollama

Ask your codebase questions using local LLMs. Zero config, zero cloud, zero new dependencies.

Bridges [Ollama](https://ollama.com) to [ContextRRF](https://pypi.org/project/contextrrf-engine/) via [MCP](https://modelcontextprotocol.io) -- the same 6-signal hybrid retrieval that powers ContextRRF's Claude Code integration, now available with any tool-calling Ollama model.

## Install

```bash
pip install contextrrf-ollama
```

This installs everything: the Ollama bridge, the MCP server, and the ContextRRF retrieval engine.

## Quick Start

```bash
cd /your/project
contextrrf-ollama "how does authentication work"
```

That's it. Auto-detects your Ollama model, indexes if needed, searches with ranked hybrid retrieval, and returns an answer with file paths and line numbers.

## Requirements

- Python 3.11+
- [Ollama](https://ollama.com) running locally with a tool-calling model

### Supported Models

Any Ollama model with function/tool-calling support:

- `qwen2.5`, `qwen3`
- `llama3.1`, `llama3.2`, `llama3.3`, `llama4`
- `gemma3`, `gemma4`
- `phi4`
- `mistral-nemo`
- `command-r`

If no `--model` is specified, the first installed tool-capable model is used automatically.

## Usage

### Single query

```bash
contextrrf-ollama "how does the rate limiter work"
contextrrf-ollama "find all database queries" --model qwen2.5 --budget 12000
contextrrf-ollama "explain the auth flow" -v   # verbose: shows tool calls
```

### Interactive mode

```bash
contextrrf-ollama
> how does the auth middleware work?
[searches, responds with code citations]
> what about rate limiting?
[follows up with conversation context]
> ^C
```

### Python library

```python
from contextrrf_ollama import run

result = await run("how does auth work", model="qwen2.5", budget=8000)
print(result.response)
```

## CLI Reference

```
contextrrf-ollama [QUERY] [OPTIONS]

positional:
  query                    Question about the codebase (omit for interactive)

options:
  -m, --model MODEL        Ollama model (auto-detected if omitted)
  -b, --budget INT         Token budget for search results (default: 8000)
  -r, --project-root PATH  Project root directory (default: cwd)
  --ollama-url URL         Ollama URL (default: OLLAMA_HOST env or localhost:11434)
  -v, --verbose            Print tool calls to stderr
  --version                Show version
```

## How It Works

```
contextrrf-ollama
  |
  | 1. Spawns contextrrf-mcp as subprocess (stdio)
  | 2. Discovers tools: search, index, stats
  | 3. Sends query + tools to Ollama /api/chat
  |
Ollama (local model)
  |
  | 4. Model calls search tool with your question
  |
contextrrf-mcp
  |
  | 5. 6-signal hybrid retrieval (BM25 + TF-IDF + symbols + usage + prefetch + RRF)
  | 6. AST-aware compression, budget-cut to token limit
  |
  | 7. Results fed back to model
  | 8. Model generates answer with file citations
```

Everything runs locally. No API keys, no cloud, no data leaves your machine.

## Configuration

ContextRRF search settings are configured via `.contextrrf/config.toml` in your project root (created on first index). See the [ContextRRF documentation](https://github.com/AnkitaPriyadarshini-repos/ContextRRF---Hybrid-Information-Retrival#readme) for details.

The `--budget` flag overrides the configured default per query.

## Trademarks

Ollama, Qwen, Llama, Gemma, Phi, Mistral, and Command-R are trademarks of their respective owners. contextrrf-ollama is an independent project and is not endorsed by or affiliated with any of these companies.

## License

AGPL-3.0 -- commercial licensing available from [Cast Net Technology](https://castnettechnology.com).

Copyright 2026 Cast Rock Innovation L.L.C.
