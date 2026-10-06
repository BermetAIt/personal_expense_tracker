from functools import lru_cache
from pathlib import Path
from secrets import token_urlsafe

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    database_url: str = "sqlite:///./money_tracker.db"
    jwt_secret_key: SecretStr = SecretStr(token_urlsafe(48))
    access_token_expire_minutes: int = 60
    frontend_dir: str = "frontend"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def frontend_path(self) -> Path:
        path = Path(self.frontend_dir)
        return path if path.is_absolute() else PROJECT_ROOT / path


@lru_cache
def get_settings() -> Settings:
    return Settings()