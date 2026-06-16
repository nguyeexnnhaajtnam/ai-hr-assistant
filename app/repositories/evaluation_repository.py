import uuid

from sqlalchemy.orm import Session

from app.models.evaluation import Evaluation


class EvaluationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        *,
        candidate_id: uuid.UUID,
        overall_score: float,
        recommendation: str,
        score_breakdown: dict,
        matched_skills: list,
        missing_skills: list,
        risks: list,
        feedback: str,
        interview_questions: list,
    ) -> Evaluation:
        evaluation = Evaluation(
            candidate_id=candidate_id,
            overall_score=overall_score,
            recommendation=recommendation,
            score_breakdown=score_breakdown,
            matched_skills=matched_skills,
            missing_skills=missing_skills,
            risks=risks,
            feedback=feedback,
            interview_questions=interview_questions,
        )
        self.db.add(evaluation)
        self.db.flush()
        return evaluation
