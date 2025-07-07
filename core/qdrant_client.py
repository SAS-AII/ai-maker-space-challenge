"""Singleton Qdrant client configured from env vars."""
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from core.config import settings
import logging

logger = logging.getLogger(__name__)

_qdrant_client = None

def get_qdrant() -> QdrantClient:
    """Get singleton Qdrant client instance"""
    global _qdrant_client
    
    if _qdrant_client is None:
        if not settings.QDRANT_URL or not settings.QDRANT_API_KEY:
            raise ValueError("QDRANT_URL and QDRANT_API_KEY must be set in environment variables")
        
        try:
            _qdrant_client = QdrantClient(
                url=settings.QDRANT_URL,
                api_key=settings.QDRANT_API_KEY,
            )
            logger.info("Successfully connected to Qdrant Cloud")
        except Exception as e:
            logger.error(f"Failed to connect to Qdrant: {e}")
            raise
    
    return _qdrant_client

def ensure_collection_exists(collection_name: str = "knowledge_base") -> None:
    """Ensure the collection exists with proper configuration"""
    client = get_qdrant()
    
    try:
        # Check if collection already exists
        collections = client.get_collections()
        collection_names = [col.name for col in collections.collections]
        
        if collection_name not in collection_names:
            logger.info(f"Creating collection: {collection_name}")
            
            # Create collection with cosine distance (best for text embeddings)
            client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(
                    size=1536,  # OpenAI text-embedding-3-small size
                    distance=Distance.COSINE
                )
            )
            logger.info(f"Collection {collection_name} created successfully")

            # Ensure payload indexes exist for efficient filtering (e.g., filename, file_hash)
            # Qdrant requires an index on a payload field to use it inside a filter
            try:
                indexed_fields = client.get_collection(collection_name).payload_schema.keys()
            except Exception:
                indexed_fields = []

            # Fields to ensure indexes for (keyword type)
            for field in ["filename", "file_hash"]:
                if field not in indexed_fields:
                    try:
                        logger.info(f"Creating payload index for field: {field}")
                        client.create_payload_index(
                            collection_name=collection_name,
                            field_name=field,
                            field_schema={"type": "keyword"}
                        )
                        logger.info(f"Index created for {field}")
                    except Exception as ie:
                        logger.warning(f"Could not create index for {field}: {ie}")
        else:
            logger.info(f"Collection {collection_name} already exists")
            
            # Ensure indexes exist regardless of whether collection was just created or already existed
            try:
                indexed_fields = client.get_collection(collection_name).payload_schema.keys()
            except Exception:
                indexed_fields = []

            for field in ["filename", "file_hash"]:
                if field not in indexed_fields:
                    try:
                        logger.info(f"Creating payload index for field: {field}")
                        client.create_payload_index(
                            collection_name=collection_name,
                            field_name=field,
                            field_schema={"type": "keyword"}
                        )
                        logger.info(f"Index created for {field}")
                    except Exception as ie:
                        logger.warning(f"Could not create index for {field}: {ie}")
            
    except Exception as e:
        logger.error(f"Error ensuring collection exists: {e}")
        raise 