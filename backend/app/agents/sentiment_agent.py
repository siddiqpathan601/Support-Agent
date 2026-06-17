"""
Sentiment Agent — detects customer emotional state and escalates on high negativity.

Outputs:
  - sentiment: angry | frustrated | neutral | happy
  - sentiment_score: float -1.0 to 1.0
  - should_escalate: True if sentiment is critically negative
"""

import time
from langchain_core.messages import SystemMessage, HumanMessage
from backend.app.agents.state import SupportState
from backend.app.services.llm import get_llm_fast

_SENTIMENT_PROMPT = """You are a sentiment analysis expert for customer support.

Analyze the latest customer message and respond with ONLY a JSON object:
{
  "sentiment": "angry" | "frustrated" | "neutral" | "happy",
  "score": <float -1.0 to 1.0>,
  "escalate_immediately": <true if customer is extremely angry, threatening, or abusive>
}

Scoring guide:
- angry: score -0.8 to -1.0 (profanity, threats, ALL CAPS, very hostile)
- frustrated: score -0.3 to -0.7 (multiple complaints, giving up, very disappointed)
- neutral: score -0.2 to 0.2 (factual, calm, just asking)
- happy: score 0.3 to 1.0 (grateful, pleased, positive)

Respond ONLY with valid JSON."""


def _get_llm():
    return get_llm_fast(temperature=0.1)


def sentiment_agent_node(state: SupportState) -> dict:
    """LangGraph node: detect sentiment and flag for immediate escalation."""
    start = time.time()

    messages = state.get("messages", [])
    if not messages:
        return {"sentiment": "neutral", "sentiment_score": 0.0}

    # Focus on the latest user message
    latest_user_msg = ""
    for msg in reversed(messages):
        if msg.get("role") == "user":
            latest_user_msg = msg.get("content", "")
            break

    if not latest_user_msg:
        return {"sentiment": "neutral", "sentiment_score": 0.0}

    try:
        import json
        llm = _get_llm()
        response = llm.invoke([
            SystemMessage(content=_SENTIMENT_PROMPT),
            HumanMessage(content=f"Customer message: {latest_user_msg}"),
        ])

        raw = response.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        result = json.loads(raw)
        sentiment = result.get("sentiment", "neutral")
        score = float(result.get("score", 0.0))
        escalate_immediately = result.get("escalate_immediately", False)

    except Exception as e:
        print(f"[SentimentAgent] Failed: {e}")
        sentiment = "neutral"
        score = 0.0
        escalate_immediately = False

    elapsed = time.time() - start
    print(f"[SentimentAgent] sentiment={sentiment} score={score:.2f} ({elapsed*1000:.0f}ms)")

    # Override escalation if sentiment demands it
    current_escalate = state.get("should_escalate", False)
    should_escalate = current_escalate or escalate_immediately

    return {
        "sentiment": sentiment,
        "sentiment_score": score,
        "should_escalate": should_escalate,
        "escalation_reason": (
            "Customer sentiment is critically negative — immediate escalation required."
            if escalate_immediately else state.get("escalation_reason")
        ),
        "tool_history": (state.get("tool_history") or []) + [{
            "agent": "sentiment",
            "sentiment": sentiment,
            "score": score,
            "execution_time_ms": round(elapsed * 1000, 1),
        }],
    }
