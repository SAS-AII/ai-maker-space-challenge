"""Document ingestion module using aimakerspace components and Qdrant"""
import tempfile
import os
import hashlib
import uuid
from typing import List, Dict, Any
from fastapi import UploadFile, HTTPException
import logging

from aimakerspace.text_utils import PDFLoader, CharacterTextSplitter
from aimakerspace.openai_utils.embedding import EmbeddingModel
from core.qdrant_client import get_qdrant, ensure_collection_exists
from qdrant_client.models import PointStruct

logger = logging.getLogger(__name__)

class DocumentIngestor:
    """Handles document ingestion to Qdrant using aimakerspace components"""
    
    def __init__(self, collection_name: str = "knowledge_base"):
        self.collection_name = collection_name
        self.embedding_model = EmbeddingModel()
        self.text_splitter = CharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        # Ensure collection exists
        ensure_collection_exists(self.collection_name)
    
    async def upload_to_qdrant(self, file: UploadFile) -> Dict[str, Any]:
        """
        Process uploaded file and store vectors in Qdrant
        
        Args:
            file: FastAPI UploadFile object
            
        Returns:
            Dict with ingestion results
        """
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(
                status_code=400, 
                detail="Only PDF files are supported currently"
            )
        
        temp_file_path = None
        try:
            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
                # Read file bytes and write to temp file
                file_content = await file.read()
                tmp_file.write(file_content)
                temp_file_path = tmp_file.name
            
            logger.info(f"Processing file: {file.filename} (temp: {temp_file_path})")
            
            # Load PDF using aimakerspace PDFLoader
            pdf_loader = PDFLoader(temp_file_path)
            documents = pdf_loader.load_documents()
            
            if not documents:
                raise HTTPException(
                    status_code=400,
                    detail="No text could be extracted from the PDF"
                )
            
            logger.info(f"Extracted {len(documents)} document(s) from PDF")
            
            # Split text into chunks using aimakerspace splitter
            chunks = self.text_splitter.split_texts(documents)
            logger.info(f"Created {len(chunks)} text chunks")
            
            # Generate embeddings for chunks
            embeddings = self.embedding_model.get_embeddings([chunk for chunk in chunks])
            logger.info(f"Generated {len(embeddings)} embeddings")
            
            # Create points for Qdrant
            points = []
            file_hash = hashlib.md5(file_content).hexdigest()
            
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                # Use UUID for point ID (Qdrant requirement)
                point_id = str(uuid.uuid4())
                
                point = PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload={
                        "content": chunk,
                        "filename": file.filename,
                        "chunk_index": i,
                        "total_chunks": len(chunks),
                        "file_hash": file_hash,
                        "content_type": "pdf"
                    }
                )
                points.append(point)
            
            # Upload to Qdrant
            client = get_qdrant()
            operation_info = client.upsert(
                collection_name=self.collection_name,
                points=points
            )
            
            logger.info(f"Successfully uploaded {len(points)} points to Qdrant")
            
            return {
                "filename": file.filename,
                "chunks_created": len(chunks),
                "vectors_stored": len(points),
                "file_hash": file_hash,
                "collection": self.collection_name
            }
            
        except Exception as e:
            logger.error(f"Error processing file {file.filename}: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Error processing document: {str(e)}"
            )
        finally:
            # Always clean up temporary file
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.unlink(temp_file_path)
                    logger.info(f"Cleaned up temporary file: {temp_file_path}")
                except Exception as e:
                    logger.warning(f"Failed to clean up temp file: {e}")

# Global ingestor instance
document_ingestor = DocumentIngestor() 