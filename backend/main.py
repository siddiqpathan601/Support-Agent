"""
Autonomous Customer Support Agent — FastAPI Application
========================================================
Mounts:
  /api/v1/auth       — JWT authentication
  /api/v1/chat       — Customer chat (sync + SSE streaming)
  /api/v1/tickets    — Ticket management
  /api/v1/knowledge  — KB document upload
  /api/v1/dashboard  — Analytics & metrics
  /socket.io/        — Real-time Socket.IO
  /                  — Health check + API info
"""

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import PORT, HOST, LLM_PROVIDER, IS_POSTGRES
from backend.app.api.auth import router as auth_router
from backend.app.api.chat import router as chat_router
from backend.app.api.tickets import router as tickets_router
from backend.app.api.knowledge import router as knowledge_router
from backend.app.api.dashboard import router as dashboard_router
from backend.app.services.socket_manager import sio
from backend.app.models.db import create_all_tables

# ── FastAPI app ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Autonomous Customer Support Agent",
    description=(
        "AI-powered customer support platform with multi-agent LangGraph pipeline, "
        "real-time Socket.IO, JWT auth, and RAG knowledge base."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mount API routers under /api/v1 ──────────────────────────────────────────

API_PREFIX = "/api/v1"
app.include_router(auth_router,      prefix=API_PREFIX)
app.include_router(chat_router,      prefix=API_PREFIX)
app.include_router(tickets_router,   prefix=API_PREFIX)
app.include_router(knowledge_router, prefix=API_PREFIX)
app.include_router(dashboard_router, prefix=API_PREFIX)

# ── Socket.IO ASGI mount ──────────────────────────────────────────────────────

socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

# ── Startup ───────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    """Initialize database tables on startup."""
    create_all_tables()
    from backend.app.services.llm import get_provider_name
    provider = get_provider_name()
    db_type = "PostgreSQL (Neon)" if IS_POSTGRES else "SQLite (local dev)"
    print(f"[Startup] [OK] Support Agent ready | LLM: {provider} | DB: {db_type}")


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "service": "Autonomous Customer Support Agent",
        "version": "2.0.0",
        "status": "running",
        "llm_provider": LLM_PROVIDER,
        "database": "postgresql" if IS_POSTGRES else "sqlite",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    # Use socket_app (wraps FastAPI + Socket.IO) as the ASGI app
    uvicorn.run(
        "backend.main:socket_app",
        host=HOST,
        port=PORT,
        reload=True,
    )
