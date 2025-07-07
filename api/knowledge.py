"""Knowledge management API endpoints for RAG functionality"""
from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from starlette.concurrency import run_in_threadpool
from typing import List, Dict, Any, Optional
import logging

from rag.ingest import document_ingestor
from rag.retrieve import document_retriever
from rag.prompts import format_rag_system_prompt, format_rag_user_prompt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/knowledge", tags=["knowledge"])

@router.post("/upload", status_code=201)
async def upload_knowledge(file: UploadFile = File(...)):
    """
    Upload a document to the knowledge base
    
    - Accepts PDF files
    - Processes with aimakerspace components
    - Stores vectors in Qdrant Cloud
    - Cleans up temporary files
    """
    try:
        logger.info(f"Uploading file: {file.filename}")
        
        # Process file and store in Qdrant
        result = await document_ingestor.upload_to_qdrant(file)
        
        return {
            "detail": "Document indexed successfully",
            "result": result
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions (they have proper error messages)
        raise
    except Exception as e:
        logger.error(f"Unexpected error uploading {file.filename}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error processing document: {str(e)}"
        )

@router.post("/search")
async def search_knowledge(
    query: str = Form(...),
    limit: int = Form(5),
    score_threshold: float = Form(0.7)
):
    """
    Search the knowledge base for relevant documents
    
    - Uses semantic search with embeddings
    - Returns relevant chunks with similarity scores
    - Includes source metadata
    """
    try:
        logger.info(f"Searching knowledge base: {query[:50]}...")
        
        # Search for relevant documents
        results = await document_retriever.search_similar_documents(
            query=query,
            limit=limit,
            score_threshold=score_threshold
        )
        
        return {
            "query": query,
            "results": results,
            "count": len(results)
        }
        
    except Exception as e:
        logger.error(f"Error searching knowledge base: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error searching knowledge base: {str(e)}"
        )

@router.post("/generate-context")
async def generate_context(
    query: str = Form(...),
    max_chunks: int = Form(5),
    max_chars: int = Form(4000)
):
    """
    Generate formatted context for RAG responses
    
    - Searches for relevant documents
    - Formats context for LLM consumption
    - Returns both context and prompt templates
    """
    try:
        logger.info(f"Generating context for query: {query[:50]}...")
        
        # Get context from retriever
        context_data = await document_retriever.get_context_for_query(
            query=query,
            max_chunks=max_chunks,
            max_chars=max_chars
        )
        
        # Generate prompt templates
        system_prompt = format_rag_system_prompt()
        user_prompt = format_rag_user_prompt(
            context=context_data["context"],
            context_count=context_data["context_count"],
            similarity_scores=context_data["similarity_scores"],
            user_query=query
        )
        
        return {
            "query": query,
            "context_data": context_data,
            "prompts": {
                "system": system_prompt,
                "user": user_prompt
            }
        }
        
    except Exception as e:
        logger.error(f"Error generating context: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating context: {str(e)}"
        )

@router.get("/stats")
async def get_knowledge_stats():
    """
    Get statistics about the knowledge base
    
    - Collection information
    - Document counts
    - System health
    """
    try:
        from core.qdrant_client import get_qdrant
        
        client = get_qdrant()
        collection_info = client.get_collection("knowledge_base")
        
        return {
            "collection_name": "knowledge_base",
            "total_documents": collection_info.points_count,
            "vector_size": collection_info.config.params.vectors.size,
            "distance_metric": collection_info.config.params.vectors.distance,
            "status": "healthy"
        }
        
    except Exception as e:
        logger.error(f"Error getting knowledge stats: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error getting knowledge base stats: {str(e)}"
        ) 