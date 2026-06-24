from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import SQLAlchemyError

from app.api.routes.candidates import router as candidates_router
from app.api.routes.jobs import router as jobs_router
from app.core.config import get_settings
from app.utils.exceptions import DatabaseUnavailableError

PROJECT_ROOT = Path(__file__).resolve().parents[1]
FRONTEND_DIST_DIR = PROJECT_ROOT / "frontend" / "dist"


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    settings.local_upload_dir.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(
    title="AI HR Scanner API",
    version="0.1.0",
    description="MVP local backend for HR CV scanning and evaluation.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(DatabaseUnavailableError)
async def database_unavailable_handler(_: Request, exc: DatabaseUnavailableError) -> JSONResponse:
    return JSONResponse(status_code=503, content={"detail": str(exc)})


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_error_handler(_: Request, exc: SQLAlchemyError) -> JSONResponse:
    return JSONResponse(
        status_code=503,
        content={
            "detail": "Database request failed. Verify the Railway PostgreSQL service is attached and migrations ran.",
            "error": exc.__class__.__name__,
        },
    )

app.include_router(jobs_router, prefix="/api", tags=["jobs"])
app.include_router(candidates_router, prefix="/api", tags=["candidates"])

if (FRONTEND_DIST_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST_DIR / "assets"), name="frontend-assets")


@app.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/", include_in_schema=False, response_model=None)
def frontend_index():
    index_file = FRONTEND_DIST_DIR / "index.html"
    if index_file.exists():
        return HTMLResponse(index_file.read_text(encoding="utf-8"))
    return {
        "message": "Frontend build not found. Run `npm.cmd run build` inside `frontend/` or use `/docs` for Swagger.",
    }


@app.get("/favicon.ico", include_in_schema=False)
def favicon() -> Response:
    return Response(status_code=204)


@app.get("/{full_path:path}", include_in_schema=False, response_model=None)
def frontend_spa_fallback(full_path: str):
    index_file = FRONTEND_DIST_DIR / "index.html"
    if index_file.exists() and full_path.split("/", 1)[0] in {"dashboard", "jobs", "candidates", "evaluations", "settings"}:
        return HTMLResponse(index_file.read_text(encoding="utf-8"))
    return JSONResponse(status_code=404, content={"detail": "Not found"})
