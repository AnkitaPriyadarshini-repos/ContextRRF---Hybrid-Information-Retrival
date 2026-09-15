"""
Database management module.
Provides connection pooling, SQL execution, and schema migrations.
"""

import sqlite3
from typing import List, Dict, Any, Optional

DB_PATH = ":memory:"


class DatabaseConnection:
    """Manages SQLite database connections and query execution."""

    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self.conn: Optional[sqlite3.Connection] = None

    def connect(self) -> None:
        """Create and initialize database connection pool."""
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row

    def execute_query(self, query: str, params: tuple = ()) -> List[Dict[str, Any]]:
        """Execute SELECT query and return list of dict rows."""
        if not self.conn:
            self.connect()
        cursor = self.conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

    def execute_commit(self, query: str, params: tuple = ()) -> int:
        """Execute INSERT/UPDATE/DELETE query and commit transaction."""
        if not self.conn:
            self.connect()
        cursor = self.conn.cursor()
        cursor.execute(query, params)
        self.conn.commit()
        return cursor.lastrowid

    def close(self) -> None:
        """Close active database connection."""
        if self.conn:
            self.conn.close()
            self.conn = None


def get_db_connection() -> DatabaseConnection:
    """Factory function to get database connection."""
    db = DatabaseConnection()
    db.connect()
    return db
