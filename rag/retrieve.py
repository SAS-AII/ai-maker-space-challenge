"""Document retrieval module for RAG using Qdrant and aimakerspace"""
from typing import List, Dict, Any, Optional
import logging

from aimakerspace.openai_utils.embedding import EmbeddingModel
from core.qdrant_client import get_qdrant, ensure_collection_exists

logger = logging.getLogger(__name__)

class DocumentRetriever:
    """Handles semantic search and retrieval from Qdrant"""
    
    def __init__(self, collection_name: str = "knowledge_base"):
        self.collection_name = collection_name
        self.embedding_model = EmbeddingModel()
        # Ensure collection exists
        ensure_collection_exists(self.collection_name)
    
    async def search_similar_documents(
        self, 
        query: str, 
        limit: int = 5,
        score_threshold: float = 0.75
    ) -> List[Dict[str, Any]]:
        """
        Search for documents similar to the query
        
        Args:
            query: User's search query
            limit: Maximum number of documents to return
            score_threshold: Minimum similarity score (0.0 to 1.0)
            
        Returns:
            List of relevant documents with metadata
        """
        try:
            # Generate embedding for the query using aimakerspace
            query_embedding = self.embedding_model.get_embedding(query)
            
            # Search in Qdrant
            client = get_qdrant()
            search_results = client.search(
                collection_name=self.collection_name,
                query_vector=query_embedding,
                limit=limit,
                score_threshold=score_threshold,
                with_payload=True
            )
            
            # Format results
            results = []
            for result in search_results:
                results.append({
                    "content": result.payload["content"],
                    "filename": result.payload.get("filename", "unknown"),
                    "chunk_index": result.payload.get("chunk_index", 0),
                    "similarity_score": result.score,
                    "content_type": result.payload.get("content_type", "unknown")
                })
            
            logger.info(f"Found {len(results)} documents for query: {query[:50]}...")
            return results
            
        except Exception as e:
            logger.error(f"Error searching documents: {e}")
            return []
    
    async def get_context_for_query(
        self, 
        query: str, 
        max_chunks: int = 5,
        max_chars: int = 4000
    ) -> Dict[str, Any]:
        """
        Get formatted context for RAG generation
        
        Args:
            query: User's query
            max_chunks: Maximum number of chunks to include
            max_chars: Maximum total characters in context
            
        Returns:
            Formatted context with metadata
        """
        # Search for relevant documents
        relevant_docs = await self.search_similar_documents(
            query=query,
            limit=max_chunks,
            score_threshold=0.75
        )
        
        if not relevant_docs:
            return {
                "context": "",
                "context_count": 0,
                "similarity_scores": "",
                "sources": []
            }
        
        # Build context string
        context_parts = []
        current_chars = 0
        sources = []
        
        for i, doc in enumerate(relevant_docs):
            # Format document chunk
            chunk_text = f"[Document {i+1} - {doc['filename']}]\n{doc['content']}\n"
            
            # Check if adding this chunk would exceed character limit
            if current_chars + len(chunk_text) > max_chars and context_parts:
                break
            
            context_parts.append(chunk_text)
            current_chars += len(chunk_text)
            
            # Track sources
            sources.append({
                "filename": doc['filename'],
                "chunk_index": doc['chunk_index'],
                "similarity_score": round(doc['similarity_score'], 3),
                "content_type": doc['content_type']
            })
        
        # Format similarity scores for display
        similarity_scores = "Similarity scores: " + ", ".join([
            f"{source['filename']} ({source['similarity_score']})"
            for source in sources
        ])
        
        return {
            "context": "\n".join(context_parts),
            "context_count": len(sources),
            "similarity_scores": similarity_scores,
            "sources": sources
        }

# Global retriever instance
document_retriever = DocumentRetriever() 