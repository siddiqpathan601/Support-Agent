"""
Redis Service — Upstash-aware caching layer.

Auto-selects the correct client based on available credentials:
  1. UPSTASH_REDIS_REST_URL + TOKEN → Upstash HTTP REST client (serverless-safe)
  2. REDIS_URL                      → Standard redis-py async client
  3. Neither set                    → In-memory fallback (dev only)

Usage:
  from backend.app.services.redis_client import cache_get, cache_set, cache_delete

  await cache_set("session:abc", data, ttl=3600)
  value = await cache_get("session:abc")
"""

import json
import asyncio
from typing import Any, Optional
from backend.config import REDIS_URL, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, HAS_REDIS

# ── In-memory fallback (dev / no Redis) ──────────────────────────────────────

_mem_cache: dict[str, Any] = {}


async def _mem_get(key: str) -> Optional[Any]:
    return _mem_cache.get(key)


async def _mem_set(key: str, value: Any, ttl: Optional[int] = None) -> None:
    _mem_cache[key] = value
    # No TTL enforcement in memory fallback — dev only


async def _mem_delete(key: str) -> None:
    _mem_cache.pop(key, None)


# ── Upstash HTTP REST client ──────────────────────────────────────────────────

async def _upstash_get(key: str) -> Optional[Any]:
    """GET via Upstash REST API."""
    try:
        import httpx
        headers = {"Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}"}
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{UPSTASH_REDIS_REST_URL}/get/{key}", headers=headers, timeout=5)
            data = r.json()
            result = data.get("result")
            if result is None:
                return None
            try:
                return json.loads(result)
            except (json.JSONDecodeError, TypeError):
                return result
    except Exception as e:
        print(f"[Redis] Upstash GET error: {e}")
        return None


async def _upstash_set(key: str, value: Any, ttl: Optional[int] = None) -> None:
    """SET (with optional EX TTL) via Upstash REST API."""
    try:
        import httpx
        headers = {"Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}"}
        serialized = json.dumps(value)
        async with httpx.AsyncClient() as client:
            if ttl:
                await client.get(
                    f"{UPSTASH_REDIS_REST_URL}/set/{key}/{serialized}/EX/{ttl}",
                    headers=headers, timeout=5
                )
            else:
                await client.get(
                    f"{UPSTASH_REDIS_REST_URL}/set/{key}/{serialized}",
                    headers=headers, timeout=5
                )
    except Exception as e:
        print(f"[Redis] Upstash SET error: {e}")


async def _upstash_delete(key: str) -> None:
    """DEL via Upstash REST API."""
    try:
        import httpx
        headers = {"Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}"}
        async with httpx.AsyncClient() as client:
            await client.get(f"{UPSTASH_REDIS_REST_URL}/del/{key}", headers=headers, timeout=5)
    except Exception as e:
        print(f"[Redis] Upstash DEL error: {e}")


# ── Standard redis-py async client ───────────────────────────────────────────

_redis_pool = None


def _get_redis_pool():
    global _redis_pool
    if _redis_pool is None:
        try:
            import redis.asyncio as aioredis
            _redis_pool = aioredis.from_url(
                REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5,
            )
        except Exception as e:
            print(f"[Redis] Pool creation error: {e}")
    return _redis_pool


async def _redis_get(key: str) -> Optional[Any]:
    try:
        pool = _get_redis_pool()
        if not pool:
            return None
        raw = await pool.get(key)
        if raw is None:
            return None
        return json.loads(raw)
    except Exception as e:
        print(f"[Redis] GET error: {e}")
        return None


async def _redis_set(key: str, value: Any, ttl: Optional[int] = None) -> None:
    try:
        pool = _get_redis_pool()
        if not pool:
            return
        serialized = json.dumps(value)
        if ttl:
            await pool.setex(key, ttl, serialized)
        else:
            await pool.set(key, serialized)
    except Exception as e:
        print(f"[Redis] SET error: {e}")


async def _redis_delete(key: str) -> None:
    try:
        pool = _get_redis_pool()
        if pool:
            await pool.delete(key)
    except Exception as e:
        print(f"[Redis] DEL error: {e}")


# ── Public API — auto-selects the right backend ───────────────────────────────

def _pick_backend():
    """Return (get, set, delete) function triple based on config."""
    if UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN:
        return _upstash_get, _upstash_set, _upstash_delete
    if REDIS_URL:
        return _redis_get, _redis_set, _redis_delete
    return _mem_get, _mem_set, _mem_delete


_get_fn, _set_fn, _delete_fn = _pick_backend()

_backend_name = (
    "Upstash REST" if (UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN)
    else "Redis TCP" if REDIS_URL
    else "In-memory (dev)"
)
print(f"[Redis] Backend: {_backend_name}")


async def cache_get(key: str) -> Optional[Any]:
    """Get a value from cache. Returns None if missing."""
    return await _get_fn(key)


async def cache_set(key: str, value: Any, ttl: Optional[int] = None) -> None:
    """Set a value in cache with optional TTL (seconds)."""
    await _set_fn(key, value, ttl)


async def cache_delete(key: str) -> None:
    """Delete a key from cache."""
    await _delete_fn(key)


# ── Convenience helpers ───────────────────────────────────────────────────────

async def cache_conversation(conversation_id: str, data: dict, ttl: int = 3600) -> None:
    """Cache conversation context for 1 hour."""
    await cache_set(f"conv:{conversation_id}", data, ttl=ttl)


async def get_cached_conversation(conversation_id: str) -> Optional[dict]:
    return await cache_get(f"conv:{conversation_id}")


async def cache_user_session(user_id: str, data: dict, ttl: int = 86400) -> None:
    """Cache user session for 24 hours."""
    await cache_set(f"session:{user_id}", data, ttl=ttl)


async def get_user_session(user_id: str) -> Optional[dict]:
    return await cache_get(f"session:{user_id}")


async def rate_limit_check(key: str, limit: int = 20, window: int = 60) -> bool:
    """
    Simple sliding window rate limiter.
    Returns True if the request is allowed, False if rate-limited.
    Uses Upstash INCR + EXPIRE via REST.
    """
    if UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN:
        try:
            import httpx
            headers = {"Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}"}
            rate_key = f"rl:{key}"
            async with httpx.AsyncClient() as client:
                r = await client.get(f"{UPSTASH_REDIS_REST_URL}/incr/{rate_key}", headers=headers, timeout=5)
                count = r.json().get("result", 0)
                if count == 1:
                    await client.get(f"{UPSTASH_REDIS_REST_URL}/expire/{rate_key}/{window}", headers=headers, timeout=5)
                return count <= limit
        except Exception:
            return True  # Fail open
    return True  # No Redis = no rate limiting in dev
