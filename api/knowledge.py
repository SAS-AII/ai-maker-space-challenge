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
    - Checks for duplicates by filename
    - Processes with aimakerspace components
    - Stores vectors in Qdrant Cloud
    - Cleans up temporary files
    """
    try:
        logger.info(f"Uploading file: {file.filename}")
        
        # Check if file already exists
        from core.qdrant_client import get_qdrant
        client = get_qdrant()
        
        # Search for existing file with same name
        existing_files = client.scroll(
            collection_name="knowledge_base",
            scroll_filter={
                "must": [
                    {
                        "key": "filename",
                        "match": {
                            "value": file.filename
                        }
                    }
                ]
            },
            limit=1
        )
        
        if existing_files[0]:  # existing_files is a tuple (points, next_page_offset)
            return {
                "detail": "File already exists",
                "filename": file.filename,
                "exists": True,
                "message": f"A file named '{file.filename}' already exists in the knowledge base. Would you like to overwrite it?"
            }
        
        # Process file and store in Qdrant
        result = await document_ingestor.upload_to_qdrant(file)
        
        return {
            "detail": "Document indexed successfully",
            "result": result,
            "exists": False
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

@router.get("/files")
async def list_uploaded_files():
    """
    List all uploaded files in the knowledge base
    
    - Returns unique filenames with metadata
    - Shows upload information
    """
    try:
        from core.qdrant_client import get_qdrant
        
        client = get_qdrant()
        
        # Get all unique filenames
        files_map = {}
        offset = None
        
        while True:
            # Scroll through all points
            points, next_offset = client.scroll(
                collection_name="knowledge_base",
                limit=100,
                offset=offset,
                with_payload=True
            )
            
            if not points:
                break
                
            for point in points:
                filename = point.payload.get("filename", "unknown")
                if filename not in files_map:
                    files_map[filename] = {
                        "filename": filename,
                        "content_type": point.payload.get("content_type", "pdf"),
                        "total_chunks": point.payload.get("total_chunks", 0),
                        "file_hash": point.payload.get("file_hash", ""),
                        "chunk_count": 0
                    }
                files_map[filename]["chunk_count"] += 1
            
            if next_offset is None:
                break
            offset = next_offset
        
        files_list = list(files_map.values())
        
        return {
            "files": files_list,
            "total_files": len(files_list),
            "total_chunks": sum(f["chunk_count"] for f in files_list)
        }
        
    except Exception as e:
        logger.error(f"Error listing files: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error listing files: {str(e)}"
        )

@router.delete("/files/{filename}")
async def delete_file(filename: str):
    """
    Delete a specific file from the knowledge base
    
    - Removes all chunks associated with the filename
    - Returns deletion statistics
    """
    try:
        from core.qdrant_client import get_qdrant
        
        client = get_qdrant()
        
        # Find all points with this filename
        points_to_delete = []
        offset = None
        
        while True:
            points, next_offset = client.scroll(
                collection_name="knowledge_base",
                scroll_filter={
                    "must": [
                        {
                            "key": "filename",
                            "match": {
                                "value": filename
                            }
                        }
                    ]
                },
                limit=100,
                offset=offset,
                with_payload=False  # We only need IDs
            )
            
            if not points:
                break
                
            points_to_delete.extend([point.id for point in points])
            
            if next_offset is None:
                break
            offset = next_offset
        
        if not points_to_delete:
            raise HTTPException(
                status_code=404,
                detail=f"File '{filename}' not found in knowledge base"
            )
        
        # Delete all points for this file
        client.delete(
            collection_name="knowledge_base",
            points_selector=points_to_delete
        )
        
        logger.info(f"Deleted {len(points_to_delete)} chunks for file: {filename}")
        
        return {
            "detail": "File deleted successfully",
            "filename": filename,
            "chunks_deleted": len(points_to_delete)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting file {filename}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting file: {str(e)}"
        )

@router.post("/files/{filename}/overwrite")
async def overwrite_file(filename: str, file: UploadFile = File(...)):
    """
    Overwrite an existing file in the knowledge base
    
    - Deletes existing file chunks
    - Uploads new file with same name
    """
    try:
        # First delete the existing file
        await delete_file(filename)
        
        # Then upload the new file
        result = await document_ingestor.upload_to_qdrant(file)
        
        return {
            "detail": "File overwritten successfully",
            "result": result
        }
        
    except Exception as e:
        logger.error(f"Error overwriting file {filename}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error overwriting file: {str(e)}"
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