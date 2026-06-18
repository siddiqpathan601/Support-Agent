"""
Master LangGraph workflow for the Autonomous Customer Support Agent.

Graph structure:
    START
      → intent_agent_node
      → sentiment_agent_node
      → [conditional: should_escalate?]
          ├─ YES → escalation_agent_node → END
          └─ NO  → knowledge_agent_node
                   → resolution_agent_node → END
"""

from typing import Literal
from langgraph.graph import StateGraph, START, END

from backend.app.agents.state import SupportState
from backend.app.agents.intent_agent import intent_agent_node
from backend.app.agents.sentiment_agent import sentiment_agent_node
from backend.app.agents.knowledge_agent import knowledge_agent_node
from backend.app.agents.resolution_agent import resolution_agent_node
from backend.app.agents.escalation_agent import escalation_agent_node


# ── Routing edge ──────────────────────────────────────────────────────────────

def route_after_sentiment(
    state: SupportState,
) -> Literal["knowledge_agent_node", "escalation_agent_node"]:
    """
    After sentiment analysis, decide whether to:
    - Proceed to knowledge retrieval + resolution (confidence ≥ threshold, non-sensitive)
    - Immediately escalate (low confidence, security, angry customer)
    """
    if state.get("should_escalate"):
        print("[SupportGraph] Routing -> ESCALATE")
        return "escalation_agent_node"
    print("[SupportGraph] Routing -> RESOLVE")
    return "knowledge_agent_node"


# ── Graph assembly ─────────────────────────────────────────────────────────────

workflow = StateGraph(SupportState)

# Register all nodes
workflow.add_node("intent_agent_node", intent_agent_node)
workflow.add_node("sentiment_agent_node", sentiment_agent_node)
workflow.add_node("knowledge_agent_node", knowledge_agent_node)
workflow.add_node("resolution_agent_node", resolution_agent_node)
workflow.add_node("escalation_agent_node", escalation_agent_node)

# Define edges
workflow.add_edge(START, "intent_agent_node")
workflow.add_edge("intent_agent_node", "sentiment_agent_node")
workflow.add_conditional_edges(
    "sentiment_agent_node",
    route_after_sentiment,
    {
        "knowledge_agent_node": "knowledge_agent_node",
        "escalation_agent_node": "escalation_agent_node",
    },
)
workflow.add_edge("knowledge_agent_node", "resolution_agent_node")
workflow.add_edge("resolution_agent_node", END)
workflow.add_edge("escalation_agent_node", END)

# Compile the graph
support_graph = workflow.compile()


def build_initial_state(
    message: str,
    conversation_id: str | None = None,
    user_id: str | None = None,
    history: list | None = None,
    resolution_attempts: int = 0,
) -> SupportState:
    """Construct a fresh SupportState for a new message."""
    messages = list(history or [])
    messages.append({"role": "user", "content": message})

    return SupportState(
        conversation_id=conversation_id,
        user_id=user_id,
        messages=messages,
        intent=None,
        entities=None,
        confidence=None,
        sentiment=None,
        sentiment_score=None,
        retrieved_context=None,
        resolution_response=None,
        tools_executed=[],
        resolution_successful=None,
        should_escalate=False,
        escalation_reason=None,
        ticket_id=None,
        ticket_summary=None,
        _ticket_meta=None,
        final_response=None,
        suggested_replies=[],
        tool_history=[],
        error=None,
        resolution_attempts=resolution_attempts,
    )
