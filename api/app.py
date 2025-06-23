# Import required FastAPI components for building the API
from fastapi import FastAPI, HTTPException, Form, File, UploadFile, Request, Body
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
# Import Pydantic for data validation and settings management
from pydantic import BaseModel
# Import OpenAI client for interacting with OpenAI's API
import openai
from starlette.concurrency import run_in_threadpool
from openai import OpenAI
from typing import List, Optional
import base64
import json

from core.config import settings
from core.logger import AppLogger

from schemas.openai_schemas import ChatRequest, ChatResponse

# Initialize FastAPI application with a title
app = FastAPI(title="OpenAI Chat API")

# Configure CORS (Cross-Origin Resource Sharing) middleware
# This allows the API to be accessed from different domains/originsP
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows requests from any origin
    allow_credentials=True,  # Allows cookies to be included in requests
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers in requests
)

# # Define the data model for chat requests using Pydantic
# # This ensures incoming request data is properly validated
# class ChatRequest(BaseModel):
#     developer_message: str  # Message from the developer/system
#     user_message: str      # Message from the user
#     model: Optional[str] = "gpt-4.1-mini"  # Optional model selection with default
#     api_key: str          # OpenAI API key for authentication

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
    apiKey: Optional[str] = Form(None)
):
    """
    Accepts a list of messages and optional images, forwards to OpenAI with streaming,
    and proxies the chunks back to the client as a text stream.
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
            logger.info(f"Processing uploaded image: {img.filename}, type: {img.content_type}")
            # Construct the user message with image content
            # OpenAI expects a specific format for this
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

    logger.info(f"Received chat request: model=gpt-4o-mini, messages_count={len(messages_list)}, images_count={len(images) if images else 0}")

    # Always require user-provided apiKey
    openai_client = openai.OpenAI(api_key=apiKey)

    async def generate():
        try:
            # Launch the OpenAI streaming call in a threadpool
            stream = await run_in_threadpool(
                openai_client.chat.completions.create,
                model="gpt-4o-mini",
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

# Define a health check endpoint to verify API status
@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

# # Entry point for running the application directly
# if __name__ == "__main__":
#     import uvicorn
#     # Start the server on all network interfaces (0.0.0.0) on port 8000
#     uvicorn.run(app, host="0.0.0.0", port=8000)
