import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.job import Job


class JobRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, *, title: str, description: str, requirements: dict) -> Job:
        job = Job(title=title, description=description, requirements=requirements)
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job

    def list(self) -> list[Job]:
        stmt = select(Job).order_by(Job.created_at.desc())
        return list(self.db.scalars(stmt).all())

    def get(self, job_id: uuid.UUID) -> Job | None:
        return self.db.get(Job, job_id)

    def update(self, job: Job, *, title: str, description: str, requirements: dict) -> Job:
        job.title = title
        job.description = description
        job.requirements = requirements
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job
