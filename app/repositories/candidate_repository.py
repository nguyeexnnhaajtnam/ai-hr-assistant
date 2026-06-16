import uuid

from sqlalchemy import desc, select
from sqlalchemy.orm import Session, joinedload

from app.models.candidate import Candidate
from app.models.evaluation import Evaluation


class CandidateRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        *,
        job_id: uuid.UUID,
        name: str | None,
        email: str | None,
        phone: str | None,
        original_filename: str,
        file_path: str,
        raw_text: str,
        parsed_cv: dict,
    ) -> Candidate:
        candidate = Candidate(
            job_id=job_id,
            name=name,
            email=email,
            phone=phone,
            original_filename=original_filename,
            file_path=file_path,
            raw_text=raw_text,
            parsed_cv=parsed_cv,
        )
        self.db.add(candidate)
        self.db.flush()
        return candidate

    def get(self, candidate_id: uuid.UUID) -> Candidate | None:
        stmt = (
            select(Candidate)
            .options(joinedload(Candidate.evaluation), joinedload(Candidate.job))
            .where(Candidate.id == candidate_id)
        )
        return self.db.scalar(stmt)

    def list_by_job(self, job_id: uuid.UUID) -> list[Candidate]:
        stmt = (
            select(Candidate)
            .outerjoin(Evaluation, Evaluation.candidate_id == Candidate.id)
            .options(joinedload(Candidate.evaluation))
            .where(Candidate.job_id == job_id)
            .order_by(desc(Evaluation.overall_score).nullslast(), Candidate.created_at.desc())
        )
        return list(self.db.scalars(stmt).unique().all())
