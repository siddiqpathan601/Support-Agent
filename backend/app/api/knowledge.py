"""
Knowledge Base API — document upload and management.

Supports: PDF, DOCX, TXT, Markdown
Pipeline: Upload → Parse → Chunk → Embed → ChromaDB
"""

import os
import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from sqlalchemy.orm import Session

from backend.app.models.db import get_db
from backend.app.models.user import User
from backend.app.services.auth import require_admin
from backend.app.services.rag import ingest_document, get_kb_stats

router = APIRouter(prefix="/knowledge", tags=["Knowledge Base"])

ALLOWED_TYPES = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "text/plain": ".txt",
    "text/markdown": ".md",
    "text/x-markdown": ".md",
}


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Upload a document to the knowledge base (admin only)."""
    content_type = file.content_type or ""
    filename = file.filename or "document"
    ext = os.path.splitext(filename)[1].lower()

    if content_type not in ALLOWED_TYPES and ext not in [".pdf", ".docx", ".txt", ".md"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: PDF, DOCX, TXT, Markdown"
        )

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=413, detail="File too large. Max 10MB.")

    try:
        result = await ingest_document(
            content=content,
            filename=filename,
            content_type=content_type or f"text/{ext.lstrip('.')}",
        )
        return {
            "status": "success",
            "document_name": filename,
            "chunks_indexed": result["chunks"],
            "document_id": result["doc_id"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")


@router.get("/stats")
def knowledge_stats(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Return knowledge base statistics."""
    stats = get_kb_stats()
    return stats


@router.delete("/clear")
def clear_knowledge_base(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Clear the entire knowledge base (admin only). Use with caution."""
    from backend.app.services.rag import clear_kb
    clear_kb()
    return {"status": "cleared", "message": "Knowledge base cleared successfully"}
