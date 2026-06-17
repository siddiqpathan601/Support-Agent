"""
Chat API — customer-facing chat endpoints.

Endpoints:
  POST /api/v1/chat         — synchronous chat
  POST /api/v1/chat/stream  — SSE streaming chat
  GET  /api/v1/conversations — list user's conversations
  GET  /api/v1/conversations/{id} — get conversation with messages
"""

import json
import time
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.app.models.db import get_db
from backend.app.models.conversation import Conversation, Message, ConversationStatus, MessageSender
from backend.app.models.ticket import Ticket, TicketStatus, TicketPriority, TicketCategory
from backend.app.models.user import User
from backend.app.models.schemas import ChatRequest, ChatResponse, ConversationOut
from backend.app.services.auth import get_current_user
from backend.app.agents.graph import support_graph, build_initial_state
from backend.app.services.redis_client import (
    cache_conversation, get_cached_conversation, rate_limit_check
)

router = APIRouter(prefix="/chat", tags=["Chat"])


# ── Helper: persist message to DB ─────────────────────────────────────────────

def _save_message(
    db: Session,
    conversation_id: str,
    sender: MessageSender,
    content: str,
    intent: Optional[str] = None,
    confidence: Optional[float] = None,
    sender_id: Optional[str] = None,
) -> Message:
    msg = Message(
        conversation_id=conversation_id,
        sender=sender,
        content=content,
        intent=intent,
        confidence=confidence,
        sender_id=sender_id,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def _get_or_create_conversation(
    db: Session,
    user_id: str,
    conversation_id: Optional[str],
) -> Conversation:
    if conversation_id:
        convo = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
        ).first()
        if not convo:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return convo

    convo = Conversation(user_id=user_id)
    db.add(convo)
    db.commit()
    db.refresh(convo)
    return convo


def _build_history(convo: Conversation) -> List[dict]:
    """Convert DB messages to the format the graph expects."""
    return [
        {
            "role": "user" if msg.sender == MessageSender.USER else "assistant",
            "content": msg.content,
        }
        for msg in convo.messages
    ]


# ── POST /chat — synchronous ──────────────────────────────────────────────────

@router.post("", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run the full agent pipeline and return a structured response."""
    convo = _get_or_create_conversation(db, current_user.id, request.conversation_id)

    # Rate limit: 20 messages per minute per user
    allowed = await rate_limit_check(f"chat:{current_user.id}", limit=20, window=60)
    if not allowed:
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a moment.")

    # Try Redis cache for conversation history first
    cached = await get_cached_conversation(convo.id)
    if cached and cached.get("messages"):
        history = cached["messages"]
    else:
        history = _build_history(convo) if convo.messages else list(request.history or [])

    # Persist the user's message
    _save_message(
        db, convo.id, MessageSender.USER, request.message,
        sender_id=current_user.id,
    )

    # Run the LangGraph pipeline
    initial_state = build_initial_state(
        message=request.message,
        conversation_id=convo.id,
        user_id=current_user.id,
        history=history,
        resolution_attempts=int(convo.resolution_attempts or 0),
    )

    try:
        result = await support_graph.ainvoke(initial_state)
    except Exception as e:
        print(f"[ChatAPI] Graph execution failed: {e}")
        raise HTTPException(status_code=500, detail="Agent pipeline failed")

    # Extract results
    final_response = result.get("final_response") or "I'm sorry, I couldn't process your request."
    intent = result.get("intent")
    confidence = result.get("confidence")
    sentiment = result.get("sentiment")
    should_escalate = result.get("should_escalate", False)
    ticket_id = result.get("ticket_id")
    ticket_meta = result.get("_ticket_meta")
    suggested_replies = result.get("suggested_replies", [])

    # Persist agent response
    _save_message(
        db, convo.id, MessageSender.AGENT, final_response,
        intent=intent, confidence=confidence,
    )

    # Update conversation status
    convo.sentiment_score = result.get("sentiment_score")
    convo.confidence_score = confidence
    if should_escalate:
        convo.status = ConversationStatus.ESCALATED
        convo.resolution_attempts = str(int(convo.resolution_attempts or 0) + 1)
    else:
        convo.resolution_attempts = str(int(convo.resolution_attempts or 0) + 1)

    # Create ticket in DB if escalated
    if should_escalate and ticket_meta and not db.query(Ticket).filter(
        Ticket.conversation_id == convo.id
    ).first():
        category_val = ticket_meta.get("category", "general")
        priority_val = ticket_meta.get("priority", "medium")

        # Safely map to enum values
        cat_map = {c.value: c for c in TicketCategory}
        pri_map = {p.value: p for p in TicketPriority}

        ticket = Ticket(
            id=ticket_meta["ticket_id"],
            conversation_id=convo.id,
            user_id=current_user.id,
            title=f"Support Request: {intent or 'General'} - {current_user.email}",
            summary=ticket_meta.get("summary"),
            category=cat_map.get(category_val, TicketCategory.GENERAL),
            priority=pri_map.get(priority_val, TicketPriority.MEDIUM),
            status=TicketStatus.OPEN,
            escalation_reason=ticket_meta.get("escalation_reason"),
        )
        db.add(ticket)

    db.commit()

    # Cache updated conversation history in Redis (1 hour TTL)
    updated_history = history + [
        {"role": "user", "content": request.message},
        {"role": "assistant", "content": final_response},
    ]
    await cache_conversation(convo.id, {"messages": updated_history})

    return ChatResponse(
        response=final_response,
        conversation_id=convo.id,
        intent=intent,
        confidence=confidence,
        sentiment=sentiment,
        escalated=should_escalate,
        ticket_id=ticket_id,
        suggested_replies=suggested_replies,
        tool_history=result.get("tool_history", []),
    )


# ── POST /chat/stream — SSE streaming ─────────────────────────────────────────

@router.post("/stream")
async def stream_chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Stream the agent pipeline result as Server-Sent Events."""

    async def event_generator():
        try:
            convo = _get_or_create_conversation(db, current_user.id, request.conversation_id)
            history = _build_history(convo) if convo.messages else list(request.history or [])

            _save_message(db, convo.id, MessageSender.USER, request.message, sender_id=current_user.id)

            initial_state = build_initial_state(
                message=request.message,
                conversation_id=convo.id,
                user_id=current_user.id,
                history=history,
                resolution_attempts=int(convo.resolution_attempts or 0),
            )

            # Stream graph events
            async for event in support_graph.astream_events(initial_state, version="v1"):
                kind = event.get("event")
                name = event.get("name", "")

                # Emit agent progress events
                if kind == "on_chain_start" and "agent" in name.lower():
                    yield f"data: {json.dumps({'agent_start': name})}\n\n"

                elif kind == "on_chain_end" and "agent" in name.lower():
                    output = event.get("data", {}).get("output", {})
                    if isinstance(output, dict):
                        tool_info = {
                            k: v for k, v in output.items()
                            if k in ["intent", "confidence", "sentiment", "ticket_id", "should_escalate"]
                        }
                        if tool_info:
                            yield f"data: {json.dumps({'agent_output': name, 'data': tool_info})}\n\n"

            # Run full pipeline to get final result for DB persistence
            result = await support_graph.ainvoke(initial_state)
            final_response = result.get("final_response") or "I'm sorry, I couldn't process your request."

            # Stream the final response token by token
            from langchain_groq import ChatGroq
            from langchain_core.messages import SystemMessage, HumanMessage
            from backend.config import GROQ_API_KEY, GROQ_MODEL

            llm = ChatGroq(model=GROQ_MODEL, temperature=0.7, api_key=GROQ_API_KEY)

            # Stream the pre-generated final response character-by-character (simulated streaming)
            # In production, use llm.astream() directly with context
            words = final_response.split(" ")
            import asyncio
            for i, word in enumerate(words):
                token = word + (" " if i < len(words) - 1 else "")
                yield f"data: {json.dumps({'token': token})}\n\n"
                await asyncio.sleep(0.02)

            # Persist and emit done
            _save_message(db, convo.id, MessageSender.AGENT, final_response,
                         intent=result.get("intent"), confidence=result.get("confidence"))

            convo.sentiment_score = result.get("sentiment_score")
            convo.confidence_score = result.get("confidence")
            if result.get("should_escalate"):
                convo.status = ConversationStatus.ESCALATED
            db.commit()

            yield f"data: {json.dumps({'done': True, 'conversation_id': convo.id, 'intent': result.get('intent'), 'escalated': result.get('should_escalate', False), 'ticket_id': result.get('ticket_id'), 'suggested_replies': result.get('suggested_replies', [])})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── GET /chat/conversations ────────────────────────────────────────────────────

@router.get("/conversations")
def list_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all conversations for the current user."""
    convos = db.query(Conversation).filter(
        Conversation.user_id == current_user.id
    ).order_by(Conversation.updated_at.desc()).limit(50).all()

    return [
        {
            "id": c.id,
            "status": c.status,
            "sentiment_score": c.sentiment_score,
            "created_at": c.created_at,
            "message_count": len(c.messages),
        }
        for c in convos
    ]


@router.get("/conversations/{conversation_id}", response_model=ConversationOut)
def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a full conversation with all messages."""
    convo = db.query(Conversation).filter(
        Conversation.id == conversation_id,
    ).first()

    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Customers can only see their own; support/admin can see all
    if current_user.role == "customer" and convo.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return convo
