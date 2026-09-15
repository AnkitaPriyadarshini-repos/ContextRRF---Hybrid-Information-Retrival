"""
Authentication and security module.
Handles token generation, password hashing, and user authentication.
"""

import hashlib
import hmac
import time
from typing import Optional, Dict, Any

SECRET_KEY = "demo-secret-key-change-in-production"
TOKEN_EXPIRY_SECONDS = 3600


def hash_password(password: str, salt: str = "default_salt") -> str:
    """Hash password using SHA-256 with salt."""
    salted = f"{salt}:{password}".encode("utf-8")
    return hashlib.sha256(salted).hexdigest()


def verify_password(password: str, password_hash: str, salt: str = "default_salt") -> bool:
    """Verify password against existing hash."""
    computed = hash_password(password, salt)
    return hmac.compare_digest(computed, password_hash)


def generate_auth_token(user_id: str, role: str = "user") -> str:
    """Generate a signed authentication token for user."""
    issued_at = int(time.time())
    payload = f"{user_id}:{role}:{issued_at}"
    signature = hmac.new(
        SECRET_KEY.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    return f"{payload}:{signature}"


def authenticate_user(username: str, password_hash_db: str, input_password: str) -> Optional[Dict[str, Any]]:
    """Authenticate user credentials against stored hash."""
    if verify_password(input_password, password_hash_db):
        token = generate_auth_token(username)
        return {"status": "success", "username": username, "token": token}
    return None
