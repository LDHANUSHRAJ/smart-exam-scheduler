"""
Smart Exam Scheduler — Backend Configuration

Loads environment variables using pydantic-settings for type-safe config.
"""

from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/exam_scheduler"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # JWT
    JWT_SECRET: str = "your-super-secret-key-minimum-32-chars-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: str = '["http://localhost:5173","http://localhost:3000"]'

    @property
    def cors_origins_list(self) -> List[str]:
        return json.loads(self.CORS_ORIGINS)

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
