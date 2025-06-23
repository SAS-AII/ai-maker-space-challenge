from typing import List
from pydantic import Field
from typing import ClassVar
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # OpenAI Related Settings
    OPENAI_API_KEY: str = Field('', env="OPENAI_API_KEY")
    # OPENAI_MODEL: str = Field("gpt-4o-mini", env="OPENAI_MODEL")


    # Application environment (production or development)
    ENVIRONMENT: str = Field("development", env="ENVIRONMENT")
    
    class Config:
        env_file = ".env"

settings = Settings()
