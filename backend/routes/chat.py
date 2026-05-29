from fastapi import APIRouter
from pydantic import BaseModel
from backend.graph import app_graph

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    # Initialize state with the user message
    initial_state = {
        "messages": [
            {
                "role": "user",
                "content": request.message
            }
        ]
    }
    
    # Execute the LangGraph workflow
    result = await app_graph.ainvoke(initial_state)
    
    # Extract response from the state
    messages = result.get("messages", [])
    if messages:
        last_msg = messages[-1]
        response_content = last_msg.get("content", "")
    else:
        response_content = "No response from AstroAgent."
        
    return ChatResponse(response=response_content)
