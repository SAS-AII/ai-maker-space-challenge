
from pydantic import BaseModel, Field
from typing import List, Literal

class Message(BaseModel):
    role: Literal["system", "user", "assistant"] = Field(
        ..., description="Role of the message in the chat"
    )
    content: str = Field(..., description="The content of the message")

class ChatRequest(BaseModel):
    model: str = Field(
        "gpt-4.1-nano", description="The model to use for chat completions"
    )
    messages: List[Message] = Field(
        ..., description="A list of messages with roles and content"
    )

class ChatResponse(BaseModel):
    content: str = Field(..., description="The assistant's reply content")