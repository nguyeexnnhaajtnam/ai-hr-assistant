import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class EvaluationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    candidate_id: uuid.UUID
    overall_score: float
    recommendation: str
    score_breakdown: dict[str, Any]
    matched_skills: list[Any]
    missing_skills: list[Any]
    risks: list[Any]
    feedback: str
    interview_questions: list[Any]
    created_at: datetime
    updated_at: datetime
