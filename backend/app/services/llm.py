"""
LLM Factory — returns the active LLM client based on available API keys.

Priority:
  1. xAI Grok (XAI_API_KEY set)   → uses grok-beta via OpenAI-compatible API
  2. Groq (GROQ_API_KEY set)      → uses llama-3.3-70b-versatile

Usage:
  from backend.app.services.llm import get_llm, get_llm_fast

  llm = get_llm()          # standard temperature (0.7) for response generation
  llm = get_llm_fast()     # low temperature (0.1) for classification tasks
"""

from functools import lru_cache
from backend.config import LLM_PROVIDER, XAI_API_KEY, XAI_MODEL, GROQ_API_KEY, GROQ_MODEL


def get_llm(temperature: float = 0.7):
    """Return LangChain-compatible LLM with standard temperature."""
    if LLM_PROVIDER == "xai":
        return _make_xai_llm(temperature)
    return _make_groq_llm(temperature)


def get_llm_fast(temperature: float = 0.1):
    """Return LLM tuned for classification (low temperature)."""
    return get_llm(temperature=temperature)


def _make_xai_llm(temperature: float):
    """
    xAI Grok via OpenAI-compatible endpoint.
    LangChain's ChatOpenAI works with any OpenAI-compatible API.
    """
    try:
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=XAI_MODEL,
            temperature=temperature,
            api_key=XAI_API_KEY,
            base_url="https://api.x.ai/v1",
        )
    except ImportError:
        print("[LLMFactory] langchain-openai not installed, falling back to Groq")
        return _make_groq_llm(temperature)


def _make_groq_llm(temperature: float):
    """Groq cloud LLM (LLaMA 3.3 70B)."""
    from langchain_groq import ChatGroq
    return ChatGroq(
        model=GROQ_MODEL,
        temperature=temperature,
        api_key=GROQ_API_KEY,
    )


def get_provider_name() -> str:
    return "xAI Grok" if LLM_PROVIDER == "xai" else "Groq (LLaMA 3.3 70B)"
