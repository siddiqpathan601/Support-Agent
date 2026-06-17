"""
LangGraph shared state for the Customer Support Agent workflow.

Replaces the old AstroState with a richer SupportState that carries
conversation context, agent outputs, and escalation signals across nodes.
"""

from typing import TypedDict, List, Dict, Any, Optional


class SupportState(TypedDict):
    """Shared mutable state flowing through the LangGraph support pipeline."""

    # ── Conversation context ───────────────────────────────────────────────────
    conversation_id: Optional[str]
    user_id: Optional[str]
    messages: List[Dict[str, str]]          # [{role, content}, ...]

    # ── Intent analysis (Intent Agent output) ─────────────────────────────────
    intent: Optional[str]                   # billing | refund | technical | ...
    entities: Optional[Dict[str, Any]]      # extracted entities from message
    confidence: Optional[float]             # 0.0–1.0 confidence score

    # ── Sentiment analysis (Sentiment Agent output) ────────────────────────────
    sentiment: Optional[str]                # angry | frustrated | neutral | happy
    sentiment_score: Optional[float]        # -1.0 (angry) to 1.0 (happy)

    # ── Knowledge retrieval (Knowledge Agent output) ───────────────────────────
    retrieved_context: Optional[str]        # RAG-retrieved context chunks

    # ── Resolution (Resolution Agent output) ──────────────────────────────────
    resolution_response: Optional[str]      # generated answer
    tools_executed: List[Dict[str, Any]]    # tools called + results
    resolution_successful: Optional[bool]

    # ── Escalation (Escalation Agent output) ──────────────────────────────────
    should_escalate: bool
    escalation_reason: Optional[str]
    ticket_id: Optional[str]
    ticket_summary: Optional[str]

    # ── Final response ─────────────────────────────────────────────────────────
    final_response: Optional[str]
    suggested_replies: List[str]

    # ── Diagnostics ───────────────────────────────────────────────────────────
    tool_history: List[Dict[str, Any]]
    error: Optional[str]
    resolution_attempts: int
