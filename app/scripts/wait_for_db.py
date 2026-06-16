from __future__ import annotations

import time

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import get_settings
from app.core.database import get_engine


def main() -> None:
    settings = get_settings()
    if not settings.database_url:
        print("DATABASE_URL is not configured. Skipping database wait.")
        return

    timeout_seconds = 90
    delay_seconds = 2
    started_at = time.time()
    engine = get_engine()

    while True:
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
                print("Database is ready.")
                return
        except SQLAlchemyError as exc:
            if time.time() - started_at > timeout_seconds:
                raise RuntimeError("Database did not become ready in time.") from exc
            print(f"Database not ready yet: {exc}")
            time.sleep(delay_seconds)


if __name__ == "__main__":
    main()
