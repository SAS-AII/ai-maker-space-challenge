"""Document ingestion module using aimakerspace components and Qdrant"""
import tempfile
import os
import hashlib
import uuid
import re
from typing import List, Dict, Any
from fastapi import UploadFile, HTTPException
import logging

from aimakerspace.text_utils import PDFLoader, CharacterTextSplitter
from aimakerspace.openai_utils.embedding import EmbeddingModel
from core.qdrant_client import get_qdrant, ensure_collection_exists
from qdrant_client.models import PointStruct

logger = logging.getLogger(__name__)

def clean_pdf_text(text: str) -> str:
    """
    Clean PDF text by removing special characters and formatting issues
    while preserving important document structure
    
    Args:
        text: Raw text from PDF
        
    Returns:
        Cleaned text suitable for embedding
    """
    if not text:
        return ""
    
    # Replace common PDF artifacts and special characters
    text = re.sub(r'[^\w\s\.\,\;\:\!\?\-\(\)\[\]\{\}\'\""\n]+', ' ', text)  # Keep quotes and newlines
    text = re.sub(r'\s+', ' ', text)  # Normalize whitespace (but preserve newlines)
    text = re.sub(r'\.{3,}', '...', text)  # Normalize ellipsis
    text = re.sub(r'-{2,}', '--', text)  # Normalize dashes
    text = text.replace('\x00', '')  # Remove null characters
    text = text.replace('\ufeff', '')  # Remove BOM
    text = text.replace('\xa0', ' ')  # Replace non-breaking space
    text = text.replace('\t', ' ')  # Replace tabs with spaces
    
    # Preserve chapter/section headers by keeping them on separate lines
    # Common patterns for chapter headers
    chapter_patterns = [
        r'CAPÍTULO\s+\d+',
        r'CAPITULO\s+\d+',
        r'Chapter\s+\d+',
        r'Sección\s+\d+',
        r'Section\s+\d+',
        r'Tema\s+\d+',
        r'Parte\s+\d+'
    ]
    
    # Ensure chapter headers are on their own lines
    for pattern in chapter_patterns:
        text = re.sub(f'({pattern})', r'\n\1\n', text, flags=re.IGNORECASE)
    
    # Remove excessive line breaks but preserve paragraph structure
    text = re.sub(r'\n{4,}', '\n\n\n', text)  # Keep max 3 consecutive newlines
    text = re.sub(r'[ \t]*\n[ \t]*', '\n', text)  # Clean line endings
    
    # Remove lines that are just numbers (page numbers, etc.) but keep chapter numbers
    lines = text.split('\n')
    cleaned_lines = []
    for line in lines:
        line = line.strip()
        if line:
            # Keep lines that are just numbers if they might be chapter numbers
            if line.isdigit() and len(line) <= 3:  # Likely page numbers
                continue
            # Keep lines with meaningful content
            if len(line) > 1:
                cleaned_lines.append(line)
    
    text = '\n'.join(cleaned_lines)
    text = text.strip()
    
    return text

def extract_chapter_info(text: str) -> Dict[str, Any]:
    """
    Extract chapter and section information from text
    
    Args:
        text: Document text
        
    Returns:
        Dict with chapter information
    """
    chapter_info = {
        "current_chapter": None,
        "current_section": None,
        "chapter_number": None,
        "section_number": None
    }
    
    # Look for chapter patterns
    chapter_patterns = [
        (r'CAPÍTULO\s+(\d+)', 'CAPÍTULO'),
        (r'CAPITULO\s+(\d+)', 'CAPÍTULO'),
        (r'Chapter\s+(\d+)', 'Chapter'),
        (r'Sección\s+(\d+)', 'Sección'),
        (r'Section\s+(\d+)', 'Section'),
        (r'Tema\s+(\d+)', 'Tema'),
        (r'Parte\s+(\d+)', 'Parte')
    ]
    
    for pattern, prefix in chapter_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            chapter_info["current_chapter"] = f"{prefix} {match.group(1)}"
            chapter_info["chapter_number"] = int(match.group(1))
            break
    
    return chapter_info

class SmartTextSplitter:
    """Intelligent text splitter that preserves document structure"""
    
    def __init__(
        self,
        chunk_size: int = 1500,  # Increased from 1000
        chunk_overlap: int = 300,  # Increased from 200
        preserve_chapters: bool = True
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.preserve_chapters = preserve_chapters
    
    def split_text(self, text: str) -> List[Dict[str, Any]]:
        """
        Split text into chunks while preserving document structure
        
        Args:
            text: Text to split
            
        Returns:
            List of chunks with metadata
        """
        if not text:
            return []
        
        chunks = []
        lines = text.split('\n')
        current_chunk = ""
        current_chunk_lines = []
        chunk_metadata = {}
        
        for line in lines:
            # Check if this line contains chapter information
            chapter_info = extract_chapter_info(line)
            
            # If we find a new chapter and we have content, start a new chunk
            if (chapter_info["current_chapter"] and 
                current_chunk and 
                len(current_chunk) > self.chunk_size // 2):
                
                # Save current chunk
                chunks.append({
                    "content": current_chunk.strip(),
                    "metadata": chunk_metadata.copy()
                })
                
                # Start new chunk with chapter info
                current_chunk = line + "\n"
                current_chunk_lines = [line]
                chunk_metadata = chapter_info
                continue
            
            # Add line to current chunk
            current_chunk += line + "\n"
            current_chunk_lines.append(line)
            
            # Update metadata if we find chapter info
            if chapter_info["current_chapter"]:
                chunk_metadata.update(chapter_info)
            
            # Check if we need to split due to size
            if len(current_chunk) >= self.chunk_size:
                # Try to split at a natural boundary (paragraph break)
                split_point = self._find_natural_split(current_chunk_lines)
                
                if split_point > 0:
                    # Split at natural boundary
                    chunk_content = "\n".join(current_chunk_lines[:split_point])
                    chunks.append({
                        "content": chunk_content.strip(),
                        "metadata": chunk_metadata.copy()
                    })
                    
                    # Start new chunk with overlap
                    overlap_lines = current_chunk_lines[max(0, split_point - 3):split_point]
                    current_chunk = "\n".join(overlap_lines) + "\n"
                    current_chunk_lines = overlap_lines
                else:
                    # Force split
                    chunks.append({
                        "content": current_chunk.strip(),
                        "metadata": chunk_metadata.copy()
                    })
                    current_chunk = ""
                    current_chunk_lines = []
                    chunk_metadata = {}
        
        # Add final chunk if there's content
        if current_chunk.strip():
            chunks.append({
                "content": current_chunk.strip(),
                "metadata": chunk_metadata.copy()
            })
        
        return chunks
    
    def _find_natural_split(self, lines: List[str]) -> int:
        """
        Find a natural split point in the text
        
        Args:
            lines: List of text lines
            
        Returns:
            Index to split at
        """
        # Look for paragraph breaks (empty lines) in the second half
        start_search = len(lines) // 2
        
        for i in range(start_search, len(lines)):
            if not lines[i].strip():  # Empty line
                return i
        
        # If no natural break found, return the middle
        return len(lines) // 2

class DocumentIngestor:
    """Handles document ingestion to Qdrant using aimakerspace components"""
    
    def __init__(self, collection_name: str = "knowledge_base"):
        self.collection_name = collection_name
        self.embedding_model = EmbeddingModel()
        self.text_splitter = SmartTextSplitter(
            chunk_size=1500,
            chunk_overlap=300,
            preserve_chapters=True
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
        # Determine file extension
        file_ext = os.path.splitext(file.filename)[1].lower()

        SUPPORTED_EXTS = [
            '.pdf', '.txt', '.md', '.py', '.js', '.ts', '.tsx', '.json', '.csv', '.sql', '.html', '.css', '.yaml', '.yml', '.java'
        ]

        if file_ext not in SUPPORTED_EXTS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type '{file_ext}'. Supported: {', '.join(SUPPORTED_EXTS)}"
            )
        
        temp_file_path = None
        try:
            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
                # Read file bytes and write to temp file
                file_content = await file.read()
                tmp_file.write(file_content)
                temp_file_path = tmp_file.name
            
            logger.info(f"Processing file: {file.filename} (temp: {temp_file_path})")
            
            if file_ext == '.pdf':
                # Load PDF using aimakerspace PDFLoader
                pdf_loader = PDFLoader(temp_file_path)
                documents = pdf_loader.load_documents()
            else:
                # For text/code files, read entire content
                with open(temp_file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    text_content = f.read()
                documents = [text_content]
            
            if not documents:
                raise HTTPException(
                    status_code=400,
                    detail="No text could be extracted from the file"
                )
            
            logger.info(f"Extracted {len(documents)} document(s) from file")
            
            # Clean the extracted text to remove special characters and artifacts
            cleaned_documents = []
            for doc in documents:
                cleaned_text = clean_pdf_text(doc)
                if cleaned_text:  # Only include non-empty cleaned documents
                    cleaned_documents.append(cleaned_text)
            
            if not cleaned_documents:
                raise HTTPException(
                    status_code=400,
                    detail="No usable text could be extracted from the file after cleaning"
                )
            
            logger.info(f"Cleaned documents, {len(cleaned_documents)} usable document(s)")
            
            # Split text into chunks using smart splitter
            all_chunks = []
            for doc in cleaned_documents:
                chunks = self.text_splitter.split_text(doc)
                all_chunks.extend(chunks)
            
            logger.info(f"Created {len(all_chunks)} text chunks")
            
            # Generate embeddings for chunks
            chunk_texts = [chunk["content"] for chunk in all_chunks]
            embeddings = self.embedding_model.get_embeddings(chunk_texts)
            logger.info(f"Generated {len(embeddings)} embeddings")
            
            # Create points for Qdrant
            points = []
            file_hash = hashlib.md5(file_content).hexdigest()
            
            for i, (chunk, embedding) in enumerate(zip(all_chunks, embeddings)):
                # Use UUID for point ID (Qdrant requirement)
                point_id = str(uuid.uuid4())
                
                # Prepare payload with enhanced metadata
                payload = {
                    "content": chunk["content"],
                    "filename": file.filename,
                    "chunk_index": i,
                    "total_chunks": len(all_chunks),
                    "file_hash": file_hash,
                    "content_type": file_ext.lstrip('.')
                }
                
                # Add chapter metadata if available
                if chunk["metadata"]:
                    payload.update(chunk["metadata"])
                
                point = PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload=payload
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
                "chunks_created": len(all_chunks),
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