from functools import lru_cache
from pathlib import Path
from typing import Any

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str | None = Field(
        validation_alias=AliasChoices(
            "DATABASE_URL",
            "DATABASE_PRIVATE_URL",
            "DATABASE_PUBLIC_URL",
            "POSTGRES_URL",
            "POSTGRESQL_URL",
        )
    )
    gemini_api_key: str | None = Field(default=None, alias="GEMINI_API_KEY")
    gemini_model: str = Field(default="gemini-2.5-flash-lite", alias="GEMINI_MODEL")
    local_upload_dir: Path = Field(default=Path("uploads"), alias="LOCAL_UPLOAD_DIR")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @model_validator(mode="before")
    @classmethod
    def populate_database_url(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data

        configured_url = next(
            (
                data.get(key)
                for key in (
                    "DATABASE_URL",
                    "DATABASE_PRIVATE_URL",
                    "DATABASE_PUBLIC_URL",
                    "POSTGRES_URL",
                    "POSTGRESQL_URL",
                )
                if data.get(key)
            ),
            None,
        )
        if configured_url:
            data["DATABASE_URL"] = configured_url
            return data

        pg_host = data.get("PGHOST")
        pg_port = data.get("PGPORT", "5432")
        pg_user = data.get("PGUSER")
        pg_password = data.get("PGPASSWORD")
        pg_database = data.get("PGDATABASE")

        if all((pg_host, pg_user, pg_password, pg_database)):
            data["DATABASE_URL"] = (
                f"postgresql+psycopg://{pg_user}:{pg_password}@{pg_host}:{pg_port}/{pg_database}"
            )

        return data


@lru_cache
def get_settings() -> Settings:
    return Settings()
