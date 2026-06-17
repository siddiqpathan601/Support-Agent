"""
Escalation Agent — generates support tickets, summarizes conversations,
and prepares handoff packets for human agents.

Outputs:
  - ticket_id: created ticket ID
  - ticket_summary: AI-generated conversation summary
  - final_response: empathetic escalation message to customer
"""

import json
import time
import uuid
from langchain_core.messages import SystemMessage, HumanMessage
from backend.app.agents.state import SupportState
from backend.app.services.llm import get_llm_fast
from backend.config import GROQ_API_KEY, GROQ_MODEL

_SUMMARY_PROMPT = """You are a customer support supervisor. Summarize this conversation for a human agent who will take over.

Include:
1. Customer's core issue (1 sentence)
2. What was attempted (1-2 sentences)
3. Why escalation is happening
4. Suggested next steps for the human agent

Keep under 150 words. Be factual and helpful for the agent."""

_CATEGORY_PROMPT = """Classify this support ticket into one of:
billing, refund, technical, account, security, general, feature_request

Respond with ONLY the category name, nothing else."""

_PRIORITY_PROMPT = """Rate the priority of this support ticket:
- critical: security breach, system down, payment fraud, legal threat
- high: billing dispute, refund request, account locked, angry customer
- medium: technical issues, account questions, feature problems
- low: general questions, feature requests, positive feedback

Respond with ONLY: critical, high, medium, or low"""

_ESCALATION_RESPONSE = """You are an empathetic customer support agent handing off to a specialist.

Write a response that:
1. Acknowledges the customer's frustration/issue with genuine empathy
2. Explains that a specialist is being connected
3. Sets expectation: they'll receive a follow-up within [2 business hours / 1 business day]
4. Gives a ticket reference number
5. Ends warmly

Be warm, professional, and reassuring. Under 100 words."""


def _get_llm():
    return get_llm_fast(temperature=0.4)


def escalation_agent_node(state: SupportState) -> dict:
    """LangGraph node: generate ticket, summarize conversation, draft handoff message."""
    start = time.time()

    messages = state.get("messages", [])
    intent = state.get("intent", "general")
    escalation_reason = state.get("escalation_reason") or "Low confidence or sensitive issue"
    sentiment = state.get("sentiment", "neutral")

    # Format conversation for LLM
    convo_text = "\n".join(
        f"{m.get('role', 'user').upper()}: {m.get('content', '')}"
        for m in messages[-15:]
    )

    llm = _get_llm()

    # ── Generate summary ───────────────────────────────────────────────────────
    try:
        summary_resp = llm.invoke([
            SystemMessage(content=_SUMMARY_PROMPT),
            HumanMessage(content=f"Conversation:\n{convo_text}\n\nEscalation reason: {escalation_reason}"),
        ])
        ticket_summary = summary_resp.content.strip()
    except Exception as e:
        print(f"[EscalationAgent] Summary failed: {e}")
        ticket_summary = f"Customer issue ({intent}). Escalation reason: {escalation_reason}"

    # ── Classify category ─────────────────────────────────────────────────────
    try:
        cat_resp = llm.invoke([
            SystemMessage(content=_CATEGORY_PROMPT),
            HumanMessage(content=f"Issue: {ticket_summary}"),
        ])
        category = cat_resp.content.strip().lower()
        if category not in ["billing", "refund", "technical", "account", "security", "general", "feature_request"]:
            category = intent if intent != "general" else "general"
    except Exception:
        category = intent

    # ── Determine priority ────────────────────────────────────────────────────
    try:
        pri_resp = llm.invoke([
            SystemMessage(content=_PRIORITY_PROMPT),
            HumanMessage(content=f"Issue: {ticket_summary}\nSentiment: {sentiment}\nCategory: {category}"),
        ])
        priority = pri_resp.content.strip().lower()
        if priority not in ["critical", "high", "medium", "low"]:
            priority = "high" if sentiment in ["angry"] else "medium"
    except Exception:
        priority = "medium"

    # ── Generate ticket ID ─────────────────────────────────────────────────────
    ticket_id = f"TKT-{str(uuid.uuid4())[:8].upper()}"

    # ── Generate customer-facing escalation message ────────────────────────────
    try:
        msg_resp = llm.invoke([
            SystemMessage(content=_ESCALATION_RESPONSE),
            HumanMessage(content=(
                f"Ticket: {ticket_id}\n"
                f"Issue: {ticket_summary}\n"
                f"Sentiment: {sentiment}\n"
                f"Reason: {escalation_reason}"
            )),
        ])
        escalation_message = msg_resp.content.strip()
    except Exception:
        escalation_message = (
            f"I completely understand your frustration, and I sincerely apologize for the difficulty. "
            f"I'm connecting you with a specialist right now who can fully resolve this for you. "
            f"Your ticket reference is **{ticket_id}** — please keep this for your records. "
            f"You'll hear from us within 2 business hours. Thank you for your patience."
        )

    elapsed = time.time() - start
    print(f"[EscalationAgent] Ticket {ticket_id} created | priority={priority} ({elapsed*1000:.0f}ms)")

    return {
        "ticket_id": ticket_id,
        "ticket_summary": ticket_summary,
        "final_response": escalation_message,
        "should_escalate": True,
        "tool_history": (state.get("tool_history") or []) + [{
            "agent": "escalation",
            "ticket_id": ticket_id,
            "category": category,
            "priority": priority,
            "execution_time_ms": round(elapsed * 1000, 1),
        }],
        # Pass ticket metadata for the API layer to persist
        "_ticket_meta": {
            "ticket_id": ticket_id,
            "category": category,
            "priority": priority,
            "summary": ticket_summary,
            "escalation_reason": escalation_reason,
        }
    }
