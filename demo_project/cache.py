"""
Cache management system providing in-memory key-value caching with TTL eviction.
"""

import time
from typing import Dict, Any, Optional, Tuple


class CacheManager:
    """In-memory key-value cache manager with time-to-live (TTL)."""

    def __init__(self, default_ttl_seconds: int = 300):
        self._store: Dict[str, Tuple[Any, float]] = {}
        self.default_ttl = default_ttl_seconds

    def get(self, key: str) -> Optional[Any]:
        """Retrieve value for key if not expired."""
        if key not in self._store:
            return None
        value, expiry = self._store[key]
        if time.time() > expiry:
            del self._store[key]
            return None
        return value

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Store value with key and TTL."""
        ttl_val = ttl if ttl is not None else self.default_ttl
        expiry = time.time() + ttl_val
        self._store[key] = (value, expiry)

    def delete(self, key: str) -> bool:
        """Evict key from cache."""
        if key in self._store:
            del self._store[key]
            return True
        return False

    def clear(self) -> None:
        """Clear all entries from cache store."""
        self._store.clear()
