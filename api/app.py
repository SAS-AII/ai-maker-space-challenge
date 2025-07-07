# Import required FastAPI components for building the API
from fastapi import FastAPI, HTTPException, Form, File, UploadFile, Request, Body
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
# Import OpenAI client for interacting with OpenAI's API
import openai
from starlette.concurrency import run_in_threadpool
from typing import List, Optional
import base64
import json

from core.config import settings
from core.logger import AppLogger

from schemas.openai_schemas import ChatRequest, ChatResponse

# Import RAG components
from rag.retrieve import document_retriever
from rag.prompts import format_rag_system_prompt, format_rag_user_prompt
from api.knowledge import router as knowledge_router

# Initialize FastAPI application with a title
app = FastAPI(title="OpenAI Chat API with RAG")

# Configure CORS (Cross-Origin Resource Sharing) middleware
# This allows the API to be accessed from different domains/originsP
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows requests from any origin
    allow_credentials=True,  # Allows cookies to be included in requests
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers in requests
)

# Include RAG knowledge management router
app.include_router(knowledge_router)


logger = AppLogger(__name__).get_logger()

# Add middleware to log all incoming requests
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Incoming request: {request.method} {request.url.path}")
    logger.info(f"Headers: {dict(request.headers)}")
    try:
        body = await request.body()
        logger.info(f"Body: {body.decode('utf-8', errors='replace')}")
    except Exception as e:
        logger.error(f"Could not read body: {e}")
    response = await call_next(request)
    logger.info(f"Response status: {response.status_code}")
    return response

@app.post("/api/chat")
async def chat(
    messages: str = Form(...),
    images: Optional[List[UploadFile]] = File(None),
    apiKey: Optional[str] = Form(None),
    model: str = Form("gpt-4o-mini"),
    useRAG: bool = Form(False)
):
    """
    Enhanced chat endpoint with RAG support
    - useRAG=True: Uses RAG to search knowledge base and enhance answers
    - useRAG=False: Regular chat (original behavior)
    - Accepts a list of messages and optional images
    - Forwards to OpenAI with streaming
    """
    if not apiKey:
        logger.error("API key is required. Please provide your OpenAI API key in the settings.")
        raise HTTPException(status_code=400, detail="API key is required. Please provide your OpenAI API key in the settings.")
    try:
        messages_list = json.loads(messages)
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in messages field: {e}")
        raise HTTPException(status_code=400, detail="Invalid JSON in messages field")

    if images:
        for img in images:
            content = await img.read()
            base64_image = base64.b64encode(content).decode("utf-8")
            #logger.info(f"Processing uploaded image: {img.filename}, type: {img.content_type}")
            messages_list.append({
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{img.content_type};base64,{base64_image}"
                        }
                    }
                ]
            })

    logger.info(
        f"Received chat request: model={model}, messages_count={len(messages_list)}, images_count={len(images) if images else 0}, useRAG={useRAG}"
    )

    # Enhanced logic for RAG
    if useRAG and messages_list:
        # Get the last user message for RAG
        last_user_message = None
        for msg in reversed(messages_list):
            if msg.get("role") == "user":
                # Handle both text and image messages
                if isinstance(msg.get("content"), str):
                    last_user_message = msg["content"]
                    break
                elif isinstance(msg.get("content"), list):
                    # Find text content in multi-modal messages
                    for content_item in msg["content"]:
                        if content_item.get("type") == "text":
                            last_user_message = content_item.get("text", "")
                            break
                    if last_user_message:
                        break
        
        if last_user_message:
            try:
                # Get context from knowledge base
                context_data = await document_retriever.get_context_for_query(
                    query=last_user_message,
                    max_chunks=5,
                    max_chars=4000
                )
                
                if context_data.get("context_count", 0) > 0:
                    # Format RAG prompts
                    system_prompt = format_rag_system_prompt()
                    user_prompt = format_rag_user_prompt(
                        context=context_data["context"],
                        context_count=context_data["context_count"],
                        similarity_scores=context_data["similarity_scores"],
                        user_query=last_user_message
                    )
                    
                    # Replace messages with RAG-enhanced versions
                    messages_list = [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ]
                    
                    logger.info(f"Enhanced message with RAG context from {context_data['context_count']} sources")
                else:
                    logger.info("No relevant context found for RAG, proceeding with original message")
                    
            except Exception as e:
                logger.error(f"RAG processing error: {e}, proceeding without RAG")
                # Continue with original message if RAG fails

    # User-provided apiKey
    openai_client = openai.OpenAI(api_key=apiKey)

    async def generate():
        try:
            # Launch the OpenAI streaming call in a threadpool
            stream = await run_in_threadpool(
                openai_client.chat.completions.create,
                model=model,
                messages=messages_list,
                stream=True,
            )
            for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta is not None:
                    yield delta
        except Exception as e:
            logger.error(f"Error during OpenAI streaming: {e}")
            raise

    return StreamingResponse(generate(), media_type="text/plain")

@app.post("/api/validate-key")
async def validate_key(apiKey: str = Body(..., embed=True)):
    """
    Validates an OpenAI API key by making a minimal harmless API call.
    Returns { valid: true } if the key is valid, otherwise { valid: false, error: ... }
    """
    try:
        openai_client = openai.OpenAI(api_key=apiKey)
        # Minimal harmless call: list models
        await run_in_threadpool(openai_client.models.list)
        return {"valid": True}
    except openai.AuthenticationError:
        return {"valid": False, "error": "Invalid API key."}
    except Exception as e:
        return {"valid": False, "error": str(e)}

# Health check endpoint to verify API status
@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

# # Entry point for running the application directly
# if __name__ == "__main__":
#     import uvicorn
#     # Start the server on all network interfaces (0.0.0.0) on port 8000
#     uvicorn.run(app, host="0.0.0.0", port=8000)
