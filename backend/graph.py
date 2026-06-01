"""
AstroAgent LangGraph workflow — powered by Google Gemini.

Graph structure:
    START → router_node → (conditional) → tool_node → agent_node → END
                                       ↘ agent_node → END

- router_node: classifies user intent via keyword heuristics
- tool_node: dispatches to the correct astrology tool
- agent_node: calls Gemini with full context (messages + tool output)
"""

from typing import Literal
import time
import json
import os
from datetime import date as date_module

from langgraph.graph import StateGraph, START, END
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from backend.state import AstroState
from backend.tools.astrology import (
    geocode_place,
    compute_birth_chart,
    get_daily_transits,
    knowledge_lookup,
)
from backend.config import GEMINI_API_KEY, GROQ_API_KEY

# ── System prompt ────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are Aradhana, a warm and thoughtful astrology companion. \
You help users understand their birth chart and daily planetary energies. \
Never make claims of medical, legal, or financial certainty. \
Always frame readings as reflection and guidance, not prediction.

When you have tool output data available, weave it naturally into your response. \
Explain planetary positions, signs, and aspects in an accessible, caring way. \
Use the person's name if you know it. \
If birth details are missing, gently ask for them before computing a chart.

When discussing transit aspects, explain what each aspect might mean for the \
person's day or week in terms of themes and energy — never as certainty.

Keep responses conversational but substantive (2-4 paragraphs for chart readings, \
1-2 paragraphs for quick questions). Use astrology emoji sparingly for warmth."""

# ── LLM instance (Gemini) ────────────────────────────────────────────────────

_llm = None


def _get_llm() -> ChatGroq:
    global _llm
    if _llm is None:
        _llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            api_key=GROQ_API_KEY,
        )
    return _llm


# ── Node: Router ─────────────────────────────────────────────────────────────

def router_node(state: AstroState) -> dict:
    """Classify the user's intent from the latest message."""
    start = time.time()

    messages = state.get("messages", [])
    if not messages:
        intent = "general"
    else:
        last_msg = messages[-1]
        content = (
            last_msg.get("content", "").lower()
            if isinstance(last_msg, dict)
            else getattr(last_msg, "content", "").lower()
        )

        # Keyword-based intent classification
        chart_kw = [
            "chart", "birth", "ascendant", "natal", "rising",
            "moon sign", "sun sign", "houses", "my chart",
        ]
        transit_kw = [
            "transit", "today", "current", "energy", "horoscope",
            "week", "forecast", "daily",
        ]
        knowledge_kw = [
            "what is", "explain", "meaning", "how does",
            "tell me about", "what does", "define",
        ]

        if any(kw in content for kw in chart_kw):
            intent = "birth_chart"
        elif any(kw in content for kw in transit_kw):
            intent = "daily_transit"
        elif any(kw in content for kw in knowledge_kw):
            intent = "astrology_question"
        else:
            intent = "general"

    elapsed = time.time() - start
    print(f"[AstroAgent Router] Intent: '{intent}' ({elapsed * 1000:.1f}ms)")
    return {"current_intent": intent}


# ── Edge: Decider ────────────────────────────────────────────────────────────

def decider_edge(state: AstroState) -> Literal["tool_node", "agent_node"]:
    intent = state.get("current_intent")
    if intent in ("birth_chart", "daily_transit", "astrology_question"):
        return "tool_node"
    return "agent_node"


# ── Node: Tool ───────────────────────────────────────────────────────────────

def tool_node(state: AstroState) -> dict:
    """Execute the appropriate tool based on the classified intent."""
    start = time.time()
    intent = state.get("current_intent")
    tool_output = {}
    error = None
    selected_tool = None

    try:
        if intent == "birth_chart":
            selected_tool = "compute_birth_chart"
            birth = state.get("birth_details") or {}
            place = birth.get("place", "")
            date_str = birth.get("date", "")
            time_str = birth.get("time", "12:00")

            if not place:
                error = "I need your place of birth to compute your chart. Could you share it?"
            elif not date_str:
                error = "I need your date of birth (YYYY-MM-DD) to compute your chart."
            else:
                chart = compute_birth_chart(date_str, time_str, place)
                tool_output = {"chart": chart}

        elif intent == "daily_transit":
            selected_tool = "get_daily_transits"
            today = date_module.today().isoformat()

            # If we have natal positions, pass them for aspect calculation
            natal = None
            birth = state.get("birth_details") or {}
            if birth.get("place") and birth.get("date"):
                try:
                    chart = compute_birth_chart(
                        birth["date"],
                        birth.get("time", "12:00"),
                        birth["place"],
                    )
                    natal = chart.get("planets")
                except Exception:
                    natal = None

            tool_output = get_daily_transits(today, natal)

        elif intent == "astrology_question":
            selected_tool = "knowledge_lookup"
            msgs = state.get("messages", [])
            last_msg = msgs[-1] if msgs else {}
            query = (
                last_msg.get("content", "")
                if isinstance(last_msg, dict)
                else getattr(last_msg, "content", "")
            )
            tool_output = {"reference": knowledge_lookup(query)}

    except Exception as e:
        error = f"Tool error: {str(e)}"

    elapsed = time.time() - start
    print(
        f"[AstroAgent Tool] tool={selected_tool} "
        f"error={error} ({elapsed * 1000:.1f}ms)"
    )

    history_entry = {
        "tool": selected_tool,
        "output": tool_output,
        "error": error,
        "execution_time_ms": round(elapsed * 1000, 1),
    }
    current_history = list(state.get("tool_history") or [])
    current_history.append(history_entry)

    return {
        "tool_output": tool_output,
        "tool_history": current_history,
        "error": error,
    }


# ── Node: Agent (Gemini LLM) ────────────────────────────────────────────────

def agent_node(state: AstroState) -> dict:
    """Generate the final response using a real Gemini LLM call."""
    start = time.time()
    llm = _get_llm()

    # ── Build LLM message list ───────────────────────────────────────
    lc_messages = [SystemMessage(content=SYSTEM_PROMPT)]

    # Include birth details context if available
    birth = state.get("birth_details")
    if birth:
        context = (
            f"[User birth details: Name={birth.get('name', 'unknown')}, "
            f"Date={birth.get('date', 'unknown')}, "
            f"Time={birth.get('time', 'unknown')}, "
            f"Place={birth.get('place', 'unknown')}]"
        )
        lc_messages.append(SystemMessage(content=context))

    # Add conversation history
    for msg in state.get("messages", []):
        role = (
            msg.get("role", "user")
            if isinstance(msg, dict)
            else getattr(msg, "role", "user")
        )
        content = (
            msg.get("content", "")
            if isinstance(msg, dict)
            else getattr(msg, "content", "")
        )
        if role == "user":
            lc_messages.append(HumanMessage(content=content))
        elif role == "assistant":
            lc_messages.append(AIMessage(content=content))

    # Inject tool output as context
    tool_output = state.get("tool_output") or {}
    error = state.get("error")

    if error:
        lc_messages.append(
            SystemMessage(
                content=(
                    f"[Tool execution resulted in an error: {error}. "
                    f"Respond helpfully — ask the user for the missing info "
                    f"or explain the issue gently.]"
                )
            )
        )
    elif tool_output:
        tool_json = json.dumps(tool_output, indent=2, default=str)
        lc_messages.append(
            SystemMessage(
                content=(
                    f"[Tool output — use this data to form your response. "
                    f"Weave it naturally into a warm, informative reading:]\n"
                    f"{tool_json}"
                )
            )
        )

    # ── Call Gemini ──────────────────────────────────────────────────
    try:
        response = llm.invoke(lc_messages)
        response_content = response.content
    except Exception as e:
        print(f"[AstroAgent Agent] Gemini call failed: {e}")
        response_content = _fallback_response(state)

    elapsed = time.time() - start
    print(f"[AstroAgent Agent] Gemini response generated ({elapsed * 1000:.1f}ms)")

    new_message = {"role": "assistant", "content": response_content}
    return {
        "messages": state.get("messages", []) + [new_message],
    }


def _fallback_response(state: AstroState) -> str:
    """Generate a fallback response when the LLM is unavailable."""
    intent = state.get("current_intent", "general")
    tool_output = state.get("tool_output") or {}
    error = state.get("error")

    if error:
        return (
            f"I encountered an issue while consulting the cosmos: {error}. "
            f"Could you try rephrasing or providing more details?"
        )

    if intent == "birth_chart" and tool_output.get("chart"):
        chart = tool_output["chart"]
        planets = chart.get("planets", {})
        asc = chart.get("ascendant", {})
        parts = ["Here is your birth chart:"]
        if asc:
            parts.append(
                f"☀ Ascendant: {asc.get('sign', '?')} ({asc.get('degree', '?')}°)"
            )
        for pname, pdata in planets.items():
            if isinstance(pdata, dict):
                parts.append(
                    f"  {pname.capitalize()}: {pdata.get('sign', '?')} "
                    f"({pdata.get('degree', '?')}°)"
                )
        return "\n".join(parts)

    if intent == "daily_transit":
        positions = tool_output.get("transit_positions", {})
        parts = ["Today's planetary positions:"]
        for pname, pdata in positions.items():
            if isinstance(pdata, dict):
                parts.append(
                    f"  {pname.capitalize()}: {pdata.get('sign', '?')} "
                    f"({pdata.get('degree', '?')}°)"
                )
        return "\n".join(parts)

    return (
        "Namaste! I am Aradhana, your astrology companion. "
        "Share your birth details and I'll compute your natal chart, "
        "or ask me about today's cosmic energies!"
    )


# ── Graph assembly ───────────────────────────────────────────────────────────

workflow = StateGraph(AstroState)
workflow.add_node("router_node", router_node)
workflow.add_node("tool_node", tool_node)
workflow.add_node("agent_node", agent_node)

workflow.add_edge(START, "router_node")
workflow.add_conditional_edges(
    "router_node",
    decider_edge,
    {"tool_node": "tool_node", "agent_node": "agent_node"},
)
workflow.add_edge("tool_node", "agent_node")
workflow.add_edge("agent_node", END)

app_graph = workflow.compile()
