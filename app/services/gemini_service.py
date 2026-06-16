from __future__ import annotations

import json
from typing import Any

import google.generativeai as genai
from google.api_core import exceptions as google_exceptions

from app.core.config import get_settings
from app.utils.exceptions import GeminiResponseError


class GeminiService:
    MAX_JD_CHARS = 12000
    MAX_CV_CHARS = 16000

    def __init__(self) -> None:
        settings = get_settings()
        if not settings.gemini_api_key:
            raise GeminiResponseError(
                "GEMINI_API_KEY is not configured. The app can start, but JD/CV parsing requires Gemini."
            )
        genai.configure(api_key=settings.gemini_api_key)
        self.model_name = settings.gemini_model
        self.model = genai.GenerativeModel(self.model_name)

    def parse_jd(self, description: str) -> dict[str, Any]:
        prompt = f"""
You are an HR assistant.
Parse the following job description into JSON only.

Rules:
- Return JSON only.
- Do not invent information.
- If missing, return null, 0, or empty arrays.
- Output schema:
{{
  "title": string | null,
  "required_skills": [{{"name": string, "weight": number}}],
  "nice_to_have_skills": [{{"name": string, "weight": number}}],
  "min_years_experience": number | null,
  "experience_weight": number | null,
  "domain": [string],
  "domain_weight": number | null
}}

Job description:
{self._truncate_text(description, self.MAX_JD_CHARS)}
"""
        return self._generate_json(prompt)

    def parse_cv(self, cv_text: str) -> dict[str, Any]:
        prompt = f"""
You are an HR assistant.
Parse the following CV text into structured JSON only.

Rules:
- Return JSON only.
- Do not invent information.
- If missing, return null or empty arrays.
- Output schema:
{{
  "name": string | null,
  "email": string | null,
  "phone": string | null,
  "current_title": string | null,
  "summary": string | null,
  "location": string | null,
  "experience_years": number | null,
  "skills": [{{"name": string, "years": number | null}}],
  "domains": [string],
  "projects": [string],
  "experiences": [string],
  "education": [string]
}}

CV text:
{self._truncate_text(cv_text, self.MAX_CV_CHARS)}
"""
        return self._generate_json(prompt)

    def generate_feedback(
        self,
        job_requirements: dict[str, Any],
        parsed_cv: dict[str, Any],
        evaluation: dict[str, Any],
    ) -> dict[str, Any]:
        prompt = f"""
You are an HR assistant.
Generate Vietnamese hiring feedback in JSON only.

Rules:
- Return JSON only.
- Do not invent information.
- If missing, return null or empty arrays.
- Output must be Vietnamese.
- Candidate hiring decision must remain with HR.
- Output schema:
{{
  "summary": string,
  "feedback": string,
  "risks": [string],
  "interview_questions": [string]
}}

Job requirements JSON:
{json.dumps(job_requirements, ensure_ascii=False)}

Parsed CV JSON:
{json.dumps(parsed_cv, ensure_ascii=False)}

Evaluation JSON:
{json.dumps(evaluation, ensure_ascii=False)}
"""
        return self._generate_json(prompt)

    def _generate_json(self, prompt: str) -> dict[str, Any]:
        try:
            response = self.model.generate_content(prompt)
        except google_exceptions.GoogleAPICallError as exc:
            raise GeminiResponseError(
                f"Gemini request failed for model '{self.model_name}'. "
                "Please verify GEMINI_API_KEY and GEMINI_MODEL."
            ) from exc
        except Exception as exc:
            raise GeminiResponseError("Gemini request failed unexpectedly.") from exc

        text = getattr(response, "text", None)
        if not text:
            raise GeminiResponseError("Gemini returned an empty response.")

        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.strip("`")
            cleaned = cleaned.replace("json", "", 1).strip()

        try:
            payload = json.loads(cleaned)
        except json.JSONDecodeError as exc:
            raise GeminiResponseError("Gemini did not return valid JSON.") from exc

        if not isinstance(payload, dict):
            raise GeminiResponseError("Gemini response must be a JSON object.")
        return payload

    def _truncate_text(self, value: str, limit: int) -> str:
        cleaned = value.strip()
        if len(cleaned) <= limit:
            return cleaned
        return cleaned[:limit]
