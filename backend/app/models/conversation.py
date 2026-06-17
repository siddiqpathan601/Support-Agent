"""Conversation and Message ORM models."""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, Text, Float
from sqlalchemy.orm import relationship
import enum
import uuid

from backend.app.models.db import Base


class ConversationStatus(str, enum.Enum):
    ACTIVE = "active"
    ESCALATED = "escalated"
    RESOLVED = "resolved"
    CLOSED = "closed"


class MessageSender(str, enum.Enum):
    USER = "user"
    AGENT = "agent"
    SYSTEM = "system"
    SUPPORT_STAFF = "support_staff"


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    status = Column(Enum(ConversationStatus), default=ConversationStatus.ACTIVE)
    channel = Column(String, default="web")  # web, email, api
    sentiment_score = Column(Float, nullable=True)   # -1.0 (angry) to 1.0 (happy)
    confidence_score = Column(Float, nullable=True)  # last agent confidence
    resolution_attempts = Column(String, default="0")
    assigned_to = Column(String, ForeignKey("users.id"), nullable=True)  # support staff
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", order_by="Message.timestamp")
    ticket = relationship("Ticket", back_populates="conversation", uselist=False)


class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False, index=True)
    sender = Column(Enum(MessageSender), nullable=False)
    sender_id = Column(String, nullable=True)   # user_id or staff_id
    content = Column(Text, nullable=False)
    intent = Column(String, nullable=True)      # classified intent
    confidence = Column(Float, nullable=True)   # intent confidence
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    is_seen = Column(String, default="false")   # JSON bool as string for SQLite compat

    # Relationship
    conversation = relationship("Conversation", back_populates="messages")
