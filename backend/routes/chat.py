"""
API routes for AstroAgent chat — both sync and streaming (SSE) endpoints.
Powered by Google Gemini via langchain-google-genai.
"""

import json
import time
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from backend.graph import app_graph, SYSTEM_PROMPT, _get_llm
from backend.config import GEMINI_API_KEY

router = APIRouter()

# ── Request / Response models ────────────────────────────────────────────────


class ChatRequest(BaseModel):
    message: str
    birth_details: Optional[Dict[str, Any]] = None
    history: Optional[List[Dict[str, str]]] = None


class ChatResponse(BaseModel):
    response: str
    intent: Optional[str] = None
    error: Optional[str] = None
    tool_history: Optional[List[Dict[str, Any]]] = None


# ── POST /chat — synchronous endpoint ───────────────────────────────────────


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    messages = list(request.history or [])
    messages.append({"role": "user", "content": request.message})

    initial_state = {
        "messages": messages,
        "birth_details": request.birth_details,
        "tool_history": [],
        "tool_output": {},
        "current_intent": None,
        "user_context": {},
        "error": None,
    }

    result = await app_graph.ainvoke(initial_state)

    all_messages = result.get("messages", [])
    if all_messages:
        last_msg = all_messages[-1]
        response_content = (
            last_msg.get("content", "")
            if isinstance(last_msg, dict)
            else getattr(last_msg, "content", "")
        )
    else:
        response_content = "No response from Aradhana."

    return ChatResponse(
        response=response_content,
        intent=result.get("current_intent"),
        error=result.get("error"),
        tool_history=result.get("tool_history"),
    )


# ── POST /stream — SSE streaming endpoint ───────────────────────────────────


@router.post("/stream")
async def stream_chat(request: ChatRequest):
    """
    Stream the agent's response as Server-Sent Events (SSE).

    Event types:
        data: {"tool_call": {...}}   — tool activity info
        data: {"token": "..."}       — streamed Gemini token
        data: {"done": true}         — stream complete
        data: {"error": "..."}       — error event
    """

    async def event_generator():
        try:
            # ── Step 1: Run router + tool nodes via the graph ────────
            messages = list(request.history or [])
            messages.append({"role": "user", "content": request.message})

            initial_state = {
                "messages": messages,
                "birth_details": request.birth_details,
                "tool_history": [],
                "tool_output": {},
                "current_intent": None,
                "user_context": {},
                "error": None,
            }

            # Run graph to get tool outputs (the agent_node will also run,
            # but we'll re-stream the LLM for token-level output)
            result = await app_graph.ainvoke(initial_state)

            # Emit tool call events
            tool_history = result.get("tool_history") or []
            for entry in tool_history:
                tool_data = {
                    "tool_call": {
                        "name": entry.get("tool", "unknown"),
                        "input": _summarize_input(entry, request.birth_details),
                        "output_summary": _summarize_output(
                            entry.get("output", {})
                        ),
                        "ms": entry.get("execution_time_ms", 0),
                        "error": entry.get("error"),
                    }
                }
                yield f"data: {json.dumps(tool_data)}\n\n"

            # ── Step 2: Stream the Gemini response ───────────────────
            llm = _get_llm()

            lc_messages = [SystemMessage(content=SYSTEM_PROMPT)]

            birth = request.birth_details
            if birth:
                ctx = (
                    f"[User birth details: Name={birth.get('name', 'unknown')}, "
                    f"Date={birth.get('date', 'unknown')}, "
                    f"Time={birth.get('time', 'unknown')}, "
                    f"Place={birth.get('place', 'unknown')}]"
                )
                lc_messages.append(SystemMessage(content=ctx))

            for msg in messages:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if role == "user":
                    lc_messages.append(HumanMessage(content=content))
                elif role == "assistant":
                    lc_messages.append(AIMessage(content=content))

            # Inject tool output
            tool_output = result.get("tool_output") or {}
            error = result.get("error")

            if error:
                lc_messages.append(
                    SystemMessage(
                        content=f"[Tool error: {error}. Respond helpfully.]"
                    )
                )
            elif tool_output:
                tool_json = json.dumps(tool_output, indent=2, default=str)
                lc_messages.append(
                    SystemMessage(
                        content=(
                            f"[Tool output — weave into your warm response:]\n"
                            f"{tool_json}"
                        )
                    )
                )

            # Stream tokens from Gemini
            async for chunk in llm.astream(lc_messages):
                token = chunk.content
                if token:
                    yield f"data: {json.dumps({'token': token})}\n\n"

            yield f"data: {json.dumps({'done': True})}\n\n"

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


# ── Helpers ──────────────────────────────────────────────────────────────────


def _summarize_input(entry: dict, birth_details: Optional[dict]) -> dict:
    tool = entry.get("tool", "")
    if tool == "compute_birth_chart" and birth_details:
        return {
            "date": birth_details.get("date", ""),
            "time": birth_details.get("time", ""),
            "place": birth_details.get("place", ""),
        }
    elif tool == "get_daily_transits":
        return {"date": "today"}
    elif tool == "knowledge_lookup":
        return {"query": "(user question)"}
    return {}


def _summarize_output(output: dict) -> str:
    if not output:
        return "No output"
    if "chart" in output:
        chart = output["chart"]
        planets = chart.get("planets", {})
        sun = planets.get("sun", {})
        moon = planets.get("moon", {})
        asc = chart.get("ascendant", {})
        return (
            f"Sun in {sun.get('sign', '?')}, "
            f"Moon in {moon.get('sign', '?')}, "
            f"Ascendant in {asc.get('sign', '?')}"
        )
    if "transit_positions" in output:
        n = output.get("aspect_count", 0)
        return f"Transit positions computed, {n} aspects found"
    if "reference" in output:
        ref = output["reference"]
        return ref[:120] + "..." if len(ref) > 120 else ref
    return str(output)[:150]
