---
title: Support-Agent
emoji: 🎫
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# SupportAI ✦ Autonomous Customer Support Agent

A state-of-the-art, AI-powered customer support platform. It combines a **multi-agent LangGraph pipeline** with a **real-time human agent takeover system** via Socket.IO. The platform automatically resolves customer inquiries using a document RAG knowledge base, analyzes customer sentiment, and escalates conversations to human support staff when necessary.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15 (App Router), React 19, Tailwind CSS, TypeScript, Zustand |
| **Backend API** | FastAPI, Server-Sent Events (SSE) streaming, Python |
| **Real-Time Communications** | python-socketio (Socket.IO client/server) for live staff-customer chat |
| **Agent Orchestration** | LangGraph (Intent routing, state transitions, tool looping) |
| **Database & ORM** | SQLAlchemy, SQLite (local dev) / Neon PostgreSQL (production) |
| **Caching & Rate Limiter** | Redis / Upstash Redis (caching conversations & token bucket rate limits) |
| **RAG Knowledge Base** | ChromaDB (local persistent vector database) using `all-MiniLM-L6-v2` |
| **LLMs / Models** | xAI Grok (primary) / Groq LLaMA 3.3 70B (fallback) |

---

## 📐 System Architecture

The application is split into a **Next.js customer/dashboard frontend** and a **FastAPI backend**.

```
                ┌────────────────────────────────────────────────────────┐
                │                     Next.js Frontend                   │
                └───────┬───────────────────────▲────────────────┬───────┘
                        │ API requests          │ SSE Stream     │ WebSockets
                        │ (Axios)               │ (Tokens/Done)  │ (Live Chat)
                        ▼                       │                ▼
                ┌───────────────────────────────┴────────────────────────┐
                │                     FastAPI Backend                    │
                └───────┬────────────────────────────────────────▲───────┘
                        │                                        │
                        │ invoke                                 │ return state
                        ▼                                        │
┌────────────────────────────────────────────────────────────────┴───────┐
│                      LangGraph Agentic Pipeline                       │
│                                                                        │
│  ┌──────────────┐     ┌──────────────────────┐     ┌──────────────┐    │
│  │ Intent Router│ ───>│  RAG Knowledge search│ ───>│ Ticket Engine│    │
│  │ (Classify)   │     │  (ChromaDB lookup)   │     │ (Escalation) │    │
│  └──────────────┘     └──────────────────────┘     └──────────────┘    │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Customer Chat Interface**: Customers log in and chat with the support agent. The frontend requests token-by-token streaming from the backend via SSE (`POST /api/v1/chat/stream`).
2. **LangGraph Pipeline**:
   - **Intent Node**: Classifies the inquiry (e.g., billing, technical issue, checkout error).
   - **RAG Lookup Node**: If applicable, queries ChromaDB to find relevant snippets from uploaded support documents.
   - **Evaluation Node**: Computes response confidence, analyzes sentiment (detects frustration/anger), and tracks resolution attempts.
   - **Escalation Decision**: If confidence is below the threshold or the user shows persistent frustration, it automatically flags the conversation as **ESCALATED** and creates a Support Ticket.
3. **Staff Takeover (Socket.IO)**: Support staff monitor active conversations in real-time from their dashboard. At any point, they can hit **Takeover** to disable the AI agent and converse directly with the customer.

---

## 🚀 Local Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- A **Groq API key** or **xAI API key** (Grok-beta)
- *(Optional)* A **Redis** instance (local or Upstash)

### 1. Configure Environment Variables
Create a `.env` file in the project root (you can copy `.env.example` as a starting point):
```env
# LLM Providers (Provide at least one)
GROQ_API_KEY=your_groq_api_key_here
XAI_API_KEY=your_xai_api_key_here

# SQLite Database (for local dev)
DATABASE_URL=sqlite:///./support_agent.db

# Authentication
JWT_SECRET=use-a-strong-random-string-here

# Server
PORT=8000
HOST=0.0.0.0
```

### 2. Setup Backend & Seed Users
```bash
# Create and activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Seed the database with default accounts (admin, support, customer)
python -m backend.seed_user
```
The seeding script creates three default accounts (all password: `Password123`):
- **Customer**: `customer@company.com`
- **Support Staff**: `support@company.com`
- **Admin**: `admin@company.com`

To run the backend server:
```bash
python -m backend.main
```
The API will be available at `http://localhost:8000`.

### 3. Setup Frontend
Open a new terminal and navigate to the `frontend` folder:
```bash
cd frontend
npm install
npm run dev
```
The Next.js frontend will run at `http://localhost:3000`. Log in using one of the seeded accounts to explore the user chat or the staff dashboard.

---

## ☁️ Deployment Guide (Render Alternatives)

If you want to host both the frontend and backend in one place for free without using Render, the best options are **Hugging Face Spaces** (100% free, no credit card required) or **Koyeb** (has a free VM tier, requires credit card validation). 

The repository includes a preconfigured `Dockerfile`, `nginx.conf`, and `start.sh` at the root. They work by bundling the Next.js static files and the Python server into a single container, proxied behind Nginx. This means **both applications run on the same port** (avoiding CORS and configuration issues).

### Method 1: Hugging Face Spaces (Docker Space) — *Recommended (100% Free)*
Hugging Face Spaces offers a free CPU Basic hardware tier (2 vCPUs, 16 GB RAM) that runs 24/7 (goes to sleep if inactive for 48h and wakes up instantly when visited). It does **not** require a credit card.

1. **Create a Space**:
   - Go to [Hugging Face Spaces](https://huggingface.co/spaces).
   - Click **Create new Space**.
   - Enter a name, select **Docker** as the SDK, and choose the **Blank** template.
   - Choose the **Public** visibility and click **Create Space**.

2. **Configure Variables & Secrets**:
   - Go to your Space **Settings** page.
   - Add the following under **Variables and Secrets**:
     - `GROQ_API_KEY` or `XAI_API_KEY` (Secret)
     - `JWT_SECRET` (Secret)
     - `DATABASE_URL` (Optional Variable — if using a cloud DB like Neon Postgres, else it defaults to local SQLite).
     - `REDIS_URL` (Optional Secret — e.g. Upstash Redis, for rate-limiting and session caching).

3. **Deploy the Code**:
   - Push your code to the Hugging Face Space repository using Git:
     ```bash
     git remote add hf https://huggingface.co/spaces/YOUR_USERNAME/YOUR_SPACE_NAME
     git push -f hf main
     ```
   - Hugging Face will automatically trigger a multi-stage Docker build, compile the Next.js frontend, install Python dependencies, configure Nginx, and serve the app on port `7860`.

---

### Method 2: Koyeb (Docker App)
Koyeb provides a free tier with 1 Nano VM (0.1 vCPU, 512 MB RAM) that runs continuously. It requires a credit card to prevent spam, but stays free under limits.

1. **Create a Koyeb Account** and click **Create Service**.
2. **Choose GitHub Deployment** and select your `Support-Agent` repository.
3. In the builder settings:
   - Select **Dockerfile** as the build method.
   - Click **Advanced** and set the following Environment Variables:
     - `GROQ_API_KEY` (or `XAI_API_KEY`)
     - `JWT_SECRET`
     - `DATABASE_URL` (Recommended: Use a free PostgreSQL database from [Neon](https://neon.tech))
     - `REDIS_URL` (Recommended: Use a free Upstash Redis database)
4. Set the **Exposed Port** to `8080` (or `7860`, the Docker configuration automatically binds Nginx to the port Koyeb passes).
5. Click **Deploy**. Koyeb will build the Dockerfile and launch the service.

---

### Production Database & Cache recommendations
Since containers are ephemeral, local SQLite databases (`support_agent.db`) and Chroma vector indexes will reset whenever the container restarts or goes to sleep. For a persistent production setup:

1. **Database**: Create a free serverless Postgres database on [Neon](https://neon.tech) and set the `DATABASE_URL` variable.
2. **Redis**: Create a free serverless Redis cluster on [Upstash](https://upstash.com) and set the `REDIS_URL` (or `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`) variables.
3. **Vector Store**: For scalable persistent document search, you can hook the app up to Qdrant Cloud by setting `QDRANT_URL` and `QDRANT_API_KEY`.
