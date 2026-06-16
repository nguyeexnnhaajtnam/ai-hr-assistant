from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings
from app.utils.exceptions import DatabaseUnavailableError


class Base(DeclarativeBase):
    pass


def normalize_database_url(url: str) -> str:
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql://") and "+psycopg" not in url:
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


def _require_database_url() -> str:
    settings = get_settings()
    if not settings.database_url:
        raise DatabaseUnavailableError(
            "DATABASE_URL is not configured. Attach a Railway PostgreSQL service or set DATABASE_URL manually."
        )
    return normalize_database_url(settings.database_url)


@lru_cache
def get_engine():
    return create_engine(_require_database_url(), future=True, pool_pre_ping=True)


@lru_cache
def get_session_local():
    return sessionmaker(bind=get_engine(), autoflush=False, autocommit=False, class_=Session)


def get_db() -> Generator[Session, None, None]:
    db = get_session_local()()
    try:
        yield db
    finally:
        db.close()
