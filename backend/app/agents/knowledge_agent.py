"""
Knowledge Agent — RAG retrieval from the company knowledge base.

Sources searched:
  - ChromaDB (Phase 1, local)
  - Qdrant (Phase 2+, cloud)

Outputs:
  - retrieved_context: combined relevant text chunks
"""

import time
import os
from typing import Optional
from backend.app.agents.state import SupportState
from backend.config import GROQ_API_KEY, GROQ_MODEL, QDRANT_URL

# Knowledge base directory (reuses existing backend/knowledge/ folder)
KNOWLEDGE_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "knowledge")


def _get_chroma_collection():
    """Lazy-load ChromaDB collection for Phase 1."""
    try:
        import chromadb
        from chromadb.utils import embedding_functions

        client = chromadb.PersistentClient(
            path=os.path.join(KNOWLEDGE_DIR, ".chroma_support")
        )
        ef = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
        collection = client.get_or_create_collection(
            name="support_knowledge",
            embedding_function=ef,
        )
        return collection
    except Exception as e:
        print(f"[KnowledgeAgent] ChromaDB init failed: {e}")
        return None


def _get_llm():
    from langchain_groq import ChatGroq
    return ChatGroq(model=GROQ_MODEL, temperature=0.3, api_key=GROQ_API_KEY)


def _search_knowledge(query: str, n_results: int = 5) -> str:
    """Search ChromaDB for relevant knowledge chunks."""
    try:
        collection = _get_chroma_collection()
        if collection is None or collection.count() == 0:
            return ""

        results = collection.query(
            query_texts=[query],
            n_results=min(n_results, collection.count()),
        )

        docs = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]

        chunks = []
        for i, doc in enumerate(docs):
            meta = metadatas[i] if i < len(metadatas) else {}
            source = meta.get("source", "Knowledge Base")
            chunks.append(f"[Source: {source}]\n{doc}")

        return "\n\n---\n\n".join(chunks)
    except Exception as e:
        print(f"[KnowledgeAgent] Search failed: {e}")
        return ""


_SYNTHESIS_PROMPT = """You are a customer support knowledge assistant.

Using ONLY the provided knowledge base context, extract the most relevant information
to answer the customer's question. If the context doesn't contain relevant info,
say so clearly.

Be concise. Return 2-4 sentences of the most actionable information.
Do NOT make up information not in the context."""


def knowledge_agent_node(state: SupportState) -> dict:
    """LangGraph node: retrieve relevant knowledge base context via RAG."""
    start = time.time()

    messages = state.get("messages", [])
    intent = state.get("intent", "general")

    # Build a rich query combining intent + latest user message
    latest_msg = ""
    for msg in reversed(messages):
        if msg.get("role") == "user":
            latest_msg = msg.get("content", "")
            break

    entities = state.get("entities") or {}
    entity_str = " ".join(str(v) for v in entities.values() if v)
    query = f"{intent} {latest_msg} {entity_str}".strip()

    retrieved_context = _search_knowledge(query)

    elapsed = time.time() - start
    chunk_count = len(retrieved_context.split("---")) if retrieved_context else 0
    print(f"[KnowledgeAgent] Retrieved {chunk_count} chunks ({elapsed*1000:.0f}ms)")

    return {
        "retrieved_context": retrieved_context or None,
        "tool_history": (state.get("tool_history") or []) + [{
            "agent": "knowledge",
            "query": query[:100],
            "chunks_retrieved": chunk_count,
            "execution_time_ms": round(elapsed * 1000, 1),
        }],
    }
