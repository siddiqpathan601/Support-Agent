"""
Tickets API — CRUD for support tickets.

Roles:
  support/admin: read all, update, assign
  customer: read own tickets only
"""

from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.models.db import get_db
from backend.app.models.ticket import Ticket, TicketStatus, TicketPriority
from backend.app.models.user import User
from backend.app.models.schemas import TicketOut, UpdateTicketRequest
from backend.app.services.auth import get_current_user, require_support

router = APIRouter(prefix="/tickets", tags=["Tickets"])


@router.get("", response_model=List[TicketOut])
def list_tickets(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List tickets.
    - customers see only their own tickets
    - support/admin see all tickets with filtering
    """
    query = db.query(Ticket)

    if current_user.role == "customer":
        query = query.filter(Ticket.user_id == current_user.id)

    if status:
        query = query.filter(Ticket.status == status)
    if priority:
        query = query.filter(Ticket.priority == priority)
    if category:
        query = query.filter(Ticket.category == category)

    tickets = query.order_by(Ticket.created_at.desc()).offset(offset).limit(limit).all()
    return tickets


@router.get("/{ticket_id}", response_model=TicketOut)
def get_ticket(
    ticket_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if current_user.role == "customer" and ticket.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return ticket


@router.patch("/{ticket_id}", response_model=TicketOut)
def update_ticket(
    ticket_id: str,
    request: UpdateTicketRequest,
    current_user: User = Depends(require_support),
    db: Session = Depends(get_db),
):
    """Update ticket status, priority, assignment, or resolution notes."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if request.status:
        ticket.status = request.status
        if request.status == "resolved":
            ticket.resolved_at = datetime.utcnow()

    if request.priority:
        ticket.priority = request.priority

    if request.assigned_to:
        # Verify assignee exists and is support/admin
        assignee = db.query(User).filter(
            User.id == request.assigned_to,
            User.role.in_(["support", "admin"])
        ).first()
        if not assignee:
            raise HTTPException(status_code=400, detail="Invalid assignee — must be support staff")
        ticket.assigned_to = request.assigned_to

    if request.resolution_notes:
        ticket.resolution_notes = request.resolution_notes

    ticket.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(ticket)
    return ticket


@router.get("/stats/summary")
def ticket_stats(
    current_user: User = Depends(require_support),
    db: Session = Depends(get_db),
):
    """Return ticket counts by status."""
    statuses = [s.value for s in TicketStatus]
    result = {}
    for s in statuses:
        result[s] = db.query(Ticket).filter(Ticket.status == s).count()
    result["total"] = db.query(Ticket).count()
    return result
