"""
Resolution Agent — generates the final answer using LLM + RAG context + tool results.

This is the core response generation node. It:
1. Calls available support tools if the intent requires an action
2. Combines KB context + tool results + conversation history
3. Generates a complete, helpful response
4. Produces suggested follow-up replies
"""

import json
import time
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from backend.app.agents.state import SupportState
from backend.app.tools.support_tools import execute_support_tool
from backend.app.services.llm import get_llm

_RESOLUTION_SYSTEM_PROMPT = """You are an expert customer support AI agent.

Your goal is to RESOLVE the customer's issue completely in a single response.

Guidelines:
- Be warm, professional, and empathetic
- Get straight to the resolution — avoid filler phrases
- If a tool was executed, clearly state the result and next steps
- If using knowledge base info, integrate it naturally (don't mention "knowledge base")
- End with a confirmation question: "Did this solve your issue?"
- Keep responses under 200 words unless complexity requires more

Tone: Professional, warm, direct — like a knowledgeable friend at a company."""

_SUGGESTED_REPLIES_PROMPT = """Based on this support conversation, generate 3 short suggested follow-up replies the customer might send (5-10 words each). Return as JSON array of strings only."""

# Intent → tool mapping
INTENT_TO_TOOL = {
    "billing": None,          # KB lookup sufficient
    "refund": "process_refund",
    "technical": None,         # KB lookup sufficient
    "account": "reset_password",
    "security": None,          # Always escalate
    "general": None,
    "feature_request": None,
}

# Intents that may need tool execution
TOOL_REQUIRED_INTENTS = {"refund", "account"}


def _get_llm():
    return get_llm(temperature=0.7)


def resolution_agent_node(state: SupportState) -> dict:
    """LangGraph node: execute tools + generate resolution response."""
    start = time.time()

    intent = state.get("intent", "general")
    messages = state.get("messages", [])
    retrieved_context = state.get("retrieved_context") or ""
    entities = state.get("entities") or {}
    tools_executed = list(state.get("tools_executed") or [])

    # ── Step 1: Execute tool if applicable ────────────────────────────────────
    tool_result = None
    tool_name = INTENT_TO_TOOL.get(intent)
    if tool_name and intent in TOOL_REQUIRED_INTENTS:
        try:
            tool_result = execute_support_tool(tool_name, entities)
            tools_executed.append({
                "tool": tool_name,
                "input": entities,
                "result": tool_result,
            })
            print(f"[ResolutionAgent] Tool {tool_name} executed successfully")
        except Exception as e:
            print(f"[ResolutionAgent] Tool {tool_name} failed: {e}")
            tool_result = {"error": str(e)}

    # ── Step 2: Build LLM messages ────────────────────────────────────────────
    llm = _get_llm()
    lc_messages = [SystemMessage(content=_RESOLUTION_SYSTEM_PROMPT)]

    # Add KB context if available
    if retrieved_context:
        lc_messages.append(SystemMessage(
            content=f"[Knowledge Base Context — use this to form your answer:]\n{retrieved_context}"
        ))

    # Add tool result if available
    if tool_result and "error" not in tool_result:
        lc_messages.append(SystemMessage(
            content=f"[Tool Execution Result — {tool_name}:]\n{json.dumps(tool_result, indent=2)}"
        ))
    elif tool_result and "error" in tool_result:
        lc_messages.append(SystemMessage(
            content=f"[Tool {tool_name} failed: {tool_result['error']}. Acknowledge the issue and offer alternatives.]"
        ))

    # Add conversation history (last 10 messages)
    for msg in messages[-10:]:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role == "user":
            lc_messages.append(HumanMessage(content=content))
        elif role == "assistant":
            lc_messages.append(AIMessage(content=content))

    # ── Step 3: Generate response ─────────────────────────────────────────────
    try:
        response = llm.invoke(lc_messages)
        resolution = response.content
        successful = True
    except Exception as e:
        print(f"[ResolutionAgent] LLM call failed: {e}")
        resolution = "I'm sorry, I encountered a technical issue. Let me connect you with a support specialist who can help immediately."
        successful = False

    # ── Step 4: Generate suggested replies ────────────────────────────────────
    suggested_replies = []
    try:
        sr_response = llm.invoke([
            SystemMessage(content=_SUGGESTED_REPLIES_PROMPT),
            HumanMessage(content=f"Resolution: {resolution}"),
        ])
        raw = sr_response.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        suggested_replies = json.loads(raw)[:3]
    except Exception:
        suggested_replies = ["Yes, that solved it!", "I need more help", "Can I speak to a human?"]

    elapsed = time.time() - start
    print(f"[ResolutionAgent] Response generated ({elapsed*1000:.0f}ms)")

    return {
        "final_response": resolution,
        "resolution_response": resolution,
        "resolution_successful": successful,
        "tools_executed": tools_executed,
        "suggested_replies": suggested_replies,
        "tool_history": (state.get("tool_history") or []) + [{
            "agent": "resolution",
            "tool_executed": tool_name,
            "execution_time_ms": round(elapsed * 1000, 1),
        }],
    }
