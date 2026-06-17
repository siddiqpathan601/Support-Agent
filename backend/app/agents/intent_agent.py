"""
Intent Agent — classifies customer intent and extracts entities.

Outputs:
  - intent: one of 7 categories
  - entities: extracted named entities
  - confidence: 0.0–1.0 score
"""

import json
import time
from typing import Optional

from langchain_core.messages import SystemMessage, HumanMessage
from backend.app.agents.state import SupportState
from backend.app.services.llm import get_llm_fast
from backend.config import CONFIDENCE_THRESHOLD

_INTENT_PROMPT = """You are an expert customer support intent classifier.

Analyze the customer's message and return a JSON object with:
- "intent": one of [billing, refund, technical, account, security, general, feature_request]
- "confidence": a float between 0.0 and 1.0 representing how confident you are
- "entities": key named entities extracted (e.g. order_id, product_name, amount)
- "reasoning": one sentence explaining your classification

Intent definitions:
- billing: questions about invoices, charges, pricing, subscriptions, payment methods
- refund: requests for money back, dispute charges, return items
- technical: bugs, errors, outages, feature not working, performance issues
- account: password reset, login issues, profile changes, 2FA, account deletion
- security: suspected hack, unauthorized access, fraud, phishing, data breach
- general: FAQs, product info, how-to questions, general inquiries
- feature_request: asking for new features, improvements, roadmap items

Escalation triggers (lower confidence if present):
- User is angry or uses profanity
- Mentions legal action or regulators
- Multiple failed previous attempts mentioned
- Security or fraud concern

Respond ONLY with valid JSON. No markdown, no explanation outside JSON."""


def _get_llm():
    """Return LLM from the central factory (xAI Grok or Groq)."""
    return get_llm_fast(temperature=0.1)


def intent_agent_node(state: SupportState) -> dict:
    """LangGraph node: classify intent + extract entities + compute confidence."""
    start = time.time()

    messages = state.get("messages", [])
    if not messages:
        return {
            "intent": "general",
            "confidence": 0.5,
            "entities": {},
            "should_escalate": False,
        }

    # Build conversation context for classification (last 5 messages)
    recent = messages[-5:]
    conversation_text = "\n".join(
        f"{m.get('role', 'user').upper()}: {m.get('content', '')}"
        for m in recent
    )

    try:
        llm = _get_llm()
        response = llm.invoke([
            SystemMessage(content=_INTENT_PROMPT),
            HumanMessage(content=f"Conversation:\n{conversation_text}"),
        ])

        raw = response.content.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        result = json.loads(raw)

        intent = result.get("intent", "general")
        confidence = float(result.get("confidence", 0.7))
        entities = result.get("entities", {})

    except Exception as e:
        print(f"[IntentAgent] Classification failed: {e}")
        intent = "general"
        confidence = 0.5
        entities = {}

    # Determine if we should escalate based on confidence threshold
    should_escalate = confidence < CONFIDENCE_THRESHOLD or intent == "security"

    elapsed = time.time() - start
    print(f"[IntentAgent] intent={intent} confidence={confidence:.2f} ({elapsed*1000:.0f}ms)")

    return {
        "intent": intent,
        "confidence": confidence,
        "entities": entities,
        "should_escalate": should_escalate,
        "tool_history": (state.get("tool_history") or []) + [{
            "agent": "intent",
            "intent": intent,
            "confidence": confidence,
            "execution_time_ms": round(elapsed * 1000, 1),
        }],
    }
