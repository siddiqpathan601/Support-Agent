from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Dict, Any
from backend.graph import app_graph

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    birth_details: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    response: str
    intent: Optional[str] = None
    error: Optional[str] = None

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    # Initialize state with user query and birth details
    initial_state = {
        "messages": [
            {
                "role": "user",
                "content": request.message
            }
        ],
        "birth_details": request.birth_details,
        "tool_history": [],
        "tool_output": {},
        "current_intent": None,
        "user_context": {},
        "error": None
    }
    
    # Execute LangGraph
    result = await app_graph.ainvoke(initial_state)
    
    messages = result.get("messages", [])
    if messages:
        last_msg = messages[-1]
        response_content = last_msg.get("content", "") if isinstance(last_msg, dict) else getattr(last_msg, "content", "")
    else:
        response_content = "No response from AstroAgent."
        
    return ChatResponse(
        response=response_content,
        intent=result.get("current_intent"),
        error=result.get("error")
    )
