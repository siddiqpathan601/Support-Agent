"""
RAG Pipeline Service.

Phase 1: ChromaDB (local, persistent)
Phase 2+: Swap to Qdrant Cloud by setting QDRANT_URL

Supports: PDF, DOCX, TXT, Markdown
"""

import os
import uuid
import asyncio
from typing import Dict, Any

from backend.config import QDRANT_URL

KNOWLEDGE_DIR = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "knowledge"
)
CHROMA_PATH = os.path.join(KNOWLEDGE_DIR, ".chroma_support")

# ── ChromaDB helpers ──────────────────────────────────────────────────────────

def _get_collection():
    import chromadb
    from chromadb.utils import embedding_functions

    os.makedirs(CHROMA_PATH, exist_ok=True)
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    ef = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2"
    )
    return client.get_or_create_collection(
        name="support_knowledge",
        embedding_function=ef,
    )


# ── Document parsing ──────────────────────────────────────────────────────────

def _parse_pdf(content: bytes) -> str:
    try:
        import PyPDF2
        import io
        reader = PyPDF2.PdfReader(io.BytesIO(content))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    except Exception as e:
        raise ValueError(f"PDF parse error: {e}")


def _parse_docx(content: bytes) -> str:
    try:
        import docx
        import io
        doc = docx.Document(io.BytesIO(content))
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    except Exception as e:
        raise ValueError(f"DOCX parse error: {e}")


def _parse_text(content: bytes) -> str:
    return content.decode("utf-8", errors="replace")


def _chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """Split text into overlapping chunks."""
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i : i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)
        i += chunk_size - overlap
    return chunks


# ── Public API ────────────────────────────────────────────────────────────────

async def ingest_document(
    content: bytes,
    filename: str,
    content_type: str,
) -> Dict[str, Any]:
    """Parse, chunk, embed, and store a document in ChromaDB."""
    ext = os.path.splitext(filename)[1].lower()

    # Parse
    if ext == ".pdf" or "pdf" in content_type:
        text = _parse_pdf(content)
    elif ext == ".docx" or "word" in content_type:
        text = _parse_docx(content)
    else:
        text = _parse_text(content)

    if not text.strip():
        raise ValueError("Document appears to be empty after parsing.")

    # Chunk
    chunks = _chunk_text(text)
    if not chunks:
        raise ValueError("No text chunks generated from document.")

    # Store in ChromaDB (run in thread pool to not block event loop)
    doc_id = str(uuid.uuid4())

    def _store():
        collection = _get_collection()
        ids = [f"{doc_id}-{i}" for i in range(len(chunks))]
        metadatas = [{"source": filename, "doc_id": doc_id, "chunk": i} for i in range(len(chunks))]
        collection.add(documents=chunks, ids=ids, metadatas=metadatas)
        return len(chunks)

    chunk_count = await asyncio.get_event_loop().run_in_executor(None, _store)

    return {"doc_id": doc_id, "chunks": chunk_count, "filename": filename}


def get_kb_stats() -> Dict[str, Any]:
    """Return knowledge base statistics."""
    try:
        collection = _get_collection()
        count = collection.count()
        return {
            "backend": "ChromaDB (local)",
            "total_chunks": count,
            "status": "healthy",
            "path": CHROMA_PATH,
        }
    except Exception as e:
        return {"backend": "ChromaDB", "status": "error", "error": str(e)}


def clear_kb():
    """Delete and recreate the ChromaDB collection."""
    import chromadb
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    try:
        client.delete_collection("support_knowledge")
    except Exception:
        pass
