# AstroAgent - Project Skeleton

This project is a take-home assignment skeleton implementing a real-time chat interface connected to a FastAPI backend running a LangGraph agent.

## Tech Stack
- **Backend:** Python 3.11, FastAPI, LangGraph, Pydantic, Uvicorn
- **Frontend:** React, Vite, TailwindCSS, TypeScript

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js (v18+) and npm

---

### 1. Backend Setup & Run

From the root directory:

```bash
# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run the FastAPI server
python -m backend.app
```

The backend server will start at `http://localhost:8000`. You can verify it by sending a query using `curl`:
```bash
curl -X POST http://localhost:8000/chat -H "Content-Type: application/json" -d "{\"message\":\"hello\"}"
```
Response:
```json
{"response":"Hello from AstroAgent"}
```

---

### 2. Frontend Setup & Run

Open a new terminal window, navigate to the `frontend/` directory, and run:

```bash
cd frontend

# Install dependencies
npm install

# Run the Vite development server
npm run dev
```

The frontend will run at `http://localhost:5173`. Open your browser and navigate to `http://localhost:5173` to interact with AstroAgent.

---

## Project Structure

```
astroagent/
├── backend/
│   ├── app.py           # FastAPI server entry point
│   ├── graph.py         # LangGraph workflow definition
│   ├── state.py         # LangGraph state specification
│   ├── config.py        # Environment variables & configurations
│   ├── requirements.txt # Python dependencies
│   ├── routes/
│   │   └── chat.py      # /chat endpoint router
│   └── tools/           # (Placeholder for future astrology tools)
│
├── frontend/
│   ├── src/
│   │   ├── components/  # Chat UI components
│   │   ├── services/    # API calling client
│   │   ├── App.tsx      # Main application page
│   │   ├── index.css    # Tailwind styling & custom scrollbar
│   │   └── main.tsx     # React rendering mount
│   ├── package.json     # Node packages
│   └── vite.config.ts   # Vite configuration
│
└── README.md            # Project guide
```
