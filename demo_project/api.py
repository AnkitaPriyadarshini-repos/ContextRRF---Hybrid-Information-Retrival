"""
API Router and Endpoints handler.
Defines HTTP route definitions and endpoint handlers for authentication, user profiles, and cache management.
"""

from typing import Dict, Any
from demo_project.auth import authenticate_user
from demo_project.users import UserService
from demo_project.cache import CacheManager

cache = CacheManager()
user_service = UserService()


def register_api_routes() -> Dict[str, str]:
    """Return dictionary of available API routes and handlers."""
    return {
        "/api/v1/health": "health_check_handler",
        "/api/v1/auth/login": "login_handler",
        "/api/v1/users/me": "get_user_profile_handler",
        "/api/v1/cache/clear": "clear_cache_handler",
    }


def login_handler(request_body: Dict[str, Any]) -> Dict[str, Any]:
    """POST /api/v1/auth/login handler."""
    username = request_body.get("username", "")
    password = request_body.get("password", "")
    
    user = user_service.get_user_by_username(username)
    if not user:
        return {"error": "User not found", "code": 404}
    
    auth_result = authenticate_user(username, user["password_hash"], password)
    if auth_result:
        cache.set(f"session:{username}", auth_result["token"])
        return auth_result
    return {"error": "Invalid credentials", "code": 401}


def get_user_profile_handler(user_id: int) -> Dict[str, Any]:
    """GET /api/v1/users/me handler."""
    cached_profile = cache.get(f"user:{user_id}")
    if cached_profile:
        return cached_profile
    
    user = user_service.get_user_by_id(user_id)
    if user:
        cache.set(f"user:{user_id}", user)
        return user
    return {"error": "User not found", "code": 404}


def health_check_handler() -> Dict[str, str]:
    """GET /api/v1/health handler."""
    return {"status": "ok", "service": "demo_api"}
