from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes.chat import router as chat_router
from backend.config import PORT, HOST

app = FastAPI(
    title="AstroAgent API",
    description="Backend API for AstroAgent using FastAPI and LangGraph",
    version="1.0.0"
)

# Enable CORS for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the router
app.include_router(chat_router)

@app.get("/")
def read_root():
    return {"message": "AstroAgent API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app:app", host=HOST, port=PORT, reload=True)
