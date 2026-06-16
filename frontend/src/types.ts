export type Job = {
  id: string;
  title: string;
  description: string;
  requirements: {
    title?: string | null;
    required_skills?: Array<{ name: string; weight: number }>;
    nice_to_have_skills?: Array<{ name: string; weight: number }>;
    min_years_experience?: number | null;
    experience_weight?: number | null;
    domain?: string[];
    domain_weight?: number | null;
  };
  created_at: string;
  updated_at: string;
};

export type JobListResponse = {
  items: Job[];
};

export type CandidateListItem = {
  id: string;
  job_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  original_filename: string;
  file_path: string;
  created_at: string;
  updated_at: string;
  overall_score: number | null;
  recommendation: Recommendation | null;
};

export type CandidateListResponse = {
  items: CandidateListItem[];
};

export type Evaluation = {
  id: string;
  candidate_id: string;
  overall_score: number;
  recommendation: Recommendation;
  score_breakdown: {
    skills?: {
      score: number;
      max: number;
      items: Array<{
        name: string;
        type: "required" | "nice_to_have";
        weight: number;
        matched: boolean;
        score: number;
      }>;
    };
    experience?: {
      score: number;
      max: number;
      reason: string;
    };
    domain?: {
      score: number;
      max: number;
      reason: string;
    };
    total?: {
      raw_score: number;
      max: number;
      normalized_score: number;
    };
  };
  matched_skills: Array<{
    name: string;
    type: string;
    weight: number;
    candidate_evidence?: {
      name: string;
      years?: number | null;
    };
  }>;
  missing_skills: Array<{
    name: string;
    type: string;
    weight: number;
  }>;
  risks: string[];
  feedback: string;
  interview_questions: string[];
  created_at: string;
  updated_at: string;
};

export type CandidateDetail = {
  id: string;
  job_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  original_filename: string;
  file_path: string;
  raw_text: string;
  parsed_cv: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    current_title?: string | null;
    summary?: string | null;
    location?: string | null;
    experience_years?: number | null;
    skills?: Array<{ name: string; years?: number | null }>;
    domains?: string[];
    projects?: string[];
    experiences?: string[];
    education?: string[];
  };
  created_at: string;
  updated_at: string;
  evaluation: Evaluation | null;
};

export type Recommendation = "strong_match" | "match" | "weak_match" | "not_match";
