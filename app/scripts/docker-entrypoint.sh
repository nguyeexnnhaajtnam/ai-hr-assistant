#!/bin/sh
set -eu

echo "Waiting for database..."
python -m app.scripts.wait_for_db

echo "Running migrations..."
python -m alembic upgrade head

echo "Starting app..."
exec python -m uvicorn app.main:app --host 0.0.0.0 --port "${APP_PORT:-8000}"
