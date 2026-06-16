from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


def _require_database_url() -> str:
    settings = get_settings()
    if not settings.database_url:
        raise RuntimeError(
            "DATABASE_URL is not configured. Attach a Railway PostgreSQL service or set DATABASE_URL manually."
        )
    return settings.database_url


@lru_cache
def get_engine():
    return create_engine(_require_database_url(), future=True)


@lru_cache
def get_session_local():
    return sessionmaker(bind=get_engine(), autoflush=False, autocommit=False, class_=Session)


def get_db() -> Generator[Session, None, None]:
    db = get_session_local()()
    try:
        yield db
    finally:
        db.close()
