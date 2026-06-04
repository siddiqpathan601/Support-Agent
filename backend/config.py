"""
AstroAgent Configuration
========================
Loads environment variables from .env in the project root.

Required:
  GROQ_API_KEY     — Groq API key for LLaMA 3.3 70B inference

Optional:
  GEMINI_API_KEY   — Gemini API key (only used by eval tone judge)
  PORT             — Server port (default: 8000)
  HOST             — Server host (default: 0.0.0.0)
"""

import os
from dotenv import load_dotenv

# Load .env from the project root (works when run as `python -m backend.app`)
load_dotenv()

GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
PORT: int = int(os.getenv("PORT", "8000"))
HOST: str = os.getenv("HOST", "0.0.0.0")

if not GROQ_API_KEY:
    import warnings
    warnings.warn(
        "GROQ_API_KEY is not set. Set it in your .env file. "
        "Get a free key at https://console.groq.com",
        RuntimeWarning,
        stacklevel=2,
    )
