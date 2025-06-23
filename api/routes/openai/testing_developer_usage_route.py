from fastapi import APIRouter, HTTPException
from starlette.concurrency import run_in_threadpool
import openai
from pprint import pformat

from core.config import settings
from core.logger import AppLogger
from schemas.openai_schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/openai", tags=["openai"])

logger = AppLogger(__name__).get_logger()

async def get_response_content(
    model: str, messages: list[dict], api_key: str
) -> str:
    client = openai.OpenAI(api_key=api_key)
    response = await run_in_threadpool(
        client.chat.completions.create,
        model=model,
        messages=messages
    )
    return response.choices[0].message.content

@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Send a sequence of messages with roles to the model and get its reply"
)
async def chat_endpoint(request: ChatRequest):
    try:
        messages = [m.model_dump() for m in request.messages]
        logger.info(
            "Received chat request: model=%s, messages=%s",
            request.model,
            messages
        )
        # Use the API key from the request, fallback to settings if not provided
        api_key = getattr(request, 'api_key', None) or settings.OPENAI_API_KEY
        content = await get_response_content(
            request.model,
            messages,
            api_key
        )
        logger.info(f"OpenAI response content:\n{pformat(content, indent=2, width=120)}")
        return ChatResponse(content=content)
    except openai.APIError as e:
        logger.exception(f"OpenAI API error:\n {pformat(e, indent=2, width=120)}")
        raise HTTPException(status_code=500, detail="An OpenAI API error occurred")
    except Exception as e:
        logger.exception(f"Unexpected error in chat_endpoint:\n {pformat(e, indent=2, width=120)}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred")