"""
Admin Dashboard API — analytics and metrics.
All endpoints require admin role.
"""

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.models.db import get_db
from backend.app.models.conversation import Conversation, Message, ConversationStatus
from backend.app.models.ticket import Ticket, TicketStatus
from backend.app.models.user import User
from backend.app.models.schemas import DashboardMetrics, IntentDistribution
from backend.app.services.auth import require_support

router = APIRouter(prefix="/dashboard", tags=["Analytics"])


@router.get("/metrics", response_model=DashboardMetrics)
def get_metrics(
    current_user: User = Depends(require_support),
    db: Session = Depends(get_db),
):
    """Return key support metrics."""
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    tickets_today = db.query(Ticket).filter(Ticket.created_at >= today).count()
    open_tickets = db.query(Ticket).filter(Ticket.status == TicketStatus.OPEN).count()
    resolved_tickets = db.query(Ticket).filter(Ticket.status == TicketStatus.RESOLVED).count()
    total_tickets = db.query(Ticket).count()

    escalation_rate = round(total_tickets / max(db.query(Conversation).count(), 1), 3)

    # Avg resolution time (tickets with resolved_at)
    resolved_with_time = db.query(Ticket).filter(Ticket.resolved_at.isnot(None)).all()
    if resolved_with_time:
        total_minutes = sum(
            (t.resolved_at - t.created_at).total_seconds() / 60
            for t in resolved_with_time
        )
        avg_resolution = round(total_minutes / len(resolved_with_time), 1)
    else:
        avg_resolution = 0.0

    # AI success = conversations resolved without escalation / total conversations
    total_convos = db.query(Conversation).count()
    resolved_convos = db.query(Conversation).filter(
        Conversation.status == ConversationStatus.RESOLVED
    ).count()
    ai_success_rate = round(resolved_convos / max(total_convos, 1), 3)

    return DashboardMetrics(
        tickets_today=tickets_today,
        open_tickets=open_tickets,
        resolved_tickets=resolved_tickets,
        escalation_rate=escalation_rate,
        avg_resolution_time_minutes=avg_resolution,
        ai_success_rate=ai_success_rate,
        customer_satisfaction=4.2,  # Placeholder — integrate CSAT survey later
        total_conversations=total_convos,
    )


@router.get("/intent-distribution")
def intent_distribution(
    days: int = Query(7, le=90),
    current_user: User = Depends(require_support),
    db: Session = Depends(get_db),
):
    """Return intent distribution over the last N days."""
    since = datetime.utcnow() - timedelta(days=days)

    rows = (
        db.query(Message.intent, func.count(Message.id))
        .filter(Message.timestamp >= since, Message.intent.isnot(None))
        .group_by(Message.intent)
        .all()
    )

    total = sum(count for _, count in rows)
    return [
        IntentDistribution(
            intent=intent or "unknown",
            count=count,
            percentage=round(count / max(total, 1) * 100, 1),
        )
        for intent, count in sorted(rows, key=lambda x: x[1], reverse=True)
    ]


@router.get("/recent-tickets")
def recent_tickets(
    limit: int = Query(10, le=50),
    current_user: User = Depends(require_support),
    db: Session = Depends(get_db),
):
    """Return most recent tickets with basic info."""
    tickets = db.query(Ticket).order_by(Ticket.created_at.desc()).limit(limit).all()
    return [
        {
            "id": t.id,
            "title": t.title,
            "category": t.category,
            "priority": t.priority,
            "status": t.status,
            "created_at": t.created_at,
        }
        for t in tickets
    ]


@router.get("/live-conversations")
def live_conversations(
    current_user: User = Depends(require_support),
    db: Session = Depends(get_db),
):
    """Return active/escalated conversations for the live dashboard."""
    convos = db.query(Conversation).filter(
        Conversation.status.in_([ConversationStatus.ACTIVE, ConversationStatus.ESCALATED])
    ).order_by(Conversation.updated_at.desc()).limit(20).all()

    return [
        {
            "id": c.id,
            "user_id": c.user_id,
            "status": c.status,
            "sentiment_score": c.sentiment_score,
            "message_count": len(c.messages),
            "updated_at": c.updated_at,
        }
        for c in convos
    ]
