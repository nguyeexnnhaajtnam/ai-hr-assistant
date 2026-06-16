from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class EvaluationResult:
    overall_score: float
    recommendation: str
    score_breakdown: dict[str, Any]
    matched_skills: list[dict[str, Any]]
    missing_skills: list[dict[str, Any]]
    risks: list[str]


class ScoringService:
    def evaluate(self, *, job_requirements: dict[str, Any], parsed_cv: dict[str, Any]) -> EvaluationResult:
        required_skills = self._normalize_skill_items(job_requirements.get("required_skills", []))
        nice_to_have_skills = self._normalize_skill_items(job_requirements.get("nice_to_have_skills", []))
        experience_weight = float(job_requirements.get("experience_weight", 0) or 0)
        domain_weight = float(job_requirements.get("domain_weight", 0) or 0)
        min_years_experience = float(job_requirements.get("min_years_experience", 0) or 0)
        job_domains = [self._normalize_text(domain) for domain in job_requirements.get("domain", []) if domain]

        candidate_skill_map = self._build_candidate_skill_map(parsed_cv)
        candidate_experience_years = self._extract_experience_years(parsed_cv)
        domain_text = self._collect_domain_text(parsed_cv)

        matched_skills: list[dict[str, Any]] = []
        missing_skills: list[dict[str, Any]] = []
        skill_items: list[dict[str, Any]] = []
        skill_score = 0.0
        skill_max = float(sum(item["weight"] for item in required_skills + nice_to_have_skills))

        for item in required_skills:
            normalized_name = item["normalized_name"]
            matched = normalized_name in candidate_skill_map
            awarded = float(item["weight"]) if matched else 0.0
            skill_score += awarded
            detail = {
                "name": item["name"],
                "type": "required",
                "weight": item["weight"],
                "matched": matched,
                "score": awarded,
            }
            skill_items.append(detail)
            if matched:
                matched_skills.append(
                    {
                        "name": item["name"],
                        "type": "required",
                        "weight": item["weight"],
                        "candidate_evidence": candidate_skill_map[normalized_name],
                    }
                )
            else:
                missing_skills.append({"name": item["name"], "type": "required", "weight": item["weight"]})

        for item in nice_to_have_skills:
            normalized_name = item["normalized_name"]
            matched = normalized_name in candidate_skill_map
            awarded = float(item["weight"]) if matched else 0.0
            skill_score += awarded
            detail = {
                "name": item["name"],
                "type": "nice_to_have",
                "weight": item["weight"],
                "matched": matched,
                "score": awarded,
            }
            skill_items.append(detail)
            if matched:
                matched_skills.append(
                    {
                        "name": item["name"],
                        "type": "nice_to_have",
                        "weight": item["weight"],
                        "candidate_evidence": candidate_skill_map[normalized_name],
                    }
                )
            else:
                missing_skills.append({"name": item["name"], "type": "nice_to_have", "weight": item["weight"]})

        if min_years_experience <= 0 or experience_weight <= 0:
            experience_score = 0.0
            experience_reason = "No experience requirement or experience weight is configured."
        elif candidate_experience_years >= min_years_experience:
            experience_score = experience_weight
            experience_reason = (
                f"The candidate has {candidate_experience_years:.1f} years of experience, meeting or exceeding "
                f"the minimum requirement of {min_years_experience:.1f} years."
            )
        else:
            ratio = max(candidate_experience_years, 0.0) / min_years_experience
            experience_score = round(experience_weight * ratio, 2)
            experience_reason = (
                f"The candidate has {candidate_experience_years:.1f} years of experience, below the required "
                f"{min_years_experience:.1f} years, so the score is prorated."
            )

        domain_hits = [domain for domain in job_domains if domain and domain in domain_text]
        if job_domains and domain_weight > 0 and domain_hits:
            domain_score = domain_weight
            domain_reason = f"Matched domain evidence found in the CV: {', '.join(domain_hits)}."
        elif job_domains and domain_weight > 0:
            domain_score = 0.0
            domain_reason = "No clear evidence of the required domain was found in the CV."
        else:
            domain_score = 0.0
            domain_reason = "No domain requirement or domain weight is configured."

        total_possible = skill_max + experience_weight + domain_weight
        raw_score = skill_score + experience_score + domain_score
        overall_score = round((raw_score / total_possible) * 100, 2) if total_possible > 0 else 0.0

        recommendation = self._build_recommendation(overall_score)
        risks = self._build_risks(
            overall_score=overall_score,
            missing_skills=missing_skills,
            candidate_experience_years=candidate_experience_years,
            min_years_experience=min_years_experience,
            has_domain_match=bool(domain_hits),
            job_domains=job_domains,
        )

        score_breakdown = {
            "skills": {
                "score": round(skill_score, 2),
                "max": round(skill_max, 2),
                "items": skill_items,
            },
            "experience": {
                "score": round(experience_score, 2),
                "max": round(experience_weight, 2),
                "reason": experience_reason,
            },
            "domain": {
                "score": round(domain_score, 2),
                "max": round(domain_weight, 2),
                "reason": domain_reason,
            },
            "total": {
                "raw_score": round(raw_score, 2),
                "max": round(total_possible, 2),
                "normalized_score": overall_score,
            },
        }

        return EvaluationResult(
            overall_score=overall_score,
            recommendation=recommendation,
            score_breakdown=score_breakdown,
            matched_skills=matched_skills,
            missing_skills=missing_skills,
            risks=risks,
        )

    def _normalize_skill_items(self, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
        normalized_items: list[dict[str, Any]] = []
        for item in items:
            name = str(item.get("name", "")).strip()
            if not name:
                continue
            normalized_items.append(
                {
                    "name": name,
                    "normalized_name": self._normalize_text(name),
                    "weight": float(item.get("weight", 0) or 0),
                }
            )
        return normalized_items

    def _build_candidate_skill_map(self, parsed_cv: dict[str, Any]) -> dict[str, dict[str, Any]]:
        skill_map: dict[str, dict[str, Any]] = {}
        for item in parsed_cv.get("skills", []) or []:
            if isinstance(item, dict):
                name = str(item.get("name", "")).strip()
                years = item.get("years")
            else:
                name = str(item).strip()
                years = None
            if not name:
                continue
            skill_map[self._normalize_text(name)] = {"name": name, "years": years}
        return skill_map

    def _extract_experience_years(self, parsed_cv: dict[str, Any]) -> float:
        raw_years = parsed_cv.get("experience_years")
        if raw_years is None:
            return 0.0
        try:
            return float(raw_years)
        except (TypeError, ValueError):
            return 0.0

    def _collect_domain_text(self, parsed_cv: dict[str, Any]) -> str:
        sections: list[str] = []
        for key in ("summary", "current_title", "location"):
            value = parsed_cv.get(key)
            if value:
                sections.append(str(value))
        for key in ("domains", "projects", "experiences"):
            value = parsed_cv.get(key) or []
            if isinstance(value, list):
                sections.extend(str(item) for item in value if item)
        return self._normalize_text(" ".join(sections))

    def _normalize_text(self, value: str) -> str:
        return " ".join(value.lower().strip().split())

    def _build_recommendation(self, score: float) -> str:
        if score >= 80:
            return "strong_match"
        if score >= 65:
            return "match"
        if score >= 45:
            return "weak_match"
        return "not_match"

    def _build_risks(
        self,
        *,
        overall_score: float,
        missing_skills: list[dict[str, Any]],
        candidate_experience_years: float,
        min_years_experience: float,
        has_domain_match: bool,
        job_domains: list[str],
    ) -> list[str]:
        risks: list[str] = []
        required_missing = [item["name"] for item in missing_skills if item["type"] == "required"]
        if required_missing:
            risks.append(f"Missing required skills: {', '.join(required_missing)}.")
        if min_years_experience > 0 and candidate_experience_years < min_years_experience:
            risks.append(
                f"Experience level ({candidate_experience_years:.1f} years) is below the required "
                f"threshold ({min_years_experience:.1f} years)."
            )
        if job_domains and not has_domain_match:
            risks.append("No clear evidence of relevant domain experience was found in the CV.")
        if overall_score < 45:
            risks.append("Overall score is low and should be reviewed carefully before moving forward.")
        return risks
