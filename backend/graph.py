from typing import Literal
import time
from langgraph.graph import StateGraph, START, END
from backend.state import AstroState
from backend.tools.astrology import geocode_place, compute_birth_chart, get_daily_transits, knowledge_lookup

def router_node(state: AstroState) -> dict:
    start_time = time.time()
    
    messages = state.get("messages", [])
    if not messages:
        intent = "general"
    else:
        last_msg = messages[-1]
        content = last_msg.get("content", "").lower() if isinstance(last_msg, dict) else getattr(last_msg, "content", "").lower()
        
        if "chart" in content or "birth" in content or "ascendant" in content or "natal" in content:
            intent = "birth_chart"
        elif "transit" in content or "today" in content or "current" in content or "energy" in content or "horoscope" in content:
            intent = "daily_transit"
        elif "what is" in content or "explain" in content or "meaning" in content or "how does" in content:
            intent = "astrology_question"
        else:
            intent = "general"
            
    execution_time = time.time() - start_time
    print(f"[AstroAgent Router] Intent Classified: '{intent}' (Time: {execution_time*1000:.2f}ms)")
    
    return {
        "current_intent": intent
    }

def decider_edge(state: AstroState) -> Literal["tool_node", "agent_node"]:
    intent = state.get("current_intent")
    if intent in ["birth_chart", "daily_transit", "astrology_question"]:
        return "tool_node"
    return "agent_node"

def tool_node(state: AstroState) -> dict:
    start_time = time.time()
    intent = state.get("current_intent")
    tool_output = {}
    error = None
    selected_tool = None
    
    try:
        if intent == "birth_chart":
            selected_tool = "compute_birth_chart"
            birth_details = state.get("birth_details")
            if not birth_details or not birth_details.get("place"):
                error = "Missing birth details (place is required to calculate birth chart)"
            else:
                geo = geocode_place(birth_details["place"])
                chart = compute_birth_chart()
                tool_output = {
                    "geocode": geo,
                    "chart": chart
                }
        elif intent == "daily_transit":
            selected_tool = "get_daily_transits"
            tool_output = get_daily_transits()
        elif intent == "astrology_question":
            selected_tool = "knowledge_lookup"
            messages = state.get("messages", [])
            last_msg = messages[-1]
            content = last_msg.get("content", "") if isinstance(last_msg, dict) else getattr(last_msg, "content", "")
            tool_output = {
                "reference": knowledge_lookup(content)
            }
    except Exception as e:
        error = f"Tool failure: {str(e)}"
        
    execution_time = time.time() - start_time
    print(f"[AstroAgent Tool Node] Selected Tool: '{selected_tool}' | Output: {tool_output} | Error: {error} | Time: {execution_time*1000:.2f}ms")
    
    history_entry = {
        "tool": selected_tool,
        "output": tool_output,
        "error": error,
        "execution_time_ms": execution_time * 1000
    }
    
    current_history = list(state.get("tool_history") or [])
    current_history.append(history_entry)
    
    return {
        "tool_output": tool_output,
        "tool_history": current_history,
        "error": error
    }

def agent_node(state: AstroState) -> dict:
    start_time = time.time()
    intent = state.get("current_intent")
    tool_output = state.get("tool_output") or {}
    error = state.get("error")
    
    response_content = ""
    
    if error:
        response_content = f"Sorry, I encountered an error while consulting the cosmos: {error}."
    elif intent == "birth_chart":
        chart = tool_output.get("chart", {})
        geo = tool_output.get("geocode", {})
        response_content = (
            f"I have cast your celestial birth chart for **{state.get('birth_details', {}).get('place')}** "
            f"({geo.get('lat')}°N, {geo.get('lon')}°E, {geo.get('timezone')}):\n\n"
            f"☀️ **Sun**: {chart.get('sun')}\n"
            f"🌙 **Moon**: {chart.get('moon')}\n"
            f"✨ **Ascendant**: {chart.get('ascendant')}\n\n"
            f"This mock chart shows a powerful configuration. Having your Sun in {chart.get('sun')} "
            f"gives you strong drive, while Moon in {chart.get('moon')} adds emotional depth."
        )
    elif intent == "daily_transit":
        response_content = (
            "Here is the cosmic energy report for today's planetary transits:\n\n"
            f"♀️ **Venus**: {tool_output.get('venus')}\n"
            f"♂️ **Mars**: {tool_output.get('mars')}\n\n"
            "Venus in Taurus highlights grounded, affectionate relationships, while Mars in Gemini "
            "adds a spark of energetic, communicative curiosity to daily projects."
        )
    elif intent == "astrology_question":
        ref = tool_output.get("reference", "")
        response_content = (
            f"Consulting the astrological archives on your query, here is what I found:\n\n"
            f"*{ref}*\n\n"
            "Is there a specific chart placement or alignment you would like me to compare this to?"
        )
    else:  # general
        response_content = (
            "Greetings! I am AstroAgent. I can compute your birth chart, provide daily transits, "
            "or answer astrology questions. Try asking about your chart or today's energy!"
        )
        
    execution_time = time.time() - start_time
    print(f"[AstroAgent Agent Node] Response generated (Time: {execution_time*1000:.2f}ms)")
    
    new_message = {
        "role": "assistant",
        "content": response_content
    }
    
    return {
        "messages": state.get("messages", []) + [new_message]
    }

# Assemble StateGraph
workflow = StateGraph(AstroState)
workflow.add_node("router_node", router_node)
workflow.add_node("tool_node", tool_node)
workflow.add_node("agent_node", agent_node)

workflow.add_edge(START, "router_node")
workflow.add_conditional_edges(
    "router_node",
    decider_edge,
    {
        "tool_node": "tool_node",
        "agent_node": "agent_node"
    }
)
workflow.add_edge("tool_node", "agent_node")
workflow.add_edge("agent_node", END)

app_graph = workflow.compile()
