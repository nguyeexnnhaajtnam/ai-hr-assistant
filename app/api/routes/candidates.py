import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.candidate_repository import CandidateRepository
from app.repositories.evaluation_repository import EvaluationRepository
from app.repositories.job_repository import JobRepository
from app.schemas.candidate import CandidateDetailResponse, CandidateListItemResponse, CandidateListResponse
from app.schemas.evaluation import EvaluationResponse
from app.services.cv_parser_service import CVParserService
from app.services.gemini_service import GeminiService
from app.services.scoring_service import ScoringService
from app.services.storage_service import StorageService
from app.utils.exceptions import GeminiResponseError, UnsupportedFileTypeError

router = APIRouter()


@router.post("/jobs/{job_id}/candidates", response_model=CandidateDetailResponse, status_code=status.HTTP_201_CREATED)
def upload_candidate(
    job_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> CandidateDetailResponse:
    job_repository = JobRepository(db)
    candidate_repository = CandidateRepository(db)
    evaluation_repository = EvaluationRepository(db)
    parser_service = CVParserService()
    storage_service = StorageService()
    gemini_service = GeminiService()
    scoring_service = ScoringService()

    job = job_repository.get(job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")

    try:
        raw_text = parser_service.extract_text(file)
    except UnsupportedFileTypeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if not raw_text.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not extract text from CV.")

    try:
        parsed_cv = gemini_service.parse_cv(raw_text)
    except GeminiResponseError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    stored_path: Path | None = None
    try:
        candidate = candidate_repository.create(
            job_id=job.id,
            name=parsed_cv.get("name"),
            email=parsed_cv.get("email"),
            phone=parsed_cv.get("phone"),
            original_filename=file.filename or "uploaded_file",
            file_path="",
            raw_text=raw_text,
            parsed_cv=parsed_cv,
        )
        stored_path = storage_service.save_candidate_cv(candidate_id=candidate.id, upload_file=file)
        candidate.file_path = str(stored_path)

        evaluation_result = scoring_service.evaluate(job_requirements=job.requirements, parsed_cv=parsed_cv)

        feedback_payload = {
            "summary": "",
            "feedback": "",
            "risks": evaluation_result.risks,
            "interview_questions": [],
        }
        try:
            feedback_payload = gemini_service.generate_feedback(
                job_requirements=job.requirements,
                parsed_cv=parsed_cv,
                evaluation={
                    "overall_score": evaluation_result.overall_score,
                    "recommendation": evaluation_result.recommendation,
                    "score_breakdown": evaluation_result.score_breakdown,
                    "matched_skills": evaluation_result.matched_skills,
                    "missing_skills": evaluation_result.missing_skills,
                    "risks": evaluation_result.risks,
                },
            )
        except GeminiResponseError as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

        merged_risks = feedback_payload.get("risks") or evaluation_result.risks
        if evaluation_result.risks:
            merged_risks = list(dict.fromkeys([*evaluation_result.risks, *merged_risks]))

        evaluation = evaluation_repository.create(
            candidate_id=candidate.id,
            overall_score=evaluation_result.overall_score,
            recommendation=evaluation_result.recommendation,
            score_breakdown=evaluation_result.score_breakdown,
            matched_skills=evaluation_result.matched_skills,
            missing_skills=evaluation_result.missing_skills,
            risks=merged_risks,
            feedback=feedback_payload.get("feedback") or feedback_payload.get("summary") or "",
            interview_questions=feedback_payload.get("interview_questions") or [],
        )

        db.commit()
        db.refresh(candidate)
        db.refresh(evaluation)
    except HTTPException:
        db.rollback()
        if stored_path and stored_path.exists():
            stored_path.unlink(missing_ok=True)
        raise
    except Exception as exc:
        db.rollback()
        if stored_path and stored_path.exists():
            stored_path.unlink(missing_ok=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc

    candidate = candidate_repository.get(candidate.id)
    if not candidate:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Candidate creation failed.")

    response = CandidateDetailResponse.model_validate(candidate)
    response.evaluation = EvaluationResponse.model_validate(evaluation)
    return response


@router.get("/jobs/{job_id}/candidates", response_model=CandidateListResponse)
def list_candidates_by_job(job_id: uuid.UUID, db: Session = Depends(get_db)) -> CandidateListResponse:
    job_repository = JobRepository(db)
    candidate_repository = CandidateRepository(db)

    job = job_repository.get(job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")

    candidates = candidate_repository.list_by_job(job_id)
    items = [
        CandidateListItemResponse(
            id=candidate.id,
            job_id=candidate.job_id,
            name=candidate.name,
            email=candidate.email,
            phone=candidate.phone,
            original_filename=candidate.original_filename,
            file_path=candidate.file_path,
            created_at=candidate.created_at,
            updated_at=candidate.updated_at,
            overall_score=candidate.evaluation.overall_score if candidate.evaluation else None,
            recommendation=candidate.evaluation.recommendation if candidate.evaluation else None,
        )
        for candidate in candidates
    ]
    return CandidateListResponse(items=items)


@router.get("/candidates/{candidate_id}", response_model=CandidateDetailResponse)
def get_candidate(candidate_id: uuid.UUID, db: Session = Depends(get_db)) -> CandidateDetailResponse:
    candidate_repository = CandidateRepository(db)
    candidate = candidate_repository.get(candidate_id)
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found.")
    return CandidateDetailResponse.model_validate(candidate)


@router.get("/candidates/{candidate_id}/file")
def download_candidate_file(candidate_id: uuid.UUID, db: Session = Depends(get_db)) -> FileResponse:
    candidate_repository = CandidateRepository(db)
    candidate = candidate_repository.get(candidate_id)
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found.")
    return FileResponse(path=candidate.file_path, filename=candidate.original_filename)
