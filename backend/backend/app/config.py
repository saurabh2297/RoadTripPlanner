from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

ENV_FILE = Path(__file__).resolve().parents[1] / ".env"

class Settings(BaseSettings):
    ai_key: str
    ai_url: str = "https://api.openai.com/v1"
    ai_model: str
    google_maps_api_key: str | None = None
    route_buffer_ratio: float = Field(default=0.3, ge=0, le=1)
    max_daily_driving_hours: float = Field(default=8.0, gt=0)

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8"
    )

settings = Settings()
