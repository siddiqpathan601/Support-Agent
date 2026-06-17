"""
Pydantic request/response schemas for all API endpoints.
Separate from ORM models for clean API contracts.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# ── Auth Schemas ──────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str
    full_name: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=8)
    role: str = "customer"  # customer | support | admin


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    role: str
    full_name: str


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Chat / Conversation Schemas ───────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    conversation_id: Optional[str] = None   # None = start new conversation
    history: Optional[List[Dict[str, str]]] = []


class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    intent: Optional[str] = None
    confidence: Optional[float] = None
    sentiment: Optional[str] = None
    escalated: bool = False
    ticket_id: Optional[str] = None
    suggested_replies: Optional[List[str]] = []
    tool_history: Optional[List[Dict[str, Any]]] = []


class MessageOut(BaseModel):
    id: str
    sender: str
    content: str
    intent: Optional[str] = None
    confidence: Optional[float] = None
    timestamp: datetime

    class Config:
        from_attributes = True


class ConversationOut(BaseModel):
    id: str
    user_id: str
    status: str
    sentiment_score: Optional[float] = None
    confidence_score: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    messages: List[MessageOut] = []

    class Config:
        from_attributes = True


# ── Ticket Schemas ────────────────────────────────────────────────────────────

class TicketOut(BaseModel):
    id: str
    conversation_id: str
    user_id: str
    title: str
    summary: Optional[str] = None
    category: str
    priority: str
    status: str
    assigned_to: Optional[str] = None
    escalation_reason: Optional[str] = None
    resolution_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UpdateTicketRequest(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None
    resolution_notes: Optional[str] = None


# ── Knowledge Base Schemas ────────────────────────────────────────────────────

class KBDocumentOut(BaseModel):
    id: str
    document_name: str
    source: str
    chunk_count: int
    created_at: datetime


# ── Dashboard / Analytics Schemas ─────────────────────────────────────────────

class DashboardMetrics(BaseModel):
    tickets_today: int
    open_tickets: int
    resolved_tickets: int
    escalation_rate: float
    avg_resolution_time_minutes: float
    ai_success_rate: float
    customer_satisfaction: float
    total_conversations: int


class IntentDistribution(BaseModel):
    intent: str
    count: int
    percentage: float
