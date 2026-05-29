from langgraph.graph import StateGraph, START, END
from backend.state import AstroState

def agent_node(state: AstroState) -> dict:
    return {
        "messages": [
            {
                "role": "assistant",
                "content": "Hello from AstroAgent"
            }
        ]
    }

# Build the workflow
workflow = StateGraph(AstroState)
workflow.add_node("agent_node", agent_node)

# Define entry and exit points
workflow.add_edge(START, "agent_node")
workflow.add_edge("agent_node", END)

# Compile
app_graph = workflow.compile()
