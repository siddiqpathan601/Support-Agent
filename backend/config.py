"""
Support Agent Configuration
============================
Loads environment variables from .env in the project root.

LLM Providers:
  GROQ_API_KEY     — Groq cloud (LLaMA 3.3 70B) — existing key
  XAI_API_KEY      — xAI Grok API (grok-beta)   — new key

Database:
  DATABASE_URL     — Neon PostgreSQL (postgresql+asyncpg://...)
                     Falls back to SQLite for local dev if not set

Redis:
  REDIS_URL        — Upstash Redis URL

Vector DB:
  QDRANT_URL / QDRANT_API_KEY — Qdrant Cloud

Auth:
  JWT_SECRET / JWT_ALGORITHM / JWT_EXPIRE_MINUTES

Server:
  PORT / HOST
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ── LLM — Groq (existing, kept as primary fallback) ──────────────────────────
GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# ── LLM — xAI Grok (new) ──────────────────────────────────────────────────────
XAI_API_KEY: str = os.getenv("XAI_API_KEY", "")
XAI_MODEL: str = os.getenv("XAI_MODEL", "grok-beta")

# Active LLM provider: "xai" if XAI key present, else "groq"
LLM_PROVIDER: str = "xai" if XAI_API_KEY else "groq"

# ── Legacy (eval scripts) ─────────────────────────────────────────────────────
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

# ── Server ────────────────────────────────────────────────────────────────────
PORT: int = int(os.getenv("PORT", "8000"))
HOST: str = os.getenv("HOST", "0.0.0.0")

# ── Database ──────────────────────────────────────────────────────────────────
# Neon PostgreSQL: postgresql+asyncpg://user:pass@host/db?sslmode=require
# SQLite fallback: sqlite+aiosqlite:///./support_agent.db
_raw_db_url = os.getenv("DATABASE_URL", "")

if _raw_db_url:
    # Neon returns postgres:// — SQLAlchemy needs postgresql://
    DATABASE_URL: str = _raw_db_url.replace("postgres://", "postgresql://", 1)
    # Async variant for SQLAlchemy async engine
    if "asyncpg" not in DATABASE_URL:
        DATABASE_URL_ASYNC: str = DATABASE_URL.replace(
            "postgresql://", "postgresql+asyncpg://", 1
        )
    else:
        DATABASE_URL_ASYNC: str = DATABASE_URL
    # Sync variant (used by Alembic and sync session)
    DATABASE_URL_SYNC: str = DATABASE_URL_ASYNC.replace(
        "postgresql+asyncpg://", "postgresql://", 1
    )
else:
    # Local SQLite dev fallback
    DATABASE_URL = "sqlite:///./support_agent.db"
    DATABASE_URL_SYNC = DATABASE_URL
    DATABASE_URL_ASYNC = "sqlite+aiosqlite:///./support_agent.db"

IS_POSTGRES: bool = "postgresql" in DATABASE_URL

# ── Redis / Celery ────────────────────────────────────────────────────────────
REDIS_URL: str = os.getenv("REDIS_URL", "")
# Upstash HTTP REST client (for environments where TCP Redis is blocked)
UPSTASH_REDIS_REST_URL: str = os.getenv("UPSTASH_REDIS_REST_URL", "")
UPSTASH_REDIS_REST_TOKEN: str = os.getenv("UPSTASH_REDIS_REST_TOKEN", "")
HAS_REDIS: bool = bool(REDIS_URL or UPSTASH_REDIS_REST_URL)

# ── Vector Database ───────────────────────────────────────────────────────────
QDRANT_URL: str = os.getenv("QDRANT_URL", "")
QDRANT_API_KEY: str = os.getenv("QDRANT_API_KEY", "")

# ── Authentication ────────────────────────────────────────────────────────────
JWT_SECRET: str = os.getenv("JWT_SECRET", "changeme-use-a-strong-secret-in-production")
JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))

# ── Business Logic ────────────────────────────────────────────────────────────
CONFIDENCE_THRESHOLD: float = float(os.getenv("CONFIDENCE_THRESHOLD", "0.85"))
SUPPORT_EMAIL: str = os.getenv("SUPPORT_EMAIL", "support@company.com")

# ── Startup warnings ──────────────────────────────────────────────────────────
import warnings

if not GROQ_API_KEY and not XAI_API_KEY:
    warnings.warn(
        "No LLM API key set. Set GROQ_API_KEY or XAI_API_KEY in .env",
        RuntimeWarning, stacklevel=2,
    )

if JWT_SECRET == "changeme-use-a-strong-secret-in-production":
    warnings.warn(
        "JWT_SECRET is insecure. Set a strong random value in production!",
        RuntimeWarning, stacklevel=2,
    )

print(f"[Config] LLM provider: {LLM_PROVIDER.upper()} | DB: {'PostgreSQL (Neon)' if IS_POSTGRES else 'SQLite (local)'}")
