# AstroAgent ✦ Aradhana

An agentic AI astrology companion built with **LangGraph + Gemini + React**. Computes real birth charts using ephemeris data, provides daily transit readings, and answers astrology questions via RAG — all through a warm, conversational interface.

> **Aradhana** (आराधना) means devotion and worship — this agent serves as a daily spiritual companion for reflection and guidance, never certainty.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **LLM** | Google Gemini 2.0 Flash (via `langchain-google-genai`) |
| **Agent Framework** | LangGraph (stateful graph with routing + tool nodes) |
| **Ephemeris** | PyEphem (`ephem`) — real planetary position calculations |
| **Geocoding** | Geopy (Nominatim / OpenStreetMap) + TimezoneFinder |
| **Knowledge RAG** | ChromaDB with default embeddings over 15 Markdown files |
| **Backend API** | FastAPI with SSE streaming |
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS |

---

## Architecture Overview

AstroAgent follows a classic **agentic tool-loop** pattern implemented as a LangGraph `StateGraph`. When a user sends a message:

1. The **Router Node** classifies the user's intent (birth chart request, daily transit, astrology question, or general greeting) using keyword matching against the latest message.

2. A **conditional edge** routes to either the **Tool Node** (if a tool is needed) or directly to the **Agent Node** (for general conversation).

3. The **Tool Node** executes the appropriate tool — `compute_birth_chart()` for natal charts, `get_daily_transits()` for current planetary positions and aspects, or `knowledge_lookup()` for RAG-based astrology reference. All chart math uses the PyEphem library backed by real ephemeris data from the Jet Propulsion Laboratory.

4. The **Agent Node** receives the full conversation history plus tool outputs and calls **Gemini 2.0 Flash** with a carefully crafted system prompt (the Aradhana persona). The system prompt enforces warm tone, spiritual sensitivity, and a strict guardrail against medical/legal/financial certainty claims. Gemini synthesizes the tool data into a natural, caring response.

The API layer exposes two endpoints: `POST /chat` (synchronous JSON response) and `POST /stream` (Server-Sent Events for token-by-token streaming). The frontend consumes the SSE stream, displaying tool activity metadata and tokens as they arrive.

### LangGraph Graph Diagram

```
                    ┌──────────────┐
                    │    START     │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  router_node │  ← classifies intent
                    └──────┬───────┘
                           │
                 ┌─────────┴─────────┐
                 │  conditional edge │
                 │  (decider_edge)   │
                 └─────┬───────┬─────┘
                       │       │
        intent = chart/│       │ intent = general
        transit/       │       │
        knowledge      │       │
                ┌──────▼──┐    │
                │tool_node│    │
                └──────┬──┘    │
                       │       │
                 ┌─────▼───────▼─────┐
                 │    agent_node     │  ← Gemini LLM call
                 └─────────┬─────────┘
                           │
                    ┌──────▼───────┐
                    │     END      │
                    └──────────────┘
```

---

## Getting Started

### Prerequisites
- Python 3.11+ with venv
- Node.js 18+ and npm
- A Gemini API key ([get one free at AI Studio](https://aistudio.google.com/apikey))

### 1. Clone & Setup Environment

```bash
git clone <your-repo-url>
cd AstroAgent

# Create and activate virtual environment
python -m venv venv
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# macOS/Linux:
source venv/bin/activate
```

### 2. Configure API Key

Create a `.env` file in the project root:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Backend Setup & Run

```bash
# Install Python dependencies
pip install -r backend/requirements.txt

# Run the FastAPI server
python -m backend.app
```

The backend runs at `http://localhost:8000`. Test with:
```bash
curl -X POST http://localhost:8000/chat -H "Content-Type: application/json" -d "{\"message\":\"hello\"}"
```

### 4. Frontend Setup & Run

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

---

## Project Structure

```
AstroAgent/
├── .env                      # GEMINI_API_KEY
├── README.md
├── EVALUATION.md             # Eval reflection doc
│
├── backend/
│   ├── app.py                # FastAPI entry point
│   ├── config.py             # Environment config
│   ├── graph.py              # LangGraph workflow (router → tool → agent)
│   ├── state.py              # AstroState TypedDict
│   ├── requirements.txt
│   ├── routes/
│   │   └── chat.py           # POST /chat + POST /stream (SSE)
│   ├── tools/
│   │   ├── __init__.py
│   │   └── astrology.py      # 4 real tools (geocode, chart, transit, RAG)
│   └── knowledge/            # 15 Markdown files for RAG
│       ├── signs_aries.md
│       ├── signs_taurus.md
│       ├── ...
│       ├── planets_sun_moon_mercury.md
│       ├── planets_venus_mars_jupiter_saturn.md
│       ├── houses_overview.md
│       └── aspects_overview.md
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # Main app (birth form → chat flow)
│   │   ├── main.tsx
│   │   ├── index.css          # Tailwind + cosmic design system
│   │   ├── components/
│   │   │   ├── BirthDetailsForm.tsx   # Birth details form + summary bar
│   │   │   ├── ChatInterface.tsx      # Streaming chat with persistence
│   │   │   └── ToolActivityPanel.tsx  # Collapsible tool activity display
│   │   └── services/
│   │       └── api.ts         # sendChatMessage + streamChat (SSE)
│   ├── package.json
│   └── vite.config.ts
│
└── eval/
    ├── golden_set.jsonl       # 5 versioned test cases
    ├── run_eval.py            # One-command eval runner + scorecard
    └── results.csv            # Appended after each eval run
```

---

## Running the Evaluation

With the backend running:

```bash
python eval/run_eval.py
```

This will:
1. Load all test cases from `eval/golden_set.jsonl`
2. Send each to the `/chat` API
3. Run deterministic checks (tool correctness, JSON validity, no certainty claims, non-empty response)
4. Score tone via Gemini as LLM-as-judge (1–5 scale)
5. Print a scorecard table to stdout
6. Append results to `eval/results.csv`

See `EVALUATION.md` for details on what is tested and the scoring rubric.

---

## Known Limitations

1. **Birth time accuracy**: If the user doesn't know their exact birth time, the system defaults to 12:00 noon. This significantly affects the Ascendant (Rising Sign) and house placements, which change roughly every 2 hours. Moon sign may also be inaccurate for dates when the Moon changes signs.

2. **Equal house system only**: The current implementation uses the Equal House system rather than Placidus (the most common in Western astrology). Placidus requires more complex spherical trigonometry that PyEphem doesn't natively support. House cusps may differ from professional astrology software.

3. **No Vedic/Sidereal astrology**: The system uses the Western Tropical zodiac only. It does not support Vedic (Sidereal) astrology, Jyotish, or other astrological traditions.

4. **Outer planets excluded**: Only Sun through Saturn are computed. Uranus, Neptune, and Pluto are not included (they are considered "modern" planets and require different handling in PyEphem).

5. **Intent classification is keyword-based**: The router uses simple keyword matching rather than an LLM-based classifier. This means some ambiguous messages may be misrouted (e.g., "tell me about my future" might go to general instead of transit).

6. **No session memory across browser tabs**: Conversation history is stored in localStorage per-browser. There is no server-side session store, so different devices or browsers will not share history.

7. **RAG knowledge base is small**: The knowledge base covers the 12 signs, 7 classical planets, houses, and aspects — but does not cover nodes (Rahu/Ketu), asteroids, fixed stars, or retrograde interpretations in depth.

8. **Geocoding depends on Nominatim**: Free OSM geocoding may be slow or rate-limited under heavy use. Obscure place names may not resolve.

---

## Safety & Ethics

AstroAgent includes these guardrails:
- **System prompt** explicitly prohibits medical, legal, or financial certainty claims
- **Eval harness** checks for certainty phrases in every response
- **Footer disclaimer**: "Readings are for reflection and guidance, not certainty"
- All readings are framed as possibilities, tendencies, and themes — never as predictions

---

*Built for the Aradhana Internship 2026 Take-Home Assignment.*
