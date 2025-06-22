# Import required FastAPI components for building the API
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
# Import Pydantic for data validation and settings management
from pydantic import BaseModel
# Import OpenAI client for interacting with OpenAI's API
import openai
from starlette.concurrency import run_in_threadpool
from openai import OpenAI

from core.config import settings
from core.logger import AppLogger

from schemas.openai_schemas import ChatRequest, ChatResponse

# Import the router from the testing_developer_usage_route module
from api.routes.openai.testing_developer_usage_route import router as testing_developer_usage_router

# Initialize FastAPI application with a title
app = FastAPI(title="OpenAI Chat API")

# Include the testing_developer_usage_router in the app
app.include_router(testing_developer_usage_router)

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

client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
logger = AppLogger(__name__).get_logger()

# Define the main chat endpoint that handles POST requests
@app.post("/api/chat")
async def chat(request: ChatRequest):
    """
    Accept a list of messages (system/user/assistant), forward to OpenAI with streaming,
    and proxy the chunks back to the client as a text stream.
    """
    # Serialize Pydantic messages to dicts
    messages = [msg.model_dump() for msg in request.messages]
    logger.info(
        "Received chat request (streaming): model=%s, messages=%s",
        request.model,
        messages,
    )

    async def generate():  # one-line: async generator for streaming chunks
        # Launch the OpenAI streaming call in a threadpool
        stream = await run_in_threadpool(
            client.chat.completions.create,
            model=request.model,
            messages=messages,
            stream=True,
        )
        # Yield each chunk's new content as it arrives
        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta is not None:
                yield delta

    # Proxy back as a text/plain streaming response
    return StreamingResponse(generate(), media_type="text/plain")


# Define a health check endpoint to verify API status
@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

# Entry point for running the application directly
if __name__ == "__main__":
    import uvicorn
    # Start the server on all network interfaces (0.0.0.0) on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
