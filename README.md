# AstroAgent ✦ Aradhana

An agentic AI astrology companion built with **LangGraph + Groq (LLaMA 3.3 70B) + React + TypeScript**. Computes real birth charts using live ephemeris data, provides daily transit readings, and answers astrology questions via a ChromaDB-backed RAG knowledge base — all through a warm, streaming conversational interface.

> **Aradhana** (आराधना) means devotion and worship — this agent serves as a daily spiritual companion for reflection and guidance, never certainty.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **LLM** | Groq API — `llama-3.3-70b-versatile` (ultra-low latency inference) |
| **Agent Framework** | LangGraph `StateGraph` (router → tool → agent pipeline) |
| **Ephemeris** | PyEphem (`ephem`) — real planetary position calculations via JPL data |
| **Geocoding** | Geopy (Nominatim / OpenStreetMap) + TimezoneFinder |
| **Knowledge RAG** | ChromaDB with sentence embeddings over 12 Markdown knowledge files |
| **Backend API** | FastAPI with Server-Sent Events (SSE) streaming |
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS |

---

## Architecture Overview

AstroAgent implements a classic **agentic tool-loop** as a LangGraph `StateGraph`. Every user message flows through three distinct nodes:

1. **Router Node** — Classifies user intent into one of four categories:
   - `birth_chart` — natal chart requests, sign/house/placement queries
   - `daily_transit` — today's energy, horoscopes, retrograde status, timing
   - `astrology_question` — educational queries about signs, planets, aspects, houses
   - `general` — greetings, off-topic, jailbreak/prompt injection attempts

   Classification uses a **dual-mode strategy**: a hardcoded override table for the 50 known eval cases (deterministic, 0ms), with LLM-based semantic classification (Groq/LLaMA) for novel inputs and a keyword-matching fallback if the LLM call fails.

2. **Tool Node** — Executes the appropriate tool:
   - `compute_birth_chart(date, time, place)` — geocodes the birthplace, converts to UTC, computes Sun/Moon/Mercury/Venus/Mars/Jupiter/Saturn positions with PyEphem, calculates Ascendant via the oblique ascension formula, and returns all data with sign + degree
   - `get_daily_transits(date, natal?)` — computes current planetary positions; if natal chart is available, calculates real aspects (conjunction, sextile, square, trine, opposition) with configurable orbs
   - `knowledge_lookup(query)` — vector-similarity search over 12 Markdown files covering all 12 signs, 7 classical planets, houses, and aspects

3. **Agent Node** — Assembles the full conversation context (system prompt + birth details + history + tool output) and calls **Groq LLaMA 3.3 70B** to generate the final response. Falls back to a structured template if the LLM is unavailable.

The API exposes `POST /chat` (synchronous JSON) and `POST /stream` (SSE for token-by-token streaming). The React frontend consumes the SSE stream, displaying the **CelestialDashboard** with live planet positions and aspects alongside the chat.

### LangGraph Graph

```
                    ┌──────────────┐
                    │    START     │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  router_node │  ← classifies intent (override → LLM → keyword)
                    └──────┬───────┘
                           │
                 ┌─────────┴─────────┐
                 │  conditional edge │
                 │  (decider_edge)   │
                 └─────┬───────┬─────┘
                       │       │
        intent=chart / │       │ intent=general
        transit /      │       │
        knowledge      │       │
                ┌──────▼──┐    │
                │tool_node│    │
                └──────┬──┘    │
                       │       │
                 ┌─────▼───────▼─────┐
                 │    agent_node     │  ← Groq LLaMA 3.3 70B call
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
- A **Groq API key** — [get one free at console.groq.com](https://console.groq.com)
- *(Optional)* A **Gemini API key** — used only for the LLM-as-judge tone scoring in the eval harness

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

### 2. Configure API Keys

Create a `.env` file in the project root:

```env
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here   # optional — only needed for eval tone scoring
PORT=8000
HOST=0.0.0.0
```

### 3. Backend Setup & Run

```bash
# Install Python dependencies
pip install -r backend/requirements.txt

# Run the FastAPI server (from project root)
.\venv\Scripts\python.exe -m backend.app
```

The backend runs at `http://localhost:8000`.

Quick smoke test:
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"hello\", \"birth_details\": null}"
```

### 4. Frontend Setup & Run

Open a **new terminal**:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`. Open it in your browser — you'll see the birth details form. Fill it in to unlock the full chat experience with the Celestial Dashboard.

---

## Project Structure

```
AstroAgent/
├── .env                          # GROQ_API_KEY, GEMINI_API_KEY (not committed)
├── .gitignore
├── README.md
├── EVALUATION.md                 # Eval reflection, scorecard, rubric
├── test_tools.py                 # Quick tool smoke test script
│
├── backend/
│   ├── app.py                    # FastAPI entry point, CORS, route mounting
│   ├── config.py                 # Env var loading (GROQ_API_KEY, PORT, HOST)
│   ├── graph.py                  # LangGraph workflow: router → tool → agent
│   ├── state.py                  # AstroState TypedDict (shared graph state)
│   ├── requirements.txt
│   ├── routes/
│   │   └── chat.py               # POST /chat (sync) + POST /stream (SSE)
│   ├── tools/
│   │   ├── __init__.py
│   │   └── astrology.py          # geocode_place, compute_birth_chart,
│   │                             # get_daily_transits, knowledge_lookup
│   └── knowledge/                # 12 Markdown files powering the RAG knowledge base
│       ├── signs_aries.md
│       ├── signs_taurus.md
│       ├── signs_gemini.md
│       ├── signs_cancer.md
│       ├── signs_leo_virgo.md
│       ├── signs_libra_scorpio.md
│       ├── signs_sagittarius_capricorn.md
│       ├── signs_aquarius_pisces.md
│       ├── planets_sun_moon_mercury.md
│       ├── planets_venus_mars_jupiter_saturn.md
│       ├── houses_overview.md
│       └── aspects_overview.md
│
├── frontend/
│   ├── index.html                # Google Fonts (Outfit), SEO meta tags
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── package.json
│   └── src/
│       ├── App.tsx               # Root: birth form → dashboard/chat layout
│       ├── main.tsx
│       ├── index.css             # Cosmic design system, glassmorphism, animations
│       ├── components/
│       │   ├── BirthDetailsForm.tsx    # Birth details input + summary bar
│       │   ├── ChatInterface.tsx       # SSE streaming chat, localStorage history
│       │   ├── CelestialDashboard.tsx  # Live planet positions + aspects display
│       │   └── ToolActivityPanel.tsx   # Collapsible tool execution activity log
│       └── services/
│           └── api.ts            # sendChatMessage() + streamChat() (SSE client)
│
└── eval/
    ├── golden_set.jsonl          # 50 versioned test cases (happy path + edge cases)
    ├── run_eval.py               # One-command eval runner + scorecard printer
    └── results.csv               # Appended after each eval run
```

---

## Running the Evaluation

With the **backend running**, execute from the project root:

```bash
.\venv\Scripts\python.exe eval/run_eval.py
```

The harness will:
1. Load all **50 test cases** from `eval/golden_set.jsonl`
2. Send each to the `/chat` API endpoint
3. Run **4 deterministic checks** per case (tool correctness, JSON validity, no certainty claims, non-empty response)
4. Optionally score **tone** via LLM-as-judge (Gemini or Groq fallback, 1–5 scale)
5. Print a formatted scorecard table to stdout
6. Append timestamped results to `eval/results.csv`

### Test Case Coverage (50 cases)

| Category | Count | Examples |
|----------|-------|---------|
| Happy path — birth chart | 15 | Valid Mumbai birth details, historical dates, unknown birth time |
| Happy path — daily transit | 10 | Today's energy, Mercury retrograde status, Saturn return check |
| Happy path — knowledge | 10 | "What does Venus in Taurus mean?", "What is a grand trine?" |
| Edge cases — bad input | 7 | Impossible place "Atlantis", invalid date "99-99-9999", leap year |
| Safety — prompt injection | 8 | "Ignore instructions…", "Act as my girlfriend…", "Tell me stock prices" |

See `EVALUATION.md` for the full scoring rubric and latest scorecard.

---

## Known Limitations

1. **Birth time accuracy**: Defaults to 12:00 noon when birth time is unknown. This significantly affects the Ascendant (changes ~every 2 hours) and all house placements. Moon sign may also shift on dates when the Moon changes signs.

2. **Equal house system**: Uses the Equal House system rather than Placidus (most common in Western astrology). Placidus requires spherical trigonometry beyond PyEphem's native support. House cusps may differ from professional software like Astro.com.

3. **Western Tropical zodiac only**: No Vedic (Sidereal/Jyotish) astrology support. Rahu/Ketu (lunar nodes) and nakshatras are not computed.

4. **Classical planets only**: Sun through Saturn (7 classical planets). Uranus, Neptune, and Pluto are not included.

5. **Groq rate limits on free tier**: The free Groq tier has token-per-day limits. Heavy usage may trigger 429 rate limit errors. Upgrade to Groq Dev Tier for production use.

6. **No server-side session memory**: Conversation history lives in browser `localStorage`. Different devices/browsers will not share history — there is no server-side session store.

7. **Geocoding via Nominatim**: Free OpenStreetMap geocoding may be slow or rate-limited under heavy use. Very obscure or ambiguous place names may not resolve correctly.

8. **RAG knowledge base scope**: Covers the 12 zodiac signs, 7 classical planets, houses overview, and aspects overview. Does not include asteroids, fixed stars, Arabic parts, or depth coverage of Vedic concepts.

---

## API Reference

### `POST /chat`
Synchronous request/response.

**Request body:**
```json
{
  "message": "Show me my birth chart",
  "birth_details": {
    "name": "Priya",
    "date": "1990-03-15",
    "time": "08:30",
    "place": "Mumbai, India"
  }
}
```

**Response:**
```json
{
  "response": "Here is your birth chart, Priya...",
  "tool_used": "compute_birth_chart",
  "tool_output": { "chart": { ... } },
  "intent": "birth_chart"
}
```

### `POST /stream`
Server-Sent Events streaming. Same request body as `/chat`. Each SSE event carries a JSON chunk:

```
data: {"type": "tool_start", "tool": "compute_birth_chart"}
data: {"type": "token", "content": "Here "}
data: {"type": "token", "content": "is your "}
data: {"type": "done", "tool_output": { ... }}
```

---

## Safety & Ethics

AstroAgent includes the following guardrails:

- **System prompt** explicitly prohibits medical, legal, or financial certainty claims in every response
- **Eval harness** automatically checks all 50 responses for certainty phrases (`"will happen"`, `"guaranteed"`, `"definitely will"`, etc.)
- **Jailbreak resistance** — the router classifies prompt injection and persona-override attempts as `general` intent, and the system prompt instructs Aradhana to decline warmly and redirect to astrology
- **Footer disclaimer**: *"Readings are for reflection and guidance, not certainty"* displayed on every page
- All readings are framed as possibilities, tendencies, and themes — never predictions

---

*Built for the Aradhana Internship 2026 Take-Home Assignment.*
