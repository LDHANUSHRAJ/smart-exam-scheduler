"""
Redis caching service.

Keys:
  plan:{user_id}:{date}     → daily session view (TTL 24h)
  plan_meta:{user_id}       → plan metadata (TTL 7d)
  conflicts:{user_id}       → conflict analysis (invalidate on exam change)
"""

import json
from typing import Optional, Any
from datetime import timedelta

import redis.asyncio as redis
from app.config import settings

_redis_client: Optional[redis.Redis] = None


async def get_redis() -> redis.Redis:
    """Get or create the Redis client singleton."""
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
            )
            # Test connection
            await _redis_client.ping()
        except Exception:
            # If Redis is unavailable, return a dummy that no-ops
            _redis_client = None
            return None
    return _redis_client


async def cache_set(key: str, value: Any, ttl_seconds: int = 86400) -> None:
    """Set a cache value with TTL (default 24 hours)."""
    client = await get_redis()
    if client is None:
        return
    try:
        await client.setex(key, ttl_seconds, json.dumps(value, default=str))
    except Exception:
        pass  # Cache failures shouldn't break the app


async def cache_get(key: str) -> Optional[Any]:
    """Get a cached value."""
    client = await get_redis()
    if client is None:
        return None
    try:
        data = await client.get(key)
        return json.loads(data) if data else None
    except Exception:
        return None


async def cache_delete_pattern(pattern: str) -> None:
    """Delete all keys matching a pattern."""
    client = await get_redis()
    if client is None:
        return
    try:
        keys = []
        async for key in client.scan_iter(match=pattern):
            keys.append(key)
        if keys:
            await client.delete(*keys)
    except Exception:
        pass


async def invalidate_user_cache(user_id: str) -> None:
    """Invalidate all cached plan and conflict data for a user."""
    await cache_delete_pattern(f"plan:{user_id}:*")
    await cache_delete_pattern(f"plan_meta:{user_id}")
    await cache_delete_pattern(f"conflicts:{user_id}")


# Cache key helpers
def plan_day_key(user_id: str, date_str: str) -> str:
    return f"plan:{user_id}:{date_str}"


def plan_meta_key(user_id: str) -> str:
    return f"plan_meta:{user_id}"


def conflicts_key(user_id: str) -> str:
    return f"conflicts:{user_id}"
