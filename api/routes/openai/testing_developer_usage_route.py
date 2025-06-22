from fastapi import APIRouter, HTTPException
from starlette.concurrency import run_in_threadpool
import openai
from pprint import pformat

from core.config import settings
from core.logger import AppLogger
from schemas.openai_schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/openai", tags=["openai"])

logger = AppLogger(__name__).get_logger()
client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)

async def get_response_content(
    model: str, messages: list[dict]
) -> str:
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
        # Convert Pydantic models to dicts using model_dump
        messages = [m.model_dump() for m in request.messages]

        # log incoming request details
        logger.info(
            "Received chat request: model=%s, messages=%s",
            request.model,
            messages
        )

        # call OpenAI and fetch response content
        content = await get_response_content(
            request.model,
            messages
        )

        # log the model’s reply
        logger.info(f"OpenAI response content:\n{pformat(content, indent=2, width=120)}")

        return ChatResponse(content=content)
    except openai.APIError as e:
        # log API errors and return 500
        logger.exception(f"OpenAI API error:\n {pformat(e, indent=2, width=120)}")
        raise HTTPException(status_code=500, detail="An OpenAI API error occurred")
    except Exception as e:
        # log unexpected errors and return 500
        logger.exception(f"Unexpected error in chat_endpoint:\n {pformat(e, indent=2, width=120)}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred")