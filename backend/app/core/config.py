from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    PROJECT_NAME: str = "Caby Ride"
    DATABASE_URL: str
    REDIS_HOST: str
    GOOGLE_MAPS_KEY: str
    STRIPE_API_KEY: str
    ALLOWED_ORIGINS_STR: str = '["http://localhost:3000"]'

    @property
    def ALLOWED_ORIGINS(self) -> List[str]:
        return json.loads(self.ALLOWED_ORIGINS_STR)

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
