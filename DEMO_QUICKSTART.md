# Demo Quickstart

## Goal

Run the app on a Windows machine with one start script and one stop script.

## Standard scripts

Only use these two scripts from now on:

- `start.ps1`
- `stop.ps1`

## Prerequisite

Install `Docker Desktop` once on the machine.

## Start the app

Open PowerShell in the project root and run:

```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

If you already have a real Gemini key:

```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1 -GeminiApiKey "your_real_key"
```

If you want to start without auto-opening the browser:

```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1 -NoOpenBrowser
```

## What the start script does

The script will:

1. build the frontend into the app image
2. start PostgreSQL in Docker
3. run Alembic migrations
4. start the API and UI
5. open the browser

## URLs after startup

- UI: `http://127.0.0.1:8000/`
- Swagger: `http://127.0.0.1:8000/docs`
- Health: `http://127.0.0.1:8000/health`

## Stop the app

```powershell
powershell -ExecutionPolicy Bypass -File .\stop.ps1
```

## Notes

- The app now starts with a clean database by default.
- Real JD parsing and real CV parsing still need a valid `GEMINI_API_KEY`.
- The built frontend is served directly by FastAPI at `/`.
