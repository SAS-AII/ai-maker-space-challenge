from typing import List
from pydantic import Field
from typing import ClassVar
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # OpenAI Related Settings
    OPENAI_API_KEY: str = Field('', env="OPENAI_API_KEY")
    QDRANT_URL: str = Field(..., env="QDRANT_URL")
    QDRANT_API_KEY: str = Field(..., env="QDRANT_API_KEY")
    # OPENAI_MODEL: str = Field("gpt-4o-mini", env="OPENAI_MODEL")

settings = Settings()
