import type { CandidateDetail, CandidateListResponse, Job, JobListResponse } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? "http://127.0.0.1:8000/api" : "/api");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  if (!response.ok) {
    let detail = "Request failed";
    try {
      const payload = await response.json();
      detail = payload.detail ?? detail;
    } catch {
      detail = response.statusText || detail;
    }
    throw new Error(detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function getHealth(): Promise<{ status: string }> {
  return request("/health");
}

export async function listJobs(): Promise<Job[]> {
  const response = await request<JobListResponse>("/jobs");
  return response.items;
}

export async function createJob(payload: {
  title: string;
  description: string;
  default_weights: {
    experience_weight: number;
    domain_weight: number;
  };
}): Promise<Job> {
  return request("/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateJob(
  jobId: string,
  payload: {
    title: string;
    description: string;
    default_weights: {
      experience_weight: number;
      domain_weight: number;
    };
  },
): Promise<Job> {
  return request(`/jobs/${jobId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function listCandidates(jobId: string) {
  const response = await request<CandidateListResponse>(`/jobs/${jobId}/candidates`);
  return response.items;
}

export async function getCandidate(candidateId: string) {
  return request<CandidateDetail>(`/candidates/${candidateId}`);
}

export async function uploadCandidate(jobId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return request<CandidateDetail>(`/jobs/${jobId}/candidates`, {
    method: "POST",
    body: formData,
  });
}

export function getCandidateFileUrl(candidateId: string): string {
  return `${API_BASE_URL}/candidates/${candidateId}/file`;
}
