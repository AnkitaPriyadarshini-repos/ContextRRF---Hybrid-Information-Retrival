# Copyright 2026 Cast Rock Innovation L.L.C.
# SPDX-License-Identifier: AGPL-3.0-or-later

"""ContextRRF-Ollama -- zero-config local code search via Ollama + MCP."""

__version__ = "0.1.1"

from contextrrf_ollama.agent import AgentResult, run

__all__ = ["run", "AgentResult"]
