# Local Build Guide

## Current status on this machine

The project has already been brought up locally with these steps completed:

- PostgreSQL service `postgresql-x64-17` was running
- Database `ai_hr_scanner` was created
- Python dependencies in `.venv` were already installed
- Alembic migration `20250615_000001` was applied successfully
- `.env` was created locally

## Files used

- `.env`
- `requirements.txt`
- `alembic.ini`
- `README.md`

## Local `.env` template

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/ai_hr_scanner
GEMINI_API_KEY=replace_with_real_gemini_key
LOCAL_UPLOAD_DIR=uploads
```

## Full setup from scratch

### 1. Open project folder

```powershell
cd e:\Workplace\ai-hr-assistant-tool
```

### 2. Create and activate virtual environment

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

If PowerShell blocks activation:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\.venv\Scripts\Activate.ps1
```

### 3. Install dependencies

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

### 4. Ensure PostgreSQL is running

Check service:

```powershell
Get-Service | Where-Object { $_.Name -like 'postgres*' -or $_.DisplayName -like '*PostgreSQL*' }
```

### 5. Create database

If your local postgres password is `postgres`:

```powershell
$env:PGPASSWORD='postgres'
& 'C:\Program Files\PostgreSQL\17\bin\psql.exe' -h localhost -U postgres -d postgres -c "CREATE DATABASE ai_hr_scanner;"
```

If the database already exists, PostgreSQL will return an error and you can ignore it.

### 6. Create `.env`

```powershell
Copy-Item .env.example .env
```

Then edit `.env` to real values:

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/ai_hr_scanner
GEMINI_API_KEY=replace_with_real_gemini_key
LOCAL_UPLOAD_DIR=uploads
```

### 7. Run migration

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
```

### 8. Start API

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

## Verify app is running

Open:

- Swagger: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/health

Or test in PowerShell:

```powershell
Invoke-WebRequest http://127.0.0.1:8000/health | Select-Object -ExpandProperty Content
```

Expected response:

```json
{"status":"ok"}
```

## Run the React frontend

Open a second terminal:

```powershell
cd e:\Workplace\ai-hr-assistant-tool\frontend
npm.cmd install
npm.cmd run dev
```

Then open:

- Frontend UI: http://127.0.0.1:5173
- Backend Swagger: http://127.0.0.1:8000/docs

The frontend talks to the backend API at `http://127.0.0.1:8000`.

## Important note about Gemini

The API can boot without a real Gemini key, but these endpoints need a valid `GEMINI_API_KEY` to work correctly:

- `POST /jobs`
- `POST /jobs/{job_id}/candidates`

Without a real Gemini key, server startup still works, but JD parsing, CV parsing, and feedback generation will fail when called.

## Handy commands

### Re-run migration

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
```

### Start app without activating venv

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

### Stop app

If running in the current terminal, press `Ctrl + C`.

If running in background:

```powershell
Get-Process python | Stop-Process
```

Use that carefully if you have other Python processes running.

## Troubleshooting

### Password authentication failed for user `postgres`

This means PostgreSQL is running, but the password entered is wrong.

If your machine already accepts this credential, use:

- user: `postgres`
- password: `postgres`

If not, either:

- use pgAdmin to create the DB
- or reset the postgres password in PostgreSQL local config

### Port 8000 already in use

Find the process:

```powershell
Get-NetTCPConnection -LocalPort 8000 | Select-Object LocalAddress,LocalPort,State,OwningProcess
```

Then inspect it:

```powershell
Get-Process -Id <PID>
```

### Database connection issue

Verify the database exists:

```powershell
$env:PGPASSWORD='postgres'
& 'C:\Program Files\PostgreSQL\17\bin\psql.exe' -h localhost -U postgres -d postgres -tAc "SELECT datname FROM pg_database WHERE datname='ai_hr_scanner'"
```

## Suggested next step

Replace `GEMINI_API_KEY` in `.env` with your real key, restart the API, then test job creation from Swagger.
