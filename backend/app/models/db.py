"""
Database engine, session factory, and Base for SQLAlchemy ORM.

Phase 1 (local): SQLite via aiosqlite
Phase 1+ (Neon): PostgreSQL via asyncpg — zero code changes needed,
                 just set DATABASE_URL in .env

The engine auto-detects the driver from DATABASE_URL.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from backend.config import DATABASE_URL_SYNC, IS_POSTGRES

# ── Sync engine (used by FastAPI deps + Alembic) ──────────────────────────────
connect_args = {}
if not IS_POSTGRES:
    connect_args["check_same_thread"] = False   # SQLite only

engine = create_engine(
    DATABASE_URL_SYNC,
    connect_args=connect_args,
    echo=False,
    # Connection pool tuning for Neon serverless
    pool_pre_ping=True,             # Detect stale connections
    pool_recycle=300 if IS_POSTGRES else -1,    # Recycle every 5 min on Postgres
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a sync DB session and ensures cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_all_tables():
    """Create all ORM-registered tables. Called on app startup."""
    # Import all models so SQLAlchemy sees them before create_all
    from backend.app.models import user, conversation, ticket  # noqa: F401
    Base.metadata.create_all(bind=engine)
    print(f"[DB] Tables created/verified ({'PostgreSQL' if IS_POSTGRES else 'SQLite'})")
