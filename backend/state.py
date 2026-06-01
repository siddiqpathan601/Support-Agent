from typing import TypedDict, List, Dict, Any, Optional


class AstroState(TypedDict):
    """Shared state for the AstroAgent LangGraph graph."""
    messages: List[Dict[str, str]]
    birth_details: Optional[Dict[str, Any]]  # {date, time, place, name}
    current_intent: Optional[str]
    tool_output: Optional[Dict[str, Any]]
    tool_history: List[Dict[str, Any]]
    user_context: Optional[Dict[str, Any]]
    error: Optional[str]
