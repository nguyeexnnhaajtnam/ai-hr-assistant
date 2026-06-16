import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.schemas.evaluation import EvaluationResponse


class CandidateBaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    job_id: uuid.UUID
    name: str | None
    email: str | None
    phone: str | None
    original_filename: str
    file_path: str
    created_at: datetime
    updated_at: datetime


class CandidateListItemResponse(CandidateBaseResponse):
    overall_score: float | None = None
    recommendation: str | None = None


class CandidateDetailResponse(CandidateBaseResponse):
    raw_text: str
    parsed_cv: dict[str, Any]
    evaluation: EvaluationResponse | None = None


class CandidateListResponse(BaseModel):
    items: list[CandidateListItemResponse]
