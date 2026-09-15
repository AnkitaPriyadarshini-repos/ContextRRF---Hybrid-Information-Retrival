"""
Unit tests for ContextRRF REST API handlers and helper functions in contextrrf.server.
"""

import json
import pytest
from pathlib import Path
from contextrrf.server import PROJECT_ROOT, _get_store, _make_ingester, _make_engine, QUERY_EXPLANATION_CACHE


def test_get_store_and_stats(tmp_path):
    """Verify store instantiation and stats retrieval."""
    store = _get_store(tmp_path)
    stats = store.get_stats()
    assert isinstance(stats, dict)
    assert ("files" in stats or "file_count" in stats)
    assert ("chunks" in stats or "chunk_count" in stats)


def test_make_ingester_and_index(tmp_path):
    """Verify ingester instantiation and indexing of a dummy file."""
    demo_dir = tmp_path / "test_demo"
    demo_dir.mkdir()
    sample_file = demo_dir / "sample.py"
    sample_file.write_text("def hello_world():\n    print('Hello ContextRRF')\n")

    ingester = _make_ingester(tmp_path)
    stats = ingester.ingest(paths=[str(sample_file)], full=True)
    assert stats["files_indexed"] >= 1
    assert stats["chunks_added"] >= 1


def test_query_engine(tmp_path):
    """Verify hybrid query execution and RRF result generation."""
    demo_dir = tmp_path / "test_demo"
    demo_dir.mkdir()
    sample_file = demo_dir / "payment.py"
    sample_file.write_text("""
class PaymentProcessor:
    def process_credit_card(self, card_number, amount):
        return {"status": "success", "amount": amount}
""")

    ingester = _make_ingester(tmp_path)
    ingester.ingest(paths=[str(sample_file)], full=True)

    store, engine = _make_engine(tmp_path)
    results = engine.query("credit card payment", budget=4000)
    assert len(results) >= 1
    first = results[0]
    assert "payment.py" in first.file_path
    assert first.scores.get("rrf", 0.0) > 0.0
