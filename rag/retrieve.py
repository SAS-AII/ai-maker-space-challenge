"""Document retrieval module for RAG using Qdrant and aimakerspace"""
from typing import List, Dict, Any, Optional
import logging
import re

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
    
    def _expand_query(self, query: str) -> List[str]:
        """
        Expand query with alternative phrasings to improve retrieval
        
        Args:
            query: Original user query
            
        Returns:
            List of expanded queries
        """
        expanded_queries = [query]
        
        # Common Spanish query patterns for document content
        spanish_patterns = [
            # Chapter/section queries
            r"capítulo (\d+)",
            r"sección (\d+)", 
            r"tema (\d+)",
            r"parte (\d+)",
            # Content queries
            r"de qué trata",
            r"qué dice",
            r"qué contiene",
            r"habla sobre",
            r"menciona",
            r"describe",
            r"explica",
            # Code/example queries
            r"json example",
            r"example request body",
            r"python example",
            r"code sample",
            r"curl",
        ]
        
        # If query matches chapter pattern, add variations
        for pattern in spanish_patterns:
            match = re.search(pattern, query.lower())
            if match:
                if "capítulo" in pattern:
                    chapter_num = match.group(1)
                    expanded_queries.extend([
                        f"capítulo {chapter_num}",
                        f"chapter {chapter_num}",
                        f"capitulo {chapter_num}",
                        f"sección {chapter_num}",
                        f"tema {chapter_num}"
                    ])
                elif any(word in pattern for word in ["trata", "dice", "contiene"]):
                    # For content questions, add more specific variations
                    expanded_queries.extend([
                        query.replace("de qué trata", "qué contiene"),
                        query.replace("de qué trata", "qué dice"),
                        query.replace("qué dice", "de qué trata"),
                        query.replace("qué contiene", "de qué trata")
                    ])
                break
        
        # Add general document search terms
        if "manual" in query.lower():
            expanded_queries.extend([
                "manual del conductor",
                "manual conductor",
                "driver manual",
                "manual"
            ])
        
        # Remove duplicates while preserving order
        seen = set()
        unique_queries = []
        for q in expanded_queries:
            if q.lower() not in seen:
                seen.add(q.lower())
                unique_queries.append(q)
        
        return unique_queries[:5]  # Limit to 5 queries max
    
    async def search_similar_documents(
        self, 
        query: str, 
        limit: int = 10,  # Increased from 5
        score_threshold: float = 0.3,  # Lowered from 0.5
        use_query_expansion: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Search for documents similar to the query with improved strategies
        
        Args:
            query: User's search query
            limit: Maximum number of documents to return
            score_threshold: Minimum similarity score (0.0 to 1.0)
            use_query_expansion: Whether to use query expansion
            
        Returns:
            List of relevant documents with metadata
        """
        try:
            client = get_qdrant()
            all_results = []
            
            # Use query expansion if enabled
            queries = self._expand_query(query) if use_query_expansion else [query]
            
            for search_query in queries:
                logger.info(f"Searching with query: {search_query}")
                
                # Generate embedding for the query
                query_embedding = self.embedding_model.get_embedding(search_query)
                
                # Search in Qdrant with multiple thresholds
                thresholds = [score_threshold, score_threshold - 0.1, score_threshold - 0.2]
                search_results = []
                
                for threshold in thresholds:
                    if threshold < 0.1:  # Don't go below 0.1
                        break
                        
                    results = client.search(
                        collection_name=self.collection_name,
                        query_vector=query_embedding,
                        limit=limit,
                        score_threshold=threshold,
                        with_payload=True
                    )
                    
                    if results:
                        search_results = results
                        logger.info(f"Found {len(results)} results with threshold {threshold}")
                        break
                
                # Format results
                for result in search_results:
                    # Check if we already have this content (avoid duplicates)
                    content_exists = any(
                        r["content"] == result.payload["content"] 
                        for r in all_results
                    )
                    
                    if not content_exists:
                        all_results.append({
                            "content": result.payload["content"],
                            "filename": result.payload.get("filename", "unknown"),
                            "chunk_index": result.payload.get("chunk_index", 0),
                            "similarity_score": result.score,
                            "content_type": result.payload.get("content_type", "unknown"),
                            "search_query": search_query
                        })
            
            # Sort by similarity score and take top results
            all_results.sort(key=lambda x: x["similarity_score"], reverse=True)
            final_results = all_results[:limit]
            
            logger.info(f"Found {len(final_results)} unique documents for query: {query[:50]}...")
            for i, result in enumerate(final_results):
                logger.info(f"Result {i+1}: {result['filename']} (score: {result['similarity_score']:.3f}) - {result['content'][:100]}...")
            
            return final_results
            
        except Exception as e:
            logger.error(f"Error searching documents: {e}")
            return []
    
    async def get_context_for_query(
        self, 
        query: str, 
        max_chunks: int = 8,  # Increased from 5
        max_chars: int = 6000,  # Increased from 4000
        score_threshold: float = 0.15  # Further lowered to capture more matches
    ) -> Dict[str, Any]:
        """
        Get formatted context for RAG generation with improved retrieval
        
        Args:
            query: User's query
            max_chunks: Maximum number of chunks to include
            max_chars: Maximum total characters in context
            score_threshold: Minimum similarity score
            
        Returns:
            Formatted context with metadata
        """
        # Search for relevant documents with query expansion
        relevant_docs = await self.search_similar_documents(
            query=query,
            limit=max_chunks * 2,  # Get more candidates for better selection
            score_threshold=score_threshold,
            use_query_expansion=True
        )
        
        if not relevant_docs:
            return {
                "context": "",
                "context_count": 0,
                "similarity_scores": "",
                "sources": []
            }
        
        # Build context string with better organization
        context_parts = []
        current_chars = 0
        sources = []
        
        # Group by filename for better context organization
        docs_by_file = {}
        for doc in relevant_docs:
            filename = doc['filename']
            if filename not in docs_by_file:
                docs_by_file[filename] = []
            docs_by_file[filename].append(doc)
        
        # Process each file's documents
        for filename, file_docs in docs_by_file.items():
            # Sort by chunk index to maintain document order
            file_docs.sort(key=lambda x: x['chunk_index'])
            
            file_context = f"\n[Document: {filename}]\n"
            
            for doc in file_docs:
                # Format document chunk with better structure
                chunk_text = f"Chunk {doc['chunk_index'] + 1}: {doc['content']}\n"
                
                # Check if adding this chunk would exceed character limit
                if current_chars + len(file_context) + len(chunk_text) > max_chars and context_parts:
                    break
                
                file_context += chunk_text
                current_chars += len(chunk_text)
                
                # Track sources
                sources.append({
                    "filename": doc['filename'],
                    "chunk_index": doc['chunk_index'],
                    "similarity_score": round(doc['similarity_score'], 3),
                    "content_type": doc['content_type'],
                    "search_query": doc.get('search_query', query)
                })
            
            context_parts.append(file_context)
        
        # Format similarity scores for display
        if sources:
            similarity_scores = "Similarity scores: " + ", ".join([
                f"{source['filename']} ({source['similarity_score']})"
                for source in sources[:5]  # Show top 5 scores
            ])
        else:
            similarity_scores = "No relevant sources found"
        
        return {
            "context": "\n".join(context_parts),
            "context_count": len(sources),
            "similarity_scores": similarity_scores,
            "sources": sources
        }

# Global retriever instance
document_retriever = DocumentRetriever() 