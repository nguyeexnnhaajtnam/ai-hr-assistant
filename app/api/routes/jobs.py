import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.job_repository import JobRepository
from app.schemas.job import JobCreateRequest, JobListResponse, JobResponse, JobUpdateRequest
from app.services.gemini_service import GeminiService
from app.utils.exceptions import GeminiResponseError

router = APIRouter()


def _merge_default_weights(requirements: dict[str, Any], default_weights: dict[str, Any] | None) -> dict[str, Any]:
    if not default_weights:
        return requirements

    merged = dict(requirements)
    for key in ("experience_weight", "domain_weight"):
        if key in default_weights and (merged.get(key) in (None, 0, 0.0)):
            merged[key] = default_weights[key]

    if "required_skills" in default_weights and not merged.get("required_skills"):
        merged["required_skills"] = default_weights["required_skills"]
    if "nice_to_have_skills" in default_weights and not merged.get("nice_to_have_skills"):
        merged["nice_to_have_skills"] = default_weights["nice_to_have_skills"]
    return merged


@router.post("/jobs", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(payload: JobCreateRequest, db: Session = Depends(get_db)) -> JobResponse:
    repository = JobRepository(db)
    gemini_service = GeminiService()

    try:
        requirements = gemini_service.parse_jd(payload.description)
    except GeminiResponseError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    requirements["title"] = requirements.get("title") or payload.title
    requirements = _merge_default_weights(requirements, payload.default_weights)

    job = repository.create(title=payload.title, description=payload.description, requirements=requirements)
    return JobResponse.model_validate(job)


@router.get("/jobs", response_model=JobListResponse)
def list_jobs(db: Session = Depends(get_db)) -> JobListResponse:
    repository = JobRepository(db)
    jobs = repository.list()
    return JobListResponse(items=[JobResponse.model_validate(job) for job in jobs])


@router.get("/jobs/{job_id}", response_model=JobResponse)
def get_job(job_id: uuid.UUID, db: Session = Depends(get_db)) -> JobResponse:
    repository = JobRepository(db)
    job = repository.get(job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
    return JobResponse.model_validate(job)


@router.patch("/jobs/{job_id}", response_model=JobResponse)
def update_job(payload: JobUpdateRequest, job_id: uuid.UUID, db: Session = Depends(get_db)) -> JobResponse:
    repository = JobRepository(db)
    gemini_service = GeminiService()

    job = repository.get(job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")

    try:
        requirements = gemini_service.parse_jd(payload.description)
    except GeminiResponseError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    requirements["title"] = requirements.get("title") or payload.title
    requirements = _merge_default_weights(requirements, payload.default_weights)

    updated_job = repository.update(
        job,
        title=payload.title,
        description=payload.description,
        requirements=requirements,
    )
    return JobResponse.model_validate(updated_job)
