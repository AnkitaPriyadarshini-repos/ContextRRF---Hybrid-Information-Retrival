"""
Configuration management loader for application settings.
"""

import os
from typing import Dict, Any


class AppConfig:
    """Application configuration container."""

    def __init__(self):
        self.app_name = os.getenv("APP_NAME", "ContextRRF-Demo")
        self.env = os.getenv("APP_ENV", "development")
        self.debug = os.getenv("DEBUG", "true").lower() == "true"
        self.port = int(os.getenv("PORT", "8000"))
        self.db_url = os.getenv("DATABASE_URL", "sqlite:///:memory:")

    def to_dict(self) -> Dict[str, Any]:
        """Export configuration settings as dictionary."""
        return {
            "app_name": self.app_name,
            "env": self.env,
            "debug": self.debug,
            "port": self.port,
            "db_url": self.db_url,
        }


def load_config() -> AppConfig:
    """Factory helper to instantiate AppConfig."""
    return AppConfig()
