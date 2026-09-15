"""
User management domain model and user data access services.
"""

from typing import Optional, Dict, Any
from demo_project.database import DatabaseConnection, get_db_connection
from demo_project.auth import hash_password


class UserService:
    """Service handling user registration, retrieval, and profile updates."""

    def __init__(self, db: Optional[DatabaseConnection] = None):
        self.db = db or get_db_connection()

    def create_user(self, username: str, email: str, raw_password: str) -> Dict[str, Any]:
        """Register a new user in the system."""
        pwd_hash = hash_password(raw_password)
        query = "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)"
        user_id = self.db.execute_commit(query, (username, email, pwd_hash))
        return {"id": user_id, "username": username, "email": email}

    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Retrieve user record by username."""
        query = "SELECT id, username, email, password_hash FROM users WHERE username = ?"
        results = self.db.execute_query(query, (username,))
        return results[0] if results else None

    def get_user_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Retrieve user record by primary key id."""
        query = "SELECT id, username, email FROM users WHERE id = ?"
        results = self.db.execute_query(query, (user_id,))
        return results[0] if results else None
