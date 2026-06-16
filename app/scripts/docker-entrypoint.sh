#!/bin/sh
set -eu

HAS_DATABASE_URL="$(python -c "from app.core.config import get_settings; print('1' if get_settings().database_url else '0')")"

if [ "$HAS_DATABASE_URL" = "1" ]; then
  echo "Waiting for database..."
  python -m app.scripts.wait_for_db

  echo "Running migrations..."
  python -m alembic upgrade head
else
  echo "DATABASE_URL is not configured. Starting app without database migrations."
fi

echo "Starting app..."
LISTEN_PORT="${PORT:-${APP_PORT:-8000}}"
echo "Listening on port ${LISTEN_PORT}"
exec python -m uvicorn app.main:app --host 0.0.0.0 --port "${LISTEN_PORT}" --access-log
